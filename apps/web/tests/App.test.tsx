import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from '../src/App'

afterEach(() => {
  cleanup()
})

describe('App', () => {
  it('renderiza el contenido principal y los enlaces de documentación', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Get started' }),
    ).toBeTruthy()

    expect(screen.getByText('src/App.tsx')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Explore Vite/ }).getAttribute('href')).toBe('https://vite.dev/')
    expect(screen.getByRole('link', { name: /Learn more/ }).getAttribute('href')).toBe('https://react.dev/')
    expect(screen.getByRole('link', { name: 'GitHub' }).getAttribute('href')).toBe('https://github.com/vitejs/vite')
    expect(screen.getByRole('link', { name: 'Discord' }).getAttribute('href')).toBe('https://chat.vite.dev/')
    expect(screen.getByRole('link', { name: 'X.com' }).getAttribute('href')).toBe('https://x.com/vite_js')
    expect(screen.getByRole('link', { name: 'Bluesky' }).getAttribute('href')).toBe('https://bsky.app/profile/vite.dev')
  })

  it('incrementa el contador al pulsar el botón', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Count is 0' }))

    expect(screen.getByRole('button', { name: 'Count is 1' })).toBeTruthy()
  })

  it('permite incrementar el contador varias veces', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Count is 0' }))
    fireEvent.click(screen.getByRole('button', { name: 'Count is 1' }))

    expect(screen.getByRole('button', { name: 'Count is 2' })).toBeTruthy()
  })
})
