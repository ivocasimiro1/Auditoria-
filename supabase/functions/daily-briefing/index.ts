import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'https://ubeqidccuvsjhjphybxz.supabase.co'
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const TG_TOKEN = '8640253196:AAEP0aWxhijWwLnjOefiKbATvNkcLF1JH2Y'
const TG_CHAT = '-5587765450'

const db = createClient(SUPABASE_URL, SUPABASE_KEY)

function fd(d: string): string {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function getRefDate(r: Record<string, unknown>): string {
  const sessoes = (r.sessoes as Array<{ dataVendas?: string }>) || []
  const dates = sessoes.map(s => s.dataVendas).filter(Boolean) as string[]
  if (dates.length) return [...dates].sort().pop()!
  if (r.dataDeposito) return r.dataDeposito as string
  if (r.criado_em) return (r.criado_em as string).split('T')[0]
  return ''
}

function totalValor(r: Record<string, unknown>): number {
  const sessoes = (r.sessoes as Array<{ valor?: string | number }>) || []
  return sessoes.reduce((s, x) => s + (parseFloat(String(x.valor || 0)) || 0), 0)
}

function daysBetween(d1: string, d2: string): number {
  return Math.floor((new Date(d2).getTime() - new Date(d1).getTime()) / 86400000)
}

Deno.serve(async () => {
  const { data: configs, error: cfgErr } = await db
    .from('dep_config')
    .select('*')
    .neq('store_id', 'super')

  if (cfgErr || !configs?.length) {
    return new Response('No stores', { status: 200 })
  }

  const { data: allRegs } = await db
    .from('dep_registos')
    .select('*')

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekAgoStr = weekAgo.toISOString().split('T')[0]

  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  const dayName = dayNames[today.getDay()]
  const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`

  let problemStores = 0
  let okStores = 0
  let totalWeekAmount = 0
  const storeBlocks: string[] = []

  for (const cfg of configs) {
    const storeId = cfg.store_id as string
    const storeName = (cfg.emp as string) || storeId

    const storeRegs = (allRegs || []).filter((r: Record<string, unknown>) => r.store_id === storeId)
    if (!storeRegs.length) continue

    // Weekly amount
    const weekAmount = storeRegs
      .filter((r: Record<string, unknown>) => r.dataDeposito && (r.dataDeposito as string) >= weekAgoStr)
      .reduce((sum: number, r: Record<string, unknown>) => sum + totalValor(r), 0)
    totalWeekAmount += weekAmount

    // Gap detection (saltos de depósito)
    const sortedR = [...storeRegs].sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
      getRefDate(a) < getRefDate(b) ? -1 : 1
    )
    const coveredDays = new Set(
      storeRegs.flatMap((r: Record<string, unknown>) =>
        ((r.sessoes as Array<{ dataVendas?: string }>) || [])
          .map(s => s.dataVendas)
          .filter(Boolean)
      )
    )
    const newestDep = sortedR
      .filter((r: Record<string, unknown>) => r.dataDeposito)
      .map((r: Record<string, unknown>) => getRefDate(r))
      .sort()
      .pop() || ''
    const oldestRef = sortedR.length ? getRefDate(sortedR[0]) : ''

    const gapDays: string[] = []
    if (newestDep && oldestRef && oldestRef < newestDep) {
      const di = new Date(oldestRef)
      const de = new Date(newestDep)
      while (di < de) {
        const ds = di.toISOString().split('T')[0]
        if (!coveredDays.has(ds)) gapDays.push(ds)
        di.setDate(di.getDate() + 1)
      }
    }

    // Overdue detection per tipo
    const tipoMap: Record<string, string[]> = {}
    for (const r of storeRegs) {
      const tipo = (r.tipo as string) || 'Sem tipo'
      const dep = r.dataDeposito as string | undefined
      if (!tipoMap[tipo]) tipoMap[tipo] = []
      if (dep) tipoMap[tipo].push(dep)
    }

    const errLines: string[] = []
    const warnLines: string[] = []
    const okLines: string[] = []

    for (const [tipo, dates] of Object.entries(tipoMap)) {
      const lastDep = [...dates].sort().pop() || ''
      if (!lastDep) {
        errLines.push(`  🔴 ${tipo} — sem depósito registado`)
      } else {
        const days = daysBetween(lastDep, todayStr)
        if (days >= 5) {
          errLines.push(`  🔴 ${tipo} — último ${fd(lastDep)} (${days}d atrás)`)
        } else if (days >= 3) {
          warnLines.push(`  ⚠️ ${tipo} — último ${fd(lastDep)} (${days}d atrás)`)
        } else {
          okLines.push(`  ✅ ${tipo} — em dia`)
        }
      }
    }

    const hasProblems = errLines.length > 0 || warnLines.length > 0 || gapDays.length > 0
    if (hasProblems) problemStores++
    else okStores++

    const lines: string[] = [`🏪 ${storeName.toUpperCase()}`]
    lines.push(...errLines, ...warnLines)

    if (gapDays.length) {
      const shown = gapDays.slice(0, 5).map(d => fd(d).slice(0, 5)).join(', ')
      const extra = gapDays.length > 5 ? ` (+${gapDays.length - 5})` : ''
      lines.push(`  ⛔ Salto: ${shown}${extra}`)
    }

    if (!hasProblems) {
      lines.push(`  ✅ Tudo em dia`)
    } else {
      lines.push(...okLines)
    }

    const weekFmt = weekAmount.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    lines.push(`  💶 Semana: €${weekFmt}`)

    storeBlocks.push(lines.join('\n'))
  }

  const totalFmt = totalWeekAmount.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const emoji = problemStores === 0 ? '🟢' : problemStores <= 1 ? '🟡' : '🔴'

  const msg = [
    `☀️ *BOM DIA — Relatório Depósitos*`,
    `📅 ${dayName}, ${dateStr} · 10:00`,
    ``,
    `━━━━━━━━━━━━━━━━`,
    storeBlocks.join('\n\n'),
    `━━━━━━━━━━━━━━━━`,
    `${emoji} ${problemStores} loja${problemStores !== 1 ? 's' : ''} com problemas · ${okStores} OK`,
    `💰 Total semana: €${totalFmt}`,
  ].join('\n')

  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT, text: msg, parse_mode: 'Markdown' }),
  })

  return new Response('OK', { status: 200 })
})
