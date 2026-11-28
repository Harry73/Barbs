/**
 * Support casters, controllers, alchemists, and spellblades. See ../catalog.ts.
 */
import {
    around,
    battlefield,
    cone,
    count,
    damageIncrease,
    elementChoice,
    line,
    onHit,
    onHitStatus,
    pick,
    psychic,
    spell,
    square,
    stat,
    statPercent,
    status,
    vulnerable,
    weaken,
    yesNo,
    action,
    spend,
} from "../helpers.ts";
import type { DamageType } from "../../config.ts";
import type { AbilityAutomation, ChangeSpec, EffectSpec } from "../types.ts";

const RITUAL = pick("ritual", "Casting", { normal: "Normal", minor: "Minor ritual (1 minute)", major: "Major ritual (10 minutes)" });

const RESOURCES = { stamina: "Stamina", mana: "Mana", health: "Health" } as const;
type Resource = keyof typeof RESOURCES;

/** Psion costs: "N of any resource", plus optional extra payments in resources not used yet. */
function psionCost(base: number, extra: number, ctx: { choices: Record<string, unknown> }) {
    const first = String(ctx.choices.resource) as Resource;
    const costs = [{ resource: first, amount: base }];
    if (ctx.choices.boost) {
        const second = String(ctx.choices.boostResource) as Resource;
        costs.push({ resource: second === first ? (first === "mana" ? "stamina" : "mana") : second, amount: extra });
    }
    return costs;
}

/** Mint Coinage's inscriptions: what holding the coin does, as stat changes where it has numbers. */
const COIN_FACES: Record<string, { label: string; text: string; changes?: ChangeSpec[] }> = {
    message: { label: "Telepathic message", text: "A telepathic message of up to 100 words or 10 images, heard/seen by anyone who picks the coin up." },
    access: { label: "Access point", text: "The Enchanter can telepathically communicate freely with whoever holds the coin." },
    tracker: { label: "Tracker", text: "The Enchanter always knows where the coin is, and if/when it changes owners." },
    storage: { label: "Storage (+1 buff and concentration limit)", text: "+1 Buff Limit and +1 Concentration Limit.", changes: [stat("buffLimit", 1), stat("concentrationLimit", 1)] },
    restorative: {
        label: "Restorative (+5% regeneration)",
        text: "+5% health, mana, and stamina regeneration.",
        changes: [stat("healthRegen", 5), stat("manaRegen", 5), stat("staminaRegen", 5)],
    },
    luck: { label: "Luck (+5 skill checks)", text: "+5 to all skill checks.", changes: [{ key: "system.skillBonus", value: 5 }] },
};
const COIN_FACES_CHOICES = Object.fromEntries(Object.entries(COIN_FACES).map(([key, face]) => [key, face.label]));

/** The effect on whoever holds a Mint Coinage coin: both faces' inscriptions in one effect. */
function mintedCoin(choices: Record<string, unknown>): EffectSpec {
    const faces = [String(choices.face), String(choices.back)]
        .filter((key, index, all) => key in COIN_FACES && all.indexOf(key) === index)
        .map((key) => COIN_FACES[key]);
    return {
        name: `Minted Coin (${faces.map((f) => f.label.replace(/ \(.*\)$/, "")).join(" / ")})`,
        img: "icons/commodities/currency/coin-embossed-star-gold.webp",
        // An enchanted item, not a buff: it doesn't count against Buff Limit, and Downed doesn't remove it.
        category: "",
        changes: faces.flatMap((f) => f.changes ?? []),
        description: faces.map((f) => `<p>${f.text}</p>`).join(""),
    };
}

/** Conditions for "+CR against a condition of your choice". */
const CONDITION_CHOICES: Record<string, string> = {
    slowed: "Slowed", crippled: "Crippled", immobilized: "Immobilized", prone: "Prone", stunned: "Stunned", frozen: "Frozen",
    confused: "Confused", fear: "Fear", charmed: "Charmed", taunted: "Taunted", blind: "Blinded", silenced: "Silenced",
    sleeping: "Sleeping", paralyzed: "Paralyzed", poisoned: "Poisoned", bleeding: "Bleeding", burned: "Burned", cursed: "Cursed",
};

