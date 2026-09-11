import { validateProviderUrl } from "../lib/security";
import type { LLMProvider, StreamRequest } from "./types";

export class OpenAICompatibleProvider implements LLMProvider {
  private readonly baseUrl: string;
  constructor(
    baseUrl: string,
    private readonly apiKey: string,
    private readonly headers: Record<string, string> = {},
  ) {
    this.baseUrl = validateProviderUrl(baseUrl);
  }
  private request(path: string, init?: RequestInit) {
    return fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...this.headers,
        ...init?.headers,
      },
      redirect: "error",
    });
  }
  async streamChat(v: StreamRequest) {
    return this.request("/chat/completions", {
      method: "POST",
      signal: v.signal,
      body: JSON.stringify({
        model: v.model,
        messages: v.messages,
        stream: true,
        stream_options: { include_usage: true },
        temperature: v.temperature,
        top_p: v.topP,
        max_tokens: v.maxOutputTokens,
      }),
    });
  }
  async getModels() {
    const response = await this.request("/models");
    if (!response.ok) throw new Error(`Connection failed (${response.status})`);
    const body = (await response.json()) as { data?: Array<{ id: string }> };
    return (body.data ?? []).map((m) => m.id);
  }
  async validateConnection() {
    const started = performance.now();
    await this.getModels();
    return {
      ok: true as const,
      latencyMs: Math.round(performance.now() - started),
    };
  }
}
