export interface Payslip {
  id: string
  year: number
  month: number
  gross: number
  net: number
  ganancias: number
  fx_rate: number
  notes: string | null
  net_gross_pct: number | null
  ganancias_pct: number | null
  net_usd: number
  gross_usd: number
}

export interface PayslipInput {
  year: number
  month: number
  gross: number
  net: number
  ganancias: number
  fx_rate: number
  notes: string | null
}

export interface SalaryRaise {
  id: string
  year: number
  month: number
  salary: number
  ipc_yoy: number | null
  notes: string | null
}

export interface SalaryRaiseInput {
  year: number
  month: number
  salary: number
  ipc_yoy: number | null
  notes: string | null
}
