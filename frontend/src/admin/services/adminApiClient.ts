import { authService } from '../../user/services/authService';
import type { BackendConnectionStatus } from '../types/adminTypes';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

let currentBackendStatus: BackendConnectionStatus = 'FALLBACK_FIRESTORE';
const listeners = new Set<(status: BackendConnectionStatus) => void>();

function setBackendStatus(next: BackendConnectionStatus) {
  if (currentBackendStatus !== next) {
    currentBackendStatus = next;
    listeners.forEach(fn => fn(next));
  }
}

export const adminApiClient = {
  getBaseUrl(): string {
    return API_BASE_URL;
  },

  getStatus(): BackendConnectionStatus {
    return currentBackendStatus;
  },

  subscribeStatus(listener: (status: BackendConnectionStatus) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /**
   * Sends an authenticated request to Spring Boot `/api/v1/admin/**` with Bearer JWT.
   * Returns `{ ok: true, data }` when Spring Boot responds 2xx, or `{ ok: false }` when
   * Backend is offline / JWT unavailable (enabling seamless Firestore fallback).
   */
  async request<T>(
    path: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      body?: unknown;
      timeoutMs?: number;
      allowAnonymous?: boolean;
    } = {}
  ): Promise<{ ok: true; data: T; message?: string } | { ok: false; status?: number; error: string }> {
    const jwt = authService.getBackendJwt();
    if (!jwt && !options.allowAnonymous) {
      setBackendStatus('FALLBACK_FIRESTORE');
      return { ok: false, status: 401, error: 'NO_BACKEND_JWT' };
    }

    const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {})
    };

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
        signal: AbortSignal.timeout(options.timeoutMs ?? 5000)
      });

      if (!response.ok) {
        if (response.status >= 500 || response.status === 401 || response.status === 403) {
          setBackendStatus('FALLBACK_FIRESTORE');
        }
        let errMsg = `HTTP ${response.status}`;
        try {
          const errJson = await response.json();
          errMsg = errJson?.message || errMsg;
        } catch {}
        return { ok: false, status: response.status, error: errMsg };
      }

      const envelope = (await response.json()) as ApiEnvelope<T>;
      if (envelope && envelope.success !== false) {
        setBackendStatus('CONNECTED');
        return { ok: true, data: envelope.data, message: envelope.message };
      }
      return { ok: false, status: response.status, error: envelope?.message || 'API_ERROR' };
    } catch (err: any) {
      setBackendStatus('FALLBACK_FIRESTORE');
      return { ok: false, error: err?.message || 'NETWORK_UNAVAILABLE' };
    }
  }
};
