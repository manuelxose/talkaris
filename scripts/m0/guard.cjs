// Preload only in M0 children: deny outbound TCP and force loopback listeners.
const net = require('node:net');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { syncBuiltinESMExports } = require('node:module');
const hosts = new Set(['127.0.0.1', 'localhost', '::1']);
const ports = new Set([45432, 45101, 45102, 45103, 45124, 45125, 45126]);
const connect = net.Socket.prototype.connect;
const tsxPipe = pid => join(tmpdir(), `tsx-${process.geteuid()}`, `${pid}.pipe`);
net.Socket.prototype.connect = function (...args) {
  const options = Array.isArray(args[0]) ? args[0][0] : args[0];
  // tsx CLI uses one local parent IPC pipe; no arbitrary Unix sockets.
  if ((typeof options === 'object' ? options.path : options) === tsxPipe(process.ppid)) return connect.apply(this, args);
  const port = typeof options === 'object' ? options.port : options;
  const host = typeof options === 'object' ? options.host : typeof args[1] === 'string' ? args[1] : 'localhost';
  if (!hosts.has(host ?? 'localhost') || !ports.has(Number(port))) {
    throw new Error(`M0_EGRESS_DENIED ${host}:${port}`);
  }
  return connect.apply(this, args);
};
const listen = net.Server.prototype.listen;
net.Server.prototype.listen = function (...args) {
  if ((typeof args[0] === 'object' ? args[0].path : args[0]) === tsxPipe(process.pid)) return listen.apply(this, args);
  if (typeof args[0] === 'object') args[0] = { ...args[0], host: '127.0.0.1' };
  else if (typeof args[1] === 'string') args[1] = '127.0.0.1';
  else args.splice(1, 0, '127.0.0.1');
  return listen.apply(this, args);
};
syncBuiltinESMExports();
