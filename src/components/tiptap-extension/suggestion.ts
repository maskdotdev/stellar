import { ReactRenderer } from "@tiptap/react";
import type { SuggestionOptions } from "@tiptap/suggestion";
import type { SuggestionProps } from "@tiptap/suggestion";

import { type Document, LibraryService } from "@/lib/services/library-service";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { useStudyStore } from "@/lib/stores/study-store";
import DocumentMentionList from "./document-mention-list.tsx";

interface SuggestionItem {
	id: string;
	label: string;
	docType?: string;
	tags?: string[];
	data?: Document;
}

async function ensureDocumentsLoaded(): Promise<Document[]> {
	const { documents, setDocuments } = useStudyStore.getState();
	if (documents.length > 0) return documents;

	try {
		const library = LibraryService.getInstance();
		await library.initialize().catch(() => {});
		const fetched = await library.getAllDocuments();
		setDocuments(fetched);
		return fetched;
	} catch {
		return [];
	}
}

function normalize(str: string): string {
	return (str || "").toLowerCase();
}

function sortByUpdatedAtDesc(a: Document, b: Document): number {
	const aTime = new Date(a.updated_at).getTime();
	const bTime = new Date(b.updated_at).getTime();
	return bTime - aTime;
}

const suggestion: Partial<SuggestionOptions<SuggestionItem>> = {
	char: "@",
	allow: () => true,
	items: async ({ query }) => {
		const limit = useSettingsStore.getState().app.documentMentionLimit;
		const docs = (await ensureDocumentsLoaded())
			.slice()
			.sort(sortByUpdatedAtDesc);

		const q = normalize(query || "");
		const filtered = q
			? docs.filter((doc) => {
					const inTitle = normalize(doc.title).includes(q);
					const inTags = (doc.tags || []).some((t) => normalize(t).includes(q));
					const inType = normalize(doc.doc_type || "").includes(q);
					return inTitle || inTags || inType;
				})
			: docs;

		// Prefer notes first, then others
		const prioritized = filtered.sort((a, b) => {
			const aIsNote = a.doc_type === "note";
			const bIsNote = b.doc_type === "note";
			if (aIsNote !== bIsNote) return aIsNote ? -1 : 1;
			return sortByUpdatedAtDesc(a, b);
		});

		const items: SuggestionItem[] = prioritized.slice(0, limit).map((doc) => ({
			id: doc.id,
			label: doc.title || "Untitled",
			docType: doc.doc_type,
			tags: doc.tags,
			data: doc,
		}));

		return items;
	},
	render: () => {
		let component: ReactRenderer<
			React.ComponentType<SuggestionProps<SuggestionItem>>
		> | null = null;

		return {
			onStart: (props) => {
				component = new ReactRenderer(
					DocumentMentionList as unknown as React.ComponentType<
						SuggestionProps<SuggestionItem>
					>,
					{
						props,
						editor: props.editor,
					},
				);

				if (!component.element) {
					return;
				}

				const element = component.element as unknown as HTMLElement;
				document.body.appendChild(element);
			},

			onUpdate: (props) => {
				if (!component) return;
				component.updateProps(props);
			},

			onKeyDown: (props) => {
				if (!component) return false;
				if (props.event.key === "Escape") {
					component.destroy();
					return true;
				}
				// Delegate to list component if available
				// @ts-expect-error - ref is provided by ReactRenderer
				return component.ref?.onKeyDown?.(props) ?? false;
			},

			onExit: () => {
				if (!component) return;
				if (component.element?.parentNode) {
					component.element.remove();
				}
				component.destroy();
				component = null;
			},
		};
	},
};

export default suggestion;
