import { useEffect, useState } from 'react'
import api, { Purchase, Sale, PurchaseInput, SaleInput, getToken } from '../api/client'

function fmtUSD(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function TokenGate({ onAuth }: { onAuth: () => void }) {
  const [token, setToken] = useState('')
  function submit(e: React.FormEvent) {
    e.preventDefault()
    localStorage.setItem('challenge_admin_token', token)
    onAuth()
  }
  return (
    <div className="max-w-sm mx-auto mt-20">
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 text-yellow-400">Admin Access</h2>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
            placeholder="Bearer token"
            value={token}
            onChange={e => setToken(e.target.value)}
          />
          <button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold py-2 rounded text-sm">
            Unlock
          </button>
        </form>
      </div>
    </div>
  )
}

const EMPTY_PURCHASE: PurchaseInput = {
  tcgplayer_product_id: null,
  game: '',
  set_name: '',
  product_type: 'Booster Box',
  date_purchased: new Date().toISOString().slice(0, 10),
  qty_purchased: 1,
  cost_per_unit: 0,
  market_price_at_purchase: null,
  distribution_price: null,
  current_market_price: null,
  notes: null,
}

function PurchaseForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: PurchaseInput
  onSave: (data: PurchaseInput) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState<PurchaseInput>(initial)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function set(k: keyof PurchaseInput, v: unknown) {
    setForm(f => ({ ...f, [k]: v }))
  }
  function numOrNull(s: string) { const n = parseFloat(s); return isNaN(n) ? null : n }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr('')
    try { await onSave(form) }
    catch (ex) { setErr((ex as Error).message) }
    finally { setSaving(false) }
  }

  const field = (label: string, children: React.ReactNode) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-400">{label}</span>
      {children}
    </label>
  )
  const inp = (type: string, val: string | number, onChange: (v: string) => void, req = false) => (
    <input
      type={type}
      className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm"
      value={val}
      onChange={e => onChange(e.target.value)}
      required={req}
      step={type === 'number' ? '0.01' : undefined}
    />
  )

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {field('Game *', inp('text', form.game, v => set('game', v), true))}
        {field('Set Name *', inp('text', form.set_name, v => set('set_name', v), true))}
        {field('Product Type *',
          <select
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm"
            value={form.product_type}
            onChange={e => set('product_type', e.target.value)}
          >
            {['Booster Box', 'Booster Box Case', 'Booster Pack', 'Commander Deck', 'Display Box', 'Draft Set', 'Starter Deck', 'Other'].map(v =>
              <option key={v}>{v}</option>
            )}
          </select>
        )}
        {field('Date Purchased *', inp('date', form.date_purchased, v => set('date_purchased', v), true))}
        {field('Qty *', inp('number', form.qty_purchased, v => set('qty_purchased', parseInt(v) || 0), true))}
        {field('Cost / Unit *', inp('number', form.cost_per_unit, v => set('cost_per_unit', parseFloat(v) || 0), true))}
        {field('Market Price @ Purchase', inp('number', form.market_price_at_purchase ?? '', v => set('market_price_at_purchase', numOrNull(v))))}
        {field('Distribution Price (MSRP)', inp('number', form.distribution_price ?? '', v => set('distribution_price', numOrNull(v))))}
        {field('Current Market Price', inp('number', form.current_market_price ?? '', v => set('current_market_price', numOrNull(v))))}
        {field('TCGPlayer Product ID', inp('text', form.tcgplayer_product_id ?? '', v => set('tcgplayer_product_id', v || null)))}
      </div>
      {field('Notes', <textarea
        className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm"
        rows={2}
        value={form.notes ?? ''}
        onChange={e => set('notes', e.target.value || null)}
      />)}
      {err && <p className="text-red-400 text-sm">{err}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-semibold px-4 py-2 rounded text-sm"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white px-4 py-2 text-sm">
          Cancel
        </button>
      </div>
    </form>
  )
}

