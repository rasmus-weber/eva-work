import { useState, useRef, useEffect } from 'react'
import { Button, IconButton, Icon, Tag, Tabs, Checkbox } from '@economic/taco'
import { EvaLogo } from './EvaLogo'
import EvaLog from './EvaLog'
import { vatAnomalySeed, vatAnomalySeedLarge } from '../../data'

const VAT_ANOMALIES = vatAnomalySeed

const buildVatArtifact = (suggestions) => ({
  // id distinguishes the two VAT sets (3 vs 6) so each chat card knows whether
  // *its* artefact is the one currently open.
  id: `vat-anomalies-${suggestions.length}`,
  kind: 'vat',
  title: 'Momsafvigelser',
  count: suggestions.length,
  suggestions,
})

/* Eva left drawer — two states, mirroring the ai-logo-concepts drawer mock:
   · list  — conversation list ("Ny samtale" at top, "Seneste" label, plain items)
   · chat  — inside a conversation (breadcrumb header; Eva answers are plain text
             + optional citation + a row of action icons, no bubble)
   Rich Eva messages can carry a KPI card, a Top-3 table, or an in-chat
   workflow card. Identity stays orange/navy (not the reference's blue/purple);
   surface follows the concept's light variant (white/slate, brand-blue send). */

const SEED_CONVERSATIONS = [
  {
    id: 'afvigelser',
    title: 'Find afvigelser',
    time: 'nu',
    preview: 'Find afvigelser i momskoderne',
    messages: [
      { from: 'user', text: 'Find afvigelser i kassekladden' },
      {
        from: 'eva',
        text: (
          <>
            Jeg har gennemgået momskoderne og fundet <strong>3 posteringer</strong>,
            hvor koden sandsynligvis er forkert. Her er et overblik — åbn artefaktet
            for detaljer, eller anvend ændringerne direkte.
          </>
        ),
        vatSuggestions: VAT_ANOMALIES,
      },
    ],
    chips: ['Forklar IY25', 'Find flere afvigelser'],
  },
  {
    id: 'afvigelser-q1',
    title: 'Momstjek · hele kvartalet',
    time: '1t',
    preview: 'Tjek momskoderne for hele kvartalet',
    messages: [
      { from: 'user', text: 'Tjek momskoderne for hele kvartalet' },
      {
        from: 'eva',
        text: (
          <>
            Jeg har gennemgået momskoderne for kvartalet og fundet
            <strong> {vatAnomalySeedLarge.length} posteringer</strong>, hvor koden
            sandsynligvis er forkert. Her er et overblik — åbn artefaktet for
            detaljer, eller anvend ændringerne direkte.
          </>
        ),
        vatSuggestions: vatAnomalySeedLarge,
      },
    ],
    chips: ['Anvend alle', 'Forklar IY25'],
  },
  {
    id: 'reminders',
    title: 'Send reminders',
    time: 'nu',
    preview: 'Find alle posteringer uden bilag og send påmindelser',
    messages: [
      { from: 'user', text: 'Find alle posteringer uden bilag og send påmindelser til de ansvarlige' },
      {
        from: 'eva',
        text: (
          <>
            Jeg fandt <strong>8 posteringer</strong> uden bilag på den daglige
            kassekladde. Jeg har samlet dem i et artefakt — åbn det for at
            gennemgå posteringerne og sende påmindelser til de ansvarlige.
          </>
        ),
        artifact: {
          id: 'missing-docs',
          title: 'Posteringer uden bilag',
          count: 8,
          meta: 'Klik for at gennemgå og sende påmindelser',
          actions: ['Send påmindelser til alle', 'Opret workflow'],
        },
      },
    ],
    chips: ['Send til alle', 'Vis kun de største'],
  },
  {
    id: 'repr',
    title: 'Repræsentation januar',
    time: '2t',
    preview: 'Hvilke poster blev kategoriseret som repræsentation…',
    messages: [
      { from: 'user', text: 'Hvad har vi brugt på repræsentation i januar?' },
      {
        from: 'eva',
        text: (
          <>
            I januar 2026 blev der bogført <strong>14 bilag</strong> på
            repræsentation, samlet <strong>12.450 kr</strong>.
          </>
        ),
        cite: 1,
        kpi: { eyebrow: 'Repræsentation · jan 2026', value: '12.450 kr', sub: '14 bilag · gns. 889 kr' },
      },
      { from: 'user', text: 'Vis mig de største poster' },
      {
        from: 'eva',
        table: {
          heading: 'Top 3 i januar',
          rows: [
            { label: 'Restaurant Frederiksborg', value: '3.240 kr', bar: 100 },
            { label: 'Hotel Royal · kundebesøg', value: '2.890 kr', bar: 89 },
            { label: 'Catering Q1-kickoff', value: '1.640 kr', bar: 50 },
          ],
        },
      },
    ],
    chips: ['Lav samme for februar', 'Bilag uden konto'],
  },
  {
    id: 'konto',
    title: 'Mere om forslag på Konto',
    time: 'i går',
    preview: 'Mere om dit forslag på Konto — 7220?',
    messages: [
      {
        from: 'user',
        text: (
          <>
            Mere om dit forslag på <strong>Konto</strong>?
          </>
        ),
      },
      {
        from: 'eva',
        text: (
          <>
            Mit forslag for Konto er <strong>7220</strong> — 12 af 12
            PostNord-bogføringer er konteret på 7220 i de sidste 3 måneder, og
            denne bankpost matcher mønsteret.
          </>
        ),
        cite: 2,
        workflow: {
          title: 'Auto-bogfør PostNord-gebyrer',
          triggerPill: 'Bankpost matcher tekstmønster',
          actionPill: 'Bogfør på konto 7220',
          confidencePct: 99,
        },
      },
    ],
    chips: ['Vis lignende mønstre', 'Hvilke konti?'],
  },
  {
    id: 'godkend',
    title: 'Manglende godkendelser',
    time: '3 dage',
    preview: 'Vis bilag der mangler godkendelse fra sidste uge',
    messages: [
      { from: 'user', text: 'Vis bilag der mangler godkendelse fra sidste uge' },
      {
        from: 'eva',
        text: (
          <>
            <strong>3 bilag</strong> mangler godkendelse fra sidste uge. Skal
            jeg sende en påmindelse til de ansvarlige?
          </>
        ),
      },
    ],
    chips: ['Send påmindelse', 'Vis bilagene'],
  },
]

