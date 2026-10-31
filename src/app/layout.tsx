import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Patinhas & Cia | Cuidado que faz o rabinho abanar',description:'Banho, tosa e cuidado veterinário. Agende o próximo momento de carinho do seu melhor amigo.'};
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="pt-BR"><body>{children}</body></html>; }
