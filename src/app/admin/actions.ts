'use server';
import { requireAdmin } from '@/lib/admin';
import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
const uuid=z.uuid();
const text=z.string().trim().min(1).max(200);
const nullableUuid=z.preprocess(v=>v===''?null:v,uuid.nullable());
const localTimestamp=z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).refine(v=>Number.isFinite(Date.parse(`${v}:00-03:00`))).transform(v=>new Date(`${v}:00-03:00`).toISOString());
const definitions={
 services:z.object({name:text,description:z.string().trim().max(1000),duration_minutes:z.coerce.number().int().min(15).max(480).multipleOf(15),price_cents:z.coerce.number().int().min(0).max(10000000),active:z.coerce.boolean()}),
 professionals:z.object({name:text,active:z.coerce.boolean()}),
 customers:z.object({name:text,email:z.email(),phone:z.string().regex(/^\+?[\d ()-]{10,20}$/)}),
 pets:z.object({customer_id:uuid,name:text,species:z.enum(['dog','cat']),breed:z.string().max(80)}),
 working_hours:z.object({professional_id:uuid,weekday:z.coerce.number().int().min(0).max(6),opens:z.string().regex(/^\d{2}:\d{2}$/),closes:z.string().regex(/^\d{2}:\d{2}$/)}).refine(v=>v.opens<v.closes),
 availability_exceptions:z.object({professional_id:nullableUuid,starts_at:localTimestamp,ends_at:localTimestamp,reason:text}).refine(v=>v.starts_at<v.ends_at),
 professional_services:z.object({professional_id:uuid,service_id:uuid}),
 booking_settings:z.object({cancellation_hours:z.coerce.number().int().min(0).max(720),reschedule_hours:z.coerce.number().int().min(0).max(720),horizon_days:z.coerce.number().int().min(1).max(365)})
};
export async function saveRecord(form:FormData){
 const {db,role}=await requireAdmin();const entity=String(form.get('entity')) as keyof typeof definitions;
 if(!(entity in definitions)) redirect('/admin?error=invalid');
 if(entity==='booking_settings'&&role!=='owner') redirect('/admin?error=forbidden');
 const parsed=definitions[entity].safeParse(Object.fromEntries(form));
 if(!parsed.success) redirect('/admin?error=invalid');
 const id=form.get('id');if(id&&!uuid.safeParse(id).success) redirect('/admin?error=invalid');
 const values:Record<string,unknown>=parsed.data;
 const result=entity==='booking_settings'?await db.from(entity).update(values).eq('id',true):id?await db.from(entity).update(values).eq('id',id):await db.from(entity).insert(values);
 if(result.error) redirect('/admin?error=save');
 revalidateTag('catalog',{expire:0});revalidatePath('/admin');revalidatePath('/');redirect('/admin?saved=1');
}
export async function changeAppointment(form:FormData){
 const {db}=await requireAdmin();const id=uuid.safeParse(form.get('id'));const action=z.enum(['cancel','reschedule','complete']).safeParse(form.get('action'));
 if(!id.success||!action.success) redirect('/admin?error=invalid');
 let values:Record<string,string>={status:action.data==='cancel'?'cancelled':'completed'};
 if(action.data==='reschedule'){const start=z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).safeParse(form.get('starts_at'));if(!start.success)redirect('/admin?error=invalid');values={starts_at:new Date(`${start.data}:00-03:00`).toISOString()};}
 const {error}=await db.from('appointments').update(values).eq('id',id.data);
 if(error)redirect('/admin?error=slot');
 revalidatePath('/admin');redirect('/admin?saved=1');
}
export async function removeAvailability(form:FormData){
 const {db}=await requireAdmin();
 const entity=z.enum(['working_hours','availability_exceptions','professional_services']).safeParse(form.get('entity'));
 const id=uuid.safeParse(form.get('id'));
 if(!entity.success||!id.success)redirect('/admin?error=invalid');
 const serviceId=entity.data==='professional_services'?uuid.safeParse(form.get('service_id')):null;
 if(serviceId&&!serviceId.success)redirect('/admin?error=invalid');
 const query=entity.data==='professional_services'
 ?db.from(entity.data).delete().eq('professional_id',id.data).eq('service_id',serviceId?.data)
 :db.from(entity.data).delete().eq('id',id.data);
 const {error}=await query;
 if(error)redirect('/admin?error=save');
 revalidatePath('/admin');redirect('/admin?saved=1');
}
