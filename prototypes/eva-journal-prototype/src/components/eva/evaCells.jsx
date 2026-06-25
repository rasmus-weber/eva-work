import React, { useRef } from 'react'
import { Icon, Input, Select2, Tooltip } from '@economic/taco'
import { EvaLogo } from './EvaLogo'
import { useReasoningPopover, ReasoningPopover } from './reasoningPopover'

/* Cell-level Eva affordances, ported from workflows-hub/src/SuggestionConcepts.tsx
   (types stripped). VIEW mode → SuggestedCell (opens the reasoning card).
   EDIT mode → EvaInput (Input example) and EvaSelect2 (Select2 example). */

/* ─────────────────────────────  VIEW MODE  ───────────────────────────── */

export function SuggestedCell({ suggestion, onAccept, onDismiss, onPromote, onAsk, onOpenSuggestions }) {
    const iconRef = useRef(null)
    const popover = useReasoningPopover(iconRef)
    return (
        <div className="w-full eva-suggested-cell">
            <div
                className={`w-full flex items-center justify-between gap-1.5 h-8 pl-2 pr-1 rounded border border-grey-300 bg-[#fef9f0]${onOpenSuggestions ? ' cursor-pointer' : ''}`}
                onClick={onOpenSuggestions ? (e) => {
                    // Only open the Forslag drawer in view mode. When the table is in
                    // edit mode, let the click fall through to Table3 so it enters the
                    // cell's inline editor (where Shift+Enter accepts the suggestion).
                    const editToggle = document.querySelector('button[aria-checked]')
                    if (editToggle?.getAttribute('aria-checked') === 'true') return
                    e.stopPropagation()
                    onOpenSuggestions()
                } : undefined}
            >
                <span className="text-sm text-grey-900 truncate flex-1 min-w-0">{suggestion.value}</span>
                <Tooltip title={`Sikkerhed: ${suggestion.confidencePct}%`}>
                    <span className="inline-flex flex-none">
                        <button
                            ref={iconRef}
                            type="button"
                            aria-label={`Eva-forslag · ${suggestion.confidencePct}% sikker — klik for begrundelse`}
                            aria-haspopup="dialog"
                            aria-expanded={popover.isOpen}
                            onClick={(e) => {
                                e.stopPropagation()
                                popover.togglePin()
                            }}
                            className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-[#fdebd1]"
                        >
                            <EvaLogo size={18} />
                        </button>
                    </span>
                </Tooltip>
            </div>
            {popover.isOpen && iconRef.current && (
                <ReasoningPopover
                    anchor={iconRef.current}
                    suggestion={suggestion}
                    onAsk={onAsk}
                    onAccept={() => {
                        onAccept()
                        popover.close()
                    }}
                    onDismiss={() => {
                        onDismiss()
                        popover.close()
                    }}
                    onPromote={
                        onPromote
                            ? () => {
                                  onPromote()
                                  popover.close()
                              }
                            : undefined
                    }
                />
            )}
        </div>
    )
}

/* ──────────────────────  EDIT MODE · INPUT EXAMPLE  ────────────────────── */

export function EvaInput({
    value,
    suggestionValue,
    confidencePct,
    reason,
    timeSaved,
    accepted = false,
    onAccept,
    onChange,
    onAsk,
    type = 'text',
    align,
}) {
    const iconRef = useRef(null)
    const popover = useReasoningPopover(iconRef)

    const matchesSuggestion =
        suggestionValue !== undefined &&
        suggestionValue !== null &&
        String(value) === String(suggestionValue)
    const isEvaFilled = !accepted && matchesSuggestion
    const hasSuggestion = isEvaFilled && confidencePct != null
    // Once accepted, the caller stops passing a suggestion (pendingSuggestion
    // returns null at status 'accepted'), so suggestionValue is gone and
    // matchesSuggestion is false. Mirror the reference SuggestedEditInput:
    // show the checkmark whenever the field is accepted and holds a value.
    const showAccepted = accepted && !isEvaFilled && value != null && value !== ''

    return (
        <div className="w-full [&_[data-taco=input-container]]:!flex">
            <Input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => {
                    // Shift+Enter accepts Eva's suggestion while editing the cell
                    if (e.key === 'Enter' && e.shiftKey && hasSuggestion && onAccept) {
                        e.preventDefault()
                        e.stopPropagation()
                        onAccept()
                    }
                }}
                className={
                    (isEvaFilled ? '!bg-[#fef9f0] ' : '') +
                    (align === 'right' ? '!text-right' : '')
                }
                postfix={
                    hasSuggestion ? (
                        <Tooltip title={`Sikkerhed: ${confidencePct}%`}>
                            <span className="inline-flex">
                                <button
                                    ref={iconRef}
                                    type="button"
                                    aria-label={`Eva-forslag · ${confidencePct}% sikker — klik for begrundelse`}
                                    aria-haspopup="dialog"
                                    aria-expanded={popover.isOpen}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        popover.togglePin()
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-[#fdebd1]"
                                >
                                    <EvaLogo size={18} />
                                </button>
                            </span>
                        </Tooltip>
                    ) : showAccepted ? (
                        <span
                            aria-label="Accepteret fra Eva"
                            className="inline-flex items-center justify-center w-6 h-6 text-[#e89539]"
                        >
                            <Icon name="circle-tick" className="!h-5 !w-5" />
                        </span>
                    ) : undefined
                }
            />
            {hasSuggestion && popover.isOpen && iconRef.current && (
                <ReasoningPopover
                    anchor={iconRef.current}
                    suggestion={{
                        value: String(value),
                        confidencePct: confidencePct,
                        reason: reason ?? 'Eva genkendte mønsteret fra tidligere bilag.',
                        timeSaved: timeSaved ?? '~30 sek',
                    }}
                    onAsk={onAsk}
                    onAccept={() => {
                        onAccept?.()
                        popover.close()
                    }}
                    onDismiss={() => {
                        onChange('')
                        popover.close()
                    }}
                />
            )}
        </div>
    )
}

/* ─────────────────────  EDIT MODE · SELECT2 EXAMPLE  ───────────────────── */

/* Render an option list, badging the Eva-suggested option with a confidence
   chip. `options` is [{ value, label }] (the prototype uses value===label). */
export function renderAccountOptions(options, suggestedValue, suggestedConfidence) {
    return options.map((a) => {
        const isEva = !!suggestedValue && a.value === suggestedValue
        return (
            <Select2.Option
                key={a.value}
                value={a.value}
                className={isEva ? '!text-[#0f1f4a]' : ''}
                postfix={
                    isEva && suggestedConfidence ? (
                        <span className="inline-flex items-center gap-1.5 text-[#0f1f4a]">
                            <span className="text-[11px] font-medium">
                                {suggestedConfidence}%
                            </span>
                            <EvaLogo size={18} />
                        </span>
                    ) : undefined
                }
            >
                {a.label}
            </Select2.Option>
        )
    })
}

/* Overlay an AI affordance inside the Select2 trigger, just left of the
   chevron. pointer-events on the overlay lets the icon catch clicks without
   bubbling to the trigger underneath. zIndex must beat the trigger: taco raises
   the Select2 trigger to z-index:10 while it is focused/active, so a lower
   overlay would be painted *under* the focused trigger's background and the Eva
   sparkle would vanish the moment the cell is clicked into. Sit above that. */
export function AISelect2({ children, ai }) {
    const childWithPadding = ai
        ? React.cloneElement(children, {
              className: (children.props.className ?? '') + ' !pr-14',
          })
        : children
    return (
        <div className={`relative w-full eva-aiselect2${ai ? ' eva-aiselect2--ai' : ''}`}>
            {childWithPadding}
            {ai && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        right: 24,
                        display: 'flex',
                        alignItems: 'center',
                        pointerEvents: 'none',
                        zIndex: 20,
                    }}
                >
                    <div className="inline-flex" style={{ pointerEvents: 'auto' }}>
                        {ai}
                    </div>
                </div>
            )}
        </div>
    )
}

