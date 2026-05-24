import './App.css'
import { Sidebar } from './components/layout/Sidebar'
import { ToastHost } from './components/layout/ToastHost'
import { useVendorPortalController } from './hooks/useVendorPortalController'
import { AuthPage } from './pages/AuthPage'
import { AccountsPage } from './pages/AccountsPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { DashboardPage } from './pages/DashboardPage'
import { InventoryPage } from './pages/InventoryPage'
import { LandingPage } from './pages/LandingPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OrdersPage } from './pages/OrdersPage'
import { ProductCreatePage } from './pages/ProductCreatePage'
import { ProductEditPage } from './pages/ProductEditPage'
import { ProductsPage } from './pages/ProductsPage'
import { ProfilePage } from './pages/ProfilePage'
import { ReviewsPage } from './pages/ReviewsPage'

function App() {
  const controller = useVendorPortalController()

  if (controller.route.page === 'landing') {
    return (
      <div className="vendor-root vendor-root-landing">
        <LandingPage {...controller.landingProps} />
        <ToastHost toasts={controller.toasts} />
      </div>
    )
  }

  if (controller.sessionStatus === 'checking') {
    return (
      <div className="loading-stage">
        <div className="loading-card">
          <h1>{controller.loadingCopy.title}</h1>
          <p>{controller.loadingCopy.description}</p>
        </div>
      </div>
    )
  }

  if (!controller.isAuthorized) {
    return (
      <div className="vendor-root">
        <AuthPage {...controller.authProps} />
        <ToastHost toasts={controller.toasts} />
      </div>
    )
  }

  return (
    <div className="vendor-root">
      <div className="vendor-shell">
        <Sidebar {...controller.shellProps.sidebar} />

        <div className="vendor-main">
          <main className="vendor-stage">{renderCurrentPage(controller)}</main>
        </div>
      </div>

      <ToastHost toasts={controller.toasts} />
    </div>
  )
}

function renderCurrentPage(controller) {
  if (controller.route.page === 'dashboard') {
    return <DashboardPage {...controller.pageProps.dashboard} />
  }

  if (controller.route.page === 'analytics') {
    return <AnalyticsPage {...controller.pageProps.analytics} />
  }

  if (controller.route.page === 'accounts') {
    return <AccountsPage {...controller.pageProps.accounts} />
  }

  if (controller.route.page === 'products') {
    return <ProductsPage {...controller.pageProps.products} />
  }

  if (controller.route.page === 'productCreate') {
    return <ProductCreatePage {...controller.pageProps.productCreate} />
  }

  if (controller.route.page === 'productEdit') {
    return <ProductEditPage {...controller.pageProps.productEdit} />
  }

  if (controller.route.page === 'inventory') {
    return <InventoryPage {...controller.pageProps.inventory} />
  }

  if (controller.route.page === 'orders') {
    return <OrdersPage {...controller.pageProps.orders} />
  }

  if (controller.route.page === 'reviews') {
    return <ReviewsPage {...controller.pageProps.reviews} />
  }

  if (controller.route.page === 'profile') {
    return <ProfilePage {...controller.pageProps.profile} />
  }

  return <NotFoundPage {...controller.pageProps.notFound} />
}

export default App
