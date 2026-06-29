import { useState, useEffect } from 'react'
import { Button, IconButton, Table3, Tag, Menu, Icon } from '@economic/taco'
import { EvaLogo } from './EvaLogo'

/* Full-screen "artifact" view Eva opens from a VAT-anomaly conversation. Mirrors
   DocumentReminderView: covers everything right of the Eva drawer, a Table3 of
   the flagged postings with a from→to "Momskode" column so the change is visual,
   row selection, and an "Anvend ændringer" primary action that writes the
   selected fixes straight into the journal grid (via onApply). Rows already
   applied show a green "Rettet" status and drop out of the selection. */

function ChangeCell({ row }) {
  return (
    <span className="eva-vat-change-cell">
      <span className="eva-vat-chip eva-vat-chip-from">{row.from || 'Ingen'}</span>
      <span className="eva-vat-arrow">→</span>
      <span className="eva-vat-chip eva-vat-chip-to">{row.toLabel || row.to || 'Ingen'}</span>
    </span>
  )
}

export default function VatAnomalyView({ open, onClose, suggestions = [], appliedIds, onApply }) {
  const [selected, setSelected] = useState([])

  // Default-select the still-pending rows each time the artefact opens.
  useEffect(() => {
    if (open) setSelected(suggestions.filter((s) => !appliedIds?.has(s.id)).map((s) => s.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const data = suggestions.map((s) => ({ ...s, status: appliedIds?.has(s.id) ? 'Rettet' : 'Foreslået' }))
  const pendingCount = data.filter((d) => d.status !== 'Rettet').length

  const apply = () => {
    const changes = suggestions.filter((s) => selected.includes(s.id) && !appliedIds?.has(s.id))
    if (changes.length) onApply?.(changes)
    setSelected([])
  }

  return (
    <div className="eva-artifact-view" role="dialog" aria-label="Momsafvigelser">
      <div className="eva-artifact-header">
        <div className="eva-artifact-title">
          <span className="eva-artifact-eyebrow"><EvaLogo size={18} /> Eva · Artefakt</span>
          <h2>Momsafvigelser</h2>
        </div>
        <div className="eva-artifact-actions">
          <IconButton icon="close" appearance="discrete" aria-label="Luk" onClick={onClose} />
        </div>
      </div>

      <div className="eva-artifact-body">
        <div className="table3-wrapper">
          <Table3
            id="artifact-vat-table"
            data={data}
            rowIdentityAccessor="id"
            enableRowSelection
            selectedRows={selected}
            onRowSelect={(_, ids) => setSelected(ids)}
            enableFiltering
            enableColumnHiding
            enablePrinting
            enableFooter
            length={data.length}
            toolbarLeft={
              <div className="action-buttons">
                <Button appearance="primary" icon="tick" disabled={selected.length === 0} onClick={apply}>
                  Anvend ændringer{selected.length > 0 ? ` (${selected.length})` : ''}
                </Button>
                <Menu>
                  <Menu.Trigger>
                    <Button>Mere <Icon name="chevron-down" /></Button>
                  </Menu.Trigger>
                  <Menu.Content>
                    <Menu.Item icon="document-preview" onClick={() => {}}>Eksportér til Excel</Menu.Item>
                  </Menu.Content>
                </Menu>
                {pendingCount === 0 && (
                  <span className="eva-vat-artifact-status"><Icon name="tick-circle" /> Alle rettet</span>
                )}
              </div>
            }
          >
            <Table3.Column accessor="bilag" header="Bilag" defaultWidth={110} enableFiltering />
            <Table3.Column accessor="tekst" header="Tekst" defaultWidth={200} enableFiltering />
            <Table3.Column accessor="konto" header="Konto" defaultWidth={220} enableFiltering />
            <Table3.Column
              accessor="to"
              header="Momskode"
              defaultWidth={150}
              renderer={({ row }) => <ChangeCell row={row} />}
            />
            <Table3.Column accessor="reason" header="Begrundelse" defaultWidth={340} enableFiltering />
            <Table3.Column
              accessor="confidencePct"
              header="Sikkerhed"
              align="right"
              defaultWidth={110}
              renderer={({ value }) => `${value}%`}
            />
            <Table3.Column
              accessor="status"
              header="Status"
              defaultWidth={130}
              enableFiltering
              renderer={({ value }) => (
                <Tag color={value === 'Rettet' ? 'green' : 'yellow'}>{value}</Tag>
              )}
            />
          </Table3>
        </div>
      </div>
    </div>
  )
}
