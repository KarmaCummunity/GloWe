// KC#873 — peer typing indicator via Broadcast on chat:<id>:typing.

import { useEffect, useRef, useState } from 'react';
import { container } from '../lib/container';

export function useChatTypingIndicator(chatId: string, userId: string): {
  peerTyping: boolean;
  notifyComposerChanged: () => void;
} {
  const [peerTyping, setPeerTyping] = useState(false);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendTypingRef = useRef<(typing: boolean) => void>(() => {});

  useEffect(() => {
    const sub = container.chatV2Realtime.subscribeTyping(chatId, userId, {
      onPeerTyping: ({ typing }) => {
        setPeerTyping(typing);
        if (typing) {
          if (stopTimer.current) clearTimeout(stopTimer.current);
          stopTimer.current = setTimeout(() => setPeerTyping(false), 3500);
        }
      },
    });
    sendTypingRef.current = sub.sendTyping;
    return () => {
      if (stopTimer.current) clearTimeout(stopTimer.current);
      sub.unsubscribe();
    };
  }, [chatId, userId]);

  const notifyComposerChanged = () => {
    sendTypingRef.current(true);
    if (stopTimer.current) clearTimeout(stopTimer.current);
    stopTimer.current = setTimeout(() => sendTypingRef.current(false), 3500);
  };

  return { peerTyping, notifyComposerChanged };
}
