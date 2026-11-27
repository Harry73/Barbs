/**
 * Formula values: any number on an effect (a multiplier %, crit damage, a stat change, a restore amount) can be a
 * formula using roll data, such as `20 * @self.buffs`, `50 * @target.marks.pursued`, or `@target.health.missingPercent`.
 *
 * Context available (see actorData in roll-options.ts): `@self`, plus `@target` per target and `@attacker` for a
 * defender's incoming modifiers, each with `buffs`, `conditions`, `level`, `health.value/max/percent/missingPercent`,
 * and counts by id: `statuses.<id>`, `stacks.<effect>`, `marks.<effect or status>` (effects the roller put on them),
 * `types.<type>` (1 if that creature type). Plus the roller's usual roll data (`@str`, `@stats.ac.value`) and
 * `@distance` where it applies.
 */

/** Does this formula depend on the target, so it has to be worked out per target? */
export function usesTarget(formula: string | number | undefined | null): boolean {
    return typeof formula === "string" && /@target\b|@distance\b/.test(formula);
}

/** Evaluate a formula to a number. Plain numbers skip the dice machinery. Missing data counts as 0. */
export function evaluateNumber(formula: string | number | undefined | null, data: object = {}): number {
    if (typeof formula === "number") return formula;
    const text = String(formula ?? "").trim();
    if (!text) return 0;
    if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
    try {
        const roll = new Roll(text, data as Record<string, unknown>).evaluateSync({ strict: false } as never);
        return Number(roll.total) || 0;
    } catch {
        return 0;
    }
}
