import { toText } from '../helpers'

const CURRENCY_OPTIONS = [
  { value: '', label: 'Все валюты' },
  { value: '1000', label: 'RUB' },
  { value: '2001', label: 'USDT TRC-20' },
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
      {transactions.map((transaction) => {
        const view = buildTransactionView(transaction)

        return (
        <article key={view.id} className="account-transaction">
          <span className={`account-transaction__icon account-transaction__icon--${view.tone}`}>{view.icon}</span>
          <div className="account-transaction__body">
          <div className="account-transaction__main">
            <strong>{view.title}</strong>
            <span>{view.date}</span>
          </div>
          <div className="account-transaction__meta">
            <span>{view.amounts.map((amount) => amount.currency).join(' / ') || 'Операция'}</span>
            <span>{toText(transaction.reason) || 'Без причины'}</span>
            <span>{view.reference}</span>
          </div>
          <div className="account-entry-list">
            {view.amounts.map((amount) => (
              <span key={`${view.id}-${amount.currency}`} className={`account-entry ${amount.sign === '-' ? 'account-entry--debit' : ''}`}>
                {amount.sign} {amount.amount} {amount.currency}
              </span>
            ))}
          </div>
          </div>
        </article>
        )
      })}
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
  if (code === 2001) {
    return 'USDT'
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

function buildTransactionView(transaction) {
  const type = normalizeTransactionType(transaction.type)
  const referenceType = normalizeReferenceType(transaction.referenceType ?? transaction.reference_type)
  const amounts = buildTransactionAmounts(transaction)
  const firstAmount = amounts[0] || { sign: '', currency: '', amount: '0' }
  const reason = toText(transaction.reason).toLowerCase()

  return {
    id: toText(transaction.id),
    title: getTransactionTitle(type, referenceType, firstAmount.sign, reason),
    icon: getTransactionIcon(type, firstAmount.sign),
    tone: getTransactionTone(type, firstAmount.sign),
    amounts,
    date: formatDate(transaction.postedAt ?? transaction.posted_at ?? transaction.createdAt ?? transaction.created_at),
    reference: formatReference(transaction),
  }
}

function buildTransactionAmounts(transaction) {
  const byCurrency = new Map()

  for (const entry of transaction.entries || []) {
    const currency = formatCurrency(entry.money?.currencyCode ?? entry.money?.currency_code)
    const current = byCurrency.get(currency) || { credit: 0, debit: 0 }
    const amount = parseAmount(entry.money?.amount)
    if (isDebit(entry.direction)) {
      current.debit += amount
    } else {
      current.credit += amount
    }
    byCurrency.set(currency, current)
  }

  return [...byCurrency.entries()].map(([currency, value]) => {
    const net = value.credit - value.debit
    return {
      currency,
      sign: net < 0 ? '-' : '+',
      amount: formatAmount(Math.abs(net || value.credit || value.debit), currency),
    }
  })
}

function getTransactionTitle(type, referenceType, sign, reason) {
  if (type === 'TOP_UP' || referenceType === 'TOP_UP' || (type === 'ADJUSTMENT' && sign === '+' && /deposit|top.?up|пополн/.test(reason))) {
    return 'Пополнение'
  }
  if (type === 'WITHDRAWAL' || referenceType === 'WITHDRAWAL') {
    return 'Вывод'
  }
  if (type === 'HOLD') {
    return 'Резервирование'
  }
  if (type === 'CAPTURE') {
    return 'Оплата заказа'
  }
  if (type === 'RELEASE') {
    return 'Возврат резерва'
  }
  if (type === 'REFUND') {
    return 'Возврат'
  }
  if (type === 'ADJUSTMENT') {
    return sign === '-' ? 'Списание' : 'Корректировка'
  }
  return 'Операция по кошельку'
}

function getTransactionIcon(type, sign) {
  if (type === 'WITHDRAWAL' || sign === '-') {
    return '↑'
  }
  if (type === 'HOLD') {
    return '•'
  }
  return '↓'
}

function getTransactionTone(type, sign) {
  if (type === 'WITHDRAWAL' || sign === '-') {
    return 'out'
  }
  if (['HOLD', 'CAPTURE'].includes(type)) {
    return 'hold'
  }
  return 'in'
}

function normalizeTransactionType(value) {
  return toText(value).replace(/^LEDGER_TRANSACTION_TYPE_/, '')
}

function normalizeReferenceType(value) {
  return toText(value).replace(/^REFERENCE_TYPE_/, '')
}

function isDebit(value) {
  return value === 'ENTRY_DIRECTION_DEBIT' || value === 1
}

function parseAmount(value) {
  const parsed = Number.parseFloat(toText(value).replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

function formatAmount(amount, currency) {
  return amount.toLocaleString('ru-RU', {
    minimumFractionDigits: currency === 'USDT' ? 2 : 0,
    maximumFractionDigits: currency === 'USDT' ? 8 : 0,
  })
}
