import { formatPrice, parsePriceValue, toText } from '../helpers'

const PERIODS = [
  { label: '7 дней', value: '7' },
  { label: '30 дней', value: '30' },
  { label: '90 дней', value: '90' },
]

export function AnalyticsPage({
  analytics,
  period,
  busyKeys,
  onPeriodPreset,
  onPeriodChange,
  onDownloadReport,
}) {
  const kpi = analytics.overview?.kpi || {}
  const trend = analytics.overview?.trend || []
  const niches = analytics.niches || []
  const products = analytics.products || []
  const highMargin = products.filter((product) => product.has_cost).sort((left, right) => right.margin_percent - left.margin_percent).slice(0, 5)
  const lowMargin = products.filter((product) => product.has_cost).sort((left, right) => left.margin_percent - right.margin_percent).slice(0, 5)
  const highDemand = niches.slice().sort((left, right) => right.market_demand_units - left.market_demand_units).slice(0, 5)
  const lowDemand = niches.slice().sort((left, right) => left.market_demand_units - right.market_demand_units).slice(0, 5)
  const maxTrendRevenue = Math.max(1, ...trend.map((point) => parsePriceValue(point.revenue)))
  const maxTrendDemand = Math.max(1, ...trend.map((point) => Number(point.demand_units) || 0))

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
              trend.map((point) => (
                <div className="trend-row" key={point.day}>
                  <span>{formatShortDate(point.day)}</span>
                  <div className="trend-bars">
                    <div className="trend-bar trend-bar-revenue" style={{ width: `${(parsePriceValue(point.revenue) / maxTrendRevenue) * 100}%` }} />
                    <div className="trend-bar trend-bar-profit" style={{ width: `${(Math.max(0, parsePriceValue(point.gross_profit)) / maxTrendRevenue) * 100}%` }} />
                  </div>
                  <strong>{formatPrice(point.revenue)}</strong>
                </div>
              ))
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
              trend.map((point) => (
                <div className="trend-row" key={point.day}>
                  <span>{formatShortDate(point.day)}</span>
                  <div className="trend-bars">
                    <div className="trend-bar trend-bar-demand" style={{ width: `${((Number(point.demand_units) || 0) / maxTrendDemand) * 100}%` }} />
                  </div>
                  <strong>{formatNumber(point.demand_units)}</strong>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

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
          columns={['Товар', 'Категория', 'Продано', 'Выручка', 'Себестоимость', 'Прибыль', 'Маржа', 'Остаток']}
          rows={products.map((product) => [
            product.product_name || `Товар ${product.product_id}`,
            product.category_name,
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

  return (
    <div className="analytics-table-wrap">
      <table className="analytics-table">
        <thead>
          <tr>
            {columns.map((column) => (
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

function formatShortDate(value) {
  const date = new Date(toText(value))
  if (Number.isNaN(date.getTime())) {
    return toText(value)
  }
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' }).format(date)
}
