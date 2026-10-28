import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  ProductoAdmin,
  VarianteAdmin,
} from '../../src/modules/admin/types/inventory.types'
import ProductDetail from '../../src/modules/admin/components/ProductDetail/ProductDetail'
import { debeFinalizarArrastre } from '../../src/modules/admin/components/ProductDetail/ProductDetail.utils'

function crearVariante(
  id: string,
  precio = '5.00',
  stockFisico = 5,
  stockReservado = 0,
): VarianteAdmin {
  return {
    id,
    nombre: 'Unidad',
    sku: `SKU-${id}`,
    precio,
    imagenUrl: null,
    activa: true,
    stockDisponible: stockFisico - stockReservado,
    stockFisico,
    stockReservado,
  }
}

function crearProducto(): ProductoAdmin {
  return {
    id: 'producto-1',
    nombre: 'Chocolate',
    descripcion: 'Chocolate oscuro',
    imagenUrl: 'https://ejemplo.com/chocolate.png',
    activo: true,
    categoriaId: 'dulces',
    categoria: { nombre: 'Dulces', slug: 'dulces', activa: true },
    variantes: [crearVariante('variante-1')],
  }
}

function crearProps(producto = crearProducto()) {
  return {
    producto,
    categorias: [{ id: 'dulces', nombre: 'Dulces' }],
    onGuardarProducto: vi.fn().mockResolvedValue(undefined),
    onGuardarVariante: vi.fn().mockResolvedValue(undefined),
    onAjustarStock: vi.fn().mockResolvedValue({
      mensaje: 'Stock actualizado',
      inventario: {
        varianteId: 'variante-1',
        stockFisicoAnterior: 5,
        stockFisico: 6,
        stockReservado: 0,
        stockDisponible: 6,
        diferencia: 1,
      },
    }),
    onCrearVariante: vi.fn().mockResolvedValue(undefined),
    cargarImagenProducto: vi.fn().mockResolvedValue('https://ejemplo.com/nueva.png'),
    eliminarImagenProducto: vi.fn().mockResolvedValue(undefined),
    cargarImagenVariante: vi.fn().mockResolvedValue('https://ejemplo.com/variante.png'),
    eliminarImagenVariante: vi.fn().mockResolvedValue(undefined),
    obtenerImagenesVariante: vi.fn().mockResolvedValue([]),
    cargarImagenAdicionalVariante: vi.fn().mockResolvedValue('https://ejemplo.com/adicional.png'),
    eliminarImagenAdicionalVariante: vi.fn().mockResolvedValue(undefined),
  }
}

afterEach(() => cleanup())
beforeEach(() => vi.clearAllMocks())

