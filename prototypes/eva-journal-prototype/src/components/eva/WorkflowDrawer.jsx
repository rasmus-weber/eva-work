import { useState, useRef, useEffect } from 'react'
import { Button, IconButton, Icon, Tabs, Switch, Tag } from '@economic/taco'
import { EvaLogo } from './EvaLogo'
import EvaActivityTimeline from './EvaActivityTimeline'

/* Standalone, right-anchored workflow drawer with TWO states (mirrors the
   workflows-hub pattern):
   · suggestion — a proposed automation the user reviews + activates
   · activated  — the dashboard (Generelt / Workflow / Kørsler)
   Rendered as an overlay on top of whatever is underneath (the page drawer or
   the artifact view), so "review" stacks on top and the artifact stays visible
   to its left. */

const WF_LINK = [
  { label: 'Workflow', value: 'Match indbetalinger til fakturaer', link: true },
  { label: 'Kilde', value: 'Inbox' },
]

const WORKFLOW_RUNS = [
  { date: '20.05.26 16:48', meta: '19393 - Daglig', icon: 'book', title: 'Bogført', description: 'Bankpost 19393 → bilag 2035', failed: true, error: 'Ingen modkonto tilføjet' },
  { date: '20.05.26 14:32', meta: '19392 - Daglig', icon: 'book', title: 'Bogført', description: 'Bankpost 19392 → bilag 2034', details: WF_LINK },
  { date: '20.05.26 09:15', meta: '19391 - Daglig', icon: 'book', title: 'Bogført', description: 'Bankpost 19391 → bilag 2032', details: WF_LINK },
  { date: '19.05.26 14:02', meta: '19389 - Daglig', icon: 'book', title: 'Bogført', description: 'Bankpost 19389 → bilag 2030', details: WF_LINK },
  { date: '19.05.26 11:00', meta: '19388 - Daglig', icon: 'book', title: 'Bogført', description: 'Bankpost 19388 → bilag 2029', details: WF_LINK },
]

function WorkflowStatCard({ label, value, sub, bar }) {
  return (
    <div className="eva-wf-stat">
      <div className="eva-wf-stat-label">{label}</div>
      <div className="eva-wf-stat-value">{value}</div>
      {sub && <div className="eva-wf-stat-sub">{sub}</div>}
      {bar && (
        <div className="eva-wf-stat-bar">
          <div className={`eva-wf-stat-bar-fill ${bar.color}`} style={{ width: bar.pct + '%' }} />
        </div>
      )}
    </div>
  )
}

function stepsFor(workflow) {
  return [
    { num: '1. Hvis…', color: 'blue', label: 'Trigger', value: workflow?.triggerPill || 'Ny bankpost ankommer' },
    { num: '2. Så gør følgende', color: 'green', label: 'Handling', value: workflow?.actionPill || 'Match til bilag' },
    { num: '3. Og derefter…', color: 'green', label: 'Handling', value: 'Bogfør hvis match' },
  ]
}

