import { startTransition, useDeferredValue, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import {
  ApiError,
  apiRequest,
  downloadFile,
  getStoredAccessToken,
  getStoredRefreshToken,
  setStoredAccessToken,
  setStoredRefreshToken,
  uploadMediaFile,
} from '../api'
import { readRoute } from '../app/router'
import {
  buildProductPayload,
  createProductImageDraft,
  emptyProductForm,
  emptyProfile,
  flattenCategories,
  getCategoryId,
  getProductId,
  getProductPrice,
  getProductStatus,
  getProductUpdatedAt,
  getStockCount,
  normalizeProfile,
  parsePriceValue,
  populateProductForm,
  productMatchesQuery,
  toText,
} from '../helpers'
import { portalAuthCopy, portalLandingCopy, portalNavItems, portalShellCopy } from '../portalContent'

const PAGE_COPY = {
  landing: {
    title: 'Маркетплейс для продавцов',
    description: 'Публичная страница vendor-portal с переходом в кабинет продавца.',
  },
  auth: {
    title: 'Вход в кабинет',
    description: 'Авторизация или регистрация продавца.',
  },
  dashboard: {
    title: 'Пульс кабинета',
    description: 'Сводка по каталогу вендора, качеству витрины и остаткам.',
  },
  analytics: {
    title: 'Аналитика',
    description: 'Прибыльность, спрос, ниши и отчеты по продажам.',
  },
  products: {
    title: 'Управление товарами',
    description: 'Список, поиск, редактирование и дублирование товарных карточек.',
  },
  productCreate: {
    title: 'Новый товар',
    description: 'Отдельная страница создания карточки без смешивания со списком каталога.',
  },
  productEdit: {
    title: 'Редактирование товара',
    description: 'Отдельная страница изменения карточки товара.',
  },
  inventory: {
    title: 'Остатки и риск',
    description: 'Товары с низким остатком и позиции без наличия.',
  },
  orders: {
    title: 'Заказы',
    description: 'Операционная обработка заказов продавца и смена статусов доставки.',
  },
  reviews: {
    title: 'Отзывы',
    description: 'Ответы покупателям и спорные отзывы по товарам продавца.',
  },
  profile: {
    title: 'Профиль вендора',
    description: 'Личные данные, email и контекст учетной записи.',
  },
  notFound: {
    title: 'Маршрут не найден',
    description: 'Проверьте путь или вернитесь в пульс кабинета.',
    buttonLabel: 'Вернуться в пульс',
  },
}

const LOADING_COPY = {
  title: 'Собираем кабинет вендора',
  description: 'Проверяем сессию, загружаем профиль и каталог продавца.',
}

const PRODUCT_CREATE_DRAFT_KEY = 'marketplace.vendor.product_create_draft'

export function useVendorPortalController() {
  const [route, setRoute] = useState(() => readRoute())
  const [accessToken, setAccessToken] = useState(() => getStoredAccessToken())
  const [sessionStatus, setSessionStatus] = useState('checking')
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ email: '', password: '' })
  const [profileForm, setProfileForm] = useState(() => ({ ...emptyProfile }))
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [reviews, setReviews] = useState([])
  const [reviewReplyForms, setReviewReplyForms] = useState({})
  const [reviewDisputeForms, setReviewDisputeForms] = useState({})
  const [productForm, setProductForm] = useState(() => readProductCreateDraft() || { ...emptyProductForm })
  const [productCosts, setProductCosts] = useState({})
  const [analytics, setAnalytics] = useState(() => ({ overview: null, niches: [], products: [] }))
  const [analyticsPeriod, setAnalyticsPeriod] = useState(() => buildPeriod(30))
  const [selectedProductId, setSelectedProductId] = useState('')
  const [search, setSearch] = useState('')
  const [busyKeys, setBusyKeys] = useState({})
  const [toasts, setToasts] = useState([])
  const toastIdRef = useRef(0)
  const deferredSearch = useDeferredValue(search)

  const isAuthorized = Boolean(accessToken)
  const pageCopy = PAGE_COPY[route.page] || PAGE_COPY.notFound
  const categoryOptions = useMemo(() => flattenCategories(categories), [categories])
  const categoryLabelById = useMemo(
    () =>
      categoryOptions.reduce((accumulator, category) => {
        accumulator[category.value] = category.label.trim()
        return accumulator
      }, {}),
    [categoryOptions],
  )
  const visibleProducts = useMemo(
    () => products.filter((product) => productMatchesQuery(product, deferredSearch, categoryLabelById)),
    [products, deferredSearch, categoryLabelById],
  )
  const productCreateDraft = useMemo(() => {
    if (!productForm.productId && productFormHasDraftContent(productForm)) {
      return normalizeProductCreateDraft(productForm)
    }

    return readProductCreateDraft()
  }, [productForm])
  const stats = useMemo(() => buildStats(products), [products])
  const recentProducts = useMemo(() => [...products].sort(sortByUpdatedDesc).slice(0, 5), [products])
  const lowStockProducts = useMemo(
    () =>
      [...products]
        .filter((product) => ['low', 'out'].includes(getProductStatus(product)))
        .sort((left, right) => toSafeInteger(getStockCount(left)) - toSafeInteger(getStockCount(right)))
        .slice(0, 6),
    [products],
  )
  const categoryInsights = useMemo(() => buildCategoryInsights(products, categoryLabelById), [products, categoryLabelById])
  const stockBuckets = useMemo(
    () => [
      { label: 'Стабильный остаток', value: stats.healthyStockCount, tone: 'accent' },
      { label: 'Низкий остаток', value: stats.lowStockCount, tone: 'warning' },
      { label: 'Нет в наличии', value: stats.outOfStockCount, tone: 'danger' },
    ],
    [stats],
  )

  const handleBootstrapEffect = useEffectEvent(() => {
    void bootstrap()
  })

  const handleAnalyticsEffect = useEffectEvent(() => {
    void loadAnalytics()
  })

  useEffect(() => {
    handleBootstrapEffect()
  }, [])

  useEffect(() => {
    const syncRoute = () => {
      startTransition(() => {
        setRoute(readRoute())
      })
    }

    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [])

  useEffect(() => {
    document.title = `${pageCopy.title} | Vendor Portal`
  }, [pageCopy.title])

  useEffect(() => {
    if (route.page !== 'productEdit') {
      return
    }

    const routeProductId = toText(route.productId).trim()
    if (!routeProductId || (selectedProductId === routeProductId && productForm.productId === routeProductId)) {
      return
    }

    const product = products.find((item) => getProductId(item) === routeProductId)
    if (!product) {
      return
    }

    startTransition(() => {
      setSelectedProductId(routeProductId)
      setProductForm(populateProductForm({
        ...product,
        cost_price: productCosts[routeProductId] || toText(product?.cost_price ?? product?.costPrice),
      }))
    })
  }, [productCosts, productForm.productId, products, route.page, route.productId, selectedProductId])

  useEffect(() => {
    if (route.page !== 'productCreate' || productForm.productId) {
      return
    }

    if (productFormHasDraftContent(productForm)) {
      writeProductCreateDraft(productForm)
      return
    }

    clearProductCreateDraft()
  }, [productForm, route.page])

  useEffect(() => {
    if (!isAuthorized || sessionStatus !== 'active') {
      return
    }

    handleAnalyticsEffect()
  }, [analyticsPeriod.from, analyticsPeriod.to, isAuthorized, sessionStatus])

  async function bootstrap() {
    await Promise.allSettled([loadCategories(), restoreSession()])
  }

  async function restoreSession() {
    const stored = getStoredAccessToken()

    if (!stored) {
      await refreshSession(true)
      return
    }

    try {
      storeAccessToken(stored)
      await hydratePrivate(stored)
    } catch (error) {
      clearAuth()

      if (!(error instanceof ApiError && error.status === 401)) {
        handleError(error)
      }

      await refreshSession(true)
    }
  }

  async function loadCategories() {
    try {
      const response = await apiRequest('/api/v1/catalog/categories?include_children=true')
      startTransition(() => {
        setCategories(response.categories || [])
      })
    } catch (error) {
      handleError(error)
    }
  }

  async function hydratePrivate(token) {
    const profile = await fetchProfile(token)
    startTransition(() => {
      setProfileForm(profile)
      setSessionStatus('active')
    })
    await Promise.allSettled([
      loadVendorProducts(profile.id, token),
      loadVendorOrders(token),
      loadVendorReviews(token),
    ])
  }

  async function fetchProfile(token) {
    try {
      const response = await apiRequest('/api/v1/vendor/auth/me', { token })
      return normalizeProfile(response)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return { ...emptyProfile }
      }

      throw error
    }
  }

  async function loadVendorProducts(userId, token = accessToken) {
    if (!toText(userId)) {
      startTransition(() => {
        setProducts([])
      })
      return
    }

    setBusy('products', true)

    try {
      const response = await apiRequest('/api/v1/vendor/catalog/products', { token })
      const allProducts = response.products || []

      startTransition(() => {
        setProducts(allProducts)
        setSelectedProductId((current) => (allProducts.some((product) => getProductId(product) === current) ? current : ''))
        setProductForm((current) => {
          if (!current.productId) {
            return current
          }

          const freshProduct = allProducts.find((product) => getProductId(product) === current.productId)
          return freshProduct ? populateProductForm(freshProduct) : { ...emptyProductForm }
        })
      })
    } catch (error) {
      handleError(error)
    } finally {
      setBusy('products', false)
    }
  }

  async function loadVendorOrders(token = accessToken) {
    setBusy('orders', true)

    try {
      const response = await apiRequest('/api/v1/vendor/orders', { token })
      startTransition(() => {
        setOrders(response.orders || [])
      })
    } catch (error) {
      handleError(error)
    } finally {
      setBusy('orders', false)
    }
  }

  async function loadVendorReviews(token = accessToken) {
    setBusy('reviews', true)

    try {
      const response = await apiRequest('/api/v1/vendor/reviews', { token })
      startTransition(() => {
        setReviews(response.reviews || [])
      })
    } catch (error) {
      handleError(error)
    } finally {
      setBusy('reviews', false)
    }
  }

  async function loadAnalytics(token = accessToken) {
    setBusy('analytics', true)

    const query = `from=${encodeURIComponent(analyticsPeriod.from)}&to=${encodeURIComponent(analyticsPeriod.to)}`

    try {
      const [overview, niches, analyticsProducts] = await Promise.all([
        apiRequest(`/api/v1/vendor/analytics/overview?${query}`, { token }),
        apiRequest(`/api/v1/vendor/analytics/niches?${query}&sort=opportunity&limit=30`, { token }),
        apiRequest(`/api/v1/vendor/analytics/products?${query}`, { token }),
      ])

      const nextProducts = analyticsProducts.products || []
      const nextCosts = nextProducts.reduce((accumulator, product) => {
        const productId = toText(product?.product_id ?? product?.productId)
        const costPrice = toText(product?.cost_price ?? product?.costPrice)
        if (productId && costPrice) {
          accumulator[productId] = costPrice
        }
        return accumulator
      }, {})

      startTransition(() => {
        setAnalytics({
          overview,
          niches: niches.niches || [],
          products: nextProducts,
        })
        setProductCosts(nextCosts)
      })
    } catch (error) {
      handleError(error)
    } finally {
      setBusy('analytics', false)
    }
  }

  async function ensureAuthorized() {
    if (accessToken) {
      return accessToken
    }

    const refreshedToken = await refreshSession(true)
    if (refreshedToken) {
      return refreshedToken
    }

    throw new ApiError('Нужна авторизация.', 401)
  }

  async function authedRequest(path, options = {}) {
    const token = options.token || (await ensureAuthorized())
    return apiRequest(path, { ...options, token })
  }

  async function handleAuthSubmit(event) {
    event.preventDefault()
    setBusy('auth', true)

    try {
      const email = authForm.email.trim()
      const password = authForm.password

      if (!email || !password) {
        throw new Error('Введите email и пароль.')
      }

      if (authMode === 'register') {
        await apiRequest('/api/v1/vendor/auth/register', {
          method: 'POST',
          body: { email, password },
        })
      }

      const response = await apiRequest('/api/v1/vendor/auth/login', {
        method: 'POST',
        body: { email, password },
      })

      const nextToken = getAccessTokenFromResponse(response, 'Не удалось выполнить вход. Попробуйте еще раз.', 'login')
      storeAccessToken(nextToken)
      setAuthForm((current) => ({ ...current, password: '' }))
      await hydratePrivate(nextToken)
      navigate('/dashboard')
      notify(authMode === 'register' ? 'Аккаунт создан, вход выполнен.' : 'Сессия открыта.', 'success')
    } catch (error) {
      handleError(error)
    } finally {
      setBusy('auth', false)
    }
  }

  async function refreshSession(silent = false) {
    setBusy('refresh', true)

    try {
      const refreshToken = getStoredRefreshToken()
      const response = await apiRequest('/api/v1/vendor/auth/refresh', {
        method: 'POST',
        body: refreshToken ? { refresh_token: refreshToken } : undefined,
      })
      const nextToken = getAccessTokenFromResponse(response, 'Не удалось обновить сессию.', 'refresh')
      storeAccessToken(nextToken)
      await hydratePrivate(nextToken)

      if (!silent) {
        notify('Сессия обновлена.', 'success')
      }

      return nextToken
    } catch (error) {
      clearAuth()

      if (!silent && !(error instanceof ApiError && error.status === 401)) {
        handleError(error)
      }

      if (!silent && error instanceof ApiError && error.status === 401) {
        notify('Сессия истекла. Войдите снова.', 'warning')
      }

      return ''
    } finally {
      setBusy('refresh', false)
    }
  }

  async function handleLogout() {
    setBusy('logout', true)

    try {
      const refreshToken = getStoredRefreshToken()
      await apiRequest('/api/v1/vendor/auth/logout', {
        method: 'POST',
        body: refreshToken ? { refresh_token: refreshToken } : undefined,
      })
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) {
        handleError(error)
      }
    } finally {
      clearAuth()
      setBusy('logout', false)
    }

    notify('Вы вышли из кабинета.', 'info')
    navigate('/')
  }

  async function handleProfileSubmit(event) {
    event.preventDefault()
    setBusy('profile', true)

    try {
      const response = await authedRequest('/api/v1/users/me', {
        method: 'PATCH',
        body: {
          email: profileForm.email.trim(),
          first_name: profileForm.firstName.trim(),
          last_name: profileForm.lastName.trim(),
          avatar_url: profileForm.avatarUrl.trim(),
        },
      })

      startTransition(() => {
        setProfileForm(normalizeProfile(response))
      })
      notify('Профиль сохранен.', 'success')
    } catch (error) {
      handleError(error)
    } finally {
      setBusy('profile', false)
    }
  }

  async function uploadFormFile(file, directory, busyKey) {
    if (!file) {
      return ''
    }

    setBusy(busyKey, true)

    try {
      const token = await ensureAuthorized()
      const response = await uploadMediaFile(file, { token, directory })
      const fileUrl = toText(response?.fileUrl ?? response?.file_url).trim()

      if (!fileUrl) {
        throw new Error('Media service не вернул file_url.')
      }

      return fileUrl
    } finally {
      setBusy(busyKey, false)
    }
  }

  async function handleProfileAvatarUpload(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    try {
      const fileUrl = await uploadFormFile(file, 'avatars/vendors', 'mediaAvatar')
      if (!fileUrl) {
        return
      }

      startTransition(() => {
        setProfileForm((current) => ({ ...current, avatarUrl: fileUrl }))
      })
      notify('Аватар загружен. Сохраните профиль, чтобы применить ссылку.', 'success')
    } catch (error) {
      handleError(error)
    }
  }

  async function handleProductImageUpload(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    try {
      const fileUrl = await uploadFormFile(file, 'products', 'mediaProductImage')
      if (!fileUrl) {
        return
      }

      startTransition(() => {
        setProductForm((current) => {
          const hasMainImage = current.images.some((image) => image.isMain)

          return {
            ...current,
            images: [
              ...current.images,
              createProductImageDraft({
                url: fileUrl,
                isMain: !hasMainImage,
              }),
            ],
          }
        })
      })
      notify('Изображение загружено и добавлено в форму товара.', 'success')
    } catch (error) {
      handleError(error)
    }
  }

  async function handleProductSubmit(event) {
    event.preventDefault()
    setBusy('productSave', true)

    const isCreate = !productForm.productId

    try {
      const payload = buildProductPayload(productForm, {
        vendorId: profileForm.id,
        includeVendorId: false,
      })
      const response = isCreate
        ? await authedRequest('/api/v1/vendor/catalog/products', {
            method: 'POST',
            body: payload,
          })
        : await authedRequest(`/api/v1/vendor/catalog/products/${productForm.productId}`, {
            method: 'PATCH',
            body: payload,
          })

      const savedProduct = response.product
      if (!savedProduct) {
        throw new Error('Backend не вернул product в ответе.')
      }

      const savedProductId = getProductId(savedProduct)
      const costPrice = toText(productForm.costPrice).trim()
      let savedCostProduct = null
      if (costPrice) {
        const costResponse = await authedRequest(`/api/v1/vendor/analytics/products/${savedProductId}/cost`, {
          method: 'PUT',
          body: { cost_price: costPrice },
        })
        savedCostProduct = costResponse.product
      }

      startTransition(() => {
        setProducts((current) => upsertProduct(current, savedProduct))
        setSelectedProductId(savedProductId)
        if (savedCostProduct?.cost_price || costPrice) {
          setProductCosts((current) => ({ ...current, [savedProductId]: savedCostProduct?.cost_price || costPrice }))
        }
        setProductForm(populateProductForm({ ...savedProduct, cost_price: savedCostProduct?.cost_price || costPrice }))
      })

      if (costPrice) {
        void loadAnalytics()
      }

      if (isCreate) {
        clearProductCreateDraft()
        navigate('/products')
      }

      notify(isCreate ? 'Товар создан.' : 'Товар обновлен.', 'success')
    } catch (error) {
      handleError(error)
    } finally {
      setBusy('productSave', false)
    }
  }

  async function handleOrderStatusUpdate(order, status) {
    const orderId = toText(order?.id ?? order?.orderId ?? order?.order_id).trim()
    const nextStatus = toText(status).trim()

    if (!orderId) {
      notify('Не удалось определить ID заказа.', 'warning')
      return
    }

    if (!nextStatus) {
      notify('Выберите статус заказа.', 'warning')
      return
    }

    setBusy(`order-${orderId}`, true)

    try {
      const response = await authedRequest(`/api/v1/vendor/orders/${orderId}`, {
        method: 'PATCH',
        body: { status: nextStatus },
      })
      const updatedOrder = response.order

      if (!updatedOrder) {
        throw new Error('Backend не вернул order после обновления статуса.')
      }

      startTransition(() => {
        setOrders((current) => upsertOrder(current, updatedOrder))
      })
      notify('Статус заказа обновлен.', 'success')
    } catch (error) {
      handleError(error)
    } finally {
      setBusy(`order-${orderId}`, false)
    }
  }

  function handleReviewReplyChange(reviewId, value) {
    startTransition(() => {
      setReviewReplyForms((current) => ({ ...current, [reviewId]: value }))
    })
  }

  function handleReviewDisputeChange(reviewId, value) {
    startTransition(() => {
      setReviewDisputeForms((current) => ({ ...current, [reviewId]: value }))
    })
  }

  async function handleReviewReply(reviewId) {
    const comment = toText(reviewReplyForms[reviewId]).trim()
    if (!comment) {
      notify('Введите ответ продавца.', 'warning')
      return
    }

    setBusy(`reviewReply-${reviewId}`, true)

    try {
      const response = await authedRequest(`/api/v1/vendor/reviews/${encodeURIComponent(reviewId)}/reply`, {
        method: 'POST',
        body: { comment },
      })

      startTransition(() => {
        setReviews((current) => current.map((review) => (toText(review?.id) === toText(reviewId) ? response.review || review : review)))
        setReviewReplyForms((current) => ({ ...current, [reviewId]: '' }))
      })
      notify('Ответ опубликован.', 'success')
    } catch (error) {
      handleError(error)
    } finally {
      setBusy(`reviewReply-${reviewId}`, false)
    }
  }

  async function handleReviewDispute(reviewId) {
    const reason = toText(reviewDisputeForms[reviewId]).trim() || 'Несправедливый отзыв'
    setBusy(`reviewDispute-${reviewId}`, true)

    try {
      const response = await authedRequest(`/api/v1/vendor/reviews/${encodeURIComponent(reviewId)}/disputes`, {
        method: 'POST',
        body: { reason },
      })

      startTransition(() => {
        setReviews((current) => current.map((review) => (toText(review?.id) === toText(reviewId) ? response.review || review : review)))
        setReviewDisputeForms((current) => ({ ...current, [reviewId]: '' }))
      })
      notify('Отзыв отправлен администратору.', 'success')
    } catch (error) {
      handleError(error)
    } finally {
      setBusy(`reviewDispute-${reviewId}`, false)
    }
  }

  function openCreateProduct() {
    navigate('/products/new')
    startTransition(() => {
      setSelectedProductId('')
      setProductForm(readProductCreateDraft() || { ...emptyProductForm })
    })
  }

  function openEditProduct(product) {
    const productId = getProductId(product)
    if (!productId) {
      notify('Не удалось открыть редактирование: у товара нет ID.', 'warning')
      return
    }

    navigate(`/products/${encodeURIComponent(productId)}/edit`)
    startTransition(() => {
      setSelectedProductId(productId)
      setProductForm(populateProductForm(withProductCost(product)))
    })
  }

  function duplicateProduct(product) {
    navigate('/products/new')
    startTransition(() => {
      const nextForm = populateProductForm(withProductCost(product))
      setSelectedProductId('')
      setProductForm({
        ...nextForm,
        productId: '',
        name: `Копия ${nextForm.name}`.trim(),
      })
    })
  }

  function resetProductForm() {
    if (route.page === 'productCreate') {
      clearProductCreateDraft()
    }

    startTransition(() => {
      setSelectedProductId('')
      setProductForm({ ...emptyProductForm })
    })
  }

  function withProductCost(product) {
    return {
      ...product,
      cost_price: productCosts[getProductId(product)] || toText(product?.cost_price ?? product?.costPrice),
    }
  }

  function openAccountEntry() {
    navigate(isAuthorized ? '/dashboard' : '/auth')
  }

  function setAnalyticsPeriodPreset(days) {
    startTransition(() => {
      setAnalyticsPeriod(buildPeriod(Number.parseInt(days, 10) || 30))
    })
  }

  function updateAnalyticsPeriod(nextValue) {
    startTransition(() => {
      setAnalyticsPeriod((current) => ({ ...current, ...nextValue }))
    })
  }

  async function downloadAnalyticsReport(format) {
    setBusy('analyticsReport', true)
    try {
      const query = `from=${encodeURIComponent(analyticsPeriod.from)}&to=${encodeURIComponent(analyticsPeriod.to)}&format=${encodeURIComponent(format)}`
      const file = await downloadFile(`/api/v1/vendor/analytics/reports/sales?${query}`)
      const url = URL.createObjectURL(file.blob)
      const link = document.createElement('a')
      link.href = url
      link.download = file.filename
      document.body.append(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      handleError(error)
    } finally {
      setBusy('analyticsReport', false)
    }
  }

  function navigate(path) {
    if (`${window.location.pathname}${window.location.search}` === path) {
      return
    }

    window.history.pushState({}, '', path)
    startTransition(() => {
      setRoute(readRoute())
    })
  }

  function storeAccessToken(token) {
    setStoredAccessToken(token)
    setAccessToken(token)
  }

  function clearAuth() {
    storeAccessToken('')
    setStoredRefreshToken('')
    setSessionStatus('guest')
    startTransition(() => {
      setProfileForm({ ...emptyProfile, email: authForm.email.trim() })
      setProducts([])
      setOrders([])
      setReviews([])
      setReviewReplyForms({})
      setReviewDisputeForms({})
      setProductCosts({})
      setAnalytics({ overview: null, niches: [], products: [] })
      setSelectedProductId('')
      setProductForm({ ...emptyProductForm })
    })
  }

  function setBusy(key, value) {
    setBusyKeys((current) => {
      const next = { ...current }

      if (value) {
        next[key] = true
      } else {
        delete next[key]
      }

      return next
    })
  }

  function notify(message, type = 'info') {
    const id = toastIdRef.current + 1
    toastIdRef.current = id
    setToasts((current) => [...current, { id, message, type }])

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 3200)
  }

  function handleError(error) {
    if (error instanceof ApiError) {
      notify(error.message, error.status >= 500 ? 'error' : 'warning')
      return
    }

    if (error instanceof Error) {
      notify(error.message, 'warning')
      return
    }

    notify('Произошла непредвиденная ошибка.', 'error')
  }

  return {
    route,
    isAuthorized,
    sessionStatus,
    toasts,
    loadingCopy: LOADING_COPY,
    landingProps: {
      copy: portalLandingCopy,
      isAuthorized,
      onOpenAccount: openAccountEntry,
    },
    authProps: {
      authMode,
      authForm,
      busyKeys,
      copy: portalAuthCopy,
      onAuthModeChange: setAuthMode,
      onAuthFormChange: setAuthForm,
      onAuthSubmit: handleAuthSubmit,
    },
    shellProps: {
      sidebar: {
        navItems: portalNavItems,
        currentPage: ['productCreate', 'productEdit'].includes(route.page) ? 'products' : route.page,
        profileName: profileForm.firstName || profileForm.email || 'Vendor',
        busyKeys,
        onNavigate: navigate,
        brandBadge: portalShellCopy.brandBadge,
        brandTitle: portalShellCopy.brandTitle,
        brandSubtitle: portalShellCopy.brandSubtitle,
        logoutLabel: portalShellCopy.logoutLabel,
        onLogout: handleLogout,
      },
    },
    pageProps: {
      dashboard: {
        stats,
        categoryInsights,
        recentProducts,
        lowStockProducts,
        onGoProducts: () => navigate('/products'),
        onCreateProduct: openCreateProduct,
        onEditProduct: openEditProduct,
      },
      analytics: {
        analytics,
        period: analyticsPeriod,
        busyKeys,
        onPeriodPreset: setAnalyticsPeriodPreset,
        onPeriodChange: updateAnalyticsPeriod,
        onDownloadReport: downloadAnalyticsReport,
      },
      products: {
        categories: categoryOptions,
        visibleProducts,
        productDraft: productCreateDraft && productMatchesQuery(productCreateDraft, deferredSearch, categoryLabelById) ? productCreateDraft : null,
        categoryLabelById,
        search,
        selectedProductId,
        busyKeys,
        productForm,
        onSearchChange: setSearch,
        onCreateProduct: openCreateProduct,
        onEditProduct: openEditProduct,
        onDuplicateProduct: duplicateProduct,
        onProductFormChange: setProductForm,
        onProductSubmit: handleProductSubmit,
        onResetProductForm: resetProductForm,
        onProductImageUpload: handleProductImageUpload,
      },
      productCreate: {
        categories: categoryOptions,
        busyKeys,
        productForm,
        onGoProducts: () => navigate('/products'),
        onProductFormChange: setProductForm,
        onProductSubmit: handleProductSubmit,
        onResetProductForm: resetProductForm,
        onProductImageUpload: handleProductImageUpload,
      },
      productEdit: {
        categories: categoryOptions,
        busyKeys,
        productForm,
        isReady: Boolean(route.productId && productForm.productId === route.productId),
        onGoProducts: () => navigate('/products'),
        onProductFormChange: setProductForm,
        onProductSubmit: handleProductSubmit,
        onProductImageUpload: handleProductImageUpload,
      },
      inventory: {
        stats,
        stockBuckets,
        categoryLabelById,
        watchProducts: lowStockProducts,
        onEditProduct: openEditProduct,
      },
      orders: {
        orders,
        busyKeys,
        onReloadOrders: () => loadVendorOrders(),
        onUpdateOrderStatus: handleOrderStatusUpdate,
      },
      reviews: {
        reviews,
        products,
        busyKeys,
        replyForms: reviewReplyForms,
        disputeForms: reviewDisputeForms,
        onReloadReviews: () => loadVendorReviews(),
        onReplyChange: handleReviewReplyChange,
        onDisputeChange: handleReviewDisputeChange,
        onReply: handleReviewReply,
        onDispute: handleReviewDispute,
      },
      profile: {
        profileForm,
        busyKeys,
        stats,
        profileEditable: false,
        profileSupportNote:
          'Backend СЃРµР№С‡Р°СЃ РѕС‚РґР°РµС‚ С‚РѕР»СЊРєРѕ vendor_id Рё email. Р РµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ РїСЂРѕС„РёР»СЏ РµС‰Рµ РЅРµ РїРѕРґРєР»СЋС‡РµРЅРѕ.',
        onProfileChange: setProfileForm,
        onProfileSubmit: handleProfileSubmit,
        onAvatarUpload: handleProfileAvatarUpload,
      },
      notFound: {
        title: pageCopy.title,
        description: pageCopy.description,
        buttonLabel: pageCopy.buttonLabel,
        onGoDashboard: () => navigate('/dashboard'),
      },
    },
  }
}

