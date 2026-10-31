// All privileged operations require a verified, active owner. No public signup.
export async function handleAccounts(request, api) {
 const reply = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
 if (request.method !== 'POST') return reply({ error: 'METHOD' }, 405);
 try {
  const token = request.headers.get('authorization');
  if (!token?.startsWith('Bearer ')) return reply({ error: 'UNAUTHORIZED' }, 401);
  const user = await api('/auth/v1/user', {}, token);
  if (!user.id) return reply({ error: 'UNAUTHORIZED' }, 401);
  const actor = await api(`/rest/v1/admin_users?user_id=eq.${user.id}&select=role,active`);
  if (actor[0]?.role !== 'owner' || actor[0]?.active !== true) return reply({ error: 'FORBIDDEN' }, 403);
  const raw = await request.text();
  if (raw.length > 4096) return reply({ error: 'INVALID' }, 400);
  let body;
  try { body = JSON.parse(raw); } catch { return reply({ error: 'INVALID' }, 400); }
  if (!body || typeof body !== 'object') return reply({ error: 'INVALID' }, 400);
  if (body.operation === 'list') {
   const rows = await api('/rest/v1/admin_users?select=user_id,role,active&order=user_id');
   const accounts = [];
   for (const row of rows) {
    const account = await api(`/auth/v1/admin/users/${row.user_id}`);
    accounts.push({ ...row, email: account.email ?? account.user?.email ?? '' });
   }
   return reply({ accounts });
  }
  if (body.operation === 'create') {
   if (typeof body.email !== 'string' || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) || typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 128) return reply({ error: 'INVALID' }, 400);
   const created = await api('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email: body.email.trim().toLowerCase(), password: body.password, email_confirm: true }) });
   const id = created.id ?? created.user?.id;
   if (!id) throw new Error('CREATE');
   try {
    await api('/rest/v1/admin_users', { method: 'POST', body: JSON.stringify({ user_id: id, role: 'staff', active: true }) });
   } catch (error) {
    await api(`/auth/v1/admin/users/${id}`, { method: 'DELETE' });
    throw error;
   }
   return reply({ ok: true });
  }
  if (!['activate', 'deactivate', 'delete'].includes(body.operation) || typeof body.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)) return reply({ error: 'INVALID' }, 400);
  const rows = await api(`/rest/v1/admin_users?user_id=eq.${body.id}&select=role,active`);
  // Owner accounts are protected, including the current account.
  if (body.id === user.id || rows[0]?.role !== 'staff') return reply({ error: 'PROTECTED' }, 403);
  const path = `/rest/v1/admin_users?user_id=eq.${body.id}&role=eq.staff`;
  if (body.operation === 'activate') {
   await api(`/auth/v1/admin/users/${body.id}`, { method: 'PUT', body: JSON.stringify({ ban_duration: 'none' }) });
   await api(path, { method: 'PATCH', body: JSON.stringify({ active: true }) });
  } else {
   // Revoke database access first, including previously issued sessions.
   await api(path, { method: 'PATCH', body: JSON.stringify({ active: false }) });
   if (body.operation === 'delete') await api(`/auth/v1/admin/users/${body.id}`, { method: 'DELETE' });
   else await api(`/auth/v1/admin/users/${body.id}`, { method: 'PUT', body: JSON.stringify({ ban_duration: '876000h' }) });
  }
  return reply({ ok: true });
 } catch {
  // Never return upstream payloads: they can include credentials or personal data.
  return reply({ error: 'FAILED' }, 400);
 }
}
