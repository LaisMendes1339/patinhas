import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { bookingRpc } from '@/lib/booking-rpc';
import { hasSameOrigin } from '@/lib/request-origin';
const schema=z.object({token:z.uuid(),action:z.enum(['cancel','reschedule']),starts_at:z.iso.datetime({offset:true}).optional()}).refine(v=>v.action!=='reschedule'||Boolean(v.starts_at));
export async function POST(req:NextRequest) {
 if(!hasSameOrigin(req)) return NextResponse.json({error:'Origem inválida.'},{status:403});
 const b=schema.safeParse(await req.json().catch(()=>null));
 if(!b.success) return NextResponse.json({error:'Dados inválidos.'},{status:400});
 try {
 const {data,error}=await bookingRpc('manage_booking',{p_token:b.data.token,p_action:b.data.action,p_start:b.data.starts_at??null});
 if(error?.code==='RATE_LIMITED') return NextResponse.json({error:error.message},{status:429});
 if(error) return NextResponse.json({error:error.message},{status:error.code==='UNAVAILABLE'?503:error.code==='INVALID_INPUT'?400:409});
 return NextResponse.json({booking:data});
 } catch { return NextResponse.json({error:'Serviço temporariamente indisponível.'},{status:503}); }
}
