
import type { models } from "powerbi-client";

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
