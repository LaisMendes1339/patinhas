'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { accountOperation } from '@/lib/admin-accounts';

export async function manageAccount(form: FormData) {
 const operation = z.enum(['create', 'activate', 'deactivate', 'delete']).safeParse(form.get('operation'));
 if (!operation.success) redirect('/admin/contas?error=invalid');
 let payload: Record<string, unknown> = { operation: operation.data };
 if (operation.data === 'create') {
  const fields = z.object({ email: z.email().max(254), password: z.string().min(8).max(128) }).safeParse(Object.fromEntries(form));
  if (!fields.success) redirect('/admin/contas?error=invalid');
  payload = { ...payload, ...fields.data };
 } else {
  const id = z.uuid().safeParse(form.get('id'));
  if (!id.success || (operation.data === 'delete' && form.get('confirm') !== 'yes')) redirect('/admin/contas?error=invalid');
  payload.id = id.data;
 }
 try { await accountOperation(payload); } catch { redirect('/admin/contas?error=save'); }
 revalidatePath('/admin/contas');
 redirect('/admin/contas?saved=1');
}
