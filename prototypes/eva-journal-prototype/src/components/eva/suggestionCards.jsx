import { Button, Icon, Tag } from '@economic/taco'
import { EvaLogo } from './EvaLogo'

/* Entry- and page-level suggestion cards, ported from
   workflows-hub/src/SuggestionConcepts.tsx (types stripped). */

/* Page-level: a proposed automation. `onAccept` is wired to open the
   Workflow drawer (review before activating); `onDismiss` clears it. */
export function WorkflowSuggestionCard({ suggestion, onAccept, onReview, onDismiss, activated = false }) {
    return (
        <div className="relative shrink-0 overflow-hidden rounded-md border border-[#e89539]/40 bg-[#fef9f0] px-3 pt-2 pb-2 space-y-1.5">
            <span className="absolute top-2 right-2 !mt-0">
                <EvaLogo size={20} />
            </span>
            <div className="pr-6">
                <div className="text-[10px] uppercase tracking-wider text-[#0f1f4a] font-bold leading-tight mb-1.5">
                    Workflow
                </div>
                <div className="text-sm font-semibold text-grey-900 leading-snug">
                    {suggestion.title}
                </div>
            </div>
            <div className="flex items-center gap-1 flex-wrap text-[11px]">
                <Tag color="blue">{suggestion.triggerPill}</Tag>
                <span className="text-grey-700 text-xs px-0.5">→</span>
                <Tag color="green">{suggestion.actionPill}</Tag>
            </div>
            <div className="text-[11px] text-grey-700 leading-snug">
                <span>
                    <span className="font-semibold text-[#0f1f4a]">Eva: </span>
                    {suggestion.reason}
                </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-grey-700 pt-2">
                <span className="inline-flex items-center gap-1">
                    <Icon name="circle-tick" className="!h-4 !w-4" /> {suggestion.confidencePct}% sikker
                </span>
                {suggestion.timeSaved && (
                    <span className="inline-flex items-center gap-1">
                        <Icon name="time" className="!h-4 !w-4" /> {suggestion.timeSaved}
                    </span>
                )}
            </div>
            {activated ? (
                <div className="flex justify-end pt-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#08754f]">
                        <Icon name="tick" className="!h-4 !w-4" /> Aktiveret
                    </span>
                </div>
            ) : (
                <div className="flex items-center justify-end gap-1.5 pt-2">
                    <Button onClick={onDismiss}>Afvis</Button>
                    <Button onClick={onReview}>Gennemgå</Button>
                    <Button appearance="primary" onClick={onAccept}>Aktivér</Button>
                </div>
            )}
        </div>
    )
}

/* Entry-level: a single field Eva proposes for one entry. */
export function EntryFieldSuggestionCard({ suggestion, onAccept, onDismiss }) {
    return (
        <div className="relative shrink-0 overflow-hidden rounded-md border border-[#e89539]/40 bg-[#fef9f0] px-3 pt-2 pb-2 space-y-1.5">
            <span className="absolute top-2 right-2 !mt-0">
                <EvaLogo size={20} />
            </span>
            <div className="pr-6">
                <div className="text-[10px] uppercase tracking-wider text-[#0f1f4a] font-bold leading-tight mb-1.5">
                    {suggestion.field}
                </div>
                <div className="text-sm font-semibold text-grey-900 leading-snug truncate">
                    {suggestion.value}
                </div>
            </div>
            <div className="text-[11px] text-grey-700 leading-snug">
                <span>
                    <span className="font-semibold text-[#0f1f4a]">Eva: </span>
                    {suggestion.reason}
                </span>
            </div>
            <div className="flex items-center justify-between pt-3">
                <span className="inline-flex items-center gap-1 text-[11px] text-grey-700">
                    <Icon name="circle-tick" className="!h-4 !w-4" /> {suggestion.confidencePct}% sikker
                </span>
                <div className="flex items-center gap-1.5">
                    <Button onClick={onDismiss}>Afvis</Button>
                    <Button appearance="primary" onClick={onAccept}>
                        Acceptér
                    </Button>
                </div>
            </div>
        </div>
    )
}
