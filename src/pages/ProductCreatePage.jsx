import { ProductEditor } from '../components/vendor/ProductEditor'

export function ProductCreatePage({
  categories,
  busyKeys,
  productForm,
  onProductFormChange,
  onProductImageUpload,
  onProductSubmit,
  onResetProductForm,
}) {
  return (
    <div className="page-grid">
      <ProductEditor
        categories={categories}
        form={productForm}
        busyKeys={busyKeys}
        mode="create"
        onChange={onProductFormChange}
        onImageUpload={onProductImageUpload}
        onSubmit={onProductSubmit}
        onCancel={onResetProductForm}
      />
    </div>
  )
}
