import 'dotenv/config';

import { validarConfiguracionBaseDatos } from './config/database.js';
import { crearAplicacion } from './app.js';

validarConfiguracionBaseDatos();

const app = crearAplicacion();
const puerto = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
  throw new Error('PORT debe ser un puerto TCP válido entre 1 y 65535');
}

app.listen(puerto, () => {
  console.info(`API disponible en el puerto ${puerto}`);
});
