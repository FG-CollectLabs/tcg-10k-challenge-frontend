import { useEffect, useState } from 'react'
import api, { Dashboard, GameSummary, MonthlyRow, Purchase } from '../api/client'

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}
function fmtUSD(n: number) {
  return '$' + fmt(n)
}
function fmtPct(n: number | null) {
  if (n == null) return '—'
  const c = n >= 0 ? 'text-green-400' : 'text-red-400'
  return <span className={c}>{n >= 0 ? '+' : ''}{fmt(n)}%</span>
}
function fmtPL(n: number) {
  const c = n >= 0 ? 'text-green-400' : 'text-red-400'
  return <span className={c}>{n >= 0 ? '+' : ''}{fmtUSD(n)}</span>
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </div>
  )
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{fmtUSD(value)}</span>
        <span className="text-gray-400">{fmt(pct, 1)}% of {fmtUSD(max)}</span>
      </div>
      <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-yellow-500 to-green-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function MilestoneLadder({ milestones }: { milestones: Dashboard['milestones'] }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {milestones.map(m => (
        <div
          key={m.target}
          className={`text-center rounded p-2 text-xs font-medium border ${
            m.reached
              ? 'bg-green-900/40 border-green-700 text-green-300'
              : 'bg-gray-800 border-gray-700 text-gray-500'
          }`}
        >
          <div className="font-bold">{m.reached ? '✓' : '○'}</div>
          <div>${(m.target / 1000).toFixed(0)}K</div>
        </div>
      ))}
    </div>
  )
}