function getAccessTokenFromResponse(response, failureMessage, operation) {
  const accessToken = toText(response?.accessToken ?? response?.access_token).trim()
  if (accessToken) {
    return accessToken
  }

  console.error(`Missing access token in ${operation} response.`, response)
  throw new Error(failureMessage)
}

function buildStats(products) {
  const totalProducts = products.length
  const totalStock = products.reduce((sum, product) => sum + toSafeInteger(getStockCount(product)), 0)
  const inventoryValue = products.reduce(
    (sum, product) => sum + parsePriceValue(getProductPrice(product)) * toSafeInteger(getStockCount(product)),
    0,
  )
  const lowStockCount = products.filter((product) => getProductStatus(product) === 'low').length
  const outOfStockCount = products.filter((product) => getProductStatus(product) === 'out').length
  const healthyStockCount = products.filter((product) => getProductStatus(product) === 'ok').length
  const categoriesCount = new Set(products.map((product) => getCategoryId(product)).filter(Boolean)).size

  return {
    totalProducts,
    totalStock,
    inventoryValue,
    lowStockCount,
    outOfStockCount,
    healthyStockCount,
    categoriesCount,
  }
}

function buildCategoryInsights(products, categoryLabelById) {
  const counts = new Map()

  for (const product of products) {
    const categoryId = getCategoryId(product) || 'unknown'
    const label = categoryLabelById[categoryId] || `Категория ${categoryId}`
    counts.set(label, (counts.get(label) || 0) + 1)
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 6)
}

