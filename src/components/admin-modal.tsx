'use client';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function AdminModal({ title, description, children, onClose, danger = false }: { title: string; description?: string; children: ReactNode; onClose: () => void; danger?: boolean }) {
 const dialog = useRef<HTMLDialogElement>(null);
 const titleId = useId(), descriptionId = useId();
 useEffect(() => {
  const element = dialog.current;
  const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const originalOverflow = document.body.style.overflow;
  element?.showModal();
  document.body.style.overflow = 'hidden';
  return () => { element?.close(); document.body.style.overflow = originalOverflow; trigger?.focus(); };
 }, []);
 return <dialog ref={dialog} className={`admin-modal ${danger ? 'danger-modal' : ''}`} aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose(); } }}>
  <header className="admin-modal-header"><div><h2 id={titleId}>{title}</h2>{description && <p id={descriptionId}>{description}</p>}</div><button type="button" className="admin-modal-close" aria-label="Fechar janela" onClick={onClose}><X size={20}/></button></header>
  <div className="admin-modal-body">{children}</div>
 </dialog>;
}
