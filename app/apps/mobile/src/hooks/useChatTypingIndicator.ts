// KC#873 — peer typing indicator via Broadcast on chat:<id>:typing.
// Peer and self timers are separate: our own keystrokes must never cancel the
// timeout that clears the peer's "typing…" (which left it stuck on).

import { useCallback, useEffect, useRef, useState } from 'react';
import { container } from '../lib/container';

/** Peer "typing…" auto-clears if their "stopped" event is lost. */
export const PEER_TYPING_TIMEOUT_MS = 3500;
/** We announce "stopped" after this long without keystrokes. */
export const SELF_IDLE_MS = 3000;

export function useChatTypingIndicator(chatId: string, userId: string): {
  peerTyping: boolean;
  notifyComposerChanged: () => void;
  notifyMessageSent: () => void;
} {
  const [peerTyping, setPeerTyping] = useState(false);
  const peerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selfTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendTypingRef = useRef<(typing: boolean) => void>(() => {});

  useEffect(() => {
    if (!chatId || !userId) return;
    const sub = container.chatV2Realtime.subscribeTyping(chatId, userId, {
      onPeerTyping: ({ typing }) => {
        if (peerTimer.current) clearTimeout(peerTimer.current);
        peerTimer.current = null;
        setPeerTyping(typing);
        if (typing) peerTimer.current = setTimeout(() => setPeerTyping(false), PEER_TYPING_TIMEOUT_MS);
      },
    });
    sendTypingRef.current = sub.sendTyping;
    return () => {
      if (peerTimer.current) clearTimeout(peerTimer.current);
      if (selfTimer.current) clearTimeout(selfTimer.current);
      peerTimer.current = null;
      selfTimer.current = null;
      sendTypingRef.current = () => {};
      setPeerTyping(false);
      sub.unsubscribe();
    };
  }, [chatId, userId]);

  const notifyComposerChanged = useCallback(() => {
    sendTypingRef.current(true);
    if (selfTimer.current) clearTimeout(selfTimer.current);
    selfTimer.current = setTimeout(() => sendTypingRef.current(false), SELF_IDLE_MS);
  }, []);

  const notifyMessageSent = useCallback(() => {
    if (selfTimer.current) clearTimeout(selfTimer.current);
    selfTimer.current = null;
    sendTypingRef.current(false);
  }, []);

  return { peerTyping, notifyComposerChanged, notifyMessageSent };
}
