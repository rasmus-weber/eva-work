import { useState, useRef } from 'react'
import { Navigation2 } from '@economic/taco'
import { EvaLogo } from './eva/EvaLogo'

const navItems = [
  { group: 'Kassekladder', items: [
    { label: 'Daglig', total: 177, active: true },
    { label: 'Indbetalinger', total: 15 },
    { label: 'Lonninger', total: 2 },
    { label: 'Personalegoder', total: 0 },
  ]},
  { group: 'Sogning og lister', items: [
    { label: 'Kontoplan' }, { label: 'Leverandorer' }, { label: 'Anlaegskartotek' },
    { label: 'Posteringer (find bilag)' }, { label: 'Periodiseringer' },
  ]},
  { group: 'Bilagsanmodning', items: [
    { label: 'Anmod om bilag' }, { label: 'Bilag til gennemgang' },
  ]},
  { group: 'Bank', items: [
    { label: 'Bankafstemning' }, { label: 'Betalinger' }, { label: 'Bankopsaetning' },
  ]},
  { group: 'Lon', items: [
    { label: 'DanLon' }, { label: 'DataLon' }, { label: 'ProLon' }, { label: 'FI-adviseringer' },
  ]},
]

function NavContent({ evaOpen, onToggleEva }) {
  return (
    <Navigation2>
      {!evaOpen && (
        <button
          type="button"
          className="eva-nav-btn"
          onClick={(e) => { e.stopPropagation(); onToggleEva?.() }}
        >
          <EvaLogo size={22} mode="idle" />
          <span className="eva-nav-btn-label">Spørg Eva</span>
        </button>
      )}
      {navItems.map((section, i) => (
        <Navigation2.Group key={i} heading={section.group} defaultExpanded>
          {section.items.map((item, j) => (
            <Navigation2.Link
              key={j}
              href="#"
              active={item.active}
              total={item.total}
            >
              {item.label}
            </Navigation2.Link>
          ))}
        </Navigation2.Group>
      ))}
    </Navigation2>
  )
}

export default function SideNav({ collapsed, onExpand, evaOpen, onToggleEva }) {
  const [hoverVisible, setHoverVisible] = useState(false)
  const hoverTimer = useRef(null)

  const showOverlay = () => {
    if (!collapsed) return
    setHoverVisible(true)
  }

  return (
    <div
      className={`side-nav-wrapper ${collapsed ? 'collapsed' : ''}`}
      onClick={() => { if (collapsed) { setHoverVisible(false); onExpand() } }}
      onMouseEnter={() => { if (collapsed) { clearTimeout(hoverTimer.current); hoverTimer.current = setTimeout(showOverlay, 120) } }}
      onMouseLeave={(e) => { clearTimeout(hoverTimer.current); if (!e.relatedTarget?.closest?.('.side-nav-hover-overlay')) setHoverVisible(false) }}
    >
      <div className="side-nav-collapsed-indicator">
        <svg viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="#595959" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <div
        className={`side-nav-hover-overlay ${hoverVisible ? 'visible' : ''}`}
        onMouseLeave={(e) => { if (!e.relatedTarget?.closest?.('.side-nav-wrapper')) setHoverVisible(false) }}
        onClick={(e) => { e.stopPropagation(); setHoverVisible(false); onExpand() }}
      >
        <NavContent evaOpen={evaOpen} onToggleEva={onToggleEva} />
      </div>
      <nav className="side-nav">
        <NavContent evaOpen={evaOpen} onToggleEva={onToggleEva} />
      </nav>
    </div>
  )
}
