/**
 * Static game data for Barbs. Anything that is a rule of the game (formulas, rank tables, condition lists) lives here
 * so the data models and sheets don't each grow their own copy.
 *
 * The rulebook JSON is the source of truth for names and descriptions; it is bundled straight into the system.
 */
import attributesJson from "../../rulebook/attributes.json";
import buffsJson from "../../rulebook/buffs.json";
import conditionsJson from "../../rulebook/conditions.json";
import skillsJson from "../../rulebook/skills.json";

export const SYSTEM_ID = "barbs";

/* -------------------------------------------- */
/*  Attributes                                  */
/* -------------------------------------------- */

export const ATTRIBUTE_KEYS = [
    "vit", "end", "spt", "rcv", "per", "san",
    "agi", "tgh", "ref", "res", "frt",
    "str", "dex", "atn", "pre",
    "apl", "int", "wis", "com", "fcs",
] as const;
export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];

export const ATTRIBUTE_MIN = -10;
export const ATTRIBUTE_MAX = 20;

export interface AttributeConfig {
    key: AttributeKey;
    abbreviation: string;
    label: string;
    category: string;
    description: string;
}

export const ATTRIBUTES: Record<AttributeKey, AttributeConfig> = Object.fromEntries(
    attributesJson.map((a) => {
        const key = a.abbreviation.toLowerCase() as AttributeKey;
        return [key, { key, abbreviation: a.abbreviation, label: a.name, category: a.category, description: a.description }];
    }),
) as Record<AttributeKey, AttributeConfig>;

/** Map a full attribute name ("Intelligence") to its key ("int"). Used when importing rulebook skills. */
export function attributeKeyFromName(name: string): AttributeKey | null {
    const lower = name.trim().toLowerCase();
    return Object.values(ATTRIBUTES).find((a) => a.label.toLowerCase() === lower || a.key === lower)?.key ?? null;
}

/* -------------------------------------------- */
/*  Derived stats                               */
/* -------------------------------------------- */

/**
 * Every derived stat is computed from a single attribute, then adjusted by effects:
 *     value = (formula(attribute) + bonus) * (1 + multiplier / 100)
 * This mirrors how the Roll20 API combined flat stat bonuses with summed percentage multipliers.
 */
export interface StatConfig {
    label: string;
    attribute: AttributeKey;
    formula: (v: number) => number;
    /** Display suffix, e.g. "%" or " ft". */
    unit?: string;
}

export const STAT_KEYS = [
    "health", "stamina", "mana",
    "healthRegen", "staminaRegen", "manaRegen",
    "speed", "ac", "evasion", "magicResist", "conditionResist",
    "meleeDamage", "rangedFineDamage", "magicDamage", "critChance",
    "commands", "languages", "itemEfficiency", "buffLimit", "concentrationLimit",
] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export const STATS: Record<StatKey, StatConfig> = {
    // "A PC with -10 VIT will have a max health of 1."
    health: { label: "Health", attribute: "vit", formula: (v) => Math.max(1, 100 + 10 * v) },
    stamina: { label: "Stamina", attribute: "end", formula: (v) => 100 + 10 * v },
    mana: { label: "Mana", attribute: "spt", formula: (v) => 100 + 10 * v },
    healthRegen: { label: "Health Regeneration", attribute: "rcv", formula: (v) => 10 + v, unit: "%" },
    staminaRegen: { label: "Stamina Regeneration", attribute: "per", formula: (v) => 10 + v, unit: "%" },
    manaRegen: { label: "Mana Regeneration", attribute: "san", formula: (v) => 10 + v, unit: "%" },
    // "Every two points of AGI provides 5 feet", so a single point (positive or negative) does nothing.
    speed: { label: "Movement Speed", attribute: "agi", formula: (v) => 30 + 5 * Math.trunc(v / 2), unit: " ft" },
    ac: { label: "AC", attribute: "tgh", formula: (v) => 10 + v },
    evasion: { label: "Evasion", attribute: "ref", formula: (v) => 10 + v, unit: "%" },
    magicResist: { label: "Magic Resist", attribute: "res", formula: (v) => 10 + v, unit: "%" },
    conditionResist: { label: "Condition Resist", attribute: "frt", formula: (v) => 10 + v, unit: "%" },
    meleeDamage: { label: "Melee Damage", attribute: "str", formula: (v) => v },
    rangedFineDamage: { label: "Ranged/Fine Damage", attribute: "dex", formula: (v) => v },
    magicDamage: { label: "Magic Damage", attribute: "atn", formula: (v) => v },
    critChance: { label: "Critical Hit Chance", attribute: "pre", formula: (v) => 10 + v, unit: "%" },
    commands: { label: "Commands", attribute: "apl", formula: (v) => Math.floor((v + 10) / 10) + 1 },
    languages: { label: "Languages", attribute: "int", formula: (v) => Math.floor((v + 10) / 3) + 1 },
    itemEfficiency: { label: "Item Efficiency", attribute: "wis", formula: (v) => (v + 10) * 5, unit: "%" },
    buffLimit: { label: "Buff Limit", attribute: "com", formula: (v) => Math.floor((v + 10) / 2) },
    concentrationLimit: { label: "Concentration Limit", attribute: "fcs", formula: (v) => Math.floor((v + 10) / 2) },
};

