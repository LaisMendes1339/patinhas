export type Interval = { starts_at: string; ends_at: string };
/** Intervalos semiabertos: um serviço pode começar quando outro termina. */
export function overlaps(a: Interval, b: Interval): boolean {
 return Date.parse(a.starts_at)<Date.parse(b.ends_at)&&Date.parse(b.starts_at)<Date.parse(a.ends_at);
}
export function monthDays(month: string): string[] {
 if(!/^\d{4}-\d{2}$/.test(month)) return [];
 const [year,m]=month.split('-').map(Number);
 if(m<1||m>12) return [];
 return Array.from({length:new Date(Date.UTC(year,m,0)).getUTCDate()},(_,i)=>`${month}-${String(i+1).padStart(2,'0')}`);
}
export function shiftMonth(month:string, direction:number):string {
 const [year,m]=month.split('-').map(Number);
 const d=new Date(Date.UTC(year,m-1+direction,1));
 return d.toISOString().slice(0,7);
}
