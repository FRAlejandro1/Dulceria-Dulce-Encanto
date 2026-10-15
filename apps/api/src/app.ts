import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';

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

  app.get('/api/v1/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  return app;
}
