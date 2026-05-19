import { useState } from 'react'
import { Field, FileUploadField } from '../../ui'
import { createCharacteristicSectionDraft, createProductAttributeDraft } from '../../helpers'

export function ProductEditor({
  categories,
  form,
  busyKeys,
  mode,
  cancelLabel = 'Сбросить форму',
  onChange,
  onSubmit,
  onCancel,
  onImageUpload,
}) {
  const [draggedImageId, setDraggedImageId] = useState('')

  function updateSection(sectionId, field, value) {
    onChange((current) => ({
      ...current,
      attributes: current.attributes.map((section) => (section.id === sectionId ? { ...section, [field]: value } : section)),
    }))
  }

  function addSection() {
    onChange((current) => ({
      ...current,
      attributes: [...current.attributes, createCharacteristicSectionDraft()],
    }))
  }

  function removeSection(sectionId) {
    onChange((current) => ({
      ...current,
      attributes: current.attributes.filter((section) => section.id !== sectionId),
    }))
  }

  function updateAttribute(sectionId, attributeId, field, value) {
    onChange((current) => ({
      ...current,
      attributes: current.attributes.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              attributes: section.attributes.map((attribute) =>
                attribute.id === attributeId ? { ...attribute, [field]: value } : attribute,
              ),
            }
          : section,
      ),
    }))
  }

  function addAttribute(sectionId) {
    onChange((current) => ({
      ...current,
      attributes: current.attributes.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              attributes: [...section.attributes, createProductAttributeDraft()],
            }
          : section,
      ),
    }))
  }

  function removeAttribute(sectionId, attributeId) {
    onChange((current) => ({
      ...current,
      attributes: current.attributes.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              attributes: section.attributes.filter((attribute) => attribute.id !== attributeId),
            }
          : section,
      ),
    }))
  }

  function removeImage(imageId) {
    onChange((current) => ({
      ...current,
      images: normalizeImageOrder(current.images.filter((image) => image.id !== imageId)),
    }))
  }

  function moveImage(imageId, targetImageId) {
    onChange((current) => {
      const currentIndex = current.images.findIndex((image) => image.id === imageId)
      const targetIndex = current.images.findIndex((image) => image.id === targetImageId)

      if (currentIndex < 0 || targetIndex < 0 || currentIndex === targetIndex) {
        return current
      }

      const nextImages = [...current.images]
      const [movedImage] = nextImages.splice(currentIndex, 1)
      nextImages.splice(targetIndex, 0, movedImage)

      return {
        ...current,
        images: normalizeImageOrder(nextImages),
      }
    })
  }

  function handleImageDragStart(imageId) {
    setDraggedImageId(imageId)
  }

  function handleImageDragEnd() {
    setDraggedImageId('')
  }

  function handleImageDrop(targetImageId) {
    if (!draggedImageId) {
      return
    }

    moveImage(draggedImageId, targetImageId)
    setDraggedImageId('')
  }

  return (
    <section className="panel-card panel-editor">
      <div className="panel-head">
        <div>
          <h2>{mode === 'edit' ? 'Редактирование товара' : 'Новая карточка'}</h2>
        </div>
        <button className="button button-ghost" type="button" onClick={onCancel}>
          {mode === 'edit' ? cancelLabel : 'Очистить'}
        </button>
      </div>

      <form className="editor-form" onSubmit={onSubmit}>
        <Field
          label="Категория"
          as="select"
          value={form.categoryId}
          onChange={(event) => onChange((current) => ({ ...current, categoryId: event.target.value }))}
        >
          <option value="">Выберите категорию</option>
          {categories.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </Field>

        <Field
          label="Название"
          value={form.name}
          onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))}
          placeholder="Например, кресло для гостиной"
        />

        <Field
          label="Описание"
          as="textarea"
          rows={6}
          value={form.description}
          onChange={(event) => onChange((current) => ({ ...current, description: event.target.value }))}
          placeholder="Краткое описание, преимущества и особенности товара"
        />

        <div className="form-split">
          <Field
            label="Цена"
            value={form.price}
            onChange={(event) => onChange((current) => ({ ...current, price: event.target.value }))}
            placeholder="14990"
          />
          <Field
            label="Себестоимость"
            value={form.costPrice}
            onChange={(event) => onChange((current) => ({ ...current, costPrice: event.target.value }))}
            placeholder="9500"
            // hint="Не видно покупателям. Используется только для личной аналитики и отчетов."
          />
          <Field
            label="Остаток"
            type="number"
            value={form.stockCount}
            onChange={(event) => onChange((current) => ({ ...current, stockCount: event.target.value }))}
            placeholder="12"
            min="0"
          />
        </div>

        <div className="field">
          <div className="attribute-editor__head">
            <span className="field-label">Атрибуты</span>
            <button className="button button-secondary attribute-editor__add" type="button" onClick={addSection}>
              + Добавить раздел
            </button>
          </div>

          <div className="characteristic-sections">
            {form.attributes.map((section, sectionIndex) => (
              <div className="characteristic-section" key={section.id}>
                <div className="characteristic-section__head">
                  <input
                    className="field-control"
                    type="text"
                    value={section.title}
                    onChange={(event) => updateSection(section.id, 'title', event.target.value)}
                    placeholder="Название раздела"
                    aria-label={`Название раздела ${sectionIndex + 1}`}
                  />
                  <button className="button button-ghost" type="button" onClick={() => removeSection(section.id)}>
                    Удалить раздел
                  </button>
                </div>

                <div className="attribute-editor">
                  {section.attributes.map((attribute, attributeIndex) => (
                    <div className="attribute-row" key={attribute.id}>
                      <input
                        className="field-control"
                        type="text"
                        value={attribute.key}
                        onChange={(event) => updateAttribute(section.id, attribute.id, 'key', event.target.value)}
                        placeholder="Ключ"
                        aria-label={`Ключ атрибута ${attributeIndex + 1} в разделе ${sectionIndex + 1}`}
                      />
                      <input
                        className="field-control"
                        type="text"
                        value={attribute.value}
                        onChange={(event) => updateAttribute(section.id, attribute.id, 'value', event.target.value)}
                        placeholder="Значение"
                        aria-label={`Значение атрибута ${attributeIndex + 1} в разделе ${sectionIndex + 1}`}
                      />
                      <button className="button button-ghost attribute-row__remove" type="button" onClick={() => removeAttribute(section.id, attribute.id)}>
                        Удалить
                      </button>
                    </div>
                  ))}
                </div>

                <button className="button button-secondary attribute-editor__add" type="button" onClick={() => addAttribute(section.id)}>
                  + Добавить атрибут
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field-label">Изображения</span>

          <FileUploadField
            label="Загрузить изображение"
            accept="image/*"
            onChange={onImageUpload}
            disabled={busyKeys.mediaProductImage}
            busy={busyKeys.mediaProductImage}
            hint="После загрузки изображение появится в списке ниже."
          />

          {form.images.length > 0 ? (
            <div className="image-upload-list">
              {form.images.map((image, index) => (
                <div
                  className={`image-upload-item ${image.isMain ? 'is-main' : ''} ${draggedImageId === image.id ? 'dragging' : ''}`}
                  key={image.id}
                  draggable
                  onDragStart={() => handleImageDragStart(image.id)}
                  onDragEnd={handleImageDragEnd}
                  onDragOver={(event) => {
                    if (draggedImageId) {
                      event.preventDefault()
                    }
                  }}
                  onDrop={() => handleImageDrop(image.id)}
                >
                  <div className="image-upload-item__preview">
                    <img src={image.url} alt={`Изображение товара ${index + 1}`} />
                  </div>
                  <div className="image-upload-item__body">
                    <strong>{image.isMain ? 'Основное изображение' : `Изображение ${index + 1}`}</strong>
                  </div>
                  <div className="image-upload-item__actions">
                    <button className="button button-ghost" type="button" onClick={() => removeImage(image.id)}>
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="editor-actions">
          <button className="button button-primary" type="submit" disabled={busyKeys.productSave}>
            {busyKeys.productSave ? 'Сохраняем...' : mode === 'edit' ? 'Обновить товар' : 'Создать товар'}
          </button>
          <button className="button button-secondary" type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </form>
    </section>
  )
}

function normalizeImageOrder(images) {
  return images.map((image, index) => ({
    ...image,
    isMain: index === 0,
  }))
}
