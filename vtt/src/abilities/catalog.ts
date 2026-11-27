/**
 * Ability automation, keyed by "Class/Ability" exactly as in rulebook/abilities.json.
 *
 * Conventions:
 *   - Numbers come from the current rulebook text, not the old Roll20 handlers; where they differ, the rulebook wins.
 *   - Anything an entry doesn't automate goes in `notes`, since players read the card mid-fight, not the ability.
 *   - Buffs scale with the caster's buff effectiveness via ctx.scale() / ctx.dice(); each entry decides what scales.
 *   - Entries are looked up by name when the ability is used, so fixing one fixes every character who owns it.
 *
 * Abilities with no entry still work: using them pays their cost and posts their description.
 */
import { ELEMENTAL } from "./classes/elemental.ts";
import { MARTIAL } from "./classes/martial.ts";
import { SUPPORT } from "./classes/support.ts";
import { SUMMONS } from "./classes/summons.ts";
import { MONKS } from "./classes/monks.ts";
import type { AbilityAutomation } from "./types.ts";

export const ABILITY_AUTOMATION: Record<string, AbilityAutomation> = {
    ...ELEMENTAL,
    ...MARTIAL,
    ...SUPPORT,
    ...SUMMONS,
    ...MONKS,
};

/** Summon actions get their own keys, "Summon/<Class/Ability>/<Action>", which summon ability items point at. */
export function summonActionKey(abilityKey: string, action: string): string {
    return `Summon/${abilityKey}/${action}`;
}
for (const [key, automation] of Object.entries({ ...ABILITY_AUTOMATION })) {
    for (const [action, actionAutomation] of Object.entries(automation.summonActions ?? {})) {
        ABILITY_AUTOMATION[summonActionKey(key, action)] = actionAutomation;
    }
}

export function abilityKey(className: string, abilityName: string): string {
    return `${className}/${abilityName}`;
}

/** Look up an ability's automation, by an explicit catalog key (summon attacks) or by class and name. */
export function getAutomation(className: string, abilityName: string, key?: string): AbilityAutomation | null {
    return ABILITY_AUTOMATION[key || abilityKey(className, abilityName)] ?? null;
}
