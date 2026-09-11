export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type StreamRequest = { model: string; messages: ChatMessage[]; temperature: number; topP: number; maxOutputTokens: number; signal?: AbortSignal };
export interface LLMProvider { streamChat(request: StreamRequest): Promise<Response>; getModels(): Promise<string[]>; validateConnection(): Promise<{ ok: true; latencyMs: number }>; }
