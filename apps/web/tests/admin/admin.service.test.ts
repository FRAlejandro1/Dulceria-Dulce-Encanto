
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ajustarStockAdmin,
  actualizarProductoAdmin,
  actualizarVarianteAdmin,
  cargarImagenAdicionalVarianteAdmin,
  cargarImagenPrincipalVarianteAdmin,
  cargarImagenProductoAdmin,
  crearProductoAdmin,
  crearVarianteAdmin,
  eliminarImagenAdicionalVarianteAdmin,
  eliminarImagenPrincipalVarianteAdmin,
  eliminarImagenProductoAdmin,
  obtenerCategoriasAdmin,
  obtenerImagenesVarianteAdmin,
  obtenerProductosAdmin,
} from '../../src/modules/admin/services/admin.service'
import {
  enviarSolicitudProtegida,
} from '../../src/services/http.service'

vi.mock('../../src/services/http.service', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/services/http.service')>()

  return {
    ...original,
    enviarSolicitudProtegida: vi.fn(),
  }
})

function respuestaJson(
  datos: unknown,
  opciones: { status?: number; ok?: boolean } = {},
): Response {
  return {
    status: opciones.status ?? 200,
    ok: opciones.ok ?? true,
    json: vi.fn().mockResolvedValue(datos),
  } as unknown as Response
}

const solicitudProtegida = vi.mocked(enviarSolicitudProtegida)

function prepararSolicitudProtegida(resultado: unknown): void {
  solicitudProtegida.mockResolvedValue(resultado as never)
}

