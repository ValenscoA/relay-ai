import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export type Provider = {
  id: string;
  name: string;
  baseUrl: string;
  maskedKey: string;
  customHeaders?: string;
  createdAt: string;
};
export type Model = {
  id: string;
  providerId: string;
  providerName: string;
  name: string;
  displayName: string;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
};
export type Conversation = {
  id: string;
  title: string;
  modelId?: string;
  systemPrompt?: string;
  temperature: number;
  topP: number;
  maxOutputTokens: number;
  createdAt: string;
  updatedAt: string;
};
export type Message = {
  id: string;
  conversationId: string;
  role: "system" | "user" | "assistant";
  content: string;
  createdAt: string;
};
export type UsageSummary = {
  totalRequests: number;
  totalTokens: number;
  estimatedSpend: number;
  averageTtftMs: number;
};
export type GenerationEvent =
  | { type: "delta"; requestId: string; text: string }
  | {
      type: "completed";
      requestId: string;
      messageId: string;
      inputTokens?: number;
      outputTokens?: number;
      durationMs: number;
      ttftMs?: number;
      estimatedCost?: number;
    }
  | { type: "failed"; requestId: string; message: string }
  | { type: "cancelled"; requestId: string };

const desktop = () => "__TAURI_INTERNALS__" in window;
export const api = {
  isDesktop: desktop,
  listProviders: () =>
    desktop() ? invoke<Provider[]>("list_providers") : Promise.resolve([]),
  saveProvider: (input: {
    id?: string;
    name: string;
    baseUrl: string;
    apiKey?: string;
    customHeaders?: string;
  }) => invoke<Provider>("save_provider", { input }),
  deleteProvider: (id: string) => invoke<void>("delete_provider", { id }),
  listModels: () =>
    desktop() ? invoke<Model[]>("list_models") : Promise.resolve([]),
  saveModel: (input: {
    id?: string;
    providerId: string;
    name: string;
    displayName: string;
    inputPricePerMillion: number;
    outputPricePerMillion: number;
  }) => invoke<string>("save_model", { input }),
  listConversations: () =>
    desktop()
      ? invoke<Conversation[]>("list_conversations")
      : Promise.resolve([]),
  createConversation: (modelId?: string) =>
    invoke<Conversation>("create_conversation", { modelId }),
  renameConversation: (id: string, title: string) =>
    invoke<void>("rename_conversation", { id, title }),
  deleteConversation: (id: string) =>
    invoke<void>("delete_conversation", { id }),
  listMessages: (conversationId: string) =>
    invoke<Message[]>("list_messages", { conversationId }),
  usageSummary: () =>
    desktop()
      ? invoke<UsageSummary>("usage_summary")
      : Promise.resolve({
          totalRequests: 0,
          totalTokens: 0,
          estimatedSpend: 0,
          averageTtftMs: 0,
        }),
  startGeneration: (input: {
    requestId: string;
    conversationId: string;
    modelId: string;
    message: string;
    systemPrompt?: string;
    temperature: number;
    topP: number;
    maxOutputTokens: number;
  }) => invoke<void>("start_generation", { input }),
  cancelGeneration: (requestId: string) =>
    invoke<void>("cancel_generation", { requestId }),
  exportData: (destination: string) =>
    invoke<void>("export_data", { destination }),
  importData: (source: string) => invoke<void>("import_data", { source }),
  onGeneration: (
    requestId: string,
    handler: (event: GenerationEvent) => void,
  ): Promise<UnlistenFn> =>
    listen<GenerationEvent>(`generation:${requestId}`, (event) =>
      handler(event.payload),
    ),
};
