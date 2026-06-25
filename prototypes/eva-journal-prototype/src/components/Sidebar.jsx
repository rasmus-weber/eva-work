import { useRef, useState, useEffect, useCallback, memo } from 'react'
import { IconButton, Button, Icon, Pagination, usePagination, Tabs } from '@economic/taco'
import { fmt } from '../data'
import LogTab from './LogTab'
import { EvaLogo } from './eva/EvaLogo'
import { EntryFieldSuggestionCard, WorkflowSuggestionCard } from './eva/suggestionCards'
import EvaActivityTimeline from './eva/EvaActivityTimeline'

const WF_LINK = [
  { label: 'Workflow', value: 'Match indbetalinger til fakturaer', link: true },
  { label: 'Kilde', value: 'Inbox' },
]

// Page drawer · Log — what has happened on the kassekladde
const PAGE_LOG_ENTRIES = [
  { date: '01.06.25 09:12', meta: '19397 — Daglig', icon: 'attach-auto', title: 'Bilag tilføjet', description: 'Workflow', defaultOpen: true, details: WF_LINK },
  { date: '01.06.25 09:08', meta: '19396 — Daglig', icon: 'attach-auto', title: 'Bilag tilføjet', description: 'Workflow', details: WF_LINK },
  { date: '01.06.25 08:55', meta: '19395 — Daglig', icon: 'edit', title: 'Redigeret', description: 'Maria Svensen', details: [
    { label: 'Felt', value: 'Konto' },
    { label: 'Ny værdi', value: '7220 - Fragt og porto' },
  ] },
  { date: '01.06.25 08:54', meta: '19394 — Daglig', icon: 'attach-auto', title: 'Bilag tilføjet', description: 'Workflow', details: WF_LINK },
  { date: '01.06.25 08:50', meta: '19392 — Daglig', icon: 'circle-plus', title: 'Postering oprettet', description: 'Workflow', details: [
    { label: 'Kassekladde', value: 'Daglig' },
    { label: 'Konto', value: '5820 - Bankkonto' },
    { label: 'Modkonto', value: '2729 - Sales and services' },
  ] },
]

function LogoShape({ cls, bg, border }) {
  if (cls === 'triangle') return <span className="triangle" style={{borderBottomColor: border}} />
  return <span className={cls} style={{background: bg}} />
}

const BASE_WIDTH = 595 // A4 width in points
const BASE_HEIGHT = 842 // A4 height in points

