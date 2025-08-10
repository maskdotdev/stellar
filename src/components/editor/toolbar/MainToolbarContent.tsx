// no React import needed for JSX runtime

import { Spacer } from "@/components/tiptap-ui-primitive/spacer"
import { ToolbarGroup, ToolbarSeparator } from "@/components/tiptap-ui-primitive/toolbar"
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button"
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button"
import {
    ColorHighlightPopover,
    ColorHighlightPopoverButton,
} from "@/components/tiptap-ui/color-highlight-popover"
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu"
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button"
import { LinkButton, LinkPopover } from "@/components/tiptap-ui/link-popover"
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu"
import { MarkButton } from "@/components/tiptap-ui/mark-button"
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button"
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button"

export function MainToolbarContent({
    onHighlighterClick,
    onLinkClick,
    isMobile,
    minimal = false,
}: {
    onHighlighterClick: () => void
    onLinkClick: () => void
    isMobile: boolean
    minimal?: boolean
}) {
    return (
        <>
            <Spacer />

            <ToolbarGroup>
                <UndoRedoButton action="undo" />
                <UndoRedoButton action="redo" />
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
                <HeadingDropdownMenu levels={minimal ? [1, 2] : [1, 2, 3, 4]} />
                <ListDropdownMenu types={["bulletList", "orderedList", "taskList"]} />
                <BlockquoteButton />
                {!minimal && <CodeBlockButton />}
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
                <MarkButton type="bold" />
                <MarkButton type="italic" />
                <MarkButton type="strike" />
                <MarkButton type="code" />
                {!minimal && <MarkButton type="underline" />}
                {!isMobile ? (
                    <ColorHighlightPopover />
                ) : (
                    <ColorHighlightPopoverButton onClick={onHighlighterClick} />
                )}
                {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
            </ToolbarGroup>

            {!minimal && (
                <>
                    <ToolbarSeparator />

                    <ToolbarGroup>
                        <MarkButton type="superscript" />
                        <MarkButton type="subscript" />
                    </ToolbarGroup>

                    <ToolbarSeparator />

                    <ToolbarGroup>
                        <TextAlignButton align="left" />
                        <TextAlignButton align="center" />
                        <TextAlignButton align="right" />
                        <TextAlignButton align="justify" />
                    </ToolbarGroup>

                    <ToolbarSeparator />

                    <ToolbarGroup>
                        <ImageUploadButton text="Add" />
                    </ToolbarGroup>
                </>
            )}

            <Spacer />
        </>
    )
}


