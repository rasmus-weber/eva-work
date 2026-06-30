import { useState, Fragment } from 'react'
import { Icon, List, Tag } from '@economic/taco'
import { EvaLogo } from './EvaLogo'

/* Eva "Log" tab — every action Eva has performed, newest first, using the same
   taco List chassis as the entry/page-level log so the icon, card stroke and
   spacing match. A single action is a List.Collapsible that folds its
   detail-table out INSIDE the card; a bulk action is a List.Button that drills
   into a sub-page of collapsible per-event cards. The date line shows the date +
   a reference ("4087 — Daglig"); the card description is who performed it. */

function ChangeChips({ from, to, toLabel }) {
  return (
    <span className="eva-vat-item-change">
      <span className="eva-vat-chip eva-vat-chip-from">{from || 'Ingen'}</span>
      <span className="eva-vat-arrow">→</span>
      <span className="eva-vat-chip eva-vat-chip-to">{toLabel || to || 'Ingen'}</span>
    </span>
  )
}

const changeSummary = (c) =>
  `${c.fieldLabel ? c.fieldLabel + ': ' : ''}${c.from || 'Ingen'} → ${c.toLabel || c.to || 'Ingen'}`

// Title — plain string normally; with a "Fortrudt"/"Deaktiveret" tag when relevant.
function actionTitle(entry) {
  const deactivated = entry.kind === 'workflow' && entry.active === false
  if (!entry.reverted && !deactivated) return entry.title
  return (
    <span className="eva-log-title-row">
      <span className={entry.reverted ? 'eva-log-title-struck' : ''}>{entry.title}</span>
      {entry.reverted && <Tag color="neutral">Fortrudt</Tag>}
      {deactivated && <Tag color="neutral">Deaktiveret</Tag>}
    </span>
  )
}

// Timeline + date/reference wrapper, then a taco <List> holding the card.
function ActionShell({ entry, dimmed, className = '', children }) {
  const tIcon = entry.reverted ? 'arrow-undo' : entry.kind === 'workflow' && entry.active === false ? 'remove' : 'circle-tick'
  return (
    <div className={`log-entry ${dimmed ? 'eva-log-action-reverted' : ''} ${className}`}>
      <div className="timeline">
        <div className="timeline-icon"><Icon name={tIcon} /></div>
        <div className="timeline-spacer" />
      </div>
      <div className="log-body">
        <div className="log-date eva-log-date">
          <span>{entry.date}</span>
          <span className="eva-log-meta">{entry.ref}</span>
        </div>
        <div className="log-card-wrapper">
          <List>{children}</List>
        </div>
      </div>
    </div>
  )
}

// The .detail-table for an action (same markup as the entry-level log), rendered
// inside the collapsible card. Workflow actions get a link over to the workflow.
function DetailTable({ entry, onOpenWorkflow }) {
  const isWorkflow = entry.kind === 'workflow'
  return (
    <div className="detail-table">
      {isWorkflow && entry.workflow && (
        <div className="detail-row">
          <span className="detail-label">Workflow</span>
          <span className="detail-value link" onClick={() => onOpenWorkflow?.(entry)}>{entry.workflow}</span>
        </div>
      )}
      {(entry.children || []).map((c) =>
        c.label !== undefined ? (
          <div className="detail-row" key={c.id}>
            <span className="detail-label">{c.label}</span>
            <span className="detail-value">{c.value}</span>
          </div>
        ) : (
          <Fragment key={c.id}>
            {c.fieldLabel && (
              <div className="detail-row"><span className="detail-label">Felt</span><span className="detail-value">{c.fieldLabel}</span></div>
            )}
            <div className="detail-row"><span className="detail-label">Ændring</span><span className="detail-value"><ChangeChips from={c.from} to={c.to} toLabel={c.toLabel} /></span></div>
            {c.reason && (
              <div className="detail-row"><span className="detail-label">Begrundelse</span><span className="detail-value">{c.reason}</span></div>
            )}
          </Fragment>
        )
      )}
    </div>
  )
}

// Single action — folds out inside the card (List.Collapsible), like the entry log.
function InlineAction({ entry, onRevert, onToggleWorkflow, onOpenWorkflow }) {
  const revertible = !!entry.revertible
  const isWorkflow = entry.kind === 'workflow'
  const deactivated = isWorkflow && entry.active === false
  return (
    <ActionShell entry={entry} dimmed={entry.reverted || deactivated}>
      <List.Collapsible icon={entry.icon} title={actionTitle(entry)} description={entry.actor} defaultOpen={false}>
        <>
          <DetailTable entry={entry} onOpenWorkflow={onOpenWorkflow} />
          {isWorkflow ? (
            <div className="eva-log-sub-actions">
              {deactivated ? (
                <button type="button" className="eva-log-wf-btn eva-log-wf-reactivate" onClick={() => onToggleWorkflow?.(entry.id)}>
                  <Icon name="play-solid" /> Genaktivér workflow
                </button>
              ) : (
                <button type="button" className="eva-log-wf-btn" onClick={() => onToggleWorkflow?.(entry.id)}>
                  <Icon name="remove" /> Deaktivér workflow
                </button>
              )}
            </div>
          ) : revertible ? (
            <div className="eva-log-sub-actions">
              {entry.reverted ? (
                <span className="eva-log-reverted-tag"><Icon name="arrow-undo" /> Fortrudt</span>
              ) : (
                <button type="button" className="eva-log-revert-btn" onClick={() => onRevert(entry.id, null)}>Fortryd</button>
              )}
            </div>
          ) : null}
        </>
      </List.Collapsible>
    </ActionShell>
  )
}