/* -------------------------------------------- */
/*  Resources                                   */
/* -------------------------------------------- */

export const RESOURCE_KEYS = ["health", "stamina", "mana"] as const;
export type ResourceKey = (typeof RESOURCE_KEYS)[number];

export const RESOURCE_REGEN: Record<ResourceKey, StatKey> = {
    health: "healthRegen",
    stamina: "staminaRegen",
    mana: "manaRegen",
};

/** Downed Health pool from the Patch 1.3 death save rules. */
export const DOWNED_HEALTH_MAX = 100;

/* -------------------------------------------- */
/*  Skills                                      */
/* -------------------------------------------- */

/** Index = points invested. 0 points is "Untrained" (+0), 15 points is rank 1 (+75). */
export const SKILL_RANKS = ["Untrained", "F", "E", "D", "C", "B", "A", "9", "8", "7", "6", "5", "4", "3", "2", "1"] as const;
export const SKILL_MAX_POINTS = SKILL_RANKS.length - 1;
export const SKILL_POINT_BONUS = 5;

export function skillRank(points: number): string {
    return SKILL_RANKS[Math.clamp(Math.trunc(points), 0, SKILL_MAX_POINTS)];
}

/* -------------------------------------------- */
/*  Classes and abilities                       */
/* -------------------------------------------- */

/** AP that must already be invested in a class before abilities of a tier can be bought. Ability cost = tier. */
export const TIER_INVESTMENT_REQUIRED: Record<number, number> = { 1: 0, 2: 1, 3: 3, 4: 6 };

export const COST_RESOURCES = ["", "health", "stamina", "mana"] as const;
export type CostResource = (typeof COST_RESOURCES)[number];

/* -------------------------------------------- */
/*  Damage                                      */
/* -------------------------------------------- */

export const ELEMENTS = ["fire", "water", "earth", "air", "ice", "lightning", "light", "dark"] as const;
export const DAMAGE_TYPES = ["physical", "psychic", ...ELEMENTS] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

/* -------------------------------------------- */
/*  Rolls and modifiers                         */
/* -------------------------------------------- */

/**
 * What kind of roll an ability or attack makes. Effects use this to decide whether they apply, e.g. Arc of Air only
 * adds damage to physical (bow) attacks. Only physical rolls can crit.
 */
export const ROLL_TYPES = ["physical", "magic", "psychic", "healing"] as const;
export type RollType = (typeof ROLL_TYPES)[number];

