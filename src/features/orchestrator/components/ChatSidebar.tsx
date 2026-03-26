
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
import { sendChatMessage, ApiTimeoutError, ApiRateLimitError, ApiConnectionError } from "../lib/api";
import { getCanvasVisualContext, getActivePowerBiReport } from "../lib/pbiRuntime";
import type { ChatMessage, ChatResponse, MeasureAssistantOpenDetail } from "../lib/types";
import type { ActionResult } from "../lib/actionHandler";
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
            if (!v || typeof v.getDataFields !== "function") throw new Error("no visual");
            const allFields = await v.getDataFields();
            let fieldsPresent = false;
            if (allFields && typeof allFields === "object") {
                for (const val of Object.values(allFields as Record<string, unknown>)) {
                    if (Array.isArray(val) && val.length > 0) { fieldsPresent = true; break; }
                }
            }
            console.log(`🧪 Manual verify result visual=${targetVisualName} fieldsPresent=${fieldsPresent}`);
            if (fieldsPresent) {
                window.dispatchEvent(new CustomEvent("measure-assistant:chat_success", { detail: { target_visual_name: targetVisualName } }));
            } else {
                setManualVerifyMsg(prev => ({ ...prev, [targetVisualName]: "Si ya ves el número en la tarjeta, puedes continuar. Si no, recarga con Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)." }));
            }
        } catch {
            setManualVerifyMsg(prev => ({ ...prev, [targetVisualName]: "No pude verificar el visual. Si ya ves el número en la tarjeta, puedes continuar. Si no, recarga con Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)." }));
        }
    }, []);

    // Measure Assistant (Chat) — escucha eventos disparados por actionHandler cuando el SDK bloquea inyección.
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

            setMessages((prev) => {
                // T7: Si ya existe burbuja para este visual, actualizar en lugar de duplicar.
                const existingIdx = prev.findIndex((m) => m.id === msgId);
                if (existingIdx !== -1) {
                    console.log(`♻️ MeasureAssistant bubble reused visual=${visualKey}`);
                    const updated = [...prev];
                    updated[existingIdx] = {
                        ...updated[existingIdx],
                        content: `He preparado la tarjeta "${title}". Por restricciones del SDK, necesito que arrastres la medida "${measureName}" hacia la tarjeta.`,
                        measure_assistant: {
                            status: "pending",
                            measure_name: measureName,
                            dax,
                            title,
                            target_visual_name: visualKey || undefined,
                            reason_code: reasonCode || undefined,
                            table: table || undefined,
                            column: column || undefined,
                        },
                    };
                    return updated;
                }

                console.log(`💬 MeasureAssistant bubble created for visual=${visualKey}`);
                return [
                    ...prev,
                    {
                        id: msgId,
                        role: "assistant",
                        content: `He preparado la tarjeta "${title}". Por restricciones del SDK, necesito que arrastres la medida "${measureName}" hacia la tarjeta.`,
                        timestamp: new Date(),
                        measure_assistant: {
                            status: "pending",
                            measure_name: measureName,
                            dax,
                            title,
                            target_visual_name: visualKey || undefined,
                            reason_code: reasonCode || undefined,
                            table: table || undefined,
                            column: column || undefined,
                        },
                    } as any,
                ];
            });
        };

        const onSuccess = (ev: any) => {
            const visualKey = String((ev as any)?.detail?.target_visual_name || "").trim();
            if (!visualKey) return;
            const msgId = `measure-assistant-${visualKey}`;
            console.log(`💬 MeasureAssistant success message appended visual=${visualKey}`);
            console.log(`💬 MeasureAssistant bubble status=success visual=${visualKey}`);

            setMessages((prev) => {
                const next = prev.map((m) => {
                    if (m.id !== msgId) return m;
                    if (!m.measure_assistant) return m;
                    return {
                        ...m,
                        measure_assistant: { ...m.measure_assistant, status: "success" as const },
                    };
                });
                return [
                    ...next,
                    {
                        id: `measure-assistant-ok-${Date.now()}`,
                        role: "assistant",
                        content: "¡Listo! Detecté la medida en la tarjeta. 🎉",
                        timestamp: new Date(),
                    },
                ];
            });
            // Limpiar mensaje de verify manual si había
            setManualVerifyMsg(prev => { const n = { ...prev }; delete n[visualKey]; return n; });
        };

        const onTimeout = (ev: any) => {
            const visualKey = String((ev as any)?.detail?.target_visual_name || "").trim();
            if (!visualKey) return;
            const msgId = `measure-assistant-${visualKey}`;
            console.log(`💬 MeasureAssistant bubble status=timeout visual=${visualKey}`);

            setMessages((prev) =>
                prev.map((m) => {
                    if (m.id !== msgId) return m;
                    if (!m.measure_assistant) return m;
                    return { ...m, measure_assistant: { ...m.measure_assistant, status: "timeout" as const } };
                })
            );
        };

        window.addEventListener("measure-assistant:chat_open", onOpen as any);
        window.addEventListener("measure-assistant:chat_success", onSuccess as any);
        window.addEventListener("measure-assistant:chat_timeout", onTimeout as any);
        return () => {
            window.removeEventListener("measure-assistant:chat_open", onOpen as any);
            window.removeEventListener("measure-assistant:chat_success", onSuccess as any);
            window.removeEventListener("measure-assistant:chat_timeout", onTimeout as any);
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

            // Notificar al padre sobre la acción generada
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
        } catch (error) {
            // Phase 4: Differentiated error messages
            let errorIcon = "❌";
            let errorContent = "Error desconocido. Intenta de nuevo.";

            if (error instanceof ApiTimeoutError) {
                errorIcon = "⏰";
                errorContent = error.message;
            } else if (error instanceof ApiRateLimitError) {
                errorIcon = "🚦";
                errorContent = error.message;
            } else if (error instanceof ApiConnectionError) {
                errorIcon = "📡";
                errorContent = error.message;
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

                                            return (
                                                <div className={`mt-3 rounded-xl border p-3 ${
                                                    ma.status === "success"
                                                        ? "border-green-500/30 bg-green-900/10"
                                                        : ma.status === "timeout"
                                                            ? "border-yellow-500/30 bg-yellow-900/10"
                                                            : "border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
                                                }`}>
                                                    {/* ── Bloque 1: Qué pasó ── */}
                                                    <p className="text-xs font-semibold text-[var(--color-text-primary)] mb-2">
                                                        {ma.status === "success" && "✅ Medida detectada en la tarjeta."}
                                                        {ma.status === "timeout" && "⏳ No se detectó la medida después de 2 minutos."}
                                                        {ma.status === "pending" && `⚠️ La agregación "${ma.measure_name || "medida"}" no puede inyectarse automáticamente en esta tarjeta.`}
                                                    </p>

                                                    {/* ── Bloque 2: Qué hacer ahora (solo pending/timeout) ── */}
                                                    {(ma.status === "pending" || ma.status === "timeout") && (
                                                        <div className="text-xs text-[var(--color-text-secondary)] space-y-1 mb-2">
                                                            <p className="font-medium">Qué hacer ahora:</p>
                                                            <ol className="list-decimal list-inside space-y-0.5">
                                                                <li>Busca <strong>"{ma.measure_name}"</strong> en el panel de Datos (derecha)</li>
                                                                <li>Arrastra esa medida a la tarjeta vacía en el lienzo</li>
                                                                <li>Cuando la detecte, te confirmo aquí automáticamente</li>
                                                            </ol>
                                                            {ma.status === "timeout" && (
                                                                <p className="mt-1 text-yellow-400">
                                                                    Si ya la asignaste, recarga con <strong>Cmd+Shift+R</strong> (Mac) / <strong>Ctrl+Shift+R</strong> (Windows).
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* ── DAX ── */}
                                                    {ma.dax && (
                                                        <pre className="whitespace-pre-wrap break-words rounded-lg bg-black/30 p-2 text-[11px] text-[var(--color-text-primary)] mb-2">
                                                            {ma.dax}
                                                        </pre>
                                                    )}

                                                    {/* ── Botones (solo pending/timeout) ── */}
                                                    {(ma.status === "pending" || ma.status === "timeout") && (
                                                        <div className="flex flex-wrap gap-2 mb-2">
                                                            {ma.dax && (
                                                                <button
                                                                    onClick={async () => {
                                                                        try { await navigator.clipboard.writeText(ma.dax || ""); } catch { /* ignore */ }
                                                                    }}
                                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90 cursor-pointer"
                                                                >
                                                                    📋 Copiar DAX
                                                                </button>
                                                            )}
                                                            {visualKey && (
                                                                <button
                                                                    onClick={() => handleManualVerify(visualKey)}
                                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:opacity-90 cursor-pointer"
                                                                >
                                                                    ✅ Listo, ya la arrastré
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => setExpandedHelp(prev => ({ ...prev, [visualKey]: !prev[visualKey] }))}
                                                                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] cursor-pointer"
                                                            >
                                                                ❓ ¿Dónde la encuentro?
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* ── Verify fallback message (T5) ── */}
                                                    {verifyFallback && (
                                                        <p className="text-xs text-yellow-400 mb-2">{verifyFallback}</p>
                                                    )}

                                                    {/* ── Bloque 3: Expand — si NO existe la medida (T2/T8) ── */}
                                                    {isHelp && (
                                                        <div className="text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border)] pt-2 mt-1 space-y-1">
                                                            <p className="font-medium text-[var(--color-text-secondary)]">Si la medida NO existe en el modelo:</p>
                                                            <ol className="list-decimal list-inside space-y-0.5">
                                                                <li>Abre Power BI Desktop</li>
                                                                <li>Ve a <strong>Modelado → Nueva medida</strong></li>
                                                                <li>Pega el DAX (usa el botón "Copiar DAX" arriba)</li>
                                                                <li>Guarda y publica el reporte</li>
                                                            </ol>
                                                            <p className="mt-1">En el panel de Datos (derecha del lienzo), busca el ícono de calculadora 🔢 junto a tu tabla. Ahí verás la medida recién creada.</p>
                                                        </div>
                                                    )}

                                                    {/* ── Success collapsed ── */}
                                                    {ma.status === "success" && (
                                                        <p className="text-xs text-green-400">Completado — la medida ya está en la tarjeta.</p>
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
