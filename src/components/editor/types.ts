export interface ControlledEditorProps {
	content?: string;
	onChange?: (content: string) => void;
	placeholder?: string;
	className?: string;
	editable?: boolean;
	minimal?: boolean;
}
