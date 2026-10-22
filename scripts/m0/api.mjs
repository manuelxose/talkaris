import { writeFile } from 'node:fs/promises';
process.env.CHAT_API_DISABLE_LISTEN = 'true';
const { app, pool } = await import('../../apps/chat-api/src/main.ts');
// Inspect the real Express stack after ALL entrypoint registrations.
const routes = app._router.stack.filter(layer => layer.route).map((layer, index) => ({
  index, path: layer.route.path, methods: Object.keys(layer.route.methods),
  handlers: layer.route.stack.map(item => item.name),
}));
await writeFile('evidence/m0/runtime-routes.json', JSON.stringify(routes, null, 2));
const server = app.listen(45101, '127.0.0.1');
process.on('SIGTERM', () => server.close(async () => { await pool.end(); process.exit(0); }));
