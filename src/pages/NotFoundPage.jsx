export function NotFoundPage({
  title = 'Раздел не найден',
  description = 'Маршрут не существует.',
  buttonLabel = 'Вернуться на главную',
  onGoDashboard,
}) {
  return (
    <section className="panel-card">
      <div className="empty-panel empty-panel-large">
        <h2>{title}</h2>
        <p>{description}</p>
        <button className="button button-primary" type="button" onClick={onGoDashboard}>
          {buttonLabel}
        </button>
      </div>
    </section>
  )
}
