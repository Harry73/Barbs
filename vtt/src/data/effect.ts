import {
    DAMAGE_TYPES,
    EFFECT_ACTION_TYPES,
    EFFECT_CATEGORIES,
    MODIFIER_ROLL_TYPES,
    MODIFIER_TYPES,
    TRIGGER_ACTIONS,
    TRIGGER_EVENTS,
    type ModifierRollType,
    type EffectActionType,
    type ModifierType,
    type TriggerAction,
    type TriggerEvent,
} from "../config.ts";
import type { EquipmentModel } from "./item/models.ts";

const fields = foundry.data.fields;

/** Plain shape of one roll modifier, as stored on an effect. */
export interface RollModifierData {
    type: ModifierType;
    rollType: ModifierRollType;
    /** Damage type, or "all"/"allMagic" for multipliers and penetration. Ignored for crit modifiers and notes. */
    damageType: string;
    /** Only apply to attacks made with this weapon category (e.g. "bow"). Blank = any roll. */
    weapon: string;
    /** Formula for damage, number for percentages, text for notes. */
    value: string;
    /** For "stat" bonuses: the change key it adds to (`system.stats.ac.bonus`). */
    key?: string;
    /** Only on a crit ("On crit: 2d10 fire damage"). Damage and multipliers apply to each hit that crits. */
    onCrit?: boolean;
    /**
     * A predicate in text form ("target:type:demon", "weapon:bow | weapon:crossbow, !self:status:hidden"); see
     * src/rules/predicate.ts. Blank = always. Conditions on the target are checked per target when damage is applied.
     */
    conditions?: string;
}

/** Plain shape of one trigger: when something happens (and conditions hold), do something. See src/triggers. */
export interface TriggerData {
    event: TriggerEvent;
    /** Predicate text, tested against the event (see src/triggers for what each event can see). */
    conditions: string;
    /** Percent chance it fires once the conditions hold. 0 or 100 = always. */
    chance: number;
    /** "turn" / "round": fires at most once per turn or round; "once": only ever once. Blank = every time. */
    oncePer: "" | "turn" | "round" | "once";
    /** Delete the effect after the trigger fires (one-shot reactions). */
    consume: boolean;
    /** A skill check that must succeed: "Armor Mastery: Shields vs @level / 2". Blank = none. */
    check: string;
    action: TriggerAction;
    /** Amount (restore, damage) or text (note). Formulas see @self, @other, and @target/@attacker. */
    value: string;
    /** Resource for restore (health/stamina/mana), damage type for damage. */
    type: string;
    /** For grant/inflict: the name of a template effect on the same item or actor. */
    effect: string;
    /** For grant/inflict from ability automation: the effect's data inline, instead of a template. */
    effectData: object | null;
    /**
     * For "use" rows (action buttons): the button's label. Rows with the same label are one button, run in order
     * (spend 20 mana, then block).
     */
    label: string;
    /** For "use" rows: the action it takes, which is where it's listed on the Actions tab. */
    actionType: EffectActionType;
}

/**
 * Barbs data on every ActiveEffect. `modifiers` is the Bonuses list: stat bonuses (applied as core changes, e.g.
 * `system.stats.ac.bonus` + 40), blocks, damage over time, and what the Roll20 API did by mutating an attack roll in
 * flight: extra on-hit damage, damage multipliers, crit chance, and so on. Roll modifiers are read when the effect's
 * actor builds a roll.
 */
