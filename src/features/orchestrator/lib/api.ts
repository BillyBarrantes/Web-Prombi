/**
 * API Client — Wrapper de fetch para comunicarse con el backend FastAPI.
 *
 * WHY: Centralizar las llamadas HTTP en un solo lugar para:
 * 1. Mantener la URL base en un solo sitio.
 * 2. Tipado automático con generics.
 * 3. Manejo de errores consistente con mensajes amigables.
 * 4. Timeout automático con AbortController (Phase 4).
 */

import type { ChatRequest, ChatResponse, Conversation, MeasureTemplate, MeasureTemplateListResponse } from "./types";
import { supabase } from "../../../lib/supabase";

// Producción (Vercel): usamos same-origin + rewrites (/api/* -> Cloud Run) para evitar CORS.
// Desarrollo local: permitimos VITE_API_URL apuntando a backend local/remoto.
const API_BASE = import.meta.env.DEV ? (import.meta.env.VITE_API_URL || "") : "";
const API_KEY = import.meta.env.VITE_API_KEY || "";

// WHY: El ciclo LangGraph puede tardar >40s en LIVE mode.
// Usamos 120s para evitar cortes prematuros en frontend/proxy.
const DEFAULT_TIMEOUT_MS = 120_000;

// ── Custom Error Types ──────────────────────────────────────

export class ApiTimeoutError extends Error {
    constructor(message = "La solicitud tardó demasiado. Intenta de nuevo.") {
        super(message);
        this.name = "ApiTimeoutError";
    }
}

export class ApiRateLimitError extends Error {
    retryAfter: number;
    constructor(retryAfter: number = 60) {
        super(
            `Has alcanzado el límite de solicitudes. Espera ${retryAfter} segundos.`
        );
        this.name = "ApiRateLimitError";
        this.retryAfter = retryAfter;
    }
}

export class ApiConnectionError extends Error {
    constructor(
        message = "No se pudo conectar con el servidor. Verifica tu conexión."
    ) {
        super(message);
        this.name = "ApiConnectionError";
    }
}

export class ApiServerError extends Error {
    errorType: string;
    constructor(message: string, errorType: string = "UNKNOWN") {
        super(message);
        this.name = "ApiServerError";
        this.errorType = errorType;
    }
}

// ── Core Fetch ──────────────────────────────────────────────