function sortByUpdatedDesc(left, right) {
  return new Date(getProductUpdatedAt(right)).getTime() - new Date(getProductUpdatedAt(left)).getTime()
}

function upsertProduct(products, nextProduct) {
  const nextId = getProductId(nextProduct)
  const withoutCurrent = products.filter((product) => getProductId(product) !== nextId)
  return [nextProduct, ...withoutCurrent].sort(sortByUpdatedDesc)
}

function upsertOrder(orders, nextOrder) {
  const nextId = toText(nextOrder?.id ?? nextOrder?.orderId ?? nextOrder?.order_id)
  const withoutCurrent = orders.filter((order) => toText(order?.id ?? order?.orderId ?? order?.order_id) !== nextId)
  return [nextOrder, ...withoutCurrent].sort((left, right) => {
    const leftDate = new Date(left?.createdAt ?? left?.created_at ?? 0).getTime()
    const rightDate = new Date(right?.createdAt ?? right?.created_at ?? 0).getTime()
    return rightDate - leftDate
  })
}

function toSafeInteger(value) {
  const parsed = Number.parseInt(toText(value), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0
}

function buildPeriod(days) {
  const normalizedDays = Number.isInteger(days) && days > 0 ? days : 30
  const to = new Date()
  const from = new Date()
  from.setDate(to.getDate() - normalizedDays + 1)

  return {
    from: formatInputDate(from),
    to: formatInputDate(to),
    preset: String(normalizedDays),
  }
}

function formatInputDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function readProductCreateDraft() {
  try {
    const raw = window.localStorage.getItem(PRODUCT_CREATE_DRAFT_KEY)
    if (!raw) {
      return null
    }

    const draft = normalizeProductCreateDraft(JSON.parse(raw))
    return productFormHasDraftContent(draft) ? draft : null
  } catch {
    clearProductCreateDraft()
    return null
  }
}

function writeProductCreateDraft(form) {
  try {
    window.localStorage.setItem(PRODUCT_CREATE_DRAFT_KEY, JSON.stringify(normalizeProductCreateDraft(form)))
  } catch {
    // Ignore storage quota/private mode errors; the form itself still works.
  }
}

function clearProductCreateDraft() {
  try {
    window.localStorage.removeItem(PRODUCT_CREATE_DRAFT_KEY)
  } catch {
    // localStorage can be unavailable in restricted browser modes.
  }
}

function productFormHasDraftContent(form) {
  if (!form) {
    return false
  }

  if (
    [
      form.categoryId,
      form.name,
      form.description,
      form.price,
      form.costPrice,
      form.stockCount,
    ].some((value) => toText(value).trim())
  ) {
    return true
  }

  const hasAttributes = Array.isArray(form.attributes) && form.attributes.some((section) => {
    if (toText(section?.title).trim()) {
      return true
    }

    return Array.isArray(section?.attributes) && section.attributes.some((attribute) => (
      toText(attribute?.key).trim() || toText(attribute?.value).trim()
    ))
  })

  const hasImages = Array.isArray(form.images) && form.images.some((image) => toText(image?.url).trim())

  return hasAttributes || hasImages
}

function normalizeProductCreateDraft(draft) {
  return {
    ...emptyProductForm,
    productId: '',
    categoryId: toText(draft?.categoryId),
    name: toText(draft?.name),
    description: toText(draft?.description),
    price: toText(draft?.price),
    costPrice: toText(draft?.costPrice),
    stockCount: toText(draft?.stockCount),
    attributes: normalizeDraftAttributeSections(draft?.attributes),
    images: normalizeDraftImages(draft?.images),
  }
}

function normalizeDraftAttributeSections(sections) {
  if (!Array.isArray(sections)) {
    return []
  }

  return sections.map((section, sectionIndex) => ({
    id: toText(section?.id) || createStorageDraftId('section', sectionIndex),
    title: toText(section?.title),
    attributes: Array.isArray(section?.attributes)
      ? section.attributes.map((attribute, attributeIndex) => ({
          id: toText(attribute?.id) || createStorageDraftId('attribute', attributeIndex),
          key: toText(attribute?.key),
          value: toText(attribute?.value),
        }))
      : [],
  }))
}

function normalizeDraftImages(images) {
  if (!Array.isArray(images)) {
    return []
  }

  const nextImages = images
    .map((image, index) => ({
      id: toText(image?.id) || createStorageDraftId('image', index),
      url: toText(image?.url),
      isMain: Boolean(image?.isMain || image?.is_main),
    }))
    .filter((image) => image.url)

  const mainIndex = nextImages.findIndex((image) => image.isMain)
  if (mainIndex > 0) {
    const [mainImage] = nextImages.splice(mainIndex, 1)
    nextImages.unshift(mainImage)
  }

  return nextImages.map((image, index) => ({
    ...image,
    isMain: index === 0,
  }))
}

function createStorageDraftId(prefix, index) {
  return `draft_${prefix}_${index}_${Math.random().toString(36).slice(2, 10)}`
}
