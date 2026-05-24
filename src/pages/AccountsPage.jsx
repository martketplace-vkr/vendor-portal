import { toText } from '../helpers'

const CURRENCY_OPTIONS = [
  { value: '', label: 'Все валюты' },
  { value: '1000', label: 'RUB' },
  { value: '2000', label: 'USDT-TRC20' },
]

export function AccountsPage({
  wallet,
  transactions = [],
  currencyFilter,
  busyKeys,
  onCurrencyFilterChange,
  onReload,
}) {
  const accounts = wallet?.accounts || []

  return (
    <div className="page-grid">
      <section className="hero-strip">
        <div>
          <h2>Счета</h2>
          <p>Доступные средства, заморозка по заказам и история начислений продавца.</p>
        </div>
        <button className="button button-secondary" type="button" onClick={onReload} disabled={busyKeys.accounts}>
          {busyKeys.accounts ? 'Обновляем...' : 'Обновить'}
        </button>
      </section>

      <section className="account-card-grid">
        {accounts.length === 0 ? (
          <div className="empty-panel">Счета появятся после первой финансовой операции.</div>
        ) : (
          accounts.map((account) => (
            <article key={toText(account.id)} className="metric-card">
              <span className="metric-card__label">
                {formatCurrency(account.currencyCode ?? account.currency_code)} · {formatAccountType(account.accountType ?? account.account_type)}
              </span>
              <strong className="metric-card__value">{formatMoney(account.balance, account.currencyCode ?? account.currency_code)}</strong>
            </article>
          ))
        )}
      </section>

      <section className="panel-card">
        <div className="panel-head">
          <div>
            <h2>История операций</h2>
          </div>
          <select className="field-control account-filter" value={currencyFilter} onChange={(event) => onCurrencyFilterChange(event.target.value)}>
            {CURRENCY_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <TransactionList transactions={transactions} />
      </section>
    </div>
  )
}

function TransactionList({ transactions }) {
  if (transactions.length === 0) {
    return <div className="empty-panel">Операций пока нет.</div>
  }

  return (
    <div className="account-transaction-list">
      {transactions.map((transaction) => (
        <article key={toText(transaction.id)} className="account-transaction">
          <div className="account-transaction__main">
            <strong>{formatTransactionType(transaction.type)}</strong>
            <span>{formatDate(transaction.postedAt ?? transaction.posted_at ?? transaction.createdAt ?? transaction.created_at)}</span>
          </div>
          <div className="account-transaction__meta">
            <span>{toText(transaction.reason) || 'Без причины'}</span>
            <span>{formatReference(transaction)}</span>
          </div>
          <div className="account-entry-list">
            {(transaction.entries || []).map((entry) => (
              <span key={toText(entry.id)} className={entry.direction === 'ENTRY_DIRECTION_DEBIT' || entry.direction === 1 ? 'account-entry account-entry--debit' : 'account-entry'}>
                {formatDirection(entry.direction)} {formatMoney(entry.money?.amount, entry.money?.currencyCode ?? entry.money?.currency_code)}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  )
}

function formatMoney(amount, currencyCode) {
  const normalized = toText(amount) || '0'
  return `${normalized} ${formatCurrency(currencyCode)}`
}

function formatCurrency(currencyCode) {
  const code = Number(currencyCode)
  if (code === 1000) {
    return 'RUB'
  }
  if (code === 2000) {
    return 'USDT-TRC20'
  }
  return code ? `#${code}` : 'Валюта'
}

function formatAccountType(value) {
  if (value === 'ACCOUNT_TYPE_HOLD' || value === 2) {
    return 'Заморожено'
  }
  if (value === 'ACCOUNT_TYPE_AVAILABLE' || value === 1) {
    return 'Доступно'
  }
  return 'Счет'
}

function formatTransactionType(value) {
  return toText(value).replace(/^LEDGER_TRANSACTION_TYPE_/, '').replaceAll('_', ' ').toLowerCase() || 'Операция'
}

function formatDirection(value) {
  return value === 'ENTRY_DIRECTION_DEBIT' || value === 1 ? '−' : '+'
}

function formatReference(transaction) {
  const type = toText(transaction.referenceType ?? transaction.reference_type).replace(/^REFERENCE_TYPE_/, '').toLowerCase()
  const id = toText(transaction.referenceId ?? transaction.reference_id)
  return id ? `${type || 'ref'} #${id}` : type || ''
}

function formatDate(value) {
  const raw = toText(value)
  if (!raw) {
    return ''
  }
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) {
    return raw
  }
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
