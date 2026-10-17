// IFeedRealtime — port for realtime feed freshness (FR-FEED-009).
//
// The application layer subscribes to new public, open posts so that
// the UI can show a "↑ N new posts" pill at the top of the feed. The full
// post row is NOT delivered here — the UI refetches the feed query when the
// user taps the pill (avoids client-side visibility/blocking re-checks).
//
// Adapter implementation: SupabaseFeedRealtime (Broadcast topic `feed:public`).

export interface NewPublicPostSignal {
  postId: string | null;
  ownerId: string | null;
}

export interface FeedRealtimeCallbacks {
  /**
   * Fires once per new Public + open post after the channel is SUBSCRIBED.
   * Carries ids only (null when the payload is malformed) so the UI can skip
   * the viewer's own posts.
   */
  onNewPublicPost: (post: NewPublicPostSignal) => void;
  /** Optional error sink. The store decides whether to surface or swallow. */
  onError?: (error: Error) => void;
}

export interface IFeedRealtime {
  /**
   * Subscribe to public-feed INSERTs. Returns an unsubscribe function the
   * caller must invoke on unmount (or when the screen is backgrounded for
   * more than 60s — see FR-FEED-009 AC3).
   */
  subscribeToPublicInserts(cb: FeedRealtimeCallbacks): () => void;
}