function GameTable({ games }: { games: GameSummary[] }) {
  const total = games.reduce((s, g) => s + g.total_value, 0)
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 border-b border-gray-800">
            <th className="text-left py-2">Game</th>
            <th className="text-right py-2">Boxes</th>
            <th className="text-right py-2">Cost Basis</th>
            <th className="text-right py-2">Market Value</th>
            <th className="text-right py-2">Gain/Loss</th>
            <th className="text-right py-2">% Gain</th>
          </tr>
        </thead>
        <tbody>
          {games.map(g => (
            <tr key={g.game} className="border-b border-gray-800/50 hover:bg-gray-800/30">
              <td className="py-2 font-medium">{g.game}</td>
              <td className="text-right py-2">{g.box_count}</td>
              <td className="text-right py-2">{fmtUSD(g.total_cost)}</td>
              <td className="text-right py-2">{fmtUSD(g.total_value)}</td>
              <td className="text-right py-2">{fmtPL(g.total_value - g.total_cost)}</td>
              <td className="text-right py-2">{fmtPct(g.gain_pct)}</td>
            </tr>
          ))}
          <tr className="font-semibold text-yellow-400 border-t border-gray-700">
            <td className="py-2">TOTAL</td>
            <td className="text-right py-2">{games.reduce((s, g) => s + g.box_count, 0)}</td>
            <td className="text-right py-2">{fmtUSD(games.reduce((s, g) => s + g.total_cost, 0))}</td>
            <td className="text-right py-2">{fmtUSD(total)}</td>
            <td className="text-right py-2">{fmtPL(total - games.reduce((s, g) => s + g.total_cost, 0))}</td>
            <td className="text-right py-2"></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function InventoryTable({ purchases }: { purchases: Purchase[] }) {
  const [sortCol, setSortCol] = useState<keyof Purchase>('date_purchased')
  const [sortAsc, setSortAsc] = useState(false)

  const sorted = [...purchases].sort((a, b) => {
    const av = a[sortCol] ?? 0
    const bv = b[sortCol] ?? 0
    return sortAsc ? (av < bv ? -1 : 1) : (av > bv ? -1 : 1)
  })

  function th(label: string, col: keyof Purchase) {
    const active = sortCol === col
    return (
      <th
        className="text-right py-2 cursor-pointer select-none hover:text-white"
        onClick={() => { setSortCol(col); setSortAsc(active ? !sortAsc : false) }}
      >
        {label}{active ? (sortAsc ? ' ↑' : ' ↓') : ''}
      </th>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400 border-b border-gray-800">
            <th className="text-left py-2">Game</th>
            <th className="text-left py-2">Set</th>
            <th className="text-left py-2">Type</th>
            <th className="text-right py-2">Date</th>
            <th className="text-right py-2">Qty</th>
            {th('Cost/Unit', 'cost_per_unit')}
            {th('Mkt@Buy', 'market_price_at_purchase')}
            {th('Cur Mkt', 'current_market_price')}
            <th className="text-right py-2">Disc vs Mkt</th>
            <th className="text-right py-2">vs Distro</th>
            {th('Unrealized P&L', 'unrealized_profit')}
            <th className="text-right py-2">Remaining</th>
            <th className="text-right py-2">Sold</th>
            {th('Realized P&L', 'realized_profit')}
          </tr>
        </thead>
        <tbody>
          {sorted.map(p => (
            <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
              <td className="py-1.5">{p.game}</td>
              <td className="py-1.5 max-w-[120px] truncate">{p.set_name}</td>
              <td className="py-1.5 text-gray-400">{p.product_type}</td>
              <td className="text-right py-1.5">{p.date_purchased}</td>
              <td className="text-right py-1.5">{p.qty_purchased}</td>
              <td className="text-right py-1.5">{fmtUSD(p.cost_per_unit)}</td>
              <td className="text-right py-1.5">{p.market_price_at_purchase ? fmtUSD(p.market_price_at_purchase) : '—'}</td>
              <td className="text-right py-1.5">{p.current_market_price ? fmtUSD(p.current_market_price) : '—'}</td>
              <td className="text-right py-1.5">{fmtPct(p.discount_vs_market_pct)}</td>
              <td className="text-right py-1.5">{fmtPct(p.premium_vs_distro_pct != null ? -p.premium_vs_distro_pct : null)}</td>
              <td className="text-right py-1.5">{fmtPL(p.unrealized_profit)}</td>
              <td className="text-right py-1.5">{p.qty_remaining}</td>
              <td className="text-right py-1.5">{p.qty_sold}</td>
              <td className="text-right py-1.5">{p.realized_profit !== 0 ? fmtPL(p.realized_profit) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MonthlyTable({ rows }: { rows: MonthlyRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 border-b border-gray-800">
            <th className="text-left py-2">Month</th>
            <th className="text-right py-2">Start</th>
            <th className="text-right py-2">End</th>
            <th className="text-right py-2">Net P&L</th>
            <th className="text-right py-2">Return %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.month} className="border-b border-gray-800/50">
              <td className="py-2">{r.month}</td>
              <td className="text-right py-2">{fmtUSD(r.start_value)}</td>
              <td className="text-right py-2">{fmtUSD(r.end_value)}</td>
              <td className="text-right py-2">{fmtPL(r.net_pl)}</td>
              <td className="text-right py-2">{fmtPct(r.return_pct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function PublicDashboard() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [games, setGames] = useState<GameSummary[]>([])
  const [monthly, setMonthly] = useState<MonthlyRow[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.getDashboard(),
      api.getPurchases(),
      api.getGames(),
      api.getMonthly(),
    ]).then(([d, p, g, m]) => {
      setDashboard(d)
      setPurchases(p)
      setGames(g)
      setMonthly(m)
    }).catch(e => setError(e.message))
  }, [])

  if (error) return <div className="text-red-400 p-4">{error}</div>
  if (!dashboard) return <div className="text-gray-400 p-4">Loading...</div>

  return (
    <div className="space-y-6">
      {/* Hero stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Portfolio Value', val: fmtUSD(dashboard.total_portfolio_value) },
          { label: 'Total Invested', val: fmtUSD(dashboard.total_invested) },
          { label: 'Realized P&L', val: fmtUSD(dashboard.realized_profit) },
          { label: 'Overall Return', val: `${dashboard.overall_return_pct >= 0 ? '+' : ''}${fmt(dashboard.overall_return_pct)}%` },
        ].map(s => (
          <Card key={s.label} title={s.label}>
            <div className="text-2xl font-bold text-yellow-400">{s.val}</div>
          </Card>
        ))}
      </div>

      {/* Progress */}
      <Card title="Challenge Progress">
        <ProgressBar value={dashboard.total_account_value} max={dashboard.goal} />
        <div className="mt-3 text-xs text-gray-400">
          Day {dashboard.days_elapsed} · {dashboard.total_boxes} boxes remaining · Best game: {dashboard.best_performing_game || '—'}
        </div>
      </Card>

      {/* Milestones */}
      <Card title="Milestone Ladder">
        <MilestoneLadder milestones={dashboard.milestones} />
      </Card>

      {/* By game */}
      <Card title="Performance by Game">
        <GameTable games={games} />
      </Card>

      {/* Inventory */}
      <Card title="Inventory Detail">
        <InventoryTable purchases={purchases} />
      </Card>

      {/* Monthly */}
      <Card title="Monthly Log">
        <MonthlyTable rows={monthly} />
      </Card>
    </div>
  )
}
