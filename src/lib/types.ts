export type Service = { id: string; name: string; description: string; duration_minutes: number; price_cents: number; active: boolean };
export type Professional = { id: string; name: string; active: boolean; service_ids?: string[] };
export type Slot = { professional_id: string; starts_at: string; ends_at: string };