function SaleForm({
  purchase,
  onSave,
  onCancel,
}: {
  purchase: Purchase
  onSave: (data: SaleInput) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState<SaleInput>({
    date_sold: new Date().toISOString().slice(0, 10),
    qty_sold: 1,
    price_per_unit: purchase.current_market_price ?? purchase.cost_per_unit,
    platform: null,
    notes: null,
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr('')
    try { await onSave(form) }
    catch (ex) { setErr((ex as Error).message) }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-semibold text-yellow-400">
        Log Sale — {purchase.game} {purchase.set_name} ({purchase.qty_remaining} remaining)
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-400">Date Sold *</span>
          <input type="date" className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm"
            value={form.date_sold} onChange={e => setForm(f => ({ ...f, date_sold: e.target.value }))} required />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-400">Qty *</span>
          <input type="number" min={1} max={purchase.qty_remaining} className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm"
            value={form.qty_sold} onChange={e => setForm(f => ({ ...f, qty_sold: parseInt(e.target.value) || 0 }))} required />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-400">Price / Unit *</span>
          <input type="number" step="0.01" className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm"
            value={form.price_per_unit} onChange={e => setForm(f => ({ ...f, price_per_unit: parseFloat(e.target.value) || 0 }))} required />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-400">Platform</span>
          <select className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm"
            value={form.platform ?? ''} onChange={e => setForm(f => ({ ...f, platform: e.target.value || null }))}>
            <option value="">—</option>
            {['TCGPlayer', 'eBay', 'Facebook', 'Local', 'Discord', 'Other'].map(p => <option key={p}>{p}</option>)}
          </select>
        </label>
      </div>
      {err && <p className="text-red-400 text-sm">{err}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving}
          className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold px-4 py-1.5 rounded text-sm">
          {saving ? 'Saving…' : 'Log Sale'}
        </button>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white px-3 py-1.5 text-sm">Cancel</button>
      </div>
    </form>
  )
}

function PurchaseRow({
  p,
  onEdit,
  onDelete,
  onSale,
}: {
  p: Purchase
  onEdit: () => void
  onDelete: () => void
  onSale: () => void
}) {
  const [sales, setSales] = useState<Sale[] | null>(null)
  const [showSales, setShowSales] = useState(false)

  async function toggleSales() {
    if (!showSales && !sales) {
      const s = await api.getSales(p.id)
      setSales(s)
    }
    setShowSales(v => !v)
  }

  async function deleteSale(id: string) {
    await api.deleteSale(id)
    setSales(s => s?.filter(x => x.id !== id) ?? null)
  }

  return (
    <>
      <tr className="border-b border-gray-800/50 text-xs hover:bg-gray-800/20">
        <td className="py-2 font-medium">{p.game}</td>
        <td className="py-2">{p.set_name}</td>
        <td className="py-2 text-gray-400">{p.product_type}</td>
        <td className="text-right py-2">{p.date_purchased}</td>
        <td className="text-right py-2">{p.qty_purchased}</td>
        <td className="text-right py-2">${p.cost_per_unit.toFixed(2)}</td>
        <td className="text-right py-2">{p.market_price_at_purchase ? `$${p.market_price_at_purchase.toFixed(2)}` : '—'}</td>
        <td className="text-right py-2">{p.current_market_price ? `$${p.current_market_price.toFixed(2)}` : '—'}</td>
        <td className="text-right py-2">{p.qty_remaining}</td>
        <td className="text-right py-2">{p.qty_sold}</td>
        <td className="py-2">
          <div className="flex gap-1 justify-end">
            <button onClick={onEdit} className="text-blue-400 hover:text-blue-300 px-1">Edit</button>
            {p.qty_remaining > 0 && (
              <button onClick={onSale} className="text-green-400 hover:text-green-300 px-1">Sell</button>
            )}
            {p.qty_sold > 0 && (
              <button onClick={toggleSales} className="text-gray-400 hover:text-white px-1">
                {showSales ? 'Hide' : 'Sales'}
              </button>
            )}
            <button onClick={onDelete} className="text-red-400 hover:text-red-300 px-1">Del</button>
          </div>
        </td>
      </tr>
      {showSales && sales && sales.length > 0 && (
        <tr className="bg-gray-800/20">
          <td colSpan={11} className="px-4 pb-3">
            <table className="w-full text-xs mt-2">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-left">Date Sold</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Price/Unit</th>
                  <th className="text-right">Total</th>
                  <th className="text-left">Platform</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sales.map(s => (
                  <tr key={s.id}>
                    <td>{s.date_sold}</td>
                    <td className="text-right">{s.qty_sold}</td>
                    <td className="text-right">{fmtUSD(s.price_per_unit)}</td>
                    <td className="text-right">{fmtUSD(s.total_value)}</td>
                    <td>{s.platform ?? '—'}</td>
                    <td className="text-right">
                      <button
                        onClick={() => deleteSale(s.id)}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        Del
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  )
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(!!getToken())
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [editId, setEditId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [saleFor, setSaleFor] = useState<Purchase | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  async function load() {
    setLoading(true)
    try { setPurchases(await api.getPurchases()) }
    catch (e) { setErr((e as Error).message) }
    finally { setLoading(false) }
  }

  useEffect(() => { if (authed) load() }, [authed])

  if (!authed) return <TokenGate onAuth={() => setAuthed(true)} />
  if (loading) return <div className="text-gray-400">Loading...</div>

  const editing = editId ? purchases.find(p => p.id === editId) : null

  async function handleCreate(data: PurchaseInput) {
    await api.createPurchase(data)
    setShowCreate(false)
    load()
  }

  async function handleUpdate(data: PurchaseInput) {
    if (!editId) return
    await api.updatePurchase(editId, data)
    setEditId(null)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this purchase and all its sales?')) return
    await api.deletePurchase(id)
    load()
  }

  async function handleSale(purchase: Purchase, data: SaleInput) {
    await api.createSale(purchase.id, data)
    setSaleFor(null)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-yellow-400">Admin — Purchase Ledger</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowCreate(true); setEditId(null) }}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-4 py-2 rounded text-sm"
          >
            + Add Purchase
          </button>
          <button
            onClick={() => { localStorage.removeItem('challenge_admin_token'); setAuthed(false) }}
            className="text-gray-400 hover:text-white text-sm px-3"
          >
            Logout
          </button>
        </div>
      </div>

      {err && <p className="text-red-400">{err}</p>}

      {showCreate && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-yellow-400 mb-4">New Purchase</h2>
          <PurchaseForm
            initial={EMPTY_PURCHASE}
            onSave={handleCreate}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {editing && (
        <div className="bg-gray-900 border border-yellow-700 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-yellow-400 mb-4">Edit Purchase</h2>
          <PurchaseForm
            initial={{
              tcgplayer_product_id: editing.tcgplayer_product_id,
              game: editing.game,
              set_name: editing.set_name,
              product_type: editing.product_type,
              date_purchased: editing.date_purchased,
              qty_purchased: editing.qty_purchased,
              cost_per_unit: editing.cost_per_unit,
              market_price_at_purchase: editing.market_price_at_purchase,
              distribution_price: editing.distribution_price,
              current_market_price: editing.current_market_price,
              notes: editing.notes,
            }}
            onSave={handleUpdate}
            onCancel={() => setEditId(null)}
          />
        </div>
      )}

      {saleFor && (
        <SaleForm
          purchase={saleFor}
          onSave={data => handleSale(saleFor, data)}
          onCancel={() => setSaleFor(null)}
        />
      )}

      <div className="overflow-x-auto bg-gray-900 border border-gray-800 rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="text-gray-400 text-xs border-b border-gray-800">
              <th className="text-left px-3 py-2">Game</th>
              <th className="text-left px-3 py-2">Set</th>
              <th className="text-left px-3 py-2">Type</th>
              <th className="text-right px-3 py-2">Date</th>
              <th className="text-right px-3 py-2">Qty</th>
              <th className="text-right px-3 py-2">Cost/U</th>
              <th className="text-right px-3 py-2">Mkt@Buy</th>
              <th className="text-right px-3 py-2">Cur Mkt</th>
              <th className="text-right px-3 py-2">Remain</th>
              <th className="text-right px-3 py-2">Sold</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="px-3">
            {purchases.map(p => (
              <PurchaseRow
                key={p.id}
                p={p}
                onEdit={() => { setEditId(p.id); setShowCreate(false); setSaleFor(null) }}
                onDelete={() => handleDelete(p.id)}
                onSale={() => { setSaleFor(p); setShowCreate(false); setEditId(null) }}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
