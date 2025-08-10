declare module "lowlight/lib/core" {
	export const lowlight: any;
}

declare module "highlight.js/lib/languages/*" {
	const language: any;
	export default language;
}
