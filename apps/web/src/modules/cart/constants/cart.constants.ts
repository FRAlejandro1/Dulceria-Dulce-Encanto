export const CART_MESSAGES = {
  empty: 'Tu carrito está vacío.',
  checkoutUnavailable:
    'La finalización de pedidos todavía no está disponible.',
  invalidQuantity: 'La cantidad solicitada no es válida.',
  unavailableVariant: 'Esta variante ya no está disponible en el catálogo.',
} as const

export const CART_LAYOUT = {
  desktopMaxWidth: '1180px',
  desktopColumnGap: '45px',
  desktopImageWidth: '110px',
  desktopImageHeight: '100px',
  mobileBreakpoint: '480px',
  tabletBreakpoint: '760px',
} as const