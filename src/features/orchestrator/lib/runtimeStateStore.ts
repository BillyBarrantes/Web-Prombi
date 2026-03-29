import { getRuntimeState, patchRuntimeState } from "./api";
import type { RuntimeState } from "./types";

export interface IRuntimeStateStore {
    state: RuntimeState;
    load: (tenant_id: string, report_id: string) => Promise<void>;
    patch: (payload: {
        blocked_capabilities?: Record<string, boolean>;
        suggested_measures_shown?: string[];
        user_acknowledged?: Record<string, boolean>;
        replace?: boolean;
    }) => Promise<void>;
}

let currentTenantId = "";
let currentReportId = "";

export const runtimeStateStore: IRuntimeStateStore = {
    state: {
        blocked_capabilities: {},
        suggested_measures_shown: [],
        user_acknowledged: {},
        persistence_enabled: false
    },
    load: async (tenant_id: string, report_id: string) => {
        if (!tenant_id || !report_id) return;
        currentTenantId = tenant_id;
        currentReportId = report_id;
        try {
            const data = await getRuntimeState(tenant_id, report_id);
            runtimeStateStore.state = { ...runtimeStateStore.state, ...data };
            if (typeof window !== "undefined") {
                try {
                    const qs = new URLSearchParams(window.location.search);
                    if (qs.has("pbi_debug") || window.localStorage?.getItem("PBI_DEBUG") === "1") {
                        console.log(`📦 RuntimeState loaded (persistence_enabled: ${data.persistence_enabled})`, data);
                    }
                } catch { /* ignore */ }
            }
        } catch (e) {
            console.warn("Failed to load runtime state", e);
        }
    },
    patch: async (payload) => {
        if (!runtimeStateStore.state.persistence_enabled || !currentTenantId || !currentReportId) {
            return; // silent no-op
        }
        try {
            // Optimistic merge in memory to avoid race conditions
            if (payload.blocked_capabilities) {
                runtimeStateStore.state.blocked_capabilities = {
                    ...runtimeStateStore.state.blocked_capabilities,
                    ...payload.blocked_capabilities
                };
            }
            if (payload.suggested_measures_shown) {
                runtimeStateStore.state.suggested_measures_shown = [
                    ...runtimeStateStore.state.suggested_measures_shown,
                    ...payload.suggested_measures_shown
                ];
            }
            if (payload.user_acknowledged) {
                runtimeStateStore.state.user_acknowledged = {
                    ...runtimeStateStore.state.user_acknowledged,
                    ...payload.user_acknowledged
                };
            }

            const data = await patchRuntimeState(currentTenantId, currentReportId, payload);
            runtimeStateStore.state = { ...runtimeStateStore.state, ...data };
            
            if (typeof window !== "undefined") {
                try {
                    const qs = new URLSearchParams(window.location.search);
                    if (qs.has("pbi_debug") || window.localStorage?.getItem("PBI_DEBUG") === "1") {
                        console.log(`📝 RuntimeState patched: { ${Object.keys(payload).join(", ")} }`, data);
                    }
                } catch { /* ignore */ }
            }
        } catch (e) {
            console.warn("Failed to patch runtime state", e);
        }
    }
};
