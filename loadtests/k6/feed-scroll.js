import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { rpc } from './lib/supabase.js';

const feedLatency = new Trend('feed_ranked_ids_latency', true);

export const options = {
  scenarios: {
    feed_scroll: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    feed_ranked_ids_latency: ['p(95)<200'],
  },
};

export default function feedScroll() {
  const req = rpc(
    'feed_ranked_ids',
    {
      p_page_limit: 20,
      p_sort_order: 'newest',
      p_filter_status: 'open',
      p_followers_only: false,
    },
    { rpc: 'feed_ranked_ids' },
  );
  const res = http.post(req.url, req.body, { headers: req.headers, tags: req.tags });
  feedLatency.add(res.timings.duration);
  check(res, {
    'feed status 200': (r) => r.status === 200,
    'feed json array': (r) => {
      try {
        const data = r.json();
        return Array.isArray(data);
      } catch {
        return false;
      }
    },
  });
  sleep(0.3);
}

export function handleSummary(data) {
  return {
    stdout: JSON.stringify(
      {
        scenario: 'feed-scroll',
        p95_ms: data.metrics.feed_ranked_ids_latency?.values?.['p(95)'],
        http_p95_ms: data.metrics.http_req_duration?.values?.['p(95)'],
      },
      null,
      2,
    ),
  };
}
