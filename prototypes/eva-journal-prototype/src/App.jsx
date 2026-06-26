import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Button, IconButton, Table3, Icon, Select2, Menu, useToast, Drawer } from '@economic/taco'
import { rows as initialRows, logoVariations, invoiceData, fmt, suggestionSeed, workflowSuggestionSeed, entryWorkflowSuggestion, evaLogSeed } from './data'
import TopNav from './components/TopNav'
import SideNav from './components/SideNav'
import Sidebar from './components/Sidebar'
import EvaDrawer from './components/eva/EvaDrawer'
import DocumentReminderView, { MISSING_DOC_ROWS } from './components/eva/DocumentReminderView'
import VatAnomalyView from './components/eva/VatAnomalyView'
import WorkflowDrawer from './components/eva/WorkflowDrawer'
import { EvaLogo, EvaLogoDefs } from './components/eva/EvaLogo'
import { SuggestedCell, EvaInput, EvaSelect2, renderAccountOptions } from './components/eva/evaCells'

// Danish display labels for the cell fields Eva makes suggestions on
const FIELD_LABELS = { konto: 'Konto', tekst: 'Tekst', modkonto: 'Modkonto', moms: 'Moms' }
// Default opening width for the page drawer (tabs scroll horizontally if narrow)
const PAGE_DRAWER_MIN_WIDTH = 400
// The doc-reminder artifact's automation, surfaced as a reviewable workflow
const DOC_REMINDER_AUTOMATION = {
  id: 'wf-doc-reminders',
  title: 'Send påmindelser for manglende bilag',
  triggerPill: 'Hver mandag kl. 09:00',
  actionPill: 'Send påmindelser for manglende bilag',
  reason: 'Du har sendt påmindelser manuelt flere gange. Jeg kan gøre det automatisk hver uge.',
  confidencePct: 96,
  timeSaved: '~10 min/md',
}
import './App.css'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarTab, setSidebarTab] = useState('document')
  const sidebarTabRef = useRef(sidebarTab)
  sidebarTabRef.current = sidebarTab
  const sidebarOpenRef = useRef(sidebarOpen)
  sidebarOpenRef.current = sidebarOpen
  const [sidebarTitle, setSidebarTitle] = useState('')
  const [activeRowIndex, setActiveRowIndex] = useState(null)
  const [sideNavCollapsed, setSideNavCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = sessionStorage.getItem('sidebarWidth')
    return saved ? Number(saved) : 400
  })
  const [evaWidth, setEvaWidth] = useState(() => {
    const saved = sessionStorage.getItem('evaWidth')
    return saved ? Number(saved) : 340
  })
  const [wfWidth, setWfWidth] = useState(() => {
    const saved = sessionStorage.getItem('wfWidth')
    return saved ? Number(saved) : 400
  })
  const sidebarWidthRef = useRef(sidebarWidth)
  sidebarWidthRef.current = sidebarWidth
  const [drilldownStack, setDrilldownStack] = useState([])
  const [selectedRows, setSelectedRows] = useState([])
  // Eva log: already-applied VAT fixes from the seeded log history — pre-applied
  // to the grid on load so the journal and the Eva log agree out of the box.
  const seededVatChanges = evaLogSeed
    .filter(e => e.kind === 'vat' && !e.reverted)
    .flatMap(e => (e.children || []).filter(c => !c.reverted))
  // Journal rows are lifted to state so inline edits + Eva-accepted suggestions persist
  const [rows, setRows] = useState(() =>
    initialRows.map(r => {
      const c = seededVatChanges.find(ch => ch.rowId === r.id)
      return c ? { ...r, [c.field]: c.to } : r
    })
  )
  // Eva: cell-level suggestion state + left/right drawer mode
  const [rowSuggestionState, setRowSuggestionState] = useState(suggestionSeed)
  const [evaOpen, setEvaOpen] = useState(false)
  // Context attached when Eva is asked from a specific cell or row — rendered as
  // a tag inside the chat input bar (mirrors the suggestion-concepts EvaInputCard).
  const [evaContext, setEvaContext] = useState(null)
  // Full-screen "artifact" Eva opens from a conversation (e.g. the doc-reminder
  // table). Non-null => the overlay covers everything right of the Eva drawer.
  const [artifactView, setArtifactView] = useState(null)
  // Opening an artifact (full-screen) closes any right-side drawer first.
  const openArtifact = useCallback((artifact) => {
    setWorkflowDrawer(null)
    setSidebarOpen(false)
    setArtifactView(artifact)
  }, [])
  // Track the taco Drawer outlet width → --right-drawer-width, so the full-screen
  // artifact can shrink to make room when a right drawer is open over it.
  const rightOutletRef = useRef(null)
  useEffect(() => {
    const el = rightOutletRef.current
    if (!el) return
    const update = () => document.documentElement.style.setProperty('--right-drawer-width', `${el.offsetWidth}px`)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // Doc-reminder rows live here so the chat quick action and the full-screen
  // artifact view share one source of truth for the "Påmindelse sendt" status.
  const [docReminderRows, setDocReminderRows] = useState(MISSING_DOC_ROWS)
  const sendDocReminders = useCallback((ids) => {
    let sent = []
    setDocReminderRows(prev => {
      const next = prev.map(r =>
        (!ids || ids.length === 0 || ids.includes(r.id)) ? { ...r, status: 'Påmindelse sendt' } : r
      )
      sent = prev.filter(r => (!ids || ids.length === 0 || ids.includes(r.id)) && r.status !== 'Påmindelse sendt')
      return next
    })
    if (sent.length) {
      logEvaAction({
        id: `log-rem-${Date.now()}`,
        date: nowStamp(),
        actor: 'Eva',
        icon: 'bell-solid',
        typeLabel: 'Association',
        kind: 'reminder',
        revertible: false,
        reverted: false,
        title: 'Påmindelser sendt',
        description: `Eva · ${sent.length} poster${sent.length === 1 ? 'ing' : 'inger'}`,
        children: sent.map(r => ({ id: `rem-${r.id}-${Date.now()}`, bilag: r.bilag, tekst: r.tekst, note: r.ansvarlig })),
      })
    }
  }, [])
  const reminderSentCount = docReminderRows.filter(r => r.status === 'Påmindelse sendt').length
  const remindersAllSent = reminderSentCount === docReminderRows.length
  // Whether the doc-reminder artifact has been turned into a recurring automation
  // (shared between the chat quick action and the full-screen view).
  const [artifactAutomated, setArtifactAutomated] = useState(false)
  const [drawerMode, setDrawerMode] = useState('entry') // 'entry' | 'page'
  const [dismissedWorkflows, setDismissedWorkflows] = useState([]) // ids removed from the page list
  // Standalone workflow drawer overlay (suggestion ↔ activated) + the set of
  // activated workflow keys (id || title) shared across every workflow surface.
  const [workflowDrawer, setWorkflowDrawer] = useState(null) // { workflow, activated } | null
  const [activatedWorkflowKeys, setActivatedWorkflowKeys] = useState(() => new Set())
  // Confirmation toasts via taco's ToastProvider
  const toast = useToast()
  const showToast = useCallback((msg) => toast.success(msg), [toast])
  // Track which rows have documents and which have pending requests
  const rowsWithoutDoc = new Set(['1', '4', '7', '10', '15'])
  const rowsWithSinglePage = new Set(['2', '5', '8', '11', '14', '17'])
  const [rowDocState, setRowDocState] = useState(() =>
    rows.reduce((acc, r) => { acc[r.id] = { hasDocument: !rowsWithoutDoc.has(r.id), requestSent: false }; return acc }, {})
  )

  const deleteDocument = useCallback((rowId) => {
    setRowDocState(prev => ({ ...prev, [rowId]: { ...prev[rowId], hasDocument: false } }))
  }, [])
  const uploadDocument = useCallback((rowId) => {
    setRowDocState(prev => ({ ...prev, [rowId]: { hasDocument: true, requestSent: false } }))
  }, [])
  const requestDocument = useCallback((rowId) => {
    setRowDocState(prev => ({ ...prev, [rowId]: { ...prev[rowId], requestSent: true } }))
  }, [])
  const cancelRequest = useCallback((rowId) => {
    setRowDocState(prev => ({ ...prev, [rowId]: { ...prev[rowId], requestSent: false } }))
  }, [])

  // ── Eva suggestion helpers ──────────────────────────────────────────────
  // Returns the pending suggestion for a cell only while it still "stands":
  // the cell is empty (konto fill) or its value still equals Eva's proposal
  // (tekst pre-fill). Once the user types something else, it's hidden.
  const pendingSuggestion = useCallback((row, field) => {
    const sug = rowSuggestionState[row.id]?.[field]
    if (!sug || sug.status !== 'pending') return null
    const cur = row[field]
    if (cur == null || cur === '' || String(cur) === String(sug.value)) return sug
    return null
  }, [rowSuggestionState])

  const acceptSuggestion = useCallback((rowId, field) => {
    const sug = rowSuggestionState[rowId]?.[field]
    if (!sug) return
    const row = rows.find(r => r.id === rowId)
    const prevValue = row ? row[field] : ''
    setRows(prev => prev.map(r => (r.id === rowId ? { ...r, [field]: sug.value } : r)))
    setRowSuggestionState(prev => ({
      ...prev,
      [rowId]: { ...prev[rowId], [field]: { ...prev[rowId][field], status: 'accepted' } },
    }))
    const label = FIELD_LABELS[field] || field
    logEvaAction({
      id: `log-sug-${rowId}-${field}-${Date.now()}`,
      date: nowStamp(),
      actor: 'Eva',
      icon: 'edit',
      typeLabel: 'Ændring',
      kind: 'suggestion',
      revertible: true,
      reverted: false,
      title: `${label} udfyldt`,
      description: `Eva · Bilag ${row?.bilag ?? ''}`,
      children: [{
        id: `sug-${rowId}-${field}-${Date.now()}`, rowId, bilag: row?.bilag, tekst: row?.tekst,
        field, fieldLabel: label, from: prevValue, to: sug.value, toLabel: sug.value, reverted: false,
      }],
    })
    // logEvaAction/nowStamp are declared below; referenced at call time (stable).
  }, [rowSuggestionState, rows]) // eslint-disable-line react-hooks/exhaustive-deps

  // Eva chat: which VAT-anomaly suggestions have been applied (shared by the
  // inline chat card and the artefact view so they stay in sync).
  const [appliedVatIds, setAppliedVatIds] = useState(() => new Set(seededVatChanges.map(c => c.id)))

  // Eva activity log — every action Eva performs, newest first (see EvaLog).
  const [evaLog, setEvaLog] = useState(evaLogSeed)
  const nowStamp = () => {
    const d = new Date()
    const p = (n) => String(n).padStart(2, '0')
    return `I dag ${p(d.getHours())}:${p(d.getMinutes())}`
  }
  const logEvaAction = useCallback((entry) => {
    setEvaLog(prev => [entry, ...prev])
  }, [])
  // Toggle a logged workflow's active/deactivated state straight from the log.
  const toggleWorkflowLog = useCallback((entryId) => {
    setEvaLog(prev => prev.map(e =>
      e.id === entryId ? { ...e, active: e.active === false } : e
    ))
  }, [])

  // Apply selected VAT (moms) anomaly fixes straight to the grid cells.
  const applyVatChanges = useCallback((changes) => {
    setRows(prev => prev.map(r => {
      const c = changes.find(ch => ch.rowId === r.id)
      return c ? { ...r, [c.field]: c.to } : r
    }))
    setAppliedVatIds(prev => {
      const next = new Set(prev)
      changes.forEach(c => next.add(c.id))
      return next
    })
    // Record the bulk (or single) fix as one revertible action in the Eva log.
    logEvaAction({
      id: `log-vat-${Date.now()}`,
      date: nowStamp(),
      actor: 'Eva',
      icon: 'edit',
      typeLabel: 'Ændring',
      kind: 'vat',
      revertible: true,
      reverted: false,
      title: changes.length > 1 ? 'Momskoder rettet' : 'Momskode rettet',
      description: changes.length > 1 ? `Eva · ${changes.length} posteringer` : `Eva · Bilag ${changes[0].bilag}`,
      children: changes.map(c => ({
        id: c.id, rowId: c.rowId, bilag: c.bilag, tekst: c.tekst,
        field: c.field, fieldLabel: 'Moms', from: c.from, to: c.to, toLabel: c.toLabel, reverted: false,
      })),
    })
  }, [logEvaAction])

  // Revert an Eva log action — a single event (childId given) or the whole
  // action (childId null). Field-change actions restore the grid cell from
  // `child.from`; VAT reverts also un-apply in the chat cards/artefact.
  const revertEvaLog = useCallback((entryId, childId = null) => {
    const entry = evaLog.find(e => e.id === entryId)
    if (!entry || !entry.revertible) return
    const targets = (entry.children || []).filter(c => !c.reverted && (childId == null || c.id === childId))
    if (!targets.length) return
    // Restore the affected journal cells (VAT + suggestion field changes).
    setRows(prev => prev.map(r => {
      const t = targets.find(c => c.rowId === r.id)
      return t && t.field ? { ...r, [t.field]: t.from } : r
    }))
    if (entry.kind === 'vat') {
      setAppliedVatIds(prev => {
        const next = new Set(prev)
        targets.forEach(c => next.delete(c.id))
        return next
      })
    } else if (entry.kind === 'suggestion') {
      setRowSuggestionState(prev => {
        const next = { ...prev }
        targets.forEach(c => {
          if (next[c.rowId]?.[c.field]) {
            next[c.rowId] = { ...next[c.rowId], [c.field]: { ...next[c.rowId][c.field], status: 'pending' } }
          }
        })
        return next
      })
    }
    // Mark the reverted events in the log (and the whole action if all are gone).
    const targetIds = new Set(targets.map(t => t.id))
    setEvaLog(prev => prev.map(e => {
      if (e.id !== entryId) return e
      const children = (e.children || []).map(c => targetIds.has(c.id) ? { ...c, reverted: true } : c)
      return { ...e, children, reverted: children.every(c => c.reverted) }
    }))
  }, [evaLog])

  const dismissSuggestion = useCallback((rowId, field) => {
    const sug = rowSuggestionState[rowId]?.[field]
    setRowSuggestionState(prev => {
      if (!prev[rowId]?.[field]) return prev
      return { ...prev, [rowId]: { ...prev[rowId], [field]: { ...prev[rowId][field], status: 'dismissed' } } }
    })
    // Retract Eva's pre-filled proposal (no-op for cells that were already empty)
    if (sug) {
      setRows(prev => prev.map(r => (
        r.id === rowId && String(r[field]) === String(sug.value) ? { ...r, [field]: '' } : r
      )))
    }
  }, [rowSuggestionState])

  // Count of cells still awaiting a decision — drives the page-level "Forslag (N)"
  const pendingSuggestionCount = useMemo(() => {
    let n = 0
    for (const r of rows) {
      const fields = rowSuggestionState[r.id]
      if (!fields) continue
      for (const f of Object.keys(fields)) {
        if (pendingSuggestion(r, f)) n++
      }
    }
    return n
  }, [rows, rowSuggestionState, pendingSuggestion])

  // Pending field suggestions for the row the (entry) drawer is showing
  const entrySuggestions = useMemo(() => {
    if (activeRowIndex === null) return []
    const row = rows[activeRowIndex]
    if (!row) return []
    const fields = rowSuggestionState[row.id]
    if (!fields) return []
    return Object.keys(fields)
      .filter(f => pendingSuggestion(row, f))
      .map(f => ({ ...fields[f], fieldKey: f, field: FIELD_LABELS[f] || f, rowId: row.id }))
  }, [activeRowIndex, rows, rowSuggestionState, pendingSuggestion])

  // Every pending field suggestion across the page (page drawer · "Felter der mangler")
  const pageFieldSuggestions = useMemo(() => {
    const out = []
    for (const r of rows) {
      const fields = rowSuggestionState[r.id]
      if (!fields) continue
      for (const f of Object.keys(fields)) {
        if (pendingSuggestion(r, f)) {
          out.push({ ...fields[f], fieldKey: f, field: `${FIELD_LABELS[f] || f} · bilag ${r.bilag}`, rowId: r.id })
        }
      }
    }
    return out
  }, [rows, rowSuggestionState, pendingSuggestion])

  const wfKey = (w) => (w?.id || w?.title || '')
  const isWorkflowActive = (w) => activatedWorkflowKeys.has(wfKey(w))
  // Page-wide automation suggestions still on offer (not yet dismissed or activated)
  const visibleWorkflows = useMemo(
    () => workflowSuggestionSeed.filter(w => !dismissedWorkflows.includes(w.id) && !activatedWorkflowKeys.has(w.id)),
    [dismissedWorkflows, activatedWorkflowKeys]
  )
  // Entry-level workflow promotion (hidden once dismissed or activated)
  const visibleEntryWorkflow = (!dismissedWorkflows.includes(entryWorkflowSuggestion.id) && !activatedWorkflowKeys.has(entryWorkflowSuggestion.id))
    ? entryWorkflowSuggestion
    : null

  const openSidebar = useCallback((rowIndex, tab, title) => {
    const row = rows[rowIndex]
    const wasAlreadyOpen = sidebarOpen
    // Coerce to a valid entry tab — guards against re-opening from page/workflow
    // mode (whose tab ids don't exist in entry mode) which would blank the panel.
    const entryTabs = ['document', 'log', 'forslag']
    const safeTab = entryTabs.includes(tab) ? tab : 'document'
    setDrawerMode('entry')
    setSidebarOpen(true)
    setSidebarTab(safeTab)
    setSidebarTitle(title || (row.bilag + ' - 01.01.25'))
    setActiveRowIndex(rowIndex)
    if (!wasAlreadyOpen && window.innerWidth < 1600) {
      setSideNavCollapsed(true)
    }
  }, [sidebarOpen, rows])

  // Page-level drawer (journal-wide suggestions); not tied to a single row.
  // It has 4 tabs (Log/Forslag/Automatiseringer/Afvigelser) that need ~470px to
  // sit on one line, so grow the drawer to that minimum when opening it.
  const openPageDrawer = useCallback(() => {
    setDrawerMode('page')
    setSidebarTab('forslag')
    setSidebarTitle('Daglig kassekladde')
    setSidebarOpen(true)
    setSidebarWidth(w => {
      const next = Math.max(w, PAGE_DRAWER_MIN_WIDTH)
      sessionStorage.setItem('sidebarWidth', next)
      return next
    })
    if (window.innerWidth < 1600) setSideNavCollapsed(true)
  }, [])

  // Workflow drawer overlay — stacks on top of the page drawer / artifact.
  // When it replaces an open right drawer, match that drawer's width so the
  // swap is seamless; otherwise keep the workflow drawer's own (persisted) width.
  // Match the right drawer it overtakes; otherwise (artifact / journal / chat)
  // open at the standard 400px default.
  const reviewWorkflow = useCallback((workflow) => {
    const wf = typeof workflow === 'string' ? { title: workflow } : (workflow || {})
    setWfWidth(sidebarOpenRef.current ? sidebarWidthRef.current : 400)
    setWorkflowDrawer({ workflow: wf, activated: false })
  }, [])
  const openActivatedWorkflow = useCallback((workflow) => {
    const wf = typeof workflow === 'string' ? { title: workflow } : (workflow || {})
    setWfWidth(sidebarOpenRef.current ? sidebarWidthRef.current : 400)
    setWorkflowDrawer({ workflow: wf, activated: true })
  }, [])
  const closeWorkflowDrawer = useCallback(() => setWorkflowDrawer(null), [])
  // Activate a workflow (instantly from a card, or from the review drawer's Aktivér).
  const activateWorkflow = useCallback((workflow) => {
    const wf = typeof workflow === 'string' ? { title: workflow } : (workflow || {})
    const key = wf.id || wf.title || ''
    setActivatedWorkflowKeys(prev => { const next = new Set(prev); next.add(key); return next })
    if (wf.id === 'wf-doc-reminders') setArtifactAutomated(true)
    setWorkflowDrawer(null)
    showToast(`Workflow "${wf.title || ''}" aktiveret`)
  }, [showToast])

  const dismissWorkflow = useCallback((id) => {
    setDismissedWorkflows(prev => (prev.includes(id) ? prev : [...prev, id]))
  }, [])

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false)
    setSideNavCollapsed(false)
    setActiveRowIndex(null)
    setDrilldownStack([])
    setDrawerMode('entry')
  }, [])

  // Eva (left drawer) and the SideNav move together: opening Eva collapses the
  // SideNav (so the journal canvas isn't crowded), closing Eva expands it again.
  // Both state flips happen in the SAME handler, so React batches them into one
  // render and the two width transitions start on the exact same frame — no
  // stagger, no collision. (Previously the SideNav collapse ran in a reactive
  // useEffect, one render later, which made the two animations begin a frame
  // apart.) The user can still manually re-expand the nav via the strip.
  const doOpenEva = useCallback(() => { setEvaOpen(true); setSideNavCollapsed(true) }, [])
  // General ask (SideNav button, empty-state, suggestion-card asks): no context tag.
  const openEva = useCallback(() => { setEvaContext(null); doOpenEva() }, [doOpenEva])
  // Cell-level ask: tag references the field (and Eva's value when available).
  const askEvaFromCell = useCallback((row, fieldKey, sug) => {
    setEvaContext({
      kind: 'cell',
      field: FIELD_LABELS[fieldKey] || fieldKey,
      detail: sug?.value || (row?.[fieldKey] ?? '') || `bilag ${row?.bilag}`,
    })
    doOpenEva()
  }, [doOpenEva])
  // Row-level ask: tag references the posting (bilag + text).
  const askEvaFromRow = useCallback((row) => {
    setEvaContext({ kind: 'row', bilag: row?.bilag, tekst: row?.tekst })
    doOpenEva()
  }, [doOpenEva])
  const closeEva = useCallback(() => { setEvaOpen(false); setSideNavCollapsed(false); setArtifactView(null) }, [])
  const toggleEva = () => {
    const next = !evaOpen
    setEvaContext(null)
    setEvaOpen(next)
    setSideNavCollapsed(next)
    if (!next) setArtifactView(null)
  }

  useEffect(() => {
    const handler = (e) => {
      if (e.metaKey && !e.shiftKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault()
        if (sidebarOpen && drawerMode === 'entry') {
          setSidebarTab('document')
        } else {
          const activeRow = document.querySelector('tr[data-row-active="true"]')
          const idx = activeRow ? Number(activeRow.getAttribute('data-row-index')) : 0
          openSidebar(idx, 'document', null)
        }
        return
      }
      if (e.metaKey && !e.shiftKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault()
        if (sidebarOpen && drawerMode === 'entry') {
          setSidebarTab('log')
        } else {
          const activeRow = document.querySelector('tr[data-row-active="true"]')
          const idx = activeRow ? Number(activeRow.getAttribute('data-row-index')) : 0
          openSidebar(idx, 'log', null)
        }
        return
      }
      if (e.key === 'Escape' && sidebarOpen) { closeSidebar(); return }
      if (e.metaKey && (e.key === 'e' || e.key === 'E') && !e.shiftKey) {
        e.preventDefault()
        const editBtn = document.querySelector('button[aria-checked]')
        if (editBtn) editBtn.click()
        return
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [sidebarOpen, drawerMode, activeRowIndex, sidebarTab, closeSidebar, openSidebar])

  const activeInv = useMemo(() => activeRowIndex !== null ? invoiceData[activeRowIndex % invoiceData.length] : null, [activeRowIndex])
  const activeLogo = useMemo(() => activeRowIndex !== null ? logoVariations[activeRowIndex % logoVariations.length] : null, [activeRowIndex])
  const activeRowId = activeRowIndex !== null ? rows[activeRowIndex]?.id : null
  const activeDocState = activeRowId !== null ? rowDocState[activeRowId] : null
  const activePageCount = activeRowId !== null && !rowsWithSinglePage.has(activeRowId) ? 2 : 1

  const typeOptions = [
    { value: 'entry-type-journal-entry', label: 'Finansbilag', icon: 'entry-type-journal-entry' },
    { value: 'entry-type-customer-invoice', label: 'Kundefaktura', icon: 'entry-type-customer-invoice' },
    { value: 'entry-type-supplier-invoice', label: 'Lev.faktura', icon: 'entry-type-supplier-invoice' },
    { value: 'entry-type-supplier-payment', label: 'Lev.betaling', icon: 'entry-type-supplier-payment' },
    { value: 'entry-type-customer-payment', label: 'Kundeindbetaling', icon: 'entry-type-customer-payment' },
    { value: 'entry-type-manual-customer-invoice', label: 'Manuel kundefaktura', icon: 'entry-type-manual-customer-invoice' },
  ]

  const kontoOptions = [
    { value: '1021 - Salg af ydelser til udland', label: '1021 - Salg af ydelser til udland' },
    { value: '2800 - Annoncer og reklame', label: '2800 - Annoncer og reklame' },
    { value: '3411 - Husleje u/moms', label: '3411 - Husleje u/moms' },
    { value: '3604 - Edb-udgifter / software', label: '3604 - Edb-udgifter / software' },
    { value: '5820 - Bankkonto', label: '5820 - Bankkonto' },
    { value: '1020 - Salg af ydelser i DK', label: '1020 - Salg af ydelser i DK' },
    { value: '2710 - Småanskaffelser', label: '2710 - Småanskaffelser' },
    { value: '2740 - Telefon og internet', label: '2740 - Telefon og internet' },
    { value: '2750 - Porto og gebyrer', label: '2750 - Porto og gebyrer' },
    { value: '2729 - Sales and services', label: '2729 - Sales and services' },
  ]

  const modkontoOptions = [
    { value: '5820 - Bankkonto', label: '5820 - Bankkonto' },
    { value: '1020 - Salg af ydelser i DK', label: '1020 - Salg af ydelser i DK' },
    { value: '1021 - Salg af ydelser til udland', label: '1021 - Salg af ydelser til udland' },
    { value: '5830 - Kassekonto', label: '5830 - Kassekonto' },
    { value: '5840 - MobilePay', label: '5840 - MobilePay' },
    { value: '6800 - Mellemregning moms', label: '6800 - Mellemregning moms' },
    { value: '6900 - Resultat', label: '6900 - Resultat' },
  ]

  const valutaOptions = [
    { value: 'DKK', label: 'DKK' },
    { value: 'EUR', label: 'EUR' },
    { value: 'USD', label: 'USD' },
    { value: 'GBP', label: 'GBP' },
    { value: 'SEK', label: 'SEK' },
    { value: 'NOK', label: 'NOK' },
    { value: 'CHF', label: 'CHF' },
    { value: 'JPY', label: 'JPY' },
    { value: 'CAD', label: 'CAD' },
    { value: 'AUD', label: 'AUD' },
    { value: 'CNY', label: 'CNY' },
    { value: 'COP', label: 'COP' },
    { value: 'CRC', label: 'CRC' },
    { value: 'CYP', label: 'CYP' },
    { value: 'CZK', label: 'CZK' },
    { value: 'PLN', label: 'PLN' },
  ]

  const momsOptions = [
    { value: 'I25', label: 'I25' },
    { value: 'Abr', label: 'Abr' },
    { value: 'IV25', label: 'IV25' },
    { value: 'IY25', label: 'IY25' },
    { value: 'OBPK', label: 'OBPK' },
    { value: 'U25', label: 'U25' },
    { value: 'UY25', label: 'UY25' },
  ]

  const typeColorMap = {
    'entry-type-journal-entry': '#4573D2',
    'entry-type-customer-invoice': '#4573D2',
    'entry-type-supplier-invoice': '#e89c2e',
    'entry-type-customer-payment': '#08AE87',
    'entry-type-supplier-payment': '#e89c2e',
    'entry-type-manual-customer-invoice': '#4573D2',
  }

  const handleRowClick = useCallback((row) => {
    // Only update sidebar content if it's already open — don't open it from row clicks
    if (!sidebarOpenRef.current) return
    const idx = rows.findIndex(r => r.id === row.id)
    if (idx !== -1) {
      openSidebar(idx, sidebarTabRef.current, row.hasAttachmentName || (row.bilag + ' - 01.01.25'))
    }
  }, [openSidebar])

  const rowActions = [
    (row) => <IconButton key="edit" icon="edit" aria-label="Edit" onClick={e => e.stopPropagation()} />,
    (row) => <IconButton key="copy" icon="copy" aria-label="Copy" onClick={e => e.stopPropagation()} />,
    (row) => <IconButton key="delete" icon="delete" aria-label="Delete" onClick={e => e.stopPropagation()} />,
    (row) => (
      <Menu key="more">
        <Menu.Trigger>
          <IconButton icon="ellipsis-vertical" aria-label="More" onClick={e => e.stopPropagation()} />
        </Menu.Trigger>
        <Menu.Content>
          <Menu.Item icon="time" onClick={() => { const idx = rows.findIndex(r => r.id === row.id); if (idx !== -1) openSidebar(idx, 'log', null); }}>Log</Menu.Item>
          <Menu.Item onClick={() => { const idx = rows.findIndex(r => r.id === row.id); if (idx !== -1) openSidebar(idx, 'forslag', null); }}>
            <span className="absolute left-0 ml-1 inline-flex items-center"><EvaLogo size={18} className="menu-icon" /></span>
            Forslag
          </Menu.Item>
          <Menu.Item onClick={() => askEvaFromRow(row)}>
            <span className="absolute left-0 ml-1 inline-flex items-center"><EvaLogo size={18} className="menu-icon" /></span>
            Spørg Eva
          </Menu.Item>
          <Menu.Item icon="tick" onClick={() => {}}>Gem</Menu.Item>
          <Menu.Item icon="close" onClick={() => {}}>Ryd ændringer</Menu.Item>
        </Menu.Content>
      </Menu>
    ),
  ]

  return (
    <div className="app-wrapper">
      <EvaLogoDefs />
      <TopNav />
      <div className="page-body" style={{ '--eva-width': `${evaWidth}px` }}>
        <EvaDrawer
          open={evaOpen}
          onClose={closeEva}
          width={evaWidth}
          onWidthChange={(w) => { setEvaWidth(w); sessionStorage.setItem('evaWidth', w) }}
          context={evaContext}
          onClearContext={() => setEvaContext(null)}
          onOpenArtifact={openArtifact}
          onSendReminders={() => sendDocReminders(null)}
          remindersSent={remindersAllSent}
          reminderSentCount={reminderSentCount}
          onAutomate={() => setArtifactAutomated(true)}
          automated={artifactAutomated}
          onReviewWorkflow={reviewWorkflow}
          onActivateWorkflow={activateWorkflow}
          activatedWorkflowKeys={activatedWorkflowKeys}
          onApplyVat={applyVatChanges}
          appliedVatIds={appliedVatIds}
          openArtifactId={artifactView?.id}
          onCloseArtifact={() => setArtifactView(null)}
          evaLog={evaLog}
          onRevertLog={revertEvaLog}
          onToggleWorkflowLog={toggleWorkflowLog}
        />
        <SideNav
          collapsed={sideNavCollapsed}
          onExpand={() => setSideNavCollapsed(false)}
          evaOpen={evaOpen}
          onToggleEva={toggleEva}
        />
        <div className="content-area">
          <div className="main">
            <div className="main-inner">
              <div className="top-bar">
                <div className="top-bar-title">
                  <h1>Daglig kassekladde</h1>
                </div>
                <div className="top-bar-right">
                  <div className="balance-cards">
                    <div className="balance-card"><div className="label">Saldo</div><div className="value">4.500,00</div></div>
                    <div className="balance-card"><div className="label">Nordea 2029389...</div><div className="value">4.500,00</div></div>
                  </div>
                  <button
                    type="button"
                    className="eva-forslag-btn"
                    onClick={openPageDrawer}
                    aria-label={`Forslag til kassekladden (${pendingSuggestionCount + visibleWorkflows.length})`}
                  >
                    <EvaLogo size={18} />
                    Forslag
                    {pendingSuggestionCount + visibleWorkflows.length > 0 && (
                      <span className="eva-forslag-count">{pendingSuggestionCount + visibleWorkflows.length}</span>
                    )}
                  </button>
                </div>
              </div>
              <div className="table3-wrapper">
                <Table3
                  id="daglig-table"
                  data={rows}
                  rowIdentityAccessor="id"
                  enableRowSelection
                  selectedRows={selectedRows}
                  onRowSelect={(_, ids) => setSelectedRows(ids)}
                  enableRowClick
                  onRowClick={handleRowClick}
                  enableRowActions
                  rowActions={rowActions}
                  enableRowActive
                  onRowActive={(row) => {
                    if (row && sidebarOpen) {
                      const idx = rows.findIndex(r => r.id === row.id)
                      if (idx !== -1 && idx !== activeRowIndex) {
                        setActiveRowIndex(idx)
                        setSidebarTitle(row.bilag + ' - 01.01.25')
                      }
                    }
                  }}
                  enableSearch
                  enableEditing
                  enableColumnOrdering
                  enableColumnResizing
                  enableSorting
                  enablePrinting
                  enableFooter
                  length={rows.length}
                  onEditingSave={(editedRow) => {
                    setRows(prev => prev.map(r => (r.id === editedRow.id ? { ...r, ...editedRow } : r)))
                    // If an edit landed on a value Eva proposed, mark that suggestion accepted
                    setRowSuggestionState(prev => {
                      const fields = prev[editedRow.id]
                      if (!fields) return prev
                      let changed = false
                      const next = { ...fields }
                      for (const f of Object.keys(fields)) {
                        const sug = fields[f]
                        if (sug.status === 'pending' && String(editedRow[f]) === String(sug.value)) {
                          next[f] = { ...sug, status: 'accepted' }
                          changed = true
                        }
                      }
                      return changed ? { ...prev, [editedRow.id]: next } : prev
                    })
                  }}
                  toolbarLeft={
                    <div className="action-buttons">
                      <Button appearance="primary">Ny postering</Button>
                      <Button>Bogfør</Button>
                      <Menu>
                        <Menu.Trigger>
                          <Button>Mere <Icon name="chevron-down" /></Button>
                        </Menu.Trigger>
                        <Menu.Content>
                          <Menu.Item icon="time" onClick={() => { setSidebarOpen(true); setSidebarTab('log'); }}>Log</Menu.Item>
                          <Menu.Item icon="tick" onClick={() => {}}>Gem</Menu.Item>
                          <Menu.Item icon="close" onClick={() => {}}>Ryd ændringer</Menu.Item>
                        </Menu.Content>
                      </Menu>
                    </div>
                  }
                >
                  <Table3.Column
                    accessor="type"
                    header="Type"
                    defaultWidth={50}
                    enableEditing
                    control={(props) => (
                      <Select2
                        value={props.value}
                        onChange={(val) => props.setValue(val)}
                        className={`${props.className || ''} type-select`}
                        ref={props.ref}
                        onBlur={() => props.onBlur?.(props.value)}
                        onKeyDown={props.onKeyDown}
                      >
                        {typeOptions.map(opt => (
                          <Select2.Option key={opt.value} value={opt.value} prefix={<Icon name={opt.icon} style={{ color: typeColorMap[opt.value] }} />}>
                            {opt.label}
                          </Select2.Option>
                        ))}
                      </Select2>
                    )}
                    renderer={({ row }) => (
                      <Icon name={row.type} style={{ color: typeColorMap[row.type] }} />
                    )}
                  />
                  <Table3.Column
                    accessor="bilag"
                    header="Bilag"
                    defaultWidth={90}
                    enableEditing
                    enableTruncate
                    control="input"
                    enableSorting
                  />
                  <Table3.Column
                    id="vedhaeftning"
                    header="Vedhæftning"
                    defaultWidth={50}
                    renderer={({ row }) => {
                      const docState = rowDocState[row.id]
                      return (
                        <span style={{ cursor: 'pointer' }} onClick={(e) => {
                          e.stopPropagation()
                          const idx = rows.findIndex(r => r.id === row.id)
                          if (idx !== -1) openSidebar(idx, 'document', null)
                        }}>
                          <Icon name={docState?.hasDocument ? 'document-preview' : 'circle-plus'} />
                        </span>
                      )
                    }}
                  />
                  <Table3.Column
                    accessor="dato"
                    header="Dato"
                    defaultWidth={90}
                    enableEditing
                    enableTruncate
                    control="input"
                  />
                  <Table3.Column
                    accessor="tekst"
                    header="Tekst"
                    defaultWidth={180}
                    enableEditing
                    enableTruncate
                    control={(props, row) => {
                      const sug = pendingSuggestion(row, 'tekst')
                      const accepted = rowSuggestionState[row.id]?.tekst?.status === 'accepted'
                      return (
                        <EvaInput
                          value={props.value ?? ''}
                          suggestionValue={sug?.value}
                          confidencePct={sug?.confidencePct}
                          reason={sug?.reason}
                          timeSaved={sug?.timeSaved}
                          accepted={accepted}
                          onChange={(v) => props.setValue(v)}
                          onAccept={() => acceptSuggestion(row.id, 'tekst')}
                          onAsk={() => askEvaFromCell(row, 'tekst', sug)}
                        />
                      )
                    }}
                    renderer={({ row, value }) => {
                      const sug = pendingSuggestion(row, 'tekst')
                      if (!sug) return value
                      return (
                        <SuggestedCell
                          suggestion={sug}
                          onAccept={() => acceptSuggestion(row.id, 'tekst')}
                          onDismiss={() => dismissSuggestion(row.id, 'tekst')}
                          onAsk={() => askEvaFromCell(row, 'tekst', sug)}
                          onOpenSuggestions={() => { const idx = rows.findIndex(r => r.id === row.id); if (idx !== -1) openSidebar(idx, 'forslag', null) }}
                          onPromote={() => reviewWorkflow(workflowSuggestionSeed[1])}
                        />
                      )
                    }}
                  />
                  <Table3.Column
                    accessor="belob"
                    header="Beløb"
                    defaultWidth={90}
                    align="right"
                    enableEditing
                    enableTruncate
                    control="input"
                  />
                  <Table3.Column
                    accessor="konto"
                    header="Konto"
                    defaultWidth={200}
                    enableEditing
                    enableTruncate
                    control={({ setValue, ...props }, row) => {
                      const sug = pendingSuggestion(row, 'konto')
                      // Eva pre-fills the empty cell with her proposal: while the
                      // edit buffer is still untouched the trigger shows the
                      // suggested account (tinted cream) with the sparkle, exactly
                      // like the reference SuggestedEditInput. Picking, accepting,
                      // or dismissing hands control back to the user.
                      const bufferEmpty = props.value == null || props.value === ''
                      const isSuggested = !!sug && bufferEmpty
                      const accepted = rowSuggestionState[row.id]?.konto?.status === 'accepted'
                      return (
                        <EvaSelect2
                          suggestion={isSuggested ? sug : undefined}
                          accepted={accepted && !bufferEmpty}
                          onAccept={() => { setValue(sug.value); acceptSuggestion(row.id, 'konto') }}
                          onDismiss={() => { setValue(''); dismissSuggestion(row.id, 'konto') }}
                          onAsk={() => askEvaFromCell(row, 'konto', sug)}
                        >
                          <Select2
                            {...props}
                            value={isSuggested ? sug.value : props.value}
                            className={`${props.className || ''}${isSuggested ? ' !bg-[#fef9f0]' : ''}`}
                            onChange={(val) => {
                              setValue(val)
                              if (sug) {
                                if (val === sug.value) acceptSuggestion(row.id, 'konto')
                                else dismissSuggestion(row.id, 'konto')
                              }
                            }}
                          >
                            {renderAccountOptions(kontoOptions, sug?.value, sug?.confidencePct)}
                          </Select2>
                        </EvaSelect2>
                      )
                    }}
                    renderer={({ row, value }) => {
                      const sug = pendingSuggestion(row, 'konto')
                      if (sug) {
                        return (
                          <SuggestedCell
                            suggestion={sug}
                            onAccept={() => acceptSuggestion(row.id, 'konto')}
                            onDismiss={() => dismissSuggestion(row.id, 'konto')}
                            onAsk={() => askEvaFromCell(row, 'konto', sug)}
                            onOpenSuggestions={() => { const idx = rows.findIndex(r => r.id === row.id); if (idx !== -1) openSidebar(idx, 'forslag', null) }}
                            onPromote={() => reviewWorkflow(workflowSuggestionSeed[0])}
                          />
                        )
                      }
                      return value ? (
                        <a href="#" className="konto-link" onClick={e => { e.preventDefault(); e.stopPropagation() }}>{value}</a>
                      ) : null
                    }}
                  />
                  <Table3.Column
                    accessor="modkonto"
                    header="Modkonto"
                    defaultWidth={200}
                    enableEditing
                    enableTruncate
                    control={({ setValue, ...props }, row) => {
                      const sug = pendingSuggestion(row, 'modkonto')
                      const bufferEmpty = props.value == null || props.value === ''
                      const isSuggested = !!sug && bufferEmpty
                      const accepted = rowSuggestionState[row.id]?.modkonto?.status === 'accepted'
                      return (
                        <EvaSelect2
                          suggestion={isSuggested ? sug : undefined}
                          accepted={accepted && !bufferEmpty}
                          onAccept={() => { setValue(sug.value); acceptSuggestion(row.id, 'modkonto') }}
                          onDismiss={() => { setValue(''); dismissSuggestion(row.id, 'modkonto') }}
                          onAsk={() => askEvaFromCell(row, 'modkonto', sug)}
                        >
                          <Select2
                            {...props}
                            value={isSuggested ? sug.value : props.value}
                            className={`${props.className || ''}${isSuggested ? ' !bg-[#fef9f0]' : ''}`}
                            onChange={(val) => {
                              setValue(val)
                              if (sug) {
                                if (val === sug.value) acceptSuggestion(row.id, 'modkonto')
                                else dismissSuggestion(row.id, 'modkonto')
                              }
                            }}
                          >
                            {renderAccountOptions(modkontoOptions, sug?.value, sug?.confidencePct)}
                          </Select2>
                        </EvaSelect2>
                      )
                    }}
                    renderer={({ row, value }) => {
                      const sug = pendingSuggestion(row, 'modkonto')
                      if (sug) {
                        return (
                          <SuggestedCell
                            suggestion={sug}
                            onAccept={() => acceptSuggestion(row.id, 'modkonto')}
                            onDismiss={() => dismissSuggestion(row.id, 'modkonto')}
                            onAsk={() => askEvaFromCell(row, 'modkonto', sug)}
                            onOpenSuggestions={() => { const idx = rows.findIndex(r => r.id === row.id); if (idx !== -1) openSidebar(idx, 'forslag', null) }}
                          />
                        )
                      }
                      return value ? (
                        <a href="#" className="konto-link" onClick={e => { e.preventDefault(); e.stopPropagation() }}>{value}</a>
                      ) : null
                    }}
                  />
                  <Table3.Column
                    accessor="moms"
                    header="Moms"
                    defaultWidth={90}
                    enableEditing
                    enableTruncate
                    control={({ setValue, ...props }) => (
                      <Select2 {...props} onChange={(val) => setValue(val)}>
                        {momsOptions.map(o => (
                          <Select2.Option key={o.value} value={o.value}>{o.label}</Select2.Option>
                        ))}
                      </Select2>
                    )}
                  />
                  <Table3.Column
                    accessor="bilagsbalance"
                    header="Bilagsbalance"
                    defaultWidth={110}
                    align="right"
                    enableTruncate
                  />
                  <Table3.Column
                    accessor="momsModkonto"
                    header="Moms (Modkonto)"
                    defaultWidth={130}
                    enableEditing
                    enableTruncate
                    control={({ setValue, ...props }) => (
                      <Select2 {...props} onChange={(val) => setValue(val)}>
                        {momsOptions.map(o => (
                          <Select2.Option key={o.value} value={o.value}>{o.label}</Select2.Option>
                        ))}
                      </Select2>
                    )}
                  />
                  <Table3.Column
                    accessor="valuta"
                    header="Valuta"
                    defaultWidth={90}
                    enableEditing
                    enableTruncate
                    control={({ setValue, ...props }) => (
                      <Select2 {...props} onChange={(val) => setValue(val)}>
                        {valutaOptions.map(o => (
                          <Select2.Option key={o.value} value={o.value}>{o.label}</Select2.Option>
                        ))}
                      </Select2>
                    )}
                  />
                  <Table3.Column
                    accessor="valutakurs"
                    header="Valutakurs"
                    defaultWidth={90}
                    enableEditing
                    enableTruncate
                    control="input"
                  />
                  <Table3.Column
                    accessor="dimension1"
                    header="Dimension1"
                    defaultWidth={100}
                    enableEditing
                    enableTruncate
                    control="input"
                  />
                  <Table3.Column
                    accessor="projekt"
                    header="Projekt"
                    defaultWidth={80}
                    enableEditing
                    enableTruncate
                    control="input"
                  />
                  <Table3.Column
                    accessor="periodisering"
                    header="Periodise..."
                    defaultWidth={100}
                    enableEditing
                    enableTruncate
                    control="input"
                  />
                  <Table3.Column
                    accessor="betaling"
                    header="Betaling"
                    defaultWidth={80}
                    enableEditing
                    enableTruncate
                    control="input"
                  />
                  <Table3.Column
                    accessor="forfaldsdato"
                    header="Forfaldsdato"
                    defaultWidth={110}
                    enableEditing
                    enableTruncate
                    control="input"
                  />
                </Table3>
              </div>
            </div>
          </div>
          <Drawer.Outlet ref={rightOutletRef} />
          <Drawer
            variant="embedded"
            open={!!workflowDrawer || sidebarOpen}
            onClose={() => { if (workflowDrawer) closeWorkflowDrawer(); else closeSidebar() }}
            showCloseButton
          >
            <Drawer.Content
              aria-label={workflowDrawer ? (workflowDrawer.workflow?.title || 'Workflow') : (sidebarTitle || 'Detaljer')}
              className="eva-rd-content"
            >
              {workflowDrawer ? (
                <WorkflowDrawer
                  workflow={workflowDrawer.workflow}
                  activated={workflowDrawer.activated}
                  onClose={closeWorkflowDrawer}
                  onActivate={activateWorkflow}
                  onDismiss={(wf) => { if (wf?.id) dismissWorkflow(wf.id) }}
                />
              ) : (
                <Sidebar
                  tab={sidebarTab} title={sidebarTitle}
                  drawerMode={drawerMode}
                  onSwitchTab={(tab) => { setSidebarTab(tab); if (tab !== 'log') setDrilldownStack([]) }}
                  invoiceData={activeInv} logoVariation={activeLogo}
                  docState={activeDocState} activeRowId={activeRowId} pageCount={activePageCount}
                  onDeleteDocument={deleteDocument} onUploadDocument={uploadDocument}
                  onRequestDocument={requestDocument} onCancelRequest={cancelRequest}
                  drilldownStack={drilldownStack}
                  onPushDrilldown={(title) => setDrilldownStack(prev => [...prev, title])}
                  onGoToDrilldownLevel={(level) => setDrilldownStack(prev => prev.slice(0, level))}
                  entryNumber={activeRowIndex !== null ? rows[activeRowIndex]?.bilag : ''}
                  entrySuggestions={entrySuggestions}
                  entryWorkflowSuggestion={visibleEntryWorkflow}
                  pageFieldSuggestions={pageFieldSuggestions}
                  workflowSuggestions={visibleWorkflows}
                  onAcceptSuggestion={acceptSuggestion}
                  onDismissSuggestion={dismissSuggestion}
                  onActivateWorkflow={activateWorkflow}
                  onReviewWorkflow={reviewWorkflow}
                  activatedWorkflowKeys={activatedWorkflowKeys}
                  onDismissWorkflow={dismissWorkflow}
                />
              )}
            </Drawer.Content>
          </Drawer>
        </div>
        <DocumentReminderView
          open={!!artifactView && artifactView.kind !== 'vat'}
          rows={docReminderRows}
          onSendReminders={sendDocReminders}
          automated={artifactAutomated}
          onReviewAutomation={() => reviewWorkflow(DOC_REMINDER_AUTOMATION)}
          onOpenActivatedAutomation={() => openActivatedWorkflow(DOC_REMINDER_AUTOMATION)}
          onClose={() => setArtifactView(null)}
        />
        <VatAnomalyView
          open={!!artifactView && artifactView.kind === 'vat'}
          suggestions={artifactView?.suggestions || []}
          appliedIds={appliedVatIds}
          onApply={applyVatChanges}
          onClose={() => setArtifactView(null)}
        />
      </div>
    </div>
  )
}
