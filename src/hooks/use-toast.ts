import { useCallback, useMemo } from "react";
import { toast as sonnerToast } from "sonner";

export interface Toast {
	id?: string;
	title?: string;
	description?: string;
	variant?: "default" | "destructive";
}

// Toast implementation using Sonner
export function useToast() {
	const toast = useCallback(
		({ title, description, variant = "default" }: Omit<Toast, "id">) => {
			if (variant === "destructive") {
				sonnerToast.error(title, { description });
			} else {
				sonnerToast.success(title, { description });
			}
		},
		[],
	);

	const dismiss = useCallback((id?: string) => {
		if (id) {
			sonnerToast.dismiss(id);
		} else {
			sonnerToast.dismiss();
		}
	}, []);

	return useMemo(
		() => ({
			toast,
			dismiss,
			toasts: [], // Not used with Sonner
		}),
		[toast, dismiss],
	);
}