const NEW_CONVERSATION_REPLY =
  'Det er en prototype, så jeg svarer med et eksempel her — men forestil dig, at jeg gennemgår kassekladden og foreslår konteringer og workflows.'

// Eva's reply when the user asks Eva to find anomalies — carries the VAT
// suggestion card. Matched on intent in send() and via the "Find afvigelser" chip.
const ANOMALY_REPLY = {
  from: 'eva',
  text: (
    <>
      Jeg har gennemgået momskoderne og fundet <strong>3 posteringer</strong>,
      hvor koden sandsynligvis er forkert. Her er et overblik — åbn artefaktet
      for detaljer, eller anvend ændringerne direkte.
    </>
  ),
  vatSuggestions: VAT_ANOMALIES,
}
const ANOMALY_INTENT = /afvigelse|anomali|forkert.*moms|moms.*forkert|tjek.*moms|moms.*fejl/i

// Status lines shown next to the morphing mark while Eva thinks. Cycled in
// order so the wait reads like Eva is narrating what it's doing.
const THINK_PHRASES = [
  'Tænker…',
  'Kigger i kassekladden…',
  'Samler data…',
  'Skriver svar…',
]

function Citation({ n }) {
  return <span className="eva-citation">{n}</span>
}

// Builds the label for the context tag shown inside the input bar when Eva is
// asked from a specific cell or row (mirrors the suggestion-concepts EvaInputCard,
// minus the Eva mark).
function contextLabel(ctx) {
  if (!ctx) return null
  if (ctx.kind === 'row') {
    return (
      <>Kontekst: postering <strong>{ctx.bilag}</strong>{ctx.tekst ? <> · {ctx.tekst}</> : null}</>
    )
  }
  return (
    <>Kontekst: <strong>{ctx.field}</strong>{ctx.detail ? <> · {ctx.detail}</> : null}</>
  )
}

