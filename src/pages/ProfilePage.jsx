import { Field, FileUploadField } from '../ui'

export function ProfilePage({
  profileForm,
  busyKeys,
  profileEditable,
  profileSupportNote,
  onProfileChange,
  onProfileSubmit,
  onAvatarUpload,
}) {
  return (
    <div className="page-split">
      <section className="panel-card">
        <div className="panel-head">
          <div>
            <h2>Данные вендора</h2>
          </div>
        </div>

        <form className="editor-form" onSubmit={onProfileSubmit}>
          <div className="form-split">
            <Field
              label="Имя"
              value={profileForm.firstName}
              disabled={!profileEditable}
              onChange={(event) => onProfileChange((current) => ({ ...current, firstName: event.target.value }))}
              placeholder="Анна"
            />
            <Field
              label="Фамилия"
              value={profileForm.lastName}
              disabled={!profileEditable}
              onChange={(event) => onProfileChange((current) => ({ ...current, lastName: event.target.value }))}
              placeholder="Петрова"
            />
          </div>

          <Field
            label="Email"
            type="email"
            value={profileForm.email}
            disabled={!profileEditable}
            onChange={(event) => onProfileChange((current) => ({ ...current, email: event.target.value }))}
            placeholder="vendor@example.com"
          />

          <FileUploadField
            label="Загрузить аватар"
            accept="image/*"
            onChange={onAvatarUpload}
            disabled={busyKeys.mediaAvatar || !profileEditable}
            busy={busyKeys.mediaAvatar}
            hint="После загрузки ссылка появится в поле аватара."
          />

          {profileSupportNote ? (
            <p className="field-hint">
              Редактирование профиля пока не подключено на стороне API.
            </p>
          ) : null}

          <button className="button button-primary" type="submit" disabled={busyKeys.profile || !profileEditable}>
            {busyKeys.profile ? 'Сохраняем...' : 'Сохранить профиль'}
          </button>
        </form>
      </section>
    </div>
  )
}
