import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";

/**
 * `vite build --watch` only watches the module graph, so edits to templates, styles, lang files, or system.json
 * (everything under static/) wouldn't trigger a rebuild. Register them as watch files so the copy step reruns.
 */
function watchStatic(dir: string): Plugin {
    const walk = (d: string): string[] =>
        fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
            const p = path.join(d, e.name);
            return e.isDirectory() ? walk(p) : [p];
        });
    return {
        name: "barbs-watch-static",
        buildStart() {
            for (const file of walk(dir)) this.addWatchFile(file);
        },
    };
}

export default defineConfig({
    publicDir: "static",
    plugins: [watchStatic(path.resolve(import.meta.dirname, "static"))],
    build: {
        outDir: "dist",
        // Compendium packs are built into dist/packs by a separate script; don't wipe them on every code build.
        emptyOutDir: false,
        sourcemap: true,
        minify: false,
        target: "esnext",
        lib: {
            entry: "src/barbs.ts",
            formats: ["es"],
            fileName: () => "barbs.mjs",
        },
    },
});
