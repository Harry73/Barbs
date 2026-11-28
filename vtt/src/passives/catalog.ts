/**
 * Class passive automation, keyed "Class/Passive" as in rulebook/classes.json.
 *
 * Passives without an entry still appear on the sheet with their rulebook text; entries add tracked resources,
 * states, sheet actions, and hooks into rolls and ability use. Everything here runs inside functions, so importing
 * other system modules is safe despite the passive ↔ roll module cycle.
 */
import { CROWD_CONTROL, status, stat, vulnerable } from "../abilities/helpers.ts";
import { RANGED_WEAPONS } from "../config.ts";
import type { PassiveAutomation, PassiveHandle } from "./types.ts";

type Health = { value: number; max: number };
type Derived = { derived: { resources: Record<"health" | "stamina" | "mana", Health>; vulnerability: Record<string, number> } };

function resources(actor: Actor.Implementation) {
    return (actor.system as unknown as Derived).derived.resources;
}

function countBuffs(actor: Actor.Implementation): number {
    return [...actor.allApplicableEffects()].filter((e) => e.active && (e.system as unknown as { category?: string }).category === "buff").length;
}

function weaponCategory(weapon: Item.Implementation | null): string {
    return (weapon?.system as unknown as { weapon?: { category?: string } } | undefined)?.weapon?.category ?? "";
}

const RANGED = ["bow", "crossbow", "bullets", "lightThrowing", "heavyThrowing"];

async function runCard(actor: Actor.Implementation, title: string, automation: object) {
    const { useAutomation } = await import("../abilities/use.ts");
    await useAutomation(actor, title, automation);
}

async function spend(p: PassiveHandle, key: string, amount: number): Promise<boolean> {
    if (p.resource(key) < amount) {
        ui.notifications?.warn(`Not enough ${key} (have ${p.resource(key)}, need ${amount}).`);
        return false;
    }
    await p.item.update({ [`system.resources.${key}`]: p.resource(key) - amount } as never);
    return true;
}

