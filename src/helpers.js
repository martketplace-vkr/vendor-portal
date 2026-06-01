export const emptyProfile = {
  id: '',
  email: '',
  firstName: '',
  lastName: '',
  avatarUrl: '',
}

export const emptyProductForm = {
  productId: '',
  categoryId: '',
  name: '',
  description: '',
  price: '',
  acceptsCrypto: false,
  cryptoPricingMode: 'disabled',
  cryptoPriceUsdt: '',
  costPrice: '',
  stockCount: '',
  attributes: [],
  images: [],
}

const rubFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
})

export function toText(value) {
  if (typeof value === 'string') {
    return value
  }

  if (value === null || value === undefined) {
    return ''
  }

  return String(value)
}

export function normalizeProfile(profile) {
  return {
    id: toText(profile?.id),
    email: toText(profile?.email),
    firstName: toText(profile?.firstName ?? profile?.first_name),
    lastName: toText(profile?.lastName ?? profile?.last_name),
    avatarUrl: toText(profile?.avatarUrl ?? profile?.avatar_url),
  }
}

export function flattenCategories(categories, depth = 0) {
  return (categories || []).flatMap((category) => {
    const option = {
      value: toText(category?.id),
      label: `${'  '.repeat(depth)}${toText(category?.name)}`,
    }

    return [option, ...flattenCategories(category?.children, depth + 1)]
  })
}

export function getProductId(product) {
  return toText(product?.id ?? product?.productId ?? product?.product_id)
}

export function getVendorId(product) {
  return toText(product?.vendorId ?? product?.vendor_id)
}

export function getCategoryId(product) {
  return toText(product?.categoryId ?? product?.category_id)
}

export function getProductName(product) {
  return toText(product?.name ?? product?.productName ?? product?.product_name)
}

export function getProductDescription(product) {
  return toText(product?.description ?? product?.productDescription ?? product?.product_description)
}

export function getProductPrice(product) {
  return toText(product?.price ?? product?.unitPrice ?? product?.unit_price)
}

export function getStockCount(product) {
  return toText(product?.stockCount ?? product?.stock_count)
}

export function getProductImages(product) {
  if (Array.isArray(product?.images)) {
    return product.images
  }

  const imageUrl = toText(product?.imageUrl ?? product?.image_url ?? product?.productImageUrl ?? product?.product_image_url)
  return imageUrl ? [{ url: imageUrl, is_main: true }] : []
}

export function getProductAttributes(product) {
  return Array.isArray(product?.attributes) ? product.attributes : []
}

export function getProductUpdatedAt(product) {
  return toText(product?.updatedAt ?? product?.updated_at ?? product?.createdAt ?? product?.created_at)
}

export function formatPrice(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return rubFormatter.format(value)
  }

  const parsed = parsePriceValue(value)
  if (parsed > 0) {
    return rubFormatter.format(parsed)
  }

  const normalized = toText(value).trim()
  return normalized || 'Цена не указана'
}

