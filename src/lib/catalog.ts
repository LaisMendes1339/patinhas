import { publicClient, configured } from './supabase';
import { unstable_cache } from 'next/cache';
import type { Service, Professional } from './types';
const readCatalog = unstable_cache(async () => {
    const db = publicClient();
    const [s,p] = await Promise.all([db.from('services').select('id,name,description,duration_minutes,price_cents,active').eq('active',true).order('price_cents'),db.from('professionals').select('id,name,active,professional_services(service_id)').eq('active',true)]);
    if(s.error || p.error) {
      console.error('[catalog] Falha de conexão:', (s.error ?? p.error)?.code || 'NETWORK_ERROR');
      throw new Error('CATALOG_UNAVAILABLE');
    }
    return {services:s.data as Service[],professionals:p.data.map(({professional_services,...professional})=>({...professional,service_ids:professional_services.map(link=>link.service_id)})) as Professional[]};
}, ['public-catalog-v2'], { revalidate: 60, tags: ['catalog'] });

export async function catalog(): Promise<{services: Service[]; professionals: Professional[]; error?: string}> {
  if (!configured()) return {services: [], professionals: [], error: 'Estamos preparando nossa agenda online. A integração com o banco ainda precisa ser configurada.'};
  try {
    return await readCatalog();
  } catch { return {services:[],professionals:[],error:'A agenda está temporariamente indisponível. Tente novamente mais tarde.'}; }
}
