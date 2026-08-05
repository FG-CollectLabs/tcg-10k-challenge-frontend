import { useEffect, useState } from 'react'
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged } from '../firebase'
import type { User } from '../firebase'
import api, { Purchase, Sale, PurchaseInput, SaleInput, GameOption, PurchaseSource } from '../api/client'

function fmtUSD(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function SignInPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignIn() {
    setLoading(true)
    setError('')
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-24">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center space-y-4">
        <div className="text-3xl">📊</div>
        <h2 className="text-xl font-bold text-yellow-400">Admin Access</h2>
        <p className="text-sm text-gray-400">Sign in with your Google account to manage purchases and sales.</p>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 disabled:opacity-50 text-gray-900 font-semibold py-3 px-4 rounded-lg text-sm transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? 'Signing in…' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  )
}

const EMPTY_PURCHASE: PurchaseInput = {
  tcgplayer_product_id: null,
  game: '',
  set_name: '',
  product_type: 'Booster Box',
  purchase_source: null,
  purchase_source_detail: null,
  date_purchased: new Date().toISOString().slice(0, 10),
  qty_purchased: 1,
  cost_per_unit: 0,
  market_price_at_purchase: null,
  distribution_price: null,
  current_market_price: null,
  notes: null,
}

const SOURCE_CAT_LABELS: Record<string, string> = {
  paywall_access: 'Paywall Access',
  in_person: 'In Person',
  online_shipped: 'Online Shipped',
}

