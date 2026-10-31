import 'server-only';
import { requireAdmin } from './admin';

export type AdminAccount = { user_id: string; email: string; role: 'owner' | 'staff'; active: boolean };

export async function accountOperation(body: Record<string, unknown>) {
 const { db, role } = await requireAdmin();
 if (role !== 'owner') throw new Error('FORBIDDEN');
 const { data: { session } } = await db.auth.getSession();
 if (!session) throw new Error('UNAUTHORIZED');
 const { data, error } = await db.functions.invoke('admin-accounts', {
  headers: { Authorization: `Bearer ${session.access_token}` }, body,
 });
 if (error || data?.error) throw new Error('ACCOUNTS_UNAVAILABLE');
 return data as { ok?: boolean; accounts?: AdminAccount[] };
}
