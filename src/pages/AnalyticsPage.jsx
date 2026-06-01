import { useState } from 'react'
import { formatPrice, parsePriceValue, toText } from '../helpers'

const PERIODS = [
  { label: '7 дней', value: '7' },
  { label: '30 дней', value: '30' },
  { label: '90 дней', value: '90' },
]

export function AnalyticsPage({
  analytics,
  orders = [],
  period,
  busyKeys,
  onPeriodPreset,
  onPeriodChange,
  onDownloadReport,
}) {
  const kpi = analytics.overview?.kpi || {}
  const trend = buildCompleteTrend(analytics.overview?.trend || [], period)
  const niches = analytics.niches || []
  const products = analytics.products || []
  const highMargin = products.filter((product) => product.has_cost).sort((left, right) => right.margin_percent - left.margin_percent).slice(0, 5)
  const lowMargin = products.filter((product) => product.has_cost).sort((left, right) => left.margin_percent - right.margin_percent).slice(0, 5)
  const highDemand = niches.slice().sort((left, right) => right.market_demand_units - left.market_demand_units).slice(0, 5)
  const lowDemand = niches.slice().sort((left, right) => left.market_demand_units - right.market_demand_units).slice(0, 5)
  const productTrends = analytics.overview?.product_trends ?? analytics.overview?.productTrends
  const productSalesSeries = buildProductSalesSeries(productTrends, trend, orders)
  const productViewsSeries = buildProductViewsSeries(productTrends)
  const revenueShare = buildProductRevenueShare(products)
  const productViewRows = buildProductViewRows(products)
  return (
    <div className="page-grid analytics-page">
      <section className="panel-card analytics-toolbar">
        <div>
          <h2>Аналитика продаж</h2>
          <p>Прибыльность, спрос и свободные ниши на маркетплейсе.</p>
        </div>

        <div className="analytics-toolbar__controls">
          <div className="segmented-control">
            {PERIODS.map((item) => (
              <button
                className={period.preset === item.value ? 'active' : ''}
                key={item.value}
                type="button"
                onClick={() => onPeriodPreset(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <label className="date-field">
            <span>С</span>
            <input type="date" value={period.from} onChange={(event) => onPeriodChange({ from: event.target.value, preset: 'custom' })} />
          </label>
          <label className="date-field">
            <span>По</span>
            <input type="date" value={period.to} onChange={(event) => onPeriodChange({ to: event.target.value, preset: 'custom' })} />
          </label>

          <button className="button button-secondary" type="button" disabled={busyKeys.analyticsReport} onClick={() => onDownloadReport('csv')}>
            CSV
          </button>
          <button className="button button-primary" type="button" disabled={busyKeys.analyticsReport} onClick={() => onDownloadReport('xlsx')}>
            XLSX
          </button>
        </div>
      </section>

      <section className="analytics-kpi-grid">
        <Metric label="Просмотры" value={formatNumber(kpi.product_views ?? kpi.productViews)} hint="открытия карточек" />
        <Metric label="Спрос" value={formatNumber(kpi.demand_units)} hint="неотмененные товары" />
        <Metric label="Продано" value={formatNumber(kpi.sold_units)} hint="успешные заказы" />
        <Metric label="Выручка" value={formatPrice(kpi.revenue)} hint="по успешным заказам" />
        <Metric label="Валовая прибыль" value={formatPrice(kpi.gross_profit)} hint="только товары с себестоимостью" tone="accent" />
        <Metric label="Маржа" value={formatPercent(kpi.margin_percent)} hint="по покрытой себестоимости" />
        <Metric label="Покрытие" value={formatPercent(kpi.cost_coverage_percent)} hint="продажи с себестоимостью" tone="warning" />
      </section>

      <div className="analytics-grid-two">
        <section className="panel-card">
          <div className="panel-head">
            <h2>Динамика выручки и прибыли</h2>
          </div>
          <div className="trend-chart">
            {trend.length === 0 ? (
              <EmptyAnalytics message="За период пока нет продаж." />
            ) : (
              <TrendAreaChart
                series={[
                  { key: 'revenue', label: 'Выручка', color: '#2563eb', value: (point) => parsePriceValue(point.revenue) },
                  { key: 'profit', label: 'Прибыль', color: '#22a06b', value: (point) => Math.max(0, parsePriceValue(point.gross_profit)) },
                ]}
                trend={trend}
                valueFormatter={formatCompactPrice}
              />
            )}
          </div>
        </section>

        <section className="panel-card">
          <div className="panel-head">
            <h2>Динамика спроса</h2>
          </div>
          <div className="trend-chart">
            {trend.length === 0 ? (
              <EmptyAnalytics message="Спрос появится после заказов." />
            ) : (
              <TrendAreaChart
                series={[
                  { key: 'demand', label: 'Спрос', color: '#f0a928', value: (point) => Number(point.demand_units) || 0 },
                ]}
                trend={trend}
                valueFormatter={formatNumber}
              />
            )}
          </div>
        </section>

        <section className="panel-card">
          <div className="panel-head">
            <h2>Динамика просмотров</h2>
          </div>
          <div className="trend-chart">
            {trend.length === 0 ? (
              <EmptyAnalytics message="Просмотры появятся после открытий карточек товаров." />
            ) : (
              <TrendAreaChart
                series={[
                  { key: 'views', label: 'Просмотры', color: '#06a6b7', value: (point) => Number(point.product_views ?? point.productViews) || 0 },
                ]}
                trend={trend}
                valueFormatter={formatNumber}
              />
            )}
          </div>
        </section>
      </div>

      <div className="analytics-product-chart-grid">
        <section className="panel-card analytics-sales-chart">
          <div className="panel-head">
            <h2>Продажи товаров</h2>
          </div>
          <div className="trend-chart">
            {trend.length === 0 || productSalesSeries.length === 0 ? (
              <EmptyAnalytics message="Продажи появятся после успешных заказов." />
            ) : (
              <TrendAreaChart
                series={productSalesSeries}
                trend={trend}
                valueFormatter={formatUnits}
                filterable
              />
            )}
          </div>
        </section>

        <section className="panel-card analytics-sales-chart">
          <div className="panel-head">
            <h2>Просмотры товаров</h2>
          </div>
          <div className="trend-chart">
            {trend.length === 0 || productViewsSeries.length === 0 ? (
              <EmptyAnalytics message="Просмотры товаров появятся после открытий карточек." />
            ) : (
              <TrendAreaChart
                series={productViewsSeries}
                trend={trend}
                valueFormatter={formatNumber}
                filterable
              />
            )}
          </div>
        </section>
      </div>

      <section className="panel-card">
        <div className="panel-head">
          <h2>Структура выручки по товарам</h2>
        </div>
        {revenueShare.length === 0 ? (
          <EmptyAnalytics message="Доли выручки появятся после продаж." />
        ) : (
          <DonutChart items={revenueShare} />
        )}
      </section>

      <section className="panel-card">
        <div className="panel-head">
          <h2>Просмотры по товарам</h2>
        </div>
        <AnalyticsTable
          empty="Просмотры по товарам появятся после открытий карточек."
          columns={['Товар', 'Просмотры', 'Доля просмотров', 'Продано', 'Конверсия']}
          rows={productViewRows}
        />
      </section>

      <section className="panel-card">
        <div className="panel-head">
          <h2>Ниши с высоким спросом и низким предложением</h2>
        </div>
        <AnalyticsTable
          empty="Ниши появятся после заказов и товаров в каталоге."
          columns={['Ниша', 'Спрос', 'Предложение', 'Остаток', 'Score', 'Ваша выручка', 'Ваша маржа']}
          rows={niches.slice(0, 8).map((niche) => [
            niche.category_name,
            formatNumber(niche.market_demand_units),
            formatNumber(niche.active_products),
            formatNumber(niche.stock_count),
            formatNumber(niche.opportunity_score),
            formatPrice(niche.vendor_revenue),
            formatPercent(niche.vendor_margin_percent),
          ])}
        />
      </section>

      <div className="analytics-grid-two">
        <PanelTable title="Высокая маржинальность" rows={highMargin.map(productRow)} />
        <PanelTable title="Низкая маржинальность" rows={lowMargin.map(productRow)} />
        <PanelTable title="Большой спрос" rows={highDemand.map(nicheDemandRow)} />
        <PanelTable title="Малый спрос" rows={lowDemand.map(nicheDemandRow)} />
      </div>

      <section className="panel-card">
        <div className="panel-head">
          <h2>Прибыльность товаров</h2>
        </div>
        <AnalyticsTable
          empty="Добавьте себестоимость в карточках товаров, чтобы видеть прибыль и маржу."
          columns={['Товар', 'Категория', 'Просмотры', 'Продано', 'Выручка', 'Себестоимость', 'Прибыль', 'Маржа', 'Остаток']}
          rows={products.map((product) => [
            product.product_name || `Товар ${product.product_id}`,
            product.category_name,
            formatNumber(product.views_count ?? product.viewsCount),
            formatNumber(product.sold_units),
            formatPrice(product.revenue),
            product.has_cost ? formatPrice(product.cost_price) : 'Не указана',
            formatPrice(product.gross_profit),
            product.has_cost ? formatPercent(product.margin_percent) : '—',
            formatNumber(product.stock_count),
          ])}
        />
      </section>
    </div>
  )
}

function Metric({ label, value, tone = 'default' }) {
  return (
    <article className={`metric-card metric-card-${tone}`}>
      <span className="metric-card__label">{label}</span>
      <strong className="metric-card__value">{value}</strong>
    </article>
  )
}

function PanelTable({ title, rows }) {
  return (
    <section className="panel-card">
      <div className="panel-head">
        <h2>{title}</h2>
      </div>
      <AnalyticsTable empty="Недостаточно данных." columns={['Название', 'Показатель', 'Выручка']} rows={rows} />
    </section>
  )
}

function AnalyticsTable({ columns, rows, empty }) {
  if (rows.length === 0) {
    return <EmptyAnalytics message={empty} />
  }

  const resolvedColumns = rows[0]?.length === columns.length + 1 ? [...columns.slice(0, 2), 'Просмотры', ...columns.slice(2)] : columns

  return (
    <div className="analytics-table-wrap">
      <table className="analytics-table">
        <thead>
          <tr>
            {resolvedColumns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${row[0]}-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td key={`${cell}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EmptyAnalytics({ message }) {
  return <div className="empty-panel analytics-empty">{message}</div>
}

function TrendAreaChart({ trend, series, valueFormatter, filterable = false, legendValue = 'total' }) {
  const [activeIndex, setActiveIndex] = useState(null)
  const [selectedSeriesKey, setSelectedSeriesKey] = useState('')
  const width = 640
  const height = 250
  const padding = { top: 18, right: 18, bottom: 34, left: 62 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const visibleSeries = selectedSeriesKey ? series.filter((item) => item.key === selectedSeriesKey) : series
  const values = visibleSeries.flatMap((item) => trend.map((point) => item.value(point)))
  const maxValue = Math.max(1, ...values)
  const tickValues = Array.from({ length: 4 }, (_, index) => (maxValue * (3 - index)) / 3)
  const labelIndexes = getChartLabelIndexes(trend.length)
  const x = (index) => padding.left + (trend.length === 1 ? plotWidth / 2 : (index / (trend.length - 1)) * plotWidth)
  const y = (value) => padding.top + plotHeight - (value / maxValue) * plotHeight
  const activePoint = activeIndex === null ? null : trend[activeIndex]

  function handlePointerMove(event) {
    const bounds = event.currentTarget.getBoundingClientRect()
    const pointerX = ((event.clientX - bounds.left) / bounds.width) * width
    const relativeX = Math.max(0, Math.min(plotWidth, pointerX - padding.left))
    const index = trend.length === 1 ? 0 : Math.round((relativeX / plotWidth) * (trend.length - 1))
    setActiveIndex(index)
  }

  return (
    <div className="area-chart">
      <div className="area-chart__legend">
        {series.map((item) => (
          <button
            className={`${filterable ? 'is-clickable' : ''} ${selectedSeriesKey === item.key ? 'active' : ''} ${selectedSeriesKey && selectedSeriesKey !== item.key ? 'muted' : ''}`}
            disabled={!filterable}
            key={item.key}
            type="button"
            onClick={() => setSelectedSeriesKey((current) => (current === item.key ? '' : item.key))}
          >
            <i style={{ background: item.color }} />
            {item.label}
            <strong>{valueFormatter(getLegendValue(item, trend, legendValue))}</strong>
          </button>
        ))}
      </div>
      <svg
        className="area-chart__svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={series.map((item) => item.label).join(' и ')}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setActiveIndex(null)}
      >
        <defs>
          {visibleSeries.map((item) => (
            <linearGradient id={`chart-gradient-${item.key}`} key={item.key} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={item.color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={item.color} stopOpacity="0.02" />
            </linearGradient>
          ))}
        </defs>
        {tickValues.map((value) => (
          <g key={value}>
            <line className="area-chart__grid-line" x1={padding.left} x2={width - padding.right} y1={y(value)} y2={y(value)} />
            <text className="area-chart__axis-label" x={padding.left - 10} y={y(value) + 4} textAnchor="end">{valueFormatter(value)}</text>
          </g>
        ))}
        {visibleSeries.map((item) => {
          const points = trend.map((point, index) => [x(index), y(item.value(point))])
          const line = points.map(([pointX, pointY]) => `${pointX},${pointY}`).join(' ')
          const area = `${points[0][0]},${padding.top + plotHeight} ${line} ${points[points.length - 1][0]},${padding.top + plotHeight}`

          return (
            <g key={item.key}>
              {item.showArea !== false && <polygon fill={`url(#chart-gradient-${item.key})`} points={area} />}
              <polyline className="area-chart__line" points={line} style={{ stroke: item.color }} />
              {points.map(([pointX, pointY], index) => (
                <circle className={`area-chart__point ${activeIndex === index ? 'active' : ''}`} cx={pointX} cy={pointY} fill={item.color} key={`${item.key}-${trend[index].day}`} r={activeIndex === index ? 6 : 4} />
              ))}
            </g>
          )
        })}
        {activePoint && (
          <line className="area-chart__hover-line" x1={x(activeIndex)} x2={x(activeIndex)} y1={padding.top} y2={padding.top + plotHeight} />
        )}
        {labelIndexes.map((index) => (
          <text className="area-chart__axis-label" key={trend[index].day} x={x(index)} y={height - 8} textAnchor="middle">
            {formatShortDate(trend[index].day)}
          </text>
        ))}
        <rect className="area-chart__hit-area" x={padding.left} y={padding.top} width={plotWidth} height={plotHeight} />
      </svg>
      {activePoint && (
        <div
          className={`area-chart__tooltip ${getTooltipAlignment(activeIndex, trend.length)}`}
          style={{ left: `${(x(activeIndex) / width) * 100}%` }}
        >
          <strong>{formatFullDate(activePoint.day)}</strong>
          {visibleSeries.map((item) => (
            <span key={item.key}>
              <i style={{ background: item.color }} />
              <em>{item.label}</em>
              <b>{valueFormatter(item.value(activePoint))}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function DonutChart({ items }) {
  const size = 260
  const center = size / 2
  const radius = 96
  const strokeWidth = 38
  const circumference = 2 * Math.PI * radius
  const slices = items.reduce((accumulator, item) => {
    const dash = (item.percent / 100) * circumference
    const offset = accumulator.offset + dash
    return {
      offset,
      items: [...accumulator.items, { ...item, dash, offset: accumulator.offset }],
    }
  }, { offset: 0, items: [] }).items

  return (
    <div className="donut-chart">
      <svg className="donut-chart__svg" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Структура выручки по товарам">
        <circle className="donut-chart__track" cx={center} cy={center} r={radius} strokeWidth={strokeWidth} />
        {slices.map((item) => (
          <circle
            className="donut-chart__slice"
            cx={center}
            cy={center}
            key={item.key}
            r={radius}
            stroke={item.color}
            strokeDasharray={`${item.dash} ${circumference - item.dash}`}
            strokeDashoffset={-item.offset}
            strokeWidth={strokeWidth}
          />
        ))}
        <text className="donut-chart__total-label" x={center} y={center - 6} textAnchor="middle">Выручка</text>
        <text className="donut-chart__total-value" x={center} y={center + 20} textAnchor="middle">{formatCompactPrice(items.reduce((sum, item) => sum + item.value, 0))}</text>
      </svg>
      <div className="donut-chart__legend">
        {items.map((item) => (
          <div className="donut-chart__legend-row" key={item.key}>
            <i style={{ background: item.color }} />
            <span>{item.label}</span>
            <strong>{formatNumber(item.percent)}%</strong>
            <b>{formatPrice(item.value)}</b>
          </div>
        ))}
      </div>
    </div>
  )
}

function getLegendValue(item, trend, mode) {
  if (mode === 'last') {
    return item.value(trend[trend.length - 1])
  }
  return trend.reduce((sum, point) => sum + item.value(point), 0)
}

function getChartLabelIndexes(length) {
  if (length <= 4) {
    return Array.from({ length }, (_, index) => index)
  }

  return [...new Set([0, Math.round((length - 1) / 3), Math.round(((length - 1) * 2) / 3), length - 1])]
}

function getTooltipAlignment(index, length) {
  if (index === 0) {
    return 'align-left'
  }
  if (index === length - 1) {
    return 'align-right'
  }
  return ''
}

function buildCompleteTrend(sourceTrend, period) {
  const days = enumerateDays(period?.from, period?.to)
  if (days.length === 0) {
    return sourceTrend
  }

  const pointsByDay = new Map(sourceTrend.map((point) => [toText(point.day), point]))

  return days.map((day) => ({
    day,
    demand_units: 0,
    sold_units: 0,
    revenue: '0',
    gross_profit: '0',
    marketplace_fee: '0',
    net_profit: '0',
    ...(pointsByDay.get(day) || {}),
  }))
}

function enumerateDays(from, to) {
  const fromDate = parseInputDate(from)
  const toDate = parseInputDate(to)
  if (!fromDate || !toDate || fromDate > toDate) {
    return []
  }

  const days = []
  const current = new Date(fromDate)
  while (current <= toDate) {
    days.push(formatISODate(current))
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return days
}

function parseInputDate(value) {
  const match = toText(value).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    return null
  }
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
}

function formatISODate(date) {
  return date.toISOString().slice(0, 10)
}

function buildProductSalesSeries(productTrends, trend, orders) {
  const colors = ['#8b5cf6', '#2563eb', '#22a06b', '#f0a928', '#e85d75', '#06a6b7', '#f97316', '#64748b']
  const normalizedTrends = Array.isArray(productTrends) && productTrends.length > 0
    ? productTrends
    : buildProductTrendsFromOrders(trend, orders)

  if (normalizedTrends.length === 0) {
    return []
  }

  return normalizedTrends.map((product, index) => {
    const valuesByDay = new Map((product.points || []).map((point) => [point.day, Number(point.sold_units ?? point.soldUnits) || 0]))
    const productId = product.product_id ?? product.productId

    return {
      key: `product-${productId}`,
      label: product.product_name ?? product.productName ?? `Товар ${productId}`,
      color: colors[index % colors.length],
      showArea: false,
      value: (point) => valuesByDay.get(point.day) || 0,
    }
  })
}

function buildProductViewsSeries(productTrends) {
  const colors = ['#06a6b7', '#8b5cf6', '#2563eb', '#22a06b', '#f0a928', '#e85d75', '#f97316', '#64748b']
  if (!Array.isArray(productTrends) || productTrends.length === 0) {
    return []
  }

  return productTrends
    .map((product, index) => {
      const valuesByDay = new Map((product.points || []).map((point) => [point.day, Number(point.views_count ?? point.viewsCount) || 0]))
      const total = [...valuesByDay.values()].reduce((sum, value) => sum + value, 0)
      const productId = product.product_id ?? product.productId

      return {
        key: `product-views-${productId}`,
        label: product.product_name ?? product.productName ?? `Товар ${productId}`,
        color: colors[index % colors.length],
        showArea: false,
        total,
        value: (point) => valuesByDay.get(point.day) || 0,
      }
    })
    .filter((item) => item.total > 0)
}

function buildProductViewRows(products) {
  const rows = products
    .map((product) => ({
      name: product.product_name ?? product.productName ?? `Товар ${product.product_id ?? product.productId}`,
      views: Number(product.views_count ?? product.viewsCount) || 0,
      soldUnits: Number(product.sold_units ?? product.soldUnits) || 0,
    }))
    .filter((product) => product.views > 0)
    .sort((left, right) => right.views - left.views)

  const totalViews = rows.reduce((sum, product) => sum + product.views, 0)

  return rows.map((product) => [
    product.name,
    formatNumber(product.views),
    formatPercent((product.views / totalViews) * 100),
    formatNumber(product.soldUnits),
    formatPercent((product.soldUnits / product.views) * 100),
  ])
}

function buildProductRevenueShare(products) {
  const colors = ['#2563eb', '#22a06b', '#f0a928', '#8b5cf6', '#e85d75', '#06a6b7']
  const rows = products
    .map((product) => ({
      key: `revenue-${product.product_id ?? product.productId}`,
      label: product.product_name ?? product.productName ?? `Товар ${product.product_id ?? product.productId}`,
      value: parsePriceValue(product.revenue),
    }))
    .filter((item) => item.value > 0)
    .sort((left, right) => right.value - left.value)

  if (rows.length === 0) {
    return []
  }

  const topRows = rows.slice(0, 5)
  const otherValue = rows.slice(5).reduce((sum, item) => sum + item.value, 0)
  const items = otherValue > 0 ? [...topRows, { key: 'revenue-other', label: 'Остальные товары', value: otherValue }] : topRows
  const total = items.reduce((sum, item) => sum + item.value, 0)

  return items.map((item, index) => ({
    ...item,
    color: colors[index % colors.length],
    percent: total > 0 ? (item.value / total) * 100 : 0,
  }))
}

function buildProductTrendsFromOrders(trend, orders) {
  if (!Array.isArray(orders) || orders.length === 0) {
    return []
  }

  const trendDays = new Set(trend.map((point) => point.day))
  const productMap = new Map()

  for (const order of orders) {
    if (normalizeOrderStatus(order?.fulfillmentStatus ?? order?.fulfillment_status ?? order?.status) !== 'success') {
      continue
    }

    const day = getOrderDay(order)
    if (!trendDays.has(day)) {
      continue
    }

    const product = order?.product || {}
    const productId = toText(product.product_id ?? product.productId ?? order.product_id ?? order.productId)
    if (!productId) {
      continue
    }

    const productName = toText(product.product_name ?? product.productName ?? order.product_name ?? order.productName) || `Товар ${productId}`
    const quantity = Number(order.quantity) || 1

    if (!productMap.has(productId)) {
      productMap.set(productId, {
        product_id: productId,
        product_name: productName,
        pointsByDay: new Map(),
      })
    }

    const item = productMap.get(productId)
    item.pointsByDay.set(day, (item.pointsByDay.get(day) || 0) + quantity)
  }

  return [...productMap.values()].map((product) => ({
    product_id: product.product_id,
    product_name: product.product_name,
    points: trend.map((point) => ({
      day: point.day,
      sold_units: product.pointsByDay.get(point.day) || 0,
    })),
  }))
}

function getOrderDay(order) {
  const date = new Date(toText(order?.createdAt ?? order?.created_at))
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toISOString().slice(0, 10)
}

function normalizeOrderStatus(status) {
  return toText(status).trim().toLowerCase().replace(/^[a-z_]+_status_/, '').replace(/[^a-z0-9_]+/g, '_')
}

function productRow(product) {
  return [
    product.product_name || `Товар ${product.product_id}`,
    formatPercent(product.margin_percent),
    formatPrice(product.revenue),
  ]
}

function nicheDemandRow(niche) {
  return [
    niche.category_name,
    `${formatNumber(niche.market_demand_units)} шт.`,
    formatPrice(niche.market_revenue),
  ]
}

function formatNumber(value) {
  const number = Number(value) || 0
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(number)
}

function formatPercent(value) {
  return `${formatNumber(value)}%`
}

function formatUnits(value) {
  return `${formatNumber(value)} шт.`
}

function formatCompactPrice(value) {
  const number = Number(value) || 0
  if (number >= 1000000) {
    return `${formatNumber(number / 1000000)} млн ₽`
  }
  if (number >= 1000) {
    return `${formatNumber(number / 1000)} тыс. ₽`
  }
  return `${formatNumber(number)} ₽`
}

function formatShortDate(value) {
  const date = new Date(toText(value))
  if (Number.isNaN(date.getTime())) {
    return toText(value)
  }
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' }).format(date)
}

function formatFullDate(value) {
  const date = new Date(toText(value))
  if (Number.isNaN(date.getTime())) {
    return toText(value)
  }
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }).format(date)
}