function PurchaseForm({
  initial,
  onSave,
  onCancel,
  gameOptions,
  purchaseSources,
}: {
  initial: PurchaseInput
  onSave: (data: PurchaseInput) => Promise<void>
  onCancel: () => void
  gameOptions: GameOption[]
  purchaseSources: PurchaseSource[]
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
  const sel = (val: string, onChange: (v: string) => void, children: React.ReactNode) => (
    <select
      className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm"
      value={val}
      onChange={e => onChange(e.target.value)}
    >
      {children}
    </select>
  )

  const cats = ['paywall_access', 'in_person', 'online_shipped'] as const

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {field('Game *',
          sel(form.game, v => set('game', v),
            <>
              <option value="">— select game —</option>
              {gameOptions.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
            </>
          )
        )}
        {field('Set Name *', inp('text', form.set_name, v => set('set_name', v), true))}
        {field('Product Type *',
          sel(form.product_type, v => set('product_type', v),
            ['Booster Box', 'Booster Box Case', 'Elite Trainer Box', 'Elite Trainer Box Case', 'Collection Box', 'Collection Box Case', 'Preconstructed Deck', 'Commander Deck', 'Commander Deck Display', 'Booster Bundle', 'Loose Packs', 'Blister Pack', 'Other']
              .map(v => <option key={v}>{v}</option>)
          )
        )}
        {field('Purchase Source',
          sel(form.purchase_source ?? '', v => {
            set('purchase_source', v || null)
            if (v !== 'LGS') set('purchase_source_detail', null)
          },
            <>
              <option value="">— select source —</option>
              {cats.map(cat => {
                const srcs = purchaseSources.filter(s => s.category === cat)
                if (srcs.length === 0) return null
                return (
                  <optgroup key={cat} label={SOURCE_CAT_LABELS[cat]}>
                    {srcs.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </optgroup>
                )
              })}
            </>
          )
        )}
        {form.purchase_source === 'LGS' && field('Which LGS?',
          inp('text', form.purchase_source_detail ?? '', v => set('purchase_source_detail', v || null))
        )}
        {field('Date Purchased *', inp('date', form.date_purchased, v => set('date_purchased', v), true))}
        {field('Qty *', inp('number', form.qty_purchased, v => set('qty_purchased', parseInt(v) || 0), true))}
        {field('Cost / Unit *', inp('number', form.cost_per_unit, v => set('cost_per_unit', parseFloat(v) || 0), true))}
        {field('Market Price @ Purchase', inp('number', form.market_price_at_purchase ?? '', v => set('market_price_at_purchase', numOrNull(v))))}
        {field('Distribution Price', inp('number', form.distribution_price ?? '', v => set('distribution_price', numOrNull(v))))}
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

  const sourceLabel = p.purchase_source
    ? p.purchase_source_detail ? `${p.purchase_source} — ${p.purchase_source_detail}` : p.purchase_source
    : '—'

  return (
    <>
      <tr className="border-b border-gray-800/50 text-xs hover:bg-gray-800/20">
        <td className="py-2 font-medium">{p.game}</td>
        <td className="py-2">{p.set_name}</td>
        <td className="py-2 text-gray-400">{p.product_type}</td>
        <td className="py-2 text-gray-400">{sourceLabel}</td>
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
          <td colSpan={12} className="px-4 pb-3">
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
                      <button onClick={() => deleteSale(s.id)} className="text-red-400 hover:text-red-300 text-xs">Del</button>
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

function ConfigManager({
  games,
  sources,
  onRefresh,
}: {
  games: GameOption[]
  sources: PurchaseSource[]
  onRefresh: () => void
}) {
  const [open, setOpen] = useState(false)
  const [newGame, setNewGame] = useState('')
  const [newSrc, setNewSrc] = useState({ name: '', category: 'online_shipped' })
  const [busy, setBusy] = useState(false)

  async function addGame() {
    if (!newGame.trim()) return
    setBusy(true)
    try { await api.createGameOption(newGame.trim()); setNewGame(''); onRefresh() }
    finally { setBusy(false) }
  }

  async function removeGame(id: string) {
    if (!confirm('Remove this game from the list?')) return
    await api.deleteGameOption(id); onRefresh()
  }

  async function addSource() {
    if (!newSrc.name.trim()) return
    setBusy(true)
    try { await api.createPurchaseSource(newSrc); setNewSrc(s => ({ ...s, name: '' })); onRefresh() }
    finally { setBusy(false) }
  }

  async function removeSource(id: string) {
    if (!confirm('Remove this source from the list?')) return
    await api.deletePurchaseSource(id); onRefresh()
  }

  const cats = ['paywall_access', 'in_person', 'online_shipped'] as const

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-300 hover:text-white"
      >
        <span>Manage Lists</span>
        <span className="text-gray-500">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-5 pt-4 border-t border-gray-800 grid md:grid-cols-2 gap-8">
          {/* Games */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-yellow-400">Games</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {games.map(g => (
                <div key={g.id} className="flex items-center justify-between text-sm py-0.5">
                  <span>{g.name}</span>
                  <button onClick={() => removeGame(g.id)}
                    className="text-red-400 hover:text-red-300 text-xs px-1">✕</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
                placeholder="New game name"
                value={newGame}
                onChange={e => setNewGame(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addGame())}
              />
              <button onClick={addGame} disabled={busy || !newGame.trim()}
                className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-semibold px-3 py-1 rounded text-sm">
                Add
              </button>
            </div>
          </div>

          {/* Purchase Sources */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-yellow-400">Purchase Sources</h3>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {cats.map(cat => {
                const catSrcs = sources.filter(s => s.category === cat)
                if (catSrcs.length === 0) return null
                return (
                  <div key={cat}>
                    <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">{SOURCE_CAT_LABELS[cat]}</div>
                    {catSrcs.map(s => (
                      <div key={s.id} className="flex items-center justify-between text-sm py-0.5 pl-2">
                        <span>{s.name}</span>
                        <button onClick={() => removeSource(s.id)}
                          className="text-red-400 hover:text-red-300 text-xs px-1">✕</button>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
            <div className="space-y-2">
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
                placeholder="New source name"
                value={newSrc.name}
                onChange={e => setNewSrc(s => ({ ...s, name: e.target.value }))}
              />
              <div className="flex gap-2">
                <select
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
                  value={newSrc.category}
                  onChange={e => setNewSrc(s => ({ ...s, category: e.target.value }))}
                >
                  <option value="paywall_access">Paywall Access</option>
                  <option value="in_person">In Person</option>
                  <option value="online_shipped">Online Shipped</option>
                </select>
                <button onClick={addSource} disabled={busy || !newSrc.name.trim()}
                  className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-semibold px-3 py-1 rounded text-sm">
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AdminDashboard({ user }: { user: User }) {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [gameOptions, setGameOptions] = useState<GameOption[]>([])
  const [purchaseSources, setPurchaseSources] = useState<PurchaseSource[]>([])
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

  async function loadConfig() {
    try {
      const [games, sources] = await Promise.all([api.getGameOptions(), api.getPurchaseSources()])
      setGameOptions(games)
      setPurchaseSources(sources)
    } catch {}
  }

  useEffect(() => { load(); loadConfig() }, [])

  if (loading) return <div className="text-gray-400">Loading…</div>

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
        <div>
          <h1 className="text-xl font-bold text-yellow-400">Admin — Purchase Ledger</h1>
          <p className="text-xs text-gray-500 mt-0.5">Signed in as {user.email}</p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => { setShowCreate(true); setEditId(null) }}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-4 py-2 rounded text-sm"
          >
            + Add Purchase
          </button>
          <button
            onClick={() => signOut(auth)}
            className="text-gray-400 hover:text-white text-sm px-3 py-2"
          >
            Sign out
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
            gameOptions={gameOptions}
            purchaseSources={purchaseSources}
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
              purchase_source: editing.purchase_source,
              purchase_source_detail: editing.purchase_source_detail,
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
            gameOptions={gameOptions}
            purchaseSources={purchaseSources}
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
              <th className="text-left px-3 py-2">Source</th>
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
        {purchases.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">No purchases yet.</p>
        )}
      </div>

      <ConfigManager games={gameOptions} sources={purchaseSources} onRefresh={loadConfig} />
    </div>
  )
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u)
      setAuthLoading(false)
    })
    return unsub
  }, [])

  if (authLoading) return <div className="text-gray-400 p-8 text-center">Checking auth…</div>
  if (!user) return <SignInPage />
  return <AdminDashboard user={user} />
}