export const SUPPORT: Record<string, AbilityAutomation> = {
    /* ---------- Abjurer ---------- */

    "Abjurer/Shield": {
        target: (ctx) => [
            {
                category: "buff",
                duration: "start of target's next turn",
                changes: [stat("ac", ctx.scale(10)), stat("magicResist", ctx.scale(10))],
            },
        ],
        notes: ["Block one attack on yourself or an ally in range."],
    },
    "Abjurer/Weak": {
        target: [
            weaken(20, {
                // 20% Weaken, or 10% if they're already weakened. Weakened doesn't stack; the new one replaces it.
                resolve: (target) => weaken(target.statuses.has("weakened") ? 10 : 20),
            }),
        ],
    },
    "Abjurer/Stoneskin": {
        choices: [RITUAL],
        target: (ctx) => [
            {
                category: "buff",
                duration: { normal: "1 minute", minor: "1 hour", major: "6 hours" }[String(ctx.choices.ritual)] ?? "1 minute",
                changes: [statPercent("ac", ctx.scale(30)), statPercent("magicResist", ctx.scale(30))],
            },
        ],
        notes: ["Up to 5 targets."],
    },

    /* ---------- Amplifier (augmentation alchemy) ---------- */

    "Amplifier/Improved Aggression": {
        target: (ctx) => [{ category: "buff", modifiers: [damageIncrease(ctx.scale(25), { rollType: "physical", damageType: "physical" })] }],
        notes: ["The target may spend 30 HP as a free action to give its next attack another +25% physical damage."],
    },
    "Amplifier/Enhanced Vigor": {
        target: (ctx) => [{ category: "buff", changes: [statPercent("health", ctx.scale(25))] }],
        notes: [
            "Current HP rises by the same amount (and falls when it ends): adjust by hand. The target may convert stamina/mana into HP as a free action.",
        ],
    },
    "Amplifier/Refined Agility": {
        target: (ctx) => [{ category: "buff", changes: [stat("speed", ctx.scale(20))] }],
        notes: ["The target may use a second Reaction in a round, losing its next turn's Minor action."],
    },

    /* ---------- Arcanist ---------- */

    "Arcanist/Magic Primer": {
        self: (ctx) => [
            {
                category: "buff",
                singleUse: true,
                modifiers: [
                    damageIncrease(ctx.scale(30), { rollType: "magic" }),
                    { type: "canCrit", rollType: "magic", value: 1 },
                ],
            },
        ],
        notes: ["Applies to your next spell attack."],
    },
    "Arcanist/Magic Bomb": {
        choices: [elementChoice(), pick("shape", "Shape", { cube: "25 ft cube", cross: "45 ft cross" })],
        area: (ctx) => (ctx.choices.shape === "cross" ? null : square(25)),
        attack: (ctx) => spell("4d12", ctx.choices.element as DamageType),
        notes: (ctx) => (ctx.choices.shape === "cross" ? ["Cross shapes aren't placeable yet: target the tokens in the cross yourself."] : []),
    },
    "Arcanist/Magic Dart": {
        choices: [elementChoice()],
        attack: (ctx) => spell("1d12", ctx.choices.element as DamageType, { hits: 3 }),
        notes: [
            "Three darts. Divide them among up to 3 enemies: Apply applies all 3 to each target, so split them by hand. Each dart may be a different element (pick one here).",
        ],
    },
    "Arcanist/Magic Ray": {
        choices: [elementChoice()],
        area: cone(70),
        attack: (ctx) => spell("4d12", ctx.choices.element as DamageType),
        target: [{ name: "Magic Ray (10% magic vulnerability)", category: "condition", changes: [vulnerable("magic", 10)] }],
    },
    "Arcanist/Magic Sear": {
        choices: [elementChoice()],
        attack: (ctx) => spell("3d12", ctx.choices.element as DamageType),
        target: (ctx) => [
            {
                name: "Magic Sear",
                category: "condition",
                dot: { formula: "1d12", type: ctx.choices.element as DamageType },
            },
        ],
    },

    /* ---------- Archaeomancer ---------- */

    "Archaeomancer/Skill Boost": {
        choices: [pick("mode", "Choose", { group: "Up to 5 targets: +20 to all skill checks", single: "One target: +40 to all skill checks" })],
        target: (ctx) => [{ category: "buff", changes: [{ key: "system.skillBonus", value: ctx.scale(ctx.choices.mode === "single" ? 40 : 20) }] }],
    },

    /* ---------- Arcanist (counterspell) ---------- */

    "Arcanist/Force Spike": {
        choices: [count("mana", "Mana spent on the countered spell")],
        // TODO: double-check with the rulebook author that "loses health" ignores AC/MR.
        attack: (ctx) => ({ rollType: "magic", damage: [{ formula: String(Number(ctx.choices.mana) || 0), type: "dark" }], scaling: "none", trueDamage: true }),
        notes: ["Counter the triggering spell; its caster loses that much health (apply to them)."],
    },

    /* ---------- Conjurer ---------- */

    "Conjurer/Web": {
        choices: [pick("mode", "Choose", { attach: "Attach a target to a surface", immobilize: "Immobilize a target" })],
        target: (ctx) =>
            ctx.choices.mode === "immobilize"
                ? [status("immobilized", { duration: "end of target's next turn" })]
                : [{ name: "Web (attached)", category: "buff", duration: "start of your next turn", description: "<p>Can't fall or be pushed further from the surface.</p>" }],
    },
    "Conjurer/Fog": {
        // Enemies are Blinded while they're in the fog; you and your allies see through it.
        area: {
            ...square(35, "enemies"),
            zone: {
                events: ["tokenEnter", "tokenExit", "tokenTurnStart"],
                effect: status("blind", { name: "Fog", duration: "Endless", resistible: false }),
                whileInside: true,
                duration: "end of your next turn",
            },
        },
        notes: ["If it would end, you may recast it as a free reaction."],
    },

    /* ---------- Controller ---------- */

    "Controller/Mass Slow": {
        choices: [count("extra", "Extra 15-mana steps (+4 targets each)")],
        cost: (ctx) => ({ resource: "mana", amount: 25 + 15 * Number(ctx.choices.extra) }),
        target: [status("slowed", { duration: "1 minute" })],
        notes: (ctx) => [`Up to ${4 + 4 * Number(ctx.choices.extra)} targets. Concentration.`],
    },
    "Controller/Hold Person": {
        target: [status("stunned", { duration: "end of your next turn" })],
        // "You may recast this spell while concentrating on it for 10 mana; the duration is extended for an additional
        // round." The Stun is held by the concentration, so extending this extends it.
        self: (ctx) =>
            ctx.choices.concentrate
                ? [
                      {
                          key: "holding",
                          name: "Hold Person (concentrating)",
                          category: "",
                          triggers: action("Recast to extend", "major", [spend(10, "mana"), { action: "extend", value: 1 }]),
                      },
                  ]
                : [],
    },
    "Controller/Baneful Curse": {
        choices: [RITUAL],
        target: (ctx) => [
            {
                name: "Baneful Curse",
                category: "condition",
                duration: { normal: "1 hour", minor: "6 hours", major: "24 hours" }[String(ctx.choices.ritual)] ?? "1 hour",
                changes: [{ key: "system.skillBonus", value: -20 }],
            },
        ],
    },

    /* ---------- Daggerspell (spells) ---------- */

    "Daggerspell/Calling Card": {
        choices: [elementChoice()],
        attack: (ctx) => spell("5d8", ctx.choices.element as DamageType),
        notes: ["Dash up to 20 ft toward the target. Triggers Ritual Dagger for twice as much empowerment damage."],
    },
    "Daggerspell/Witchbolt": {
        choices: [elementChoice(), yesNo("free", "Recast while concentrating (no mana)")],
        cost: (ctx) => (ctx.choices.free ? null : { resource: "mana", amount: 30 }),
        attack: (ctx) => spell("6d8", ctx.choices.element as DamageType),
        notes: ["Concentration. Counts as 30 mana spent for Ritual Dagger either way."],
    },
    "Daggerspell/Invisibility": {
        choices: [pick("mode", "Choose", { minute: "Invisible for 1 minute", hour: "Invisible for 1 hour, until they attack or cast" }), count("extra", "Extra targets (+20 mana each)")],
        cost: (ctx) => ({ resource: "mana", amount: 40 + 20 * Number(ctx.choices.extra) }),
        target: (ctx) => [status("invisible", { duration: ctx.choices.mode === "hour" ? "1 hour" : "1 minute" })],
    },
    "Daggerspell/Exposing Tear": {
        choices: [elementChoice()],
        attack: (ctx) => spell("8d8", ctx.choices.element as DamageType),
        target: [
            {
                name: "Exposing Tear",
                category: "condition",
                description: "<p>Attacks against this target have +10% crit chance; attacks with an empowered weapon also have +100% crit damage.</p>",
            },
        ],
    },
    "Daggerspell/Absorption Well": {
        choices: [elementChoice()],
        area: square(25),
        attack: (ctx) => spell("12d8", ctx.choices.element as DamageType),
        notes: ["Leaves a field for 30 seconds where spells cast by others count toward Ritual Dagger."],
    },

    /* ---------- Dancer ---------- */

    "Dancer/Foxtrot": {
        choices: [yesNo("combo", "Last Move Action included a Step 2 dance (-10 stamina)")],
        cost: (ctx) => ({ resource: "stamina", amount: ctx.choices.combo ? 0 : 10 }),
        self: (ctx) => [{ category: "buff", maxStacks: 4, changes: [stat("evasion", ctx.scale(10)), stat("magicResist", ctx.scale(10))] }],
    },
    "Dancer/Belly Dance": {
        choices: [yesNo("combo", "Last Move Action included a Step 3 dance (-10 stamina)")],
        cost: (ctx) => ({ resource: "stamina", amount: ctx.choices.combo ? 0 : 10 }),
        target: [weaken(10, { name: "Belly Dance (10% Weaken)", statuses: [], maxStacks: 4, duration: "1 minute" })],
    },
    "Dancer/Moonwalk": {
        choices: [yesNo("combo", "Last Move Action included a Step 3 dance (-15 stamina)")],
        cost: (ctx) => ({ resource: "stamina", amount: ctx.choices.combo ? 0 : 15 }),
        self: (ctx) => [{ category: "buff", maxStacks: 4, changes: [stat("speed", ctx.scale(10))] }],
    },
    "Dancer/Waltz": {
        choices: [yesNo("combo", "Last Move Action included a Step 2 dance (-15 stamina)")],
        cost: (ctx) => ({ resource: "stamina", amount: ctx.choices.combo ? 0 : 15 }),
        heal: { formula: "3d10" },
        target: [{ name: "Waltz", category: "buff", cleanse: ["poisoned", "bleeding", "burned"] }],
    },
    "Dancer/Ballet": {
        cost: (ctx) => ({ resource: "stamina", amount: ctx.choices.combo ? 0 : 20 }),
        // +10% CR, and another +10% against one condition of your choice.
        choices: [yesNo("combo", "Last Move Action included a Step 1 dance (-20 stamina)"), pick("condition", "Extra CR against", CONDITION_CHOICES)],
        self: (ctx) => [
            {
                category: "buff",
                maxStacks: 2,
                changes: [stat("conditionResist", ctx.scale(10)), { key: `system.conditionResistBonus.${String(ctx.choices.condition)}`, value: ctx.scale(10) }],
            },
        ],
    },
    "Dancer/Jive": {
        choices: [yesNo("combo", "Last Move Action included a Step 2 dance (-20 stamina)")],
        cost: (ctx) => ({ resource: "stamina", amount: ctx.choices.combo ? 0 : 20 }),
        target: [status("confused")],
        notes: ["While Confused this way, you may choose a direction that becomes 3 times as likely when they move or attack."],
    },

    /* ---------- Dragoncaller ---------- */

    "Dragoncaller/Bronze Dragon Breath": {
        area: line(200),
        attack: spell("6d12", "lightning"),
        notes: ["All Bronze Dragons you control use their reactions to breathe in directions of your choice."],
    },
    "Dragoncaller/Silver Dragon Breath": {
        area: cone(80),
        attack: spell("10d8", "ice"),
        notes: ["All Silver Dragons you control use their reactions to breathe in directions of your choice."],
    },
    "Dragoncaller/Gold Dragon Breath": {
        area: square(45),
        attack: spell("8d12", "fire"),
        notes: ["All Gold Dragons you control use their reactions to breathe on locations of your choice."],
    },
    "Dragoncaller/Dragonfear": {
        choices: [count("dragons", "Dragons you control (+20% Weaken each)")],
        area: battlefield(),
        target: (ctx) => [status("fear", { duration: "1 minute" }), weaken(20 + 20 * Number(ctx.choices.dragons), { duration: "1 minute" })],
    },
    "Dragoncaller/Dragonflight": {
        choices: [count("dragons", "Dragons you control (+1 target each)")],
        target: [{ category: "buff", description: "<p>All Move Speed becomes flying Move Speed.</p>" }],
        notes: (ctx) => [`Up to ${1 + Number(ctx.choices.dragons)} allies. Each cleanses a condition of their choice.`],
    },
    "Dragoncaller/Dragonsight": {
        choices: [
            pick("bonus", "Bonus", { accuracy: "+50% Accuracy", armor: "+50% Armor Penetration", magic: "+50% Magic Penetration" }),
            count("dragons", "Dragons you control (+1 target each)"),
        ],
        target: (ctx) => [
            {
                category: "buff",
                modifiers:
                    ctx.choices.bonus === "armor"
                        ? [{ type: "penetration", rollType: "physical", damageType: "physical", value: ctx.scale(50) }]
                        : ctx.choices.bonus === "magic"
                          ? [{ type: "penetration", rollType: "all", damageType: "allMagic", value: ctx.scale(50) }]
                          : [],
                description: `<p>True sight${ctx.choices.bonus === "accuracy" ? " and +50% Accuracy" : ""}.</p>`,
            },
        ],
        notes: (ctx) => [`Up to ${1 + Number(ctx.choices.dragons)} allies.`],
    },
    "Dragoncaller/Dragonform": {
        choices: [pick("color", "Dragon", { bronze: "Bronze", silver: "Silver", gold: "Gold" })],
        self: (ctx) => [
            {
                name: `Dragonform (${String(ctx.choices.color)})`,
                category: "",
                changes: [stat("health", 300), stat("ac", 30), stat("magicResist", 30), stat("evasion", 30), stat("conditionResist", 30)],
                description: "<p>Large size, 60 ft flying speed, and the chosen dragon's abilities. Can't cast weapon abilities.</p>",
            },
        ],
        notes: ["Your current health also rises by 300; the transformation ends when that extra health is gone (not automated)."],
    },

    /* ---------- Enchanter ---------- */

    "Enchanter/Mint Coinage": {
        choices: [
            pick("holder", "Who holds the coin", { self: "You", target: "Targeted creature" }),
            pick("face", "Inscription", COIN_FACES_CHOICES),
            pick("back", "Opposite face (+5 mana)", { none: "Nothing", ...COIN_FACES_CHOICES }),
        ],
        cost: (ctx) => ({ resource: "mana", amount: ctx.choices.back === "none" || ctx.choices.back === ctx.choices.face ? 10 : 15 }),
        self: (ctx) => (ctx.choices.holder === "target" ? [] : [mintedCoin(ctx.choices)]),
        target: (ctx) => (ctx.choices.holder === "target" ? [mintedCoin(ctx.choices)] : []),
        notes: (ctx) => [
            ctx.choices.holder === "target" ? "The coin's effect goes on whoever you apply it to: they're holding it." : "You're holding the coin.",
            "A creature only benefits from one Mint Coinage coin at a time: a new coin replaces the old one. If the coin changes hands, delete the effect and apply it to the new holder.",
        ],
    },
    "Enchanter/Modify Weapon": {
        choices: [pick("mode", "Choose", { strengthen: "On hit: 4d10 physical", weaken: "-50% physical damage while equipped" })],
        target: (ctx) =>
            ctx.choices.mode === "weaken"
                ? [{ name: "Modify Weapon (weakened)", category: "condition", modifiers: [damageIncrease(-50, { rollType: "physical", damageType: "physical" })] }]
                : [{ name: "Modify Weapon", category: "buff", modifiers: [onHit("4d10", "physical")] }],
        notes: ["Concentration. Applied to the wielder rather than the weapon itself."],
    },
    "Enchanter/Alter Jewelry": {
        choices: [
            pick("mode", "Choose", {
                ringHit: "Ring: on hit 2d20 magic of a chosen type",
                ringDrain: "Ring: lose 40 mana and stamina each turn",
                necklaceHeal: "Necklace: heal 30 each turn",
                necklaceHurt: "Necklace: lose 30 health each turn",
            }),
            elementChoice(),
        ],
        target: (ctx) => {
            switch (ctx.choices.mode) {
                case "ringHit":
                    return [{ name: "Alter Jewelry (ring)", category: "buff", modifiers: [onHit("2d20", String(ctx.choices.element))] }];
                case "necklaceHurt":
                    return [{ name: "Alter Jewelry (necklace)", category: "condition", dot: { formula: "30", type: "psychic" } }];
                case "necklaceHeal":
                    return [
                        {
                            name: "Alter Jewelry (necklace)",
                            category: "buff",
                            triggers: [{ event: "turnStart", action: "restore", type: "health", value: 30 }],
                            description: "<p>Heal 30 health at the start of each turn.</p>",
                        },
                    ];
                default:
                    return [{ name: "Alter Jewelry (ring)", category: "condition", description: "<p>Lose 40 mana and stamina at the start of each turn.</p>" }];
            }
        },
        notes: ["Concentration. Belt options (elemental resistance/weakness) and extra accessories aren't automated; pay the extra mana by hand."],
    },

    /* ---------- Evangelist ---------- */

    "Evangelist/Krystalline Basileia": {
        choices: [
            pick("mode", "Choose", { effects: "Two effects", ice: "+4d8 ice instead", dark: "+3d10 dark instead" }),
            pick("first", "First effect", { frozen: "Frozen", slowed: "Slowed", blind: "Blinded", curses: "2 curses" }),
            pick("second", "Second effect", { slowed: "Slowed", frozen: "Frozen", blind: "Blinded", curses: "2 curses" }),
        ],
        area: square(65),
        attack: (ctx) => ({
            rollType: "magic",
            damage: [
                { formula: ctx.choices.mode === "ice" ? "6d8 + 4d8" : "6d8", type: "ice" },
                { formula: ctx.choices.mode === "dark" ? "5d10 + 3d10" : "5d10", type: "dark" },
            ],
        }),
        target: (ctx) => {
            if (ctx.choices.mode !== "effects") return [];
            const picked = [...new Set([String(ctx.choices.first), String(ctx.choices.second)])];
            return picked.flatMap((p) => (p === "curses" ? [status("cursed"), status("cursed")] : [status(p, { duration: "1 minute" })]));
        },
        notes: ["Released from Magia Erebea after 2+ turns absorbed: pick 3 effects, or +6d8 ice / +5d10 dark (not automated)."],
    },

    "Evangelist/Iaculatio Orcus": {
        choices: [yesNo("released", "Released from Magia Erebea after 2+ turns (doubled ranges)")],
        area: (ctx) => cone(ctx.choices.released ? 120 : 60),
        attack: (ctx) => {
            const k = ctx.choices.released ? 2 : 1;
            const band = (within: number, ice: string, dark: string) => ({
                within: within * k,
                damage: [
                    { formula: ice, type: "ice" as const },
                    { formula: dark, type: "dark" as const },
                ],
            });
            return {
                rollType: "magic",
                damage: [],
                tiers: [band(10, "4d8", "12d10"), band(20, "6d8", "10d10"), band(40, "8d8", "8d10"), band(50, "10d8", "6d10"), band(60, "12d8", "4d10")],
            };
        },
        target: (ctx) => {
            const k = ctx.choices.released ? 2 : 1;
            return [
                weaken(30, { beyond: 10 * k, within: 20 * k }),
                status("slowed", { beyond: 40 * k, within: 50 * k }),
                status("frozen", { beyond: 50 * k, within: 60 * k }),
            ];
        },
        notes: (ctx) => [`Targets within ${ctx.choices.released ? 20 : 10} ft: the attack has 30% Lethality.`],
    },

    /* ---------- Psion ---------- */

    "Psion/Befuddle": {
        choices: [
            pick("resource", "Pay with", RESOURCES),
            yesNo("boost", "Spend 15 of another resource to Stun instead"),
            pick("boostResource", "Extra resource", RESOURCES),
        ],
        cost: (ctx) => psionCost(15, 15, ctx),
        target: (ctx) => [status(ctx.choices.boost ? "stunned" : "confused", { duration: "end of target's next turn" })],
    },
    "Psion/Psyshock": {
        choices: [
            pick("resource", "Pay with", RESOURCES),
            yesNo("boost", "Spend 10 of another resource (+100% damage, +20 Offensive Psionics)"),
            pick("boostResource", "Extra resource", RESOURCES),
        ],
        cost: (ctx) => psionCost(10, 10, ctx),
        attack: (ctx) => psychic("4d10", { increase: ctx.choices.boost ? 100 : 0 }),
    },
    "Psion/Brain Barrier": {
        choices: [
            pick("resource", "Pay with", RESOURCES),
            yesNo("boost", "Spend 30 of another resource (+1 ally, 40% psychic GDR)"),
            pick("boostResource", "Extra resource", RESOURCES),
        ],
        cost: (ctx) => psionCost(30, 30, ctx),
        target: (ctx) => [
            {
                name: "Brain Barrier",
                category: "buff",
                // +50% to whichever defense matches the target's highest defensive attribute.
                resolve: (target, spec) => {
                    const attrs = (target.system as { derived?: { attributes: Record<string, { total: number }> } }).derived?.attributes;
                    const options = [
                        ["tgh", "ac"],
                        ["ref", "evasion"],
                        ["res", "magicResist"],
                        ["frt", "conditionResist"],
                    ] as const;
                    const [, best] = options.reduce((a, b) => ((attrs?.[b[0]]?.total ?? -99) > (attrs?.[a[0]]?.total ?? -99) ? b : a));
                    return { ...spec, name: `Brain Barrier (${best})`, changes: [statPercent(best, ctx.scale(50))] };
                },
                modifiers: [{ type: "incomingDamage", damageType: "psychic", value: ctx.choices.boost ? -40 : -20 }],
                description: `<p>${ctx.choices.boost ? 40 : 20}% general damage reduction against psychic damage.</p>`,
            },
        ],
        notes: (ctx) => [`Up to ${ctx.choices.boost ? 2 : 1} allies. Paying the third resource too adds a third ally and 60% psychic GDR.`],
    },
    "Psion/Insinuate": {
        choices: [
            pick("resource", "Pay with", RESOURCES),
            yesNo("boost", "Spend 30 of another resource (up to 10 targets, also Slowed)"),
            pick("boostResource", "Extra resource", RESOURCES),
        ],
        cost: (ctx) => psionCost(30, 30, ctx),
        target: (ctx) => [status("fear", { duration: "1 minute" }), ...(ctx.choices.boost ? [status("slowed", { duration: "1 minute" })] : [])],
        notes: (ctx) => [`Up to ${ctx.choices.boost ? 10 : 5} targets. (The 5-minute paranoia mode isn't automated.)`],
    },
    "Psion/Psywave": {
        choices: [
            pick("resource", "Pay with", RESOURCES),
            yesNo("boost", "Spend 20 of another resource (+100% damage, strip a random buff)"),
            pick("boostResource", "Extra resource", RESOURCES),
        ],
        cost: (ctx) => psionCost(20, 20, ctx),
        area: cone(50),
        attack: (ctx) => psychic("5d10", { increase: ctx.choices.boost ? 100 : 0 }),
        notes: (ctx) => (ctx.choices.boost ? ["Strip a random buff from every target."] : []),
    },

    /* ---------- Symbiote ---------- */

    "Symbiote/Strengthen Soul": {
        target: (ctx) => [{ category: "buff", modifiers: [damageIncrease(ctx.scale(50))] }],
        notes: ["The target may use their reaction to make an autoattack."],
    },
    "Symbiote/Strengthen Mind": {
        target: (ctx) => [{ category: "buff", changes: [{ key: "system.skillBonus", value: ctx.scale(30) }] }],
        notes: ["The target may consume 10 minutes of the duration to reroll a skill check."],
    },
    "Symbiote/Strengthen Body": {
        choices: [yesNo("reaction", "Cast as a reaction (+10 mana)")],
        cost: (ctx) => ({ resource: "mana", amount: ctx.choices.reaction ? 20 : 10 }),
        target: (ctx) => [{ category: "buff", changes: [statPercent("ac", ctx.scale(40)), statPercent("evasion", ctx.scale(40))] }],
    },
    "Symbiote/Empower Soul": {
        choices: [count("extra", "Extra mana (+2% per mana)")],
        cost: (ctx) => ({ resource: "mana", amount: 20 + Number(ctx.choices.extra) }),
        target: (ctx) => {
            const percent = ctx.scale(20 + 2 * Number(ctx.choices.extra));
            return [
                {
                    category: "buff",
                    modifiers: [{ type: "penetration", rollType: "all", damageType: "allMagic", value: percent }],
                    description: `<p>Attacks ignore ${percent}% MR and evasion (evasion isn't automated).</p>`,
                },
            ];
        },
    },
    "Symbiote/Empower Body": {
        choices: [elementChoice(), yesNo("reaction", "Cast as a reaction (+10 mana)")],
        cost: (ctx) => ({ resource: "mana", amount: ctx.choices.reaction ? 30 : 20 }),
        target: (ctx) => [
            {
                category: "buff",
                changes: [stat("magicResist", ctx.scale(20)), { key: `system.elementResist.${String(ctx.choices.element)}`, value: ctx.scale(20) }],
            },
        ],
    },
    "Symbiote/Bolster Soul": {
        target: (ctx) => [
            {
                category: "buff",
                modifiers: [
                    { type: "critChance", rollType: "all", value: ctx.scale(20) },
                    { type: "critDamage", rollType: "all", value: ctx.scale(100) },
                ],
            },
        ],
        notes: ["The ally may end it early as a free reaction to make the triggering attack a crit that can't be reacted to."],
    },
    "Symbiote/Bolster Speed": {
        target: (ctx) => [{ category: "buff", changes: [stat("speed", ctx.scale(30))] }],
        notes: ["The target may consume 10 seconds of the duration to dash 30 ft as a minor action or reaction."],
    },
    "Symbiote/Bolster Body": {
        cost: (ctx) => ({ resource: "mana", amount: ctx.choices.reaction ? 40 : 30 }),
        choices: [yesNo("reaction", "Cast as a reaction (+10 mana)"), pick("condition", "Extra CR against", CONDITION_CHOICES)],
        // +20% CR, and another +20% against one condition of your choice.
        target: (ctx) => [
            {
                category: "buff",
                changes: [stat("conditionResist", ctx.scale(20)), { key: `system.conditionResistBonus.${String(ctx.choices.condition)}`, value: ctx.scale(20) }],
            },
        ],
    },
    "Symbiote/Embolden Soul": {
        target: [{ category: "buff", description: "<p>Loses its Minor Action but gains an extra Major Action each turn. Makes a free attack when this ends.</p>" }],
        notes: ["Concentration."],
    },
    "Symbiote/Embolden Body": {
        target: [{ category: "buff", description: "<p>Loses its Minor Action but gains an extra Reaction each turn. Invulnerable until the end of the turn when this ends.</p>" }],
        notes: ["Concentration."],
    },

    /* ---------- Voidwalker ---------- */

    "Voidwalker/Veil of Darkness": {
        area: around(60, "allies"),
        target: [
            status("hidden", {
                name: "Veil of Darkness",
                modifiers: [onHitStatus("blind")],
                description: "<p>Hidden; ignores traps and difficult terrain; attacks inflict Blind on hit.</p>",
            }),
        ],
        notes: ["Allies in touch range also cleanse 1 condition of their choice."],
    },
    /* ---------- More buffs ---------- */

    "Dragoncaller/Dragonblood": {
        target: [
            {
                name: "Dragonblood",
                category: "buff",
                changes: [
                    ...["charmed", "confused", "fear", "taunted", "frozen", "petrified", "sleeping", "stunned", "paralyzed"].map((id) => ({
                        key: `system.conditionImmunity.${id}`,
                        value: 1,
                    })),
                    { key: "system.downedBonus", value: 100 },
                ],
                description:
                    "<p>Immune to Charm, Confusion, Fear, Taunt, and conditions that cause lost actions. Downed Health is 200. +30 to Interaction, Magic, and Observation checks. Protected from scrying. Can't be stripped and isn't lost when Downed.</p>",
            },
        ],
        notes: ["+30 to Interaction, Magic, and Observation checks isn't automated (add it to those rolls)."],
    },
    "Dancer/Tango": {
        choices: [
            pick("who", "Cleanse", { self: "Yourself", ally: "Targeted ally (and push them 5 ft)" }),
            pick("condition", "Condition", {
                slowed: "Slowed",
                crippled: "Crippled",
                immobilized: "Immobilized",
                prone: "Prone",
                stunned: "Stunned",
                frozen: "Frozen",
                confused: "Confused",
                fear: "Fear",
                charmed: "Charmed",
                taunted: "Taunted",
                bleeding: "Bleeding",
                burned: "Burned",
                poisoned: "Poisoned",
                paralyzed: "Paralyzed",
            }),
        ],
        self: (ctx) => (ctx.choices.who === "self" ? [{ name: "Tango", category: "", cleanse: [String(ctx.choices.condition)] }] : []),
        target: (ctx) => (ctx.choices.who === "ally" ? [{ name: "Tango", category: "", cleanse: [String(ctx.choices.condition)] }] : []),
        notes: ["Costs 10 less stamina if your last Move Action included a Step 1 dance ability."],
    },
};
