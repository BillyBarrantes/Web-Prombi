
import type { models } from "powerbi-client";
import { supabase } from "../../../lib/supabase";

let sdkLoadPromise: Promise<typeof import("powerbi-client")> | null = null;
let powerbiService: any | null = null;
let activeReport: any | null = null;

async function loadPowerBiSdk(): Promise<typeof import("powerbi-client")> {
    if (typeof window === "undefined") {
        throw new Error("Power BI runtime is only available in the browser.");
    }

    if (!sdkLoadPromise) {
        sdkLoadPromise = (async () => {
            const sdk = await import("powerbi-client");
            const globalWindow = window as any;

            // Force legacy-global compatibility so authoring can patch
            // the same Power BI runtime instance used by this app.
            if (!globalWindow.powerbi) {
                globalWindow.powerbi = sdk;
            }
            if (!globalWindow["powerbi-client"]) {
                globalWindow["powerbi-client"] = sdk;
            }

            await import("powerbi-report-authoring");
            return sdk;
        })();
    }

    return sdkLoadPromise;
}

export async function embedPowerBiReport(
    container: HTMLDivElement,
    embedConfig: models.IReportEmbedConfiguration
): Promise<any> {
    const sdk = await loadPowerBiSdk();

    if (!powerbiService) {
        powerbiService = new sdk.service.Service(
            sdk.factories.hpmFactory,
            sdk.factories.wpmpFactory,
            sdk.factories.routerFactory
        );
    }

    powerbiService.reset(container);
    const report = powerbiService.embed(container, embedConfig);
    activeReport = report;
    (window as any).report = report;
    return report;
}

export async function resetPowerBiContainer(container: HTMLDivElement): Promise<void> {
    const sdk = await loadPowerBiSdk();

    if (!powerbiService) {
        powerbiService = new sdk.service.Service(
            sdk.factories.hpmFactory,
            sdk.factories.wpmpFactory,
            sdk.factories.routerFactory
        );
    }

    powerbiService.reset(container);
    if ((window as any).report && activeReport === (window as any).report) {
        delete (window as any).report;
    }
    activeReport = null;
}

function shouldDebugPbi(): boolean {
    try {
        return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("pbi_debug") === "1";
    } catch { return false; }
}

/**
 * Fetch a fresh embed config from the backend.
 * Reuses the same auth pattern as ReportArea.
 */
