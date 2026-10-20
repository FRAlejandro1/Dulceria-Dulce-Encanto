import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';

import { catalogoRouter } from './modules/catalog/catalog.routes.js';
import { manejarError } from './shared/http/error-handler.js';

export function crearAplicacion(): Express {
  const app = express();
  const origenWeb = process.env.WEB_ORIGIN ?? 'http://localhost:5173';

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({
    origin: origenWeb,
    credentials: true,
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use('/api/v1/catalog', catalogoRouter);

  app.get('/api/v1/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use((_req, res) => {
    res.status(404).json({
      error: 'Recurso no encontrado',
    });
  });

  app.use(manejarError);

  return app;
}
