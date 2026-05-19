export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  rows = 0,
  as = 'input',
  disabled = false,
  hint = '',
  children,
  ...rest
}) {
  const Component = as
  const controlProps = {
    className: 'field-control',
    value,
    onChange,
    placeholder,
    disabled,
    ...rest,
  }

  if (as === 'input') {
    controlProps.type = type
  }

  if (as === 'textarea' && rows) {
    controlProps.rows = rows
  }

  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <Component {...controlProps}>{children}</Component>
      {hint ? <small className="field-hint">{hint}</small> : null}
    </label>
  )
}
