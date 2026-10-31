'use client';
import Link from 'next/link';
import { Menu, PawPrint, X, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
export function Header(){const [open,setOpen]=useState(false);return <header className="header"><div className="container nav"><Link href="/" className="brand"><span className="brand-icon"><PawPrint/></span>patinhas<span className="brand-light">& cia</span><span className="brand-dot">✦</span></Link><button className="mobile-toggle" aria-label={open?'Fechar menu':'Abrir menu'} aria-expanded={open} aria-controls="public-navigation" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button><nav id="public-navigation" aria-label="Navegação principal" className={open?'nav-links open':'nav-links'}><Link href="/#sobre" onClick={()=>setOpen(false)}>Nosso jeito de cuidar</Link><Link href="/#servicos" onClick={()=>setOpen(false)}>Serviços</Link><Link href="/#duvidas" onClick={()=>setOpen(false)}>Dúvidas</Link><Link href="/agendar" onClick={()=>setOpen(false)} className="button small">Agendar um cuidado <ArrowUpRight size={16}/></Link></nav></div></header>}

