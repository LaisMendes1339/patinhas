import { test } from 'node:test';
import assert from 'node:assert/strict';
import { overlaps,monthDays,shiftMonth } from '../src/lib/availability.ts';
import { time,dateTime,money } from '../src/lib/format.ts';
const interval=(start,end)=>({starts_at:`2030-01-07T${start}:00-03:00`,ends_at:`2030-01-07T${end}:00-03:00`});
test('bloqueia início, interior e fim de um atendimento de duas horas',()=>{
 const busy=interval('09:00','11:00');
 assert.equal(overlaps(busy,interval('08:30','09:30')),true);
 assert.equal(overlaps(busy,interval('10:00','10:30')),true);
 assert.equal(overlaps(busy,interval('10:30','11:30')),true);
});
test('intervalos adjacentes não conflitam',()=>{
 assert.equal(overlaps(interval('09:00','11:00'),interval('11:00','12:00')),false);
 assert.equal(overlaps(interval('09:00','11:00'),interval('08:00','09:00')),false);
});
test('comparação de instantes funciona com offsets diferentes',()=>{
 assert.equal(overlaps(interval('09:00','11:00'),{starts_at:'2030-01-07T12:30:00Z',ends_at:'2030-01-07T13:00:00Z'}),true);
});
test('calendário respeita anos bissextos e virada de ano',()=>{
 assert.equal(monthDays('2028-02').length,29);
 assert.equal(monthDays('2027-02').length,28);
 assert.equal(monthDays('2026-13').length,0);
 assert.equal(shiftMonth('2026-12',1),'2027-01');
 assert.equal(shiftMonth('2027-01',-1),'2026-12');
});
test('apresentação usa Fortaleza mesmo com horário UTC',()=>{
 assert.equal(time('2030-01-07T12:00:00Z'),'09:00');
 assert.match(dateTime('2030-01-08T01:30:00Z'),/07\/01\/2030/);
 assert.match(money(6000),/60,00/);
});
