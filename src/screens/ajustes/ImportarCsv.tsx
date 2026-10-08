import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, FileUp, TriangleAlert } from 'lucide-react'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Button } from '../../components/ui/Button'
import { Callout } from '../../components/ui/Callout'
import { Segmented, Toggle } from '../../components/ui/Form'
import { Amount } from '../../components/ui/Amount'
import { db, newId } from '../../db/db'
import { useAccounts, useCategories } from '../../db/queries'
import type { Transaction } from '../../db/types'
import { useApp } from '../../state/app'
import { pickFile } from '../../lib/backup'
import { buildRows, categoryHistory, decodeBytes, guessMapping, importHashes, parseCsv, possibleDuplicates, suggestCategory, type CsvMapping } from '../../lib/csv'
import { shortDate } from '../../lib/dates'
import { cn } from '../../lib/cn'
import { methodForAccount } from '../../features/quick-add/AccountPicker'
import { openMovimientos } from '../Movimientos'

const PREVIEW_LIMIT = 300

export function ImportarCsv() {
  const { showToast } = useApp()
  const accounts = useAccounts()
  const categories = useCategories()
  const allTx = useLiveQuery(() => db.transactions.toArray(), [])

  const [fileName, setFileName] = useState<string | null>(null)
  const [raw, setRaw] = useState<string[][] | null>(null)
  const [m, setM] = useState<CsvMapping | null>(null)
  const [accountId, setAccountId] = useState<string | undefined>(undefined)
  const [excluded, setExcluded] = useState<Set<number>>(new Set())
  const [included, setIncluded] = useState<Set<number>>(new Set())
  const [catOverride, setCatOverride] = useState<Map<number, string>>(new Map())
  const [existingHashes, setExistingHashes] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (accountId === undefined && accounts.length) setAccountId((accounts.find((a) => a.type === 'debit') ?? accounts[0]).id)
  }, [accounts, accountId])

  const choose = async () => {
    const file = await pickFile('.csv,text/csv,text/plain')
    if (!file) return
    const rows = parseCsv(decodeBytes(await file.arrayBuffer()))
    if (rows.length < 1 || Math.max(...rows.map((r) => r.length)) < 2) {
      showToast('No encontramos columnas en ese archivo. ¿Es un CSV?', { tone: 'error' })
      return
    }
    setFileName(file.name)
    setRaw(rows)
    setM(guessMapping(rows))
    setExcluded(new Set())
    setIncluded(new Set())
    setCatOverride(new Map())
  }

  const rows = useMemo(() => (raw && m ? buildRows(raw, m) : []), [raw, m])
  const hashes = useMemo(() => importHashes(rows, accountId), [rows, accountId])

  useEffect(() => {
    if (!hashes.length) return setExistingHashes(new Set())
    db.transactions
      .where('importHash')
      .anyOf(hashes)
      .toArray()
      .then((ts) => setExistingHashes(new Set(ts.map((t) => t.importHash!))))
  }, [hashes])

  const dupes = useMemo(() => possibleDuplicates(rows, allTx ?? []), [rows, allTx])
  const history = useMemo(() => categoryHistory(allTx ?? []), [allTx])

  const status = (i: number) => {
    const r = rows[i]
    if (r.error) return 'error'
    if (existingHashes.has(hashes[i])) return 'imported'
    if (dupes.has(r.index)) return 'dupe'
    return 'new'
  }
  const isChecked = (i: number) => {
    const s = status(i)
    if (s === 'error' || s === 'imported') return false
    if (s === 'dupe') return included.has(i)
    return !excluded.has(i)
  }
  const toggle = (i: number) => {
    const s = status(i)
    if (s === 'dupe') setIncluded((p) => toggleSet(p, i))
    else setExcluded((p) => toggleSet(p, i))
  }
  const categoryFor = (i: number) => catOverride.get(i) ?? suggestCategory(rows[i].description, rows[i].type, categories, history)

  const selected = rows.map((_, i) => i).filter(isChecked)
  const counts = {
    imported: rows.filter((_, i) => status(i) === 'imported').length,
    dupe: rows.filter((_, i) => status(i) === 'dupe').length,
    error: rows.filter((_, i) => status(i) === 'error').length,
  }

  const doImport = async () => {
    if (!selected.length) return
    setBusy(true)
    const now = Date.now()
    const acc = accounts.find((a) => a.id === accountId)
    const txs: Transaction[] = selected.map((i, n) => {
      const r = rows[i]
      const t: Transaction = {
        id: newId(),
        type: r.type,
        amount: r.amount,
        date: r.date!,
        categoryId: categoryFor(i),
        note: r.description || undefined,
        importHash: hashes[i],
        createdAt: now + n,
        updatedAt: now + n,
      }
      if (acc) {
        t.accountId = acc.id
        t.method = methodForAccount(acc)
      }
      if (!t.note) delete t.note
      return t
    })
    await db.transactions.bulkAdd(txs)
    const dates = txs.map((t) => t.date).sort()
    setBusy(false)
    showToast(`Se importaron ${txs.length} movimientos`)
    openMovimientos({ period: { kind: 'range', from: dates[0], to: dates[dates.length - 1] } })
  }

  const header = raw && m?.hasHeader ? raw[0] : null
  const colOptions = raw
    ? Array.from({ length: Math.max(...raw.map((r) => r.length)) }, (_, c) => {
        const sample = (m?.hasHeader ? raw[1] : raw[0])?.[c] ?? ''
        return { value: c, label: header?.[c] ? `${header[c]} (${sample.slice(0, 18)})` : `Columna ${c + 1}: ${sample.slice(0, 22)}` }
      })
    : []

  return (
    <>
      <ScreenHeader title="Importar del banco" back="/ajustes/respaldo" />
      <div className="space-y-5 px-4">
        {!raw ? (
          <>
            <Callout title="Cómo conseguir el archivo">
              En la app o el portal de tu banco, busca tus movimientos y descárgalos como CSV (a veces dice "Exportar" o "Descargar a Excel"). Luego guárdalo en Archivos.
            </Callout>
            <Button size="lg" block icon={<FileUp size={19} />} onClick={choose}>
              Elegir archivo CSV
            </Button>
            <p className="text-sm text-muted">Antes de importar podrás revisar cada movimiento. Los que ya importaste antes se saltan solos.</p>
          </>
        ) : (
          m && (
            <>
              <div className="flex items-center gap-3">
                <p className="min-w-0 flex-1 truncate text-sm">
                  <span className="font-bold">{fileName}</span>
                  <span className="text-muted"> con {rows.length} filas</span>
                </p>
                <Button size="sm" variant="secondary" onClick={choose}>
                  Cambiar
                </Button>
              </div>

              <section className="card space-y-4 p-4">
                <h2 className="text-base font-extrabold">Columnas</h2>
                <Toggle checked={m.hasHeader} onChange={(hasHeader) => setM({ ...m, hasHeader })} label="La primera fila son títulos" />
                <ColSelect label="Fecha" value={m.dateCol} options={colOptions} onChange={(dateCol) => setM({ ...m, dateCol })} />
                <ColSelect label="Descripción" value={m.descCol} options={colOptions} onChange={(descCol) => setM({ ...m, descCol })} />
                <div>
                  <p className="mb-1.5 text-sm font-bold">Montos</p>
                  <Segmented
                    value={m.amountMode}
                    onChange={(amountMode) => setM({ ...m, amountMode })}
                    options={[
                      { value: 'single', label: 'Una columna' },
                      { value: 'split', label: 'Cargo y abono' },
                    ]}
                  />
                </div>
                {m.amountMode === 'single' ? (
                  <>
                    <ColSelect label="Monto" value={m.amountCol} options={colOptions} onChange={(amountCol) => setM({ ...m, amountCol })} />
                    <div>
                      <p className="mb-1.5 text-sm font-bold">Los gastos aparecen</p>
                      <Segmented
                        value={m.expensesAre}
                        onChange={(expensesAre) => setM({ ...m, expensesAre })}
                        options={[
                          { value: 'negative', label: 'En negativo' },
                          { value: 'positive', label: 'En positivo' },
                        ]}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <ColSelect label="Cargo (gastos)" value={m.debitCol} options={colOptions} onChange={(debitCol) => setM({ ...m, debitCol })} />
                    <ColSelect label="Abono (ingresos)" value={m.creditCol} options={colOptions} onChange={(creditCol) => setM({ ...m, creditCol })} />
                  </>
                )}
                <div>
                  <p className="mb-1.5 text-sm font-bold">Las fechas vienen como</p>
                  <Segmented
                    value={m.dateFormat}
                    onChange={(dateFormat) => setM({ ...m, dateFormat })}
                    options={[
                      { value: 'dmy', label: 'Día/mes/año' },
                      { value: 'mdy', label: 'Mes/día/año' },
                    ]}
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-sm font-bold">Cuenta</p>
                  <div className="flex flex-wrap gap-2">
                    {accounts.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        aria-pressed={a.id === accountId}
                        onClick={() => setAccountId(a.id)}
                        className={cn('h-11 rounded-full border px-4 text-sm font-semibold', a.id === accountId ? 'border-accent bg-accent-soft text-accent-press' : 'border-line bg-bg')}
                      >
                        {a.name}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-base font-extrabold">Vista previa</h2>
                <p className="mb-3 text-sm text-muted">
                  Se importarán <strong className="text-ink">{selected.length}</strong> de {rows.length}.
                  {counts.imported > 0 && ` ${counts.imported} ya estaban importados.`}
                  {counts.dupe > 0 && ` ${counts.dupe} parecen duplicados de lo que registraste a mano (desmarcados).`}
                  {counts.error > 0 && ` ${counts.error} no se pudieron leer.`}
                </p>
                <ul className="divide-y divide-line overflow-hidden rounded-card border border-line">
                  {rows.slice(0, PREVIEW_LIMIT).map((r, i) => {
                    const s = status(i)
                    const on = isChecked(i)
                    const disabled = s === 'error' || s === 'imported'
                    return (
                      <li key={i} className={cn('flex items-start gap-3 px-3 py-3', disabled && 'opacity-55')}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={on}
                          aria-label={on ? 'Quitar de la importación' : 'Incluir en la importación'}
                          disabled={disabled}
                          onClick={() => toggle(i)}
                          className="-m-2 flex size-11 shrink-0 items-center justify-center"
                        >
                          <span className={cn('flex size-6 items-center justify-center rounded-md border-2', on ? 'border-accent bg-accent text-white' : 'border-line bg-bg')}>
                            {on && <Check size={15} strokeWidth={3} />}
                          </span>
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="truncate text-sm font-bold">{r.description || 'Sin descripción'}</p>
                            <Amount cents={r.type === 'expense' ? -r.amount : r.amount} sign={r.type === 'income'} tone={r.type === 'income' ? 'pos' : 'ink'} className="shrink-0 text-sm font-extrabold" />
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="shrink-0 text-xs text-muted">{r.date ? shortDate(r.date) : (raw[(m.hasHeader ? 1 : 0) + i]?.[m.dateCol] ?? '')}</span>
                            {s === 'new' || s === 'dupe' ? (
                              <select
                                value={categoryFor(i) ?? ''}
                                onChange={(e) => setCatOverride((p) => new Map(p).set(i, e.target.value))}
                                aria-label="Categoría"
                                className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 text-[16px] font-semibold"
                              >
                                {categories
                                  .filter((c) => c.kind === r.type)
                                  .map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>
                                  ))}
                              </select>
                            ) : null}
                          </div>
                          {s === 'dupe' && <Badge tone="warn">Posible duplicado</Badge>}
                          {s === 'imported' && <Badge tone="info">Ya importado</Badge>}
                          {s === 'error' && <Badge tone="neg">{r.error}</Badge>}
                        </div>
                      </li>
                    )
                  })}
                </ul>
                {rows.length > PREVIEW_LIMIT && <p className="mt-2 text-xs text-muted">Se muestran las primeras {PREVIEW_LIMIT} filas; todas las marcadas se importarán.</p>}
              </section>

              {selected.length === 0 && rows.length > 0 && counts.error === rows.length && (
                <Callout tone="warn" icon={TriangleAlert}>
                  Ninguna fila se pudo leer. Revisa qué columna es la fecha y el formato de fecha.
                </Callout>
              )}

              <div className="sticky bottom-0 -mx-4 bg-bg/95 px-4 pt-2 pb-3 backdrop-blur-md">
                <Button size="lg" block disabled={!selected.length || busy} onClick={doImport}>
                  {selected.length ? `Importar ${selected.length} ${selected.length === 1 ? 'movimiento' : 'movimientos'}` : 'Nada que importar'}
                </Button>
              </div>
            </>
          )
        )}
      </div>
    </>
  )
}

function toggleSet(s: Set<number>, i: number) {
  const n = new Set(s)
  if (n.has(i)) n.delete(i)
  else n.add(i)
  return n
}

function ColSelect({ label, value, options, onChange }: { label: string; value: number; options: Array<{ value: number; label: string }>; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold">{label}</span>
      <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-12 w-full rounded-2xl border border-line bg-bg px-3 text-base font-semibold">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function Badge({ tone, children }: { tone: 'warn' | 'info' | 'neg'; children: React.ReactNode }) {
  return (
    <span className={cn('mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold', tone === 'warn' ? 'bg-warn-soft text-warn-ink' : tone === 'neg' ? 'bg-neg-soft text-neg-ink' : 'bg-info text-info-ink')}>
      {children}
    </span>
  )
}
