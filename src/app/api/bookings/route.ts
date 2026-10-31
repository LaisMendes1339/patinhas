import { NextRequest, NextResponse } from 'next/server';
import { bookingRpc } from '@/lib/booking-rpc';
import { bookingSchema } from '@/lib/validation';
import { hasSameOrigin } from '@/lib/request-origin';
export async function POST(req: NextRequest) {
 if(!hasSameOrigin(req)) return NextResponse.json({error:'Origem inválida.'},{status:403});
 if(Number(req.headers.get('content-length')??0)>8192) return NextResponse.json({error:'Requisição muito grande.'},{status:413});
 const parsed=bookingSchema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success) return NextResponse.json({error:'Verifique os dados informados.'},{status:400});
 try {
 const b=parsed.data;
 const {data,error}=await bookingRpc('create_booking',{p_service:b.service_id,p_professional:b.professional_id,p_start:b.starts_at,p_name:b.name,p_phone:b.phone,p_email:b.email,p_pet:b.pet_name,p_species:b.species,p_breed:b.breed});
 if(error) {
 if(error.code==='RATE_LIMITED') return NextResponse.json({error:error.message},{status:429});
 if(error.code==='SLOT_UNAVAILABLE'||error.code==='23P01'||error.message.includes('SLOT_UNAVAILABLE')) return NextResponse.json({error:'Esse horário acabou de ficar indisponível. Escolha outro horário.'},{status:409});
 throw error;
 }
 return NextResponse.json({booking:data},{status:201,headers:{'Cache-Control':'no-store'}});
 } catch { return NextResponse.json({error:'Não foi possível confirmar. Tente novamente em instantes.'},{status:503}); }
}
