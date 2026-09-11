"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  api,
  type Conversation,
  type Model,
  type Provider,
} from "@/lib/desktop";

type Workspace = {
  providers: Provider[];
  models: Model[];
  conversations: Conversation[];
  active?: Conversation;
  setActive: (v: Conversation) => void;
  refresh: () => Promise<void>;
  newChat: () => Promise<void>;
};
const Context = createContext<Workspace | null>(null);
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation>();
  const refresh = useCallback(async () => {
    const [p, m, c] = await Promise.all([
      api.listProviders(),
      api.listModels(),
      api.listConversations(),
    ]);
    setProviders(p);
    setModels(m);
    setConversations(c);
    setActive((current) => current ?? c[0]);
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const newChat = useCallback(async () => {
    const conversation = await api.createConversation(models[0]?.id);
    setConversations((v) => [conversation, ...v]);
    setActive(conversation);
  }, [models]);
  const value = useMemo(
    () => ({
      providers,
      models,
      conversations,
      active,
      setActive,
      refresh,
      newChat,
    }),
    [providers, models, conversations, active, refresh, newChat],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error("WorkspaceProvider is missing");
  return value;
}
