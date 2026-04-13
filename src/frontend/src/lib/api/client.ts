import { ApiEnvelope } from "../types/api";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "1";

/**
 * Generic API client with success/error envelope handling.
 */
export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const res = await fetch(url, {
      cache: "no-store",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail?.error?.message || `API Error: ${res.status}`);
    }

    const envelope: ApiEnvelope<T> = await res.json();
    
    if (!envelope.success) {
      throw new Error(envelope.error?.message || "Operation failed");
    }

    return envelope.data;
  } catch (err) {
    console.error(`[API Error] ${endpoint}:`, err);
    throw err;
  }
}
