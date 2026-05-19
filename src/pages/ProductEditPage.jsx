import { ProductEditor } from '../components/vendor/ProductEditor'

export function ProductEditPage({
  categories,
  busyKeys,
  productForm,
  isReady,
  onGoProducts,
  onProductFormChange,
  onProductImageUpload,
  onProductSubmit,
}) {
  if (!isReady) {
    return (
      <div className="page-grid">
        <section className="panel-card">
          <div className="empty-panel">
            <h3>Загружаем товар</h3>
            <p>Форма редактирования откроется после загрузки каталога продавца.</p>
            <button className="button button-secondary" type="button" onClick={onGoProducts}>
              К списку товаров
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page-grid">
      <ProductEditor
        categories={categories}
        form={productForm}
        busyKeys={busyKeys}
        mode="edit"
        cancelLabel="К списку товаров"
        onChange={onProductFormChange}
        onImageUpload={onProductImageUpload}
        onSubmit={onProductSubmit}
        onCancel={onGoProducts}
      />
    </div>
  )
}
