
/**
 * ReportArea — Área principal donde se muestra el reporte de Power BI.
 *
 * WHY: En MOCK mode, muestra una demo visual interactiva.
 * En LIVE mode, monta el Power BI JS SDK con el reporte real embebido.
 */

import { useState, useEffect } from "react";
import type { VisualAction, MeasureAssistantOpenDetail, MeasureTemplate } from "../lib/types";
import { VISUAL_TYPE_LABELS, OPERATION_LABELS } from "../lib/types";
import type { ActionResult } from "../lib/actionHandler";
import { getMeasureTemplates } from "../lib/api";
import { supabase } from "../../../lib/supabase";

// Dynamically import PowerBIEmbed to avoid SSR issues
import PowerBIEmbed from "./PowerBIEmbed";
import MeasureAssistantModal from "./MeasureAssistantModal";

interface ReportAreaProps {
    lastAction: VisualAction | null;
    actions: VisualAction[];
    lastResult?: ActionResult | null;
    isSidebarOpen?: boolean;
}

function formatDataRoleValue(value: any): string {
    if (typeof value === "string") return value;
    if (value?.ref) return value.ref;
    if (value?.table && value?.column) return `${value.table}[${value.column}]`;
    return JSON.stringify(value ?? "");
}

export default function ReportArea({ lastAction, actions, lastResult, isSidebarOpen = true }: ReportAreaProps) {
    const [selectedAction, setSelectedAction] = useState<number | null>(null);
    const [isLiveMode, setIsLiveMode] = useState(true); // Default to Live Mode for Production
    const [embedConfig, setEmbedConfig] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSynced, setIsSynced] = useState(false);
    const [measureAssistantOpen, setMeasureAssistantOpen] = useState(false);
    const [measureAssistantDetail, setMeasureAssistantDetail] = useState<MeasureAssistantOpenDetail | null>(null);
    const [measureTemplates, setMeasureTemplates] = useState<MeasureTemplate[]>([]);

    const loadMeasureTemplates = async () => {
        try {
            const templates = await getMeasureTemplates();
            setMeasureTemplates(templates);
        } catch {
            // ignore: el modal puede mostrar detail.dax aunque el catálogo no cargue
        }
    };


    const activeFilters = actions.filter((a) => a.operation === "FILTER");
    const visuals = actions.filter(
        (a) => a.operation === "CREATE" || a.operation === "CREATE_VISUAL"
    );

    useEffect(() => {
        if (typeof window === "undefined") return;
        const handler = (ev: any) => {
            const detail = ev?.detail as MeasureAssistantOpenDetail | undefined;
            if (!detail) return;
            setMeasureAssistantDetail(detail);
            setMeasureAssistantOpen(true);
        };
        window.addEventListener("measure-assistant:open", handler as any);
        return () => window.removeEventListener("measure-assistant:open", handler as any);
    }, []);


    // Handle Manual Sync
    const handleSync = async () => {
        if (!isLiveMode) return;

        try {
            setLoading(true);
            setError(null);
            // Hardcoded IDs for now, ideally passed from props or context
            const reportId = "94e97143-fcba-4d04-b871-9e4e3b0c65ed"; // Internal ID
            const tenantId = "9d36ff08-691e-4f7d-b1bf-049abf374860"; // Internal ID

            // Fetch Embed Config 
            // Uses the explicit VITE_API_URL and Supabase Auth Injection
            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            
            if (session?.access_token) {
                headers["Authorization"] = `Bearer ${session.access_token}`;
            }

            const apiKey = (import.meta as any).env.VITE_API_KEY;
            if (apiKey) {
                headers["X-API-Key"] = apiKey;
            }

            // Producción: usar same-origin (rewrites) para evitar CORS.
            // Dev: permitir VITE_API_URL si está configurado.
            const baseUrl = import.meta.env.DEV ? ((import.meta as any).env.VITE_API_URL || "") : "";
            const res = await fetch(`${baseUrl}/api/v1/embed-config`, {
                method: "POST",
                headers: headers,
                body: JSON.stringify({ report_id: reportId, tenant_id: tenantId })
            });

            if (!res.ok) {
                const errBody = await res.text();
                throw new Error(`Embed token error (${res.status}): ${errBody}`);
            }

            const data = await res.json();

            setEmbedConfig({
                type: "report",
                id: data.reportId,
                embedUrl: data.embedUrl,
                accessToken: data.accessToken,
                tokenType: PBI_TOKEN_TYPE_EMBED,
                permissions: PBI_PERMISSIONS_ALL,
                viewMode: PBI_VIEW_MODE_EDIT,
                settings: {
                    panes: {
                        filters: {
                            visible: false
                        },
                        pageNavigation: {
                            visible: false
                        }
                    },
                    background: PBI_BACKGROUND_TRANSPARENT,
                    // Layout: FitToWidth permite scroll vertical para muchos visuals
                    layoutType: 0, // LayoutType.Master
                    customLayout: {
                        displayOption: 1, // DisplayOption.FitToWidth
                        pageSize: {
                            type: 4, // PageSizeType.Custom
                            width: 1280,
                            height: 2000, // Espacio amplio para ~6 filas de visuals
                        },
                    },
                }
            });
            setIsSynced(true);
        } catch (err: any) {
            console.error("Error fetching embed config:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Top Bar — Report Info */}
            <div className="px-6 py-3 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-secondary)]/50">
                <div className="flex items-center gap-3">
                    
                    {/* Transposed Brand Logo (Appears when sidebar collapses) */}
                    {!isSidebarOpen && (
                        <div className="flex items-center gap-2 mr-2 pr-4 border-r border-white/10 animate-fade-in">
                            <span className="text-xl font-black tracking-tight text-white">PromtBI</span>
                            <span className="text-[10px] font-medium text-blue-500 border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 rounded-full">PRO</span>
                        </div>
                    )}

                    <div className={`w-3 h-3 rounded-full ${isLiveMode ? "bg-green-500 glow-green" : "bg-[var(--color-accent)] glow-accent"}`} />
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                        Reporte de Análisis
                    </span>
                    <button
                        onClick={() => setIsLiveMode(!isLiveMode)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${isLiveMode
                            ? "bg-green-900/30 text-green-400 border-green-800/40 hover:bg-green-900/50"
                            : "bg-amber-900/30 text-amber-400 border-amber-800/40 hover:bg-amber-900/50"
                            }`}
                    >
                        {isLiveMode ? "LIVE MODE" : "MOCK MODE"}
                    </button>
                    {loading && <span className="text-xs text-[var(--color-text-muted)] animate-pulse">Cargando Power BI...</span>}
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                    <span>📊 {visuals.length} visuals</span>
                    <span>•</span>
                    <span>🔍 {activeFilters.length} filtros</span>
                </div>
            </div>

            {/* Action Execution Status Banner */}
            {lastResult && (
                <div className={`px-4 py-2 text-xs flex items-center gap-2 animate-fade-in-up ${lastResult.success
                    ? lastResult.appliedToReport
                        ? "bg-green-900/20 text-green-400 border-b border-green-800/30"
                        : "bg-blue-900/20 text-blue-400 border-b border-blue-800/30"
                    : "bg-amber-900/20 text-amber-400 border-b border-amber-800/30"
                    }`}>
                    <span>{lastResult.success ? (lastResult.appliedToReport ? "✅" : "ℹ️") : "⚠️"}</span>
                    <span className="flex-1">{lastResult.message}</span>
                    {lastResult.appliedToReport && (
                        <span className="px-1.5 py-0.5 rounded bg-green-800/30 text-green-300 text-[10px] font-semibold">
                            APPLIED TO REPORT
                        </span>
                    )}
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 overflow-hidden relative bg-gradient-mesh p-4">

                {/* LIVE MODE: Power BI Embed */}
                {isLiveMode && isSynced && embedConfig ? (
                    <div className="w-full h-full rounded-2xl shadow-lg border border-white/10 overflow-hidden bg-white/5">
                        <PowerBIEmbed embedConfig={embedConfig} cssClassName="w-full h-full" />
                    </div>
                ) : (
                    /* MOCK MODE or NOT SYNCED YET: Visual Grid (Fallback/Empty State) */
                    <div className="h-full overflow-y-auto p-6">
                        {/* ... Existing Mock Content ... */}
                        {actions.length === 0 && !lastAction ? (
                            /* Empty State */
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[var(--color-accent)]/20 to-purple-600/20 border border-[var(--color-border)] flex items-center justify-center mb-6">
                                    <svg
                                        width="40"
                                        height="40"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="var(--color-accent)"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                                        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                                        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
                                    {isLiveMode && !isSynced ? "Conecta tu espacio de trabajo" : "Tu Lienzo de BI"}
                                </h2>
                                <p className="text-sm text-[var(--color-text-secondary)] max-w-md mb-6">
                                    {isLiveMode && !isSynced 
                                        ? "Sincroniza este entorno con tu reporte corporativo de Power BI para interactuar en lenguaje natural." 
                                        : "Usa el chat para interactuar con tu reporte. Las visualizaciones y acciones generadas por la IA aparecerán aquí."}
                                </p>

                                {/* Botón de Sincronización Manual */}
                                {isLiveMode && !isSynced && (
                                    <div className="flex flex-col items-center">
                                        <button 
                                            onClick={handleSync}
                                            disabled={loading}
                                            className="mb-6 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center gap-2"
                                        >
                                            {loading ? (
                                                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Cargando...</>
                                            ) : (
                                                <>⚡ Sincronizar con Power BI</>
                                            )}
                                        </button>
                                        {error && <p className="text-xs text-red-400 max-w-xs">{error}</p>}
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-3 max-w-sm">
                                    {[
                                        { icon: "📊", text: "Crea un gráfico de ventas" },
                                        { icon: "🔍", text: "Filtra por región Norte" },
                                        { icon: "📈", text: "Muestra tendencias mensuales" },
                                        { icon: "💡", text: "Explica el KPI principal" },
                                    ].map((hint, i) => (
                                        <div
                                            key={i}
                                            className="glass glass-hover rounded-xl p-3 text-xs text-[var(--color-text-secondary)] cursor-default"
                                        >
                                            <span className="mr-2">{hint.icon}</span>
                                            {hint.text}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* Visual Grid */
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Active Filters Bar */}
                                {activeFilters.length > 0 && (
                                    <div className="lg:col-span-2 glass rounded-xl p-3 flex items-center gap-3 flex-wrap">
                                        <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">
                                            Filtros Activos:
                                        </span>
                                        {activeFilters.map((f, i) =>
                                            f.filters?.map((filter, j) => (
                                                <span
                                                    key={`${i}-${j}`}
                                                    className="px-2.5 py-1 rounded-full text-[11px] bg-blue-900/30 text-blue-400 border border-blue-800/40"
                                                >
                                                    {filter.table}[{filter.column}] {filter.operator}{" "}
                                                    {filter.values.join(", ")}
                                                </span>
                                            ))
                                        )}
                                    </div>
                                )}

                                {/* Visual Cards */}
                                {visuals.map((action, i) => {
                                    const vInfo = action.visualType ? VISUAL_TYPE_LABELS[action.visualType] : undefined;
                                    const opInfo =
                                        OPERATION_LABELS[action.operation || "CREATE"] || OPERATION_LABELS["CREATE"];
                                    const isSelected = selectedAction === i;

                                    return (
                                        <div
                                            key={i}
                                            onClick={() => setSelectedAction(isSelected ? null : i)}
                                            className={`glass glass-hover rounded-xl p-5 cursor-pointer transition-all ${isSelected ? "border-[var(--color-accent)] glow-accent" : ""
                                                }`}
                                        >
                                            {/* Visual Header */}
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-2xl">{vInfo?.icon || "📊"}</span>
                                                    <div>
                                                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                                                            {action.title || vInfo?.label || "Visual"}
                                                        </p>
                                                        <p className="text-[10px] text-[var(--color-text-muted)]">
                                                            {vInfo?.label}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span
                                                    className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                                                    style={{ backgroundColor: opInfo.color }}
                                                >
                                                    {opInfo.label}
                                                </span>
                                            </div>

                                            {/* Mock Chart Preview */}
                                            <div className="h-32 rounded-lg bg-[var(--color-bg-primary)] border border-[var(--color-border)] flex items-end p-3 gap-1 overflow-hidden">
                                                {action.visualType === "barChart" ||
                                                    action.visualType === "columnChart"
                                                    ? [65, 85, 45, 90, 70, 55, 80].map((h, j) => (
                                                        <div
                                                            key={j}
                                                            className="flex-1 rounded-t-sm bg-gradient-to-t from-[var(--color-accent)] to-purple-500 transition-all duration-500"
                                                            style={{
                                                                height: `${h}%`,
                                                                opacity: 0.6 + j * 0.05,
                                                                animationDelay: `${j * 100}ms`,
                                                            }}
                                                        />
                                                    ))
                                                    : action.visualType === "lineChart" ||
                                                        action.visualType === "areaChart"
                                                        ? (
                                                            <svg viewBox="0 0 200 80" className="w-full h-full">
                                                                <defs>
                                                                    <linearGradient id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                                                                        <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.3" />
                                                                        <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
                                                                    </linearGradient>
                                                                </defs>
                                                                {action.visualType === "areaChart" && (
                                                                    <path d="M0,60 Q30,30 60,45 T120,25 T180,35 L200,40 L200,80 L0,80 Z" fill={`url(#grad-${i})`} />
                                                                )}
                                                                <path d="M0,60 Q30,30 60,45 T120,25 T180,35 L200,40" fill="none" stroke="var(--color-accent)" strokeWidth="2" />
                                                                {[{ x: 0, y: 60 }, { x: 60, y: 45 }, { x: 120, y: 25 }, { x: 180, y: 35 }].map((p, k) => (
                                                                    <circle key={k} cx={p.x} cy={p.y} r="3" fill="var(--color-accent)" />
                                                                ))}
                                                            </svg>
                                                        )
                                                        : action.visualType === "pieChart" ||
                                                            action.visualType === "donutChart"
                                                            ? (
                                                                <svg viewBox="0 0 80 80" className="w-full h-full">
                                                                    <circle cx="40" cy="40" r="35" fill="none" stroke="var(--color-accent)" strokeWidth="12" strokeDasharray="70 220" opacity="0.9" />
                                                                    <circle cx="40" cy="40" r="35" fill="none" stroke="#a855f7" strokeWidth="12" strokeDasharray="50 220" strokeDashoffset="-70" opacity="0.7" />
                                                                    <circle cx="40" cy="40" r="35" fill="none" stroke="#3b82f6" strokeWidth="12" strokeDasharray="40 220" strokeDashoffset="-120" opacity="0.6" />
                                                                    <circle cx="40" cy="40" r="35" fill="none" stroke="#f59e0b" strokeWidth="12" strokeDasharray="60 220" strokeDashoffset="-160" opacity="0.5" />
                                                                    {action.visualType === "donutChart" && (
                                                                        <circle cx="40" cy="40" r="20" fill="var(--color-bg-primary)" />
                                                                    )}
                                                                </svg>
                                                            )
                                                            : action.visualType === "card"
                                                                ? (
                                                                    <div className="w-full h-full flex flex-col items-center justify-center">
                                                                        <span className="text-3xl font-bold text-[var(--color-accent)]">
                                                                            $1.2M
                                                                        </span>
                                                                        <span className="text-[10px] text-[var(--color-text-muted)] mt-1">
                                                                            {action.title || "KPI"}
                                                                        </span>
                                                                    </div>
                                                                )
                                                                : (
                                                                    <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)] text-xs">
                                                                        Vista previa no disponible
                                                                    </div>
                                                                )}
                                            </div>

                                            {/* Data Roles */}
                                            {action.dataRoles && Object.keys(action.dataRoles).length > 0 && (
                                                <div className="mt-3 flex flex-wrap gap-1.5">
                                                    {Object.entries(action.dataRoles).map(([role, value]) => (
                                                        <span
                                                            key={role}
                                                            className="text-[10px] px-2 py-0.5 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-secondary)]"
                                                        >
                                                            {role}: {formatDataRoleValue(value)}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Explanation */}
                                            {isSelected && action.explanation && (
                                                <p className="mt-3 text-xs text-[var(--color-text-secondary)] leading-relaxed border-t border-[var(--color-border)] pt-3">
                                                    {action.explanation}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Latest Explain Action */}
                                {lastAction &&
                                    (lastAction.operation === "EXPLAIN" ||
                                        lastAction.operation === "UNKNOWN") && (
                                        <div className="lg:col-span-2 glass rounded-xl p-5">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-lg">💡</span>
                                                <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                                                    Análisis de la IA
                                                </span>
                                            </div>
                                            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                                                {lastAction.explanation}
                                            </p>
                                        </div>
                                    )}
                            </div>
                        )}
                    </div>
                )}
            </div>


            <MeasureAssistantModal
                open={measureAssistantOpen}
                detail={measureAssistantDetail}
                templates={measureTemplates}
                onClose={() => setMeasureAssistantOpen(false)}
                onLoadTemplates={loadMeasureTemplates}
            />
        </div>
    );
}
const PBI_TOKEN_TYPE_EMBED = 1;
const PBI_PERMISSIONS_ALL = 7;
const PBI_VIEW_MODE_EDIT = 1;
const PBI_BACKGROUND_TRANSPARENT = 1;
