import { useCallback } from "react";
import { useMessagesStore, Message } from "../store/messages";

export function useMessages() {
  const store = useMessagesStore();

  const sendMessage = useCallback(
    async (body: string, attachments: File[] = []) => {
      const { activeId, myAddress, conversations, appendMessage } =
        useMessagesStore.getState();
      if (!activeId || !body.trim()) return;
      const conv = conversations.find((c) => c.id === activeId);
      if (!conv) return;

      const msg: Message = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        conversationId: activeId,
        from: myAddress ?? "me",
        to: conv.peerAddress,
        body,
        timestamp: Date.now(),
        status: "pending",
        attachments: attachments.map((f) => ({
          name: f.name,
          size: f.size,
          mime: f.type,
        })),
      };
      appendMessage(msg);

      // TODO: in production, sign + broadcast via CosmJS SigningStargateClient
      // and upload attachments to storage server. For now, mark sent.
      setTimeout(() => {
        useMessagesStore.setState((s) => {
          const list = s.messages[activeId] ?? [];
          return {
            messages: {
              ...s.messages,
              [activeId]: list.map((m) =>
                m.id === msg.id ? { ...m, status: "sent" } : m
              ),
            },
          };
        });
      }, 400);
    },
    []
  );

  return { ...store, sendMessage };
}
