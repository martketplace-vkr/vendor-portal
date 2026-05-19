import {
  formatPrice,
  getCategoryId,
  getProductId,
  getProductName,
  getProductPrice,
  getProductStatus,
  getProductStatusLabel,
  getStockCount,
} from '../helpers'
import { MetricCard } from '../ui'

export function InventoryPage({ stats, stockBuckets, categoryLabelById, watchProducts, onEditProduct }) {
  const maxBucketValue = Math.max(1, ...stockBuckets.map((item) => item.value))

  return (
    <div className="page-grid">
      <section className="metric-grid metric-grid-compact">
        <MetricCard label="Нормальный сток" value={stats.healthyStockCount} hint="позиции без риска" tone="accent" />
        <MetricCard label="Низкий остаток" value={stats.lowStockCount} hint="меньше или равно 5" tone="warning" />
        <MetricCard label="Нет в наличии" value={stats.outOfStockCount} hint="нужно пополнить" tone="danger" />
      </section>

      <section className="panel-card">
        <div className="panel-head">
          <div>
            <h2>Склад по статусам</h2>
          </div>
        </div>

        <div className="bar-stack">
          {stockBuckets.map((item) => (
            <div key={item.label} className="bar-row">
              <div className="bar-row__copy">
                <strong>{item.label}</strong>
                <span>{item.value}</span>
              </div>
              <div className="bar-row__track">
                <div className={`bar-row__fill tone-${item.tone}`} style={{ width: `${(item.value / maxBucketValue) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-head">
          <div>
            <h2>Товары, по которым нужно действие</h2>
          </div>
        </div>

        <div className="inventory-table">
          {watchProducts.length === 0 ? (
            <div className="empty-panel">
              <h3>Все спокойно</h3>
              <p>Сейчас нет товаров с проблемным остатком.</p>
            </div>
          ) : (
            watchProducts.map((product) => {
              const status = getProductStatus(product)

              return (
                <article key={getProductId(product)} className="inventory-row">
                  <div className="inventory-row__copy">
                    <strong>{getProductName(product)}</strong>
                    <span>{categoryLabelById[getCategoryId(product)] || `Категория ${getCategoryId(product) || '—'}`}</span>
                  </div>
                  <div className="inventory-row__meta">
                    <span className={`stock-pill stock-pill-${status}`}>{getProductStatusLabel(status)}</span>
                    <span>{formatPrice(getProductPrice(product))}</span>
                    <span>Остаток: {getStockCount(product) || '0'}</span>
                  </div>
                  <button className="button button-secondary" type="button" onClick={() => onEditProduct(product)}>
                    Исправить
                  </button>
                </article>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}
