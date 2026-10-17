export interface FeedCursor {
  createdAt: string; // ISO8601
  /** Tie-breaker for rows sharing createdAt (keyset on (created_at, post_id)). Optional for old cursors. */
  postId?: string;
}

// Opaque cursor — URL-safe encoding works in both Node and React Native (Hermes
// has no global Buffer; the previous base64url path crashed at runtime in mobile).
// Cursor values are interpolated into a PostgREST filter, so only plain ISO-8601
// timestamps and UUIDs are accepted.
const ISO_TS_RE = /^\d{4}-\d{2}-\d{2}[T ][0-9:.]+(Z|[+-]\d{2}(:?\d{2})?)?$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeCursor(cursor: FeedCursor): string {
  return encodeURIComponent(JSON.stringify(cursor));
}

export function decodeCursor(raw: string | undefined): FeedCursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<FeedCursor>;
    if (!parsed.createdAt || typeof parsed.createdAt !== 'string') return null;
    if (!ISO_TS_RE.test(parsed.createdAt) || Number.isNaN(Date.parse(parsed.createdAt))) return null;
    const postId = typeof parsed.postId === 'string' && UUID_RE.test(parsed.postId) ? parsed.postId : undefined;
    return postId ? { createdAt: parsed.createdAt, postId } : { createdAt: parsed.createdAt };
  } catch {
    return null;
  }
}
