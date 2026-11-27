import type { ChoiceSpec, Cost, EffectSpec } from "../abilities/types.ts";
import type { Choices } from "../abilities/context.ts";
import type { RollType } from "../config.ts";
import type { AttackBuilder, AttackResult } from "../rolls/attack.ts";

/** A counter a passive tracks on the sheet (Spotting, Ki, Hunter stacks, banked Healing Mana). */
export interface PassiveResource {
    key: string;
    label: string;
    max?: number;
    /** When it resets to 0. */
    resetOn?: ("combatEnd" | "longRest")[];
    /** Gained at the start of each of the owner's turns in combat. */
    gainOnTurnStart?: number;
}

/** A persistent choice a passive tracks (Thief stance, Aquamancer tide). */
export interface PassiveState {
    key: string;
    label: string;
    options: Record<string, string>;
    default: string;
}

/** A live handle on one owned passive. */
export interface PassiveHandle {
    item: Item.Implementation;
    actor: Actor.Implementation;
    resource(key: string): number;
    state(key: string): string;
}

/** What a roll is, for passives that react to rolls. */
export interface RollInfo {
    actor: Actor.Implementation;
    rollType: RollType;
    weapon: Item.Implementation | null;
    targets: Actor.Implementation[];
    /** The ability's tags, lowercased ("spell", "air", "combo"). Empty for weapon attacks. */
    tags: string[];
    abilityName: string | null;
    className: string | null;
    choices: Choices;
    /** Damage types the roll deals. */
    damageTypes: string[];
    /** The ability inflicts a crowd control condition (Destroyer's Aggravated Assault). */
    inflictsCC: boolean;
}

export interface AfterUseInfo extends RollInfo {
    result: AttackResult | null;
    /** Mana actually paid for the ability. */
    manaPaid: number;
}

/** A change to a passive resource, recorded so undo can reverse it. */
export interface PassiveDelta {
    itemUuid: string;
    key: string;
    delta: number;
}

export interface PassiveAction {
    key: string;
    label: string;
    icon?: string;
    run(passive: PassiveHandle): Promise<void>;
}

/**
 * How the system automates one class passive. Keyed "Class/Passive" in src/passives/catalog.ts.
 */
export interface PassiveAutomation {
    resources?: PassiveResource[];
    states?: PassiveState[];
    /** Buttons on the sheet ("Track target", "Spend a Hunter stack to heal"). */
    actions?: PassiveAction[];
    /** "Your monk mastery increases": each such passive raises the dU die and base combo chance. */
    monkMastery?: boolean;
    /** Extra questions in ability dialogs when relevant ("Consume 4 Winds of War?" on an air spell). */
    abilityChoices?: (info: Pick<RollInfo, "actor" | "tags" | "abilityName" | "className">, passive: PassiveHandle) => ChoiceSpec[];
    /** Change how an ability is paid for (Juggernaut paying stamina costs with health). */
    adjustCost?: (costs: Cost[], choices: Choices) => Cost[];
    /** Effects that exist while a state has a value (Run Stance's +20 speed), kept on the passive item. */
    stateEffects?: (state: Record<string, string>) => EffectSpec[];
    /** Adjust any roll the owner makes (Warleader's +25% per buff, Assassinate's double damage). */
    rollHook?: (builder: AttackBuilder, info: RollInfo, passive: PassiveHandle) => void;
    /** React after an ability is used (bank Healing Mana, empower the Ritual Dagger). Returns resource changes. */
    afterUse?: (info: AfterUseInfo, passive: PassiveHandle) => Promise<PassiveDelta[] | void>;
    /** Extra effects offered on the owner's ability cards (Pyromancer's Reduce to Ashes on fire spells). */
    extraTargets?: (info: RollInfo, passive: PassiveHandle) => EffectSpec[];
    /** Runs at the start of the owner's turns in combat, on the GM's client. */
    onTurnStart?: (passive: PassiveHandle) => Promise<void>;
    /** Reminders shown with the passive on the sheet. */
    notes?: string[];
}
