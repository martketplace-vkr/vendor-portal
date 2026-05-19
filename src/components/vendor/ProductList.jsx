import {
  formatDateTime,
  formatPrice,
  getCategoryId,
  getProductId,
  getProductName,
  getProductPrice,
  getProductStatus,
  getProductStatusLabel,
  getProductUpdatedAt,
  getStockCount,
  resolveProductImage,
  shortText,
} from '../../helpers'

export function ProductList({
  products,
  draft,
  search,
  categoryLabelById,
  selectedProductId,
  onSearchChange,
  onCreate,
  onEdit,
  onDuplicate,
}) {
  return (
    <section className="panel-card panel-list">
      <div className="panel-head">
        <div>
          <h2>Товары вендора</h2>
        </div>
        <button className="button button-primary" type="button" onClick={onCreate}>
          Новый товар
        </button>
      </div>

      <label className="search-shell">
        <span>Поиск</span>
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Название, категория, цена"
        />
      </label>

      <div className="product-stack">
        {draft ? (
          <DraftProductCard draft={draft} categoryLabelById={categoryLabelById} onOpen={onCreate} />
        ) : null}

        {products.length === 0 && !draft ? (
          <div className="empty-panel">
            <h3>Пока нет товаров</h3>
            <p>Создайте первую карточку через кнопку сверху.</p>
          </div>
        ) : (
          products.map((product) => {
            const productId = getProductId(product)
            const status = getProductStatus(product)
            const imageUrl = resolveProductImage(product)

            return (
              <article
                key={productId}
                className={`vendor-product-card ${selectedProductId === productId ? 'active' : ''}`}
              >
                <div className="vendor-product-card__media">
                  {imageUrl ? <img src={imageUrl} alt={getProductName(product)} /> : <span>{getProductName(product).slice(0, 1) || '?'}</span>}
                </div>

                <div className="vendor-product-card__body">
                  <div className="vendor-product-card__topline">
                    <span className={`stock-pill stock-pill-${status}`}>{getProductStatusLabel(status)}</span>
                    <span className="vendor-product-card__date">{formatDateTime(getProductUpdatedAt(product))}</span>
                  </div>
                  <h3>{getProductName(product) || 'Без названия'}</h3>
                  <p>{shortText(product.description, 120) || 'Описание пока не добавлено.'}</p>
                  <div className="vendor-product-card__meta">
                    <span>{categoryLabelById[getCategoryId(product)] || `Категория ${getCategoryId(product) || '-'}`}</span>
                    <strong>{formatPrice(getProductPrice(product))}</strong>
                    <span>Остаток: {getStockCount(product) || '0'}</span>
                  </div>
                </div>

                <div className="vendor-product-card__actions">
                  <button className="button button-secondary vendor-product-card__action" type="button" onClick={() => onEdit(product)}>
                    Редактировать
                  </button>
                  <button className="button button-ghost vendor-product-card__action" type="button" onClick={() => onDuplicate(product)}>
                    Копировать
                  </button>
                </div>
              </article>
            )
          })
        )}
      </div>
    </section>
  )
}

function DraftProductCard({ draft, categoryLabelById, onOpen }) {
  const imageUrl = resolveProductImage(draft)
  const name = getProductName(draft) || 'Черновик нового товара'
  const categoryId = getCategoryId(draft)
  const categoryLabel = categoryLabelById[categoryId] || (categoryId ? `Категория ${categoryId}` : 'Категория не выбрана')

  return (
    <article className="vendor-product-card vendor-product-card-draft">
      <div className="vendor-product-card__media">
        {imageUrl ? <img src={imageUrl} alt={name} /> : <span>{name.slice(0, 1) || '?'}</span>}
      </div>

      <div className="vendor-product-card__body">
        <div className="vendor-product-card__topline">
          <span className="stock-pill stock-pill-draft">Черновик</span>
        </div>
        <h3>{name}</h3>
        <p>{shortText(draft.description, 120) || 'Карточка еще не опубликована. Продолжите заполнение, чтобы создать товар.'}</p>
        <div className="vendor-product-card__meta">
          <span>{categoryLabel}</span>
          <strong>{draft.price ? formatPrice(getProductPrice(draft)) : 'Цена не указана'}</strong>
          <span>Остаток: {getStockCount(draft) || 'не указан'}</span>
        </div>
      </div>

      <div className="vendor-product-card__actions">
        <button className="button button-primary vendor-product-card__action" type="button" onClick={onOpen}>
          Продолжить
        </button>
      </div>
    </article>
  )
}
