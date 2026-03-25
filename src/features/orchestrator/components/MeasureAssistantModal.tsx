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

export default function MeasureAssistantModal({
    open,
    detail,
    templates,
    onClose,
    onLoadTemplates,
}: MeasureAssistantModalProps) {
    const [copied, setCopied] = useState(false);
    const [bound, setBound] = useState(false);
    const [status, setStatus] = useState<ActionResult | null>(null);

    useEffect(() => {
        if (!open) return;
        setCopied(false);
        setBound(false);
        setStatus(null);
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

    const measureName = String(detail?.measure_name || "").trim();

    useEffect(() => {
        if (!open || !detail?.target_visual_name) return;

        let cancelled = false;
        const target = String(detail.target_visual_name || "").trim();
        if (!target) return;

        const poll = async () => {
            try {
                const report = getActivePowerBiReport();
                if (!report) return;
                const page = await report.getActivePage();
                const visuals = await page.getVisuals();
                const visual = Array.isArray(visuals)
                    ? visuals.find((v: any) => String(v?.name || "").trim() === target)
                    : null;

                if (!visual || typeof visual.getDataFields !== "function") return;

                for (const role of ["Fields", "Values", "Y"]) {
                    try {
                        const fields = await visual.getDataFields(role);
                        if (Array.isArray(fields) && fields.length > 0) {
                            if (cancelled) return;
                            setBound(true);
                            setStatus({
                                success: true,
                                message: "✅ Listo. Detecté la medida asignada en la tarjeta.",
                                operation: "VERIFY",
                                appliedToReport: true,
                            });
                            setTimeout(() => onClose(), 900);
                            return;
                        }
                    } catch {
                        // ignore
                    }
                }
            } catch {
                // ignore
            }
        };

        void poll();
        const id = setInterval(() => void poll(), 900);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, [open, detail?.target_visual_name, onClose]);

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

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" />

            <div className="relative w-full max-w-2xl mx-4 rounded-2xl border border-white/10 bg-[var(--color-bg-secondary)] shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <div>
                        <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                            Asistente de Medidas (Power BI)
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)]">
                            {detail.reason || "Esta métrica requiere una medida en el modelo"}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-[var(--color-text-muted)] hover:text-white transition"
                        aria-label="Cerrar"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="space-y-1">
                        <div className="text-sm font-medium text-[var(--color-text-primary)]">
                            1) Crea esta medida en Power BI Desktop
                        </div>
                        <div className="text-xs text-[var(--color-text-secondary)]">
                            Modelado → Nueva medida. Nombre sugerido:{" "}
                            <span className="font-semibold">{measureName || "(elige un nombre)"}</span>
                        </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                        <pre className="text-xs whitespace-pre-wrap text-slate-100">{dax}</pre>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopy}
                            className="px-3 py-2.5 text-sm rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/10"
                        >
                            {copied ? "Copiado" : "Copiar DAX"}
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2.5 text-sm rounded-lg bg-[var(--color-accent)] hover:brightness-110 text-white font-semibold shadow-sm min-w-[120px]"
                        >
                            {bound ? "Listo" : "Cerrar"}
                        </button>
                        <div className="ml-auto text-[10px] text-[var(--color-text-muted)]">
                            Power BI Desktop (Windows)
                        </div>
                    </div>

                    {status ? (
                        <div className="text-xs text-[var(--color-text-secondary)]">
                            {status.success ? `✅ ${status.message}` : `⚠️ ${status.message}`}
                        </div>
                    ) : (
                        <div className="text-xs text-[var(--color-text-muted)]">
                            Esperando que asignes la medida a la tarjeta…
                        </div>
                    )}

                    <div className="text-xs text-[var(--color-text-muted)]">
                        2) Arrastra la medida a la tarjeta vacía. Este modal detectará el cambio y se cerrará automáticamente.
                        Si tu organización bloquea edición, pide permisos o crea la medida en el dataset original.
                    </div>
                </div>
            </div>
        </div>
    );
}