/* Host wrapper for the Konto edit cell: spreads the caller's configured
   <Select2> (so taco's value/setValue/ref keep working), overlays the Eva
   sparkle, and hosts the reasoning card. Pass the suggestion to enable it.
   Once the suggestion is accepted, pass `accepted` to swap the sparkle for an
   orange checkmark — mirroring the reference SuggestedEditInput. */
export function EvaSelect2({ suggestion, accepted = false, onAccept, onDismiss, onAsk, children }) {
    const iconRef = useRef(null)
    const popover = useReasoningPopover(iconRef)

    const ai = suggestion ? (
        <Tooltip title={`Sikkerhed: ${suggestion.confidencePct}%`}>
            <span className="inline-flex">
                <button
                    ref={iconRef}
                    type="button"
                    aria-label={`Eva-forslag · ${suggestion.confidencePct}% sikker — klik for begrundelse`}
                    aria-haspopup="dialog"
                    aria-expanded={popover.isOpen}
                    onClick={(e) => {
                        e.stopPropagation()
                        popover.togglePin()
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-[#fdebd1]"
                >
                    <EvaLogo size={18} />
                </button>
            </span>
        </Tooltip>
    ) : accepted ? (
        <span
            aria-label="Accepteret fra Eva"
            className="inline-flex items-center justify-center w-6 h-6 text-[#e89539]"
        >
            <Icon name="circle-tick" className="!h-5 !w-5" />
        </span>
    ) : undefined

    return (
        <>
            {/* Shift+Enter accepts Eva's suggestion while editing the cell.
                Capture phase so we intercept before Select2's own Enter handling. */}
            <div
                className="contents"
                onKeyDownCapture={(e) => {
                    if (e.key === 'Enter' && e.shiftKey && suggestion && onAccept) {
                        e.preventDefault()
                        e.stopPropagation()
                        onAccept()
                    }
                }}
            >
                <AISelect2 ai={ai}>{children}</AISelect2>
            </div>
            {suggestion && popover.isOpen && iconRef.current && (
                <ReasoningPopover
                    anchor={iconRef.current}
                    suggestion={suggestion}
                    onAsk={onAsk}
                    onAccept={() => {
                        onAccept?.()
                        popover.close()
                    }}
                    onDismiss={() => {
                        onDismiss?.()
                        popover.close()
                    }}
                />
            )}
        </>
    )
}
