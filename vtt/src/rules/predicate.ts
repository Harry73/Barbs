/**
 * Predicates: conditions on a roll, modifier, or trigger, tested against a set of "roll options" (plain strings that
 * describe the situation, like `weapon:bow` or `target:type:demon`). Modeled on PF2e's predicates, with a compact text
 * syntax so effects can be edited without JSON:
 *
 *   target:type:demon                      the target is a demon
 *   weapon:bow | weapon:crossbow           either
 *   !self:status:hidden                    not
 *   target:health:percent < 30             numeric comparison against `target:health:percent:<n>`
 *   ability:tag:spell, origin:attacker     both (commas separate conditions that must all hold)
 *
 * Pure: no Foundry APIs, so the smoke test can exercise it.
 */

export type Comparison = "<" | "<=" | ">" | ">=" | "=";

export type Statement =
    | { atom: string }
    | { not: Statement }
    | { or: Statement[] }
    | { compare: Comparison; key: string; value: number };

/** All statements must hold. Empty = always true. */
export type Predicate = Statement[];

const COMPARE = /^(.+?)\s*(<=|>=|<|>|=)\s*(-?\d+(?:\.\d+)?)$/;

function parseTerm(term: string): Statement | null {
    const text = term.trim();
    if (!text) return null;
    if (text.startsWith("!")) {
        const inner = parseTerm(text.slice(1));
        return inner ? { not: inner } : null;
    }
    if (text.includes("|")) {
        const options = text.split("|").map(parseTerm).filter((s): s is Statement => !!s);
        return options.length ? { or: options } : null;
    }
    const comparison = COMPARE.exec(text);
    if (comparison) return { compare: comparison[2] as Comparison, key: comparison[1].trim(), value: Number(comparison[3]) };
    return { atom: text.toLowerCase() };
}

/** Parse the text syntax. Unparseable fragments are dropped rather than failing the whole predicate. */
export function parsePredicate(text: string | undefined | null): Predicate {
    if (!text) return [];
    return text
        .split(",")
        .map(parseTerm)
        .filter((s): s is Statement => !!s);
}

function formatStatement(s: Statement): string {
    if ("atom" in s) return s.atom;
    if ("not" in s) return `!${formatStatement(s.not)}`;
    if ("or" in s) return s.or.map(formatStatement).join(" | ");
    return `${s.key} ${s.compare} ${s.value}`;
}

export function formatPredicate(predicate: Predicate): string {
    return predicate.map(formatStatement).join(", ");
}

/** Numeric values of `key:<n>` options in the domain, e.g. `target:health:percent:42` → 42. */
function numericValues(key: string, domain: Set<string>): number[] {
    const prefix = `${key.toLowerCase()}:`;
    const out: number[] = [];
    for (const option of domain) {
        if (!option.startsWith(prefix)) continue;
        const value = Number(option.slice(prefix.length));
        if (!Number.isNaN(value)) out.push(value);
    }
    return out;
}

function holds(s: Statement, domain: Set<string>): boolean {
    if ("atom" in s) return domain.has(s.atom);
    if ("not" in s) return !holds(s.not, domain);
    if ("or" in s) return s.or.some((x) => holds(x, domain));
    const values = numericValues(s.key, domain);
    return values.some((v) =>
        s.compare === "<" ? v < s.value : s.compare === "<=" ? v <= s.value : s.compare === ">" ? v > s.value : s.compare === ">=" ? v >= s.value : v === s.value,
    );
}

export function testPredicate(predicate: Predicate, domain: Set<string> | string[]): boolean {
    const set = domain instanceof Set ? domain : new Set(domain);
    return predicate.every((s) => holds(s, set));
}

/** Does any part of the predicate depend on options with this prefix (e.g. "target:")? */
export function mentions(predicate: Predicate, prefix: string): boolean {
    const check = (s: Statement): boolean =>
        "atom" in s ? s.atom.startsWith(prefix) : "not" in s ? check(s.not) : "or" in s ? s.or.some(check) : s.key.startsWith(prefix);
    return predicate.some(check);
}

/** "Ranged Fine" → "ranged-fine": how names (effects, classes, abilities) appear in roll options. */
export function slug(text: string): string {
    return text
        .toLowerCase()
        .replace(/\(.*?\)/g, "")
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}
