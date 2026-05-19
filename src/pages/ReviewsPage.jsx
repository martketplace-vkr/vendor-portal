import { useMemo, useState } from 'react'
import { getProductId, getProductName, resolveProductImage, toText } from '../helpers'

export function ReviewsPage({
  reviews,
  products,
  busyKeys,
  replyForms,
  disputeForms,
  onReloadReviews,
  onReplyChange,
  onDisputeChange,
  onReply,
  onDeleteReply,
  onDispute,
  onCancelDispute,
}) {
  const [activeFilter, setActiveFilter] = useState('all')
  const [replyModalReview, setReplyModalReview] = useState(null)
  const [disputeModalReview, setDisputeModalReview] = useState(null)
  const productById = useMemo(() => new Map(products.map((product) => [getProductId(product), product])), [products])
  const stats = useMemo(() => buildReviewStats(reviews), [reviews])
  const filteredReviews = useMemo(
    () => reviews.filter((review) => reviewMatchesFilter(review, activeFilter)),
    [reviews, activeFilter],
  )
  const filters = [
    { id: 'all', label: 'Все', count: reviews.length },
    { id: 'unanswered', label: 'Без ответа', count: stats.unanswered },
    { id: 'disputed', label: 'Спорные', count: stats.disputed },
  ]
  const closeReplyModal = () => setReplyModalReview(null)
  const closeDisputeModal = () => setDisputeModalReview(null)

  function openReplyModal(review) {
    const reviewId = toText(review?.id)
    onReplyChange(reviewId, toText(review?.reply?.comment))
    setReplyModalReview(review)
  }

  function openDisputeModal(review) {
    const reviewId = toText(review?.id)
    onDisputeChange(reviewId, toText(review?.dispute?.reason))
    setDisputeModalReview(review)
  }

  return (
    <div className="page-stack">
      <section className="surface-panel page-header-panel reviews-hero-panel">
        <div>
          <h1>Отзывы</h1>
          <p>Отзывы покупателей по вашим товарам, ответы и обращения к администратору.</p>
        </div>
        <button
          className="review-action-button review-action-button-ghost"
          type="button"
          onClick={onReloadReviews}
          disabled={busyKeys.reviews}
        >
          {busyKeys.reviews ? 'Обновляем...' : 'Обновить'}
        </button>
      </section>

      <section className="review-stats-grid" aria-label="Сводка отзывов">
        <ReviewMetric title="Всего отзывов" value={stats.total} />
        <ReviewMetric title="Средняя оценка" value={stats.average ? stats.average.toFixed(1) : '—'} accent="star" />
        <ReviewMetric title="Без ответа" value={stats.unanswered} />
        <ReviewMetric title="На проверке" value={stats.disputed} />
      </section>

      <section className="surface-panel review-workspace">
        <div className="review-toolbar">
          <div className="review-filter-tabs" role="tablist" aria-label="Фильтр отзывов">
            {filters.map((filter) => (
              <button
                key={filter.id}
                className={`review-filter-tab ${activeFilter === filter.id ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
              >
                <span>{filter.label}</span>
                <b>{filter.count}</b>
              </button>
            ))}
          </div>
        </div>

        <div className="review-admin-list">
        {busyKeys.reviews ? (
          <div className="empty-state">Загружаем отзывы...</div>
        ) : filteredReviews.length === 0 ? (
          <div className="empty-state">Отзывов пока нет.</div>
        ) : (
          filteredReviews.map((review) => {
            const reviewId = toText(review?.id)
            const productId = toText(review?.product_id ?? review?.productId)
            const product = productById.get(productId)
            const productName = getProductName(product) || `Товар ${productId}`
            const productImage = resolveProductImage(product)
            const images = Array.isArray(review?.images) ? review.images : []
            const reply = review?.reply
            const dispute = review?.dispute

            return (
              <article key={reviewId} className="review-admin-card">
                <div className="review-admin-card__head">
                  <div className="review-product-identity">
                    <span className="review-product-identity__image">
                      {productImage ? <img src={productImage} alt={productName} /> : <span>{productName.slice(0, 1) || '?'}</span>}
                    </span>
                    <div>
                      <strong>{productName}</strong>
                      <span>ID {productId}</span>
                    </div>
                  </div>
                  <div className="review-card-meta">
                    <StarRating value={Number.parseInt(review?.rating, 10) || 0} />
                    <span>{toText(review?.author_name ?? review?.authorName) || 'Покупатель'} · {formatDate(review?.created_at ?? review?.createdAt)}</span>
                  </div>
                </div>

                <div className="review-admin-card__content">
                  <p>{toText(review?.comment)}</p>

                  {images.length > 0 ? (
                    <div className="review-admin-images">
                      {images.map((image, index) => (
                        <img key={`${toText(image?.url)}-${index}`} src={toText(image?.url)} alt="" />
                      ))}
                    </div>
                  ) : null}
                </div>

                {reply ? (
                  <div className="review-inline-note review-inline-note-reply">
                    <strong>Ваш ответ</strong>
                    <span>{toText(reply.comment)}</span>
                  </div>
                ) : null}

                {dispute ? (
                  <div className="review-inline-note review-inline-note-dispute">
                    <strong>Спор: {formatDisputeStatus(dispute.status)}</strong>
                    <span>{toText(dispute.reason)}</span>
                  </div>
                ) : null}

                <div className="review-card-actions">
                  <button className="review-action-button review-action-button-primary" type="button" onClick={() => openReplyModal(review)}>
                    {reply ? 'Изменить ответ' : 'Ответить'}
                  </button>
                  {reply ? (
                    <button
                      className="review-action-button review-action-button-danger"
                      type="button"
                      onClick={() => onDeleteReply(reviewId)}
                      disabled={busyKeys[`reviewReplyDelete-${reviewId}`]}
                    >
                      {busyKeys[`reviewReplyDelete-${reviewId}`] ? 'Удаляем...' : 'Удалить ответ'}
                    </button>
                  ) : null}
                  <button className="review-action-button review-action-button-secondary" type="button" onClick={() => openDisputeModal(review)}>
                    {dispute ? 'Изменить спор' : 'Оспорить'}
                  </button>
                  {isPendingDispute(dispute) ? (
                    <button
                      className="review-action-button review-action-button-warning"
                      type="button"
                      onClick={() => onCancelDispute(reviewId)}
                      disabled={busyKeys[`reviewDisputeCancel-${reviewId}`]}
                    >
                      {busyKeys[`reviewDisputeCancel-${reviewId}`] ? 'Отзываем...' : 'Отозвать спор'}
                    </button>
                  ) : null}
                </div>
              </article>
            )
          })
        )}
        </div>
      </section>

      {replyModalReview ? (
        <ReviewModal title={replyModalReview.reply ? 'Изменить ответ' : 'Ответить покупателю'} onClose={closeReplyModal}>
          <div className="review-modal-form">
            <label htmlFor={`reply-modal-${toText(replyModalReview.id)}`}>Ответ продавца</label>
            <textarea
              id={`reply-modal-${toText(replyModalReview.id)}`}
              className="field-control review-action-input"
              value={replyForms[toText(replyModalReview.id)] || ''}
              onChange={(event) => onReplyChange(toText(replyModalReview.id), event.target.value)}
              placeholder="Напишите ответ покупателю"
              rows={5}
            />
            <div className="review-modal-actions">
              <button
                className="review-action-button review-action-button-primary"
                type="button"
                onClick={async () => {
                  if (await onReply(toText(replyModalReview.id))) {
                    closeReplyModal()
                  }
                }}
                disabled={busyKeys[`reviewReply-${toText(replyModalReview.id)}`]}
              >
                {busyKeys[`reviewReply-${toText(replyModalReview.id)}`] ? 'Сохраняем...' : replyModalReview.reply ? 'Обновить ответ' : 'Опубликовать ответ'}
              </button>
              <button className="review-action-button review-action-button-ghost" type="button" onClick={closeReplyModal}>
                Отмена
              </button>
            </div>
          </div>
        </ReviewModal>
      ) : null}

      {disputeModalReview ? (
        <ReviewModal title={disputeModalReview.dispute ? 'Изменить спор' : 'Оспорить отзыв'} onClose={closeDisputeModal}>
          <div className="review-modal-form">
            <label htmlFor={`dispute-modal-${toText(disputeModalReview.id)}`}>Причина обращения к администратору</label>
            <textarea
              id={`dispute-modal-${toText(disputeModalReview.id)}`}
              className="field-control review-action-input"
              value={disputeForms[toText(disputeModalReview.id)] || ''}
              onChange={(event) => onDisputeChange(toText(disputeModalReview.id), event.target.value)}
              placeholder="Почему отзыв несправедливый"
              rows={4}
            />
            <div className="review-modal-actions">
              <button
                className="review-action-button review-action-button-secondary"
                type="button"
                onClick={async () => {
                  if (await onDispute(toText(disputeModalReview.id))) {
                    closeDisputeModal()
                  }
                }}
                disabled={busyKeys[`reviewDispute-${toText(disputeModalReview.id)}`]}
              >
                {busyKeys[`reviewDispute-${toText(disputeModalReview.id)}`] ? 'Отправляем...' : 'Отправить спор'}
              </button>
              <button className="review-action-button review-action-button-ghost" type="button" onClick={closeDisputeModal}>
                Отмена
              </button>
            </div>
          </div>
        </ReviewModal>
      ) : null}
    </div>
  )
}

function ReviewModal({ title, children, onClose }) {
  return (
    <div
      className="review-modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section className="review-modal-card" role="dialog" aria-modal="true" aria-labelledby="review-modal-title">
        <div className="review-modal-head">
          <h2 id="review-modal-title">{title}</h2>
          <button className="review-modal-close" type="button" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}

function ReviewMetric({ title, value, accent = '' }) {
  return (
    <article className={`surface-panel review-metric-card ${accent ? `review-metric-card-${accent}` : ''}`}>
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  )
}

function StarRating({ value }) {
  return (
    <div className="vendor-stars">
      {[1, 2, 3, 4, 5].map((rating) => (
        <span key={rating} className={rating <= value ? 'active' : ''}>★</span>
      ))}
    </div>
  )
}

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleDateString('ru-RU')
}

function formatDisputeStatus(status) {
  if (status === 'accepted') {
    return 'принят'
  }
  if (status === 'rejected') {
    return 'отклонен'
  }

  return 'на проверке'
}

function isPendingDispute(dispute) {
  return toText(dispute?.status).trim().toLowerCase() === 'pending'
}

function buildReviewStats(reviews) {
  const total = reviews.length
  const ratingSum = reviews.reduce((sum, review) => sum + (Number.parseInt(review?.rating, 10) || 0), 0)
  const disputed = reviews.filter((review) => review?.dispute).length
  const unanswered = reviews.filter((review) => !review?.reply).length

  return {
    total,
    average: total > 0 ? ratingSum / total : 0,
    unanswered,
    disputed,
  }
}

function reviewMatchesFilter(review, filter) {
  if (filter === 'unanswered') {
    return !review?.reply
  }
  if (filter === 'disputed') {
    return Boolean(review?.dispute)
  }

  return true
}