async function fetchEmbedConfig(): Promise<any> {
    const reportId = "94e97143-fcba-4d04-b871-9e4e3b0c65ed";
    const tenantId = "9d36ff08-691e-4f7d-b1bf-049abf374860";

    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
    }
    const apiKey = (import.meta as any).env.VITE_API_KEY;
    if (apiKey) {
        headers["X-API-Key"] = apiKey;
    }

    const baseUrl = import.meta.env.DEV ? ((import.meta as any).env.VITE_API_URL || "") : "";
    const res = await fetch(`${baseUrl}/api/v1/embed-config`, {
        method: "POST",
        headers,
        body: JSON.stringify({ report_id: reportId, tenant_id: tenantId }),
    });

    if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Embed config error (${res.status}): ${errBody}`);
    }

    const data = await res.json();
    return {
        type: "report",
        id: data.reportId,
        embedUrl: data.embedUrl,
        accessToken: data.accessToken,
        tokenType: 1, // Embed
        permissions: 7, // All
        viewMode: 1, // Edit
        settings: {
            panes: {
                filters: { visible: false },
                pageNavigation: { visible: false },
            },
            background: 1, // Transparent
            layoutType: 0,
            customLayout: {
                displayOption: 1,
                pageSize: { type: 4, width: 1280, height: 2000 },
            },
        },
    };
}

/**
 * Refresh the Power BI embed so new measures/model changes appear.
 * Step A: report.reload() — forces SDK to re-fetch model metadata.
 * Step B (fallback): re-embed with fresh config (new token + full reload).
 */
export async function refreshPowerBiEmbed(): Promise<{ ok: boolean; method: string }> {
    const debug = shouldDebugPbi();

    // Step A: Try report.reload()
    const report = getActivePowerBiReport();
    if (report && typeof report.reload === "function") {
        try {
            if (debug) console.log("🔄 embedReload start: report.reload()");
            await report.reload();
            // Wait for report to stabilize
            await new Promise(resolve => setTimeout(resolve, 1500));
            // Verify report is operational
            if (typeof report.getPages === "function") {
                const pages = await report.getPages();
                if (Array.isArray(pages) && pages.length > 0) {
                    if (debug) console.log("✅ report.reload OK — model metadata refreshed");
                    // Re-discover tables after reload
                    try { await discoverModelTables(report); } catch { /* best-effort */ }
                    return { ok: true, method: "reload" };
                }
            }
            if (debug) console.log("⚠️ report.reload completed but getPages empty — trying re-embed");
        } catch (err) {
            if (debug) console.warn("⚠️ report.reload failed:", err);
        }
    }

    // Step B: Re-embed with fresh config
    try {
        if (debug) console.log("🔁 re-embed start: fetching fresh config");
        const freshConfig = await fetchEmbedConfig();

        // Find the embed container
        const container = findEmbedContainer();
        if (!container) {
            if (debug) console.warn("❌ re-embed failed: no container found");
            return { ok: false, method: "re-embed:no_container" };
        }

        const sdk = await loadPowerBiSdk();
        if (!powerbiService) {
            powerbiService = new sdk.service.Service(
                sdk.factories.hpmFactory,
                sdk.factories.wpmpFactory,
                sdk.factories.routerFactory
            );
        }

        // Reset and re-embed
        powerbiService.reset(container);
        const newReport = powerbiService.embed(container, freshConfig);
        activeReport = newReport;
        (window as any).report = newReport;

        // Wait for load
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("re-embed timeout")), 15000);
            newReport.on("loaded", async () => {
                clearTimeout(timeout);
                // Switch to edit mode
                try { await newReport.switchMode("edit"); } catch { /* best-effort */ }
                // Re-discover tables
                try { await discoverModelTables(newReport); } catch { /* best-effort */ }
                resolve();
            });
            newReport.on("error", (ev: any) => {
                clearTimeout(timeout);
                reject(new Error(String(ev?.detail?.message || "embed error")));
            });
        });

        if (debug) console.log("✅ re-embed OK — fresh embed with new token");
        return { ok: true, method: "re-embed" };
    } catch (err) {
        if (debug) console.warn("❌ re-embed failed:", err);
        return { ok: false, method: "re-embed:error" };
    }
}

/** Find the PBI embed container in the DOM */
function findEmbedContainer(): HTMLDivElement | null {
    // The PowerBIEmbed component renders a div with an iframe inside
    const iframes = document.querySelectorAll("iframe[src*='powerbi']");
    for (const iframe of iframes) {
        if (iframe.parentElement instanceof HTMLDivElement) {
            return iframe.parentElement;
        }
    }
    // Fallback: look for container with powerbi embed class
    const containers = document.querySelectorAll("[class*='powerbi']");
    for (const c of containers) {
        if (c instanceof HTMLDivElement && c.querySelector("iframe")) {
            return c;
        }
    }
    return null;
}

export function getActivePowerBiReport(): any | null {
    if (activeReport) return activeReport;
    if (typeof window !== "undefined" && (window as any).report) {
        return (window as any).report;
    }
    return null;
}

export async function getCanvasVisualContext(): Promise<
    Array<{ id: string; type: string; title: string; page?: string }>
> {
    const report = getActivePowerBiReport();
    if (!report || typeof report.getActivePage !== "function") return [];

    try {
        const activePage = await report.getActivePage();
        if (!activePage || typeof activePage.getVisuals !== "function") return [];

        const visuals = await activePage.getVisuals();
        if (!Array.isArray(visuals) || visuals.length === 0) return [];

        const context: Array<{ id: string; type: string; title: string; page?: string }> = [];
        for (const visual of visuals) {
            const id = String(visual?.name || "").trim();
            if (!id) continue;
            const type = String(visual?.type || "").trim();
            let title = "";

            if (typeof visual?.title === "string" && visual.title.trim()) {
                title = visual.title.trim();
            }

            if (!title && typeof visual?.getProperty === "function") {
                try {
                    const value = await visual.getProperty({
                        objectName: "title",
                        propertyName: "titleText",
                    });
                    if (typeof value?.value === "string" && value.value.trim()) {
                        title = value.value.trim();
                    }
                } catch {
                    // title extraction best-effort
                }
            }

            if (!title) title = id;
            context.push({
                id,
                type,
                title,
                page: String(activePage?.name || ""),
            });
        }
        return context;
    } catch {
        return [];
    }
}

// ── Dynamic Table Discovery ──────────────────────────────────
// Caché de nombres de tabla reales del modelo de Power BI.
// Se puebla al cargar el reporte vía discoverModelTables().
let _discoveredTables: string[] = [];

/**
 * Introspecciona los visuals existentes del reporte para descubrir
 * los nombres REALES de las tablas en el modelo de Power BI.
 *
 * WHY: El nombre de tabla en PBI es inestable (puede mutar entre sesiones).
 * El LLM usa un diccionario estático que puede quedar desactualizado.
 * Esta función extrae los nombres reales en runtime para corregir
 * cualquier desajuste automáticamente.
 */
export async function discoverModelTables(report: any): Promise<string[]> {
    const tables = new Set<string>();
    const columnsByTable = new Map<string, Set<string>>();

    try {
        let activePage: any = null;
        if (typeof report.getActivePage === "function") {
            activePage = await report.getActivePage();
        }
        if (!activePage && typeof report.getPages === "function") {
            const pages = await report.getPages();
            activePage = pages?.find((p: any) => p.isActive) || pages?.[0];
        }
        if (!activePage || typeof activePage.getVisuals !== "function") {
            console.warn("⚠️ discoverModelTables: No se pudo obtener la página activa.");
            return [];
        }

        const visuals = await activePage.getVisuals();
        if (!Array.isArray(visuals) || visuals.length === 0) return [];

        // Roles comunes donde buscar tabla+columna ya inyectados
        const rolesToProbe = ["Category", "Y", "Values", "X", "Rows", "Columns", "Series", "Legend", "Axis"];

        for (const visual of visuals) {
            if (typeof visual?.getDataFields !== "function") continue;

            for (const role of rolesToProbe) {
                try {
                    const fields = await visual.getDataFields(role);
                    if (!Array.isArray(fields)) continue;

                    for (const field of fields) {
                        const tableName = (field as any)?.table;
                        const colName = (field as any)?.column;
                        if (typeof tableName === "string" && tableName.trim()) {
                            const tName = tableName.trim();
                            tables.add(tName);
                            if (!columnsByTable.has(tName)) {
                                columnsByTable.set(tName, new Set<string>());
                            }
                            if (typeof colName === "string" && colName.trim()) {
                                columnsByTable.get(tName)!.add(colName.trim());
                            }
                        }
                    }
                } catch {
                    // Rol no existe en este visual — continuar
                }
            }
        }
    } catch (err) {
        console.warn("⚠️ discoverModelTables falló:", err);
    }

    _discoveredTables = Array.from(tables);

    if (_discoveredTables.length > 0) {
        console.log("✅ Tablas descubiertas del modelo PBI:", _discoveredTables.join(", "));
        for (const [table, cols] of columnsByTable.entries()) {
            console.log(`   📋 "${table}" columnas: ${Array.from(cols).join(", ")}`);
        }
    } else {
        console.warn("⚠️ No se descubrieron tablas del modelo. Los visuals existentes pueden estar vacíos.");
    }

    return _discoveredTables;
}

/**
 * Resuelve un nombre de tabla del LLM al nombre real en el modelo de PBI.
 *
 * Estrategia:
 * 1. Coincidencia exacta (caché hit directo)
 * 2. Coincidencia case-insensitive
 * 3. Fuzzy: el nombre real "contiene" o "está contenido en" el del LLM
 *    (cubre mutaciones como API-DatosPrueba ↔ API-DatosPrueba_Final)
 * 4. Fallback: devuelve el nombre original del LLM
 */
export function resolveRealTableName(llmTableName: string): string {
    const trimmed = (llmTableName || "").trim();
    if (!trimmed || _discoveredTables.length === 0) return trimmed;

    // 1. Exacta
    if (_discoveredTables.includes(trimmed)) return trimmed;

    // 2. Single-table model: si solo hay UNA tabla en el modelo PBI,
    // usarla SIEMPRE sin importar lo que diga el LLM o Supabase.
    // Esto cubre el caso donde Supabase dice "API-DatosPrueba_Final"
    // pero PBI tiene la tabla como "Tabla".
    if (_discoveredTables.length === 1) {
        const realTable = _discoveredTables[0];
        if (realTable !== trimmed) {
            console.log(`🔄 Table resolved (single-table model): "${trimmed}" → "${realTable}"`);
        }
        return realTable;
    }

    const llmLower = trimmed.toLowerCase();

    // 3. Case-insensitive
    const ciMatch = _discoveredTables.find(t => t.toLowerCase() === llmLower);
    if (ciMatch) return ciMatch;

    // 4. Fuzzy: uno contiene al otro (cubre _Final, _v2, etc.)
    const fuzzyMatch = _discoveredTables.find(t => {
        const realLower = t.toLowerCase();
        return realLower.includes(llmLower) || llmLower.includes(realLower);
    });
    if (fuzzyMatch) {
        console.log(`🔄 Table resolved: "${trimmed}" → "${fuzzyMatch}"`);
        return fuzzyMatch;
    }

    // 5. Fallback
    return trimmed;
}

/** Devuelve las tablas descubiertas (para debugging/logging) */
export function getDiscoveredTables(): string[] {
    return [..._discoveredTables];
}
