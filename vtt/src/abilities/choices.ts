/**
 * The pre-use dialog for modal abilities: "choose one", optional extra costs, ritual casting, and so on.
 */
import { activePassives, resourceValue } from "../passives/index.ts";
import type { Choices } from "./context.ts";
import type { ChoiceSpec } from "./types.ts";

/** Fill in bound defaults and limits from the caster's passives (current stance, Spotting available). */
export function bindChoices(actor: Actor.Implementation, choices: ChoiceSpec[]): ChoiceSpec[] {
    return choices.map((c) => {
        if (c.state) {
            const value = activePassives(actor)
                .map((p) => (p.automation.states?.some((s) => s.key === c.state) ? p.handle.state(c.state!) : null))
                .find((v) => v !== null);
            if (value) return { ...c, default: c.type === "checkbox" ? value === "true" || value === "on" : value };
        }
        if (c.resource) {
            const have = resourceValue(actor, c.resource);
            if (c.type === "number") return { ...c, max: Math.min(c.max ?? Infinity, have), hint: `${c.hint ? `${c.hint} ` : ""}You have ${have}.` };
            if (c.type === "checkbox" && (c.amount ?? 1) > have) {
                return { ...c, hint: `${c.hint ? `${c.hint} ` : ""}You only have ${have}.` };
            }
        }
        return c;
    });
}

const esc = (s: string) => foundry.utils.escapeHTML(s);

function field(choice: ChoiceSpec): string {
    const name = esc(choice.key);
    let input: string;
    switch (choice.type) {
        case "select": {
            const options = Object.entries(choice.options ?? {})
                .map(([value, label]) => {
                    const selected = String(choice.default ?? "") === value ? " selected" : "";
                    return `<option value="${esc(value)}"${selected}>${esc(label)}</option>`;
                })
                .join("");
            input = `<select name="${name}">${options}</select>`;
            break;
        }
        case "number": {
            const attrs = [
                choice.min !== undefined ? `min="${choice.min}"` : "",
                choice.max !== undefined ? `max="${choice.max}"` : "",
            ].join(" ");
            input = `<input type="number" name="${name}" value="${Number(choice.default ?? 0)}" ${attrs.replace("Infinity", "")} />`;
            break;
        }
        case "checkbox":
            input = `<input type="checkbox" name="${name}" ${choice.default ? "checked" : ""} />`;
            break;
    }
    const hint = choice.hint ? `<p class="hint">${esc(choice.hint)}</p>` : "";
    return `<div class="form-group"><label>${esc(choice.label)}</label><div class="form-fields">${input}</div>${hint}</div>`;
}

/** Ask the ability's questions. Returns null if the user cancels, which cancels the ability. */
export async function askChoices(title: string, choices: ChoiceSpec[]): Promise<Choices | null> {
    if (!choices.length) return {};
    const data = (await foundry.applications.api.DialogV2.input({
        window: { title },
        content: choices.map(field).join(""),
        ok: { label: "Use", icon: "fa-solid fa-bolt" },
        rejectClose: false,
    } as never)) as Choices | null;
    if (!data) return null;

    // Checkboxes are omitted from form data when unchecked; numbers come back as numbers already.
    const result: Choices = {};
    for (const choice of choices) {
        const value = data[choice.key];
        if (choice.type === "checkbox") result[choice.key] = !!value;
        else if (choice.type === "number") result[choice.key] = Number(value ?? choice.default ?? 0) || 0;
        else result[choice.key] = String(value ?? choice.default ?? "");
    }
    return result;
}

/** Default answers, for tests and for abilities used without a dialog. */
export function defaultChoices(choices: ChoiceSpec[] = []): Choices {
    return Object.fromEntries(
        choices.map((c) => [
            c.key,
            c.default ?? (c.type === "checkbox" ? false : c.type === "number" ? 0 : Object.keys(c.options ?? {})[0] ?? ""),
        ]),
    );
}
