import { useMemo, useState } from 'react'
import { formatDateTime, formatPrice, shortText, toText } from '../helpers'

const ORDER_STATUS_OPTIONS = [
  { value: 'created', label: 'Создан' },
  { value: 'assembly', label: 'В сборке' },
  { value: 'delivery_to_client', label: 'Передан курьеру' },
  { value: 'waiting_pick_up', label: 'Ждет получения' },
  { value: 'success', label: 'Получен' },
  { value: 'cancelled_by_seller', label: 'Отменен продавцом' },
]

const STATUS_FILTERS = [
  { value: 'all', label: 'Все' },
  { value: 'new', label: 'Новые' },
  { value: 'work', label: 'В работе' },
  { value: 'delivery', label: 'Доставка' },
  { value: 'done', label: 'Завершены' },
]

const STATUS_GROUPS = {
  new: new Set(['created']),
  work: new Set(['assembly']),
  delivery: new Set(['delivery_to_client', 'waiting_pick_up']),
  done: new Set(['success', 'cancelled_by_seller']),
}

const NEXT_STATUS_BY_STATUS = {
  created: ['assembly', 'cancelled_by_seller'],
  assembly: ['delivery_to_client', 'cancelled_by_seller'],
  delivery_to_client: ['success'],
  waiting_pick_up: ['success'],
}

const PAYMENT_STATUS_LABELS = {
  pending_funds: 'Ожидает средств',
  reserved: 'Средства зарезервированы',
  captured: 'Оплачено',
  released: 'Резерв снят',
  expired: 'Истекло время оплаты',
  cancelled: 'Отменено',
  failed: 'Ошибка оплаты',
}