/**
 * Kinds of roll modifier an effect can carry, applied when its owner makes a matching roll:
 *   damage       extra damage: value is a formula, damageType says which type
 *   multiplier   percent damage change for damageType (a type, "allMagic", or "all"), grouped by effect
 *   critChance   flat percent added to crit chance
 *   critDamage   percent added to the crit damage modifier (base x2)
 *   penetration  percent armor (physical) or magic (element) penetration for damageType
 *   canCrit      lets a non-physical roll crit ("your next spell is affected by your crit chance")
 *   comboChance  percent added to combo rolls (monk abilities)
 *   convert      all of the roll's damage becomes damageType ("bow damage is converted to air magic damage")
 *   status       an on-hit status (value is a status id like "cursed"), offered as an Apply button on the card
 *   note         text reminder shown on the roll card
 */
export const MODIFIER_TYPES = {
    damage: "Extra damage",
    multiplier: "Damage multiplier (%)",
    critChance: "Crit chance (%)",
    critDamage: "Crit damage (%)",
    penetration: "Penetration (%)",
    canCrit: "Can crit (spells)",
    cannotMiss: "Can't miss (no Evasion roll)",
    comboChance: "Combo chance (%)",
    convert: "Convert damage to type",
    status: "On-hit status (id [chance%])",
    bleedConvert: "Convert % physical to Bleed",
    shred: "On-hit AC shred (lasts as long as this effect)",
    acReduction: "This attack: target AC reduced by",
    crShred: "This attack: target CR reduced by (%)",
    evShred: "This attack: target Evasion reduced by (%)",
    buffStrip: "On-hit buff strip (count)",
    forcedMovement: "On-hit forced movement (ft)",
    vulnerability: "On-hit vulnerability (%, stacking)",
    accuracy: "Accuracy (%)",
    lethality: "Lethality (%)",
    lifesteal: "Lifesteal (%)",
    unblockable: "Unblockable chance (%)",
    note: "Note",
} as const;
export type ModifierType = keyof typeof MODIFIER_TYPES;

export const MODIFIER_ROLL_TYPES = ["all", ...ROLL_TYPES] as const;
export type ModifierRollType = (typeof MODIFIER_ROLL_TYPES)[number];

/** Effect categories that matter for rules: buffs count against Buff Limit, conditions can be resisted. */
export const EFFECT_CATEGORIES = { "": "Other", buff: "Buff", condition: "Condition" } as const;
export type EffectCategory = keyof typeof EFFECT_CATEGORIES;

/* -------------------------------------------- */
/*  Equipment                                   */
/* -------------------------------------------- */

export const WEAPON_CATEGORIES = {
    "": "Not a weapon",
    axe: "Axe",
    blunt: "Blunt",
    bow: "Bow",
    bullets: "Bullets",
    crossbow: "Crossbow",
    fine: "Fine",
    heavyThrowing: "Heavy Throwing",
    lightThrowing: "Light Throwing",
    longblade: "Longblade",
    orb: "Orb",
    polearm: "Polearm",
    shield: "Shield",
    shortblade: "Shortblade",
    staff: "Staff",
    unarmed: "Unarmed",
    wand: "Wand",
} as const;
export type WeaponCategory = keyof typeof WEAPON_CATEGORIES;

/** Weapon categories that make an attack "ranged" for "your next ranged attack" effects. */
export const RANGED_WEAPONS: string[] = ["bow", "crossbow", "bullets", "lightThrowing", "heavyThrowing", "wand", "orb"];

/** Pseudo-categories a roll modifier can filter on, besides a specific weapon category. */
export const WEAPON_FILTERS = { ranged: "Any ranged weapon", melee: "Any melee weapon" } as const;

/** Which flat damage stat a weapon adds to its physical damage. */
export const WEAPON_SCALING = {
    none: "None",
    melee: "Melee (STR)",
    rangedFine: "Ranged/Fine (DEX)",
} as const;
export type WeaponScaling = keyof typeof WEAPON_SCALING;

