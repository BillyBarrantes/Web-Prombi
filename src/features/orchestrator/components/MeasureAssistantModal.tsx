import { useEffect, useMemo, useState } from "react";
import type { MeasureAssistantOpenDetail, MeasureTemplate } from "../lib/types";
import type { ActionResult } from "../lib/actionHandler";
import { getActivePowerBiReport } from "../lib/pbiRuntime";
interface MeasureAssistantModalProps {
    open: boolean;
    detail: MeasureAssistantOpenDetail | null;
    templates: MeasureTemplate[];
    onClose: () => void;
    onLoadTemplates?: () => Promise<void>;
}

function fillTemplate(template: string, vars: Record<string, string>): string {
    let out = template;
    for (const [k, v] of Object.entries(vars)) {
        out = out.replaceAll(`{${k}}`, v);
    }
    return out;
}

export default function MeasureAssistantModal({ open, detail, templates, onClose, onLoadTemplates }: MeasureAssistantModalProps) {
    const [copied, setCopied] = useState(false);
    const [retrying, setRetrying] = useState(false);
    const [retryResult, setRetryResult] = useState<ActionResult | null>(null);

    useEffect(() => {
        if (!open) return;
        setCopied(false);
        setRetrying(false);
        setRetryResult(null);
        void onLoadTemplates?.();
    }, [open, onLoadTemplates]);

    const template = useMemo(() => {
        if (!detail?.template_id) return null;
        return templates.find((t) => t.id === detail.template_id) || null;
    }, [detail?.template_id, templates]);

    const dax = useMemo(() => {
        if (detail?.dax) return detail.dax;
        if (!template) return "";
        const vars = detail?.vars || {};
        return fillTemplate(template.dax_template, vars);
    }, [detail?.dax, detail?.vars, template]);

    if (!open || !detail) return null;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(dax);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // ignore
        }
    };

    const handleRetry = async () => {
        try {
            setRetrying(true);
            setRetryResult(null);

            const report = getActivePowerBiReport();
            if (!report) {
                setRetryResult({
                    success: false,
                    message: "Power BI report no está listo aún.",
                    operation: "VERIFY",
                    appliedToReport: false,
                });
                return;
            }

            const targetVisualName = String(detail.target_visual_name || "").trim();
            if (!targetVisualName) {
                setRetryResult({
                    success: false,
                    message: "No se pudo identificar la tarjeta objetivo para verificar.",
                    operation: "VERIFY",
                    appliedToReport: false,
                });
                return;
            }

            const page = await report.getActivePage();
            const visuals = await page.getVisuals();
            const visual = (Array.isArray(visuals)
                ? visuals.find((v: any) => String(v?.name || "").trim() === targetVisualName)
                : null) || null;

            if (!visual || typeof visual.getDataFields !== "function") {
                setRetryResult({
                    success: false,
                    message: "No se encontró la tarjeta objetivo o no soporta verificación.",
                    operation: "VERIFY",
                    appliedToReport: false,
                });
                return;
            }

            const roles = ["Fields", "Values", "Y"];
            let hasAnyField = false;
            for (const role of roles) {
                try {
                    const fields = await visual.getDataFields(role);
                    if (Array.isArray(fields) && fields.length > 0) {
                        hasAnyField = true;
                        break;
                    }
                } catch {
                    // ignore
                }
            }

            if (hasAnyField) {
                const res: ActionResult = {
                    success: true,
                    message: "✅ Listo. La medida ya está asignada a la tarjeta.",
                    operation: "VERIFY",
                    appliedToReport: true,
                };
                setRetryResult(res);
                setTimeout(() => onClose(), 800);
                return;
            }

            setRetryResult({
                success: false,
                message: "Aún no se asignó la medida a la tarjeta. Arrastra la medida al visual y vuelve a verificar.",
                operation: "VERIFY",
                appliedToReport: false,
            });
        } finally {
            setRetrying(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center">            <div className="absolute inset-0 bg-black/60" onClick={onClose} />            <div className="relative w-full max-w-2xl mx-4 rounded-2xl border border-white/10 bg-[var(--color-bg-secondary)] shadow-2xl overflow-hidden">                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">                    <div>                        <div className="text-sm font-semibold text-[var(--color-text-primary)]">Asistente de Medidas (Power BI)</div>                        <div className="text-xs text-[var(--color-text-muted)]">{detail.reason || "Esta métrica requiere una medida en el modelo"}</div>                    </div>                    <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white transition">✕</button>                </div>
                <div className="p-6 space-y-4">                    <div className="space-y-1">                        <div className="text-sm font-medium text-[var(--color-text-primary)]">1) Crea esta medida en Power BI Desktop</div>                        <div className="text-xs text-[var(--color-text-secondary)]">Modelado → Nueva medida. Nombre sugerido: <span className="font-semibold">{detail.measure_name || "(elige un nombre)"}</span></div>                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/40 p-4">                        <pre className="text-xs whitespace-pre-wrap text-slate-100">{dax}</pre>                    </div>
                    <div className="flex items-center gap-2">                        <button onClick={handleCopy} className="px-3 py-2.5 text-sm rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/10">                            {copied ? "Copiado" : "Copiar DAX"}                        </button>                        <button
                            onClick={handleRetry}
                            disabled={!detail.retry_action || retrying}
                            className="px-4 py-2.5 text-sm rounded-lg bg-[var(--color-accent)] hover:brightness-110 text-white font-semibold shadow-sm disabled:opacity-50 min-w-[120px]">                            {retrying ? "Verificando..." : "Verificar"}                        </button>                        <div className="ml-auto text-[10px] text-[var(--color-text-muted)]">                            Power BI Desktop (Windows)                        </div>                    </div>
                    {retryResult && (
                        <div className="text-xs text-[var(--color-text-secondary)]">                            {retryResult.success ? `✅ ${retryResult.message}` : `⚠️ ${retryResult.message}`}
                        </div>
                    )}

                    <div className="text-xs text-[var(--color-text-muted)]">                        2) Arrastra la medida al visual (tarjeta) y presiona Verificar. Si tu organización bloquea edición, pide permisos o crea la medida en el dataset original.                    </div>                </div>            </div>        </div>
    );
}
