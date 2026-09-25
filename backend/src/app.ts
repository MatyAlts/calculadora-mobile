import express, { type ErrorRequestHandler } from 'express';
import { calculate, CalculationError } from './calculate.js';

export const app = express();
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.on('finish', () => {
    console.info(`${req.method} ${req.path} ${res.statusCode}`);
  });
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/calculate', (req, res, next) => {
  if (!req.is('application/json')) {
    res.status(415).json({ error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Use application/json.' } });
    return;
  }
  next();
}, express.json({ limit: '4kb' }), (req, res) => {
  res.json({ result: calculate(req.body) });
});

app.use((_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint not found.' } });
});

const handleError: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof CalculationError) {
    res.status(400).json({ error: { code: error.code, message: error.message } });
    return;
  }
  const type = error && typeof error === 'object' && 'type' in error ? error.type : undefined;
  if (type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Send valid JSON.' } });
  } else if (type === 'entity.too.large') {
    res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'The request must be at most 4 KB.' } });
  } else if (type === 'encoding.unsupported' || type === 'charset.unsupported') {
    res.status(415).json({ error: { code: 'UNSUPPORTED_ENCODING', message: 'Use UTF-8 JSON.' } });
  } else {
    console.error(error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'The server could not complete the calculation.' } });
  }
};
app.use(handleError);
