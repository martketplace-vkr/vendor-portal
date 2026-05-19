import { ProductList } from '../components/vendor/ProductList'

export function ProductsPage({
  visibleProducts,
  productDraft,
  categoryLabelById,
  search,
  selectedProductId,
  onSearchChange,
  onCreateProduct,
  onEditProduct,
  onDuplicateProduct,
}) {
  return (
    <div className="page-grid">
      <ProductList
        products={visibleProducts}
        draft={productDraft}
        search={search}
        categoryLabelById={categoryLabelById}
        selectedProductId={selectedProductId}
        onSearchChange={onSearchChange}
        onCreate={onCreateProduct}
        onEdit={onEditProduct}
        onDuplicate={onDuplicateProduct}
      />
    </div>
  )
}
