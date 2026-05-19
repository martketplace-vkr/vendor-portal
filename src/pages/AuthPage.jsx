import { Field } from '../ui'

export function AuthPage({
  authMode,
  authForm,
  busyKeys,
  copy,
  onAuthModeChange,
  onAuthFormChange,
  onAuthSubmit,
}) {
  return (
    <div className="auth-stage">
      <section className="auth-panel">
        <div className="panel-head">
          <div>
            <h2>{authMode === 'login' ? copy.loginTitle : copy.registerTitle}</h2>
          </div>
        </div>

        {copy.allowRegistration ? (
          <p className="auth-switch">
            {authMode === 'login' ? copy.switchLoginPrompt : copy.switchRegisterPrompt}{' '}
            <button
              className="auth-switch__link"
              type="button"
              onClick={() => onAuthModeChange(authMode === 'login' ? 'register' : 'login')}
            >
              {authMode === 'login' ? copy.switchToRegisterLabel : copy.switchToLoginLabel}
            </button>
          </p>
        ) : null}

        <form className="auth-form" onSubmit={onAuthSubmit}>
          <Field
            label="Email"
            type="email"
            value={authForm.email}
            onChange={(event) => onAuthFormChange((current) => ({ ...current, email: event.target.value }))}
            placeholder={copy.emailPlaceholder}
            autoComplete="email"
          />
          <Field
            label="Пароль"
            type="password"
            value={authForm.password}
            onChange={(event) => onAuthFormChange((current) => ({ ...current, password: event.target.value }))}
            placeholder={copy.passwordPlaceholder}
            autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
          />

          <button className="button button-primary wide-button" type="submit" disabled={busyKeys.auth}>
            {busyKeys.auth ? 'Подождите...' : authMode === 'login' ? copy.loginButton : copy.registerButton}
          </button>
        </form>
      </section>
    </div>
  )
}