function archivoImagen(): File {
  return new File(['contenido de prueba'], 'postre.png', {
    type: 'image/png',
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  solicitudProtegida.mockReset()
})

describe('admin.service', () => {
  describe('obtenerCategoriasAdmin', () => {
    it('consulta las categorías administrativas', async () => {
      const categorias = [
        {
          id: '1',
          nombre: 'Tortas',
          slug: 'tortas',
          activa: true,
        },
      ]
      const fetchMock = vi.fn().mockResolvedValue(
        respuestaJson({ categorias }),
      )
      vi.stubGlobal('fetch', fetchMock)

      await expect(obtenerCategoriasAdmin()).resolves.toEqual(categorias)

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/admin/categories',
        {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        },
      )
    })

    it.each([
      null,
      [],
      {},
      { categorias: null },
      { categorias: {} },
    ])('rechaza una respuesta inválida: %j', async (datos) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(respuestaJson(datos)),
      )

      await expect(obtenerCategoriasAdmin()).rejects.toThrow(
        'La respuesta de categorías administrativas no es válida.',
      )
    })

    it('propaga el error HTTP del servidor', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          respuestaJson(
            { error: 'Acceso denegado' },
            { status: 403, ok: false },
          ),
        ),
      )

      await expect(obtenerCategoriasAdmin()).rejects.toThrow(
        'Acceso denegado',
      )
    })

    it('propaga los errores de red', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Error de conexión')),
      )

      await expect(obtenerCategoriasAdmin()).rejects.toThrow(
        'Error de conexión',
      )
    })
  })

  describe('obtenerProductosAdmin', () => {
    it('consulta los productos administrativos', async () => {
      const productos = [
        {
          id: '10',
          nombre: 'Chocolate',
          descripcion: null,
          imagenUrl: null,
          activo: true,
          categoriaId: '1',
          categoria: {
            nombre: 'Tortas',
            slug: 'tortas',
            activa: true,
          },
          variantes: [],
        },
      ]
      const fetchMock = vi.fn().mockResolvedValue(
        respuestaJson({ productos }),
      )
      vi.stubGlobal('fetch', fetchMock)

      await expect(obtenerProductosAdmin()).resolves.toEqual(productos)

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/admin/products',
        {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        },
      )
    })

    it.each([
      null,
      [],
      {},
      { productos: null },
      { productos: {} },
    ])('rechaza una respuesta inválida: %j', async (datos) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(respuestaJson(datos)),
      )

      await expect(obtenerProductosAdmin()).rejects.toThrow(
        'La respuesta de productos administrativos no es válida.',
      )
    })

    it('propaga el error HTTP del servidor', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          respuestaJson(
            { error: 'No autorizado' },
            { status: 401, ok: false },
          ),
        ),
      )

      await expect(obtenerProductosAdmin()).rejects.toThrow(
        'No autorizado',
      )
    })
  })

  describe('crearProductoAdmin', () => {
    it('crea un producto y devuelve su identificador', async () => {
      const datos = { nombre: 'Alfajores' }
      prepararSolicitudProtegida({ producto: { id: 'producto-1' } })

      await expect(
        crearProductoAdmin(datos as never),
      ).resolves.toBe('producto-1')

      expect(solicitudProtegida).toHaveBeenCalledWith(
        '/api/v1/admin/products',
        { metodo: 'POST', cuerpo: datos },
      )
    })

    it.each([
      null,
      {},
      { producto: null },
      { producto: {} },
      { producto: { id: '' } },
      { producto: { id: 123 } },
    ])('rechaza una respuesta de creación inválida: %j', async (resultado) => {
      prepararSolicitudProtegida(resultado)

      await expect(
        crearProductoAdmin({} as never),
      ).rejects.toThrow(
        'No se recibió un identificador válido del producto creado.',
      )
    })

    it('propaga errores de la solicitud protegida', async () => {
      solicitudProtegida.mockRejectedValueOnce(new Error('Error del servidor'))

      await expect(
        crearProductoAdmin({} as never),
      ).rejects.toThrow('Error del servidor')
    })
  })

  describe('actualizarProductoAdmin', () => {
    it('actualiza un producto y codifica el identificador', async () => {
      const cambios = { nombre: 'Torta de chocolate' }
      prepararSolicitudProtegida({})

      await expect(
        actualizarProductoAdmin('producto/1', cambios as never),
      ).resolves.toBeUndefined()

      expect(solicitudProtegida).toHaveBeenCalledWith(
        '/api/v1/admin/products/producto%2F1',
        { metodo: 'PATCH', cuerpo: cambios },
      )
    })
  })

  describe('actualizarVarianteAdmin', () => {
    it('actualiza una variante', async () => {
      const cambios = { nombre: 'Grande' }
      prepararSolicitudProtegida({})

      await expect(
        actualizarVarianteAdmin('variante 1', cambios as never),
      ).resolves.toBeUndefined()

      expect(solicitudProtegida).toHaveBeenCalledWith(
        '/api/v1/admin/variants/variante%201',
        { metodo: 'PATCH', cuerpo: cambios },
      )
    })
  })

  describe('crearVarianteAdmin', () => {
    it('crea una variante para un producto', async () => {
      const datos = { nombre: 'Individual' }
      prepararSolicitudProtegida({})

      await expect(
        crearVarianteAdmin('producto/2', datos as never),
      ).resolves.toBeUndefined()

      expect(solicitudProtegida).toHaveBeenCalledWith(
        '/api/v1/admin/products/producto%2F2/variants',
        { metodo: 'POST', cuerpo: datos },
      )
    })
  })

  describe('ajustarStockAdmin', () => {
    it('ajusta el stock y devuelve el resultado', async () => {
      const resultado = {
        mensaje: 'Stock actualizado',
        inventario: { stockDisponible: 12 },
      }
      const cambios = { cantidad: 3 }
      prepararSolicitudProtegida(resultado)

      await expect(
        ajustarStockAdmin('variante/3', cambios as never),
      ).resolves.toEqual(resultado)

      expect(solicitudProtegida).toHaveBeenCalledWith(
        '/api/v1/admin/variants/variante%2F3/stock',
        { metodo: 'PATCH', cuerpo: cambios },
      )
    })

    it.each([
      null,
      {},
      { mensaje: 123, inventario: {} },
      { mensaje: 'Actualizado', inventario: null },
      { inventario: {} },
    ])('rechaza una respuesta de stock inválida: %j', async (resultado) => {
      prepararSolicitudProtegida(resultado)

      await expect(
        ajustarStockAdmin('3', {} as never),
      ).rejects.toThrow(
        'La respuesta del ajuste de stock no es válida.',
      )
    })
  })

  describe('cargarImagenProductoAdmin', () => {
    it('envía el archivo y devuelve la URL recibida', async () => {
      prepararSolicitudProtegida({
        imagen: { imagenUrl: '/uploads/productos/torta.png' },
      })
      const archivo = archivoImagen()

      await expect(
        cargarImagenProductoAdmin('producto/1', archivo),
      ).resolves.toBe('/uploads/productos/torta.png')

      const [ruta, opciones] = solicitudProtegida.mock.calls[0]
      expect(ruta).toBe('/api/v1/admin/products/producto%2F1/image')
      expect(opciones?.metodo).toBe('POST')
      expect(opciones?.cuerpo).toBeInstanceOf(FormData)
      expect((opciones?.cuerpo as FormData).get('imagen')).toBe(archivo)
    })

    it.each([
      null,
      {},
      { imagen: null },
      { imagen: {} },
      { imagen: { imagenUrl: 123 } },
    ])('rechaza una respuesta de imagen inválida: %j', async (resultado) => {
      prepararSolicitudProtegida(resultado)

      await expect(
        cargarImagenProductoAdmin('1', archivoImagen()),
      ).rejects.toThrow('La respuesta de la imagen no es válida.')
    })
  })

  describe('eliminarImagenProductoAdmin', () => {
    it('elimina la imagen principal del producto', async () => {
      prepararSolicitudProtegida({})

      await expect(
        eliminarImagenProductoAdmin('producto/4'),
      ).resolves.toBeUndefined()

      expect(solicitudProtegida).toHaveBeenCalledWith(
        '/api/v1/admin/products/producto%2F4/image',
        { metodo: 'DELETE' },
      )
    })
  })

  describe('cargarImagenPrincipalVarianteAdmin', () => {
    it('carga la imagen principal de una variante', async () => {
      prepararSolicitudProtegida({
        imagen: { imagenUrl: '/uploads/variantes/grande.png' },
      })
      const archivo = archivoImagen()

      await expect(
        cargarImagenPrincipalVarianteAdmin('variante 5', archivo),
      ).resolves.toBe('/uploads/variantes/grande.png')

      const [ruta, opciones] = solicitudProtegida.mock.calls[0]
      expect(ruta).toBe('/api/v1/admin/variants/variante%205/image')
      expect(opciones?.metodo).toBe('POST')
      expect((opciones?.cuerpo as FormData).get('imagen')).toBe(archivo)
    })
  })

  describe('eliminarImagenPrincipalVarianteAdmin', () => {
    it('elimina la imagen principal de una variante', async () => {
      prepararSolicitudProtegida({})

      await expect(
        eliminarImagenPrincipalVarianteAdmin('variante/6'),
      ).resolves.toBeUndefined()

      expect(solicitudProtegida).toHaveBeenCalledWith(
        '/api/v1/admin/variants/variante%2F6/image',
        { metodo: 'DELETE' },
      )
    })
  })

  describe('obtenerImagenesVarianteAdmin', () => {
    it('devuelve las imágenes adicionales de una variante', async () => {
      const imagenes = [
        { id: 'img-1', imagenUrl: '/uploads/1.png', posicion: 1 },
        { id: 'img-2', imagenUrl: '/uploads/2.png', posicion: 3 },
      ]
      const fetchMock = vi.fn().mockResolvedValue(
        respuestaJson({ imagenes }),
      )
      vi.stubGlobal('fetch', fetchMock)

      await expect(
        obtenerImagenesVarianteAdmin('variante/7'),
      ).resolves.toEqual(imagenes)

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/admin/variants/variante%2F7/images',
        {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        },
      )
    })

    it.each([
      null,
      {},
      { imagenes: null },
      { imagenes: {} },
    ])('rechaza una respuesta de imágenes inválida: %j', async (datos) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(respuestaJson(datos)),
      )

      await expect(
        obtenerImagenesVarianteAdmin('7'),
      ).rejects.toThrow(
        'La respuesta de imágenes de variante no es válida.',
      )
    })

    it.each([
      null,
      {},
      { id: 1, imagenUrl: '/a.png', posicion: 1 },
      { id: '1', imagenUrl: 12, posicion: 1 },
      { id: '1', imagenUrl: '/a.png', posicion: 1.5 },
      { id: '1', imagenUrl: '/a.png', posicion: 0 },
      { id: '1', imagenUrl: '/a.png', posicion: 4 },
    ])('rechaza una imagen con campos inválidos: %j', async (imagen) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(respuestaJson({ imagenes: [imagen] })),
      )

      await expect(
        obtenerImagenesVarianteAdmin('7'),
      ).rejects.toThrow(
        'Una imagen de variante tiene datos inválidos.',
      )
    })
  })

  describe('cargarImagenAdicionalVarianteAdmin', () => {
    it.each([0, 4, 1.5, Number.NaN])(
      'rechaza la posición inválida %s sin enviar la solicitud',
      async (posicion) => {
        await expect(
          cargarImagenAdicionalVarianteAdmin(
            'variante-8',
            archivoImagen(),
            posicion,
          ),
        ).rejects.toThrow(
          'La posición de la imagen debe ser de 1 a 3.',
        )

        expect(solicitudProtegida).not.toHaveBeenCalled()
      },
    )

    it.each([1, 2, 3])(
      'carga una imagen adicional en la posición %i',
      async (posicion) => {
        prepararSolicitudProtegida({
          imagen: { imagenUrl: `/uploads/posicion-${posicion}.png` },
        })
        const archivo = archivoImagen()

        await expect(
          cargarImagenAdicionalVarianteAdmin(
            'variante/9',
            archivo,
            posicion,
          ),
        ).resolves.toBe(`/uploads/posicion-${posicion}.png`)

        const [ruta, opciones] = solicitudProtegida.mock.calls[0]
        expect(ruta).toBe('/api/v1/admin/variants/variante%2F9/images')
        expect(opciones?.metodo).toBe('POST')
        expect((opciones?.cuerpo as FormData).get('imagen')).toBe(archivo)
        expect((opciones?.cuerpo as FormData).get('posicion')).toBe(
          String(posicion),
        )
      },
    )

    it('rechaza una respuesta de carga inválida', async () => {
      prepararSolicitudProtegida({ imagen: { imagenUrl: null } })

      await expect(
        cargarImagenAdicionalVarianteAdmin(
          '9',
          archivoImagen(),
          1,
        ),
      ).rejects.toThrow('La respuesta de la imagen no es válida.')
    })
  })

  describe('eliminarImagenAdicionalVarianteAdmin', () => {
    it('elimina una imagen adicional codificando ambos identificadores', async () => {
      prepararSolicitudProtegida({})

      await expect(
        eliminarImagenAdicionalVarianteAdmin('variante/10', 'imagen 2'),
      ).resolves.toBeUndefined()

      expect(solicitudProtegida).toHaveBeenCalledWith(
        '/api/v1/admin/variants/variante%2F10/images/imagen%202',
        { metodo: 'DELETE' },
      )
    })
  })
})
