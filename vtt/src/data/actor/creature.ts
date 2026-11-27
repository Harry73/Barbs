import {
    ATTRIBUTE_KEYS,
    ATTRIBUTE_MAX,
    ATTRIBUTE_MIN,
    DOWNED_HEALTH_MAX,
    ELEMENTS,
    RESOURCE_KEYS,
    STAT_KEYS,
    STATS,
    STATUSES,
    type AttributeKey,
    type ResourceKey,
    type StatKey,
} from "../../config.ts";

const fields = foundry.data.fields;

function attributeField() {
    return new fields.SchemaField({
        value: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            min: ATTRIBUTE_MIN,
            max: ATTRIBUTE_MAX,
            // Characters start with every attribute at -10 and buy their way up (see "Attributes" in the rulebook).
            initial: ATTRIBUTE_MIN,
        }),
    });
}

function resourceField(initial: number) {
    return new fields.SchemaField({
        value: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial }),
    });
}

function defineCreatureSchema() {
    return {
        attributes: new fields.SchemaField({
            vit: attributeField(),
            end: attributeField(),
            spt: attributeField(),
            rcv: attributeField(),
            per: attributeField(),
            san: attributeField(),
            agi: attributeField(),
            tgh: attributeField(),
            ref: attributeField(),
            res: attributeField(),
            frt: attributeField(),
            str: attributeField(),
            dex: attributeField(),
            atn: attributeField(),
            pre: attributeField(),
            apl: attributeField(),
            int: attributeField(),
            wis: attributeField(),
            com: attributeField(),
            fcs: attributeField(),
        }),
        resources: new fields.SchemaField({
            health: resourceField(0),
            stamina: resourceField(0),
            mana: resourceField(0),
        }),
        /** Temporary health that absorbs damage before health does. A new grant only replaces a smaller one. */
        shielding: new fields.SchemaField({
            value: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
        }),
        downed: new fields.SchemaField({
            value: new fields.NumberField({
                required: true,
                nullable: false,
                integer: true,
                min: 0,
                initial: DOWNED_HEALTH_MAX,
            }),
        }),
        /**
         * Fixed stat values that replace the attribute formulas, for creatures with stat blocks (summons, monsters):
         * "100 HP, 20 AC, 50% evasion". Blank means use the formula. Effects still add on top.
         */
        overrides: new fields.SchemaField(
            Object.fromEntries(
                STAT_KEYS.map((k) => [k, new fields.NumberField({ required: false, nullable: true, initial: null })]),
            ) as Record<StatKey, foundry.data.fields.NumberField<{ required: false; nullable: true; initial: null }>>,
        ),
        details: new fields.SchemaField({
            gender: new fields.StringField({ required: true, blank: true, initial: "" }),
            age: new fields.StringField({ required: true, blank: true, initial: "" }),
            height: new fields.StringField({ required: true, blank: true, initial: "" }),
            weight: new fields.StringField({ required: true, blank: true, initial: "" }),
            eyes: new fields.StringField({ required: true, blank: true, initial: "" }),
            hair: new fields.StringField({ required: true, blank: true, initial: "" }),
            alignment: new fields.StringField({ required: true, blank: true, initial: "" }),
            languages: new fields.StringField({ required: true, blank: true, initial: "" }),
            biography: new fields.HTMLField(),
        }),
    };
}

export type CreatureSchema = ReturnType<typeof defineCreatureSchema>;

export const VULNERABILITY_KEYS = ["all", "magic", "physical", "psychic", ...ELEMENTS] as const;
export type VulnerabilityKey = (typeof VULNERABILITY_KEYS)[number];

/** Effect-modifiable numbers for a derived stat. Effects target `system.stats.<key>.bonus` / `.multiplier`. */
export interface StatData {
    base: number;
    bonus: number;
    /** Summed percentage, so two +30% effects give +60%, not 1.3 * 1.3. */
    multiplier: number;
    value: number;
}

export interface AttributeData {
    value: number;
    /** Added by effects, e.g. a `system.attributes.str.bonus` +5 change. */
    bonus: number;
    total: number;
}

export interface ResourceData {
    value: number;
    max: number;
}

/**
 * The derived (non-persisted) shape layered on top of the schema during data preparation. Kept as one interface so
 * sheets and roll code have a single place to look.
 */
