import 'server-only';
import { database, publicClient } from './supabase';
import { runBookingOperation } from '../../supabase/functions/booking-api/handler.mjs';

type RpcError = { code: string; message: string };
type RpcResult<T> = { data: T; error: RpcError | null };
type Operation = 'available_slots' | 'available_dates' | 'create_booking' | 'manage_booking';

export async function bookingRpc<T>(method: Operation, params: Record<string, unknown>): Promise<RpcResult<T>> {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const db = database();
    return runBookingOperation(method, params, (name: string, values: Record<string, unknown>) => db.rpc(name, values)) as Promise<RpcResult<T>>;
  }
  const { data, error } = await publicClient().functions.invoke('booking-api', { body: { method, params } });
  if (error) throw new Error('Não foi possível acessar o serviço de agendamento.');
  return data as RpcResult<T>;
}
