import type { RowDataPacket } from 'mysql2/promise';

import { pool } from '../../config/database.js';
import { registrarAuditoria } from '../audit/audit.repository.js';
import { ejecutarTransaccion } from '../../shared/database/transaction.js';
import { ErrorAplicacion } from '../../shared/http/app-error.js';
import { generarHashContrasena } from '../../shared/security/password.js';
import { esquemaRegistroUsuario } from './users.schemas.js';
import {
  buscarUsuarioPorCorreo,
  crearUsuario,
} from './users.repository.js';

/**
 * Forma pública de una cuenta.
 * Se excluyen el hash de contraseña y cualquier otro dato interno.
 */
export interface UsuarioPublico {
  id: string;
  nombre: string;
  correo: string;
  rol: 'CLIENTE' | 'ADMIN';
}

/**
 * Registra una cuenta de cliente y registra la operación en auditoría.
 * La creación y la auditoría comparten transacción: si falla cualquiera
 * de las operaciones, no se confirma el registro.
 */
export async function registrarUsuario(
  entrada: unknown,
): Promise<UsuarioPublico> {
  const validacion = esquemaRegistroUsuario.safeParse(entrada);

  if (!validacion.success) {
    throw new ErrorAplicacion(
      400,
      'Los datos de registro no son válidos',
    );
  }

  const datos = validacion.data;

  try {
    return await ejecutarTransaccion(async (conexion) => {
      const existente = await buscarUsuarioPorCorreo(
        datos.correo,
        conexion,
      );

      if (existente !== null) {
        throw new ErrorAplicacion(
          409,
          'Ya existe una cuenta con ese correo electrónico',
        );
      }

      const hashContrasena = await generarHashContrasena(
        datos.contrasena,
      );

      const usuario = await crearUsuario(
        {
          nombre: datos.nombre,
          correo: datos.correo,
          hashContrasena,
        },
        conexion,
      );

      await registrarAuditoria(conexion, {
        actorUserId: usuario.id,
        action: 'USER_REGISTERED',
        entityType: 'user',
        entityId: usuario.id,
        details: {
          rol: usuario.rol,
        },
      });

      return {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
      };
    }, pool);
  } catch (error: unknown) {
    if (error instanceof ErrorAplicacion) {
      throw error;
    }

    // La restricción única también protege frente a registros concurrentes.
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as RowDataPacket & { code?: unknown }).code === 'ER_DUP_ENTRY'
    ) {
      throw new ErrorAplicacion(
        409,
        'Ya existe una cuenta con ese correo electrónico',
      );
    }

    throw error;
  }
}
