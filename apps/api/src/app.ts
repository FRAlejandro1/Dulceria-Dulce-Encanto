import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';

import { autenticacionRouter } from './modules/auth/auth.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { catalogoRouter } from './modules/catalog/catalog.routes.js';
import { usuariosRouter } from './modules/users/users.routes.js';
import { ordersRouter } from './modules/orders/orders.routes.js';
import { ordersAdminRouter } from './modules/orders/orders-admin.routes.js';
import { ordersNotificationsRouter } from './modules/orders/orders-notifications.routes.js';
import { favoritosRouter } from './modules/favorites/favorites.routes.js';
import { obtenerDirectorioImagenes } from './modules/admin/storage/local-image-storage.js';
import { manejarErrorCargaImagen } from './modules/admin/storage/image-upload.errors.js';
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

  app.use(
    '/uploads',
    express.static(obtenerDirectorioImagenes(), {
      dotfiles: 'deny',
      index: false,
      fallthrough: true,
      immutable: true,
      maxAge: '1d',
    }),
  );

  app.use('/api/v1/auth', autenticacionRouter);
  app.use('/api/v1/catalog', catalogoRouter);
  app.use('/api/v1/users', usuariosRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/admin/orders', ordersAdminRouter);
  app.use('/api/v1/orders/notifications', ordersNotificationsRouter);
  app.use('/api/v1/orders', ordersRouter);
  app.use('/api/v1/favorites', favoritosRouter);

  app.get('/api/v1/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use(manejarErrorCargaImagen);
  app.use(manejarError);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Recurso no encontrado' });
  });

  return app;
}
