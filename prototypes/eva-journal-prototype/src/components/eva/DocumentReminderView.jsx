import { useState } from 'react'
import { Button, IconButton, Table3, Tag, Menu, Icon } from '@economic/taco'
import { EvaLogo } from './EvaLogo'

/* Full-screen "artifact" view Eva opens from the "Send reminders" conversation.
   Covers everything to the right of the 380px Eva drawer, on top of the journal
   (see .eva-artifact-view in eva.css). Header (title) top-left, header actions +
   close top-right, and a Table3 of postings missing their document — with
   filtering / settings / print on the right and a "Send påmindelse" primary
   action + Mere menu on the left.

   The header also lets the user keep the artifact around: "Gem til senere"
   bookmarks it, and "Automatisér" proposes an Eva automation (trigger → action)
   that runs this on a schedule going forward. */

export const MISSING_DOC_ROWS = [
  { id: 'm1', bilag: '2345699', dato: '29.01.26', tekst: 'Annoncering Facebook', belob: 6800, leverandor: 'Meta Platforms', ansvarlig: 'Carl Ejlers', status: 'Mangler bilag' },
  { id: 'm2', bilag: '2345694', dato: '21.01.26', tekst: 'Skyldige feriepenge', belob: 4200, leverandor: 'Lønadministration', ansvarlig: 'Maria Svensen', status: 'Mangler bilag' },
  { id: 'm3', bilag: '2345690', dato: '02.01.26', tekst: 'Skyldig ATP', belob: 1890, leverandor: 'ATP', ansvarlig: 'Maria Svensen', status: 'Anmodning sendt' },
  { id: 'm4', bilag: '2345687', dato: '18.01.26', tekst: 'Skyldig pension', belob: 5400, leverandor: 'PFA Pension', ansvarlig: 'Carl Ejlers', status: 'Mangler bilag' },
  { id: 'm5', bilag: '2345683', dato: '28.01.26', tekst: 'Skyldige feriepenge', belob: 3120, leverandor: 'Lønadministration', ansvarlig: 'Anders Holm', status: 'Mangler bilag' },
  { id: 'm6', bilag: '2345681', dato: '31.12.24', tekst: 'Google Workspace', belob: 780, leverandor: 'Google Ireland', ansvarlig: 'Carl Ejlers', status: 'Mangler bilag' },
  { id: 'm7', bilag: '2345678', dato: '18.03.25', tekst: 'Rent FEB', belob: 12500, leverandor: 'DEAS Ejendomme', ansvarlig: 'Anders Holm', status: 'Anmodning sendt' },
  { id: 'm8', bilag: '2345675', dato: '12.01.26', tekst: 'Telefoni og internet', belob: 940, leverandor: 'TDC Erhverv', ansvarlig: 'Maria Svensen', status: 'Mangler bilag' },
]

export default function DocumentReminderView({ open, onClose, rows = MISSING_DOC_ROWS, onSendReminders, automated = false, onReviewAutomation, onOpenActivatedAutomation }) {
  const [selected, setSelected] = useState([])

  if (!open) return null

  const sendReminders = (ids) => {
    // null => send to all; the rows state is owned by App so the chat quick
    // action and this view stay in sync.
    onSendReminders?.(ids && ids.length ? ids : null)
    setSelected([])
  }

  return (
    <div className="eva-artifact-view" role="dialog" aria-label="Posteringer uden bilag">
      <div className="eva-artifact-header">
        <div className="eva-artifact-title">
          <span className="eva-artifact-eyebrow"><EvaLogo size={18} /> Eva · Artefakt</span>
          <h2>Posteringer uden bilag</h2>
        </div>
        <div className="eva-artifact-actions">
          {automated ? (
            <Button className="eva-artifact-automated-btn" onClick={() => onOpenActivatedAutomation?.()}>
              <Icon name="tick" /> Aktivt workflow
            </Button>
          ) : (
            <Button onClick={() => onReviewAutomation?.()}>
              <EvaLogo size={16} /> Opret workflow
            </Button>
          )}
          <IconButton icon="close" appearance="discrete" aria-label="Luk" onClick={onClose} />
        </div>
      </div>

      <div className="eva-artifact-body">
        <div className="table3-wrapper">
          <Table3
            id="artifact-doc-table"
            data={rows}
            rowIdentityAccessor="id"
            enableRowSelection
            selectedRows={selected}
            onRowSelect={(_, ids) => setSelected(ids)}
            enableFiltering
            enableColumnHiding
            enablePrinting
            enableFooter
            length={rows.length}
            toolbarLeft={
              <div className="action-buttons">
                <Button appearance="primary" icon="bell-solid" onClick={() => sendReminders(selected)}>
                  Send påmindelse
                </Button>
                <Menu>
                  <Menu.Trigger>
                    <Button>Mere <Icon name="chevron-down" /></Button>
                  </Menu.Trigger>
                  <Menu.Content>
                    <Menu.Item icon="inbox" onClick={() => {}}>Anmod om bilag</Menu.Item>
                    <Menu.Item icon="document-preview" onClick={() => {}}>Eksportér til Excel</Menu.Item>
                  </Menu.Content>
                </Menu>
              </div>
            }
          >
            <Table3.Column accessor="bilag" header="Bilag" defaultWidth={110} enableFiltering />
            <Table3.Column accessor="dato" header="Dato" defaultWidth={100} enableFiltering />
            <Table3.Column accessor="tekst" header="Tekst" defaultWidth={210} enableFiltering />
            <Table3.Column accessor="belob" header="Beløb" dataType="amount" align="right" defaultWidth={120} enableFiltering />
            <Table3.Column accessor="leverandor" header="Leverandør" defaultWidth={180} enableFiltering />
            <Table3.Column accessor="ansvarlig" header="Ansvarlig" defaultWidth={160} enableFiltering />
            <Table3.Column
              accessor="status"
              header="Status"
              defaultWidth={160}
              enableFiltering
              renderer={({ value }) => (
                <Tag color={value === 'Påmindelse sendt' ? 'green' : value === 'Anmodning sendt' ? 'blue' : 'yellow'}>
                  {value}
                </Tag>
              )}
            />
          </Table3>
        </div>
      </div>
    </div>
  )
}
