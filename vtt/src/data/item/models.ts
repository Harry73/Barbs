import {
    ATTRIBUTE_KEYS,
    COST_RESOURCES,
    DAMAGE_TYPES,
    EQUIPMENT_SLOTS,
    WEAPON_CATEGORIES,
    WEAPON_SCALING,
    SKILL_MAX_POINTS,
    SKILL_POINT_BONUS,
    skillRank,
    type AttributeKey,
} from "../../config.ts";
import { equipConflict, type EquippedItem } from "../../rules/equipment.ts";
import type { CreatureModel } from "../actor/creature.ts";

const fields = foundry.data.fields;

/** Plain text field that is always a string (never undefined), defaulting to "". */
const text = () => new fields.StringField({ required: true, blank: true, initial: "" });

const nameAndText = () =>
    new fields.SchemaField({
        name: new fields.StringField({ required: true, blank: true }),
        description: new fields.HTMLField(),
    });

/* -------------------------------------------- */
/*  Skill                                       */
/* -------------------------------------------- */

function defineSkillSchema() {
    return {
        category: text(),
        attribute: new fields.StringField({ required: true, choices: [...ATTRIBUTE_KEYS], initial: "int" }),
        points: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            min: 0,
            max: SKILL_MAX_POINTS,
            initial: 0,
        }),
        description: new fields.HTMLField(),
        /** Breakpoint notes from the rulebook, e.g. { rank: "Rank A", text: "You can ..." }. */
        rankNotes: new fields.ArrayField(
            new fields.SchemaField({
                rank: new fields.StringField({ required: true, blank: false }),
                text: text(),
            }),
        ),
    };
}

/**
 * One skill a character knows. Characters only own the skills they've discovered, so the sheet lists exactly those.
 * A skill with 0 points is "Untrained": known, but adds no rank bonus.
 */
export class SkillModel extends foundry.abstract.TypeDataModel<
    ReturnType<typeof defineSkillSchema>,
    Item.Implementation
> {
    static override defineSchema() {
        return defineSkillSchema();
    }

    get rank(): string {
        return skillRank(this.points);
    }

    get rankBonus(): number {
        return SKILL_POINT_BONUS * this.points;
    }

    /** Attribute total of the owning actor, or 0 for unowned skills. */
    get attributeBonus(): number {
        const actorSystem = this.parent.actor?.system as CreatureModel | undefined;
        return actorSystem?.derived.attributes[this.attribute as AttributeKey]?.total ?? 0;
    }

    /** The full modifier added to a d100 skill check. */
    get modifier(): number {
        return this.rankBonus + this.attributeBonus;
    }
}

/* -------------------------------------------- */
/*  Race                                        */
/* -------------------------------------------- */

function defineRaceSchema() {
    return {
        description: new fields.HTMLField(),
        traits: new fields.ArrayField(nameAndText()),
    };
}

export class RaceModel extends foundry.abstract.TypeDataModel<ReturnType<typeof defineRaceSchema>, Item.Implementation> {
    static override defineSchema() {
        return defineRaceSchema();
    }
}

/* -------------------------------------------- */
/*  Class                                       */
/* -------------------------------------------- */

function defineClassSchema() {
    return {
        abbreviation: text(),
        preview: text(),
        description: new fields.HTMLField(),
        flavorText: new fields.HTMLField(),
        requirements: new fields.ArrayField(text()),
        /** False while the class is only a hint and some requirements are still undiscovered. */
        allRequirementsKnown: new fields.BooleanField({ initial: true }),
        passive: nameAndText(),
        branches: new fields.ArrayField(nameAndText()),
    };
}

export class ClassModel extends foundry.abstract.TypeDataModel<
    ReturnType<typeof defineClassSchema>,
    Item.Implementation
> {
    static override defineSchema() {
        return defineClassSchema();
    }
}

/* -------------------------------------------- */
/*  Ability                                     */
/* -------------------------------------------- */

function defineAbilitySchema() {
    return {
        className: text(),
        branch: text(),
        tier: new fields.NumberField({ required: true, nullable: false, integer: true, min: 1, max: 4, initial: 1 }),
        action: text(),
        cost: new fields.SchemaField({
            /** The cost as written in the rulebook, e.g. "30 stamina or mana" or "2 healing ingredients". */
            text: text(),
            /** Parsed amount when the cost is a simple "<n> <resource>"; null otherwise. */
            value: new fields.NumberField({ integer: true, min: 0, nullable: true, initial: null }),
            resource: new fields.StringField({ required: true, blank: true, choices: [...COST_RESOURCES], initial: "" }),
        }),
        range: text(),
        duration: text(),
        description: new fields.HTMLField(),
        tags: new fields.ArrayField(text()),
        /** Notes carried over from the Roll20 API usage page. */
        notes: new fields.HTMLField(),
        /** Catalog key to use instead of "Class/Ability" (summon attacks, e.g. "Summon/Summoner/Summon Ascarion Beast/Bite"). */
        automationKey: text(),
    };
}

export class AbilityModel extends foundry.abstract.TypeDataModel<
    ReturnType<typeof defineAbilitySchema>,
    Item.Implementation
> {
    static override defineSchema() {
        return defineAbilitySchema();
    }

    /** Whether using the ability can automatically deduct its cost. */
    get hasAutomaticCost(): boolean {
        return this.cost.value !== null && this.cost.resource !== "";
    }
}

/* -------------------------------------------- */
/*  Equipment                                   */
/* -------------------------------------------- */

