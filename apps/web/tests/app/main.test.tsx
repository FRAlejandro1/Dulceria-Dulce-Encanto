import { StrictMode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { render } = vi.hoisted(() => ({
  render: vi.fn(),
}))

vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({ render })),
}))

vi.mock('../../src/App.tsx', () => ({
  default: () => null,
}))

import { createRoot } from 'react-dom/client'
import App from '../../src/App.tsx'

describe('punto de entrada main.tsx', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('monta App dentro de StrictMode en root', async () => {
    const root = document.createElement('div')
    root.id = 'root'
    document.body.appendChild(root)

    await import('../../src/main.tsx')

    expect(createRoot).toHaveBeenCalledWith(root)
    expect(render).toHaveBeenCalledOnce()

    const arbol = render.mock.calls[0]?.[0]
    expect(arbol.type).toBe(StrictMode)
    expect(arbol.props.children.type).toBe(App)
  })
})