const ScaledPage = memo(function ScaledPage({ children }) {
  const containerRef = useRef(null)
  const innerRef = useRef(null)

  const updateScale = useCallback(() => {
    const container = containerRef.current
    const inner = innerRef.current
    if (!container || !inner) return
    const containerWidth = container.clientWidth
    const s = containerWidth / BASE_WIDTH
    inner.style.transform = `scale(${s})`
    container.style.height = `${inner.offsetHeight * s}px`
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(container)
    return () => observer.disconnect()
  }, [updateScale])

  useEffect(() => { updateScale() }, [children, updateScale])

  return (
    <div ref={containerRef} className="scaled-page-container" style={{ marginBottom: 10 }}>
      <div
        ref={innerRef}
        className="scaled-page-inner"
        style={{
          width: BASE_WIDTH,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  )
})

const InvoicePreview = memo(function InvoicePreview({ inv, logo, page, totalPages = 1 }) {
  if (!inv) return null
  const subtotal = inv.items.reduce((s, i) => s + i.qty * i.price, 0)
  const moms = subtotal * 0.25
  const total = subtotal + moms
  return (
    <div className="invoice-preview" style={{fontFamily: inv.font}}>
      <div className="draft-watermark">KLADDE</div>
      <div className="invoice-header">
        <div>
          <div className="invoice-company">{inv.company}</div>
          <div style={{marginTop:8}}><strong>{inv.customer}</strong></div>
          <div className="invoice-meta">{inv.cvr}</div>
        </div>
        <div className="invoice-logo">
          {logo?.map((s, i) => <LogoShape key={i} {...s} />)}
        </div>
      </div>
      {page === 1 && <>
        <div className="invoice-title">FAKTURA</div>
        <div className="invoice-meta" style={{textAlign:'right', marginBottom:12}}>
          Fakturanr.: {inv.invNr}<br/>
          Fakturadato: {inv.date}<br/>
          Kundenr.: {inv.custNr}<br/>
          Side: 1 af {totalPages}
        </div>
        <table className="invoice-table">
          <thead><tr><th>Nr.</th><th>Tekst</th><th>Antal</th><th>Enhed</th><th>Stk. pris</th><th style={{textAlign:'right'}}>Pris</th></tr></thead>
          <tbody>
            {inv.items.map((item, i) => (
              <tr key={i}><td>{item.nr}</td><td>{item.text}</td><td>{item.qty}</td><td>{item.unit}</td><td>{fmt(item.price)}</td><td style={{textAlign:'right'}}>{fmt(item.qty * item.price)}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="invoice-totals">
          <div className="total-line"><span>Subtotal :</span><span>{fmt(subtotal)}</span></div>
          <div className="total-line"><span>25,00% moms :</span><span>{fmt(moms)}</span></div>
          <div className="total-line total-final"><span>Total DKK :</span><span>{fmt(total)}</span></div>
        </div>
        <div className="invoice-footer">
          <p>Betalingsbetingelser: Netto 8 dage - forfald <strong>{inv.date}</strong></p>
          <p>Belobet indsaettes til vor bank. - Regnr.: / Kontonr.:</p>
          <p>Fakturanr.: <strong>{inv.invNr}</strong> bedes anfort ved bankoverforsel</p>
          <br/>
          <p>Ved for sen betaling palobnes rente i henhold til galdende lovgivning.</p>
        </div>
      </>}
      {page === 2 && <>
        <div className="invoice-meta" style={{textAlign:'right', marginBottom:12}}>
          Fakturanr.: {inv.invNr}<br/>
          Side: 2 af {totalPages}
        </div>
        <div className="invoice-title" style={{fontSize:14, marginBottom:16}}>SPECIFIKATION</div>
        <table className="invoice-table">
          <thead><tr><th>Nr.</th><th>Beskrivelse</th><th>Antal</th><th>Enhed</th><th>Enhedspris</th><th style={{textAlign:'right'}}>Beløb</th></tr></thead>
          <tbody>
            {inv.items.map((item, i) => (
              <tr key={i}>
                <td>{item.nr}</td>
                <td>{item.text} — detaljeret specifikation</td>
                <td>{item.qty}</td>
                <td>{item.unit}</td>
                <td>{fmt(item.price)}</td>
                <td style={{textAlign:'right'}}>{fmt(item.qty * item.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="invoice-totals" style={{marginTop:24}}>
          <div className="total-line"><span>Subtotal :</span><span>{fmt(subtotal)}</span></div>
          <div className="total-line"><span>25,00% moms :</span><span>{fmt(moms)}</span></div>
          <div className="total-line total-final"><span>Total DKK :</span><span>{fmt(total)}</span></div>
        </div>
        <div className="invoice-footer" style={{marginTop:32}}>
          <p><strong>{inv.company}</strong></p>
          <p>{inv.cvr}</p>
          <p>Denne faktura er udstedt elektronisk og er gyldig uden underskrift.</p>
        </div>
      </>}
    </div>
  )
})

const DocPagination = memo(function DocPagination({ pageCount, pagination }) {
  return (
    <div className="doc-pagination">
      <Pagination length={pageCount} {...pagination} showPageControls showPageNumbers pageSizes={[1]} />
    </div>
  )
})

const DocEmptyState = memo(function DocEmptyState({ requestSent, onUpload, onRequest, onCancelRequest }) {
  return (
    <div className="doc-empty-state">
      <div className="doc-dropzone">
        <Icon name="document-preview" className="doc-dropzone-icon" />
        <p className="doc-dropzone-title">Drag here to upload</p>
        <Button appearance="primary" icon="upload" onClick={onUpload}>Upload manually</Button>
        <Button appearance="discrete" icon="attach-auto" onClick={() => {}}>Attach from inbox</Button>
      </div>
      <div className="doc-request-area">
        {requestSent ? (
          <>
            <p className="doc-request-sent"><strong>Request sent to Carl Jönsson</strong></p>
            <p className="doc-request-date">22.10.2025 (5 days ago)</p>
            <Button appearance="danger" icon="close" onClick={onCancelRequest}>Cancel request</Button>
          </>
        ) : (
          <>
            <p className="doc-no-requests">No requests found</p>
            <Button icon="help" onClick={onRequest}>Request document</Button>
          </>
        )}
      </div>
    </div>
  )
})

export default memo(function Sidebar({
  open, tab, title, width, onWidthChange, onClose, onSwitchTab,
  drawerMode = 'entry',
  invoiceData, logoVariation,
  docState, activeRowId, pageCount, onDeleteDocument, onUploadDocument, onRequestDocument, onCancelRequest,
  drilldownStack, onPushDrilldown, onGoToDrilldownLevel,
  entryNumber,
  entrySuggestions = [], pageFieldSuggestions = [], workflowSuggestions = [], entryWorkflowSuggestion = null,
  onAcceptSuggestion, onDismissSuggestion, onActivateWorkflow, onReviewWorkflow, activatedWorkflowKeys, onDismissWorkflow,
}) {
  const docPagination = usePagination(0, 1)

  // Reset to first page when switching rows
  useEffect(() => {
    docPagination.setPageIndex(0)
  }, [activeRowId])

  // Document + Log panels are shared by the entry chassis (unchanged behaviour)
  const documentPanel = docState?.hasDocument ? (
    <>
      <div className="doc-toolbar">
        <div className="doc-toolbar-left">
          <IconButton icon="rotate-left" appearance="discrete" aria-label="Rotate left" />
          <IconButton icon="rotate-right" appearance="discrete" aria-label="Rotate right" />
          <IconButton icon="circle-plus" appearance="discrete" aria-label="Add document" />
          <IconButton icon="delete" appearance="discrete" aria-label="Delete document" onClick={() => activeRowId && onDeleteDocument(activeRowId)} />
        </div>
        <div className="doc-toolbar-right">
          <IconButton icon="link-external" appearance="discrete" aria-label="Open in new window" />
        </div>
      </div>
      <div className="doc-scroll">
        <ScaledPage><InvoicePreview inv={invoiceData} logo={logoVariation} page={docPagination.pageIndex + 1} totalPages={pageCount} /></ScaledPage>
      </div>
    </>
  ) : (
    <DocEmptyState
      requestSent={docState?.requestSent}
      onUpload={() => activeRowId && onUploadDocument(activeRowId)}
      onRequest={() => activeRowId && onRequestDocument(activeRowId)}
      onCancelRequest={() => activeRowId && onCancelRequest(activeRowId)}
    />
  )

  const logPanel = (
    <LogTab
      drilldownStack={drilldownStack}
      onPushDrilldown={onPushDrilldown}
      onGoToDrilldownLevel={onGoToDrilldownLevel}
      entryNumber={entryNumber}
    />
  )

  return (
    <div className="sidebar-inner">
        <div className="sidebar-header">
          <div className="sidebar-title">
            <h2>{title}</h2>
          </div>

          {/* Each mode renders its own keyed Tabs instance — mounting one
              unmounts the others, so the active id never points at a tab
              that doesn't exist in the current mode (no blank panel). */}
          {drawerMode === 'entry' && (
            <Tabs key="entry" id={tab} onChange={onSwitchTab}>
              <Tabs.List>
                <Tabs.Trigger id="document">Document</Tabs.Trigger>
                <Tabs.Trigger id="log">Log</Tabs.Trigger>
                <Tabs.Trigger id="forslag">
                  {(() => {
                    const n = entrySuggestions.length + (entryWorkflowSuggestion ? 1 : 0)
                    return n ? <>Forslag <span className="eva-tab-count">{n}</span></> : 'Forslag'
                  })()}
                </Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content id="document" className={`sidebar-body doc-content ${!docState?.hasDocument ? 'doc-content-empty' : ''}`}>
                {documentPanel}
              </Tabs.Content>
              <Tabs.Content id="log" className="sidebar-body log-content">
                {logPanel}
              </Tabs.Content>
              <Tabs.Content id="forslag" className="sidebar-body eva-suggestion-list">
                {entrySuggestions.length === 0 && !entryWorkflowSuggestion ? (
                  <div className="eva-empty">
                    <EvaLogo size={28} />
                    <p>Ingen forslag til denne postering lige nu.</p>
                  </div>
                ) : (
                  <>
                    {entrySuggestions.map(s => (
                      <EntryFieldSuggestionCard
                        key={s.fieldKey}
                        suggestion={s}
                        onAccept={() => onAcceptSuggestion?.(s.rowId ?? activeRowId, s.fieldKey)}
                        onDismiss={() => onDismissSuggestion?.(s.rowId ?? activeRowId, s.fieldKey)}
                      />
                    ))}
                    {entryWorkflowSuggestion && (
                      <WorkflowSuggestionCard
                        suggestion={entryWorkflowSuggestion}
                        activated={activatedWorkflowKeys?.has(entryWorkflowSuggestion.id)}
                        onAccept={() => onActivateWorkflow?.(entryWorkflowSuggestion)}
                        onReview={() => onReviewWorkflow?.(entryWorkflowSuggestion)}
                        onDismiss={() => onDismissWorkflow?.(entryWorkflowSuggestion.id)}
                      />
                    )}
                  </>
                )}
              </Tabs.Content>
            </Tabs>
          )}

          {drawerMode === 'page' && (
            <Tabs key="page" id={tab} onChange={onSwitchTab}>
              <Tabs.List>
                <Tabs.Trigger id="log">Log</Tabs.Trigger>
                <Tabs.Trigger id="forslag">
                  {pageFieldSuggestions.length ? <>Forslag <span className="eva-tab-count">{pageFieldSuggestions.length}</span></> : 'Forslag'}
                </Tabs.Trigger>
                <Tabs.Trigger id="automatiseringer">
                  {workflowSuggestions.length ? <>Workflows <span className="eva-tab-count">{workflowSuggestions.length}</span></> : 'Workflows'}
                </Tabs.Trigger>
                <Tabs.Trigger id="afvigelser">Afvigelser</Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content id="log" className="sidebar-body log-content">
                <EvaActivityTimeline entries={PAGE_LOG_ENTRIES} />
              </Tabs.Content>
              <Tabs.Content id="forslag" className="sidebar-body eva-suggestion-list">
                <div className="eva-activity-filter eva-forslag-filter">
                  <span>Alle forslag</span>
                  <Icon name="chevron-down" />
                </div>
                {pageFieldSuggestions.length === 0 ? (
                  <div className="eva-empty-inline">Ingen feltforslag lige nu.</div>
                ) : (
                  <>
                    <div className="eva-section-label">Felter der mangler</div>
                    {pageFieldSuggestions.map(s => (
                      <EntryFieldSuggestionCard
                        key={`${s.rowId}-${s.fieldKey}`}
                        suggestion={s}
                        onAccept={() => onAcceptSuggestion?.(s.rowId, s.fieldKey)}
                        onDismiss={() => onDismissSuggestion?.(s.rowId, s.fieldKey)}
                      />
                    ))}
                  </>
                )}
              </Tabs.Content>
              <Tabs.Content id="automatiseringer" className="sidebar-body eva-suggestion-list">
                {workflowSuggestions.length === 0 ? (
                  <div className="eva-empty-inline">Ingen workflows lige nu.</div>
                ) : (
                  workflowSuggestions.map(w => (
                    <WorkflowSuggestionCard
                      key={w.id}
                      suggestion={w}
                      activated={activatedWorkflowKeys?.has(w.id)}
                      onAccept={() => onActivateWorkflow?.(w)}
                      onReview={() => onReviewWorkflow?.(w)}
                      onDismiss={() => onDismissWorkflow?.(w.id)}
                    />
                  ))
                )}
              </Tabs.Content>
              <Tabs.Content id="afvigelser" className="sidebar-body eva-suggestion-list">
                <div className="eva-deviation">
                  <Icon name="warning" className="eva-deviation-icon eva-deviation-warn" />
                  <div>
                    <strong>{pageFieldSuggestions.length || 'Ingen'} posteringer mangler oplysninger</strong>
                    <p>Eva har markeret felter, der ser ud til at mangle på denne kassekladde.</p>
                  </div>
                </div>
                <div className="eva-deviation">
                  <Icon name="info" className="eva-deviation-icon" />
                  <div>
                    <strong>Bilagsbalancen går i nul</strong>
                    <p>Debet og kredit stemmer på tværs af posteringerne.</p>
                  </div>
                </div>
              </Tabs.Content>
            </Tabs>
          )}
        </div>
        {drawerMode === 'entry' && tab === 'document' && docState?.hasDocument && pageCount >= 2 && (
          <DocPagination pageCount={pageCount} pagination={docPagination} />
        )}
      </div>
  )
})
