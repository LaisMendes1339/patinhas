import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
export async function proxy(request:NextRequest){
 let response=NextResponse.next({request});
 if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)return response;
 const db=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{global:{fetch:(input,init)=>fetch(input,{...init,signal:init?.signal?AbortSignal.any([init.signal,AbortSignal.timeout(8000)]):AbortSignal.timeout(8000)})},cookies:{getAll:()=>request.cookies.getAll(),setAll:values=>{for(const {name,value} of values)request.cookies.set(name,value);response=NextResponse.next({request});for(const {name,value,options} of values)response.cookies.set(name,value,options);}}});
 // Verify/refresh tokens here. Full user validation and the current active
 // database role are still checked by requireAdmin in every protected request.
 await db.auth.getClaims();
 response.headers.set('Cache-Control','private, no-store');
 return response;
}
export const config={matcher:['/admin/:path*']};
