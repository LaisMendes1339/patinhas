import { Header } from '@/components/header';
export default function Loading() {
  return <><Header/><main className="container section" role="status" aria-live="polite"><p className="muted">Preparando seu próximo carinho…</p></main></>;
}