export function formatUSDTPrice(value) {
  const parsed = parsePriceValue(value)
  if (parsed > 0 || parsed === 0) {
    return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 8 }).format(parsed)} USDT`
  }

  const normalized = toText(value).trim()
  return normalized || 'Цена не указана'
}

export function parsePriceValue(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  const normalized = toText(value).replace(/\s+/g, '').replace(',', '.')
  const match = normalized.match(/-?\d+(?:\.\d+)?/)

  if (!match) {
    return 0
  }

  const parsed = Number.parseFloat(match[0])
  return Number.isFinite(parsed) ? parsed : 0
}

export function resolveProductImage(product) {
  const images = getProductImages(product)
  const preferred = images.find((image) => image?.isMain || image?.is_main) || images[0]
  return toText(preferred?.url)
}

export function productMatchesQuery(product, query, categoryLabelById = {}) {
  const normalized = toText(query).trim().toLowerCase()
  if (!normalized) {
    return true
  }

  return [
    getProductName(product),
    getProductDescription(product),
    getProductPrice(product),
    getCategoryId(product),
    toText(categoryLabelById[getCategoryId(product)]),
  ]
    .map((value) => value.toLowerCase())
    .some((value) => value.includes(normalized))
}

export function formatDateTime(value) {
  const date = parseDate(value)
  if (!date) {
    return 'Нет даты'
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function shortText(value, max = 120) {
  const normalized = toText(value).trim()
  if (normalized.length <= max) {
    return normalized
  }

  return `${normalized.slice(0, Math.max(0, max - 1)).trimEnd()}...`
}

export function getProductStatus(product) {
  const stockCount = Number.parseInt(getStockCount(product), 10)

  if (!Number.isInteger(stockCount) || stockCount <= 0) {
    return 'out'
  }

  if (stockCount <= 5) {
    return 'low'
  }

  return 'ok'
}

export function getProductStatusLabel(status) {
  if (status === 'out') {
    return 'Нет в наличии'
  }

  if (status === 'low') {
    return 'Низкий остаток'
  }

  return 'Стабильный остаток'
}

export function buildProductPayload(form, options = {}) {
  const { vendorId = '', includeVendorId = false } = options
  const normalizedVendorId = toText(vendorId).trim()
  const normalizedName = toText(form.name).trim()
  const normalizedPrice = normalizePrice(form.price)

  if (includeVendorId && !normalizedVendorId) {
    throw new Error('Не удалось определить vendor_id. Проверьте профиль вендора.')
  }

  if (!normalizedName) {
    throw new Error('Укажите название товара.')
  }

  if (!normalizedPrice) {
    throw new Error('Укажите корректную цену товара.')
  }

  const payload = {
    category_id: parsePositiveInteger(form.categoryId, 'Category ID'),
    name: normalizedName,
    description: toText(form.description).trim(),
    price: normalizedPrice,
    accepts_crypto: Boolean(form.acceptsCrypto),
    crypto_pricing_mode: form.acceptsCrypto ? toText(form.cryptoPricingMode).trim() : 'disabled',
    crypto_price_usdt: form.acceptsCrypto && form.cryptoPricingMode === 'fixed_usdt' ? normalizeUSDTPrice(form.cryptoPriceUsdt) : '',
    stock_count: parseNonNegativeInteger(form.stockCount, 'Stock count'),
    attributes: buildAttributeSectionsPayload(form.attributes),
    images: parseProductImages(form.images),
  }

  if (payload.accepts_crypto && payload.crypto_pricing_mode === 'fixed_usdt' && !payload.crypto_price_usdt) {
    throw new Error('Укажите фиксированную цену в USDT.')
  }

  if (includeVendorId) {
    payload.vendor_id = normalizedVendorId
  }

  return payload
}

export function populateProductForm(product) {
  return {
    productId: getProductId(product),
    categoryId: getCategoryId(product),
    name: getProductName(product),
    description: getProductDescription(product),
    price: getProductPrice(product),
    acceptsCrypto: Boolean(product?.acceptsCrypto ?? product?.accepts_crypto),
    cryptoPricingMode: toText(product?.cryptoPricingMode ?? product?.crypto_pricing_mode) || 'disabled',
    cryptoPriceUsdt: toText(product?.cryptoPriceUsdt ?? product?.crypto_price_usdt),
    costPrice: toText(product?.costPrice ?? product?.cost_price),
    stockCount: getStockCount(product),
    attributes: normalizeProductAttributes(product),
    images: normalizeProductImages(getProductImages(product)),
  }
}

export function createProductAttributeDraft(attribute = {}) {
  return {
    id: createDraftId(),
    key: toText(attribute?.key ?? attribute?.name),
    value: toText(attribute?.value),
  }
}

export function createCharacteristicSectionDraft(section = {}) {
  const nextAttributes = Array.isArray(section?.attributes)
    ? section.attributes.map((attribute) => createProductAttributeDraft(attribute))
    : []

  return {
    id: createDraftId(),
    title: toText(section?.title),
    attributes: nextAttributes,
  }
}

export function createProductImageDraft(image = {}) {
  return {
    id: createDraftId(),
    url: toText(image?.url),
    isMain: Boolean(image?.isMain || image?.is_main),
  }
}

function parsePositiveInteger(raw, label) {
  const value = Number.parseInt(toText(raw), 10)
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(getNumericFieldError(label, 'positive'))
  }

  return value
}

function parseNonNegativeInteger(raw, label) {
  const value = Number.parseInt(toText(raw), 10)
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(getNumericFieldError(label, 'nonNegative'))
  }

  return value
}

function buildAttributeSectionsPayload(sections) {
  if (!Array.isArray(sections)) {
    return []
  }

  return sections.reduce((accumulator, section, sectionIndex) => {
    const title = toText(section?.title).trim()
    const attributes = Array.isArray(section?.attributes) ? section.attributes : []
    const parsedAttributes = []

    for (let index = 0; index < attributes.length; index += 1) {
      const attribute = attributes[index]
      const key = toText(attribute?.key ?? attribute?.name).trim()
      const value = toText(attribute?.value).trim()

      if (!key && !value) {
        continue
      }

      if (!key || !value) {
        throw new Error(`Заполните атрибут ${index + 1} в разделе ${sectionIndex + 1} полностью: и ключ, и значение.`)
      }

      parsedAttributes.push({ key, value })
    }

    if (!title && parsedAttributes.length === 0) {
      return accumulator
    }

    if (!title) {
      throw new Error(`Укажите название раздела ${sectionIndex + 1}.`)
    }

    accumulator.push({
      title,
      attributes: parsedAttributes,
    })
    return accumulator
  }, [])
}

function parseProductImages(images) {
  if (!Array.isArray(images)) {
    return []
  }

  const parsed = images.reduce((accumulator, image) => {
    const url = toText(image?.url).trim()

    if (!url) {
      return accumulator
    }

    accumulator.push({
      url,
      is_main: false,
    })

    return accumulator
  }, [])

  if (parsed.length > 0) {
    parsed[0].is_main = true
  }

  return parsed
}

function normalizeProductAttributes(product) {
  const sections = getProductAttributes(product)
  return Array.isArray(sections) ? sections.map((section) => createCharacteristicSectionDraft(section)) : []
}

function normalizeProductImages(images) {
  const nextImages = Array.isArray(images) ? images.map((image) => createProductImageDraft(image)) : []
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

function normalizePrice(value) {
  const raw = toText(value).trim()
  if (!raw) {
    return ''
  }

  const normalized = raw.replace(/\s+/g, '').replace(',', '.')
  const parsed = Number.parseFloat(normalized)

  if (Number.isFinite(parsed) && parsed >= 0) {
    return formatDecimal(parsed)
  }

  return ''
}

function normalizeUSDTPrice(value) {
  const raw = toText(value).trim()
  if (!raw) {
    return ''
  }

  const normalized = raw.replace(/\s+/g, '').replace(',', '.')
  const parsed = Number.parseFloat(normalized)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('Укажите корректную цену в USDT.')
  }

  return parsed.toFixed(8).replace(/\.?0+$/, '')
}

function formatDecimal(value) {
  const normalized = value.toFixed(2).replace(/\.?0+$/, '')
  return normalized === '-0' ? '0' : normalized
}

function getNumericFieldError(label, mode) {
  if (label === 'Category ID') {
    return 'Выберите категорию товара.'
  }

  if (label === 'Stock count') {
    return mode === 'nonNegative' ? 'Укажите остаток товара: 0 или больше.' : 'Укажите корректный остаток.'
  }

  return 'Проверьте числовое поле.'
}

function parseDate(value) {
  const normalized = toText(value).trim()
  if (!normalized) {
    return null
  }

  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

function createDraftId() {
  return `draft_${Math.random().toString(36).slice(2, 10)}`
}
