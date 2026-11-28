/**
 * Find `const`/`let` variables read before their declaration inside the same function, which TypeScript doesn't
 * flag when the read is in a callback that runs later ("Cannot access 'formulaData' before initialization" on Apply,
 * from a `.map()` above the `const`). Returns "file:line name" for each one.
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

export function findUseBeforeDefine(root: string): string[] {
    const files: string[] = [];
    const walk = (dir: string) => {
        for (const name of fs.readdirSync(dir)) {
            const full = path.join(dir, name);
            if (fs.statSync(full).isDirectory()) walk(full);
            else if (full.endsWith(".ts")) files.push(full);
        }
    };
    walk(path.join(root, "src"));
    const program = ts.createProgram(files, {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        noEmit: true,
        skipLibCheck: true,
        types: [],
    });
    const checker = program.getTypeChecker();
    const found: string[] = [];
    const enclosingFunction = (node: ts.Node): ts.Node | undefined => {
        let p = node.parent;
        while (p && !ts.isFunctionLike(p) && !ts.isSourceFile(p)) p = p.parent;
        return p;
    };
    for (const sf of program.getSourceFiles()) {
        if (!files.includes(path.resolve(sf.fileName)) && !files.includes(sf.fileName)) continue;
        const visit = (node: ts.Node): void => {
            if (ts.isIdentifier(node) && !ts.isVariableDeclaration(node.parent)) {
                const decl = checker.getSymbolAtLocation(node)?.valueDeclaration;
                const blockScoped = decl && ts.isVariableDeclaration(decl) && ts.getCombinedNodeFlags(decl) & (ts.NodeFlags.Const | ts.NodeFlags.Let);
                if (decl && blockScoped && decl.getSourceFile() === sf && node.getStart() < decl.getStart()) {
                    // Module-level constants used by functions defined above them are fine (they run later).
                    const fn = enclosingFunction(decl);
                    let inside = false;
                    for (let p: ts.Node | undefined = node.parent; p; p = p.parent) if (p === fn) inside = true;
                    if (fn && !ts.isSourceFile(fn) && inside) {
                        const { line } = sf.getLineAndCharacterOfPosition(node.getStart());
                        found.push(`${path.relative(root, sf.fileName)}:${line + 1} ${node.text}`);
                    }
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(sf);
    }
    return found;
}
