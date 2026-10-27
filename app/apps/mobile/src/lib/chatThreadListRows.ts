// Builds FlatList rows for inverted chat threads (newest message first) — FR-CHAT-002.
import type { OptimisticMessage } from '../store/chatStore';

export type ChatThreadListRow =
  | { rowType: 'message'; message: OptimisticMessage }
  | { rowType: 'day'; anchorIso: string; rowKey: string };

function localCalendarDayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${m}-${day}`;
}

/** `messages` must be newest-first (same order as `reversedMessages` in chat screen). */
export function buildChatThreadRowsNewestFirst(messages: readonly OptimisticMessage[]): ChatThreadListRow[] {
  const out: ChatThreadListRow[] = [];
  for (let i = 0; i < messages.length; i += 1) {
    const cur = messages[i]!;
    out.push({ rowType: 'message', message: cur });
    const next = messages[i + 1];
    if (!next) continue;
    if (localCalendarDayKey(cur.createdAt) !== localCalendarDayKey(next.createdAt)) {
      const dk = localCalendarDayKey(next.createdAt);
      out.push({ rowType: 'day', anchorIso: next.createdAt, rowKey: `day-${dk}-${i}` });
    }
  }
  return out;
}
