import { app } from './app.js';

const rawPort = process.env.PORT ?? '3000';
const port = Number(rawPort);
if (!/^\d+$/.test(rawPort) || !Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

const server = app.listen(port, '0.0.0.0', () => {
  console.info(`Calculator API listening on port ${port}`);
});
server.on('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
