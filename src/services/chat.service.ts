import { api, tokenStore, tryRefresh, emitSessionExpired } from './api';
import type {
  ChatModelsResponse,
  ChatRequestPayload,
  ChatResponsePayload,
} from './types';

function resolveChatText(payload: ChatResponsePayload): string {
  return (payload.message ?? payload.response ?? payload.content ?? '').trim();
}

export const chatService = {
  /** GET /api/chat/models */
  async getModels(): Promise<ChatModelsResponse> {
    return api.get<ChatModelsResponse>('/chat/models');
  },

  /** POST /api/chat/ */
  async send(payload: ChatRequestPayload): Promise<string> {
    const data = await api.post<ChatResponsePayload>('/chat/', payload);
    return resolveChatText(data);
  },

  /**
   * POST /api/chat/ with streamed response body.
   * Falls back to plain text parsing when backend does not emit SSE chunks.
   */
  async stream(payload: ChatRequestPayload, onChunk: (chunk: string) => void): Promise<string> {
    const baseUrl = import.meta.env.VITE_API_TARGET;

    const doFetch = (): Promise<Response> => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const token = tokenStore.getAccess();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      return fetch(`${baseUrl}/chat/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    };

    let res = await doFetch();

    // 401 → try refresh once, then re-attempt; on definitive failure emit
    // session-expired (mirrors the central request() wrapper in api.ts).
    if (res.status === 401) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        res = await doFetch();
      }
      if (res.status === 401) {
        tokenStore.clear();
        emitSessionExpired();
      }
    }

    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        detail = String(body?.detail ?? detail);
      } catch {
        // no-op
      }
      throw new Error(`${res.status}:${detail}`);
    }

    if (!res.body) {
      const fallback = await res.text();
      const normalized = fallback.trim();
      if (normalized) onChunk(normalized);
      return normalized;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('data:')) {
          const data = trimmed.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data) as Record<string, unknown>;
            const text = String(parsed.chunk ?? parsed.delta ?? parsed.message ?? parsed.content ?? '');
            if (!text) continue;
            fullText += text;
            onChunk(text);
          } catch {
            fullText += data;
            onChunk(data);
          }
          continue;
        }

        fullText += trimmed;
        onChunk(trimmed);
      }
    }

    if (!fullText.trim() && buffer.trim()) {
      fullText = buffer.trim();
      onChunk(fullText);
    }

    return fullText.trim();
  },
};