function defineEquipmentSchema() {
    return {
        slot: new fields.StringField({ required: true, choices: Object.keys(EQUIPMENT_SLOTS), initial: "none" }),
        equipped: new fields.BooleanField(),
        quantity: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 1 }),
        weight: new fields.NumberField({ required: true, nullable: false, min: 0, initial: 0 }),
        description: new fields.HTMLField(),
        /**
         * Weapon implicit stats from the crafting blueprints, e.g. a dagger is d4 physical, 10% crit chance, 100%
         * crit modifier, no scaling.
         * Mods and enchantments (on-hit damage etc.) are ActiveEffects on the item with roll modifiers.
         */
        weapon: new fields.SchemaField({
            category: new fields.StringField({ required: true, blank: true, choices: Object.keys(WEAPON_CATEGORIES), initial: "" }),
            damage: new fields.StringField({ required: true, blank: true, initial: "" }),
            damageType: new fields.StringField({ required: true, choices: [...DAMAGE_TYPES], initial: "physical" }),
            scaling: new fields.StringField({ required: true, choices: Object.keys(WEAPON_SCALING), initial: "none" }),
            /** Implicit crit chance added to the wielder's, e.g. the dagger's 10%. */
            critChance: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
            /** Extra damage on a crit, as a percent: 100 doubles damage, 50 is x1.5. */
            critModifier: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 100 }),
        }),
    };
}

export class EquipmentModel extends foundry.abstract.TypeDataModel<
    ReturnType<typeof defineEquipmentSchema>,
    Item.Implementation
> {
    static override defineSchema() {
        return defineEquipmentSchema();
    }

    /**
     * The "misc" slot was dropped; anything saved there is just carried now. Without this, those items would fail
     * the slot field's validation and refuse to load.
     */
    static override migrateData(source: Record<string, unknown>) {
        if (source.slot === "misc") source.slot = "none";
        return super.migrateData(source);
    }

    get isWeapon(): boolean {
        return !!this.weapon.category && !!this.weapon.damage;
    }

    /** Held weapons are the ones in a hand slot and equipped. */
    get isHeldWeapon(): boolean {
        return this.isWeapon && this.equipped && ["mainHand", "offhand", "twoHand"].includes(this.slot);
    }

    /** Everything else the owner has equipped, for slot limits. */
    #otherEquipped(): EquippedItem[] {
        const item = this.parent;
        const actor = item?.actor;
        if (!actor) return [];
        return actor.items
            .filter((i) => i.id !== item.id && i.type === "equipment" && (i.system as unknown as EquipmentModel).equipped)
            .map((i) => ({ name: i.name, slot: (i.system as unknown as EquipmentModel).slot }));
    }

    /** An item arriving already equipped (dropped from another character) into a full slot arrives unequipped. */
    protected override async _preCreate(data: never, options: never, user: never): Promise<boolean | void> {
        const allowed = await super._preCreate(data, options, user);
        if (allowed === false) return false;
        if (!this.equipped) return;
        const conflict = equipConflict(this.slot, this.#otherEquipped());
        if (conflict) {
            ui.notifications?.warn(`${this.parent.name} was added unequipped. ${conflict}`);
            this.parent.updateSource({ system: { equipped: false } } as never);
        }
    }

    /**
     * Refuse equipping (or moving an equipped item) into a slot that's already full.
     *
     * The item sheet submits every field on every edit, so `changes` carries `slot` and `equipped` even when they
     * didn't change. Only check when one of them actually changes, and only drop that part of the update: the rest
     * of the edit (quantity, weapon stats) still goes through. Re-render the sheet afterwards, because if nothing else
     * changed there's no update to re-render it, and its checkbox would keep claiming the item is equipped.
     */
    protected override async _preUpdate(changed: never, options: never, user: never): Promise<boolean | void> {
        const allowed = await super._preUpdate(changed, options, user);
        if (allowed === false) return false;
        const changes = (changed as { system?: { slot?: string; equipped?: boolean } }).system;
        if (!changes) return;
        const slot = changes.slot ?? this.slot;
        const equipped = changes.equipped ?? this.equipped;
        const moving = slot !== this.slot;
        const equipping = equipped && !this.equipped;
        if (!equipped || (!moving && !equipping)) return;
        const conflict = equipConflict(slot, this.#otherEquipped());
        if (!conflict) return;
        ui.notifications?.warn(conflict);
        if (equipping) changes.equipped = false;
        else delete changes.slot;
        const sheet = this.parent?.sheet;
        if (sheet?.rendered) setTimeout(() => void sheet.render(), 0);
    }
}

/* -------------------------------------------- */
/*  Passive                                     */
/* -------------------------------------------- */

function definePassiveSchema() {
    return {
        className: text(),
        description: new fields.HTMLField(),
        /** Tracked counters from the passive's automation (Spotting, Ki, Hunter stacks), by key. */
        resources: new fields.ObjectField(),
        /** Persistent choices (Thief stance, Aquamancer tide), by key. */
        state: new fields.ObjectField(),
    };
}

/**
 * A class passive. Characters get one automatically with their first ability in a class. What it can do (resources,
 * roll bonuses, sheet actions) comes from src/passives/catalog.ts, keyed by "Class/Passive".
 */
export class PassiveModel extends foundry.abstract.TypeDataModel<
    ReturnType<typeof definePassiveSchema>,
    Item.Implementation
> {
    static override defineSchema() {
        return definePassiveSchema();
    }

    declare resources: Record<string, number>;
    declare state: Record<string, string>;
}