describe('ProductDetail: edición y validación', () => {
  it('guarda la descripción modificada', async () => {
    const props = crearProps()
    render(<ProductDetail {...props} />)

    fireEvent.change(
      screen.getByRole('textbox', { name: 'Descripción del producto' }),
      { target: { value: 'Chocolate artesanal' } },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(props.onGuardarProducto).toHaveBeenCalledWith('producto-1', {
        descripcion: 'Chocolate artesanal',
      })
    })

    expect((await screen.findByRole('status')).textContent).toContain(
      'Los cambios se guardaron correctamente.',
    )
  })

  it('rechaza una URL de imagen inválida', async () => {
    const props = crearProps()
    render(<ProductDetail {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'URL' }))
    fireEvent.change(
      screen.getByRole('textbox', { name: 'URL de la imagen del producto' }),
      { target: { value: 'javascript:alert(1)' } },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Listo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'La URL de imagen del producto no es válida.',
    )
    expect(props.onGuardarProducto).not.toHaveBeenCalled()
  })

  it('rechaza el nombre vacío de una variante', async () => {
    const props = crearProps()
    render(<ProductDetail {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Unidad' }))
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Nombre de la variante seleccionada' }),
      { target: { value: '   ' } },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'El nombre de la variante Unidad es obligatorio.',
    )
    expect(props.onGuardarVariante).not.toHaveBeenCalled()
  })

  it('rechaza un precio negativo', async () => {
    const props = crearProps()
    render(<ProductDetail {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Unidad' }))
    fireEvent.change(
      screen.getByRole('spinbutton', { name: 'Precio de la variante seleccionada' }),
      { target: { value: '-1' } },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'El precio de Unidad no es válido.',
    )
    expect(props.onGuardarVariante).not.toHaveBeenCalled()
  })

  it('rechaza un ajuste de stock que no sea entero', async () => {
    const props = crearProps()
    render(<ProductDetail {...props} />)

    const campoStock = screen.getByRole('spinbutton', {
      name: 'Ajuste de stock de Unidad',
    })

    fireEvent.change(campoStock, { target: { value: '1.5' } })

    const botonGuardar = screen.getByRole('button', {
      name: 'Guardar cambios',
    })

    expect(botonGuardar.hasAttribute('disabled')).toBe(false)

    fireEvent.click(botonGuardar)

    expect((await screen.findByRole('alert')).textContent).toContain(
      'El ajuste de stock de Unidad debe ser entero.',
    )
    expect(props.onAjustarStock).not.toHaveBeenCalled()
  })

  it('rechaza un ajuste que dejaría el stock por debajo de las reservas', async () => {
    const producto = crearProducto()
    producto.variantes = [crearVariante('variante-1', '5.00', 5, 3)]

    const props = crearProps(producto)
    render(<ProductDetail {...props} />)

    fireEvent.change(
      screen.getByRole('spinbutton', { name: 'Ajuste de stock de Unidad' }),
      { target: { value: '-3' } },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'El stock de Unidad no puede quedar por debajo de las unidades reservadas.',
    )
    expect(props.onAjustarStock).not.toHaveBeenCalled()
  })

  it('guarda los cambios de variante y el ajuste de stock', async () => {
    const props = crearProps()
    render(<ProductDetail {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Unidad' }))

    const campoStock = screen.getByRole('spinbutton', {
      name: 'Ajuste de stock de Unidad',
    })

    fireEvent.change(
      screen.getByRole('textbox', { name: 'Nombre de la variante seleccionada' }),
      { target: { value: 'Caja' } },
    )
    fireEvent.change(
      screen.getByRole('spinbutton', { name: 'Precio de la variante seleccionada' }),
      { target: { value: '7.50' } },
    )
    fireEvent.change(campoStock, { target: { value: '2' } })

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(props.onGuardarVariante).toHaveBeenCalledWith('variante-1', {
        nombre: 'Caja',
        precio: '7.50',
      })
      expect(props.onAjustarStock).toHaveBeenCalledWith('variante-1', {
        cantidad: 2,
        motivo: 'Ajuste manual desde el panel administrativo',
      })
    })

    expect((await screen.findByRole('status')).textContent).toContain(
      'Los cambios se guardaron correctamente.',
    )
  })

  it('restaura los valores al cancelar cambios', () => {
    const props = crearProps()
    render(<ProductDetail {...props} />)

    const descripcion = screen.getByRole('textbox', {
      name: 'Descripción del producto',
    })

    fireEvent.change(descripcion, { target: { value: 'Texto temporal' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar cambios' }))

    expect((descripcion as HTMLTextAreaElement).value).toBe('Chocolate oscuro')
    expect(props.onGuardarProducto).not.toHaveBeenCalled()
  })

  it('muestra el error cuando falla el guardado', async () => {
    const props = crearProps()
    props.onGuardarProducto.mockRejectedValueOnce(
      new Error('Error de persistencia'),
    )

    render(<ProductDetail {...props} />)

    fireEvent.change(
      screen.getByRole('textbox', { name: 'Descripción del producto' }),
      { target: { value: 'Descripción nueva' } },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Error de persistencia',
    )
  })

  it('permite cambiar la URL de imagen de una variante', async () => {
    const props = crearProps()
    render(<ProductDetail {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Unidad' }))
    fireEvent.click(screen.getByRole('button', { name: 'URL' }))
    fireEvent.change(
      screen.getByRole('textbox', { name: 'URL de la imagen de la variante' }),
      { target: { value: 'https://ejemplo.com/variante-nueva.png' } },
    )

    fireEvent.click(screen.getByRole('button', { name: 'Listo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(props.onGuardarVariante).toHaveBeenCalledWith('variante-1', {
        imagenUrl: 'https://ejemplo.com/variante-nueva.png',
      })
    })
  })



  it('rechaza archivos que no son imágenes permitidas', async () => {
    const props = crearProps()
    render(<ProductDetail {...props} />)

    const archivo = new File(['contenido'], 'documento.pdf', {
      type: 'application/pdf',
    })

    const campoArchivo = document.querySelector('input[type="file"]')

    expect(campoArchivo).not.toBeNull()

    fireEvent.change(campoArchivo!, {
      target: { files: [archivo] },
    })

    const alerta = await screen.findByRole('alert')

    expect(alerta.textContent).toContain(
      'Formato no válido. Usa JPG, PNG o WebP.',
    )
    expect(props.cargarImagenProducto).not.toHaveBeenCalled()
  })

  it('rechaza imágenes que superan los 5 MB', async () => {
    const props = crearProps()
    render(<ProductDetail {...props} />)

    const archivo = new File(
      [new Uint8Array(5 * 1024 * 1024 + 1)],
      'imagen.png',
      { type: 'image/png' },
    )

    const campoArchivo = document.querySelector('input[type="file"]')

    expect(campoArchivo).not.toBeNull()

    fireEvent.change(campoArchivo!, {
      target: { files: [archivo] },
    })

    const alerta = await screen.findByRole('alert')

    expect(alerta.textContent).toContain(
      'La imagen no puede superar los 5 MB.',
    )
    expect(props.cargarImagenProducto).not.toHaveBeenCalled()
  })


  it('muestra la vista previa de una imagen válida', async () => {
    const props = crearProps()
    render(<ProductDetail {...props} />)

    const archivo = new File(['imagen de prueba'], 'chocolate.png', {
      type: 'image/png',
    })

    const campoArchivo = document.querySelector('input[type="file"]')

    expect(campoArchivo).not.toBeNull()

    fireEvent.change(campoArchivo!, {
      target: { files: [archivo] },
    })

    expect(
      await screen.findByText(
        'Vista previa lista. Pulsa Guardar cambios para subirla.',
      ),
    ).toBeTruthy()

    const imagen = screen.getByRole('img', { name: 'Chocolate' })
    expect(imagen.getAttribute('src')).toMatch(/^data:image\/png;base64,/)
    expect(props.cargarImagenProducto).not.toHaveBeenCalled()
  })

  it('rechaza una URL cuyo formato provoca una excepción al analizarla', async () => {
    const props = crearProps()
    render(<ProductDetail {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'URL' }))
    fireEvent.change(
      screen.getByRole('textbox', { name: 'URL de la imagen del producto' }),
      { target: { value: 'http://[' } },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Listo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'La URL de imagen del producto no es válida.',
    )
    expect(props.onGuardarProducto).not.toHaveBeenCalled()
  })

  it('elimina el archivo seleccionado al cambiar la URL de imagen del producto', async () => {
    const props = crearProps()
    render(<ProductDetail {...props} />)

    const archivo = new File(['imagen de prueba'], 'chocolate.png', {
      type: 'image/png',
    })
    const campoArchivo = document.querySelector('input[type="file"]')
    expect(campoArchivo).not.toBeNull()

    fireEvent.change(campoArchivo!, {
      target: { files: [archivo] },
    })

    await screen.findByText(
      'Vista previa lista. Pulsa Guardar cambios para subirla.',
    )

    fireEvent.click(screen.getByRole('button', { name: 'URL' }))
    fireEvent.change(
      screen.getByRole('textbox', { name: 'URL de la imagen del producto' }),
      { target: { value: 'https://ejemplo.com/actualizada.png' } },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Listo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(props.onGuardarProducto).toHaveBeenCalledWith('producto-1', {
        imagenUrl: 'https://ejemplo.com/actualizada.png',
      })
    })

    expect(props.cargarImagenProducto).not.toHaveBeenCalled()
  })

  it('abre el selector de archivos desde el botón para subir una imagen', () => {
    const props = crearProps()
    render(<ProductDetail {...props} />)

    const abrirSelector = vi
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => undefined)

    fireEvent.click(
      screen.getByRole('button', { name: 'Subir imagen desde el equipo' }),
    )

    expect(abrirSelector).toHaveBeenCalled()
    abrirSelector.mockRestore()
  })
  it('sube la imagen del producto al guardar los cambios', async () => {
    const props = crearProps()
    render(<ProductDetail {...props} />)

    const archivo = new File(['imagen de prueba'], 'chocolate.png', {
      type: 'image/png',
    })

    const campoArchivo = document.querySelector('input[type="file"]')

    expect(campoArchivo).not.toBeNull()

    fireEvent.change(campoArchivo!, {
      target: { files: [archivo] },
    })

    await screen.findByText(
      'Vista previa lista. Pulsa Guardar cambios para subirla.',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(props.cargarImagenProducto).toHaveBeenCalledWith(
        'producto-1',
        archivo,
      )
    })

    expect(
      await screen.findByText('Los cambios se guardaron correctamente.'),
    ).toBeTruthy()
  })

  it('limpia la imagen local de una variante al cambiar su URL', async () => {
    const props = crearProps()
    render(<ProductDetail {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Unidad' }))

    const archivo = new File(['imagen de variante'], 'unidad.png', {
      type: 'image/png',
    })
    const campoArchivo = document.querySelector('input[type="file"]')
    expect(campoArchivo).not.toBeNull()

    fireEvent.change(campoArchivo!, { target: { files: [archivo] } })

    await screen.findByText(
      'Vista previa lista. Pulsa Guardar cambios para subirla.',
    )

    fireEvent.click(screen.getByRole('button', { name: 'URL' }))
    fireEvent.change(
      screen.getByRole('textbox', { name: 'URL de la imagen de la variante' }),
      { target: { value: 'https://ejemplo.com/variante-actualizada.png' } },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Listo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(props.onGuardarVariante).toHaveBeenCalledWith('variante-1', {
        imagenUrl: 'https://ejemplo.com/variante-actualizada.png',
      })
    })
    expect(props.cargarImagenVariante).not.toHaveBeenCalled()
  })
  it('sube la imagen de la variante seleccionada al guardar', async () => {
    const props = crearProps()
    render(<ProductDetail {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Unidad' }))

    const archivo = new File(['imagen de variante'], 'unidad.png', {
      type: 'image/png',
    })

    const campoArchivo = document.querySelector('input[type="file"]')

    expect(campoArchivo).not.toBeNull()

    fireEvent.change(campoArchivo!, {
      target: { files: [archivo] },
    })

    await screen.findByText(
      'Vista previa lista. Pulsa Guardar cambios para subirla.',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(props.cargarImagenVariante).toHaveBeenCalledWith(
        'variante-1',
        archivo,
      )
    })

    expect(
      await screen.findByText('Los cambios se guardaron correctamente.'),
    ).toBeTruthy()
  })


  it('muestra el estado vacío cuando no hay producto seleccionado', () => {
    render(
      <ProductDetail
        {...crearProps()}
        producto={null as unknown as ProductoAdmin}
      />,
    )

    expect(
      screen.getByRole('region', { name: 'Detalle del producto' }),
    ).toBeTruthy()
  })

  it('no hace nada al intentar guardar sin cambios', () => {
    const props = crearProps()
    render(<ProductDetail {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(props.onGuardarProducto).not.toHaveBeenCalled()
    expect(props.cargarImagenProducto).not.toHaveBeenCalled()
  })

  it('muestra un error cuando falla la carga de una imagen', async () => {
    const props = crearProps()
    props.cargarImagenProducto.mockRejectedValueOnce(
      new Error('Error al subir la imagen'),
    )

    render(<ProductDetail {...props} />)

    const archivo = new File(['imagen'], 'chocolate.png', {
      type: 'image/png',
    })
    const campoArchivo = document.querySelector('input[type="file"]')

    expect(campoArchivo).not.toBeNull()

    fireEvent.change(campoArchivo!, {
      target: { files: [archivo] },
    })

    await screen.findByText(
      'Vista previa lista. Pulsa Guardar cambios para subirla.',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(
      await screen.findByText('Error al subir la imagen'),
    ).toBeTruthy()
  })

  it('muestra un error si el resultado de FileReader no es texto', async () => {
    const props = crearProps()

    const espia = vi
      .spyOn(FileReader.prototype, 'readAsDataURL')
      .mockImplementation(function (this: FileReader) {
        Object.defineProperty(this, 'result', {
          configurable: true,
          value: null,
        })
        this.onload?.call(
          this,
          new ProgressEvent('load') as ProgressEvent<FileReader>,
        )
      })

    try {
      render(<ProductDetail {...props} />)

      const archivo = new File(['imagen de prueba'], 'chocolate.png', {
        type: 'image/png',
      })

      const campoArchivo = document.querySelector('input[type="file"]')
      expect(campoArchivo).not.toBeNull()

      fireEvent.change(campoArchivo!, {
        target: { files: [archivo] },
      })

      expect(
        await screen.findByText('No se pudo previsualizar la imagen.'),
      ).toBeTruthy()
    } finally {
      espia.mockRestore()
    }
  })
  it('muestra un error cuando no se puede leer el archivo seleccionado', async () => {
    const props = crearProps()

    const espia = vi
      .spyOn(FileReader.prototype, 'readAsDataURL')
      .mockImplementation(function (this: FileReader) {
        this.onerror?.call(
          this,
          new ProgressEvent('error') as ProgressEvent<FileReader>,
        )
      })

    try {
      render(<ProductDetail {...props} />)

      const archivo = new File(['imagen de prueba'], 'chocolate.png', {
        type: 'image/png',
      })

      const campoArchivo = document.querySelector('input[type="file"]')
      expect(campoArchivo).not.toBeNull()

      fireEvent.change(campoArchivo!, {
        target: { files: [archivo] },
      })

      expect(
        await screen.findByText('No se pudo leer el archivo seleccionado.'),
      ).toBeTruthy()
    } finally {
      espia.mockRestore()
    }
  })

  it('activa y desactiva el estado visual al arrastrar una imagen', () => {
    const props = crearProps()
    render(<ProductDetail {...props} />)

    const marcoImagen = document.querySelector(
      '.admin-product-detail__image-frame',
    )

    expect(marcoImagen).not.toBeNull()

    fireEvent.dragOver(marcoImagen!)
    expect(marcoImagen!.className).toContain('admin-product-detail__image-frame')

    fireEvent.dragLeave(marcoImagen!)
    expect(marcoImagen!.className).not.toContain('arrastrando')
  })

  it('procesa una imagen válida soltada sobre el marco de imagen', async () => {
    const props = crearProps()
    render(<ProductDetail {...props} />)

    const marcoImagen = document.querySelector(
      '.admin-product-detail__image-frame',
    )
    expect(marcoImagen).not.toBeNull()

    const archivo = new File(['imagen de prueba'], 'chocolate.png', {
      type: 'image/png',
    })

    fireEvent.drop(marcoImagen!, {
      dataTransfer: {
        files: [archivo],
      },
    })

    expect(
      await screen.findByText('Vista previa lista. Pulsa Guardar cambios para subirla.'),
    ).toBeTruthy()
  })

  it('rechaza un precio vacío', async () => {
    const props = crearProps()
    render(<ProductDetail {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Unidad' }))
    fireEvent.change(
      screen.getByRole('spinbutton', {
        name: 'Precio de la variante seleccionada',
      }),
      { target: { value: '' } },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'El precio de Unidad no es válido.',
    )
    expect(props.onGuardarVariante).not.toHaveBeenCalled()
  })

  it('rechaza una URL inválida para la imagen de una variante', async () => {
    const props = crearProps()
    render(<ProductDetail {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Unidad' }))
    fireEvent.click(screen.getByRole('button', { name: 'URL' }))
    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'URL de la imagen de la variante',
      }),
      { target: { value: 'javascript:alert(1)' } },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Listo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'La URL de imagen de Unidad no es válida.',
    )
    expect(props.onGuardarVariante).not.toHaveBeenCalled()
  })

  it('muestra el estado vacío cuando el producto no tiene variantes', () => {
    const producto = crearProducto()
    producto.variantes = []

    render(<ProductDetail {...crearProps(producto)} />)

    expect(
      screen.getByText('Este producto no tiene variantes registradas.'),
    ).toBeTruthy()
    expect(screen.getByText('0 registradas')).toBeTruthy()
    expect(screen.getAllByText('0')).toHaveLength(2)
  })

  it('permite guardar un ajuste de stock igual a cero sin solicitar un ajuste', async () => {
    const props = crearProps()
    render(<ProductDetail {...props} />)

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'Descripción del producto',
      }),
      { target: { value: 'Chocolate actualizado' } },
    )
    fireEvent.change(
      screen.getByRole('spinbutton', {
        name: 'Ajuste de stock de Unidad',
      }),
      { target: { value: '0' } },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(props.onGuardarProducto).toHaveBeenCalledWith('producto-1', {
        descripcion: 'Chocolate actualizado',
      })
    })

    expect(props.onAjustarStock).not.toHaveBeenCalled()
  })

  it('muestra un mensaje genérico si el guardado falla con un valor que no es Error', async () => {
    const props = crearProps()
    props.onGuardarProducto.mockRejectedValueOnce('fallo inesperado')

    render(<ProductDetail {...props} />)

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'Descripción del producto',
      }),
      { target: { value: 'Descripción actualizada' } },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(
      (await screen.findByRole('alert')).textContent,
    ).toContain('No se pudieron guardar todos los cambios.')
  })

  it('mantiene el estado de arrastre cuando el puntero pasa a un elemento interior', () => {
    const marco = document.createElement('div')
    const interior = document.createElement('span')
    const exterior = document.createElement('div')

    marco.appendChild(interior)

    expect(debeFinalizarArrastre(marco, interior)).toBe(false)
    expect(debeFinalizarArrastre(marco, exterior)).toBe(true)
    expect(debeFinalizarArrastre(marco, null)).toBe(true)
  })

  it('permite quitar la URL de imagen del producto', async () => {
    const props = crearProps()
    render(<ProductDetail {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'URL' }))
    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'URL de la imagen del producto',
      }),
      { target: { value: '' } },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Listo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(props.onGuardarProducto).toHaveBeenCalledWith('producto-1', {
        imagenUrl: '',
      })
    })
  })

  it('cancela los cambios de la URL de imagen del producto', () => {
    const props = crearProps()
    render(<ProductDetail {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'URL' }))
    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'URL de la imagen del producto',
      }),
      { target: { value: 'https://ejemplo.com/temporal.png' } },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Listo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar cambios' }))

    fireEvent.click(screen.getByRole('button', { name: 'URL' }))

    expect(
      (
        screen.getByRole('textbox', {
          name: 'URL de la imagen del producto',
        }) as HTMLInputElement
      ).value,
    ).toBe('https://ejemplo.com/chocolate.png')
  })

  it('muestra el estado inactivo del producto', () => {
    const props = crearProps()
    props.producto.activo = false
    render(<ProductDetail {...props} />)
    expect(screen.getByText('Inactivo')).toBeTruthy()
  })




  it('mantiene el arrastre al pasar a un elemento interno del marco', () => {
    const props = crearProps()
    render(<ProductDetail {...props} />)
    const marco = document.querySelector('.admin-product-detail__image-frame')
    expect(marco).not.toBeNull()
    const interior = document.createElement('span')
    marco!.appendChild(interior)
    fireEvent.dragOver(marco!, { dataTransfer: { files: [], types: ['Files'] } })
    const evento = new Event('dragleave', { bubbles: true })
    Object.defineProperty(evento, 'relatedTarget', { value: interior })
    marco!.dispatchEvent(evento)
    expect(marco!.className).toContain('is-dragging')
  })

  it('muestra el nombre de la variante en el texto alternativo cuando tiene imagen', () => {
    const producto = crearProducto()
    producto.variantes[0].imagenUrl = 'https://ejemplo.com/unidad.png'
    const props = crearProps(producto)
    render(<ProductDetail {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Unidad' }))
    expect(screen.getByRole('img', { name: 'Unidad' })).toBeTruthy()
  })

})
