'use client';
import dynamic from 'next/dynamic';
import { AdminContentLoading } from './admin-loading';

// Separate browser bundles: opening the agenda doesn't download the registry
// editor and charts. SSR stays enabled for all three screens.
export const AdminFinances = dynamic(() => import('./admin-finances').then(module => module.AdminFinances), { loading: AdminContentLoading });
export const AdminAgenda = dynamic(() => import('./admin-agenda').then(module => module.AdminAgenda), { loading: AdminContentLoading });
export const AdminRegistry = dynamic(() => import('./admin-registry').then(module => module.AdminRegistry), { loading: AdminContentLoading });
