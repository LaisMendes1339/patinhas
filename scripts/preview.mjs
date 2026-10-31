import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: { port: { type: 'string', short: 'p' } } });
const explicitPort = values.port ?? process.env.PORT;
let port = Number(explicitPort ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
 console.error('A porta deve ser um número entre 1 e 65535.');
 process.exit(1);
}

function isAvailable(value) {
 return new Promise((resolve, reject) => {
  const probe = createServer();
  probe.once('error', error => {
   if (error.code === 'EADDRINUSE') resolve(false);
   else reject(error);
  });
  probe.listen(value, '127.0.0.1', () => probe.close(() => resolve(true)));
 });
}

const preferredPort = port;
while (!(await isAvailable(port))) {
 if (explicitPort !== undefined || port === 65535) {
  console.error(`A porta ${port} está ocupada. Use npm.cmd run preview -- --port <porta>.`);
  process.exit(1);
 }
 port++;
}
if (port !== preferredPort) console.log(`Porta ${preferredPort} ocupada; usando http://127.0.0.1:${port}.`);

const require = createRequire(import.meta.url);
const next = require.resolve('next/dist/bin/next');
const build = spawn(process.execPath, [next, 'build'], { stdio: 'inherit' });
build.once('exit', code => {
 if (code !== 0) { process.exitCode = code ?? 1; return; }
 const server = spawn(process.execPath, [next, 'start', '--hostname', '127.0.0.1', '--port', String(port)], { stdio: 'inherit' });
 server.once('exit', value => { process.exitCode = value ?? 1; });
 process.on('SIGINT', () => server.kill('SIGINT'));
});
