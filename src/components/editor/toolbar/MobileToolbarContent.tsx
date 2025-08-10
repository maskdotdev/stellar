// no React import needed for JSX runtime

import { ArrowLeftIcon } from "@/components/tiptap-icons/arrow-left-icon"
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon"
import { LinkIcon } from "@/components/tiptap-icons/link-icon"
import { Button } from "@/components/tiptap-ui-primitive/button"
import { ToolbarGroup, ToolbarSeparator } from "@/components/tiptap-ui-primitive/toolbar"
import { ColorHighlightPopoverContent } from "@/components/tiptap-ui/color-highlight-popover"
import { LinkContent } from "@/components/tiptap-ui/link-popover"

export function MobileToolbarContent({
    type,
    onBack,
}: {
    type: "highlighter" | "link"
    onBack: () => void
}) {
    return (
        <>
            <ToolbarGroup>
                <Button data-style="ghost" onClick={onBack}>
                    <ArrowLeftIcon className="tiptap-button-icon" />
                    {type === "highlighter" ? (
                        <HighlighterIcon className="tiptap-button-icon" />
                    ) : (
                        <LinkIcon className="tiptap-button-icon" />
                    )}
                </Button>
            </ToolbarGroup>

            <ToolbarSeparator />

            {type === "highlighter" ? <ColorHighlightPopoverContent /> : <LinkContent />}
        </>
    )
}


