export function Sidebar({
  navItems,
  currentPage,
  profileName,
  busyKeys,
  onNavigate,
  brandBadge,
  brandTitle,
  brandSubtitle,
  logoutLabel,
  onLogout,
}) {
  return (
    <aside className="vendor-sidebar">
      <div className="vendor-nav__brand">
        <button className="sidebar-brand" type="button" onClick={() => onNavigate(navItems[0]?.path || '/')}>
          <span className="sidebar-brand__badge">{brandBadge}</span>
          <span className="sidebar-brand__copy">
            <strong>{brandTitle}</strong>
            <span>{brandSubtitle}</span>
          </span>
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Навигация кабинета">
        {navItems.map((item) => (
          <button
            key={item.path}
            className={`sidebar-nav__link ${currentPage === item.page ? 'active' : ''}`}
            type="button"
            onClick={() => onNavigate(item.path)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="vendor-nav__actions">
        <div className="vendor-nav__session">
          <div className="sidebar-profile">
            <strong>{profileName}</strong>
          </div>
          <button className="logout-pill" type="button" onClick={onLogout} disabled={busyKeys.logout}>
            <LogoutIcon />
            <span>{logoutLabel}</span>
          </button>
        </div>
      </div>
    </aside>
  )
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M10 6H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4" />
      <path d="M14 8l4 4-4 4" />
      <path d="M18 12H9" />
    </svg>
  )
}
