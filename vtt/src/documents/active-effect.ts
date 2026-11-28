/**
 * Barbs's ActiveEffect document. Two additions to core so stat changes can be formulas ("+5% Evasion per buff" is
 * `5 * @self.buffs`), and renaming a template keeps the triggers that grant it pointing at it.
 *
 * Formulas:
 *
 *   - `@self` (buffs, statuses, stacks, health; see actorData) is available when resolving change values.
 *   - Core substitutes `@` references and then, for anything that isn't a schema NumberField, just calls Number() on
 *     the result, so "5 * 3" would come out as 0. Most Barbs stat buckets are derived, not schema fields, so finish
 *     the job: evaluate plain arithmetic after substitution.
 */
import { grantedName, isTemplate, type EffectLike } from "../effects/templates.ts";
import { effectFormulaData } from "../data/effect.ts";
import { actorData } from "../rules/roll-options.ts";

const ARITHMETIC = /^[\d\s+\-*/().]+$/;

export class BarbsActiveEffect extends ActiveEffect {
    override getReplacementData(baseData: Record<string, unknown>): Record<string, unknown> {
        const owner = (this as unknown as { target?: unknown }).target ?? (this.parent as { actor?: unknown } | null)?.actor ?? this.parent;
        const actor = (owner as { documentName?: string } | null)?.documentName === "Actor" ? (owner as Actor.Implementation) : null;
        return { ...baseData, self: actorData(actor), ...effectFormulaData(this) };
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

    /**
     * Grant/inflict triggers name their template, so renaming a template would quietly break them. Follow the rename
     * in sibling effects' triggers. Runs on the client that made the change.
     */
    protected override _onUpdate(changed: never, options: never, userId: string): void {
        super._onUpdate(changed, options, userId);
        const renamed = (changed as { name?: string }).name;
        const previous = (options as { barbsPreviousName?: string }).barbsPreviousName;
        if (userId !== game.user?.id || !renamed || !previous || previous === renamed || !isTemplate(this as unknown as EffectLike)) return;
        const siblings = ((this.parent as { effects?: Iterable<ActiveEffect.Implementation> } | null)?.effects ?? []) as Iterable<ActiveEffect.Implementation>;
        for (const effect of siblings) {
            const triggers = (effect._source as unknown as { system?: { triggers?: { action: string; effect?: string; value?: string }[] } }).system?.triggers;
            if (!triggers?.some((t) => grantedName(t) === previous)) continue;
            const updated = triggers.map((t) => (grantedName(t) === previous ? { ...t, effect: renamed, value: t.effect ? t.value : "" } : t));
            void effect.update({ "system.triggers": updated } as never);
        }
    }

    protected override async _preUpdate(changed: never, options: never, user: never): Promise<boolean | void> {
        if ((changed as { name?: string }).name !== undefined) (options as { barbsPreviousName?: string }).barbsPreviousName = this.name;
        return super._preUpdate(changed, options, user);
    }
}