export const EQUIPMENT_SLOTS = {
    none: "None (inventory)",
    mainHand: "Main Hand",
    offhand: "Offhand",
    twoHand: "Two-Handed",
    head: "Head",
    body: "Body",
    hands: "Hands",
    feet: "Feet",
    neck: "Neck",
    ring: "Ring",
    belt: "Belt",
} as const;
export type EquipmentSlot = keyof typeof EQUIPMENT_SLOTS;

/** Order of the inventory's sections, top to bottom: gear by slot, then everything just carried. */
export const INVENTORY_ORDER: EquipmentSlot[] = [
    "mainHand", "offhand", "twoHand", "head", "body", "hands", "feet", "neck", "ring", "belt", "none",
];

/** Section headings, where they differ from the slot's own label. */
export const INVENTORY_HEADINGS: Partial<Record<EquipmentSlot, string>> = { ring: "Rings", none: "Not slotted" };

/* -------------------------------------------- */
/*  Buffs and conditions                        */
/* -------------------------------------------- */

/**
 * Icons and Foundry status ids for the rulebook's global buffs and conditions. A few ids are chosen to line up with
 * Foundry's special statuses (`blind`, `invisible`, `dead`) so core vision/defeated handling picks them up.
 */
const STATUS_OVERRIDES: Record<string, { id?: string; img: string }> = {
    Hidden: { img: "icons/svg/cowled.svg" },
    Immunity: { img: "icons/svg/holy-shield.svg" },
    "Increased Stats": { img: "icons/svg/upgrade.svg" },
    Invisible: { id: "invisible", img: "icons/svg/invisible.svg" },
    Bleeding: { img: "icons/svg/blood.svg" },
    Blinded: { id: "blind", img: "icons/svg/blind.svg" },
    Burned: { img: "icons/svg/fire.svg" },
    Charmed: { img: "icons/svg/card-joker.svg" },
    Confused: { img: "icons/svg/direction.svg" },
    Crippled: { img: "icons/svg/leg.svg" },
    Cursed: { img: "icons/svg/biohazard.svg" },
    "Decreased Stats": { img: "icons/svg/downgrade.svg" },
    Fear: { img: "icons/svg/terror.svg" },
    Frozen: { img: "icons/svg/frozen.svg" },
    Helpless: { img: "icons/svg/cancel.svg" },
    Immobilized: { img: "icons/svg/net.svg" },
    "Knocked Down (Prone)": { id: "prone", img: "icons/svg/falling.svg" },
    "Knocked Up (Airborne)": { id: "airborne", img: "icons/svg/jump.svg" },
    Paralyzed: { img: "icons/svg/paralysis.svg" },
    Petrified: { img: "icons/svg/stoned.svg" },
    Poisoned: { img: "icons/svg/poison.svg" },
    Silenced: { img: "icons/svg/silenced.svg" },
    Sleeping: { img: "icons/svg/sleep.svg" },
    Slowed: { img: "icons/svg/walk.svg" },
    Stunned: { img: "icons/svg/daze.svg" },
    Taunted: { img: "icons/svg/target.svg" },
    Weakened: { img: "icons/svg/degen.svg" },
};

/**
 * Character-level combat stats that gear and buffs modify but that aren't attribute-derived: the Roll20 sheet's
 * "Miscellaneous" block. Effects target `system.combat.<key>`; each starts at 0 and is summed.
 */