export function OrdersPage({ orders, busyKeys, onReloadOrders, onUpdateOrderStatus }) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [draftStatuses, setDraftStatuses] = useState({})

  const orderStats = useMemo(() => buildOrderStats(orders), [orders])
  const visibleOrders = useMemo(
    () => filterOrders(orders, query, statusFilter),
    [orders, query, statusFilter],
  )

  function getDraftStatus(order) {
    const orderId = getOrderId(order)
    return draftStatuses[orderId] || getOrderStatus(order)
  }

  function setDraftStatus(order, status) {
    const orderId = getOrderId(order)
    setDraftStatuses((current) => ({ ...current, [orderId]: status }))
  }

  function updateStatus(order, status = getDraftStatus(order)) {
    setDraftStatus(order, status)
    void onUpdateOrderStatus(order, status)
  }

  return (
    <div className="page-grid orders-page">
      <section className="metric-grid metric-grid-compact">
        <article className="metric-card">
          <span className="metric-card__label">Всего заказов</span>
          <strong className="metric-card__value">{orders.length}</strong>
        </article>
        <article className="metric-card metric-card-warning">
          <span className="metric-card__label">В работе</span>
          <strong className="metric-card__value">{orderStats.inProgress}</strong>
        </article>
        <article className="metric-card metric-card-accent">
          <span className="metric-card__label">Выручка</span>
          <strong className="metric-card__value">{formatPrice(orderStats.revenue)}</strong>
        </article>
      </section>

      <section className="panel-card orders-board">
        <div className="panel-head orders-board__head">
          <div>
            <h2>Заказы продавца</h2>
            <p>Обрабатывайте новые покупки, переводите их в сборку и дальше по доставке.</p>
          </div>
          <button className="button button-secondary" type="button" onClick={onReloadOrders} disabled={busyKeys.orders}>
            {busyKeys.orders ? 'Обновляем...' : 'Обновить'}
          </button>
        </div>

        <div className="orders-toolbar">
          <label className="search-shell orders-search">
            <span>Поиск</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ID, checkout, товар или сумма"
            />
          </label>

          <div className="segmented-control orders-status-filter">
            {STATUS_FILTERS.map((item) => (
              <button
                key={item.value}
                className={statusFilter === item.value ? 'active' : ''}
                type="button"
                onClick={() => setStatusFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="orders-list">
          {visibleOrders.length === 0 ? (
            <div className="empty-panel empty-panel-large">
              <h3>Заказов нет</h3>
              <p>{orders.length === 0 ? 'Когда покупатели оформят товары этого вендора, они появятся здесь.' : 'Под выбранные фильтры ничего не попало.'}</p>
            </div>
          ) : (
            visibleOrders.map((order) => {
              const orderId = getOrderId(order)
              const status = getOrderStatus(order)
              const draftStatus = getDraftStatus(order)
              const isBusy = Boolean(busyKeys[`order-${orderId}`])
              const quickStatuses = getNextStatuses(status)

              return (
                <article key={orderId} className="vendor-order-card">
                  <div className="vendor-order-card__main">
                    <div className="vendor-order-card__media">
                      {getOrderImage(order) ? (
                        <img src={getOrderImage(order)} alt={getOrderProductName(order)} />
                      ) : (
                        <span>{getOrderProductName(order).slice(0, 1) || '#'}</span>
                      )}
                    </div>

                    <div className="vendor-order-card__copy">
                      <div className="vendor-order-card__topline">
                        <strong>Заказ #{orderId}</strong>
                        <span className={`order-status-pill order-status-${normalizeStatus(status)}`}>{getOrderStatusLabel(status)}</span>
                      </div>
                      <h3>{getOrderProductName(order) || 'Товар без названия'}</h3>
                      <p>{shortText(getOrderMeta(order), 150)}</p>
                      <div className="vendor-order-card__meta">
                        <span>Checkout: {getOrderCheckoutId(order) || 'без номера'}</span>
                        <span>Оплата: {getPaymentStatusLabel(getOrderPaymentStatus(order))}</span>
                        <span>Создан: {formatDateTime(getOrderCreatedAt(order))}</span>
                        <span>Обновлен: {formatDateTime(getOrderUpdatedAt(order))}</span>
                      </div>
                    </div>
                  </div>

                  <div className="vendor-order-card__summary">
                    <div>
                      <span>Кол-во</span>
                      <strong>{getOrderQuantity(order)}</strong>
                    </div>
                    <div>
                      <span>Сумма</span>
                      <strong>{formatPrice(getOrderTotal(order))}</strong>
                    </div>
                  </div>

                  <div className="vendor-order-card__actions">
                    <label className="field order-status-select">
                      <span className="field-label">Статус</span>
                      <select
                        className="field-control"
                        value={draftStatus}
                        onChange={(event) => setDraftStatus(order, event.target.value)}
                        disabled={isBusy}
                      >
                        {ORDER_STATUS_OPTIONS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      className="button button-primary"
                      type="button"
                      onClick={() => updateStatus(order)}
                      disabled={isBusy || draftStatus === status}
                    >
                      {isBusy ? 'Сохраняем...' : 'Сохранить'}
                    </button>

                    <div className="order-quick-actions">
                      {quickStatuses.map((nextStatus) => (
                        <button
                          key={nextStatus}
                          className="button button-secondary"
                          type="button"
                          onClick={() => updateStatus(order, nextStatus)}
                          disabled={isBusy}
                        >
                          {getOrderStatusLabel(nextStatus)}
                        </button>
                      ))}
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}

function filterOrders(orders, query, statusFilter) {
  const normalizedQuery = toText(query).trim().toLowerCase()
  const statusSet = STATUS_GROUPS[statusFilter]

  return [...orders]
    .filter((order) => {
      const status = normalizeStatus(getOrderStatus(order))
      if (statusSet && !statusSet.has(status)) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      return [
        getOrderId(order),
        getOrderCheckoutId(order),
        getOrderProductName(order),
        getOrderTotal(order),
        getOrderStatusLabel(status),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    })
    .sort((left, right) => new Date(getOrderCreatedAt(right)).getTime() - new Date(getOrderCreatedAt(left)).getTime())
}

function buildOrderStats(orders) {
  return orders.reduce(
    (accumulator, order) => {
      const status = normalizeStatus(getOrderStatus(order))
      if (STATUS_GROUPS.work.has(status) || STATUS_GROUPS.delivery.has(status)) {
        accumulator.inProgress += 1
      }
      accumulator.revenue += parseMoneyAmount(getOrderTotal(order))
      return accumulator
    },
    { inProgress: 0, revenue: 0 },
  )
}

function getNextStatuses(status) {
  return NEXT_STATUS_BY_STATUS[normalizeStatus(status)] || []
}

function getOrderId(order) {
  return toText(order?.id ?? order?.orderId ?? order?.order_id)
}

function getOrderCheckoutId(order) {
  return toText(order?.checkoutId ?? order?.checkout_id)
}

function getOrderStatus(order) {
  return normalizeStatus(order?.fulfillmentStatus ?? order?.fulfillment_status ?? order?.status)
}

function getOrderPaymentStatus(order) {
  return normalizeStatus(order?.paymentStatus ?? order?.payment_status)
}

function getOrderProduct(order) {
  return order?.product || {}
}

function getOrderProductName(order) {
  const product = getOrderProduct(order)
  return toText(product?.productName ?? product?.product_name ?? order?.productName ?? order?.product_name)
}

function getOrderImage(order) {
  const product = getOrderProduct(order)
  return toText(product?.imageUrl ?? product?.image_url ?? order?.productImageUrl ?? order?.product_image_url)
}

function getOrderQuantity(order) {
  return toText(order?.quantity || 1)
}

function getOrderUnitPrice(order) {
  return toText(order?.unitPrice ?? order?.unit_price)
}

function getOrderTotal(order) {
  return toText(order?.totalPrice ?? order?.total_price)
}

function getOrderCreatedAt(order) {
  return order?.createdAt ?? order?.created_at ?? ''
}

function getOrderUpdatedAt(order) {
  return order?.updatedAt ?? order?.updated_at ?? getOrderCreatedAt(order)
}

function getOrderMeta(order) {
  return `${getOrderQuantity(order)} шт. x ${formatPrice(getOrderUnitPrice(order))}`
}

function getOrderStatusLabel(status) {
  const labels = {
    created: 'Создан',
    assembly: 'В сборке',
    delivery_to_client: 'Передан курьеру',
    waiting_pick_up: 'Ждет получения',
    success: 'Получен',
    cancelled_by_seller: 'Отменен продавцом',
  }

  return labels[normalizeStatus(status)] || toText(status) || 'Неизвестно'
}

function getPaymentStatusLabel(status) {
  return PAYMENT_STATUS_LABELS[normalizeStatus(status)] || toText(status) || 'Неизвестно'
}

function normalizeStatus(status) {
  return toText(status).trim().toLowerCase().replace(/^[a-z_]+_status_/, '').replace(/[^a-z0-9_]+/g, '_')
}

function parseMoneyAmount(value) {
  const normalized = toText(value).replace(/\s+/g, '').replace(',', '.')
  const match = normalized.match(/-?\d+(?:\.\d+)?/)
  if (!match) {
    return 0
  }

  const parsed = Number.parseFloat(match[0])
  return Number.isFinite(parsed) ? parsed : 0
}