async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
    const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;

    // Phase 4: AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
    };

    // Phase 5: Include API key if configured
    if (API_KEY) {
        headers["X-API-Key"] = API_KEY;
    }

    // Phase 6: Inject Supabase JWT dynamically
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers,
            signal: controller.signal,
        });

        // ── HTTP 429: Rate Limit ────────────────────────────────
        if (response.status === 429) {
            const retryAfter = parseInt(
                response.headers.get("Retry-After") || "60",
                10
            );
            throw new ApiRateLimitError(retryAfter);
        }

        // ── HTTP 504: Gateway Timeout ───────────────────────────
        if (response.status === 504) {
            const body = await response.json().catch(() => ({}));
            throw new ApiTimeoutError(
                body.detail ||
                "La IA tardó demasiado en responder. Intenta de nuevo."
            );
        }

        // ── HTTP 503: Service Unavailable ───────────────────────
        if (response.status === 503) {
            const body = await response.json().catch(() => ({}));
            throw new ApiServerError(
                body.detail ||
                "El servicio no está disponible temporalmente.",
                body.error_type || "SERVICE_UNAVAILABLE"
            );
        }

        // ── Other errors ────────────────────────────────────────
        if (!response.ok) {
            const error = await response
                .json()
                .catch(() => ({ detail: "Error desconocido" }));
            throw new ApiServerError(
                error.detail || `Error HTTP ${response.status}`,
                error.error_type || "HTTP_ERROR"
            );
        }

        return response.json();
    } catch (error) {
        // ── AbortController timeout ─────────────────────────────
        if (error instanceof DOMException && error.name === "AbortError") {
            throw new ApiTimeoutError();
        }

        // ── Network error (offline, DNS, CORS) ──────────────────
        if (error instanceof TypeError && error.message.includes("fetch")) {
            throw new ApiConnectionError();
        }

        // Re-throw our custom errors
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

function shouldDebugPbi(): boolean {
    if (typeof window === "undefined") return false;
    try {
        const qs = new URLSearchParams(window.location.search);
        if (qs.has("pbi_debug")) return true;
        return window.localStorage?.getItem("PBI_DEBUG") === "1";
    } catch {
        return false;
    }
}

export async function sendChatMessage(
    request: ChatRequest
): Promise<ChatResponse> {
    const debugPbi = shouldDebugPbi();
    try {
        // Bypass Vercel Proxy para evitar timeouts de 120s en prompts complejos (Rank, % de Total)
        const CHAT_API_BASE = import.meta.env.NEXT_PUBLIC_API_BASE_URL 
                           || import.meta.env.VITE_API_URL 
                           || import.meta.env.VITE_API_BASE_URL 
                           || "https://api-power-bi-226858146865.us-central1.run.app";
        const chatUrl = `${CHAT_API_BASE.replace(/\/+$/, "")}/api/v1/chat`;
        
        const customTimeoutStr = import.meta.env.NEXT_PUBLIC_CHAT_TIMEOUT_MS || import.meta.env.VITE_CHAT_TIMEOUT_MS;
        const chatTimeoutMs = customTimeoutStr ? parseInt(customTimeoutStr as string, 10) : 240000;

        const response = await apiFetch<ChatResponse>(chatUrl, {
            method: "POST",
            body: JSON.stringify(request),
        }, chatTimeoutMs);
        if (debugPbi) {
            console.log("📡 ChatResponse:", {
                operation: response.action?.operation,
                intent: response.intent,
                explanation: response.action?.explanation?.slice(0, 120),
                confidence: response.confidence,
                retries_used: response.retries_used,
                actionsCount: response.actions?.length ?? 0,
            });
        }
        return response;
    } catch (err) {
        if (debugPbi) {
            const label = err instanceof ApiTimeoutError ? "TIMEOUT"
                : err instanceof ApiRateLimitError ? "RATE_LIMIT"
                : err instanceof ApiServerError ? `SERVER_${(err as ApiServerError).errorType}`
                : err instanceof ApiConnectionError ? "CONNECTION"
                : "UNKNOWN";
            console.warn(`📡 /api/v1/chat ERROR [${label}]:`, (err as any)?.message || err);
        }
        throw err;
    }
}

// ── History (Phase 6) ────────────────────────────────────────

export async function getConversations(): Promise<Conversation[]> {
    return apiFetch<Conversation[]>("/api/v1/conversations");
}

export async function getConversationMessages(
    conversationId: string
): Promise<any[]> {
    return apiFetch<any[]>(
        `/api/v1/conversations/${conversationId}/messages`
    );
}

export async function updateConversationTitle(
    conversationId: string,
    title: string
): Promise<void> {
    return apiFetch<void>(`/api/v1/conversations/${conversationId}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
    });
}

// ── Health ───────────────────────────────────────────────────

export async function checkHealth(): Promise<{
    status: string;
    pbi_mode: string;
}> {
    return apiFetch("/health", {}, 5_000); // 5s timeout for health check
}



// ── Measure Templates (Guided Onboarding) ───────────────────

export async function getMeasureTemplates(): Promise<MeasureTemplate[]> {
    const res = await apiFetch<MeasureTemplateListResponse>("/api/v1/measure-templates", {
        method: "GET",
    });
    return res.templates || [];
}

// ── Dataset Upload (Phase 5) ────────────────────────────────

export interface UploadDatasetResult {
    status: string;
    report_id: string;
    target_table_name: string;
    tables: Array<{
        table_name: string;
        columns: Array<{
            column_name: string;
            data_type: string;
            sample_values: string[];
        }>;
        row_count: number;
    }>;
}

export async function uploadDataset(
    file: File,
    reportId: string,
    targetTableName: string
): Promise<UploadDatasetResult> {
    const url = `${API_BASE}/api/v1/upload-dataset`;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("report_id", reportId);
    formData.append("target_table_name", targetTableName);

    const headers: Record<string, string> = {};
    if (API_KEY) {
        headers["X-API-Key"] = API_KEY;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            method: "POST",
            headers,
            body: formData,
            signal: controller.signal,
        });

        if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get("Retry-After") || "60", 10);
            throw new ApiRateLimitError(retryAfter);
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: "Error desconocido" }));
            throw new ApiServerError(
                error.detail || `Error HTTP ${response.status}`,
                "UPLOAD_ERROR"
            );
        }

        return response.json();
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
            throw new ApiTimeoutError("La subida del archivo tardó demasiado.");
        }
        if (error instanceof TypeError && error.message.includes("fetch")) {
            throw new ApiConnectionError();
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}