export const COMBAT_STATS = {
    accuracy: { label: "Accuracy", unit: "%", hint: "Reduces the target's Evasion when they dodge your attacks." },
    lethality: { label: "Lethality", unit: "%", hint: "Chance a hit instantly kills the target (not usable on players)." },
    minionLethality: { label: "Minion Lethality", unit: "%", hint: "Lethality for your summons' attacks." },
    lifesteal: { label: "Lifesteal", unit: "%", hint: "Heal for this much of the damage your attacks deal." },
    unblockable: { label: "Unblockable Chance", unit: "%", hint: "Chance your attacks can't be blocked." },
    critDamage: { label: "Crit Damage Modifier", unit: "%", hint: "Extra damage on a physical crit, on top of the weapon's." },
    comboChance: { label: "Combo Chance", unit: "%", hint: "Added to your combo rolls." },
    minionDamage: { label: "Minion Damage", unit: "%", hint: "Increased damage for your summons' attacks." },
    enchantEffectiveness: { label: "Enchant Effectiveness", unit: "%", hint: "Like Buff Effectiveness, for enchantment abilities." },
    concentrationBonus: { label: "Concentration Bonus", unit: "", hint: "Added to concentration checks." },
    reach: { label: "Reach", unit: " ft", hint: "Extra melee reach." },
    range: { label: "Range", unit: " ft", hint: "Extra attack range." },
} as const;
export type CombatStatKey = keyof typeof COMBAT_STATS;
export const COMBAT_STAT_KEYS = Object.keys(COMBAT_STATS) as CombatStatKey[];

/** Always-on damage multipliers by type (the Roll20 sheet's "Damage Multipliers"). `system.damageMultiplier.<key>`. */
export const MULTIPLIER_STAT_KEYS = ["all", "allMagic", "physical", "psychic", "healing", ...ELEMENTS] as const;
/** Always-on penetration by type (the Roll20 sheet's "Penetration Stats"). `system.penetration.<key>`. */
export const PENETRATION_STAT_KEYS = ["physical", "psychic", "allMagic", ...ELEMENTS] as const;

/** Rulebook skill names, and the key a per-skill bonus is stored under (`system.skillBonuses.<key>`). */
export const SKILL_NAMES: string[] = (skillsJson as { name: string }[]).map((s) => s.name);
export function skillKey(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export interface StatusConfig {
    id: string;
    name: string;
    img: string;
    description: string;
    category: "buff" | "condition" | "state";
}

function slugify(s: string): string {
    return s.toLowerCase().replace(/\(.*?\)/g, "").trim().replace(/[^a-z0-9]+/g, "-");
}

export const STATUSES: StatusConfig[] = [
    ...buffsJson.map((b) => ({ ...b, category: "buff" as const })),
    ...conditionsJson.map((c) => ({ ...c, category: "condition" as const })),
].map((s) => {
    const override = STATUS_OVERRIDES[s.name];
    return {
        id: override?.id ?? slugify(s.name),
        name: s.name,
        img: override?.img ?? "icons/svg/aura.svg",
        description: `<p>${s.description}</p><p><em>Duration: ${s.duration}</em></p>`,
        category: s.category,
    };
});

// Death-save states from Patch 1.3. "dead" is Foundry's DEFEATED special status.
STATUSES.push(
    {
        id: "downed",
        name: "Downed",
        img: "icons/svg/unconscious.svg",
        description:
            "<p>At 0 health you are Downed: prone, unconscious, and rolling death saves against your Downed Health each turn.</p>",
        category: "state",
    },
    { id: "dead", name: "Dead", img: "icons/svg/skull.svg", description: "", category: "state" },
    // Marks used by class passives.
    { id: "spotted", name: "Spotted", img: "icons/svg/eye.svg", description: "<p>Spotted by a Sniper (Spotter).</p>", category: "state" },
    {
        id: "frostbite",
        name: "Frostbite",
        img: "icons/svg/ice-aura.svg",
        description: "<p>A Cryomancer's ice damage can consume each stack for +50% damage. Not a condition.</p>",
        category: "state",
    },
    { id: "scarred", name: "Scar", img: "icons/svg/blood.svg", description: "<p>A Dark Duelist's dark spell can consume it to refresh their Major Action.</p>", category: "state" },
    {
        id: "oppression",
        name: "Oppression",
        img: "icons/svg/padlock.svg",
        description: "<p>A Controller's spells have 30% increased effectiveness per stack.</p>",
        category: "state",
    },
);
