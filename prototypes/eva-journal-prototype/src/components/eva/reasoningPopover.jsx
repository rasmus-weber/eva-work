import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, Icon } from '@economic/taco'
import { EvaLogo } from './EvaLogo'

/* Eva's reasoning card + the hook that positions/pins it.
   Ported from workflows-hub/src/SuggestionConcepts.tsx (types stripped).
   Keep this as the ONE module so the cross-instance "only one open at a time"
   coordination shares a single _popoverIdSeq + event name. */

const POPOVER_OPEN_EVENT = 'eva-reasoning-popover-opened'
let _popoverIdSeq = 0

export function useReasoningPopover(anchorRef) {
    const [pinned, setPinned] = useState(false)
    const idRef = useRef(null)
    if (idRef.current === null) idRef.current = ++_popoverIdSeq
    const id = idRef.current
    const isOpen = pinned

    // Listen for other popovers opening — if it's not us, close ourselves.
    useEffect(() => {
        const onOtherOpen = (e) => {
            const detail = e.detail
            if (detail && detail.id !== id) setPinned(false)
        }
        window.addEventListener(POPOVER_OPEN_EVENT, onOtherOpen)
        return () => window.removeEventListener(POPOVER_OPEN_EVENT, onOtherOpen)
    }, [id])

    useEffect(() => {
        if (!pinned) return
        // Tell every other popover to close.
        window.dispatchEvent(new CustomEvent(POPOVER_OPEN_EVENT, { detail: { id } }))
        const onDocMouseDown = (e) => {
            const t = e.target
            if (anchorRef.current?.contains(t)) return
            const inPopover = t?.closest?.('[data-suggestion-popover]')
            if (inPopover) return
            setPinned(false)
        }
        const handle = window.setTimeout(
            () => document.addEventListener('mousedown', onDocMouseDown),
            0
        )
        return () => {
            window.clearTimeout(handle)
            document.removeEventListener('mousedown', onDocMouseDown)
        }
    }, [pinned, anchorRef, id])

    return {
        isOpen,
        togglePin: () => setPinned((p) => !p),
        close: () => setPinned(false),
    }
}

export function ReasoningPopover({ anchor, suggestion, onAccept, onDismiss, onPromote, onAsk }) {
    const [pos, setPos] = useState(null)
    useEffect(() => {
        if (!anchor) return
        const POPOVER_WIDTH = 320
        // Position-fixed (viewport coords) + recompute on any scroll/resize so the
        // card stays attached to the bottom of the anchor cell as it moves.
        const update = () => {
            const r = anchor.getBoundingClientRect()
            // Right-align under the anchor, cap to viewport edge
            let left = r.right - POPOVER_WIDTH
            if (left < 8) left = 8
            setPos({ top: r.bottom + 8, left })
        }
        update()
        // capture=true so scrolls inside nested containers (the table body) are caught
        window.addEventListener('scroll', update, true)
        window.addEventListener('resize', update)
        return () => {
            window.removeEventListener('scroll', update, true)
            window.removeEventListener('resize', update)
        }
    }, [anchor])
    if (!pos) return null
    return createPortal(
        <div
            role="dialog"
            data-suggestion-popover
            style={{
                position: 'fixed',
                top: pos.top,
                left: pos.left,
                width: 320,
                zIndex: 50,
            }}
            className="relative overflow-hidden rounded-md border border-[#e89539]/40 bg-[#fef9f0]"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="p-3">
                <div className="flex items-start gap-2 text-xs">
                    <span className="flex-none mt-0.5">
                        <EvaLogo size={20} />
                    </span>
                    <div className="flex flex-col gap-1.5 pt-0.5">
                        <span className="font-bold text-[#0f1f4a]">
                            Hvorfor Eva foreslår dette
                        </span>
                        <span className="text-grey-700 leading-relaxed">
                            {suggestion.reason}
                        </span>
                        <div className="flex items-center gap-3 text-grey-700 pt-0.5">
                            <span className="inline-flex items-center gap-1">
                                <Icon name="circle-tick" className="!h-5 !w-5" />
                                {suggestion.confidencePct}% sikkerhed
                            </span>
                            {suggestion.timeSaved && (
                                <span className="inline-flex items-center gap-1">
                                    <Icon name="time" />
                                    {suggestion.timeSaved}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-grey-300">
                    <Button appearance="discrete" onClick={onAsk}>
                        <EvaLogo size={18} /> Spørg Eva
                    </Button>
                    <div className="ml-auto flex items-center gap-2">
                        <Button onClick={onDismiss}>Afvis</Button>
                        <Button appearance="primary" onClick={onAccept}>
                            Acceptér
                        </Button>
                    </div>
                </div>
                {onPromote && (
                    <button
                        type="button"
                        onClick={onPromote}
                        className="mt-3 w-full flex items-center gap-3 rounded-md border border-[#e89539]/40 bg-[#fef9f0] hover:bg-[#fdebd1] px-3 py-2 text-left transition-colors"
                    >
                        <span className="flex-none">
                            <EvaLogo size={20} />
                        </span>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-[#0f1f4a]">
                                Gør det automatisk fremover
                            </div>
                            <div className="text-xs text-grey-700 leading-snug">
                                Eva har set mønsteret nok gange.
                            </div>
                        </div>
                        <Icon name="chevron-right" className="text-[#0f1f4a] flex-none" />
                    </button>
                )}
            </div>
        </div>,
        document.body
    )
}
