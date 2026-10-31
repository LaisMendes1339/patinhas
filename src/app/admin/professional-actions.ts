'use server';
import { z } from 'zod';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/admin';

type ActionState = { error?: string; success?: boolean };
function refresh() { revalidateTag('catalog', { expire: 0 }); revalidatePath('/admin'); revalidatePath('/'); }

export async function updateProfessional(_state: ActionState, form: FormData): Promise<ActionState> {
 const { db } = await requireAdmin();
 const fields = z.object({ id: z.uuid(), name: z.string().trim().min(1).max(200), active: z.boolean() }).safeParse({ id: form.get('id'), name: form.get('name'), active: form.get('active') === 'on' });
 if (!fields.success) return { error: 'Confira o nome do profissional e tente novamente.' };
 const { id, ...values } = fields.data;
 const { data, error } = await db.from('professionals').update(values).eq('id', id).select('id').single();
 if (error || !data) return { error: 'Não foi possível salvar. Tente novamente.' };
 refresh(); return { success: true };
}

export async function deleteProfessional(_state: ActionState, form: FormData): Promise<ActionState> {
 const { db } = await requireAdmin();
 const id = z.uuid().safeParse(form.get('id'));
 if (!id.success || form.get('confirm') !== 'yes') return { error: 'Confirme a exclusão para continuar.' };
 const { error } = await db.rpc('delete_professional', { p_id: id.data });
 if (error?.code === '23503') return { error: 'Este profissional possui histórico de agendamentos e não pode ser excluído. Use o lápis para desativá-lo e preservar os atendimentos.' };
 if (error) return { error: 'Não foi possível excluir. Tente novamente.' };
 refresh(); return { success: true };
}

export async function changeProfessionalService(_state: ActionState, form: FormData): Promise<ActionState> {
 const { db } = await requireAdmin();
 const fields = z.object({ professional_id: z.uuid(), service_id: z.uuid(), operation: z.enum(['add', 'remove']) }).safeParse(Object.fromEntries(form));
 if (!fields.success) return { error: 'Selecione um serviço válido.' };
 const { professional_id, service_id, operation } = fields.data;
 const result = operation === 'add'
  ? await db.from('professional_services').insert({ professional_id, service_id })
  : await db.from('professional_services').delete().eq('professional_id', professional_id).eq('service_id', service_id);
 if (result.error) return { error: 'Não foi possível alterar o serviço. Confira se o vínculo já existe e tente novamente.' };
 refresh(); return { success: true };
}