// Bulk action — a clickable List item that drills into the sub-page.
function BulkAction({ entry, onOpen }) {
  return (
    <ActionShell entry={entry} dimmed={entry.reverted} className="eva-log-bulk">
      <List.Button icon={entry.icon} title={actionTitle(entry)} description={entry.actor} onClick={onOpen} />
    </ActionShell>
  )
}

// One sub-event as a collapsible card (entry-log style) inside the drilldown.
function SubEventCard({ entry, child, revertible, onRevert }) {
  const isFieldChange = child.from !== undefined || child.toLabel !== undefined
  const title = child.bilag ? `Bilag ${child.bilag} · ${child.tekst}` : (child.label || child.tekst || 'Ændring')
  const description = isFieldChange ? changeSummary(child) : child.note || undefined
  return (
    <div className="log-entry">
      <div className="timeline">
        <div className="timeline-icon"><Icon name={child.reverted ? 'arrow-undo' : 'circle-tick'} /></div>
        <div className="timeline-spacer" />
      </div>
      <div className="log-body">
        <div className="log-date eva-log-date">
          <span>{entry.date}</span>
          <span className="eva-log-meta">{entry.actor}</span>
        </div>
        <div className="log-card-wrapper">
          <List>
            <List.Collapsible
              icon={entry.icon}
              title={
                child.reverted ? (
                  <span className="eva-log-title-row"><span className="eva-log-title-struck">{title}</span><Tag color="neutral">Fortrudt</Tag></span>
                ) : (
                  title
                )
              }
              description={description}
              defaultOpen={false}
            >
              <>
                <div className="detail-table">
                  {child.fieldLabel && (
                    <div className="detail-row"><span className="detail-label">Felt</span><span className="detail-value">{child.fieldLabel}</span></div>
                  )}
                  {isFieldChange && (
                    <div className="detail-row"><span className="detail-label">Ændring</span><span className="detail-value"><ChangeChips from={child.from} to={child.to} toLabel={child.toLabel} /></span></div>
                  )}
                  {child.reason && (
                    <div className="detail-row"><span className="detail-label">Begrundelse</span><span className="detail-value">{child.reason}</span></div>
                  )}
                  {!isFieldChange && child.bilag && (
                    <div className="detail-row"><span className="detail-label">Bilag</span><span className="detail-value">{child.bilag}</span></div>
                  )}
                  {child.note && (
                    <div className="detail-row"><span className="detail-label">Ansvarlig</span><span className="detail-value">{child.note}</span></div>
                  )}
                </div>
                {revertible && (
                  <div className="eva-log-sub-actions">
                    {child.reverted ? (
                      <span className="eva-log-reverted-tag"><Icon name="arrow-undo" /> Fortrudt</span>
                    ) : (
                      <button type="button" className="eva-log-revert-btn" onClick={() => onRevert(child.id)}>Fortryd ændring</button>
                    )}
                  </div>
                )}
              </>
            </List.Collapsible>
          </List>
        </div>
      </div>
    </div>
  )
}

export default function EvaLog({ entries = [], onRevert, onToggleWorkflow, onOpenWorkflow }) {
  const [openEntryId, setOpenEntryId] = useState(null)

  if (entries.length === 0) {
    return (
      <div className="eva-empty">
        <EvaLogo size={28} />
        <p>Ingen handlinger endnu. Det Eva foretager sig — konteringer, rettelser, påmindelser — lander her.</p>
      </div>
    )
  }

  // Drilldown — the sub-events of one bulk action
  const openEntry = openEntryId ? entries.find((e) => e.id === openEntryId) : null
  if (openEntry) {
    const revertible = !!openEntry.revertible
    const pending = (openEntry.children || []).filter((c) => !c.reverted).length
    return (
      <div className="eva-activity eva-log-list eva-log-drill">
        <button type="button" className="eva-log-back" onClick={() => setOpenEntryId(null)}>
          <Icon name="arrow-left" /> Tilbage
        </button>
        <div className="eva-log-drill-title">{openEntry.title}</div>
        <div className="eva-log-drill-meta">{openEntry.date} · {openEntry.ref} · {openEntry.actor}</div>
        <div className="log-drilldown-body">
          {(openEntry.children || []).map((child) => (
            <SubEventCard
              key={child.id}
              entry={openEntry}
              child={child}
              revertible={revertible}
              onRevert={(childId) => onRevert(openEntry.id, childId)}
            />
          ))}
        </div>
        {revertible && pending > 0 && (
          <div className="eva-artifact-quick eva-log-drill-foot">
            <button type="button" className="eva-artifact-quick-btn" onClick={() => onRevert(openEntry.id, null)}>
              <Icon name="arrow-undo" /> Fortryd alle ({pending})
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="eva-activity eva-log-list">
      <div className="eva-activity-filter">
        <span>Alle Eva-handlinger</span>
        <Icon name="chevron-down" />
      </div>
      <div className="eva-activity-list">
        {entries.map((entry) =>
          entry.bulk ? (
            <BulkAction key={entry.id} entry={entry} onOpen={() => setOpenEntryId(entry.id)} />
          ) : (
            <InlineAction key={entry.id} entry={entry} onRevert={onRevert} onToggleWorkflow={onToggleWorkflow} onOpenWorkflow={onOpenWorkflow} />
          )
        )}
      </div>
    </div>
  )
}
