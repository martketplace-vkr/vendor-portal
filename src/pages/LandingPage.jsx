export function LandingPage({ copy, isAuthorized, onOpenAccount }) {
  return (
    <div className="vendor-landing">
      <header className="landing-header">
        <button className="landing-brand" type="button">
          <span className="landing-brand__badge">{copy.brandBadge}</span>
          <span className="landing-brand__copy">
            <strong>{copy.brandTitle}</strong>
            <span>{copy.brandSubtitle}</span>
          </span>
        </button>

        <button
          className="landing-account"
          type="button"
          onClick={onOpenAccount}
          aria-label={isAuthorized ? 'Открыть кабинет продавца' : 'Войти в кабинет продавца'}
          title={isAuthorized ? 'Кабинет продавца' : 'Войти'}
        >
          <UserIcon />
        </button>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-hero__copy">
            <h1>{copy.heroTitle}</h1>
            <p>{copy.heroDescription}</p>
            <div className="landing-actions">
              <button className="button button-primary" type="button" onClick={onOpenAccount}>
                {copy.primaryActionLabel}
              </button>
              <a className="button button-secondary landing-anchor" href="#benefits">
                {copy.secondaryActionLabel}
              </a>
            </div>
          </div>

          <div className="landing-preview" aria-label="Превью кабинета продавца">
            <div className="landing-preview__top">
              <div>
                <span>{copy.previewSubtitle}</span>
                <strong>{copy.previewTitle}</strong>
              </div>
            </div>

            <div className="landing-preview__chart">
              <span style={{ height: '38%' }} />
              <span style={{ height: '66%' }} />
              <span style={{ height: '48%' }} />
              <span style={{ height: '78%' }} />
              <span style={{ height: '54%' }} />
              <span style={{ height: '88%' }} />
            </div>

            <div className="landing-preview__items">
              {copy.previewItems.map((item) => (
                <div key={item.label} className={`landing-preview-card landing-preview-card-${item.tone}`}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-stat-row" aria-label="Ключевые показатели">
          {copy.heroStats.map((stat) => (
            <article key={stat.label} className="landing-stat">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </article>
          ))}
        </section>

        <section className="landing-section" id="benefits">
          <div className="landing-section__head">
            <h2>{copy.benefitsTitle}</h2>
            <p>{copy.benefitsDescription}</p>
          </div>

          <div className="landing-benefits">
            {copy.benefits.map((benefit, index) => (
              <article key={benefit.title} className="landing-benefit">
                <span className="landing-benefit__index">{String(index + 1).padStart(2, '0')}</span>
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-flow">
          <div>
            <h2>{copy.workflowTitle}</h2>
            <p>{copy.workflowDescription}</p>
          </div>

          <div className="landing-flow__steps">
            {copy.workflow.map((step, index) => (
              <article key={step} className="landing-flow-step">
                <strong>{index + 1}</strong>
                <span>{step}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-partner">
          <div>
            <h2>{copy.partnerTitle}</h2>
            <p>{copy.partnerDescription}</p>
          </div>
          <button className="button button-primary" type="button" onClick={onOpenAccount}>
            {copy.partnerActionLabel}
          </button>
        </section>

        <section className="landing-section">
          <div className="landing-section__head landing-section__head-compact">
            <h2>{copy.faqTitle}</h2>
          </div>

          <div className="landing-faq">
            {copy.faq.map((item) => (
              <details key={item.question} className="landing-faq__item">
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

function UserIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <path d="M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
    </svg>
  )
}
