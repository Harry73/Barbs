/**
 * Barbs's ActiveEffect document. Two additions to core, both so stat changes can be formulas ("+5% Evasion per buff"
 * is `5 * @self.buffs`):
 *
 *   - `@self` (buffs, statuses, stacks, health; see actorData) is available when resolving change values.
 *   - Core substitutes `@` references and then, for anything that isn't a schema NumberField, just calls Number() on
 *     the result, so "5 * 3" would come out as 0. Most Barbs stat buckets are derived, not schema fields, so finish
 *     the job: evaluate plain arithmetic after substitution.
 */
import { actorData } from "../rules/roll-options.ts";

const ARITHMETIC = /^[\d\s+\-*/().]+$/;

export class BarbsActiveEffect extends ActiveEffect {
    override getReplacementData(baseData: Record<string, unknown>): Record<string, unknown> {
        const owner = (this as unknown as { target?: unknown }).target ?? (this.parent as { actor?: unknown } | null)?.actor ?? this.parent;
        const actor = (owner as { documentName?: string } | null)?.documentName === "Actor" ? (owner as Actor.Implementation) : null;
        return { ...baseData, self: actorData(actor) };
    }

    static override _replaceDataRefs(raw: string, data: object): string {
        const replaced = (super._replaceDataRefs as (raw: string, data: object) => string)(raw, data);
        if (typeof replaced !== "string" || !ARITHMETIC.test(replaced) || !/[+*/()]|\d\s*-/.test(replaced)) return replaced;
        try {
            return String(Roll.safeEval(replaced));
        } catch {
            return replaced;
        }
    }
}
