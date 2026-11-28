/**
 * Headless smoke test for the data models, run against Foundry's own (isomorphic) common/ code instead of mocks.
 *
 * It catches the boring breakages before you have to launch Foundry: invalid schema definitions, derived-stat math,
 * and level/investment bookkeeping. It can't exercise sheets, rolls, or anything client-only.
 *
 * Usage: node scripts/smoke.ts   (set FOUNDRY_APP if Foundry isn't in its default install location)
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createServer } from "vite";
import { defaultAppDir } from "./foundry-paths.ts";

const FOUNDRY_APP = defaultAppDir();

const foundry = await import(pathToFileURL(path.join(FOUNDRY_APP, "common", "server.mjs")).href);
Object.assign(globalThis, { foundry, CONFIG: { Actor: { dataModels: {} }, Item: { dataModels: {} }, Token: { movement: { actions: {} } } } });

// Let vite handle TypeScript and the rulebook JSON imports.
const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
try {
    const actorModels = await vite.ssrLoadModule("/src/data/actor/creature.ts");
    const itemModels = await vite.ssrLoadModule("/src/data/item/models.ts");
    const CONFIG = (globalThis as unknown as { CONFIG: Record<string, { dataModels: object }> }).CONFIG;
    Object.assign(CONFIG.Actor.dataModels, { character: actorModels.CharacterModel, npc: actorModels.NpcModel });
    Object.assign(CONFIG.Item.dataModels, {
        skill: itemModels.SkillModel,
        race: itemModels.RaceModel,
        class: itemModels.ClassModel,
        ability: itemModels.AbilityModel,
        equipment: itemModels.EquipmentModel,
    });

    // Build the models directly under minimal stand-in parents. Constructing real BaseActor/BaseItem documents
    // would drag in token, game, and settings globals that only exist in a running Foundry. Parents must still be
    // DataModels, so use an empty-schema one and hang the bits our models read (items, actor) off it.
    class StandIn extends foundry.abstract.DataModel {
        static defineSchema() {
            return {};
        }
        // Makes TypeDataField.getModelProvider treat the stand-in as an unknown type and bail out early.
        static TYPES: string[] = [];
    }
    const actor: any = new StandIn();
    actor.items = [];
    const makeItem = (name: string, type: string, Model: any, source: object) => {
        const item: any = new StandIn();
        Object.assign(item, { name, type, actor });
        item.system = new Model(source, { parent: item });
        return item;
    };
    actor.items.push(
        makeItem("Knowledge: Arcana", "skill", itemModels.SkillModel, { attribute: "int", points: 6 }),
        makeItem("Shield", "ability", itemModels.AbilityModel, { className: "Abjurer", tier: 1 }),
        makeItem("Stoneskin", "ability", itemModels.AbilityModel, { className: "Abjurer", tier: 2 }),
    );
    actor.system = new actorModels.CharacterModel(
        { attributes: { vit: { value: 5 }, agi: { value: 3 }, int: { value: 2 } } },
        { parent: actor },
    );

    const system = actor.system;
    assert.ok(system instanceof actorModels.CharacterModel, "character uses CharacterModel");
    system.prepareBaseData();
    // Simulate an "initial"-phase ActiveEffect: +10 AC and +30% AC.
    system.stats.ac.bonus += 10;
    system.stats.ac.multiplier += 30;
    system.attributes.str.bonus += 4;
    system.prepareDerivedData();

    assert.equal(system.attributes.wis.value, -10, "attributes default to -10");
    assert.equal(system.stats.health.value, 150, "health = 100 + 10*VIT");
    assert.equal(system.resources.health.max, 150, "resource max mirrors the stat");
    assert.equal(system.stats.speed.value, 35, "speed = 30 + 5 per two AGI");
    assert.equal(system.stats.ac.value, Math.round((0 + 10) * 1.3), "AC = (10 + TGH + bonus) * (1 + mult%)");
    assert.equal(system.attributes.str.total, -6, "attribute bonus adds to total");
    assert.equal(system.stats.meleeDamage.value, -6, "stats use attribute totals");
    assert.equal(system.stats.buffLimit.value, 0, "buff limit at -10 COM");

    // Every key the effect config's dropdown offers must land on a number effects can add into.
    const { changeKeyGroups } = await vite.ssrLoadModule("/src/effects/change-keys.ts");
    system.prepareBaseData();
    for (const group of changeKeyGroups()) {
        for (const { key } of group.keys) {
            const value = foundry.utils.getProperty(actor, key);
            assert.equal(typeof value, "number", `change key ${key} isn't a number bucket after prepareBaseData`);
        }
    }
    system.prepareDerivedData();

    // Formula edge cases straight from the attribute descriptions.
    const { STATS } = await vite.ssrLoadModule("/src/config.ts");
    assert.equal(STATS.health.formula(-10), 1, "-10 VIT has a max health of 1");
    assert.equal(STATS.mana.formula(-10), 0, "mana can be zero at -10 SPT");
    assert.equal(STATS.speed.formula(-10), 5, "-10 AGI has a movement speed of 5");
    assert.equal(STATS.speed.formula(-1), 30, "a single AGI point doesn't change speed");
    assert.equal(STATS.critChance.formula(20), 30, "max crit chance of 30% at 20 PRE");
    assert.equal(STATS.conditionResist.formula(20), 30, "max base condition resist of 30% at 20 FRT");
    assert.equal(STATS.commands.formula(20), 4, "4 commands at 20 APL");
    assert.equal(STATS.languages.formula(-10), 1, "1 language at -10 INT");
    assert.equal(STATS.itemEfficiency.formula(20), 150, "150% item efficiency at 20 WIS");
    assert.equal(STATS.buffLimit.formula(20), 15, "buff limit 15 at 20 COM");
    assert.equal(STATS.concentrationLimit.formula(20), 15, "concentration limit 15 at 20 FCS");

    // Level: attribute points above -10 (15 + 13 + 12) + skill points (6) + ability AP (1 + 2).
    assert.equal(system.level, 15 + 13 + 12 + 6 + 3);
    assert.deepEqual(system.classInvestment, { Abjurer: 3 });

    const skill = actor.items.find((i: any) => i.type === "skill");
    assert.equal(skill.system.rank, "A");
    assert.equal(skill.system.rankBonus, 30);

    const rollData = system.getRollData();
    assert.equal(rollData.agi, 3, "@agi resolves to the AGI total");
    /* ---------- Damage math ---------- */

    const math = await vite.ssrLoadModule("/src/rules/damage-math.ts");
    const mults = new Map([
        ["all", new Map([["Warleader", 25], ["Weakened", -20]])],
        ["allMagic", new Map([["Warleader", 25]])],
        ["fire", new Map([["Banefire", 10]])],
    ]);
    // Same source adds (25 + 25), different sources multiply: 1.5 * 0.8 * 1.1.
    assert.equal(math.multiplierFor("fire", mults).toFixed(4), (1.5 * 0.8 * 1.1).toFixed(4));
    assert.equal(math.multiplierFor("physical", mults).toFixed(4), (1.25 * 0.8).toFixed(4), "allMagic skips physical");
    assert.equal(math.finalDamage(27, 1.25, 2), 68);
    assert.equal(math.isCritRoll(91, 10), true);
    assert.equal(math.isCritRoll(90, 10), false);
    assert.equal(math.isCritRoll(1, 150), true, "crit chance over 100 always crits");

    const defenses = { ac: 20, magicResist: 25, elementResist: { fire: 15 }, damageReduction: 10 };
    const reduced = math.reduceDamage({ physical: 50, fire: 40, psychic: 10 }, { physical: 50 }, defenses);
    // physical: 50 - 20*(1-0.5) = 40; fire: 40 * (1 - 0.40) = 24; psychic: 10. Then 10% GDR each.
    assert.deepEqual(
        reduced.parts.map((p: { taken: number }) => p.taken),
        [36, 22, 9],
    );
    assert.equal(reduced.total, 67);
    assert.equal(math.reduceDamage({ physical: 5 }, {}, defenses).total, 0, "AC can't make damage negative");

    const up = { maxHealth: 100, maxDowned: 100, isDowned: false };
    const down = { ...up, isDowned: true };
    let hp = math.applyHealthChange({ ...up, health: 10, downed: 100 }, 25);
    assert.equal(hp.health, 0);
    assert.ok(hp.becameDowned);
    assert.equal(hp.downed, 100, "overflow doesn't carry into Downed Health");
    hp = math.applyHealthChange({ ...down, health: 0, downed: 30 }, 40);
    assert.ok(hp.died);
    // Missing 30 Downed Health: healing 31+ wakes you, 30 or less only stabilizes.
    hp = math.applyHealthChange({ ...down, health: 0, downed: 70 }, -31);
    assert.ok(hp.revived && !hp.stabilized);
    assert.equal(hp.health, 31);
    hp = math.applyHealthChange({ ...down, health: 0, downed: 70 }, -30);
    assert.ok(hp.stabilized && !hp.revived);
    assert.equal(hp.health, 30, "healing still raises health while stabilized");
    // Shielding soaks damage before health.
    hp = math.applyHealthChange({ ...up, health: 50, downed: 100, shielding: 20 }, 30);
    assert.equal(hp.shielding, 0);
    assert.equal(hp.health, 40);
    hp = math.applyHealthChange({ ...up, health: 50, downed: 100, shielding: 20 }, 5);
    assert.equal(hp.shielding, 15);
    assert.equal(hp.health, 50);
    hp = math.applyHealthChange({ ...down, health: 30, downed: 70 }, 50);
    assert.equal(hp.health, 0, "a stabilized character with health takes damage to health first");
    assert.ok(!hp.becameDowned, "already downed");

    /* ---------- Durations ---------- */

    // Predicates: the text syntax, and matching against roll options.
    const pred = await vite.ssrLoadModule("/src/rules/predicate.ts");
    const facts = new Set(["roll:physical", "weapon:bow", "target:type:demon", "target:health:percent:25", "self:status:hidden"]);
    const holds = (text: string) => pred.testPredicate(pred.parsePredicate(text), facts);
    assert.equal(holds(""), true, "no conditions always hold");
    assert.equal(holds("target:type:demon"), true);
    assert.equal(holds("Target:Type:Demon"), true, "case-insensitive");
    assert.equal(holds("weapon:crossbow | weapon:bow"), true, "or");
    assert.equal(holds("weapon:bow, !self:status:hidden"), false, "and + not");
    assert.equal(holds("target:health:percent < 30"), true, "numeric comparison");
    assert.equal(holds("target:health:percent >= 30"), false);
    assert.equal(pred.mentions(pred.parsePredicate("roll:physical, target:type:demon"), "target:"), true);
    assert.equal(pred.formatPredicate(pred.parsePredicate("a | b,!c, x<3")), "a | b, !c, x < 3", "round-trips");

    // "Who applied this" treats a character's world actor and its unlinked token copy as the same creature.
    const ro = await vite.ssrLoadModule("/src/rules/roll-options.ts");
    assert.equal(ro.sameActor("Actor.abc", "Actor.abc"), true);
    assert.equal(ro.sameActor("Actor.abc", "Scene.s1.Token.t1.Actor.abc"), true, "world actor vs its token copy");
    assert.equal(ro.sameActor("Scene.s1.Token.t1.Actor.abc", "Scene.s1.Token.t2.Actor.abc"), false, "two unlinked tokens stay distinct");
    assert.equal(ro.sameActor("Actor.abc", "Actor.xyz"), false);

    // Formula values: plain numbers skip the dice code; per-target formulas are recognized.
    const formula = await vite.ssrLoadModule("/src/rules/formula.ts");
    assert.equal(formula.evaluateNumber("25"), 25);
    assert.equal(formula.evaluateNumber(-5), -5);
    assert.equal(formula.evaluateNumber(""), 0);
    assert.equal(formula.usesTarget("50 * @target.marks.pursued"), true);
    assert.equal(formula.usesTarget("2 * floor(@distance / 5)"), true);
    assert.equal(formula.usesTarget("20 * @self.buffs"), false);

    // Mirror reflections: a beam fired right at a mirror facing left bounces straight back; a convex mirror hit
    // from behind splits it in two; a twice-redirected beam dispels the third mirror it hits.
    const refl = await vite.ssrLoadModule("/src/rules/reflection.ts");
    // At rotation 0 a mirror faces right; 180 faces left.
    const faceLeft = refl.mirrorFromToken("m1", "plane", { x: 500, y: 0 }, 100, 180); // front normal = (-1, 0)
    let trace = refl.traceBeam({ x: 0, y: 0 }, { x: 1, y: 0 }, 1000, 10, [faceLeft]);
    assert.equal(trace.segments.length, 2, "beam reflects once");
    assert.equal(Math.round(trace.segments[0].to.x), 500, "first segment stops at the mirror");
    assert.equal(Math.round(trace.segments[1].to.x), -500, "reflected segment comes back with its range reset");
    assert.equal(trace.segments[1].redirects, 1);
    assert.ok(refl.onSegment({ x: 200, y: 3 }, trace.segments[1]), "token on the way back is hit by the redirect");
    const backOfPlane = refl.mirrorFromToken("m2", "plane", { x: 500, y: 0 }, 100, 0); // facing right: hit from behind
    trace = refl.traceBeam({ x: 0, y: 0 }, { x: 1, y: 0 }, 1000, 10, [backOfPlane]);
    assert.equal(trace.segments.length, 1, "the back of a plane mirror blocks");
    const convex = refl.mirrorFromToken("m3", "convex", { x: 500, y: 0 }, 100, 0); // front faces +x, hit from behind
    trace = refl.traceBeam({ x: 0, y: 0 }, { x: 1, y: 0 }, 1000, 10, [convex]);
    assert.equal(trace.segments.length, 3, "convex mirror splits the beam in two");
    assert.ok(trace.segments.slice(1).every((s: { to: { x: number } }) => s.to.x > 500), "both beams leave out the front");
    const left = refl.mirrorFromToken("a", "plane", { x: 500, y: 0 }, 100, 180);
    const right = refl.mirrorFromToken("b", "plane", { x: -500, y: 0 }, 100, 0);
    trace = refl.traceBeam({ x: 0, y: 0 }, { x: 1, y: 0 }, 2000, 10, [left, right]);
    assert.deepEqual(trace.segments.map((s: { redirects: number }) => s.redirects), [0, 1, 2], "two redirects then stop");
    assert.deepEqual(trace.dispelled, ["a"], "the third mirror hit by a twice-redirected beam is dispelled");
    trace = refl.traceBeam({ x: 0, y: 0 }, { x: 1, y: 0 }, 1000, 10, [faceLeft], { widthPerRedirect: 20 });
    assert.equal(trace.segments[1].width, 30, "Beam of Brilliance widens per redirect");

    // Hands: a weapon or shield in each hand is dual wielding; shields in both is dual wielding shields.
    const handRules = await vite.ssrLoadModule("/src/rules/hands.ts");
    const holder: any = new StandIn();
    const gear = (name: string, slot: string, category: string, damage = "1d8") =>
        Object.assign(makeItem(name, "equipment", itemModels.EquipmentModel, { slot, equipped: true, weapon: { category, damage } }), {
            id: name,
        });
    holder.items = [gear("Sword", "mainHand", "longblade")];
    assert.equal(handRules.isDualWielding(holder), false, "one weapon isn't dual wielding");
    holder.items.push(gear("Buckler", "offhand", "shield", ""));
    assert.equal(handRules.isDualWielding(holder), true, "a damage-less shield still counts as holding something");
    assert.equal(handRules.isDualWieldingShields(holder), false, "sword and shield aren't dual shields");
    holder.items = [gear("Shield A", "mainHand", "shield"), gear("Shield B", "offhand", "shield")];
    assert.equal(handRules.isDualWieldingShields(holder), true, "two shields are dual shields");
    holder.items = [gear("Greatsword", "twoHand", "longblade")];
    assert.equal(handRules.isDualWielding(holder), false, "a two-hander isn't dual wielding");

    // Weapon tags on abilities: what counts as holding the right weapon.
    const sniper = handRules.expectedWeaponCategories(["Attack", "bow", "Ranged"]);
    assert.deepEqual([...sniper], ["bow"]);
    assert.equal(handRules.holdsExpectedWeapon(sniper, ["bow"]), true);
    assert.equal(handRules.holdsExpectedWeapon(sniper, []), false, "no bow held");
    assert.equal(handRules.holdsExpectedWeapon(handRules.expectedWeaponCategories(["rapier"]), ["fine"]), true, "a rapier is a fine weapon");
    assert.equal(handRules.holdsExpectedWeapon(handRules.expectedWeaponCategories(["unarmed"]), []), true, "unarmed needs no weapon");
    assert.equal(handRules.holdsExpectedWeapon(handRules.expectedWeaponCategories(["axe", "longblade"]), ["longblade"]), true, "any listed type will do");
    assert.equal(handRules.expectedWeaponCategories(["Spell", "scythe"]).size, 0, "unsettled tags don't warn");

    // Picking weapons by hand for abilities.
    const attackMod = await vite.ssrLoadModule("/src/rolls/attack.ts");
    holder.items = [gear("Sword", "mainHand", "longblade"), gear("Dagger", "offhand", "shortblade", "1d4")];
    assert.equal(attackMod.holdsTwoWeapons(holder), true, "sword and dagger are two weapons");
    assert.equal(attackMod.weaponsFor(holder, "main").weapon.name, "Sword");
    assert.equal(attackMod.weaponsFor(holder, "off").weapon.name, "Dagger");
    const dual = attackMod.weaponsFor(holder, "dual");
    assert.deepEqual([dual.weapon.name, dual.offWeapon.name], ["Sword", "Dagger"], "dual uses both");
    holder.items = [gear("Sword", "mainHand", "longblade"), gear("Buckler", "offhand", "shield", "")];
    assert.equal(attackMod.holdsTwoWeapons(holder), false, "a damage-less shield isn't a second weapon");

    // The Stats tab folds always-on roll modifiers into stat rows and describes the rest.
    const { summarizeRollBonuses, bonusTotal } = await vite.ssrLoadModule("/src/sheets/roll-bonuses.ts");
    const dagger = gear("Dagger", "mainHand", "shortblade", "1d4");
    const ring = Object.assign(gear("Ring", "ring", "", ""), { documentName: "Item" });
    Object.assign(dagger, { documentName: "Item" });
    const fx = (name: string, parent: any, modifiers: object[], singleUse = false) => ({
        name,
        parent,
        active: true,
        system: { singleUse, modifiers: modifiers.map((m) => ({ rollType: "all", damageType: "all", weapon: "", onCrit: false, ...m })) },
    });
    const bearer: any = {
        allApplicableEffects: () => [
            fx("Keen Edge", dagger, [{ type: "critChance", rollType: "physical", value: "10" }]),
            fx("Ring of Fire", ring, [{ type: "multiplier", damageType: "fire", value: "15" }, { type: "penetration", value: "10" }]),
            fx("Rapid Fire", null, [{ type: "critChance", rollType: "physical", weapon: "bow", value: "20" }]),
        ],
    };
    const rb = summarizeRollBonuses(bearer);
    assert.equal(bonusTotal(rb, "multiplier.fire"), 15, "always-on multiplier folds into its row");
    assert.equal(bonusTotal(rb, "penetration.physical"), 10, "all-penetration counts for armor...");
    assert.equal(bonusTotal(rb, "penetration.allMagic"), 10, "...and every element");
    assert.equal(bonusTotal(rb, "critChance"), 0, "weapon mods and bow-only bonuses aren't always-on");
    assert.equal(rb.other.length, 2, "they're listed as conditional instead");
    assert.match(rb.other.join("\n"), /attacks with Dagger/);

    // Equip limits: one per slot, two rings, and two-handed fills both hands.
    const { equipConflict } = await vite.ssrLoadModule("/src/rules/equipment.ts");
    const helm = { name: "Helm", slot: "head" };
    assert.equal(equipConflict("head", []), null, "an empty slot fits");
    assert.match(equipConflict("head", [helm]) ?? "", /Helm/, "a second head item is refused, naming the first");
    assert.equal(equipConflict("ring", [{ name: "Ring A", slot: "ring" }]), null, "two rings fit");
    assert.ok(equipConflict("ring", [{ name: "A", slot: "ring" }, { name: "B", slot: "ring" }]), "a third ring doesn't");
    assert.ok(equipConflict("twoHand", [{ name: "Dagger", slot: "offhand" }]), "two-handed needs the offhand free");
    assert.ok(equipConflict("mainHand", [{ name: "Greatsword", slot: "twoHand" }]), "main hand is taken by a two-hander");
    assert.equal(equipConflict("mainHand", [{ name: "Shield", slot: "offhand" }]), null, "main hand and offhand coexist");
    assert.equal(equipConflict("none", [{ name: "Rope", slot: "none" }]), null, "unslotted items have no limit");
    // The equip-limit hook only intervenes when the slot or Equipped actually changes, and only drops that part.
    (globalThis as any).ui = { notifications: { warn: () => {} } };
    const wearer: any = new StandIn();
    const owned = (name: string, slot: string, equipped: boolean) => {
        const item: any = new StandIn();
        Object.assign(item, { name, type: "equipment", actor: wearer, id: name });
        item.system = new itemModels.EquipmentModel({ slot, equipped }, { parent: item });
        return item;
    };
    const helmA = owned("Helm A", "head", true);
    const helmB = owned("Helm B", "head", false);
    wearer.items = [helmA, helmB];
    let changes: any = { system: { slot: "head", equipped: true, quantity: 2 } };
    await helmB.system._preUpdate(changes, {}, {});
    assert.equal(changes.system.equipped, false, "equipping into a full slot is dropped");
    assert.equal(changes.system.quantity, 2, "...but the rest of the edit goes through");
    changes = { system: { slot: "head", equipped: true, quantity: 3 } };
    await helmA.system._preUpdate(changes, {}, {});
    assert.equal(changes.system.equipped, true, "editing an already-equipped item isn't refused for its own slot");
    helmB.system = new itemModels.EquipmentModel({ slot: "head", equipped: true }, { parent: helmB });
    changes = { system: { slot: "head", equipped: true, quantity: 4 } };
    await helmA.system._preUpdate(changes, {}, {});
    assert.equal(changes.system.quantity, 4, "an over-full slot left from before doesn't block unrelated edits");
    delete (globalThis as any).ui;

    const oldMisc = new itemModels.EquipmentModel({ slot: "misc", equipped: true });
    assert.equal(oldMisc.slot, "none", "items saved in the dropped misc slot load as unslotted");

    // Stat bonus rows become ordinary "add" changes when the effect is prepared.
    {
        const { BarbsEffectModel } = await vite.ssrLoadModule("/src/data/effect.ts");
        const host: any = new StandIn();
        const model: any = new BarbsEffectModel(
            { modifiers: [{ type: "stat", key: "system.stats.ac.bonus", value: "10" }, { type: "multiplier", damageType: "fire", value: "20" }] },
            { parent: host },
        );
        model.prepareDerivedData();
        assert.deepEqual(
            model.changes.map((c: any) => [c.key, c.type, c.value]),
            [["system.stats.ac.bonus", "add", "10"]],
            "stat bonus rows (and only those) become changes",
        );
    }

    const { parseDuration } = await vite.ssrLoadModule("/src/effects/apply.ts");
    assert.deepEqual(parseDuration("1 minute"), { value: 5, units: "rounds", expiry: "turnEnd" });
    assert.deepEqual(parseDuration("20 seconds"), { value: 1, units: "rounds", expiry: "turnEnd" });
    assert.deepEqual(parseDuration("1 round"), { value: 1, units: "rounds", expiry: "turnStart" });
    assert.deepEqual(parseDuration("6 hours"), { value: 6, units: "hours", expiry: null });
    assert.equal(parseDuration("Instant"), null);
    assert.equal(parseDuration("Endless"), null);

    /* ---------- Ability catalog ---------- */

    const { ABILITY_AUTOMATION } = await vite.ssrLoadModule("/src/abilities/catalog.ts");
    const { buildEffectData } = await vite.ssrLoadModule("/src/abilities/effects.ts");
    // A lasting shred copies its source buff's duration rather than the card's "Endless".
    const shredData: any = buildEffectData(
        { name: "Shredded", category: "condition", durationData: { value: 5, units: "rounds", expiry: "turnEnd" } },
        { className: "", abilityName: "Serrated Arrow", img: "", duration: "Endless" },
    );
    assert.deepEqual(shredData.duration, { value: 5, units: "rounds", expiry: "turnEnd" }, "lasting shred keeps its buff's duration");
    const { BarbsEffectModel } = await vite.ssrLoadModule("/src/data/effect.ts");
    const rulebook = JSON.parse(
        fs.readFileSync(path.resolve(import.meta.dirname, "..", "..", "rulebook", "abilities.json"), "utf8"),
    ) as { class: string; name: string; duration: string }[];
    const byKey = new Map(rulebook.map((a) => [`${a.class}/${a.name}`, a]));
    const { makeContext, resolve } = await vite.ssrLoadModule("/src/abilities/context.ts");
    const { defaultChoices } = await vite.ssrLoadModule("/src/abilities/choices.ts");
    const { ELEMENTS } = await vite.ssrLoadModule("/src/config.ts");

    // Minimal actor stand-ins for the parts of the Actor API catalog functions touch.
    Object.assign(actor, { statuses: new Set<string>(), effects: [], allApplicableEffects: function* () {}, name: "Caster", uuid: "Actor.caster" });
    const fakeTarget: any = new StandIn();
    fakeTarget.items = [];
    fakeTarget.system = new actorModels.CharacterModel({}, { parent: fakeTarget });
    fakeTarget.system.prepareBaseData();
    fakeTarget.system.prepareDerivedData();
    Object.assign(fakeTarget, { statuses: new Set<string>(["slowed", "weakened"]), effects: [], name: "Target" });

    const validAreas = new Set(["square", "circle", "cone", "line", "battlefield"]);
    const validTypes = new Set(["physical", "psychic", "healing", ...ELEMENTS]);
    const formulaShape = /^[\d\sdU+*/(){}kh,.@a-z-]+$/i;
    const { PASSIVE_AUTOMATION } = await vite.ssrLoadModule("/src/passives/catalog.ts");
    const passiveResources = new Set(
        Object.values(PASSIVE_AUTOMATION as Record<string, any>).flatMap((p) => (p.resources ?? []).map((r: any) => r.key)),
    );

    /** Every choice at its default, then each select option / checkbox flipped one at a time. */
    function choiceVariants(choices: any[] = []): Record<string, unknown>[] {
        const base = defaultChoices(choices);
        const variants = [base];
        for (const c of choices) {
            if (c.type === "select") for (const o of Object.keys(c.options ?? {})) variants.push({ ...base, [c.key]: o });
            if (c.type === "checkbox") variants.push({ ...base, [c.key]: true });
            if (c.type === "number") variants.push({ ...base, [c.key]: 3 });
        }
        return variants;
    }

    let specs = 0;
    let variantsChecked = 0;
    for (const [key, automation] of Object.entries(ABILITY_AUTOMATION) as [string, any][]) {
        // Summon actions are keyed under their summoning ability; everything else must match a rulebook ability.
        const summonOf = key.startsWith("Summon/") ? key.split("/").slice(1, 3).join("/") : null;
        const ability = byKey.get(summonOf ?? key);
        assert.ok(ability, `catalog entry "${key}" doesn't match any rulebook ability`);
        const rolls = Object.fromEntries(Object.keys(automation.rolls ?? {}).map((k) => [k, 50]));
        for (const choices of choiceVariants(automation.choices)) {
            variantsChecked++;
            for (const c of automation.choices ?? []) {
                if (c.resource) assert.ok(passiveResources.has(c.resource), `catalog "${key}": choice "${c.key}" binds unknown resource "${c.resource}"`);
            }
            const ctx = makeContext(actor, null, choices, 1.25, {
                targets: [fakeTarget],
                rolls,
                result: { total: 42, dice: [{ faces: 10, result: 10 }, { faces: 6, result: 6 }] },
            });
            const where = `catalog "${key}" with choices ${JSON.stringify(choices)}`;
            try {
                const summon = resolve(automation.summon, ctx);
                if (summon) {
                    assert.ok(summon.name && summon.stats, `${where}: summon needs a name and stats`);
                    for (const action of summon.actions ?? []) {
                        assert.ok(automation.summonActions?.[action.name], `${where}: summon action "${action.name}" has no automation`);
                    }
                    for (const spec of summon.effects ?? []) {
                        const data = buildEffectData(spec, { className: "", abilityName: summon.name, img: "", duration: "1 minute" });
                        new BarbsEffectModel(data.system, { parent: new StandIn(), strict: true });
                    }
                }
                const area = resolve(automation.area, ctx);
                if (area) assert.ok(validAreas.has(area.shape), `${where}: bad area shape ${area.shape}`);
                const attack = resolve(automation.attack, ctx);
                for (const part of [...(attack?.damage ?? []), ...(attack?.tiers ?? []).flatMap((t: any) => t.damage)]) {
                    assert.ok(validTypes.has(part.type), `${where}: bad damage type ${part.type}`);
                    assert.ok(formulaShape.test(part.formula), `${where}: odd formula "${part.formula}"`);
                }
                const heal = resolve(automation.heal, ctx);
                if (heal) assert.ok(formulaShape.test(heal.formula), `${where}: odd heal formula "${heal.formula}"`);
                const cost = resolve(automation.cost, ctx);
                for (const c of cost === null || cost === undefined ? [] : Array.isArray(cost) ? cost : [cost]) {
                    assert.ok(
                        ["health", "stamina", "mana"].includes(c.resource) || passiveResources.has(c.resource),
                        `${where}: bad cost resource ${c.resource}`,
                    );
                    assert.ok(Number.isFinite(c.amount), `${where}: bad cost amount`);
                }
                resolve(automation.notes, ctx);
                for (const r of resolve(automation.restore, ctx) ?? []) assert.ok(formulaShape.test(r.formula), `${where}: odd restore formula`);
                // Effects nested in zones and triggers get built at runtime, so validate them here too.
                const areaSpec = resolve(automation.area, ctx);
                const zoneEffects = (areaSpec?.zone ? [areaSpec.zone].flat() : []).flatMap((z: any) => (z.effect ? [z.effect] : []));
                const topLevel = [...(resolve(automation.self, ctx) ?? []), ...(resolve(automation.target, ctx) ?? []), ...zoneEffects];
                const triggerEffects = topLevel.flatMap((e: any) => (e.triggers ?? []).flatMap((t: any) => (t.effect ? [t.effect] : [])));
                const effectSpecs = [...topLevel, ...triggerEffects];
                for (const spec of effectSpecs) {
                    // Chance-based resolvers can skip a target (null); check every redirect count until one applies.
                    let resolved = spec;
                    if (spec.resolve) {
                        resolved = null;
                        for (let i = 0; i < 200 && !resolved; i++) resolved = spec.resolve(fakeTarget, spec, ctx, { redirects: i % 3 });
                        if (!resolved) continue;
                    }
                    const data = buildEffectData(resolved, {
                        className: ability.class,
                        abilityName: ability.name,
                        img: "icons/svg/aura.svg",
                        duration: ability.duration,
                        effectiveness: ctx.effectiveness,
                    });
                    const effect: any = new StandIn();
                    new BarbsEffectModel(data.system, { parent: effect, strict: true });
                    specs++;
                }
            } catch (err) {
                throw new Error(`${where}: ${(err as Error).message}`);
            }
        }
    }

    // Every passive entry must name a real class passive.
    const classes = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, "..", "..", "rulebook", "classes.json"), "utf8")) as any[];
    const passiveKeys = new Set(classes.flatMap((c) => Object.keys(c.passive ?? {}).map((p) => `${c.name}/${p}`)));
    for (const key of Object.keys(PASSIVE_AUTOMATION)) assert.ok(passiveKeys.has(key), `passive entry "${key}" doesn't match any class passive`);

    // Buff effectiveness: Focus's 30% crit chance at 125% effectiveness is 37.5%.
    {
        const ctx = makeContext(actor, null, {}, 1.25);
        const focus = resolve(ABILITY_AUTOMATION["Assassin/Focus"].self, ctx)[0];
        assert.equal(focus.modifiers[0].value, 37.5);
        assert.equal(ctx.dice("2d8"), "2d8", "2.5 dice round down");
        assert.equal(ctx.dice("4d10 + 1d6"), "5d10 + 1d6");
    }

    // Every generated compendium entry must validate against its model (run `npm run packs` first).
    const packSrc = path.resolve(import.meta.dirname, "..", "build", "packs");
    const models: Record<string, any> = CONFIG.Item.dataModels as Record<string, any>;
    let validated = 0;
    for (const pack of fs.existsSync(packSrc) ? fs.readdirSync(packSrc) : []) {
        for (const file of fs.readdirSync(path.join(packSrc, pack))) {
            const doc = JSON.parse(fs.readFileSync(path.join(packSrc, pack, file), "utf8"));
            if (!doc._key.startsWith("!items!")) continue;
            const item: any = new StandIn();
            Object.assign(item, { name: doc.name, type: doc.type, actor: null });
            try {
                new models[doc.type](doc.system, { parent: item, strict: true });
            } catch (err) {
                throw new Error(`${pack}/${file} failed validation: ${(err as Error).message}`);
            }
            validated++;
        }
    }
    if (!validated) console.warn("smoke: no pack sources found; run `npm run packs` to validate them too");

    const entries = Object.keys(ABILITY_AUTOMATION).filter((k) => !k.startsWith("Summon/")).length;
    console.log(
        `smoke: ok (${entries} automated abilities, ${Object.keys(PASSIVE_AUTOMATION).length} passives, ${variantsChecked} choice variants, ${specs} effect specs, ${validated} compendium entries)`,
    );
} finally {
    await vite.close();
}