export class BarbsEffectModel extends foundry.data.ActiveEffectTypeDataModel {
    static override defineSchema() {
        return {
            ...super.defineSchema(),
            category: new fields.StringField({
                required: true,
                blank: true,
                choices: Object.keys(EFFECT_CATEGORIES),
                initial: "",
            }),
            /** Consumed by the next roll it modifies, like Assassin's Focus. */
            singleUse: new fields.BooleanField(),
            /**
             * Damage the bearer deals to creatures around them at the start of each of their turns (Fiery Temper).
             * Posted as a card targeting everyone in range; blank formula = none.
             */
            pulse: new fields.SchemaField({
                formula: new fields.StringField({ required: true, blank: true, initial: "" }),
                damageType: new fields.StringField({ required: true, blank: true, initial: "physical" }),
                radius: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                affects: new fields.StringField({ required: true, choices: ["enemies", "allies", "all"], initial: "enemies" }),
            }),
            /**
             * A template effect never applies by itself: triggers on the same item or actor copy it onto someone
             * (Battle Fervor, granted on hit). Templates are always inactive.
             */
            template: new fields.BooleanField({ initial: false }),
            /** Removed when the combat it was gained in ends ("until the end of combat"). */
            endsWithCombat: new fields.BooleanField({ initial: false }),
            triggers: new fields.ArrayField(
                new fields.SchemaField({
                    event: new fields.StringField({ required: true, choices: Object.keys(TRIGGER_EVENTS), initial: "hit" }),
                    conditions: new fields.StringField({ required: true, blank: true, initial: "" }),
                    chance: new fields.NumberField({ required: true, integer: true, min: 0, max: 100, initial: 0 }),
                    oncePer: new fields.StringField({ required: true, blank: true, choices: ["", "turn", "round", "once"], initial: "" }),
                    consume: new fields.BooleanField({ initial: false }),
                    check: new fields.StringField({ required: true, blank: true, initial: "" }),
                    action: new fields.StringField({ required: true, choices: Object.keys(TRIGGER_ACTIONS), initial: "restore" }),
                    value: new fields.StringField({ required: true, blank: true, initial: "" }),
                    type: new fields.StringField({ required: true, blank: true, initial: "" }),
                    effect: new fields.StringField({ required: true, blank: true, initial: "" }),
                    effectData: new fields.ObjectField({ required: false, nullable: true, initial: null }),
                    label: new fields.StringField({ required: true, blank: true, initial: "" }),
                    actionType: new fields.StringField({ required: true, choices: Object.keys(EFFECT_ACTION_TYPES), initial: "major" }),
                }),
            ),
            modifiers: new fields.ArrayField(
                new fields.SchemaField({
                    type: new fields.StringField({ required: true, choices: Object.keys(MODIFIER_TYPES), initial: "damage" }),
                    rollType: new fields.StringField({ required: true, choices: [...MODIFIER_ROLL_TYPES], initial: "all" }),
                    damageType: new fields.StringField({ required: true, blank: true, initial: "all" }),
                    weapon: new fields.StringField({ required: true, blank: true, initial: "" }),
                    value: new fields.StringField({ required: true, blank: true, initial: "" }),
                    onCrit: new fields.BooleanField({ initial: false }),
                    conditions: new fields.StringField({ required: true, blank: true, initial: "" }),
                    key: new fields.StringField({ required: true, blank: true, initial: "" }),
                }),
            ),
        };
    }

    declare category: string;
    declare singleUse: boolean;
    declare pulse: { formula: string; damageType: string; radius: number; affects: "enemies" | "allies" | "all" };
    declare modifiers: RollModifierData[];
    declare template: boolean;
    declare endsWithCombat: boolean;
    declare triggers: TriggerData[];

    /**
     * "Stat" bonuses are always-on character stats, so they ride Foundry's own change engine: each becomes an "add"
     * change (formulas included, see BarbsActiveEffect) when the effect is prepared. That keeps one list of bonuses on
     * the Barbs tab, while stats still apply the way core changes do.
     */
    override prepareDerivedData(): void {
        super.prepareDerivedData?.();
        const changes = (this as unknown as { changes: object[] }).changes;
        for (const m of this.modifiers ?? []) {
            if (m.type === "stat" && m.key && m.value !== "") changes.push({ key: m.key, type: "add", value: m.value, phase: "initial", priority: 20 });
        }
    }

    /**
     * Percent of the next attack on the bearer that this effect blocks (100 = all of it), from its "block" bonus rows
     * (the strongest, if there are several). 0 = not a block. The effect is used up when it blocks. Drains and DoT
     * ticks aren't attacks and aren't blocked.
     */
    get block(): number {
        return Math.max(0, ...(this.modifiers ?? []).filter((m) => m.type === "block").map((m) => Math.min(100, Number(m.value) || 0)));
    }

    /** Damage the bearer takes at the start of each turn, from "dot" bonus rows. */
    get dots(): { formula: string; damageType: string }[] {
        // A row left on "All" (the default for new rows) isn't a damage type: treat it as physical.
        const real = (type: string) => ((DAMAGE_TYPES as readonly string[]).includes(type) ? type : "physical");
        return (this.modifiers ?? []).filter((m) => m.type === "dot" && m.value).map((m) => ({ formula: m.value, damageType: real(m.damageType) }));
    }

    /**
     * Effects on equipment only apply while it's equipped. Otherwise defer to core (expired effects are suppressed).
     */
    get isSuppressed(): boolean {
        if (this.template) return true;
        const effect = this.parent as unknown as ActiveEffect.Implementation;
        const item = effect.parent;
        if (item instanceof Item && item.type === "equipment") {
            if (!(item.system as unknown as EquipmentModel).equipped) return true;
        }
        return effect.duration.expired;
    }
}
