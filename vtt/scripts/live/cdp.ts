/**
 * A small Chrome DevTools Protocol client: launch a headless Chrome with its own throwaway profile, open a page, and
 * evaluate code in it. Just enough to drive a Foundry client from scripts/live.ts, using Node's built-in WebSocket.
 */
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CHROME_PATHS = [
    process.env.CHROME,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/usr/bin/google-chrome",
].filter((p): p is string => !!p);

export interface Page {
    /** Evaluate an expression (or an async IIFE) in the page and return its JSON-able value. */
    evaluate<T = unknown>(expression: string, timeoutMs?: number): Promise<T>;
    navigate(url: string): Promise<void>;
    /** Console messages and uncaught exceptions from the page, since the last call. */
    drainLogs(): string[];
    close(): Promise<void>;
}

export async function launch({ port = 9333, headless = true }: { port?: number; headless?: boolean } = {}): Promise<Page> {
    const chrome = CHROME_PATHS.find((p) => fs.existsSync(p));
    if (!chrome) throw new Error("Chrome not found; set CHROME to its path.");
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), "barbs-chrome-"));
    const proc: ChildProcess = spawn(
        chrome,
        [
            ...(headless ? ["--headless=new"] : []),
            `--remote-debugging-port=${port}`,
            `--user-data-dir=${profile}`,
            "--no-first-run",
            "--no-default-browser-check",
            "--window-size=1600,1000",
            // Foundry's canvas needs WebGL; headless Chrome has it through SwiftShader.
            "--use-angle=swiftshader",
            "--enable-unsafe-swiftshader",
            "about:blank",
        ],
        { stdio: "ignore" },
    );

    let version: { webSocketDebuggerUrl: string } | null = null;
    for (let i = 0; i < 50 && !version; i++) {
        await new Promise((r) => setTimeout(r, 200));
        version = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json()).catch(() => null);
    }
    if (!version) throw new Error("Chrome didn't open its debugging port.");
    const targets = (await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json())) as { type: string; webSocketDebuggerUrl: string }[];
    const target = targets.find((t) => t.type === "page");
    if (!target) throw new Error("No page in Chrome.");

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
    });
    let nextId = 1;
    const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
    const listeners: ((method: string, params: any) => void)[] = [];
    const logs: string[] = [];
    ws.onmessage = (event) => {
        const msg = JSON.parse(String(event.data));
        if (msg.id && pending.has(msg.id)) {
            const p = pending.get(msg.id)!;
            pending.delete(msg.id);
            if (msg.error) p.reject(new Error(msg.error.message));
            else p.resolve(msg.result);
        } else if (msg.method) {
            for (const l of listeners) l(msg.method, msg.params);
        }
    };
    const send = (method: string, params: object = {}) =>
        new Promise<any>((resolve, reject) => {
            const id = nextId++;
            pending.set(id, { resolve, reject });
            ws.send(JSON.stringify({ id, method, params }));
        });

    await send("Page.enable");
    await send("Runtime.enable");
    listeners.push((method, params) => {
        if (method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(params.type)) {
            logs.push(`[${params.type}] ${params.args.map((a: any) => a.value ?? a.description ?? "").join(" ")}`);
        }
        if (method === "Runtime.exceptionThrown") {
            const d = params.exceptionDetails;
            logs.push(`[exception] ${d.exception?.description ?? d.text}`);
        }
    });

    return {
        async evaluate<T>(expression: string, timeoutMs = 60000): Promise<T> {
            const result = await Promise.race([
                send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }),
                new Promise((_, reject) => setTimeout(() => reject(new Error(`evaluate timed out after ${timeoutMs} ms`)), timeoutMs)),
            ]);
            const r = result as { result: { value?: T }; exceptionDetails?: { exception?: { description?: string }; text: string } };
            if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
            return r.result.value as T;
        },
        async navigate(url: string) {
            const loaded = new Promise<void>((resolve) => listeners.push((m) => m === "Page.loadEventFired" && resolve()));
            await send("Page.navigate", { url });
            await loaded;
        },
        drainLogs() {
            return logs.splice(0);
        },
        async close() {
            ws.close();
            const exited = new Promise((resolve) => proc.once("exit", resolve));
            proc.kill();
            await Promise.race([exited, new Promise((r) => setTimeout(r, 5000))]);
            fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
        },
    };
}
