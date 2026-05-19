import { MetricCard } from '../ui'
import { formatDateTime, formatPrice, getProductId, getProductName, getStockCount } from '../helpers'

export function DashboardPage({
  stats,
  categoryInsights,
  recentProducts,
  lowStockProducts,
  onEditProduct,
}) {
  const maxCategoryValue = Math.max(1, ...categoryInsights.map((item) => item.count))

  return (
    <div className="page-grid">
      <section className="metric-grid">
        <MetricCard label="Товаров" value={stats.totalProducts} hint="активных позиций" />
        <MetricCard label="Остаток" value={stats.totalStock} hint="единиц на складе" tone="accent" />
        <MetricCard label="Стоимость витрины" value={formatPrice(stats.inventoryValue)} hint="цена x остаток" />
        <MetricCard label="Низкий остаток" value={stats.lowStockCount} hint="нужно проверить" tone="warning" />
        <MetricCard label="Нет в наличии" value={stats.outOfStockCount} hint="позиции без стока" tone="danger" />
      </section>

      <section className="panel-card">
        <div className="panel-head">
          <div>
            <h2>Где у вас сейчас основной каталог</h2>
          </div>
        </div>

        <div className="bar-stack">
          {categoryInsights.length === 0 ? (
            <div className="empty-panel">
              <h3>Категории появятся после загрузки товаров</h3>
              <p>Создайте карточку или дождитесь загрузки каталога вендора.</p>
            </div>
          ) : (
            categoryInsights.map((item) => (
              <div key={item.label} className="bar-row">
                <div className="bar-row__copy">
                  <strong>{item.label}</strong>
                  <span>{item.count} шт.</span>
                </div>
                <div className="bar-row__track">
                  <div className="bar-row__fill" style={{ width: `${(item.count / maxCategoryValue) * 100}%` }} />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="page-split">
        <section className="panel-card">
          <div className="panel-head">
            <div>
              <h2>Последние изменения по товарам</h2>
            </div>
          </div>

          <div className="lineup">
            {recentProducts.length === 0 ? (
              <div className="empty-panel">
                <h3>Еще нет изменений</h3>
                <p>После создания или редактирования товара этот блок начнет заполняться.</p>
              </div>
            ) : (
              recentProducts.map((product) => (
                <article key={getProductId(product)} className="lineup-item">
                  <div className="lineup-item__copy">
                    <strong>{getProductName(product) || 'Без названия'}</strong>
                    <span>{formatDateTime(product.updated_at || product.created_at)}</span>
                  </div>
                  <button className="button button-secondary" type="button" onClick={() => onEditProduct(product)}>
                    Открыть
                  </button>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="panel-card">
          <div className="panel-head">
            <div>
              <h2>Позиции, требующие внимания</h2>
            </div>
          </div>

          <div className="lineup">
            {lowStockProducts.length === 0 ? (
              <div className="empty-panel">
                <h3>Критичных позиций нет</h3>
                <p>Все товары держатся на комфортном уровне остатка.</p>
              </div>
            ) : (
              lowStockProducts.map((product) => (
                <article key={getProductId(product)} className="lineup-item">
                  <div className="lineup-item__copy">
                    <strong>{getProductName(product)}</strong>
                    <span>Остаток: {getStockCount(product) || '0'}</span>
                  </div>
                  <button className="button button-ghost" type="button" onClick={() => onEditProduct(product)}>
                    Поправить
                  </button>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
