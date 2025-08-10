import suggestion from "@/components/tiptap-extension/suggestion";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import Mention from "@tiptap/extension-mention";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Underline } from "@tiptap/extension-underline";
import { StarterKit } from "@tiptap/starter-kit";
import Mathematics from "tiptap-math";

import { Link } from "@/components/tiptap-extension/link-extension";
import { Selection } from "@/components/tiptap-extension/selection-extension";
import { TrailingNode } from "@/components/tiptap-extension/trailing-node-extension";
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension";
import { appLowlight } from "@/lib/tiptap/lowlight";
import { MAX_FILE_SIZE, handleImageUpload } from "@/lib/utils/tiptap-utils";
import "katex/dist/katex.min.css";

export function buildEditorExtensions(placeholder: string) {
	return [
		StarterKit.configure({ codeBlock: false }),
		TextAlign.configure({ types: ["heading", "paragraph"] }),
		Underline,
		TaskList,
		TaskItem.configure({ nested: true }),
		Highlight.configure({ multicolor: true }),
		Image,
		Typography,
		Superscript,
		Subscript,
		Placeholder.configure({ placeholder }),
		CodeBlockLowlight.configure({ lowlight: appLowlight }),
		Selection,
		ImageUploadNode.configure({
			accept: "image/*",
			maxSize: MAX_FILE_SIZE,
			limit: 3,
			upload: handleImageUpload,
			onError: (error: unknown) => console.error("Upload failed:", error),
		}),
		TrailingNode,
		Link.configure({ openOnClick: false }),
		Mathematics,
		Mention.configure({
			HTMLAttributes: {
				class: "mention",
			},
			suggestion,
		}),
	];
}