function KpiCard({ eyebrow, value, sub }) {
  return (
    <div className="eva-chat-kpi">
      <div className="eva-chat-kpi-eyebrow">{eyebrow}</div>
      <div className="eva-chat-kpi-value">{value}</div>
      {sub && <div className="eva-chat-kpi-sub">{sub}</div>}
    </div>
  )
}

function TopTable({ heading, rows }) {
  return (
    <div className="eva-chat-table">
      <div className="eva-chat-table-head">{heading}</div>
      <div className="eva-chat-table-rows">
        {rows.map((r) => (
          <div className="eva-chat-table-row" key={r.label}>
            <div className="eva-chat-table-line">
              <span className="eva-chat-table-label">{r.label}</span>
              <span className="eva-chat-table-value">{r.value}</span>
            </div>
            <div className="eva-chat-table-bar">
              <div className="eva-chat-table-bar-fill" style={{ width: `${r.bar}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChatWorkflowCard({ wf, onActivate, onReview, activated }) {
  return (
    <div className="eva-chat-wf">
      <span className="eva-chat-wf-logo"><EvaLogo size={20} /></span>
      <div className="eva-chat-wf-head">
        <div className="eva-chat-wf-eyebrow">Workflow</div>
        <div className="eva-chat-wf-title">{wf.title}</div>
      </div>
      <div className="eva-chat-wf-flow">
        <Tag color="blue">{wf.triggerPill}</Tag>
        <span className="eva-chat-wf-arrow">→</span>
        <Tag color="green">{wf.actionPill}</Tag>
      </div>
      <div className="eva-chat-wf-foot">
        <span className="eva-chat-wf-conf"><Icon name="circle-tick" className="!h-4 !w-4" /> {wf.confidencePct}% sikker</span>
        {activated ? (
          <span className="eva-chat-wf-done"><Icon name="tick" className="!h-4 !w-4" /> Aktiveret</span>
        ) : (
          <div className="eva-chat-wf-btns">
            <Button onClick={() => onReview?.(wf)}>Gennemgå</Button>
            <Button appearance="primary" onClick={() => onActivate?.(wf)}>Aktivér</Button>
          </div>
        )}
      </div>
    </div>
  )
}

// Quick actions that act directly (rather than opening the card)
const SEND_ALL_ACTION = 'Send påmindelser til alle'
const AUTOMATE_ACTION = 'Opret workflow'

function ArtifactCard({ artifact, onOpen, onSendReminders, remindersSent, reminderSentCount, onAutomate, automated }) {
  return (
    <div className="eva-chat-artifact-wrap">
      <button type="button" className="eva-chat-artifact" onClick={() => onOpen?.(artifact)}>
        <span className="eva-chat-artifact-icon"><Icon name="document-preview" /></span>
        <span className="eva-chat-artifact-text">
          <span className="eva-chat-artifact-title">{artifact.title}</span>
          <span className="eva-chat-artifact-meta">{artifact.count} posteringer · {artifact.meta}</span>
        </span>
        <Icon name="chevron-right" className="eva-chat-artifact-chev" />
      </button>
      {artifact.actions?.length > 0 && (
        <div className="eva-artifact-quick">
          {artifact.actions.map((a) => {
            if (a === SEND_ALL_ACTION) {
              if (remindersSent) {
                const n = reminderSentCount ?? 0
                return (
                  <span key={a} className="eva-artifact-quick-btn eva-artifact-quick-sent" aria-disabled="true">
                    <Icon name="tick" /> {n} påmindelse{n === 1 ? '' : 'r'} sendt
                  </span>
                )
              }
              return (
                <button type="button" key={a} className="eva-artifact-quick-btn" onClick={() => onSendReminders?.()}>
                  <EvaLogo size={14} /> {a}
                </button>
              )
            }
            if (a === AUTOMATE_ACTION) {
              if (automated) {
                return (
                  <span key={a} className="eva-artifact-quick-btn eva-artifact-quick-sent" aria-disabled="true">
                    <Icon name="tick" /> Aktivt workflow
                  </span>
                )
              }
              return (
                <button type="button" key={a} className="eva-artifact-quick-btn" onClick={() => onAutomate?.()}>
                  <EvaLogo size={14} /> {a}
                </button>
              )
            }
            return (
              <button type="button" key={a} className="eva-artifact-quick-btn" onClick={() => onOpen?.(artifact)}>
                <EvaLogo size={14} /> {a}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// The from→to momskode chips, shared by the inline card and the artefact table.
function VatChips({ from, to, toLabel }) {
  return (
    <span className="eva-vat-item-change">
      <span className="eva-vat-chip eva-vat-chip-from">{from || 'Ingen'}</span>
      <span className="eva-vat-arrow">→</span>
      <span className="eva-vat-chip eva-vat-chip-to">{toLabel || to || 'Ingen'}</span>
    </span>
  )
}

// VAT (moms) suggestion card — styled like the doc-reminder ArtifactCard so the
// look & feel is consistent: a tinted artefact card whose header chevron
// expands/collapses an at-a-glance overview of every proposed change (entry ·
// field · from→to · confidence), with the action pills below. "Anvend alle
// ændringer" accepts straight from the chat; "Gennemgå i artefakt" opens the
// full artefact for reasoning + picking individual rows. Applied rows track the
// shared appliedIds set so card, artefact and grid stay in sync. No cap.
const VAT_FIELD_LABELS = { moms: 'Moms', konto: 'Konto', modkonto: 'Modkonto', tekst: 'Tekst' }

function VatSuggestionCard({ suggestions, appliedIds, onApplyVat, onOpenArtifact, onCloseArtifact, openArtifactId }) {
  const isApplied = (id) => !!appliedIds?.has(id)
  const artifact = buildVatArtifact(suggestions)
  const artifactOpen = openArtifactId === artifact.id
  const toggleArtifact = () => (artifactOpen ? onCloseArtifact?.() : onOpenArtifact?.(artifact))
  const pending = suggestions.filter((s) => !isApplied(s.id))
  const allApplied = pending.length === 0
  const applyAll = () => {
    if (pending.length) onApplyVat?.(pending)
  }

  return (
    <div className="eva-chat-artifact-wrap">
      {/* Click the card header to open the full artefact; chevron points ‹ while
          it's open so the user can close it again from here. */}
      <div className="eva-chat-artifact eva-vat-artifact">
        <button type="button" className="eva-vat-artifact-head" onClick={toggleArtifact} aria-expanded={artifactOpen}>
          <span className="eva-chat-artifact-icon"><Icon name="document-preview" /></span>
          <span className="eva-chat-artifact-text">
            <span className="eva-chat-artifact-title">Momsafvigelser</span>
            <span className="eva-chat-artifact-meta">{suggestions.length} posteringer · momsrettelser</span>
          </span>
          <Icon name={artifactOpen ? 'chevron-left' : 'chevron-right'} className="eva-chat-artifact-chev" />
        </button>
        <div className="eva-vat-artifact-body">
          {suggestions.map((s) => {
            const applied = isApplied(s.id)
            return (
              <div key={s.id} className={`eva-vat-row ${applied ? 'eva-vat-row-applied' : ''}`}>
                <div className="eva-vat-row-top">
                  <span className="eva-vat-row-entry">Bilag {s.bilag} · {s.tekst}</span>
                  {applied ? (
                    <span className="eva-vat-row-done"><Icon name="tick-circle" /> Rettet</span>
                  ) : (
                    <span className="eva-vat-row-conf">{s.confidencePct}%</span>
                  )}
                </div>
                <div className="eva-vat-row-change">
                  <span className="eva-vat-row-field">{VAT_FIELD_LABELS[s.field] || s.field}</span>
                  <VatChips from={s.from} to={s.to} toLabel={s.toLabel} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="eva-artifact-quick">
        {allApplied ? (
          <span className="eva-artifact-quick-btn eva-artifact-quick-sent" aria-disabled="true">
            <Icon name="tick" /> {suggestions.length} momskoder rettet
          </span>
        ) : (
          <button type="button" className="eva-artifact-quick-btn" onClick={applyAll}>
            <EvaLogo size={14} /> {pending.length === suggestions.length ? 'Anvend alle ændringer' : `Anvend resterende (${pending.length})`}
          </button>
        )}
      </div>
    </div>
  )
}

function ChatMessage({ msg, onActivateWorkflow, onReviewWorkflow, activatedWorkflowKeys, onOpenArtifact, onCloseArtifact, openArtifactId, onSendReminders, remindersSent, reminderSentCount, onAutomate, automated, onApplyVat, appliedVatIds }) {
  const bodyRef = useRef(null)
  const [vote, setVote] = useState(null) // null | 'up' | 'down'

  if (msg.from === 'user') {
    return <div className="eva-msg-user">{msg.text}</div>
  }

  const copy = () => {
    const text = bodyRef.current?.textContent?.trim()
    if (text && navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {})
  }

  return (
    <div className="eva-msg-eva-response">
      {msg.text && (
        <div className="eva-msg-body" ref={bodyRef}>
          {msg.text}
          {msg.cite != null && <Citation n={msg.cite} />}
        </div>
      )}
      {msg.kpi && <KpiCard {...msg.kpi} />}
      {msg.table && <TopTable {...msg.table} />}
      {msg.artifact && (
        <ArtifactCard
          artifact={msg.artifact}
          onOpen={onOpenArtifact}
          onSendReminders={onSendReminders}
          remindersSent={remindersSent}
          reminderSentCount={reminderSentCount}
          onAutomate={onAutomate}
          automated={automated}
        />
      )}
      {msg.workflow && (
        <ChatWorkflowCard
          wf={msg.workflow}
          activated={!!activatedWorkflowKeys?.has(msg.workflow.id || msg.workflow.title)}
          onActivate={onActivateWorkflow}
          onReview={onReviewWorkflow}
        />
      )}
      {msg.vatSuggestions && (
        <VatSuggestionCard
          suggestions={msg.vatSuggestions}
          appliedIds={appliedVatIds}
          onApplyVat={onApplyVat}
          onOpenArtifact={onOpenArtifact}
          onCloseArtifact={onCloseArtifact}
          openArtifactId={openArtifactId}
        />
      )}
      <div className="eva-msg-actions">
        <IconButton icon="copy" appearance="discrete" aria-label="Kopiér" onClick={copy} />
        <IconButton icon="circle-warning" appearance="discrete" aria-label="Rapportér" onClick={() => {}} />
        <IconButton
          icon="thumb-up"
          appearance="discrete"
          aria-label="God besvarelse"
          aria-pressed={vote === 'up'}
          onClick={() => setVote((v) => (v === 'up' ? null : 'up'))}
        />
        <IconButton
          icon="thumb-down"
          appearance="discrete"
          aria-label="Dårlig besvarelse"
          aria-pressed={vote === 'down'}
          onClick={() => setVote((v) => (v === 'down' ? null : 'down'))}
        />
      </div>
    </div>
  )
}

export default function EvaDrawer({ open, onClose, context, onClearContext, onOpenArtifact, onSendReminders, remindersSent, reminderSentCount, onAutomate, automated, onReviewWorkflow, onActivateWorkflow, activatedWorkflowKeys, onApplyVat, appliedVatIds, openArtifactId, onCloseArtifact, evaLog = [], onRevertLog, onToggleWorkflowLog, onOpenWorkflowLog, width = 380, onWidthChange }) {
  const [conversations, setConversations] = useState(SEED_CONVERSATIONS)
  const [activeId, setActiveId] = useState(null) // null => conversation list
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  // Random negative start offset (s) so each "thinking" moment begins on a
  // different one of the 11 pool constellations — see .eva-msg-thinking in eva.css.
  const [thinkDelay, setThinkDelay] = useState(0)
  // Status text shown next to the morphing mark while Eva thinks — cycles
  // through THINK_PHRASES so it reads like Eva is narrating what it's doing.
  const [thinkPhrase, setThinkPhrase] = useState(0)
  const [listTab, setListTab] = useState('chats') // 'chats' | 'artefakter'
  const messagesRef = useRef(null)
  // Drag-to-resize (handle on the right edge — the left drawer grows rightward)
  const drawerRef = useRef(null)
  const [resizing, setResizing] = useState(false)
  useEffect(() => {
    if (!resizing) return
    const onMove = (e) => {
      const rect = drawerRef.current?.getBoundingClientRect()
      if (!rect) return
      onWidthChange?.(Math.max(320, Math.min(640, Math.round(e.clientX - rect.left))))
    }
    const onUp = () => { setResizing(false); document.body.style.cursor = ''; document.body.style.userSelect = '' }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
  }, [resizing, onWidthChange])

  const active = conversations.find((c) => c.id === activeId) || null

  // Every artifact Eva has created lives in the "Artefakter" tab — derive the
  // list from all conversation messages that carry an artifact (deduped by id).
  const artifacts = []
  const seenArtifacts = new Set()
  for (const c of conversations) {
    for (const m of c.messages) {
      if (m.artifact && !seenArtifacts.has(m.artifact.id)) {
        seenArtifacts.add(m.artifact.id)
        artifacts.push({ ...m.artifact, source: c.title, time: c.time })
      }
    }
  }

  // Keep the latest message (or the thinking mark) in view as the chat grows.
  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [active?.messages.length, activeId, thinking])

  // While thinking, advance the status line every 700ms (stops at the last one).
  useEffect(() => {
    if (!thinking) return
    const id = setInterval(() => {
      setThinkPhrase((p) => Math.min(p + 1, THINK_PHRASES.length - 1))
    }, 700)
    return () => clearInterval(id)
  }, [thinking])

  const startNewConversation = () => {
    const id = `c-${Date.now()}`
    setConversations((cs) => [
      { id, title: 'Ny samtale', time: 'nu', preview: '', messages: [], chips: ['Find afvigelser', 'Bilag uden konto', 'Hvad er nyt?'] },
      ...cs,
    ])
    setActiveId(id)
  }

  // Opening Eva (e.g. from the SideNav Eva button) lands directly in a fresh
  // conversation rather than the list. On close, prune any empty conversation
  // so repeated open/close doesn't litter the list with blank "Ny samtale"s.
  // The user can still tap the "Eva" breadcrumb to browse past conversations.
  const prevOpenRef = useRef(open)
  useEffect(() => {
    const wasOpen = prevOpenRef.current
    prevOpenRef.current = open
    if (open && !wasOpen) {
      startNewConversation()
    } else if (!open && wasOpen) {
      setConversations((cs) => cs.filter((c) => c.messages.length > 0))
      setActiveId(null)
      setThinking(false)
    }
  }, [open])

  const sendText = (raw) => {
    const text = (raw ?? '').trim()
    if (!text || !active || thinking) return
    const targetId = active.id
    setDraft('')
    setConversations((cs) =>
      cs.map((c) =>
        c.id === targetId ? { ...c, messages: [...c.messages, { from: 'user', text }] } : c
      )
    )
    // Eva "thinks" briefly (morphing mark) before the reply lands.
    // 5s cycle through 11 constellations → random start point each send.
    setThinkDelay(-(Math.random() * 5))
    setThinkPhrase(0)
    setThinking(true)
    // Asking Eva to find anomalies yields the VAT suggestion card; everything
    // else falls back to the generic prototype reply.
    const reply = ANOMALY_INTENT.test(text) ? ANOMALY_REPLY : { from: 'eva', text: NEW_CONVERSATION_REPLY }
    setTimeout(() => {
      setConversations((cs) =>
        cs.map((c) =>
          c.id === targetId ? { ...c, messages: [...c.messages, reply] } : c
        )
      )
      setThinking(false)
    }, 2200)
  }
  const send = () => sendText(draft)


  return (
    <div
      ref={drawerRef}
      className={`eva-drawer ${open ? 'open' : ''} ${resizing ? 'resizing' : ''}`}
      style={open ? { width } : undefined}
    >
      {open && (
        <div
          className={`eva-drawer-resize-handle ${resizing ? 'active' : ''}`}
          onMouseDown={(e) => {
            setResizing(true)
            document.body.style.cursor = 'col-resize'
            document.body.style.userSelect = 'none'
            e.preventDefault()
          }}
        />
      )}
      <div className="eva-drawer-inner">
        {/* Header — EvaLogo always present; inside a conversation the title
            reads as a breadcrumb "Eva / {title}" (click "Eva" to go back),
            mirroring the reference drawer header. */}
        <div className="eva-drawer-header">
          {/* In a conversation: hamburger "menu" → back to the conversation list
              (matches the concept's drawer header). On the list itself: the Eva
              mark, as the concept's conv-list header shows. */}
          {active ? (
            <IconButton
              icon="menu"
              appearance="discrete"
              aria-label="Vis samtaler"
              onClick={() => setActiveId(null)}
            />
          ) : (
            <EvaLogo size={28} mode="idle" />
          )}
          <div className="flex flex-1 min-w-0 items-center">
            {active ? (
              <span className="eva-drawer-breadcrumb">
                <button
                  type="button"
                  className="eva-drawer-crumb-root"
                  aria-label="Tilbage til samtaler"
                  onClick={() => setActiveId(null)}
                >
                  Eva
                </button>
                <span className="eva-drawer-crumb-sep">/</span>
                <span className="eva-drawer-crumb-title">{active.title}</span>
              </span>
            ) : (
              <div className="flex flex-col">
                <h2>Eva</h2>
              </div>
            )}
          </div>
          <IconButton icon="close" appearance="discrete" aria-label="Luk Eva" onClick={onClose} />
        </div>

        {active ? (
          <>
            <div className="eva-drawer-messages" ref={messagesRef}>
              {active.messages.length === 0 && !thinking && (
                <div className="eva-empty">
                  <EvaLogo size={64} mode="idle" />
                  <p>Spørg mig om kassekladden, dine bilag eller konteringer.</p>
                </div>
              )}
              {active.messages.map((m, i) => (
                <ChatMessage
                  key={i}
                  msg={m}
                  activatedWorkflowKeys={activatedWorkflowKeys}
                  onActivateWorkflow={onActivateWorkflow}
                  onReviewWorkflow={onReviewWorkflow}
                  onOpenArtifact={onOpenArtifact}
                  onCloseArtifact={onCloseArtifact}
                  openArtifactId={openArtifactId}
                  onSendReminders={onSendReminders}
                  remindersSent={remindersSent}
                  reminderSentCount={reminderSentCount}
                  onAutomate={onAutomate}
                  automated={automated}
                  onApplyVat={onApplyVat}
                  appliedVatIds={appliedVatIds}
                />
              ))}
              {thinking && (
                <div
                  className="eva-msg-thinking"
                  aria-label="Eva tænker"
                  role="status"
                  style={{ '--eva-think-delay': `${thinkDelay.toFixed(2)}s` }}
                >
                  <EvaLogo size={32} />
                  <span className="eva-msg-thinking-text">{THINK_PHRASES[thinkPhrase]}</span>
                </div>
              )}
            </div>
            <div className="eva-drawer-footer eva-drawer-footer-chat">
              {active.chips?.length > 0 && (
                <div className="eva-chat-chips">
                  {active.chips.map((c) => (
                    <button
                      type="button"
                      key={c}
                      className="eva-chat-chip"
                      onClick={() => (ANOMALY_INTENT.test(c) ? sendText(c) : setDraft(c))}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
              <div className="eva-input-bar">
                {context && (
                  <div className="eva-input-context">
                    <span className="eva-input-context-tag">
                      <span className="eva-input-context-text">{contextLabel(context)}</span>
                      <button
                        type="button"
                        className="eva-input-context-close"
                        aria-label="Fjern kontekst"
                        onClick={onClearContext}
                      >
                        <Icon name="close" />
                      </button>
                    </span>
                  </div>
                )}
                <input
                  className="eva-input-bar-field"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Spørg Eva…"
                  onKeyDown={(e) => { if (e.key === 'Enter') send() }}
                />
                <div className="eva-input-bar-foot">
                  <EvaLogo size={18} />
                  <span className="eva-input-bar-spacer" />
                  <button
                    type="button"
                    className="eva-input-bar-send"
                    aria-label="Send"
                    disabled={!draft.trim()}
                    onClick={send}
                  >
                    <Icon name="arrow-up" />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <Tabs id={listTab} onChange={setListTab}>
            <Tabs.List>
              <Tabs.Trigger id="chats">Chats</Tabs.Trigger>
              <Tabs.Trigger id="artefakter">
                Artefakter{artifacts.length > 0 && <span className="eva-tab-count">{artifacts.length}</span>}
              </Tabs.Trigger>
              <Tabs.Trigger id="log">
                Log{evaLog.length > 0 && <span className="eva-tab-count">{evaLog.length}</span>}
              </Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content id="chats" className="eva-conv-list">
              <button type="button" className="eva-conv-new" onClick={startNewConversation}>
                <Icon name="circle-plus" /> Ny samtale
              </button>
              <div className="eva-conv-label">Seneste</div>
              {conversations.map((c) => (
                <button type="button" key={c.id} className="eva-conv-item" onClick={() => setActiveId(c.id)}>
                  <div className="eva-conv-item-top">
                    <span className="eva-conv-item-title">{c.title}</span>
                    <span className="eva-conv-item-time">{c.time}</span>
                  </div>
                  {c.preview && <div className="eva-conv-item-preview">{c.preview}</div>}
                </button>
              ))}
            </Tabs.Content>
            <Tabs.Content id="artefakter" className="eva-conv-list">
              {artifacts.length === 0 ? (
                <div className="eva-empty">
                  <EvaLogo size={28} />
                  <p>Ingen artefakter endnu. Bed Eva om at samle noget, så lægger det sig her.</p>
                </div>
              ) : (
                artifacts.map((a) => (
                  <button type="button" key={a.id} className="eva-artifact-item" onClick={() => onOpenArtifact?.(a)}>
                    <span className="eva-artifact-item-icon"><Icon name="document-preview" /></span>
                    <span className="eva-artifact-item-text">
                      <span className="eva-artifact-item-title">{a.title}</span>
                      <span className="eva-artifact-item-meta">{a.count} posteringer · {a.source}</span>
                    </span>
                    <span className="eva-artifact-item-time">{a.time}</span>
                  </button>
                ))
              )}
            </Tabs.Content>
            <Tabs.Content id="log" className="eva-conv-list eva-log-tab">
              <EvaLog entries={evaLog} onRevert={onRevertLog} onToggleWorkflow={onToggleWorkflowLog} onOpenWorkflow={onOpenWorkflowLog} />
            </Tabs.Content>
          </Tabs>
        )}
      </div>
    </div>
  )
}
