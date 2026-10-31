import test from 'node:test';
import assert from 'node:assert/strict';
import { handleAccounts } from '../supabase/functions/admin-accounts/handler.mjs';

const owner = '10000000-0000-4000-8000-000000000001';
const staff = '10000000-0000-4000-8000-000000000002';
const request = body => new Request('https://example.test', { method: 'POST', headers: { Authorization: 'Bearer test' }, body: JSON.stringify(body) });
function mock(role = 'owner', active = true, failInsert = false) {
 const calls = [];
 const api = async (path, init = {}) => {
  calls.push({ path, ...init });
  if (path === '/auth/v1/user') return { id: owner };
  if (path.includes(`user_id=eq.${owner}`)) return [{ role, active }];
  if (path.includes(`user_id=eq.${staff}`) && !init.method) return [{ role: 'staff', active: true }];
  if (path === '/auth/v1/admin/users' && init.method === 'POST') return { id: staff };
  if (path === '/rest/v1/admin_users' && failInsert) throw new Error('private upstream details');
  return null;
 };
 return { calls, api };
}

test('rejects anonymous, staff and inactive owners before any privileged mutation', async () => {
 let called = false;
 assert.equal((await handleAccounts(new Request('https://example.test', { method: 'POST' }), () => { called = true; })).status, 401);
 assert.equal(called, false);
 for (const [role, active] of [['staff', true], ['owner', false]]) {
  const m = mock(role, active);
  assert.equal((await handleAccounts(request({ operation: 'create', email: 'a@b.com', password: 'secret123' }), m.api)).status, 403);
  assert.equal(m.calls.length, 2);
 }
});

test('protects the owner from deletion and deactivation', async () => {
 for (const operation of ['delete', 'deactivate']) {
  const m = mock();
  assert.equal((await handleAccounts(request({ operation, id: owner }), m.api)).status, 403);
  assert.equal(m.calls.some(call => call.method), false);
 }
});

test('revokes database access before disabling auth or deleting the account', async () => {
 for (const operation of ['delete', 'deactivate']) {
  const m = mock();
  assert.equal((await handleAccounts(request({ operation, id: staff }), m.api)).status, 200);
  const mutations = m.calls.filter(call => call.method);
  assert.equal(mutations[0].method, 'PATCH');
  assert.deepEqual(JSON.parse(mutations[0].body), { active: false });
  assert.equal(mutations[1].method, operation === 'delete' ? 'DELETE' : 'PUT');
 }
});

test('creates only staff accounts even if a caller sends owner role', async () => {
 const m = mock();
 const response = await handleAccounts(request({ operation: 'create', email: 'a@b.com', password: 'secret123', role: 'owner' }), m.api);
 assert.equal(response.status, 200);
 const membership = m.calls.find(call => call.path === '/rest/v1/admin_users');
 assert.deepEqual(JSON.parse(membership.body), { user_id: staff, role: 'staff', active: true });
 assert.equal((await response.text()).includes('secret123'), false);
});

test('removes orphan auth account if authorization fails and hides upstream errors', async () => {
 const m = mock('owner', true, true);
 const response = await handleAccounts(request({ operation: 'create', email: 'a@b.com', password: 'secret123' }), m.api);
 assert.equal(response.status, 400);
 assert.equal(m.calls.at(-1).method, 'DELETE');
 assert.deepEqual(await response.json(), { error: 'FAILED' });
});
