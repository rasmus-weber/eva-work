import { Icon, IconButton, List } from '@economic/taco'

function LogEntry({ date, children }) {
  return (
    <div className="log-entry">
      <div className="timeline">
        <div className="timeline-icon"><Icon name="circle-tick" /></div>
        <div className="timeline-spacer" />
      </div>
      <div className="log-body">
        <div className="log-date">{date}</div>
        <div className="log-card-wrapper">
          {children}
        </div>
      </div>
    </div>
  )
}

function BackHeader({ drilldownStack, onGoToDrilldownLevel }) {
  const currentTitle = drilldownStack[drilldownStack.length - 1]
  return (
    <div className="log-back-header">
      <IconButton icon="arrow-left" aria-label="Back" onClick={() => onGoToDrilldownLevel(drilldownStack.length - 1)} />
      <span className="log-back-title">{currentTitle}</span>
    </div>
  )
}

export default function LogTab({ drilldownStack, onPushDrilldown, onGoToDrilldownLevel, entryNumber }) {
  const depth = drilldownStack.length

  return (
    <>
      {depth > 0 && (
        <BackHeader
          drilldownStack={drilldownStack}
          onGoToDrilldownLevel={onGoToDrilldownLevel}
        />
      )}

      {/* Level 0: Main log entries */}
      {depth === 0 && (
        <>
          <LogEntry date="22.02.25">
            <List>
              <List.Collapsible icon="edit" title="Redigeret" description="Maria Svensen" defaultOpen>
                <div className="detail-table">
                  <div className="detail-row"><span className="detail-label">Belob</span><span className="detail-value">1.000,00</span></div>
                  <div className="detail-row"><span className="detail-label">Konto</span><span className="detail-value">5820 - Bankkonto</span></div>
                  <div className="detail-row"><span className="detail-label">Modkonto</span><span className="detail-value">2729 - Sales and services</span></div>
                  <div className="detail-row"><span className="detail-label">Bilagsnummer</span><span className="detail-value">19392</span></div>
                  <div className="detail-row"><span className="detail-label">Moms</span><span className="detail-value link">IV 25</span></div>
                </div>
              </List.Collapsible>
            </List>
          </LogEntry>

          <LogEntry date="22.02.25">
            <List>
              <List.Collapsible icon="attach-auto" title="Bilag tilføjet" description="Marlene Andersen">
                <div className="detail-table">
                  <div className="detail-row"><span className="detail-label">Kassekladde</span><span className="detail-value">Daglig</span></div>
                  <div className="detail-row"><span className="detail-label">Konto</span><span className="detail-value">5820 - Bankkonto</span></div>
                  <div className="detail-row"><span className="detail-label">Modkonto</span><span className="detail-value">2729 - Sales and services</span></div>
                  <div className="detail-row"><span className="detail-label">Dimension</span><span className="detail-value">1 - Salg</span></div>
                  <div className="detail-row"><span className="detail-label">Dimension</span><span className="detail-value">2 - Per</span></div>
                  <div className="detail-row"><span className="detail-label">Bilag</span><span className="detail-value">Faktura.pdf</span></div>
                  <div className="detail-row"><span className="detail-label">Historik</span><span className="detail-value link" onClick={() => onPushDrilldown('Faktura.pdf')}>2 ændringer</span></div>
                </div>
              </List.Collapsible>
            </List>
          </LogEntry>

          <LogEntry date="22.02.25">
            <List>
              <List.Collapsible icon="circle-plus" title="Postering oprettet" description="Autobooking workflow 2">
                <div className="detail-table">
                  <div className="detail-row"><span className="detail-label">Kassekladde</span><span className="detail-value">Daglig</span></div>
                  <div className="detail-row"><span className="detail-label">Konto</span><span className="detail-value">5820 - Bankkonto</span></div>
                  <div className="detail-row"><span className="detail-label">Modkonto</span><span className="detail-value">2729 - Sales and services</span></div>
                </div>
              </List.Collapsible>
            </List>
          </LogEntry>
        </>
      )}

      {/* Level 1: Faktura.pdf drilldown */}
      {depth === 1 && (
        <div className="log-drilldown-body">
          <LogEntry date="22.02.25">
            <List>
              <List.Collapsible icon="edit" title="Edited" description="Marlene Andersen">
                <div className="detail-table">
                  <div className="detail-row"><span className="detail-label">Ændring</span><span className="detail-value">Filnavn opdateret</span></div>
                  <div className="detail-row"><span className="detail-label">Historik</span><span className="detail-value link" onClick={() => onPushDrilldown('Filnavn')}>3 versioner</span></div>
                </div>
              </List.Collapsible>
            </List>
          </LogEntry>
          <LogEntry date="22.02.25">
            <List>
              <List.Collapsible icon="export" title="Uploaded" description="Maria Andersen">
                <div className="detail-table">
                  <div className="detail-row"><span className="detail-label">Fil</span><span className="detail-value">Faktura.pdf</span></div>
                </div>
              </List.Collapsible>
            </List>
          </LogEntry>
        </div>
      )}

      {/* Level 2: Third level drilldown */}
      {depth === 2 && (
        <div className="log-drilldown-body">
          <LogEntry date="22.02.25">
            <List>
              <List.Collapsible icon="edit" title="Version 3" description="Marlene Andersen">
                <div className="detail-table">
                  <div className="detail-row"><span className="detail-label">Filnavn</span><span className="detail-value">Faktura_final.pdf</span></div>
                </div>
              </List.Collapsible>
            </List>
          </LogEntry>
          <LogEntry date="21.02.25">
            <List>
              <List.Collapsible icon="edit" title="Version 2" description="Maria Andersen">
                <div className="detail-table">
                  <div className="detail-row"><span className="detail-label">Filnavn</span><span className="detail-value">Faktura_v2.pdf</span></div>
                </div>
              </List.Collapsible>
            </List>
          </LogEntry>
          <LogEntry date="20.02.25">
            <List>
              <List.Collapsible icon="export" title="Version 1" description="Maria Andersen">
                <div className="detail-table">
                  <div className="detail-row"><span className="detail-label">Filnavn</span><span className="detail-value">Faktura.pdf</span></div>
                </div>
              </List.Collapsible>
            </List>
          </LogEntry>
        </div>
      )}
    </>
  )
}
