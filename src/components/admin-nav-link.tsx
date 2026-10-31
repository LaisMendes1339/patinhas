'use client';
import Link, { useLinkStatus } from 'next/link';
import type { ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';

function Pending() {
 const { pending } = useLinkStatus();
 return <span className={`admin-nav-pending ${pending ? 'visible' : ''}`} aria-hidden={!pending}><LoaderCircle size={14} className={pending ? 'spin' : ''}/><span className="sr-only">Carregando</span></span>;
}

export function AdminNavLink({ href, active, children }: { href: string; active?: boolean; children: ReactNode }) {
 return <Link href={href} className={active ? 'active' : undefined} aria-current={active ? 'page' : undefined}>{children}<Pending/></Link>;
}
