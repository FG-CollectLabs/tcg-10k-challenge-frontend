const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8083'

function getToken(): string | null {
  return localStorage.getItem('challenge_admin_token')
}

async function request<T>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...opts, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export interface Purchase {
  id: string
  tcgplayer_product_id: string | null
  game: string
  set_name: string
  product_type: string
  date_purchased: string
  qty_purchased: number
  cost_per_unit: number
  market_price_at_purchase: number | null
  distribution_price: number | null
  current_market_price: number | null
  notes: string | null
  created_at: string
  updated_at: string
  // computed
  qty_sold: number
  qty_remaining: number
  total_sold_value: number
  realized_profit: number
  unrealized_value: number
  unrealized_profit: number
  discount_vs_market_pct: number | null
  premium_vs_distro_pct: number | null
}

export interface Sale {
  id: string
  purchase_id: string
  date_sold: string
  qty_sold: number
  price_per_unit: number
  total_value: number
  platform: string | null
  notes: string | null
  created_at: string
}

export interface Dashboard {
  start_date: string
  starting_capital: number
  goal: number
  total_invested: number
  total_portfolio_value: number
  realized_profit: number
  total_account_value: number
  progress_pct: number
  overall_return_pct: number
  days_elapsed: number
  total_boxes: number
  best_performing_game: string
  milestones: { target: number; reached: boolean; date_reached: string | null }[]
}

export interface GameSummary {
  game: string
  box_count: number
  total_cost: number
  total_value: number
  avg_cost: number
  gain_pct: number
}

export interface MonthlyRow {
  month: string
  start_value: number
  end_value: number
  net_pl: number
  return_pct: number
}

export type PurchaseInput = Omit<Purchase, 'id' | 'created_at' | 'updated_at' | 'qty_sold' | 'qty_remaining' | 'total_sold_value' | 'realized_profit' | 'unrealized_value' | 'unrealized_profit' | 'discount_vs_market_pct' | 'premium_vs_distro_pct'>

export type SaleInput = Omit<Sale, 'id' | 'purchase_id' | 'total_value' | 'created_at'>

const api = {
  getDashboard: () => request<Dashboard>('/v1/dashboard'),
  getPurchases: () => request<Purchase[]>('/v1/purchases'),
  createPurchase: (data: PurchaseInput) =>
    request<Purchase>('/v1/purchases', { method: 'POST', body: JSON.stringify(data) }),
  updatePurchase: (id: string, data: PurchaseInput) =>
    request<Purchase>(`/v1/purchases/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePurchase: (id: string) =>
    request<void>(`/v1/purchases/${id}`, { method: 'DELETE' }),
  getSales: (purchaseId: string) => request<Sale[]>(`/v1/purchases/${purchaseId}/sales`),
  createSale: (purchaseId: string, data: SaleInput) =>
    request<Sale>(`/v1/purchases/${purchaseId}/sales`, { method: 'POST', body: JSON.stringify(data) }),
  deleteSale: (id: string) =>
    request<void>(`/v1/sales/${id}`, { method: 'DELETE' }),
  getGames: () => request<GameSummary[]>('/v1/games'),
  getMonthly: () => request<MonthlyRow[]>('/v1/monthly'),
}

export { getToken }
export default api