export const PASSIVE_AUTOMATION: Record<string, PassiveAutomation> = {
    /* ---------- Monks: mastery raises dU and base combo chance ---------- */

    "Ki Monk/Kijong": {
        monkMastery: true,
        resources: [{ key: "ki", label: "Ki" }],
        notes: [
            "When you roll initiative, you may subtract from the roll to gain that much ki.",
            "After failing a combo roll, spend ki for +1 per ki to turn it into a success.",
        ],
    },
    "Martial Artist/Flurry Of Blows": {
        monkMastery: true,
        notes: ["Make an unarmed autoattack as a Minor Action, or as a free action after any combo roll."],
    },
    "Pinpoint Monk/Precision Pummeling": {
        monkMastery: true,
        notes: ["Before an unarmed attack, you may convert up to half your crit chance to combo chance, or vice versa."],
    },

    /* ---------- Resource-tracking passives ---------- */

    "Sniper/Spotter": {
        resources: [{ key: "spotting", label: "Spotting", max: 8 }],
        actions: [
            {
                key: "spot",
                label: "Spot target",
                icon: "fa-solid fa-eye",
                run: async (p) => {
                    const targets = [...(game.user?.targets ?? [])].map((t) => t.actor).filter((a): a is Actor.Implementation => !!a);
                    if (targets.length !== 1) return void ui.notifications?.warn("Target exactly one enemy to Spot.");
                    const { requestOnActor } = await import("../socket.ts");
                    const { buildEffectData } = await import("../abilities/effects.ts");
                    const data = buildEffectData(status("spotted", { resistible: false }), {
                        className: "Sniper",
                        abilityName: "Spotter",
                        img: "icons/svg/eye.svg",
                        duration: "Endless",
                        casterUuid: p.actor.uuid ?? undefined,
                    });
                    await requestOnActor(targets[0], "effect", { data, options: { sourceName: `${p.actor.name}'s Spotter` } });
                    ui.notifications?.info("Switching your Spotted target loses all Spotting; remove the old mark and reset if so.");
                },
            },
            {
                key: "track",
                label: "Track (+2)",
                icon: "fa-solid fa-binoculars",
                run: async (p) => void (await p.item.update({ "system.resources.spotting": Math.min(8, p.resource("spotting") + 2) } as never)),
            },
        ],
        // Longbow attacks on a Spotted target expend all Spotting for +25% damage per stack.
        rollHook: (builder, info, p) => {
            const stacks = p.resource("spotting");
            if (!stacks || info.rollType !== "physical" || weaponCategory(info.weapon) !== "bow") return;
            if (!info.targets.some((t) => t.statuses.has("spotted"))) return;
            builder.addMultiplier("physical", 25 * stacks).addNote(`Spotter: expended ${stacks} Spotting (+${25 * stacks}%).`);
            builder.queueResource("spotting", { set: 0 });
        },
        notes: ["Gain 1 Spotting whenever you take a Major action that doesn't deal damage or move (use +). Max 8. Lost when the Spotted target dies."],
    },
    "Demon Hunter/Evil's Bane": {
        resources: [{ key: "hunter", label: "Hunter stacks", gainOnTurnStart: 1, resetOn: ["combatEnd"] }],
        actions: [
            {
                key: "heal",
                label: "Heal 5d10 (1 stack)",
                icon: "fa-solid fa-heart",
                run: async (p) => {
                    if (await spend(p, "hunter", 1)) await runCard(p.actor, "Evil's Bane: Heal", { heal: { formula: "5d10", self: true } });
                },
            },
            {
                key: "other",
                label: "Spend 1 stack",
                icon: "fa-solid fa-bolt",
                run: async (p) => {
                    if (await spend(p, "hunter", 1)) {
                        await runCard(p.actor, "Evil's Bane", {
                            notes: ["Spent a Hunter stack: gain a reaction, cleanse a condition, or ignore enemy fields until your next turn."],
                        });
                    }
                },
            },
        ],
        notes: ["Also gain a stack once per round when you deal 100 damage in a round (use +)."],
    },
    "Sentinel/Perfect Shield": {
        resources: [{ key: "shield", label: "Shield stacks" }],
        notes: [
            "Gain a stack when you block outside Shield stance (use +). At the end of your turn, expend all for that many special reactions and enter Shield stance.",
        ],
    },
    "Aeromancer/Winds of War": {
        resources: [{ key: "winds", label: "Winds of War" }],
        abilityChoices: (info) =>
            info.tags.includes("air")
                ? [{ key: "passive.winds", label: "Consume Winds of War (+5% air damage each)", type: "number", default: 0, min: 0, resource: "winds" }]
                : [],
        rollHook: (builder, info) => {
            const n = Number(info.choices["passive.winds"]) || 0;
            if (n) builder.addMultiplier("air", 5 * n);
        },
        notes: ["Gain a stack per 5 ft moved with a Move Action or dash (use +)."],
    },
    "Air Duelist/Whirlwind Quiver": {
        resources: [{ key: "arrows", label: "Whirlwind Arrows", max: 2, resetOn: ["combatEnd"] }],
        afterUse: async (info, p) => {
            if (!info.tags.includes("spell") || !info.result?.totals.air) return;
            const { adjustResource } = await import("./index.ts");
            const delta = await adjustResource(p.actor, "arrows", 1);
            return delta ? [delta] : [];
        },
        notes: ["Once per turn, air spell damage grants an arrow. Bow attacks with one are a free action."],
    },
    "Luxomancer/Guiding Light": {
        resources: [{ key: "healingMana", label: "Healing Mana", resetOn: ["combatEnd"] }],
        afterUse: async (info, p) => {
            if (!info.tags.includes("attack") || !info.manaPaid) return;
            // Lightbolt banks 100% of its cost; every other attack spell banks half.
            const banked = info.abilityName === "Lightbolt" ? info.manaPaid : Math.floor(info.manaPaid / 2);
            const { adjustResource } = await import("./index.ts");
            const delta = await adjustResource(p.actor, "healingMana", banked);
            return delta ? [delta] : [];
        },
        notes: ["Healing Mana can only be spent on Restoration spells, and dumps at the end of combat."],
    },
    "Dynamancer/Volatile Energy": {
        resources: [{ key: "energy", label: "Energy" }],
        afterUse: async (info, p) => {
            if (!info.tags.includes("spell") || !info.result) return;
            let gain = info.result.totals.lightning ? 1 : 0;
            // Rolling under the spell's average damage also grants a stack.
            const dice = info.result.parts.flatMap((part) => part.roll.dice);
            const average = dice.reduce((sum, d) => sum + d.number! * ((d.faces ?? 0) + 1) / 2, 0);
            const rolled = dice.reduce((sum, d) => sum + d.total!, 0);
            if (dice.length && rolled < average) gain++;
            if (!gain) return;
            const { adjustResource } = await import("./index.ts");
            const delta = await adjustResource(p.actor, "energy", gain);
            return delta ? [delta] : [];
        },
        notes: ["Spend 1 Energy when casting a spell to reroll damage dice and/or random effects (once per spell)."],
    },
    "Lightning Duelist/Battle Current": {
        resources: [{ key: "current", label: "Battle Current", max: 1 }],
        afterUse: async (info) => {
            if (!info.tags.includes("spell") || !info.result?.totals.lightning) return;
            const { setResource } = await import("./index.ts");
            const delta = await setResource(info.actor, "current", 1);
            return delta ? [delta] : [];
        },
        rollHook: (builder, info, p) => {
            if (!p.resource("current") || info.rollType !== "physical" || weaponCategory(info.weapon) !== "fine") return;
            builder.addNote("Battle Current: this rapier attack happens a second time at no cost (new targets allowed).");
            builder.queueResource("current", { set: 0 });
        },
    },
    "Reaper/Ferryman of the Dead": {
        resources: [{ key: "souls", label: "Souls" }],
        notes: ["Souls are left where enemies die from your scythe or condition spells; picking one up heals 20% max health. Track the ones you hold here."],
    },
    "Dragoncaller/Draconic Pact": {
        resources: [{ key: "pacts", label: "Draconic Pacts" }],
        notes: ["Your summoned creatures permanently gain +100% increased damage per pact."],
    },

    /* ---------- States ---------- */

    "Thief/Hit and Run": {
        states: [{ key: "stance", label: "Stance", options: { none: "None", hit: "Hit Stance", run: "Run Stance" }, default: "none" }],
        stateEffects: (state) =>
            state.stance === "run"
                ? [{ name: "Run Stance", category: "", changes: [stat("speed", 20)], description: "<p>+20 move speed; movement doesn't provoke or trigger traps.</p>" }]
                : state.stance === "hit"
                  ? [{ name: "Hit Stance", category: "", modifiers: [{ type: "note", rollType: "physical", value: "On Hit: drain 10 health" }] }]
                  : [],
        notes: ["Entering Hit Stance drains 20 stamina from a target in melee range. Entering Run Stance makes you Hidden and lets you dash 15 ft."],
    },
    "Aquamancer/Turning Tides": {
        states: [{ key: "tide", label: "Tide", options: { flood: "Flood Tide", ebb: "Ebb Tide" }, default: "flood" }],
        rollHook: (builder, info, p) => {
            if (!info.tags.includes("water")) return;
            const tide = p.state("tide");
            if (tide === "flood" && info.rollType === "magic") builder.addMultiplier("all", 50);
            if (tide === "ebb" && info.rollType === "healing") builder.addMultiplier("healing", 50);
        },
        onTurnStart: async (p) => {
            await p.item.update({ "system.state.tide": p.state("tide") === "flood" ? "ebb" : "flood" } as never);
        },
        notes: [
            "Flood Tide: water damage spells +50%, forced movement +20 ft. Ebb Tide: water healing +50%, your buffs grant +20% MR.",
            "Swaps automatically at the start of each of your turns.",
        ],
    },
    "Vastwood Knight/Vastwood Sovereignty": {
        states: [{ key: "active", label: "Sovereignty", options: { false: "Inactive", true: "Active" }, default: "false" }],
        rollHook: (builder, _info, p) => {
            if (p.state("active") === "true") builder.upgradeDice().addNote("Vastwood Sovereignty: damage dice upgraded one size.");
        },
        notes: ["While active: reroll any dice once taking the better; negative skill modifiers ignored and positive ones +50%."],
    },
    "Rifleman/Silver Bullet": {
        states: [
            {
                key: "property",
                label: "Silver bullet property",
                options: { none: "None", ac: "Ignores AC", mr: "Ignores MR", miss: "Can't miss", die: "Extra damage die" },
                default: "none",
            },
        ],
        notes: ["Choose a chambered bullet at the start of your turn; it becomes a silver bullet with the chosen property."],
    },

    /* ---------- Roll hooks ---------- */

    "Warrior/Warleader": {
        rollHook: (builder, info) => {
            const buffs = countBuffs(info.actor);
            if (buffs && info.rollType === "physical") builder.addMultiplier("physical", 25 * buffs);
        },
        notes: ["End a buff as a free action on your turn to give an ally's next attack +25% damage."],
    },
    "Assassin/Assassinate": {
        rollHook: (builder, info) => {
            if (weaponCategory(info.weapon) !== "shortblade") return;
            const target = info.targets[0];
            if (!target) return;
            const { value, max } = resources(target).health;
            if (value >= max) builder.addMultiplier("all", 100).addNote("Assassinate: uninjured target, double damage.");
        },
    },
    "Warper/Opportunistic Predator": {
        rollHook: (builder, info) => {
            if (info.targets.some((t) => [...t.statuses].some((s) => CROWD_CONTROL.includes(s)))) {
                builder.addCritChance(50).addNote("Opportunistic Predator: +50% crit chance (once per round).");
            }
        },
    },
    "Psion/Stress Headache": {
        actions: [
            {
                key: "autoattack",
                label: "Psionic autoattack (2d10)",
                icon: "fa-solid fa-brain",
                run: async (p) => runCard(p.actor, "Psionic autoattack", { attack: { rollType: "psychic", damage: [{ formula: "2d10", type: "psychic" }], scaling: "none" } }),
            },
        ],
        rollHook: (builder, info) => {
            if (!builder.damageTypes.includes("psychic")) return;
            const r = resources(info.actor);
            const max = r.health.max + r.stamina.max + r.mana.max;
            const missing = max ? (100 * (max - r.health.value - r.stamina.value - r.mana.value)) / max : 0;
            if (missing > 0) builder.addMultiplier("psychic", Math.round(3 * missing));
        },
    },
    "Juggernaut/What Doesn't Kill You": {
        abilityChoices: (info) =>
            info.tags.includes("attack") ? [{ key: "passive.payHealth", label: "Pay the stamina cost with health", type: "checkbox", default: false }] : [],
        adjustCost: (costs, choices) =>
            choices["passive.payHealth"] ? costs.map((c) => (c.resource === "stamina" ? { ...c, resource: "health" } : c)) : costs,
        rollHook: (builder, info) => {
            if (!info.choices["passive.payHealth"]) return;
            const { value, max } = resources(info.actor).health;
            const missing = Math.round(100 * (1 - value / Math.max(1, max)));
            if (missing > 0) builder.addMultiplier("physical", missing);
        },
    },
    "Destroyer/Aggravated Assault": {
        rollHook: (builder, info) => {
            const melee = info.rollType === "physical" && !RANGED.includes(weaponCategory(info.weapon));
            if (melee && info.inflictsCC) builder.addPenetration("physical", 20).addNote("Aggravated Assault: ignores 20% AC and CR.");
        },
    },
    "Dark Duelist/Scars of Darkness": {
        rollHook: (builder, info) => {
            if (info.rollType === "physical" && weaponCategory(info.weapon) === "longblade") builder.addStatus("scarred", "Scars of Darkness");
            if (info.rollType === "magic" && builder.damageTypes.includes("dark") && info.targets.some((t) => t.statuses.has("scarred"))) {
                builder.addNote("Scars of Darkness: dark spell on a Scarred target consumes the Scar and refreshes your Major Action.");
            }
        },
    },
    "Daggerspell/Ritual Dagger": {
        afterUse: async (info, p) => {
            if (!info.tags.includes("spell")) return;
            // Calling Card counts double; Witchbolt's free recasts count as 30 mana.
            let mana = info.abilityName === "Witchbolt" && !info.manaPaid ? 30 : info.manaPaid;
            if (info.abilityName === "Calling Card") mana *= 2;
            const damage = Math.floor(mana / 2);
            if (!damage) return;
            const { applyEffectToActor } = await import("../effects/apply.ts");
            const { buildEffectData } = await import("../abilities/effects.ts");
            await applyEffectToActor(
                p.actor,
                buildEffectData(
                    {
                        name: `Ritual Dagger (+${damage})`,
                        category: "",
                        singleUse: true,
                        modifiers: [{ type: "damage", rollType: "physical", damageType: "physical", weapon: "shortblade", value: damage }],
                    },
                    { className: "Daggerspell", abilityName: "Ritual Dagger", img: "icons/svg/sword.svg", duration: "Endless" },
                ),
                { announce: false },
            );
        },
        notes: ["Spells empower your next shortblade attack with on-hit physical damage equal to half the mana spent."],
    },

    /* ---------- Extra effects on ability cards ---------- */

    "Pyromancer/Reduce To Ashes": {
        extraTargets: (info) =>
            info.tags.includes("spell") && info.damageTypes.includes("fire")
                ? [
                      {
                          name: "Reduce To Ashes",
                          category: "condition",
                          resistible: false,
                          maxStacks: Infinity,
                          changes: [{ key: "system.elementResist.fire", value: -5 }, vulnerable("fire", 5)],
                      },
                  ]
                : [],
        notes: ["Burn damage ticks also apply a stack (not automated)."],
    },
    "Controller/Internalized Oppression": {
        extraTargets: (info) => (info.tags.includes("control") ? [status("oppression", { resistible: false })] : []),
        notes: ["Your spells against targets with Oppression have 30% increased effectiveness per stack (not automated)."],
    },
    "Cryomancer/Frostbite": {
        abilityChoices: (info) =>
            info.tags.includes("ice") ? [{ key: "passive.frostbite", label: "Consume Frostbite on your target (+50% ice each)", type: "checkbox", default: false }] : [],
        rollHook: (builder, info) => {
            if (!info.choices["passive.frostbite"] || !info.targets[0]) return;
            const stacks = info.targets[0].effects.filter((e) => e.statuses.has("frostbite")).length;
            if (stacks) builder.addMultiplier("ice", 50 * stacks).addNote(`Frostbite: consumed ${stacks} stack(s).`);
        },
        afterUse: async (info) => {
            if (!info.choices["passive.frostbite"] || !info.targets[0]) return;
            const { requestOnActor } = await import("../socket.ts");
            await requestOnActor(info.targets[0], "cleanse", { statuses: ["frostbite"] });
        },
        notes: ["Enemies gain a Frostbite stack each round they're under a condition from your spells (automatic at their turn start)."],
    },
    "Warlord/Calculated Aggression": {
        resources: [
            { key: "ranged", label: "Next ranged attack empowered", max: 1, resetOn: ["combatEnd"] },
            { key: "melee", label: "Next melee attack empowered", max: 1, resetOn: ["combatEnd"] },
        ],
        // Physical weapon damage of one kind empowers the next attack of the other kind (+50% physical).
        rollHook: (builder, info, p) => {
            const category = weaponCategory(info.weapon);
            if (info.rollType !== "physical" || !category) return;
            const ranged = RANGED_WEAPONS.includes(category);
            const spend = ranged ? "ranged" : "melee";
            const earn = ranged ? "melee" : "ranged";
            if (p.resource(spend)) {
                builder.addMultiplier("physical", 50);
                builder.queueResource(spend, { set: 0 });
            }
            if (!p.resource(earn)) {
                builder.queueResource(earn, { set: 1 });
                builder.addNote(`Calculated Aggression: if this deals physical damage, your next ${earn} attack is empowered (+50%).`);
            }
        },
        notes: ["Triggers at most once per turn. If the attack misses, undo its card (or clear the counter) so nothing is empowered."],
    },
    "Mirror Mage/Alter Course": {
        notes: [
            "Attacks you redirect deal +50% damage per redirect. Line spells bounce off your mirror tokens automatically; for other redirects use the ↪ (redirected) and ↩ (back at the attacker) buttons on damage cards.",
        ],
    },
    "Mistguard/Eerie Mists": {
        notes: ["Conditions you apply also apply an irresistible, non-stacking Weaken of 10% per condition on the target (automatic)."],
    },
    "Noxomancer/Neverending Nightmare": {
        notes: ["When a non-curse condition you inflicted ends on an enemy, they gain a curse (automatic)."],
    },
};
