import { useState } from 'react'

export function FileUploadField({
  label,
  accept,
  disabled = false,
  busy = false,
  busyText = 'Загружаем файл...',
  hint = '',
  onChange,
}) {
  const [fileName, setFileName] = useState('')

  function handleChange(event) {
    const file = event.target.files?.[0]
    setFileName(file?.name || '')
    onChange?.(event)
  }

  return (
    <label className={`field upload-field ${disabled ? 'upload-field-disabled' : ''}`}>
      <span className="field-label">{label}</span>
      <span className="upload-dropzone">
        <input type="file" accept={accept} onChange={handleChange} disabled={disabled} />
        <span className="upload-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 16V8" />
            <path d="m8.5 11.5 3.5-3.5 3.5 3.5" />
            <path d="M6.5 18.5h11a4 4 0 0 0 .7-7.94A6.2 6.2 0 0 0 6.05 9.5 4.5 4.5 0 0 0 6.5 18.5Z" />
          </svg>
        </span>
        <span className="upload-title">Выберите файл для загрузки</span>
        <span className="upload-subtitle">{busy ? busyText : hint}</span>
      </span>
      <span className="upload-file-row">
        <span className="upload-file-icon" aria-hidden="true" />
        <span className="upload-file-name">{fileName || 'Файл не выбран'}</span>
      </span>
    </label>
  )
}
