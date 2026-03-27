
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
import { getCanvasVisualContext, getActivePowerBiReport } from "../lib/pbiRuntime";
import type { ChatMessage, ChatResponse, MeasureAssistantOpenDetail, MeasureAssistantStatus } from "../lib/types";
import type { ActionResult } from "../lib/actionHandler";
import { probeMeasureExists } from "../lib/actionHandler";
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
                window.dispatchEvent(new CustomEvent("measure-assistant:chat_success", { detail: { target_visual_name: targetVisualName } }));
            } else {
                setManualVerifyMsg((prev) => ({ ...prev, [targetVisualName]: "Si ya ves el número en la tarjeta, puedes continuar. Si no, recarga con Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)." }));
            }
        } catch {
            setManualVerifyMsg((prev) => ({ ...prev, [targetVisualName]: "No pude verificar. Si ya ves el número, continúa. Si no, recarga con Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)." }));
        }
    }, []);

    // ── Reprobe: "Ya la creé" button ───────────────────────
    const handleReprobe = useCallback(async (targetVisualName: string) => {
        console.log(`🔍 Reprobe clicked visual=${targetVisualName}`);
        try {
            const report = await getActivePowerBiReport();
            if (!report || typeof (report as any).getActivePage !== "function") return;
            const page = await (report as any).getActivePage();
            if (!page || typeof page.getVisuals !== "function") return;
            const visuals = await page.getVisuals();
            const v = Array.isArray(visuals) ? visuals.find((x: any) => String(x?.name || "") === targetVisualName) : null;
            if (!v) return;

            // Find the bubble to get table/measure info
            const bubbleMsg = messages.find(m => m.id === `measure-assistant-${targetVisualName}`);
            const tableName = bubbleMsg?.measure_assistant?.table || "";
            const measureName = bubbleMsg?.measure_assistant?.measure_name || "";

            const probeResult = await probeMeasureExists(v, tableName, measureName);
            console.log(`🔍 Reprobe result: exists=${probeResult.exists}`);

            const msgId = `measure-assistant-${targetVisualName}`;
            if (probeResult.exists) {
                // Transition to MEASURE_EXISTS and start polling
                setMessages(prev => prev.map(m => {
                    if (m.id !== msgId || !m.measure_assistant) return m;
                    return {
                        ...m,
                        content: `¡La medida "${measureName}" ya existe! Arrástrala a la tarjeta.`,
                        measure_assistant: { ...m.measure_assistant, status: "MEASURE_EXISTS" as MeasureAssistantStatus, measure_exists: true },
                    };
                }));
                // Dispatch event to start polling from actionHandler
                window.dispatchEvent(new CustomEvent("measure-assistant:start_polling", { detail: { target_visual_name: targetVisualName } }));
            } else {
                setManualVerifyMsg(prev => ({ ...prev, [targetVisualName]: "La medida aún no se detecta en el modelo. Verifica que publicaste el reporte y recarga con Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)." }));
            }
        } catch {
            setManualVerifyMsg(prev => ({ ...prev, [targetVisualName]: "No pude verificar. Recarga con Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows) y reintenta." }));
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
            const measureExists = detail.measure_exists === true;

            // Determine initial wizard state
            const initialStatus: MeasureAssistantStatus = measureExists ? "MEASURE_EXISTS" : "MEASURE_MISSING";
            const initialContent = measureExists
                ? `Necesito que arrastres la medida "${measureName}" a la tarjeta "${title}".`
                : `Primero hay que crear la medida "${measureName}" en Power BI Desktop.`;

            console.log(`💬 MeasureAssistant wizard: state=${initialStatus} measure_exists=${measureExists} visual=${visualKey}`);

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
                    measure_exists: measureExists,
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
            if (!visualKey) return;
            const msgId = `measure-assistant-${visualKey}`;
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
                        window.dispatchEvent(new CustomEvent("measure-assistant:chat_success", { detail: { target_visual_name: visualKey } }));
                    }
                } catch { /* ignore */ }
            }, intervalMs);
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
                                                        : "border-[var(--color-border)] bg-[var(--color-bg-secondary)]";

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
                                                            {st === "MEASURE_EXISTS" && (
                                                                <p className="text-[10px] text-[var(--color-text-muted)] mb-2 animate-pulse">🔎 Detectando cambios automáticamente…</p>
                                                            )}
                                                        </>
                                                    )}

                                                    {/* ── MEASURE_MISSING ── */}
                                                    {st === "MEASURE_MISSING" && (
                                                        <>
                                                            <p className="text-xs font-semibold text-[var(--color-text-primary)] mb-2">
                                                                🛠️ Primero hay que crear una medida (Power BI Desktop)
                                                            </p>
                                                            <div className="text-xs text-[var(--color-text-secondary)] space-y-1 mb-2">
                                                                <p>Esto requiere crear una medida en el modelo.</p>
                                                                <ol className="list-decimal list-inside space-y-0.5">
                                                                    <li>En <strong>Power BI Desktop</strong> (Windows): pestaña <strong>Modelado → Nueva medida</strong>.</li>
                                                                    <li>Pega este DAX y guarda:</li>
                                                                </ol>
                                                            </div>
                                                            {ma.dax && (
                                                                <pre className="whitespace-pre-wrap break-words rounded-lg bg-black/30 p-2 text-[11px] text-[var(--color-text-primary)] mb-2">{ma.dax}</pre>
                                                            )}
                                                            <div className="text-xs text-[var(--color-text-secondary)] space-y-1 mb-2">
                                                                <ol className="list-decimal list-inside space-y-0.5" start={3}>
                                                                    <li>Publica/guarda el reporte y vuelve a PromtBI.</li>
                                                                    <li>Presiona <strong>"Ya la creé"</strong> aquí abajo.</li>
                                                                </ol>
                                                            </div>
                                                            <p className="text-[10px] text-[var(--color-text-muted)] mb-2">
                                                                ℹ️ En Power BI Web normalmente no se pueden crear medidas sin permisos de edición del dataset. Si estás solo en Web, abre el reporte en Desktop o pide permisos.
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
                                                                    <li>Recarga con <strong>Cmd+Shift+R</strong> (Mac) / <strong>Ctrl+Shift+R</strong> (Windows) para refrescar el modelo.</li>
                                                                </ul>
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* ── DAX (MEASURE_EXISTS / WAITING_FOR_DRAG / TROUBLESHOOT) ── */}
                                                    {ma.dax && st !== "MEASURE_MISSING" && st !== "SUCCESS" && (
                                                        <pre className="whitespace-pre-wrap break-words rounded-lg bg-black/30 p-2 text-[11px] text-[var(--color-text-primary)] mb-2">{ma.dax}</pre>
                                                    )}

                                                    {/* ── Botones ── */}
                                                    {st !== "SUCCESS" && (
                                                        <div className="flex flex-wrap gap-2 mb-2">
                                                            {ma.dax && (
                                                                <button
                                                                    onClick={async () => { try { await navigator.clipboard.writeText(ma.dax || ""); } catch { /* */ } }}
                                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90 cursor-pointer"
                                                                >📋 Copiar DAX</button>
                                                            )}

                                                            {/* "Listo, ya la arrastré" — only when measure exists */}
                                                            {(st === "MEASURE_EXISTS" || st === "WAITING_FOR_DRAG") && visualKey && (
                                                                <button
                                                                    onClick={() => handleManualVerify(visualKey)}
                                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:opacity-90 cursor-pointer"
                                                                >✅ Listo, ya la arrastré</button>
                                                            )}

                                                            {/* "Ya la creé" — only when measure missing */}
                                                            {st === "MEASURE_MISSING" && visualKey && (
                                                                <button
                                                                    onClick={() => handleReprobe(visualKey)}
                                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:opacity-90 cursor-pointer"
                                                                >✅ Ya la creé</button>
                                                            )}

                                                            {/* "No pude" — on missing or exists */}
                                                            {(st === "MEASURE_EXISTS" || st === "MEASURE_MISSING" || st === "WAITING_FOR_DRAG") && (
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
