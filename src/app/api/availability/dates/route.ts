import { NextRequest,NextResponse } from 'next/server';
import { z } from 'zod';
import { bookingRpc } from '@/lib/booking-rpc';
const schema=z.object({service:z.uuid(),month:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),professional:z.uuid().optional()});
export async function GET(req:NextRequest){const input=schema.safeParse(Object.fromEntries(req.nextUrl.searchParams));if(!input.success)return NextResponse.json({error:'Mês inválido.'},{status:400});try{const {data,error}=await bookingRpc<{day:string}[]>('available_dates',{p_service:input.data.service,p_month:`${input.data.month}-01`,p_professional:input.data.professional??null});if(error)throw error;return NextResponse.json({dates:data.map(v=>v.day)},{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({error:'Não foi possível consultar as datas.'},{status:503});}}
