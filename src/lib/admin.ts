import 'server-only';
import { redirect } from 'next/navigation';
import { authClient, configured } from './supabase';
export async function requireAdmin(){
 if(!configured()) redirect('/admin/login?error=config');
 const db=await authClient();const {data:{user}}=await db.auth.getUser();
 if(!user) redirect('/admin/login');
 const {data:role,error}=await db.from('admin_users').select('role,active').eq('user_id',user.id).single();
 if(error||!role||!role.active) redirect('/admin/login?error=role');
 return {db,user,role:role.role as 'owner'|'staff'};
}
