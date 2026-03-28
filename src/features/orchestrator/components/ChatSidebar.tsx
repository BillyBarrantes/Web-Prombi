
/**
 * ChatSidebar — Panel de chat con input y respuestas de la IA.
 *
 * WHY: Este es el punto de interacción principal del usuario con
 * el orquestador. Envía mensajes en lenguaje natural al backend,
 * muestra la respuesta de la IA en tiempo real (con indicador de
 * progreso multi-paso), y renderiza los ActionCards con los resultados.
 *
 * Phase 4: Added suggestion chips, multi-step loading states, and
 *          enhanced follow-up question UX.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { sendChatMessage, ApiTimeoutError, ApiRateLimitError, ApiConnectionError, ApiServerError } from "../lib/api";
import { getCanvasVisualContext, getActivePowerBiReport, refreshPowerBiEmbed } from "../lib/pbiRuntime";
import type { ChatMessage, ChatResponse, MeasureAssistantOpenDetail, MeasureAssistantStatus, ProbeStatus, PlaceholderSpec } from "../lib/types";
import type { ActionResult } from "../lib/actionHandler";
import { probeMeasureExists, replayPlaceholderCard } from "../lib/actionHandler";
import ActionCard from "./ActionCard";

interface ChatSidebarProps {
    reportId: string;
    tenantId: string;
    onActionGenerated?: (response: ChatResponse) => Promise<ActionResult> | ActionResult | void;
}

// ── Quick Action Suggestions ─────────────────────────────────

const SUGGESTIONS = [
    { icon: "📊", text: "Crea un grafico de ventas por categoria" },
    { icon: "🔍", text: "Filtra por 400" },
    { icon: "📈", text: "Muestra un grafico de tendencias" },
    { icon: "💡", text: "Explica los datos principales" },
];

// ── Loading Step Phases ──────────────────────────────────────

const LOADING_STEPS = [
    { icon: "🔍", label: "Analizando intención..." },
    { icon: "🧠", label: "Generando con Gemini..." },
    { icon: "⚡", label: "Ejecutando acción..." },
];

export default function ChatSidebar({
    reportId,
    tenantId,
    onActionGenerated,
}: ChatSidebarProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [expandedHelp, setExpandedHelp] = useState<Record<string, boolean>>({});
    const [refreshingVisual, setRefreshingVisual] = useState<string | null>(null);

    // Auto-scroll al último mensaje
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // Initial Welcome Message
    useEffect(() => {
        if (!currentConversationId && messages.length === 0) {
            setMessages([
                {
                    id: "welcome",
                    role: "assistant",
                    content:
                        "¡Hola! 👋 Soy tu asistente de BI. Puedo crear visuales, aplicar filtros, navegar páginas y explicar métricas. ¿Qué necesitas?",
                    timestamp: new Date(),
                },
            ]);
        }
    }, [currentConversationId, messages.length]);



    // ── Manual verify (T5) ───────────────────────────────────
    const [manualVerifyMsg, setManualVerifyMsg] = useState<Record<string, string>>({});

    // Measure Assistant SUCCESS Dedupe & Polling Guards
    const successEmitted = useRef<Set<string>>(new Set());
    const pollingIntervals = useRef<Map<string, number>>(new Map());

    const handleManualVerify = useCallback(async (targetVisualName: string) => {
        console.log(`🧪 Manual verify clicked visual=${targetVisualName}`);
        try {
            const report = await getActivePowerBiReport();
            if (!report || typeof (report as any).getActivePage !== "function") throw new Error("no report");
            const page = await (report as any).getActivePage();
            if (!page || typeof page.getVisuals !== "function") throw new Error("no page");
            const visuals = await page.getVisuals();
            const v = Array.isArray(visuals) ? visuals.find((x: any) => String(x?.name || "") === targetVisualName) : null;
            if (!v) throw new Error("no visual");

            let satisfied = false;

            if (typeof (v as any).getDataFields === "function") {
                try {
                    const allFields = await (v as any).getDataFields();
                    if (allFields && typeof allFields === "object") {
                        for (const val of Object.values(allFields as Record<string, unknown>)) {
                            if (Array.isArray(val) && val.length > 0) { satisfied = true; break; }
                        }
                    }
                } catch { /* ignore */ }
            }

            if (!satisfied && typeof (v as any).exportData === "function") {
                try {
                    const pbiClient = await import("powerbi-client");
                    const exportDataResult = await (v as any).exportData(pbiClient.models.ExportDataType.Summarized);
                    const csvData = String(exportDataResult?.data || "");
                    const lines = csvData.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
                    satisfied = lines.length >= 2;
                } catch { /* ignore */ }
            }

            console.log(`🧪 Manual verify result visual=${targetVisualName} satisfied=${satisfied}`);
            if (satisfied) {
                // Extract measureName from messages to dispatch complete success event
                let resolvedMeasureName = "";
                setMessages((prev) => {
                    const m = prev.find(x => x.id === `measure-assistant-${targetVisualName}`);
                    if (m?.measure_assistant?.measure_name) resolvedMeasureName = m.measure_assistant.measure_name;
                    return prev;
                });
                window.dispatchEvent(new CustomEvent("measure-assistant:chat_success", { 
                    detail: { target_visual_name: targetVisualName, measure_name: resolvedMeasureName } 
                }));
            } else {
                // Start polling — this is the ONLY place we start polling after user action
                window.dispatchEvent(new CustomEvent("measure-assistant:start_polling", { detail: { target_visual_name: targetVisualName } }));
                setManualVerifyMsg((prev) => ({ ...prev, [targetVisualName]: "Aún no veo datos en la tarjeta. Verificando automáticamente… cuando aparezca, te confirmo." }));
            }
        } catch {
            setManualVerifyMsg((prev) => ({ ...prev, [targetVisualName]: "No pude verificar ahora. Si ya ves el número en la tarjeta, continúa." }));
        }
    }, []);

    // ── Refresh embedded PBI report (Single-Click Deterministic Fetch-And-Probe) ──
    const handleRefreshPBI = useCallback(async (targetVisualName: string) => {
        console.log(`🔄 Actualizar Power BI clicked visual=${targetVisualName}`);
        setRefreshingVisual(targetVisualName);
        setManualVerifyMsg(prev => { const n = { ...prev }; delete n[targetVisualName]; return n; });
        
        // Reset guards on visual refresh
        successEmitted.current.forEach(k => { if (k.startsWith(targetVisualName + '_')) successEmitted.current.delete(k); });
        
        const msgId = `measure-assistant-${targetVisualName}`;
        const bubbleMsg = messages.find(m => m.id === msgId);
        const measureName = bubbleMsg?.measure_assistant?.measure_name || "";
        const tableName = bubbleMsg?.measure_assistant?.table || "";
        const spec = bubbleMsg?.measure_assistant?.placeholder_spec;

        // Helper to probe visually
        const probeCurrentVisual = async (vName: string): Promise<any> => {
            const report = getActivePowerBiReport();
            if (report && typeof (report as any).getActivePage === "function") {
                try {
                    const page = await (report as any).getActivePage();
                    const visuals = page ? await page.getVisuals() : [];
                    const v = Array.isArray(visuals) ? visuals.find((x: any) => String(x?.name || "") === vName) : null;
                    if (v) {
                        return await probeMeasureExists(v, tableName, measureName);
                    }
                } catch { /* best-effort */ }
            }
            return { status: "INCONCLUSIVE" };
        };

        // Helper to replay placeholder
        const attemptReplay = async (currentVName: string) => {
            let nextVName = currentVName;
            if (spec) {
                const replay = await replayPlaceholderCard(spec);
                if (replay.ok && replay.newVisualName && replay.newVisualName !== currentVName) {
                    nextVName = replay.newVisualName;
                    setMessages(prev => prev.map(m => {
                        if (m.id !== msgId || !m.measure_assistant) return m;
                        return {
                            ...m,
                            id: `measure-assistant-${nextVName}`,
                            measure_assistant: { ...m.measure_assistant, target_visual_name: nextVName },
                        };
                    }));
                }
            }
            return { nextVName };
        };

        try {
            // Step 1: Soft Reload
            let currentVisualName = targetVisualName;
            const result1 = await refreshPowerBiEmbed(false);
            if (result1.ok) {
                const { nextVName } = await attemptReplay(currentVisualName);
                currentVisualName = nextVName;
                
                const probe1 = await probeCurrentVisual(currentVisualName);
                if (probe1.status === "FOUND") {
                    setManualVerifyMsg(prev => ({ ...prev, [targetVisualName]: "✅ Reporte actualizado. La medida ya debería aparecer en el panel Datos." }));
                    setRefreshingVisual(null);
                    return;
                }
            }
            
            // Step 2: Full Re-Embed Fallback (deterministic)
            console.log(`Fallback a re-embed completo para la medida '${measureName}'...`);
            const result2 = await refreshPowerBiEmbed(true);
            if (result2.ok) {
                const { nextVName } = await attemptReplay(currentVisualName);
                currentVisualName = nextVName;
                
                const probe2 = await probeCurrentVisual(currentVisualName);
                if (probe2.status === "FOUND") {
                    setManualVerifyMsg(prev => ({ ...prev, [targetVisualName]: "✅ Reporte actualizado. La medida ya debería aparecer en el panel Datos." }));
                } else {
                    setManualVerifyMsg(prev => ({ ...prev, [targetVisualName]: "Aún no aparece: confirma que publicaste al MISMO workspace/dataset y que estás en modo edición" }));
                }
            } else {
                 setManualVerifyMsg(prev => ({ ...prev, [targetVisualName]: "No pude recargar el reporte. Intenta cerrar y abrir la página como último recurso." }));
            }
        } catch (err) {
            console.warn(`🔄 Refresh error:`, err);
            setManualVerifyMsg(prev => ({ ...prev, [targetVisualName]: "Error al recargar. Intenta cerrar y abrir la página como último recurso." }));
        } finally {
            setRefreshingVisual(null);
        }
    }, [messages]);

    // ── Reprobe: "Ya la creé" button (refreshes embed, replays placeholder, probes, → WAITING_FOR_DRAG, NO auto-polling) ──
    const handleReprobe = useCallback(async (targetVisualName: string) => {
        console.log(`🔍 Reprobe clicked visual=${targetVisualName}`);
        const msgId = `measure-assistant-${targetVisualName}`;
        const bubbleMsg = messages.find(m => m.id === msgId);
        const measureName = bubbleMsg?.measure_assistant?.measure_name || "";

        setRefreshingVisual(targetVisualName);
        setManualVerifyMsg(prev => { const n = { ...prev }; delete n[targetVisualName]; return n; });
        // Reset guards on reprobe
        successEmitted.current.forEach(k => { if (k.startsWith(targetVisualName + '_')) successEmitted.current.delete(k); });

        let currentVisualName = targetVisualName;

        try {
            // Step 1: Refresh PBI embed (reload → re-embed)
            const refreshResult = await refreshPowerBiEmbed();
            console.log(`🔄 Reprobe refresh: ok=${refreshResult.ok} method=${refreshResult.method}`);

            // Step 2: Replay placeholder card
            const spec = bubbleMsg?.measure_assistant?.placeholder_spec;
            if (spec && refreshResult.ok) {
                const replay = await replayPlaceholderCard(spec);
                if (replay.ok && replay.newVisualName) {
                    currentVisualName = replay.newVisualName;
                    console.log(`🔁 Reprobe: placeholder replayed, new visualName=${currentVisualName}`);
                }
            }

            // Step 3: Re-probe (best-effort) using the new visual name
            const report = getActivePowerBiReport();
            let probeStatusLabel = "INCONCLUSIVE";

            if (report && typeof (report as any).getActivePage === "function") {
                try {
                    const page = await (report as any).getActivePage();
                    const visuals = page ? await page.getVisuals() : [];
                    const v = Array.isArray(visuals) ? visuals.find((x: any) => String(x?.name || "") === currentVisualName) : null;
                    if (v) {
                        const tableName = bubbleMsg?.measure_assistant?.table || "";
                        const probeResult = await probeMeasureExists(v, tableName, measureName);
                        probeStatusLabel = probeResult.status;
                        console.log(`🔍 Reprobe result: status=${probeResult.status}`);
                    }
                } catch { /* probe best-effort */ }
            }

            // Step 4: Transition to WAITING_FOR_DRAG regardless of probe result
            const contentMsg = probeStatusLabel === "FOUND"
                ? `¡La medida "${measureName}" ya existe! Arrástrala a la tarjeta.`
                : `Arrastra la medida "${measureName}" a la tarjeta. Cuando la detecte, te confirmo automáticamente.`;

            // Update bubble with potentially new visual name and start polling
            const newMsgId = currentVisualName !== targetVisualName ? `measure-assistant-${currentVisualName}` : msgId;
            setMessages(prev => prev.map(m => {
                if (m.id !== msgId || !m.measure_assistant) return m;
                return {
                    ...m,
                    id: newMsgId,
                    content: contentMsg,
                    measure_assistant: {
                        ...m.measure_assistant,
                        status: "WAITING_FOR_DRAG" as MeasureAssistantStatus,
                        probe_status: probeStatusLabel as ProbeStatus,
                        target_visual_name: currentVisualName,
                    },
                };
            }));

            // Magic auto-detection: start polling now that we are WAITING_FOR_DRAG
            window.dispatchEvent(new CustomEvent("measure-assistant:start_polling", { detail: { target_visual_name: currentVisualName } }));

        } catch {
            // On error → go to WAITING_FOR_DRAG anyway
            setMessages(prev => prev.map(m => {
                if (m.id !== msgId || !m.measure_assistant) return m;
                return { ...m, content: `Arrastra la medida "${measureName}" a la tarjeta.`, measure_assistant: { ...m.measure_assistant, status: "WAITING_FOR_DRAG" as MeasureAssistantStatus } };
            }));
        } finally {
            setRefreshingVisual(null);
        }
    }, [messages]);

    // ── Troubleshoot: "No pude" button ──────────────────
    const handleTroubleshoot = useCallback((targetVisualName: string) => {
        const msgId = `measure-assistant-${targetVisualName}`;
        console.log(`❓ Troubleshoot clicked visual=${targetVisualName}`);
        setMessages(prev => prev.map(m => {
            if (m.id !== msgId || !m.measure_assistant) return m;
            return { ...m, measure_assistant: { ...m.measure_assistant, status: "TROUBLESHOOT" as MeasureAssistantStatus } };
        }));
    }, []);

    // Measure Assistant (Chat) — escucha eventos disparados por actionHandler.
    useEffect(() => {
        if (typeof window === "undefined") return;

        const onOpen = (ev: any) => {
            const detail = (ev as any)?.detail as MeasureAssistantOpenDetail | undefined;
            if (!detail) return;

            const visualKey = String(detail.target_visual_name || "").trim();
            const msgId = visualKey ? `measure-assistant-${visualKey}` : `measure-assistant-${Date.now()}`;

            const measureName = String(detail.measure_name || "(medida)");
            const title = String(detail.title || "Tarjeta");
            const dax = String(detail.dax || "");
            const reasonCode = String(detail.reason_code || "");
            const table = String(detail.table || "");
            const column = String(detail.column || "");
            const probeStatus = (detail.probe_status || "INCONCLUSIVE") as ProbeStatus;

            // Determine initial wizard state from probe
            const stateMap: Record<string, MeasureAssistantStatus> = {
                FOUND: "WAITING_FOR_DRAG", // Start in WAITING_FOR_DRAG immediately if FOUND
                NOT_FOUND: "MEASURE_MISSING",
                INCONCLUSIVE: "MEASURE_INCONCLUSIVE",
            };
            const initialStatus: MeasureAssistantStatus = stateMap[probeStatus] || "MEASURE_INCONCLUSIVE";
            const contentMap: Record<string, string> = {
                WAITING_FOR_DRAG: `La medida "${measureName}" ya existe en tu modelo. Arrástrala desde el panel Datos a la tarjeta vacía "${title}".`,
                MEASURE_MISSING: `Primero hay que crear la medida "${measureName}" en Power BI Desktop.`,
                MEASURE_INCONCLUSIVE: `No puedo confirmar automáticamente si la medida "${measureName}" existe. Búscala en el panel Datos.`,
            };
            const initialContent = contentMap[initialStatus] || contentMap.MEASURE_INCONCLUSIVE;

            console.log(`💬 MeasureAssistant wizard: state=${initialStatus} probe_status=${probeStatus} visual=${visualKey}`);

            // Start polling IMMEDIATELY only if measure is FOUND (waiting for drag)
            if (initialStatus === "WAITING_FOR_DRAG" && visualKey) {
                window.dispatchEvent(new CustomEvent("measure-assistant:start_polling", { detail: { target_visual_name: visualKey } }));
            }

            setMessages((prev) => {
                const existingIdx = prev.findIndex((m) => m.id === msgId);
                const bubbleData = {
                    status: initialStatus,
                    measure_name: measureName,
                    dax,
                    title,
                    target_visual_name: visualKey || undefined,
                    reason_code: reasonCode || undefined,
                    table: table || undefined,
                    column: column || undefined,
                    probe_status: probeStatus,
                    placeholder_spec: detail.placeholder_spec || undefined,
                };

                if (existingIdx !== -1) {
                    console.log(`♻️ MeasureAssistant bubble reused visual=${visualKey}`);
                    const updated = [...prev];
                    updated[existingIdx] = { ...updated[existingIdx], content: initialContent, measure_assistant: bubbleData };
                    return updated;
                }

                return [ ...prev, { id: msgId, role: "assistant", content: initialContent, timestamp: new Date(), measure_assistant: bubbleData } as any ];
            });
        };

        const onSuccess = (ev: any) => {
            const visualKey = String((ev as any)?.detail?.target_visual_name || "").trim();
            const payloadMeasureName = String((ev as any)?.detail?.measure_name || "").trim();
            if (!visualKey) return;

            // Extract measureName from bubble if not in event
            const msgId = `measure-assistant-${visualKey}`;
            let measureName = payloadMeasureName;
            if (!measureName) {
                setMessages(prev => {
                    const m = prev.find(x => x.id === msgId);
                    if (m?.measure_assistant?.measure_name) measureName = m.measure_assistant.measure_name;
                    return prev;
                });
            }

            const idempotencyKey = `${visualKey}_${measureName || 'unknown'}`;

            // Idempotent guard: exactly-once SUCCESS per visual+measure instance
            if (successEmitted.current.has(idempotencyKey)) {
                console.log(`♻️ MeasureAssistant: ignoring duplicate SUCCESS for key=${idempotencyKey}`);
                return;
            }
            successEmitted.current.add(idempotencyKey);

            // Clean up any active polling immediately
            const activeInterval = pollingIntervals.current.get(visualKey);
            if (activeInterval !== undefined) {
                window.clearInterval(activeInterval);
                pollingIntervals.current.delete(visualKey);
                console.log(`🛑 Polling stopped for visual=${visualKey} (SUCCESS)`);
            }

            // Wait to update UI State
            console.log(`💬 MeasureAssistant wizard: state=SUCCESS visual=${visualKey}`);

            setMessages((prev) => {
                const next = prev.map((m) => {
                    if (m.id !== msgId || !m.measure_assistant) return m;
                    return { ...m, measure_assistant: { ...m.measure_assistant, status: "SUCCESS" as MeasureAssistantStatus } };
                });
                return [ ...next, { id: `measure-assistant-ok-${Date.now()}`, role: "assistant", content: "✅ Medida detectada, tarjeta actualizada. 🎉", timestamp: new Date() } ];
            });
            setManualVerifyMsg(prev => { const n = { ...prev }; delete n[visualKey]; return n; });
        };

        const onTimeout = (ev: any) => {
            const visualKey = String((ev as any)?.detail?.target_visual_name || "").trim();
            if (!visualKey) return;

            // Clean up any active polling on timeout
            const activeInterval = pollingIntervals.current.get(visualKey);
            if (activeInterval !== undefined) {
                window.clearInterval(activeInterval);
                pollingIntervals.current.delete(visualKey);
                console.log(`🛑 Polling stopped for visual=${visualKey} (TIMEOUT)`);
            }

            const msgId = `measure-assistant-${visualKey}`;
            console.log(`💬 MeasureAssistant wizard: state=TROUBLESHOOT (timeout) visual=${visualKey}`);

            setMessages((prev) => prev.map((m) => {
                if (m.id !== msgId || !m.measure_assistant) return m;
                return { ...m, measure_assistant: { ...m.measure_assistant, status: "TROUBLESHOOT" as MeasureAssistantStatus } };
            }));
        };

        // Listen for start_polling event from reprobe
        const onStartPolling = (ev: any) => {
            const visualKey = String((ev as any)?.detail?.target_visual_name || "").trim();
            if (!visualKey) return;
            // For reprobe case, polling needs to start fresh. We use a direct approach:
            console.log(`🕵️ Starting polling for visual=${visualKey} (from reprobe)`);
            const startedAt = Date.now();
            const timeoutMs = 2 * 60 * 1000;
            const intervalMs = 900;
            const intervalId = window.setInterval(async () => {
                try {
                    if (Date.now() - startedAt > timeoutMs) {
                        window.clearInterval(intervalId);
                        pollingIntervals.current.delete(visualKey);
                        window.dispatchEvent(new CustomEvent("measure-assistant:chat_timeout", { detail: { target_visual_name: visualKey } }));
                        return;
                    }
                    const report = await getActivePowerBiReport();
                    if (!report || typeof (report as any).getActivePage !== "function") return;
                    const page = await (report as any).getActivePage();
                    if (!page || typeof page.getVisuals !== "function") return;
                    const visuals = await page.getVisuals();
                    const v = Array.isArray(visuals) ? visuals.find((x: any) => String(x?.name || "") === visualKey) : null;
                    if (!v) return;
                    let satisfied = false;
                    if (typeof v.getDataFields === "function") {
                        try {
                            const allFields = await v.getDataFields();
                            if (allFields && typeof allFields === "object") {
                                for (const val of Object.values(allFields as Record<string, unknown>)) {
                                    if (Array.isArray(val) && val.length > 0) { satisfied = true; break; }
                                }
                            }
                        } catch { /* ignore */ }
                    }
                    if (!satisfied && typeof v.exportData === "function") {
                        try {
                            const pbiClient = await import("powerbi-client");
                            const exportDataResult = await v.exportData(pbiClient.models.ExportDataType.Summarized);
                            const csvData = String(exportDataResult?.data || "");
                            const lines = csvData.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
                            satisfied = lines.length >= 2;
                        } catch { /* ignore */ }
                    }
                    if (satisfied) {
                        window.clearInterval(intervalId);
                        // Clean up ref on success dispatch
                        pollingIntervals.current.delete(visualKey);
                        
                        // Extract measureName from messages to dispatch complete success event
                        let measureName = "";
                        setMessages((prev) => {
                            const m = prev.find(x => x.id === `measure-assistant-${visualKey}`);
                            if (m?.measure_assistant?.measure_name) measureName = m.measure_assistant.measure_name;
                            return prev;
                        });
                        
                        window.dispatchEvent(new CustomEvent("measure-assistant:chat_success", { 
                            detail: { target_visual_name: visualKey, measure_name: measureName } 
                        }));
                    }
                } catch { /* ignore */ }
            }, intervalMs);

            pollingIntervals.current.set(visualKey, intervalId);
        };

        window.addEventListener("measure-assistant:chat_open", onOpen as any);
        window.addEventListener("measure-assistant:chat_success", onSuccess as any);
        window.addEventListener("measure-assistant:chat_timeout", onTimeout as any);
        window.addEventListener("measure-assistant:start_polling", onStartPolling as any);
        return () => {
            window.removeEventListener("measure-assistant:chat_open", onOpen as any);
            window.removeEventListener("measure-assistant:chat_success", onSuccess as any);
            window.removeEventListener("measure-assistant:chat_timeout", onTimeout as any);
            window.removeEventListener("measure-assistant:start_polling", onStartPolling as any);

            // Clean up all active intervals when component unmounts
            pollingIntervals.current.forEach(id => window.clearInterval(id));
            pollingIntervals.current.clear();
        };
    }, []);
    // Cleanup loading timer
    useEffect(() => {
        return () => {
            if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
        };
    }, []);

    // Auto-resize del textarea
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
    };

    // Animate through loading steps
    const startLoadingSteps = () => {
        setLoadingStep(0);
        loadingTimerRef.current = setTimeout(() => {
            setLoadingStep(1);
            loadingTimerRef.current = setTimeout(() => {
                setLoadingStep(2);
            }, 1500);
        }, 1200);
    };

    const handleSubmit = async (messageText?: string) => {
        const text = messageText || input.trim();
        if (!text || isLoading) return;

        // Agregar mensaje del usuario
        const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            content: text,
            timestamp: new Date(),
        };

        // Agregar placeholder de loading
        const loadingMsg: ChatMessage = {
            id: `loading-${Date.now()}`,
            role: "assistant",
            content: "",
            timestamp: new Date(),
            isLoading: true,
        };

        setMessages((prev) => [...prev, userMsg, loadingMsg]);
        setInput("");
        setIsLoading(true);
        startLoadingSteps();

        // Reset textarea height
        if (inputRef.current) {
            inputRef.current.style.height = "auto";
        }

        try {
            const visualContext = await getCanvasVisualContext();
            const response = await sendChatMessage({
                message: text,
                report_id: reportId,
                tenant_id: tenantId,
                conversation_id: currentConversationId || undefined,
                visual_context: visualContext,
            });

            // Update conversation ID if new
            if (response.conversation_id && !currentConversationId) {
                setCurrentConversationId(response.conversation_id);
            }

            const assistantMsg: ChatMessage = {
                id: `assistant-${Date.now()}`,
                role: "assistant",
                content: response.action?.explanation || "Procesando respuesta...",
                timestamp: new Date(),
                action: response.action,
                intent: response.intent,
                confidence: response.confidence,
            };

            // Reemplazar el loading con la respuesta real
            setMessages((prev) => [
                ...prev.filter((m) => !m.isLoading),
                assistantMsg,
            ]);

            // ── Short-circuit: ERROR actions from backend ──
            // Si el backend devuelve operation=ERROR, NO llamar actionHandler.
            // Solo renderizar el mensaje de error en el chat con botón de retry.
            const allActions = response.actions && response.actions.length > 0
                ? response.actions
                : response.action ? [response.action] : [];
            const isErrorAction = allActions.length > 0 && allActions.every(a => a.operation === "ERROR");

            if (isErrorAction) {
                const errorExplanation = response.action?.explanation || "El servidor reportó un error. Intenta de nuevo.";
                setMessages((prev) => [
                    ...prev.filter((m) => !m.isLoading),
                    {
                        id: `error-${Date.now()}`,
                        role: "assistant",
                        content: `⚠️ ${errorExplanation}`,
                        timestamp: new Date(),
                        isError: true,
                        failedMessage: text,
                    } as ChatMessage,
                ]);
            } else {
                // Notificar al padre sobre la acción generada (solo si NO es ERROR)
                if (onActionGenerated) {
                    const actionResult = await onActionGenerated(response);
                    const hasExplainAction =
                        response.action?.operation === "EXPLAIN" ||
                        (Array.isArray(response.actions) &&
                            response.actions.some((a) => a.operation === "EXPLAIN"));
                    if (actionResult && actionResult.success && (actionResult.operation === "EXPLAIN" || hasExplainAction)) {
                        setMessages((prevMessages) => {
                            const newMessages = [...prevMessages];
                            const lastAssistantIndex = newMessages.map((m) => m.role).lastIndexOf("assistant");
                            if (lastAssistantIndex !== -1) {
                                const current = newMessages[lastAssistantIndex];
                                newMessages[lastAssistantIndex] = {
                                    ...current,
                                    content: actionResult.message,
                                    action: current.action
                                        ? { ...current.action, explanation: actionResult.message }
                                        : current.action,
                                };
                            }
                            return newMessages;
                        });
                    }
                }
            }
        } catch (error) {
            // Phase 4: Differentiated error messages
            let errorIcon = "❌";
            let errorContent = "Error desconocido. Intenta de nuevo.";

            if (error instanceof ApiTimeoutError) {
                errorIcon = "⏰";
                errorContent = "La solicitud tardó demasiado. Intenta de nuevo en unos segundos.";
            } else if (error instanceof ApiRateLimitError) {
                errorIcon = "🚦";
                errorContent = error.message;
            } else if (error instanceof ApiConnectionError) {
                errorIcon = "📡";
                errorContent = "No se pudo conectar con el servidor. Verifica tu conexión.";
            } else if (error instanceof ApiServerError) {
                errorIcon = "🔧";
                errorContent = `Servicio temporalmente no disponible: ${error.message}`;
            } else if (error instanceof Error) {
                errorContent = error.message;
            }

            const errorMsg: ChatMessage = {
                id: `error-${Date.now()}`,
                role: "assistant",
                content: `${errorIcon} ${errorContent}`,
                timestamp: new Date(),
                isError: true,
                failedMessage: text,  // Store original message for retry
            };

            setMessages((prev) => [
                ...prev.filter((m) => !m.isLoading),
                errorMsg,
            ]);
        } finally {
            setIsLoading(false);
            setLoadingStep(0);
            if (loadingTimerRef.current) {
                clearTimeout(loadingTimerRef.current);
                loadingTimerRef.current = null;
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleFollowUp = (question: string) => {
        handleSubmit(question);
    };

    // Phase 4: Retry a failed message
    const handleRetry = (failedMessage: string, errorMsgId: string) => {
        // Remove the error message before retrying
        setMessages((prev) => prev.filter((m) => m.id !== errorMsgId));
        handleSubmit(failedMessage);
    };

    // Check if only the welcome message exists (show suggestions)
    const showSuggestions = messages.length === 1 && messages[0].id === "welcome";

    return (
        <div className="flex h-full overflow-hidden">
            {/* Main Chat Area */}
            <div className="flex flex-col flex-1 h-full min-w-0">
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`animate-fade-in-up ${msg.role === "user" ? "flex justify-end" : "flex justify-start"
                                }`}
                        >
                            <div
                                className={`max-w-[90%] ${msg.role === "user"
                                    ? "bg-[var(--color-accent)] text-white rounded-2xl rounded-br-md px-4 py-2.5"
                                    : "text-[var(--color-text-primary)]"
                                    }`}
                            >
                                {/* Loading Indicator — Multi-Step */}
                                {msg.isLoading ? (
                                    <div className="py-2 space-y-2">
                                        {LOADING_STEPS.map((step, i) => (
                                            <div
                                                key={i}
                                                className={`flex items-center gap-2 text-xs transition-all duration-300 ${i < loadingStep
                                                    ? "text-[var(--color-success)] opacity-100"
                                                    : i === loadingStep
                                                        ? "text-[var(--color-accent)] opacity-100"
                                                        : "text-[var(--color-text-muted)] opacity-40"
                                                    }`}
                                            >
                                                <span className={`w-4 h-4 flex items-center justify-center ${i === loadingStep ? "animate-pulse" : ""
                                                    }`}>
                                                    {i < loadingStep ? "✓" : step.icon}
                                                </span>
                                                <span>{step.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <>
                                        <p className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.isError ? "text-[var(--color-error,#ef4444)]" : ""
                                            }`}>
                                            {msg.content}
                                        </p>

                                        {msg.measure_assistant && (() => {
                                            const ma = msg.measure_assistant;
                                            const visualKey = ma.target_visual_name || "";
                                            const isHelp = expandedHelp[visualKey] || false;
                                            const verifyFallback = manualVerifyMsg[visualKey];
                                            const st = ma.status;

                                            const borderClass = st === "SUCCESS"
                                                ? "border-green-500/30 bg-green-900/10"
                                                : st === "TROUBLESHOOT"
                                                    ? "border-yellow-500/30 bg-yellow-900/10"
                                                    : st === "MEASURE_MISSING"
                                                        ? "border-orange-500/20 bg-orange-900/5"
                                                        : st === "MEASURE_INCONCLUSIVE"
                                                            ? "border-blue-500/20 bg-blue-900/5"
                                                            : "border-[var(--color-border)] bg-[var(--color-bg-secondary)]";

                                            // Build copyable DAX string: "MeasureName = Expression", avoiding duplicates if backend sent it pre-formatted
                                            const fullDaxCopy = (ma.measure_name && ma.dax && !ma.dax.trim().startsWith(ma.measure_name))
                                                ? `${ma.measure_name} = ${ma.dax}`
                                                : ma.dax || "";

                                            return (
                                                <div className={`mt-3 rounded-xl border p-3 ${borderClass}`}>

                                                    {/* ── SUCCESS ── */}
                                                    {st === "SUCCESS" && (
                                                        <p className="text-xs font-semibold text-green-400">✅ Medida detectada en la tarjeta. Completado.</p>
                                                    )}

                                                    {/* ── MEASURE_EXISTS / WAITING_FOR_DRAG ── */}
                                                    {(st === "MEASURE_EXISTS" || st === "WAITING_FOR_DRAG") && (
                                                        <>
                                                            <p className="text-xs font-semibold text-[var(--color-text-primary)] mb-2">
                                                                📥 Necesito que arrastres una medida
                                                            </p>
                                                            <div className="text-xs text-[var(--color-text-secondary)] space-y-1 mb-2">
                                                                <ol className="list-decimal list-inside space-y-0.5">
                                                                    <li>En el panel <strong>Datos</strong> (derecha), busca la medida <strong>"{ma.measure_name}"</strong> (ícono de calculadora).</li>
                                                                    <li>Arrastra esa medida hacia la tarjeta vacía en el lienzo.</li>
                                                                    <li>Cuando la detecte, te confirmo aquí automáticamente.</li>
                                                                </ol>
                                                            </div>
                                                            <p className="text-[10px] text-[var(--color-text-muted)] mb-2 animate-pulse">🔎 Detectando cambios automáticamente…</p>
                                                        </>
                                                    )}

                                                    {/* ── WAITING_FOR_DRAG ── */}
                                                    {st === "WAITING_FOR_DRAG" && (
                                                        <>
                                                            {ma.reason_code === "DISTINCTCOUNT_IN_CARD_BLOCKED" && (
                                                                <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                                                                    Power BI Web no permite colocar conteos únicos directamente en tarjetas, por lo que creamos la tarjeta vacía.
                                                                </p>
                                                            )}
                                                            {ma.reason_code === "PERCENT_OF_TOTAL_BLOCKED" && (
                                                                <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                                                                    Power BI Web no permite crear porcentajes del total directamente en tarjetas sin una medida.
                                                                </p>
                                                            )}
                                                            {ma.reason_code === "RANK_BLOCKED" && (
                                                                <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                                                                    No es posible incrustar el ranking directamente en la tarjeta sin una medida explícita.
                                                                </p>
                                                            )}
                                                            {ma.reason_code === "running_total" && (
                                                                <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                                                                    Para acumulados, Power BI Web requiere una medida en el modelo. Hemos creado la tarjeta vacía.
                                                                </p>
                                                            )}
                                                            {ma.reason_code === "yoy" && (
                                                                <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                                                                    YoY requiere Time Intelligence y una columna de fecha en el modelo. Usa la fecha detectada: {ma.table}[{ma.column}].
                                                                </p>
                                                            )}
                                                            <p className="text-[10px] text-[var(--color-text-muted)] mb-2 animate-pulse">🔎 Detectando cambios automáticamente…</p>
                                                        </>
                                                    )}

                                                    {/* ── MEASURE_INCONCLUSIVE ── */}
                                                    {st === "MEASURE_INCONCLUSIVE" && (
                                                        <>
                                                            <p className="text-xs font-semibold text-[var(--color-text-primary)] mb-2">
                                                                🔍 No puedo confirmar automáticamente si la medida existe
                                                            </p>
                                                            <div className="text-xs text-[var(--color-text-secondary)] space-y-1 mb-2">
                                                                <p>El SDK no permite verificar esta medida directamente con la tarjeta.</p>
                                                                <ol className="list-decimal list-inside space-y-0.5">
                                                                    <li>En el panel <strong>Datos</strong> (derecha), busca <strong>"{ma.measure_name}"</strong> (ícono de calculadora 🔢).</li>
                                                                    <li><strong>Si la ves</strong>: arrástrala a la tarjeta vacía. Se detectará automáticamente.</li>
                                                                    <li><strong>Si NO la ves</strong>: créala en Desktop con el DAX de abajo, publica, y presiona <strong>"Actualizar Power BI"</strong>.</li>
                                                                </ol>
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* ── MEASURE_MISSING ── */}
                                                    {st === "MEASURE_MISSING" && (
                                                        <>
                                                            <p className="text-xs font-semibold text-[var(--color-text-primary)] mb-2">
                                                                🛠️ Crear medida en Power BI Desktop (Windows)
                                                            </p>
                                                            <div className="text-xs text-[var(--color-text-secondary)] space-y-1 mb-2">
                                                                <ol className="list-decimal list-inside space-y-1">
                                                                    <li>Abre <strong>Power BI Desktop</strong> (Windows).</li>
                                                                    <li>En el panel <strong>Campos</strong> (derecha), selecciona la tabla <strong>"{ma.table || 'tu tabla'}"</strong>{ma.reason_code === "yoy" && ma.column ? ` (usaremos la fecha ${ma.column})` : ""}.</li>
                                                                    <li>Arriba, ve a <strong>Modelado → Nueva medida</strong>.</li>
                                                                    <li>Haz clic en <strong>"📋 Copiar DAX"</strong> aquí abajo y pégalo en la barra de fórmula.</li>
                                                                    <li>Presiona <strong>Enter</strong> para guardar la medida.</li>
                                                                    <li>Ve a <strong>Archivo → Publicar</strong> (al mismo <strong>Workspace</strong> donde está el reporte que usas en PromtBI).</li>
                                                                    <li>Vuelve a PromtBI y presiona <strong>"🔄 Actualizar Power BI"</strong> aquí abajo.</li>
                                                                    <li>Cuando veas la medida (ícono calculadora 🔢 en Datos), arrástrala a la tarjeta vacía.</li>
                                                                </ol>
                                                            </div>
                                                            {fullDaxCopy && (
                                                                <pre className="whitespace-pre-wrap break-words rounded-lg bg-black/30 p-2 text-[11px] text-[var(--color-text-primary)] mb-2">{fullDaxCopy}</pre>
                                                            )}
                                                            {ma.format_hint === "percentage" && (
                                                                <p className="text-xs font-semibold text-blue-400 mb-2">
                                                                ⚡️ Después de crear la medida: ve a Modelado → Formato → Porcentaje en Desktop.
                                                                </p>
                                                            )}
                                                            <p className="text-[10px] text-[var(--color-text-muted)] mb-2">
                                                                ℹ️ En Power BI Web normalmente no puedes crear medidas si no tienes permisos para editar el dataset. Si estás solo en Web, abre el reporte en Desktop o pide permisos.
                                                            </p>
                                                        </>
                                                    )}

                                                    {/* ── TROUBLESHOOT ── */}
                                                    {st === "TROUBLESHOOT" && (
                                                        <>
                                                            <p className="text-xs font-semibold text-yellow-400 mb-2">⚠️ Solución de problemas</p>
                                                            <div className="text-xs text-[var(--color-text-secondary)] space-y-1 mb-2">
                                                                <ul className="list-disc list-inside space-y-0.5">
                                                                    <li>¿Ves el ícono de calculadora 🔢 junto al campo? Si no, no es una medida.</li>
                                                                    <li>¿Estás en <strong>modo Edición</strong> en Power BI?</li>
                                                                    <li>¿Tu organización bloquea edición del dataset?</li>
                                                                </ul>
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* ── DAX block (MEASURE_EXISTS / WAITING_FOR_DRAG / INCONCLUSIVE / TROUBLESHOOT) ── */}
                                                    {ma.dax && st !== "MEASURE_MISSING" && st !== "SUCCESS" && (
                                                        <pre className="whitespace-pre-wrap break-words rounded-lg bg-black/30 p-2 text-[11px] text-[var(--color-text-primary)] mb-2">{fullDaxCopy}</pre>
                                                    )}
                                                    {ma.format_hint === "percentage" && st !== "SUCCESS" && st !== "MEASURE_MISSING" && (
                                                        <p className="text-xs font-semibold text-blue-400 mb-2">
                                                          ⚡️ Después de crear la medida: ve a Modelado → Formato → Porcentaje en Desktop.
                                                        </p>
                                                    )}

                                                    {/* ── Botones ── */}
                                                    {st !== "SUCCESS" && (
                                                        <div className="flex flex-wrap gap-2 mb-2">
                                                            {/* Copiar DAX — copies "Name = Expression" */}
                                                            {fullDaxCopy && (
                                                                <button
                                                                    onClick={async () => { try { await navigator.clipboard.writeText(fullDaxCopy); } catch { /* */ } }}
                                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90 cursor-pointer"
                                                                >📋 Copiar DAX</button>
                                                            )}

                                                            {/* "Listo, ya la arrastré" — measure exists or waiting */}
                                                            {(st === "WAITING_FOR_DRAG" || st === "MEASURE_INCONCLUSIVE") && visualKey && (
                                                                <button
                                                                    onClick={() => handleManualVerify(visualKey)}
                                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:opacity-90 cursor-pointer"
                                                                >✅ Listo, ya la arrastré</button>
                                                            )}

                                                            {/* "Ya la creé" — missing or inconclusive (shows spinner) */}
                                                            {(st === "MEASURE_MISSING" || st === "MEASURE_INCONCLUSIVE") && visualKey && (
                                                                <button
                                                                    onClick={() => handleReprobe(visualKey)}
                                                                    disabled={refreshingVisual === visualKey}
                                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:opacity-90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >{refreshingVisual === visualKey ? (<><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verificando…</>) : "✅ Ya la creé"}</button>
                                                            )}

                                                            {/* "Actualizar Power BI" — missing, inconclusive, troubleshoot (shows spinner) */}
                                                            {(st === "MEASURE_MISSING" || st === "MEASURE_INCONCLUSIVE" || st === "TROUBLESHOOT") && visualKey && (
                                                                <button
                                                                    onClick={() => handleRefreshPBI(visualKey)}
                                                                    disabled={refreshingVisual === visualKey}
                                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:opacity-90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >{refreshingVisual === visualKey ? (<><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Actualizando…</>) : "🔄 Actualizar Power BI"}</button>
                                                            )}

                                                            {/* "No pude" */}
                                                            {(st === "MEASURE_MISSING" || st === "MEASURE_INCONCLUSIVE" || st === "WAITING_FOR_DRAG") && (
                                                                <button
                                                                    onClick={() => handleTroubleshoot(visualKey)}
                                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] cursor-pointer"
                                                                >❌ No pude</button>
                                                            )}

                                                            {/* "Reintentar verificación" — troubleshoot */}
                                                            {st === "TROUBLESHOOT" && visualKey && (
                                                                <button
                                                                    onClick={() => handleReprobe(visualKey)}
                                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90 cursor-pointer"
                                                                >🔄 Reintentar verificación</button>
                                                            )}

                                                            {/* Expand help */}
                                                            {st !== "TROUBLESHOOT" && (
                                                                <button
                                                                    onClick={() => setExpandedHelp(prev => ({ ...prev, [visualKey]: !prev[visualKey] }))}
                                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] cursor-pointer"
                                                                >❓ ¿Dónde la encuentro?</button>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Verify fallback message */}
                                                    {verifyFallback && <p className="text-xs text-yellow-400 mb-2">{verifyFallback}</p>}

                                                    {/* Expand help panel */}
                                                    {isHelp && st !== "TROUBLESHOOT" && st !== "SUCCESS" && (
                                                        <div className="text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border)] pt-2 mt-1 space-y-1">
                                                            <p className="font-medium text-[var(--color-text-secondary)]">Dónde encontrar la medida:</p>
                                                            <p>En el panel de Datos (derecha del lienzo), busca el ícono de calculadora 🔢 junto a tu tabla. Ahí verás las medidas disponibles.</p>
                                                            <p>Si no aparece, puede que la medida no exista aún en el modelo. Créala en Power BI Desktop: <strong>Modelado → Nueva medida</strong> → pega el DAX → Guarda y publica.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {/* Phase 4: Retry button for failed messages */}
                                        {msg.isError && msg.failedMessage && (
                                            <button
                                                onClick={() => handleRetry(msg.failedMessage!, msg.id)}
                                                disabled={isLoading}
                                                className="mt-2 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-accent)] hover:border-[var(--color-accent)] disabled:opacity-40 transition-colors cursor-pointer"
                                            >
                                                🔄 Reintentar
                                            </button>
                                        )}

                                        {/* Action Card */}
                                        {msg.action && msg.action.operation !== "ERROR" && (
                                            <ActionCard action={msg.action} intent={msg.intent || ""} />
                                        )}

                                        {/* Clickable Follow-up Questions */}
                                        {msg.action?.follow_up_questions &&
                                            msg.action.follow_up_questions.length > 0 && (
                                                <div className="mt-3 space-y-1.5">
                                                    {msg.action.follow_up_questions.map((q, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => handleFollowUp(q)}
                                                            className="block w-full text-left text-xs px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-colors cursor-pointer"
                                                        >
                                                            💡 {q}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                        {/* Confidence Badge */}
                                        {msg.confidence !== undefined && msg.confidence > 0 && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <div className="h-1 flex-1 bg-[var(--color-bg-secondary)] rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${msg.confidence * 100}%`,
                                                            backgroundColor:
                                                                msg.confidence > 0.8
                                                                    ? "var(--color-success)"
                                                                    : msg.confidence > 0.5
                                                                        ? "var(--color-warning)"
                                                                        : "var(--color-error)",
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-[10px] text-[var(--color-text-muted)]">
                                                    {Math.round(msg.confidence * 100)}%
                                                </span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Quick Action Suggestion Chips — shown only on first load */}
                    {showSuggestions && (
                        <div className="animate-fade-in-up pt-2">
                            <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mb-2 font-semibold">
                                Prueba estas acciones
                            </p>
                            <div className="grid grid-cols-1 gap-2">
                                {SUGGESTIONS.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSubmit(s.text)}
                                        className="suggestion-chip text-left text-xs px-3 py-2.5 rounded-xl bg-[var(--color-bg-secondary)]/60 border border-[var(--color-border)] text-[var(--color-text-secondary)] flex items-center gap-2"
                                    >
                                        <span className="text-base">{s.icon}</span>
                                        <span>{s.text}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-white/10 bg-[#050505]">
                    <div className="flex gap-2 items-end">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Escribe tu solicitud... (ej: 'Crea un gráfico de ventas...')"
                            className="flex-1 bg-[#0a0a0a] border border-white/10 focus:border-blue-500/50 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 resize-none transition-all focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                            rows={1}
                            disabled={isLoading}
                        />
                        <button
                            onClick={() => handleSubmit()}
                            disabled={!input.trim() || isLoading}
                            className="p-3 mb-0.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 2L11 13" />
                                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                            </svg>
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2 text-center">
                        Presiona Enter para enviar · Shift+Enter para nueva línea
                    </p>
                </div>
            </div>
        </div>
    );
}
