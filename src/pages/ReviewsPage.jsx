import { getProductId, getProductName, toText } from '../helpers'

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
  onDispute,
}) {
  const productNameById = new Map(products.map((product) => [getProductId(product), getProductName(product)]))

  return (
    <div className="page-stack">
      <section className="surface-panel page-header-panel">
        <div>
          <h1>Отзывы</h1>
          <p>Отзывы покупателей по вашим товарам, ответы и спорные обращения к администратору.</p>
        </div>
        <button className="primary-action secondary-action" type="button" onClick={onReloadReviews} disabled={busyKeys.reviews}>
          Обновить
        </button>
      </section>

      <section className="surface-panel review-admin-list">
        {busyKeys.reviews ? (
          <div className="empty-state">Загружаем отзывы...</div>
        ) : reviews.length === 0 ? (
          <div className="empty-state">Отзывов пока нет.</div>
        ) : (
          reviews.map((review) => {
            const reviewId = toText(review?.id)
            const productId = toText(review?.product_id ?? review?.productId)
            const reply = review?.reply
            const dispute = review?.dispute

            return (
              <article key={reviewId} className="review-admin-card">
                <div className="review-admin-card__head">
                  <div>
                    <strong>{productNameById.get(productId) || `Товар ${productId}`}</strong>
                    <span>{toText(review?.author_name ?? review?.authorName) || 'Покупатель'} · {formatDate(review?.created_at ?? review?.createdAt)}</span>
                  </div>
                  <StarRating value={Number.parseInt(review?.rating, 10) || 0} />
                </div>

                <p>{toText(review?.comment)}</p>

                {reply ? (
                  <div className="inline-note">
                    <strong>Ваш ответ</strong>
                    <span>{toText(reply.comment)}</span>
                  </div>
                ) : null}

                {dispute ? (
                  <div className="inline-note">
                    <strong>Спор: {formatDisputeStatus(dispute.status)}</strong>
                    <span>{toText(dispute.reason)}</span>
                  </div>
                ) : null}

                <div className="review-admin-actions">
                  <textarea
                    className="field-control"
                    value={replyForms[reviewId] || ''}
                    onChange={(event) => onReplyChange(reviewId, event.target.value)}
                    placeholder="Ответ продавца"
                    rows={2}
                  />
                  <button className="primary-action" type="button" onClick={() => onReply(reviewId)} disabled={busyKeys[`reviewReply-${reviewId}`]}>
                    Ответить
                  </button>
                </div>

                <div className="review-admin-actions">
                  <input
                    className="field-control"
                    value={disputeForms[reviewId] || ''}
                    onChange={(event) => onDisputeChange(reviewId, event.target.value)}
                    placeholder="Почему отзыв несправедливый"
                  />
                  <button className="primary-action secondary-action" type="button" onClick={() => onDispute(reviewId)} disabled={busyKeys[`reviewDispute-${reviewId}`]}>
                    Оспорить
                  </button>
                </div>
              </article>
            )
          })
        )}
      </section>
    </div>
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
