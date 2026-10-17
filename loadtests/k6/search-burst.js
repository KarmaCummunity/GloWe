import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { rpc } from './lib/supabase.js';

const searchLatency = new Trend('search_all_latency', true);

export const options = {
  scenarios: {
    search_burst: {
      executor: 'constant-vus',
      vus: 15,
      duration: '1m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    search_all_latency: ['p(95)<200'],
  },
};

const queries = ['stroller', 'books', 'tel', 'give', 'request'];

export default function searchBurst() {
  const q = queries[Math.floor(Math.random() * queries.length)];
  const req = rpc('search_all', { p_query: q, p_limit: 15 }, { rpc: 'search_all' });
  const res = http.post(req.url, req.body, { headers: req.headers, tags: req.tags });
  searchLatency.add(res.timings.duration);
  check(res, { 'search status 200': (r) => r.status === 200 });
  sleep(0.5);
}