export interface CreatureDerived {
    attributes: Record<AttributeKey, AttributeData>;
    resources: Record<ResourceKey, ResourceData>;
    stats: Record<StatKey, StatData>;
    downed: { value: number; max: number };
    initiativeBonus: number;
    /** Extra percent MR per element, on top of Magic Resist. Effects target `system.elementResist.<element>`. */
    elementResist: Record<(typeof ELEMENTS)[number], number>;
    /** General damage reduction percent, applied after AC/MR. Effects target `system.damageReduction`. */
    damageReduction: number;
    /**
     * Percent increased damage taken, by type. "all" applies to everything and "magic" to every element, on top of
     * the specific type. Effects target e.g. `system.vulnerability.physical` (Slam, Painful Blow).
     */
    vulnerability: Record<VulnerabilityKey, number>;
    /** Percent bonus to the effectiveness of buffs this creature casts. Effects target `system.buffEffectiveness`. */
    buffEffectiveness: number;
    /** Flat bonus to every skill check. Effects target `system.skillBonus` (Strengthen Mind's +30). */
    skillBonus: number;
    /**
     * Conditions this creature can't be given, by status id (non-zero = immune). Effects target
     * `system.conditionImmunity.<id>` (Dragonblood's Charm/Confusion/Fear/Taunt immunity).
     */
    conditionImmunity: Record<string, number>;
    /** Extra Downed Health. Effects target `system.downedBonus` (Dragonblood: Downed Health is 200). */
    downedBonus: number;
    /** Total points spent: attribute points above -10, skill points, and ability AP. */
    level: number;
    /** AP invested per class name, derived from owned ability tiers. */
    classInvestment: Record<string, number>;
}

/**
 * Shared data model for anything that fights: player characters and NPCs.
 */
export class CreatureModel extends foundry.abstract.TypeDataModel<CreatureSchema, Actor.Implementation> {
    static override defineSchema(): CreatureSchema {
        return defineCreatureSchema();
    }

    /** Typed view of this model after data preparation. */
    get derived(): CreatureDerived {
        return this as unknown as CreatureDerived;
    }

    /**
     * Set up the zeroed buckets that ActiveEffects add into. This runs before the "initial" effect phase, so
     * a change like `system.stats.ac.bonus + 10` has a number to add to.
     */
    override prepareBaseData(): void {
        const d = this.derived;
        for (const key of ATTRIBUTE_KEYS) {
            d.attributes[key].bonus = 0;
            d.attributes[key].total = d.attributes[key].value;
        }
        const stats = {} as Record<StatKey, StatData>;
        for (const key of STAT_KEYS) stats[key] = { base: 0, bonus: 0, multiplier: 0, value: 0 };
        d.stats = stats;
        d.initiativeBonus = 0;
        d.elementResist = Object.fromEntries(ELEMENTS.map((e) => [e, 0])) as CreatureDerived["elementResist"];
        d.damageReduction = 0;
        d.vulnerability = Object.fromEntries(VULNERABILITY_KEYS.map((k) => [k, 0])) as CreatureDerived["vulnerability"];
        d.buffEffectiveness = 0;
        d.skillBonus = 0;
        d.conditionImmunity = Object.fromEntries(STATUSES.filter((st) => st.category === "condition").map((st) => [st.id, 0]));
        d.downedBonus = 0;
    }

    override prepareDerivedData(): void {
        const d = this.derived;

        for (const key of ATTRIBUTE_KEYS) {
            const attr = d.attributes[key];
            attr.total = attr.value + attr.bonus;
        }

        for (const key of STAT_KEYS) {
            const config = STATS[key];
            const stat = d.stats[key];
            const override = (this.overrides as Record<string, number | null> | undefined)?.[key];
            stat.base = typeof override === "number" ? override : config.formula(d.attributes[config.attribute].total);
            stat.value = Math.round((stat.base + stat.bonus) * (1 + stat.multiplier / 100));
        }

        for (const key of RESOURCE_KEYS) {
            d.resources[key].max = Math.max(0, d.stats[key].value);
        }
        d.downed.max = DOWNED_HEALTH_MAX + d.downedBonus;

        // Level and class investment come from embedded items, which are prepared before the actor's derived data.
        const actor = this.parent;
        let level = ATTRIBUTE_KEYS.reduce((sum, k) => sum + (d.attributes[k].value - ATTRIBUTE_MIN), 0);
        const investment: Record<string, number> = {};
        for (const item of actor.items) {
            if (item.type === "skill") {
                level += (item.system as { points: number }).points;
            } else if (item.type === "ability") {
                const { className, tier } = item.system as { className: string; tier: number };
                level += tier;
                if (className) investment[className] = (investment[className] ?? 0) + tier;
            }
        }
        d.level = level;
        d.classInvestment = investment;
    }

    /** Flat roll data: `@vit`, `@agi` etc. resolve to attribute totals, alongside the full structure. */
    getRollData(): Record<string, unknown> {
        const d = this.derived;
        const data: Record<string, unknown> = {
            attributes: d.attributes,
            stats: d.stats,
            resources: d.resources,
            level: d.level,
            initiativeBonus: d.initiativeBonus,
            buffEffectiveness: d.buffEffectiveness,
            skillBonus: d.skillBonus,
        };
        for (const key of ATTRIBUTE_KEYS) data[key] = d.attributes[key].total;
        return data;
    }
}

export class CharacterModel extends CreatureModel {}

/** NPCs share the character model for now; they'll diverge once monster stat blocks are designed. */
export class NpcModel extends CreatureModel {}
