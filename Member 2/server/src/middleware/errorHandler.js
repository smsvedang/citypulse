import { logger } from '../lib/logger.js';

export function notFoundMiddleware(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route not found: ${req.method} ${req.path}` } });
}

export function errorHandler(err, req, res, _next) {
  const status = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  logger.error({ err, method: req.method, path: req.path, status }, 'request error');

  const payload = {
    error: {
      code,
      message,
    },
  };

  if (process.env.NODE_ENV === 'development' && err.stack) {
    payload.error.details = [err.stack];
  }

  res.status(status).json(payload);
}
