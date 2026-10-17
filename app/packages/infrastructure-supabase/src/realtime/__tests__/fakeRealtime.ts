/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi } from 'vitest';

export interface FakeBinding {
  type: string;
  filter: any;
  handler: (payload: any) => void;
}

export interface FakeChannel {
  topic: string;
  name: string;
  config: any;
  bindings: FakeBinding[];
  statusCb?: (status: string) => void;
  removed: boolean;
  send: ReturnType<typeof vi.fn>;
  track: ReturnType<typeof vi.fn>;
  presence: Record<string, unknown[]>;
  /** Fire every binding of `type` whose filter.event matches. */
  emit(type: string, event: string, payload: any): void;
}

/** Minimal realtime client double: caches channels by topic like realtime-js. */
export function makeFakeRealtime() {
  const created: FakeChannel[] = [];
  const live: FakeChannel[] = [];
  const builders = new WeakMap<object, FakeChannel>();
  const setAuth = vi.fn(async () => undefined);

  const channel = vi.fn((name: string, params?: { config?: any }) => {
    const existing = live.find((c) => c.name === name);
    if (existing) return existing as any;
    const fc: FakeChannel = {
      topic: `realtime:${name}`,
      name,
      config: params?.config,
      bindings: [],
      removed: false,
      send: vi.fn(async () => 'ok'),
      track: vi.fn(async () => 'ok'),
      presence: {},
      emit(type, event, payload) {
        for (const b of this.bindings) {
          if (b.type === type && (b.filter?.event === event || b.filter?.event === '*')) b.handler(payload);
        }
      },
    };
    const self: any = fc;
    self.on = (type: string, filter: any, handler: (p: any) => void) => {
      fc.bindings.push({ type, filter, handler });
      return self;
    };
    self.subscribe = (cb?: (status: string) => void) => {
      fc.statusCb = cb;
      return self;
    };
    self.presenceState = () => fc.presence;
    created.push(fc);
    live.push(fc);
    builders.set(self, fc);
    return self;
  });

  const removeChannel = vi.fn(async (ch: object) => {
    const fc = builders.get(ch);
    if (fc) {
      fc.removed = true;
      const i = live.indexOf(fc);
      if (i >= 0) live.splice(i, 1);
    }
    return 'ok';
  });

  const client: any = {
    channel,
    removeChannel,
    getChannels: () => [...live],
    realtime: { setAuth },
  };

  return { client, created, live, channel, removeChannel, setAuth };
}

/** Let the async open (setAuth + stale removal) settle. */
export async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}
