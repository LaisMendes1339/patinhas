import { z } from 'zod';
export const bookingSchema = z.object({ service_id: z.uuid(), professional_id: z.uuid(), starts_at: z.iso.datetime({ offset: true }), name: z.string().trim().min(3).max(100), phone: z.string().regex(/^\+?[\d ()-]{10,20}$/, 'Informe um telefone válido'), email: z.email().max(254), pet_name: z.string().trim().min(1).max(80), species: z.enum(['dog','cat']), breed: z.string().trim().max(80), consent: z.literal(true) });
export type BookingInput = z.infer<typeof bookingSchema>;
