import { Header } from '@/components/header';
import { BookingForm } from '@/components/booking-form';
import { catalog } from '@/lib/catalog';
import Link from 'next/link';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{servico?:string}>}) {const {services,professionals,error}=await catalog();const {servico}=await searchParams;return <><Header/><main className="container booking-page">{error?<div className="notice"><h1>Agenda temporariamente indisponível</h1><p>{error}</p><Link href="/" className="button">Voltar ao início</Link></div>:<BookingForm services={services} professionals={professionals} initialService={servico}/>}</main></>}
