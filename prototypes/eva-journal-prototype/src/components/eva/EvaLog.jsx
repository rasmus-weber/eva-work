import { Icon, List, Tag } from '@economic/taco'
import { EvaLogo } from './EvaLogo'

/* The "Log" tab in the Eva drawer — every action Eva has performed, newest
   first. Reuses the .log-entry / .timeline / .log-card-wrapper chassis (same
   look as the entry- and page-level logs) but each entry can bundle multiple
   entity events: a bulk action (e.g. a VAT fix across 6 postings) expands to
   show the individual events, each revertible on its own, plus a bulk revert.
   Reverting is wired up in App (restores the grid cell); settled actions like
   a sent reminder are not revertible. */

function ChangeChips({ from, to, toLabel }) {
  return (
    <span className="eva-vat-item-change">
      <span className="eva-vat-chip eva-vat-chip-from">{from || 'Ingen'}</span>
      <span className="eva-vat-arrow">→</span>
      <span className="eva-vat-chip eva-vat-chip-to">{toLabel || to || 'Ingen'}</span>
    </span>
  )
}

// One event row inside an expanded action (used for bulk actions and for the
// single-event detail). Shows the affected posting, the field change, and —
// when the action is revertible — a per-event revert control.
function EventRow({ child, revertible, onRevert }) {
  const isFieldChange = child.from !== undefined || child.toLabel !== undefined
  return (
    <div className={`eva-log-event ${child.reverted ? 'eva-log-event-reverted' : ''}`}>
      <div className="eva-log-event-main">
        {isFieldChange ? (
          <>
            <span className="eva-log-event-bilag">
              Bilag {child.bilag} · {child.tekst}
              {child.fieldLabel ? <span className="eva-log-event-field"> · {child.fieldLabel}</span> : null}
            </span>
            <ChangeChips from={child.from} to={child.to} toLabel={child.toLabel} />
          </>
        ) : child.label ? (
          <span className="eva-log-event-bilag">
            <span className="eva-log-event-field">{child.label}</span> {child.value}
          </span>
        ) : (
          <span className="eva-log-event-bilag">
            Bilag {child.bilag} · {child.tekst}
            {child.note ? <span className="eva-log-event-field"> · {child.note}</span> : null}
          </span>
        )}
      </div>
      {revertible && (
        child.reverted ? (
          <span className="eva-log-reverted-tag"><Icon name="arrow-undo" /> Fortrudt</span>
        ) : (
          <button type="button" className="eva-log-revert-btn" onClick={() => onRevert(child.id)}>
            Fortryd
          </button>
        )
      )}
    </div>
  )
}

function LogAction({ entry, onRevert, onToggleWorkflow }) {
  const bulk = entry.children && entry.children.length > 1
  const revertible = !!entry.revertible
  const fullyReverted = entry.reverted
  const isWorkflow = entry.kind === 'workflow'
  const deactivated = isWorkflow && entry.active === false
  const dimmed = fullyReverted || deactivated
  const pendingChildren = (entry.children || []).filter((c) => !c.reverted).length

  const titleNode = (
    <span className="eva-log-title-row">
      <span className={fullyReverted ? 'eva-log-title-struck' : ''}>{entry.title}</span>
      {entry.typeLabel && <span className="eva-log-type">{entry.typeLabel}</span>}
      {fullyReverted && <Tag color="neutral">Fortrudt</Tag>}
      {deactivated && <Tag color="neutral">Deaktiveret</Tag>}
    </span>
  )

  return (
    <div className={`log-entry ${dimmed ? 'eva-log-action-reverted' : ''}`}>
      <div className="timeline">
        <div className="timeline-icon">
          <Icon name={fullyReverted ? 'arrow-undo' : deactivated ? 'remove' : 'circle-tick'} />
        </div>
        <div className="timeline-spacer" />
      </div>
      <div className="log-body">
        <div className="log-date eva-log-date">
          <span>{entry.date}</span>
          <span className="eva-log-meta">{entry.actor}</span>
        </div>
        <div className="log-card-wrapper">
          <List>
            <List.Collapsible icon={entry.icon} title={titleNode} description={entry.description} defaultOpen={false}>
              <div className="eva-log-events">
                {revertible && bulk && !fullyReverted && (
                  <button
                    type="button"
                    className="eva-log-revert-all"
                    onClick={() => onRevert(entry.id, null)}
                  >
                    <Icon name="arrow-undo" /> Fortryd alle ({pendingChildren})
                  </button>
                )}
                {(entry.children || []).map((child) => (
                  <EventRow
                    key={child.id}
                    child={child}
                    revertible={revertible}
                    onRevert={(childId) => onRevert(entry.id, childId)}
                  />
                ))}
                {isWorkflow && (
                  deactivated ? (
                    <button type="button" className="eva-log-wf-btn eva-log-wf-reactivate" onClick={() => onToggleWorkflow?.(entry.id)}>
                      <Icon name="play-solid" /> Genaktivér workflow
                    </button>
                  ) : (
                    <button type="button" className="eva-log-wf-btn" onClick={() => onToggleWorkflow?.(entry.id)}>
                      <Icon name="remove" /> Deaktivér workflow
                    </button>
                  )
                )}
              </div>
            </List.Collapsible>
          </List>
        </div>
      </div>
    </div>
  )
}

export default function EvaLog({ entries = [], onRevert, onToggleWorkflow }) {
  if (entries.length === 0) {
    return (
      <div className="eva-empty">
        <EvaLogo size={28} />
        <p>Ingen handlinger endnu. Det Eva foretager sig — konteringer, rettelser, påmindelser — lander her.</p>
      </div>
    )
  }
  return (
    <div className="eva-activity eva-log-list">
      <div className="eva-activity-filter">
        <span>Alle Eva-handlinger</span>
        <Icon name="chevron-down" />
      </div>
      {entries.map((entry) => (
        <LogAction key={entry.id} entry={entry} onRevert={onRevert} onToggleWorkflow={onToggleWorkflow} />
      ))}
    </div>
  )
}
