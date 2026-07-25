#!/usr/bin/env node
/** Server-side smoke test for local mock-login personas (no browser). */
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const BASE = 'http://127.0.0.1:54321';

async function mockLogin(body) {
  const res = await fetch(`${BASE}/functions/v1/mock-login`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || !json.session?.access_token) {
    throw new Error(`mock-login failed (${res.status}): ${JSON.stringify(json)}`);
  }
  return json;
}

async function rest(path, token, opts = {}) {
  const res = await fetch(`${BASE}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function rpc(name, token, payload = {}) {
  const res = await fetch(`${BASE}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const cases = [
  {
    name: 'individual (Alex)',
    login: { email: 'glowe-local-alex@example.test' },
    assert: async (session) => {
      const { body } = await rest(
        `glowe_profiles?id=eq.${session.user.id}&select=account_type,approval_status`,
        session.access_token,
      );
      if (body[0]?.account_type !== 'individual') throw new Error('expected individual');
    },
  },
  {
    name: 'admin',
    login: { email: 'glowe-local-admin@example.test', role: 'admin' },
    assert: async (session) => {
      const { body } = await rpc('get_my_admin_roles', session.access_token);
      if (!Array.isArray(body) || !body.includes('glowe_admin')) {
        throw new Error(`expected glowe_admin, got ${JSON.stringify(body)}`);
      }
    },
  },
  {
    name: 'org approved (Harbor)',
    login: {
      email: 'glowe-local-org-harbor-food@example.test',
      profileType: 'organization',
      approvalStatus: 'approved',
    },
    assert: async (session) => {
      const { body } = await rest(
        `glowe_profiles?id=eq.${session.user.id}&select=account_type,approval_status,org_name`,
        session.access_token,
      );
      const row = body[0];
      if (row?.account_type !== 'organization' || row?.approval_status !== 'approved') {
        throw new Error(`unexpected org profile: ${JSON.stringify(row)}`);
      }
    },
  },
  {
    name: 'org pending (new)',
    login: {
      email: `dev-org-pending-${Date.now()}@local.dev`,
      profileType: 'organization',
      approvalStatus: 'pending',
      displayName: 'Verify Pending Org',
    },
    assert: async (session) => {
      const { body } = await rest(
        `glowe_profiles?id=eq.${session.user.id}&select=approval_status,profile_status`,
        session.access_token,
      );
      const row = body[0];
      if (row?.approval_status !== 'pending') throw new Error('expected pending approval');
    },
  },
];

let failed = 0;
for (const testCase of cases) {
  try {
    const { session } = await mockLogin(testCase.login);
    await testCase.assert(session);
    console.log(`✅ ${testCase.name}`);
  } catch (err) {
    failed += 1;
    console.error(`❌ ${testCase.name}: ${err.message}`);
  }
}

if (failed > 0) process.exit(1);
console.log('\nAll local mock-auth persona checks passed.');
