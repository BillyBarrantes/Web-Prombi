import { useEffect, useMemo, useState } from "react";
import type { MeasureAssistantOpenDetail, MeasureTemplate } from "../lib/types";
import type { ActionResult } from "../lib/actionHandler";
import { executeAction } from "../lib/actionHandler";

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
        if (!detail.retry_action) return;
        try {
            setRetrying(true);
            setRetryResult(null);
            const res = await executeAction(detail.retry_action);
            setRetryResult(res);
        } finally {
            setRetrying(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center">            <div className="absolute inset-0 bg-black/60" onClick={onClose} />            <div className="relative w-full max-w-2xl mx-4 rounded-2xl border border-white/10 bg-[var(--color-bg-secondary)] shadow-2xl overflow-hidden">                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">                    <div>                        <div className="text-sm font-semibold text-[var(--color-text-primary)]">Asistente de Medidas (Power BI)</div>                        <div className="text-xs text-[var(--color-text-muted)]">{detail.reason || "Esta métrica requiere una medida en el modelo"}</div>                    </div>                    <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white transition">✕</button>                </div>
                <div className="p-6 space-y-4">                    <div className="space-y-1">                        <div className="text-sm font-medium text-[var(--color-text-primary)]">1) Crea esta medida en Power BI Desktop</div>                        <div className="text-xs text-[var(--color-text-secondary)]">Modelado → Nueva medida. Nombre sugerido: <span className="font-semibold">{detail.measure_name || "(elige un nombre)"}</span></div>                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/40 p-4">                        <pre className="text-xs whitespace-pre-wrap text-slate-100">{dax}</pre>                    </div>
                    <div className="flex items-center gap-2">                        <button onClick={handleCopy} className="px-3 py-2 text-xs rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/10">                            {copied ? "Copiado" : "Copiar DAX"}                        </button>                        <button
                            onClick={handleRetry}
                            disabled={!detail.retry_action || retrying}
                            className="px-3 py-2 text-xs rounded-lg bg-[var(--color-accent)]/90 hover:bg-[var(--color-accent)] text-black font-semibold disabled:opacity-50">                            {retrying ? "Reintentando..." : "Reintentar"}                        </button>                        <div className="ml-auto text-[10px] text-[var(--color-text-muted)]">                            Power BI Desktop (Windows)                        </div>                    </div>
                    {retryResult && (
                        <div className="text-xs text-[var(--color-text-secondary)]">                            {retryResult.success ? `✅ ${retryResult.message}` : `⚠️ ${retryResult.message}`}
                        </div>
                    )}

                    <div className="text-xs text-[var(--color-text-muted)]">                        2) Guarda el reporte y vuelve a intentar. Si tu organización bloquea edición, pide permisos de edición o crea la medida en el dataset original.                    </div>                </div>            </div>        </div>
    );
}
