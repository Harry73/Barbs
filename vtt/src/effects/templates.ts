/**
 * How template effects relate to the effects next to them: which grant/inflict triggers point at which template.
 * Templates never apply themselves; a trigger (or using a usable item) copies them onto someone. These helpers are
 * duck-typed over effect-like objects so the item sheet, the effect config, and the smoke test can share them.
 */

interface TriggerLike {
    action: string;
    effect?: string;
    value?: string;
    effectData?: unknown;
}

export interface EffectLike {
    id: string | null;
    name: string;
    system: unknown;
}

/** Trigger actions that copy a template effect onto someone. */
export const GRANT_ACTIONS = new Set(["grant", "grantTarget", "inflict"]);

export const isTemplate = (effect: EffectLike): boolean => !!(effect.system as { template?: boolean }).template;

/**
 * The template a trigger copies, by name: the Effect column, or the Value column if that's blank (as the trigger
 * runner reads it). Null for actions that don't copy an effect and for ability-defined (inline) effects.
 */
export function grantedName(trigger: TriggerLike): string | null {
    if (!GRANT_ACTIONS.has(trigger.action) || trigger.effectData) return null;
    return (trigger.effect || trigger.value || "").trim() || null;
}

/** Names of the templates an effect's triggers grant or inflict. */
export function grantedNames(effect: EffectLike): Set<string> {
    const triggers = ((effect.system as { triggers?: TriggerLike[] }).triggers ?? []) as TriggerLike[];
    return new Set(triggers.map(grantedName).filter((n): n is string => !!n));
}

/** Effects among `siblings` whose triggers grant or inflict `template`. */
export function grantersOf<T extends EffectLike>(template: EffectLike, siblings: Iterable<T>): T[] {
    return [...siblings].filter((e) => e.id !== template.id && !isTemplate(e) && grantedNames(e).has(template.name));
}

export interface EffectGroup<T> {
    effect: T;
    /** Templates this effect's triggers grant or inflict, listed under it. */
    granted: T[];
    /** A template nothing here grants: applied by Use on a usable item, or not hooked up yet. */
    loose: boolean;
}

/**
 * An item's effects for its sheet: regular effects in order, each followed by the templates its triggers grant (a
 * template granted by several shows under the first), then any templates nothing grants.
 */
export function groupEffects<T extends EffectLike>(effects: Iterable<T>): EffectGroup<T>[] {
    const all = [...effects];
    const templates = all.filter(isTemplate);
    const placed = new Set<T>();
    const groups: EffectGroup<T>[] = [];
    for (const effect of all.filter((e) => !isTemplate(e))) {
        const names = grantedNames(effect);
        const granted = templates.filter((t) => names.has(t.name) && !placed.has(t));
        for (const t of granted) placed.add(t);
        groups.push({ effect, granted, loose: false });
    }
    for (const t of templates.filter((t) => !placed.has(t))) groups.push({ effect: t, granted: [], loose: true });
    return groups;
}
