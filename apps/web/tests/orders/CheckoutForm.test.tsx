import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
afterEach(() => cleanup())
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import CheckoutForm from '../../src/modules/cart/components/CheckoutForm/CheckoutForm'

describe('CheckoutForm', () => {
    it('envía el método de pago y las notas limpias', () => {
        const onConfirmar = vi.fn()

        render(
            <CheckoutForm
                procesando={false}
                onConfirmar={onConfirmar}
                onCancelar={vi.fn()}
            />,
        )

        fireEvent.click(screen.getByLabelText('Transferencia bancaria'))
        fireEvent.change(screen.getByLabelText('Notas del pedido (opcional)'), {
            target: { value: '  Entregar por la tarde  ' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }))

        expect(onConfirmar).toHaveBeenCalledWith({
            metodoPago: 'TRANSFER',
            notas: 'Entregar por la tarde',
        })
    })

    it('omite las notas vacías', () => {
        const onConfirmar = vi.fn()

        render(
            <CheckoutForm
                procesando={false}
                onConfirmar={onConfirmar}
                onCancelar={vi.fn()}
            />,
        )

        fireEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }))

        expect(onConfirmar).toHaveBeenCalledWith({ metodoPago: 'CASH' })
    })

    it('permite cancelar el formulario', () => {
        const onCancelar = vi.fn()

        render(
            <CheckoutForm
                procesando={false}
                onConfirmar={vi.fn()}
                onCancelar={onCancelar}
            />,
        )

        fireEvent.click(screen.getByRole('button', { name: 'Volver al carrito' }))

        expect(onCancelar).toHaveBeenCalledOnce()
    })

    it('deshabilita los controles mientras procesa', () => {
        render(
            <CheckoutForm
                procesando
                onConfirmar={vi.fn()}
                onCancelar={vi.fn()}
            />,
        )

        const grupoPago = screen.getByRole('group', { name: 'Método de pago' })
        const notas = screen.getByLabelText('Notas del pedido (opcional)')
        const cancelar = screen.getByRole('button', { name: 'Volver al carrito' })
        const confirmar = screen.getByRole('button', { name: 'Creando pedido…' })

        expect(grupoPago.hasAttribute('disabled')).toBe(true)
        expect((notas as HTMLTextAreaElement).disabled).toBe(true)
        expect((cancelar as HTMLButtonElement).disabled).toBe(true)
        expect((confirmar as HTMLButtonElement).disabled).toBe(true)
    })

    it('actualiza el contador de notas al escribir', () => {
        render(
            <CheckoutForm
                procesando={false}
                onConfirmar={vi.fn()}
                onCancelar={vi.fn()}
            />,
        )

        fireEvent.change(screen.getByLabelText('Notas del pedido (opcional)'), {
            target: { value: 'Entregar' },
        })

        expect(screen.getByText('8/1000 caracteres')).toBeTruthy()
    })

    it('no confirma el pedido si se envía mientras procesa', () => {
        const onConfirmar = vi.fn()

        render(
            <CheckoutForm
                procesando
                onConfirmar={onConfirmar}
                onCancelar={vi.fn()}
            />,
        )

        fireEvent.submit(document.querySelector('form')!)

        expect(onConfirmar).not.toHaveBeenCalled()
    })

    it('actualiza las notas y muestra el contador de caracteres', () => {
        render(
            <CheckoutForm
                procesando={false}
                onConfirmar={vi.fn()}
                onCancelar={vi.fn()}
            />,
        )

        const notas = screen.getByLabelText('Notas del pedido (opcional)')

        fireEvent.change(notas, {
            target: { value: 'Entregar mañana' },
        })

        expect(screen.getByText('15/1000 caracteres')).toBeTruthy()
    })

    it('permite seleccionar efectivo como método de pago', () => {
        const onConfirmar = vi.fn()

        render(<CheckoutForm onConfirmar={onConfirmar} />)

        fireEvent.click(screen.getByRole('radio', { name: /Transferencia bancaria/i }))
        fireEvent.click(screen.getByRole('radio', { name: /Efectivo/i }))

        expect(
            (screen.getByRole('radio', { name: /Efectivo/i }) as HTMLInputElement)
                .checked,
        ).toBe(true)
    })
})
