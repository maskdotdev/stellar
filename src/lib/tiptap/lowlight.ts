// Centralized lowlight configuration for syntax highlighting in TipTap code blocks
// Uses the core lowlight instance and registers a curated set of common languages

import { common, createLowlight } from "lowlight";

import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import go from "highlight.js/lib/languages/go";
// highlight.js language modules
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml"; // used for html
import yaml from "highlight.js/lib/languages/yaml";

// Initialize lowlight with the built-in common grammars
const lowlight = createLowlight(common);

// Register additional languages (or override) with useful aliases
lowlight.register("javascript", javascript);
lowlight.register("typescript", typescript);
lowlight.register("json", json);
lowlight.register("css", css);
lowlight.register("xml", xml); // html maps to xml
lowlight.register("bash", bash);
lowlight.register("markdown", markdown);
lowlight.register("python", python);
lowlight.register("go", go);
lowlight.register("rust", rust);
lowlight.register("yaml", yaml);

// Additional aliases for convenience
lowlight.register("html", xml);
lowlight.register("js", javascript);
lowlight.register("jsx", javascript);
lowlight.register("ts", typescript);
lowlight.register("tsx", typescript);
lowlight.register("shell", bash);
lowlight.register("sh", bash);

export { lowlight as appLowlight };
