'use server';
import { authClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import { z } from 'zod';
export async function login(form:FormData){
 const value=z.object({email:z.email(),password:z.string().min(8).max(128)}).safeParse(Object.fromEntries(form));
 if(!value.success) redirect('/admin/login?error=credentials');
 let failed=false;
 try {const db=await authClient();const {error}=await db.auth.signInWithPassword(value.data);failed=Boolean(error);}catch{redirect('/admin/login?error=config');}
 if(failed) redirect('/admin/login?error=credentials');
 redirect('/admin');
}
export async function logout(){const db=await authClient();await db.auth.signOut();redirect('/admin/login');}