export default function WorkflowDrawer({ workflow, activated = false, onClose, onActivate, onDismiss }) {
  const [tab, setTab] = useState('generelt')
  const [workflowActive, setWorkflowActive] = useState(true)
  if (!workflow) return null

  const steps = stepsFor(workflow)

  return (
    <div className="eva-wf-drawer-inner">
        <div className="eva-wf-drawer-header">
          <span className="eva-wf-drawer-eva"><Icon name="workflow" /></span>
          <h2 className="eva-wf-drawer-title">{workflow.title}</h2>
        </div>

        {!activated ? (
          /* ─────────── SUGGESTION STATE ─────────── */
          <>
            <div className="eva-wf-drawer-body">
              <div className="eva-wf-why">
                <span className="eva-wf-why-logo"><EvaLogo size={20} /></span>
                <div className="eva-wf-why-main">
                  <div className="eva-wf-why-title">Hvorfor Eva foreslår dette</div>
                  {workflow.reason && <div className="eva-wf-why-reason">{workflow.reason}</div>}
                  <div className="eva-wf-why-meta">
                    <span className="inline-flex items-center gap-1">
                      <Icon name="circle-tick" className="!h-4 !w-4" /> {workflow.confidencePct}% sikker
                    </span>
                    {workflow.timeSaved && (
                      <span className="inline-flex items-center gap-1">
                        <Icon name="time" className="!h-4 !w-4" /> {workflow.timeSaved}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="eva-section-label">Sådan virker det</div>
              {steps.map((s, i) => (
                <div className="eva-wf-step" key={i}>
                  <div className="eva-wf-step-head">
                    <span className="eva-wf-step-title">{s.num}</span>
                    <Tag color={s.color}>{s.label}</Tag>
                  </div>
                  <div className="eva-wf-step-field">
                    <span>{s.value}</span>
                    <Icon name="chevron-down" />
                  </div>
                </div>
              ))}
            </div>
            <div className="eva-wf-drawer-footer">
              <Button onClick={onClose}>Annullér</Button>
              <Button appearance="primary" onClick={() => onActivate?.(workflow)}>Aktivér</Button>
            </div>
          </>
        ) : (
          /* ─────────── ACTIVATED STATE (dashboard) ─────────── */
          <Tabs id={tab} onChange={setTab}>
            <Tabs.List>
              <Tabs.Trigger id="generelt">Generelt</Tabs.Trigger>
              <Tabs.Trigger id="workflow">Workflow</Tabs.Trigger>
              <Tabs.Trigger id="koersler">Kørsler</Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content id="generelt" className="eva-wf-drawer-body">
              <div className="eva-wf-summary">
                <p className="eva-wf-summary-text">
                  Hvis <span className="eva-wf-trigger-text">{(workflow.triggerPill || 'ny bankpost ankommer').toLowerCase()}</span>,
                  {' '}så <span className="eva-wf-action-text">{(workflow.actionPill || 'match til bilag → bogfør hvis match').toLowerCase()}</span>.
                </p>
                <div className="eva-wf-summary-foot">
                  <span>Seneste kørsel: I dag 14:32 · 248 kørsler totalt</span>
                  <span className="eva-wf-toggle">
                    <Switch checked={workflowActive} onChange={setWorkflowActive} />
                    {workflowActive ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </div>
              </div>

              <div className="eva-wf-stats">
                <WorkflowStatCard label="Kørsler" value="248" sub="seneste 30 dage" />
                <WorkflowStatCard label="Fejlrate" value="0,6%" bar={{ pct: 1, color: 'red' }} />
                <WorkflowStatCard label="Matchrate" value="92%" bar={{ pct: 92, color: 'green' }} />
              </div>

              <div className="eva-wf-detaljer">
                <h4 className="eva-wf-detaljer-head">Detaljer</h4>
                <div className="eva-wf-detail-row"><span className="eva-wf-detail-label">Oprettet</span><span className="eva-wf-detail-value">15.03.26 af Carl Ejlers</span></div>
                <div className="eva-wf-detail-row"><span className="eva-wf-detail-label">Sidst ændret</span><span className="eva-wf-detail-value">I dag 14:32 af Carl Ejlers</span></div>
                <div className="eva-wf-detail-row"><span className="eva-wf-detail-label">Kategori</span><Tag color="grey">Bank</Tag></div>
              </div>

              <div className="eva-wf-danger">
                <div className="eva-wf-danger-text">
                  <div className="eva-wf-danger-title">Slet workflow</div>
                  <div className="eva-wf-danger-sub">Sletning kan ikke fortrydes.</div>
                </div>
                <button type="button" className="eva-wf-danger-btn" onClick={() => { onDismiss?.(workflow); onClose?.() }}>Slet</button>
              </div>
            </Tabs.Content>

            <Tabs.Content id="workflow" className="eva-wf-drawer-body">
              <div className="eva-wf-auto-card">
                <div className="eva-wf-auto-text">
                  <div className="eva-wf-auto-title">Workflow</div>
                  <div className="eva-wf-auto-sub">Seneste kørsel: I dag 14:00 · 332 kørsler totalt</div>
                </div>
                <span className="eva-wf-toggle">
                  <Switch checked={workflowActive} onChange={setWorkflowActive} />
                  {workflowActive ? 'Aktiv' : 'Inaktiv'}
                </span>
              </div>
              {steps.map((s, i) => (
                <div className="eva-wf-step" key={i}>
                  <div className="eva-wf-step-head">
                    <span className="eva-wf-step-title">{s.num}</span>
                    <Tag color={s.color}>{s.label}</Tag>
                  </div>
                  <div className="eva-wf-step-field">
                    <span>{s.value}</span>
                    <Icon name="chevron-down" />
                  </div>
                </div>
              ))}
              <div className="eva-workflow-footer">
                <Button onClick={onClose}>Annullér</Button>
                <Button appearance="primary" onClick={onClose}>Gem</Button>
              </div>
            </Tabs.Content>

            <Tabs.Content id="koersler" className="eva-wf-drawer-body">
              <EvaActivityTimeline entries={WORKFLOW_RUNS} />
            </Tabs.Content>
          </Tabs>
        )}
      </div>
  )
}
