import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { bookingRpc } from '@/lib/booking-rpc';
import type { Slot } from '@/lib/types';
const schema = z.object({service:z.uuid(),date:z.iso.date(),professional:z.uuid().optional()});
export async function GET(req: NextRequest) {
 const input=schema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
 if(!input.success) return NextResponse.json({error:'Selecione serviço e data válidos.'},{status:400});
 try { const {data,error}=await bookingRpc<Slot[]>('available_slots',{p_service:input.data.service,p_date:input.data.date,p_professional:input.data.professional ?? null});
 if(error) throw error;
 return NextResponse.json({slots:data},{headers:{'Cache-Control':'no-store'}});
 } catch { return NextResponse.json({error:'Não foi possível consultar a agenda.'},{status:503}); }
}
