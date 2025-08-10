import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SuggestionProps } from "@tiptap/suggestion";
import * as React from "react";

type SuggestionItem = {
    id: string;
    label: string;
    docType?: string;
    tags?: string[];
    data?: unknown;
};

type KeyDownProps = SuggestionProps<SuggestionItem> & { event: KeyboardEvent };

export const DocumentMentionList = React.forwardRef<
    { onKeyDown: (props: KeyDownProps) => boolean },
    SuggestionProps<SuggestionItem>
>(function DocumentMentionList(props, ref) {
    const { items, command } = props;
    const [selectedIndex, setSelectedIndex] = React.useState(0);
    const [caretRect, setCaretRect] = React.useState<DOMRect | null>(null);

    const selectItem = React.useCallback(
        (index: number) => {
            const item = items[index];
            if (item) command(item);
        },
        [items, command],
    );

    // Track caret rectangle to anchor the dropdown trigger
    React.useLayoutEffect(() => {
        const rect = props.clientRect?.();
        if (rect) setCaretRect(rect);
    }, [props.clientRect]);

    const onKeyDown = React.useCallback(
        (keyProps: KeyDownProps) => {
            const event = keyProps.event;
            if (event.key === "ArrowUp") {
                event.preventDefault();
                setSelectedIndex((prev) => (prev + (items?.length ?? 0) - 1) % (items?.length ?? 1));
                return true;
            }
            if (event.key === "ArrowDown") {
                event.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % (items?.length ?? 1));
                return true;
            }
            if (event.key === "Enter") {
                event.preventDefault();
                selectItem(selectedIndex);
                return true;
            }
            return false;
        },
        [items?.length, selectItem, selectedIndex],
    );

    React.useImperativeHandle(ref, () => ({ onKeyDown }));

    // Clamp selection to available items to avoid out-of-range highlighting when the list changes.
    const effectiveSelectedIndex = React.useMemo(() => {
        if (!items || items.length === 0) return 0;
        return Math.min(selectedIndex, items.length - 1);
    }, [items, selectedIndex]);

    return (
        <DropdownMenu open modal={false}>
            <DropdownMenuTrigger asChild>
                <span
                    // Invisible, positioned trigger anchored at caret
                    style={{
                        position: "fixed",
                        top: caretRect ? `${caretRect.top}px` : "0px",
                        left: caretRect ? `${caretRect.left}px` : "0px",
                        width: caretRect ? `${Math.max(1, caretRect.width)}px` : "1px",
                        height: caretRect ? `${Math.max(1, caretRect.height)}px` : "1px",
                        pointerEvents: "none",
                        opacity: 0,
                    }}
                />
            </DropdownMenuTrigger>
            <DropdownMenuContent
                side="bottom"
                align="start"
                sideOffset={6}
                className="w-72 max-h-64"
                style={{ zIndex: 2147483647 }}
            >
                {(!items || items.length === 0) && (
                    <div className="p-2 text-sm">No results</div>
                )}
                {items && items.length > 0 &&
                    items.map((item, index) => {
                        const isActive = index === effectiveSelectedIndex;
                        return (
                            <DropdownMenuItem
                                key={item.id}
                                className={isActive ? "bg-accent text-accent-foreground" : undefined}
                                onMouseMove={() => setSelectedIndex(index)}
                                onSelect={(e) => {
                                    e.preventDefault();
                                    selectItem(index);
                                }}
                            >
                                <span className="truncate font-medium">{item.label}</span>
                                {item.docType ? (
                                    <span className="ml-auto text-xs opacity-70">{item.docType}</span>
                                ) : null}
                            </DropdownMenuItem>
                        );
                    })
                }
            </DropdownMenuContent>
        </DropdownMenu>
    );
});

export default DocumentMentionList;


