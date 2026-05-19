export function readRoute() {
  const pathname = window.location.pathname || '/'
  const cleanPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname

  if (cleanPath === '/') {
    return { page: 'landing' }
  }

  if (cleanPath === '/auth') {
    return { page: 'auth' }
  }

  if (cleanPath === '/dashboard') {
    return { page: 'dashboard' }
  }

  if (cleanPath === '/products') {
    return { page: 'products' }
  }

  if (cleanPath === '/products/new') {
    return { page: 'productCreate' }
  }

  const productEditMatch = cleanPath.match(/^\/products\/([^/]+)\/edit$/)
  if (productEditMatch) {
    return { page: 'productEdit', productId: decodeURIComponent(productEditMatch[1]) }
  }

  if (cleanPath === '/inventory') {
    return { page: 'inventory' }
  }

  if (cleanPath === '/orders') {
    return { page: 'orders' }
  }

  if (cleanPath === '/reviews') {
    return { page: 'reviews' }
  }

  if (cleanPath === '/analytics') {
    return { page: 'analytics' }
  }

  if (cleanPath === '/profile') {
    return { page: 'profile' }
  }

  return { page: 'notFound' }
}
