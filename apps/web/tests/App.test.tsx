import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from '../src/App'

afterEach(() => {
  cleanup()
})

describe('Catálogo de Dulce Encanto', () => {
  it('renderiza la marca, la navegación y los seis productos', () => {
    render(<App />)

    expect(screen.getByRole('link', { name: /Dulce Encanto, inicio/i })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Nuestros productos' })).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeTruthy()
    expect(screen.getAllByRole('article')).toHaveLength(6)
    expect(screen.getByText('Catálogo de demostración.', { exact: false })).toBeTruthy()
  })

  it('filtra productos por nombre y descripción y permite restablecer los resultados', () => {
    render(<App />)

    const busqueda = screen.getByRole('textbox', { name: 'Buscar productos' })
    fireEvent.change(busqueda, { target: { value: 'chocolate' } })

    expect(screen.getByRole('heading', { name: 'Torta de chocolate' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Alfajores artesanales' })).toBeNull()

    fireEvent.change(busqueda, { target: { value: '   ' } })
    expect(screen.getAllByRole('article')).toHaveLength(6)

    fireEvent.change(busqueda, { target: { value: 'producto inexistente' } })
    expect(screen.getByRole('heading', { name: 'No encontramos productos' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Ver todos los productos' }))
    expect(screen.getAllByRole('article')).toHaveLength(6)
    expect((busqueda as HTMLInputElement).value).toBe('')
  })

  it('filtra por categoría y permite regresar a Todos', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Galletas' }))
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.getByRole('heading', { name: 'Galletas con chispas' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Galletas de mantequilla' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Tortas' }))
    expect(screen.getAllByRole('article')).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Todos' }))
    expect(screen.getAllByRole('article')).toHaveLength(6)
  })

  it('ordena los productos por precio ascendente y descendente', () => {
    render(<App />)

    const ordenar = screen.getByRole('combobox', { name: 'Ordenar productos' })

    fireEvent.change(ordenar, { target: { value: 'precio-menor' } })
    let tarjetas = screen.getAllByRole('article')
    expect(within(tarjetas[0]!).getByRole('heading', { name: 'Cupcakes de vainilla' })).toBeTruthy()
    expect(within(tarjetas[5]!).getByRole('heading', { name: 'Torta de chocolate' })).toBeTruthy()

    fireEvent.change(ordenar, { target: { value: 'precio-mayor' } })
    tarjetas = screen.getAllByRole('article')
    expect(within(tarjetas[0]!).getByRole('heading', { name: 'Torta de chocolate' })).toBeTruthy()
    expect(within(tarjetas[5]!).getByRole('heading', { name: 'Cupcakes de vainilla' })).toBeTruthy()

    fireEvent.change(ordenar, { target: { value: 'destacados' } })
    tarjetas = screen.getAllByRole('article')
    expect(within(tarjetas[0]!).getByRole('heading', { name: 'Alfajores artesanales' })).toBeTruthy()
  })

  it('añade y quita favoritos y muestra la vista de favoritos vacía', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Añadir Alfajores artesanales a favoritos' }))
    expect(screen.getByRole('button', { name: 'Quitar Alfajores artesanales de favoritos' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Favoritos/ }).textContent).toContain('1')

    fireEvent.click(screen.getByRole('button', { name: /Favoritos/ }))
    expect(screen.getByRole('heading', { name: 'Mis favoritos' })).toBeTruthy()
    expect(screen.getAllByRole('article')).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Quitar Alfajores artesanales de favoritos' }))
    expect(screen.getByRole('heading', { name: 'Aún no tienes favoritos' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Favoritos/ }))
    expect(screen.getByRole('heading', { name: 'Nuestros productos' })).toBeTruthy()
    expect(screen.getAllByRole('article')).toHaveLength(6)
  })

  it('permite navegar desde Inicio, Ofertas y Productos', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /Favoritos/ }))
    expect(screen.getByRole('heading', { name: 'Mis favoritos' })).toBeTruthy()

    fireEvent.click(screen.getByRole('link', { name: 'Inicio' }))
    expect(screen.getByRole('heading', { name: 'Nuestros productos' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Favoritos/ }))
    fireEvent.click(screen.getByRole('link', { name: 'Ofertas' }))
    expect(screen.getByRole('heading', { name: 'Nuestros productos' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Favoritos/ }))
    fireEvent.click(screen.getByRole('link', { name: 'Productos' }))
    expect(screen.getByRole('heading', { name: 'Nuestros productos' })).toBeTruthy()
  })

  it('añade productos al carrito, actualiza su cantidad y cierra el aviso', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Agregar Alfajores artesanales al carrito' }))
    expect(screen.getByRole('status').textContent).toContain('Alfajores artesanales se añadió al carrito')
    expect(screen.getByRole('button', { name: 'Carrito, 1 productos' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Agregar Alfajores artesanales al carrito' }))
    expect(screen.getByRole('button', { name: 'Carrito, 2 productos' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }))
    expect(screen.queryByRole('status')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Carrito, 2 productos' }))
    expect(screen.getByRole('status').textContent).toContain('Tienes 2 producto(s) en el carrito.')
  })

  it('informa cuando el carrito está vacío', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Carrito, 0 productos' }))
    expect(screen.getByRole('status').textContent).toContain('Tu carrito está vacío.')
  })

  it('abre y cierra las notificaciones', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Notificaciones' }))
    expect(screen.getByText('No tienes notificaciones nuevas.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }))
    expect(screen.queryByText('No tienes notificaciones nuevas.')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Notificaciones' }))
    expect(screen.getByText('No tienes notificaciones nuevas.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Notificaciones' }))
    expect(screen.queryByText('No tienes notificaciones nuevas.')).toBeNull()
  })

  it('abre el perfil y muestra el aviso de inicio de sesión', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Abrir perfil' }))
    expect(screen.getByText('Inicia sesión para acceder a tu perfil y guardar tus favoritos.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(screen.getByRole('status').textContent).toContain('El inicio de sesión se conectará con la API')

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir perfil' }))
    expect(screen.queryByText('Inicia sesión para acceder a tu perfil y guardar tus favoritos.')).toBeNull()
  })

  it('alterna entre modo oscuro y modo claro', () => {
    render(<App />)

    const modo = screen.getByRole('button', { name: 'Activar modo oscuro' })
    fireEvent.click(modo)

    expect(screen.getByRole('main').className).toContain('app--dark')
    fireEvent.click(screen.getByRole('button', { name: 'Activar modo claro' }))
    expect(screen.getByRole('main').className).toBe('app')
  })

  it('muestra las etiquetas de productos que las tienen', () => {
    render(<App />)

    expect(screen.getByText('Más vendido')).toBeTruthy()
    expect(screen.getByText('Favorito')).toBeTruthy()
    expect(screen.getAllByRole('img')).toHaveLength(6)
  })
})
