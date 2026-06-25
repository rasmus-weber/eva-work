import { Icon, List, Tag } from '@economic/taco'

/* Reusable collapsible activity timeline.
   Shared by the Page drawer "Log" tab and the Workflow drawer "Kørsler" tab.
   Reuses the .log-entry / .timeline / .log-card-wrapper chassis from App.css
   (the same look as the entry-level Log tab) and adds a date+meta row,
   a "Seneste aktivitet" filter header, and failed-run styling. */

function DetailTable({ details = [] }) {
  if (!details.length) return null
  return (
    <div className="detail-table">
      {details.map((d, i) => (
        <div className="detail-row" key={i}>
          <span className="detail-label">{d.label}</span>
          <span className={`detail-value ${d.link ? 'link' : ''}`}>{d.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function EvaActivityTimeline({ entries = [], filterLabel = 'Seneste aktivitet' }) {
  return (
    <div className="eva-activity">
      <div className="eva-activity-filter">
        <span>{filterLabel}</span>
        <Icon name="chevron-down" />
      </div>
      <div className="eva-activity-list">
        {entries.map((entry, i) => (
          <div key={i} className={`log-entry ${entry.failed ? 'eva-log-failed' : ''}`}>
            <div className="timeline">
              <div className={`timeline-icon ${entry.failed ? 'timeline-icon-failed' : ''}`}>
                <Icon name={entry.failed ? 'remove' : 'circle-tick'} />
              </div>
              <div className="timeline-spacer" />
            </div>
            <div className="log-body">
              <div className="log-date eva-log-date">
                <span>{entry.date}</span>
                {entry.meta && <span className="eva-log-meta">{entry.meta}</span>}
              </div>
              <div className="log-card-wrapper">
                <List>
                  <List.Collapsible
                    icon={entry.icon}
                    title={
                      entry.failed ? (
                        <span className="eva-failed-title">
                          {entry.title}
                          <Tag color="red">Failed</Tag>
                        </span>
                      ) : (
                        entry.title
                      )
                    }
                    description={entry.description}
                    defaultOpen={entry.defaultOpen ?? entry.failed}
                  >
                    {entry.failed ? (
                      <div className="eva-error-banner">{entry.error}</div>
                    ) : (
                      <DetailTable details={entry.details} />
                    )}
                  </List.Collapsible>
                </List>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
