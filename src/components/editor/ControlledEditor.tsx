import { EditorContent, EditorContext, useEditor } from "@tiptap/react"
import * as React from "react"

import { Toolbar } from "@/components/tiptap-ui-primitive/toolbar"
import { useCursorVisibility } from "@/hooks/use-cursor-visibility"
import { useMobile } from "@/hooks/use-mobile"
import { useWindowSize } from "@/hooks/use-window-size"
import { useStudyStore } from "@/lib/stores/study-store"

import { buildEditorExtensions } from "./extensions"
import { MainToolbarContent } from "./toolbar/MainToolbarContent"
import { MobileToolbarContent } from "./toolbar/MobileToolbarContent"
import type { ControlledEditorProps } from "./types"


import "@/components/tiptap-node/code-block-node/code-block-node.scss"
import "@/components/tiptap-node/list-node/list-node.scss"
import "@/components/tiptap-node/image-node/image-node.scss"
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss"
import "@/components/tiptap-templates/simple/simple-editor.scss"

export function ControlledEditor({
    content = "",
    onChange,
    placeholder = "Start writing...",
    className,
    editable = true,
    minimal = false,
}: ControlledEditorProps) {
    const isMobile = useMobile()
    const windowSize = useWindowSize()
    const [mobileView, setMobileView] = React.useState<"main" | "highlighter" | "link">("main")
    const toolbarRef = React.useRef<HTMLDivElement>(null)
    const editorRef = React.useRef<ReturnType<typeof useEditor> | null>(null)

    const isInternalUpdate = React.useRef(false)
    const lastExternalContent = React.useRef(content)

    const editor = useEditor({
        immediatelyRender: false,
        editable,
        content: content || "<p></p>",
        onUpdate: ({ editor }) => {
            isInternalUpdate.current = true
            const newContent = editor.getHTML()
            onChange?.(newContent)
            Promise.resolve().then(() => {
                isInternalUpdate.current = false
            })
        },
        onCreate: ({ editor }) => {
            if (
                editable &&
                (!content || content.trim() === "" || content === "<h1>New Note</h1><p>Start writing your thoughts here...</p>")
            ) {
                editor.commands.focus()
            }
        },
        editorProps: {
            attributes: {
                autocomplete: "off",
                autocorrect: "off",
                autocapitalize: "off",
                "aria-label": "Main content area, start typing to enter text.",
                class: className || "",
            },
            handleClick(_view, _pos, event) {
                const target = event.target as HTMLElement
                // Detect TipTap mention elements
                const mentionEl = (target.closest?.('.mention, [data-type="mention"]') as HTMLElement | null) || null
                if (mentionEl) {
                    // Try to read document id from common attributes
                    const documentId =
                        mentionEl.getAttribute('data-document-id') ||
                        mentionEl.getAttribute('data-id') ||
                        mentionEl.dataset.documentId ||
                        mentionEl.dataset.id ||
                        null

                    if (documentId && documentId.trim() !== '') {
                        try {
                            const { setCurrentDocument, setCurrentView } = useStudyStore.getState()
                            setCurrentDocument(documentId)
                            setCurrentView('focus')
                            event.preventDefault()
                            event.stopPropagation()
                            return true
                        } catch {
                            // fall through
                        }
                    }
                }
                return false
            },
            handleKeyDown(view, event) {
                if (event.key === "Tab") {
                    const editor = editorRef.current
                    if (event.shiftKey) {
                        if (editor?.isActive("listItem")) {
                            event.preventDefault()
                            editor.chain().focus().liftListItem("listItem").run()
                            return true
                        }
                        if (editor?.isActive("taskItem")) {
                            event.preventDefault()
                            editor.chain().focus().liftListItem("taskItem").run()
                            return true
                        }
                        event.preventDefault()
                        return true
                    }

                    if (editor?.isActive("listItem")) {
                        event.preventDefault()
                        editor.chain().focus().sinkListItem("listItem").run()
                        return true
                    }
                    if (editor?.isActive("taskItem")) {
                        event.preventDefault()
                        editor.chain().focus().sinkListItem("taskItem").run()
                        return true
                    }

                    event.preventDefault()
                    const { state } = view
                    const { tr } = state
                    const insert = state.schema.text("\t")
                    const { from, to } = state.selection
                    if (from !== to) {
                        tr.replaceSelectionWith(insert)
                    } else {
                        tr.insertText("\t", from, to)
                    }
                    view.dispatch(tr)
                    return true
                }
                return false
            },
        },
        extensions: buildEditorExtensions(placeholder),
    })

    const bodyRect = useCursorVisibility({
        editor,
        overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
    })

    React.useEffect(() => {
        editorRef.current = editor
        return () => {
            editorRef.current = null
        }
    }, [editor])

    React.useEffect(() => {
        if (!isMobile && mobileView !== "main") {
            setMobileView("main")
        }
    }, [isMobile, mobileView])

    React.useEffect(() => {
        if (editor && !isInternalUpdate.current && content !== lastExternalContent.current) {
            const currentEditorContent = editor.getHTML()
            const normalizeContent = (html: string) => html.replace(/\s+/g, " ").trim()
            const normalizedNewContent = normalizeContent(content || "")
            const normalizedCurrentContent = normalizeContent(currentEditorContent)
            if (normalizedNewContent !== normalizedCurrentContent) {
                const { from, to } = editor.state.selection
                editor.commands.setContent(content || "<p></p>", false)
                try {
                    if (from <= editor.state.doc.content.size) {
                        editor.commands.setTextSelection({
                            from: Math.min(from, editor.state.doc.content.size),
                            to: Math.min(to, editor.state.doc.content.size),
                        })
                    }
                } catch {
                    editor.commands.focus("end")
                }
            }
            lastExternalContent.current = content
        }
    }, [editor, content])

    React.useEffect(() => {
        lastExternalContent.current = content
    }, [content])

    React.useEffect(() => {
        if (
            editor &&
            editable &&
            (!content || content.trim() === "" || content === "<h1>New Note</h1><p>Start writing your thoughts here...</p>")
        ) {
            setTimeout(() => {
                editor.commands.focus()
            }, 100)
        }
    }, [editor, content, editable])

    return (
        <EditorContext.Provider value={{ editor }}>
            <div className={`border border-border rounded-md bg-background ${className || ""}`}>
                {editable && (
                    <Toolbar
                        ref={toolbarRef}
                        style={
                            isMobile
                                ? {
                                    bottom: `calc(100% - ${windowSize.height - bodyRect.y}px)`,
                                }
                                : {}
                        }
                    >
                        {mobileView === "main" ? (
                            <MainToolbarContent
                                onHighlighterClick={() => setMobileView("highlighter")}
                                onLinkClick={() => setMobileView("link")}
                                isMobile={isMobile}
                                minimal={minimal}
                            />
                        ) : (
                            <MobileToolbarContent
                                type={mobileView === "highlighter" ? "highlighter" : "link"}
                                onBack={() => setMobileView("main")}
                            />
                        )}
                    </Toolbar>
                )}

                <div className="content-wrapper relative">
                    <EditorContent editor={editor} role="presentation" className="simple-editor-content" />
                </div>
            </div>
        </EditorContext.Provider>
    )
}

export default ControlledEditor


