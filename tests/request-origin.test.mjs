import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasSameOrigin } from '../src/lib/request-origin.ts';

function request(origin, host, protocol = 'http:') {
 const headers = new Headers();
 if (origin !== null) headers.set('origin', origin);
 if (host !== null) headers.set('host', host);
 return { headers, nextUrl: { protocol, origin: `${protocol}//localhost:3000` } };
}

test('permite o endereço do navegador quando o hostname interno é diferente', () => {
 for (const host of ['127.0.0.1:3000', 'localhost:3000', '127.0.0.1:3001', '[::1]:3000']) {
  assert.equal(hasSameOrigin(request(`http://${host}`, host)), true);
 }
 assert.equal(hasSameOrigin(request('https://agenda.example', 'agenda.example', 'https:')), true);
});

test('rejeita origem externa, porta ou protocolo diferente e origem ausente ou inválida', () => {
 for (const origin of ['https://evil.example', 'http://127.0.0.1:3001', 'https://127.0.0.1:3000', null, 'null', 'invalid', 'http://127.0.0.1:3000/path']) {
  assert.equal(hasSameOrigin(request(origin, '127.0.0.1:3000')), false);
 }
 assert.equal(hasSameOrigin(request('http://localhost:3000', null)), false);
});
