import {
    COMBAT_STATS,
    ELEMENTS,
    MULTIPLIER_STAT_KEYS,
    PENETRATION_STAT_KEYS,
    skillKey,
    STATUSES,
    ATTRIBUTE_KEYS,
    ATTRIBUTES,
    EQUIPMENT_SLOTS,
    INVENTORY_HEADINGS,
    INVENTORY_ORDER,
    RESOURCE_KEYS,
    SKILL_MAX_POINTS,
    STAT_KEYS,
    STATS,
    SYSTEM_ID,
    TIER_INVESTMENT_REQUIRED,
    type AttributeKey,
    type EquipmentSlot,
} from "../config.ts";
import { getAutomation } from "../abilities/catalog.ts";
import { damageBucketLabel } from "../effects/change-keys.ts";
import { bonusSources, bonusTotal, summarizeRollBonuses, type RollBonusSummary } from "./roll-bonuses.ts";
import { defaultChoices } from "../abilities/choices.ts";
import { makeContext, resolve } from "../abilities/context.ts";
import type { AbilityAutomation } from "../abilities/types.ts";
import { holdsTwoWeapons, mainWeapon, offhandWeapon, type Hand } from "../rolls/attack.ts";
import { adjustResource, baseComboChance, getPassiveAutomation, handle as passiveHandle, monkDie, setState } from "../passives/index.ts";
import type { BarbsActor } from "../documents/actor.ts";
import type { BarbsEffectModel } from "../data/effect.ts";
import type { AbilityModel, EquipmentModel, SkillModel } from "../data/item/models.ts";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

const TEMPLATES = `systems/${SYSTEM_ID}/templates/actor`;

type ActionHandler = (this: BarbsCharacterSheet, event: PointerEvent, target: HTMLElement) => void | Promise<void>;

/**
 * Character sheet. Tabs roughly follow the old Roll20 sheet: main (characteristics + resources), attributes, stats,
 * skills, abilities, inventory, and effects. Rolls happen here, on the client, instead of being forwarded to an API.
 */
export class BarbsCharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
    static override DEFAULT_OPTIONS = {
        classes: [SYSTEM_ID, "actor", "character"],
        position: { width: 780, height: 820 },
        window: { resizable: true },
        form: { submitOnChange: true },
        actions: {
            rollAttribute: BarbsCharacterSheet.#onRollAttribute as ActionHandler,
            rollSkill: BarbsCharacterSheet.#onRollSkill as ActionHandler,
            useAbility: BarbsCharacterSheet.#onUseAbility as ActionHandler,
            weaponAttack: BarbsCharacterSheet.#onWeaponAttack as ActionHandler,
            dualWieldAttack: BarbsCharacterSheet.#onDualWieldAttack as ActionHandler,
            rollPercentStat: BarbsCharacterSheet.#onRollPercentStat as ActionHandler,
            rollInitiative: BarbsCharacterSheet.#onRollInitiative as ActionHandler,
            deathSave: BarbsCharacterSheet.#onDeathSave as ActionHandler,
            shortRest: BarbsCharacterSheet.#onShortRest as ActionHandler,
            longRest: BarbsCharacterSheet.#onLongRest as ActionHandler,
            createItem: BarbsCharacterSheet.#onCreateItem as ActionHandler,
            editItem: BarbsCharacterSheet.#onEditItem as ActionHandler,
            deleteItem: BarbsCharacterSheet.#onDeleteItem as ActionHandler,
            toggleEquipped: BarbsCharacterSheet.#onToggleEquipped as ActionHandler,
            openCompendium: BarbsCharacterSheet.#onOpenCompendium as ActionHandler,
            createEffect: BarbsCharacterSheet.#onCreateEffect as ActionHandler,
            editEffect: BarbsCharacterSheet.#onEditEffect as ActionHandler,
            deleteEffect: BarbsCharacterSheet.#onDeleteEffect as ActionHandler,
            toggleEffect: BarbsCharacterSheet.#onToggleEffect as ActionHandler,
            passiveResource: BarbsCharacterSheet.#onPassiveResource as ActionHandler,
            passiveAction: BarbsCharacterSheet.#onPassiveAction as ActionHandler,
        },
    };

    static override PARTS = {
        header: { template: `${TEMPLATES}/header.hbs` },
        tabs: { template: "templates/generic/tab-navigation.hbs" },
        main: { template: `${TEMPLATES}/main.hbs`, scrollable: [""] },
        attributes: { template: `${TEMPLATES}/attributes.hbs`, scrollable: [""] },
        stats: { template: `${TEMPLATES}/stats.hbs`, scrollable: [""] },
        skills: { template: `${TEMPLATES}/skills.hbs`, scrollable: [""] },
        abilities: { template: `${TEMPLATES}/abilities.hbs`, scrollable: [""] },
        inventory: { template: `${TEMPLATES}/inventory.hbs`, scrollable: [""] },
        effects: { template: `${TEMPLATES}/effects.hbs`, scrollable: [""] },
        notes: { template: `${TEMPLATES}/notes.hbs`, scrollable: [""] },
    };

    static override TABS = {
        primary: {
            tabs: [
                { id: "main", label: "Main" },
                { id: "attributes", label: "Attributes" },
                { id: "stats", label: "Stats" },
                { id: "skills", label: "Skills" },
                { id: "abilities", label: "Abilities" },
                { id: "inventory", label: "Inventory" },
                { id: "effects", label: "Effects" },
                { id: "notes", label: "Notes" },
            ],
            initial: "main",
        },
    };

    get barbsActor(): BarbsActor {
        return this.document as unknown as BarbsActor;
    }

    /* -------------------------------------------- */
    /*  Context                                     */
    /* -------------------------------------------- */

    protected override async _prepareContext(options: never): Promise<never> {
        const context = (await super._prepareContext(options)) as unknown as Record<string, unknown>;
        const actor = this.barbsActor;
        const system = actor.creature.derived;

        const items = [...actor.items].sort((a, b) => a.name.localeCompare(b.name));
        const ofType = (type: string) => items.filter((i) => i.type === type);

        const attributeGroups: Record<string, unknown[]> = {};
        for (const key of ATTRIBUTE_KEYS) {
            const config = ATTRIBUTES[key];
            (attributeGroups[config.category] ??= []).push({ ...config, ...system.attributes[key] });
        }

        const rollableStats = new Set(["evasion", "conditionResist"]);
        const overrides = (actor.creature as unknown as { overrides: Record<string, number | null> }).overrides ?? {};
        // Roll modifiers from gear and buffs that apply to every roll count towards the stats they boost.
        const rollBonuses = summarizeRollBonuses(actor as unknown as Actor.Implementation);
        // The core stats, grouped like the Attributes tab (each stat under its attribute's category). Value is
        // everything included: the formula, effects' Changes, and always-on roll modifiers; hover it for the parts.
        const statGroups: Record<string, unknown[]> = {};
        for (const key of STAT_KEYS) {
            const config = STATS[key];
            const data = system.stats[key];
            const mods = bonusTotal(rollBonuses, key);
            const unit = config.unit ?? "";
            const attr = ATTRIBUTES[config.attribute];
            const breakdown = [
                `${data.base}${unit} from ${attr.abbreviation}${overrides[key] != null ? " (fixed)" : ""}`,
                ...(data.bonus ? [`${data.bonus > 0 ? "+" : ""}${data.bonus} from effects`] : []),
                ...(data.multiplier ? [`increased by ${data.multiplier}%`] : []),
                ...(mods ? [`${mods > 0 ? "+" : ""}${mods} from ${bonusSources(rollBonuses, key)}`] : []),
            ].join(", ");
            (statGroups[attr.category] ??= []).push({
                key,
                ...config,
                ...data,
                rollable: rollableStats.has(key),
                override: overrides[key] ?? "",
                total: data.value + mods,
                breakdown,
                changed: data.value + mods !== data.base,
            });
        }

        const statSections = this.#statSections(rollBonuses);

        // Base is rank + attribute; Value adds effects' bonuses to every skill and to this one (what a check rolls).
        const skills = ofType("skill").map((item) => {
            const s = item.system as unknown as SkillModel;
            const all = system.skillBonus ?? 0;
            const own = system.skillBonuses?.[skillKey(item.name)] ?? 0;
            const attr = ATTRIBUTES[s.attribute as AttributeKey];
            const sign = (n: number) => `${n > 0 ? "+" : ""}${n}`;
            return {
                item,
                rank: s.rank,
                points: s.points,
                attribute: attr?.abbreviation ?? "?",
                base: s.modifier,
                value: s.modifier + all + own,
                changed: !!(all || own),
                breakdown: [
                    `${sign(s.rankBonus)} rank`,
                    `${sign(s.attributeBonus)} ${attr?.abbreviation ?? "attribute"}`,
                    ...(all ? [`${sign(all)} to all skills`] : []),
                    ...(own ? [`${sign(own)} to ${item.name}`] : []),
                ].join(", "),
            };
        });

        // With a weapon in each hand, physical weapon abilities get Main / Off / Dual buttons.
        const twoWeapons = holdsTwoWeapons(actor as unknown as Actor.Implementation);
        const usesWeapon = (item: Item.Implementation, automation: AbilityAutomation | null) => {
            if (!twoWeapons || !automation?.attack) return false;
            try {
                const ctx = makeContext(actor as unknown as Actor.Implementation, item, defaultChoices(automation.choices));
                const attack = resolve(automation.attack, ctx);
                return !!attack && attack.rollType === "physical" && (attack.scaling ?? "weapon") === "weapon";
            } catch {
                return false;
            }
        };

        // Group abilities under their class, with the class's AP investment and the tiers it unlocks.
        const abilityGroups = new Map<string, { name: string; investment: number; unlockedTier: number; abilities: unknown[] }>();
        for (const item of ofType("ability")) {
            const a = item.system as unknown as AbilityModel;
            const name = a.className || "Other";
            const investment = system.classInvestment[name] ?? 0;
            const unlockedTier = Math.max(
                ...Object.entries(TIER_INVESTMENT_REQUIRED)
                    .filter(([, required]) => investment >= required)
                    .map(([tier]) => Number(tier)),
            );
            if (!abilityGroups.has(name)) abilityGroups.set(name, { name, investment, unlockedTier, abilities: [] });
            const automation = getAutomation(a.className, item.name, a.automationKey);
            abilityGroups.get(name)!.abilities.push({ item, system: a, automated: !!automation, hands: usesWeapon(item as Item.Implementation, automation) });
        }
        const sortedAbilityGroups = [...abilityGroups.values()].sort((a, b) => a.name.localeCompare(b.name));
        for (const group of sortedAbilityGroups) {
            (group.abilities as { system: AbilityModel }[]).sort((a, b) => a.system.tier - b.system.tier);
        }

        const passives = ofType("passive").map((item) => {
            const automation = getPassiveAutomation(item);
            const h = passiveHandle(item);
            return {
                item,
                className: (item.system as unknown as { className: string }).className,
                description: (item.system as unknown as { description: string }).description,
                resources: (automation?.resources ?? []).map((r) => ({ ...r, value: h.resource(r.key) })),
                states: (automation?.states ?? []).map((st) => ({ ...st, value: h.state(st.key) })),
                actions: automation?.actions ?? [],
                notes: automation?.notes ?? [],
                monk: automation?.monkMastery,
            };
        });

        const equipment = ofType("equipment").map((item) => {
            const e = item.system as unknown as EquipmentModel;
            return {
                item,
                system: e,
                weaponSummary: e.isWeapon ? `${e.weapon.damage} ${e.weapon.damageType}` : "",
            };
        });
        // Label the hand each weapon is in when there are two, so the buttons read Main hand / Offhand.
        const mainId = mainWeapon(actor as unknown as Actor.Implementation)?.id;
        const offId = offhandWeapon(actor as unknown as Actor.Implementation)?.id;
        const heldWeapons = equipment
            .filter((e) => e.system.isHeldWeapon)
            .map((e) => ({ ...e, hand: twoWeapons ? (e.item.id === mainId ? "Main hand" : e.item.id === offId ? "Offhand" : "") : "" }));

        // One section per slot, in a fixed order, empty ones included so it's clear what's free. Equipped items
        // first, then by name.
        const inventory = INVENTORY_ORDER.map((slot) => ({
            slot,
            label: INVENTORY_HEADINGS[slot] ?? EQUIPMENT_SLOTS[slot],
            items: equipment
                .filter((e) => (e.system.slot in EQUIPMENT_SLOTS ? e.system.slot : "none") === slot)
                .sort((a, b) => Number(b.system.equipped) - Number(a.system.equipped) || a.item.name.localeCompare(b.item.name)),
        }));

        // allApplicableEffects() skips suppressed ones (unequipped gear), so walk item effects too.
        const allEffects = [...actor.effects, ...actor.items.contents.flatMap((i) => [...i.effects])];
        const effects = allEffects.map((effect) => {
            const system = effect.system as unknown as BarbsEffectModel;
            const summary = [
                ...(system.changes ?? []).map((c) => `${c.key.replace(/^system\./, "")} ${c.type} ${c.value}`),
                ...(system.modifiers ?? []).map(
                    (m) => `${m.type} ${m.value}${m.damageType && m.type !== "note" ? ` ${m.damageType}` : ""}` +
                        `${m.rollType !== "all" ? ` (${m.rollType}` + (m.weapon ? ` ${m.weapon}` : "") + ")" : m.weapon ? ` (${m.weapon})` : ""}`,
                ),
                ...(system.singleUse ? ["single use"] : []),
            ].join("; ");
            return {
                effect,
                source: effect.parent === actor ? "" : effect.parent?.name,
                fromEquipment: effect.parent !== actor && (effect.parent as Item | null)?.type === "equipment",
                category: system.category,
                summary,
                inactive: !effect.active,
                duration: (effect.duration as { label?: string }).label ?? "",
            };
        });
        // Gear's effects (enchantments, affixes) are always there and rarely interesting, so they get their own
        // section, collapsed unless you open it.
        const equipmentEffects = effects.filter((e) => e.fromEquipment);
        const otherEffects = effects.filter((e) => !e.fromEquipment);

        return {
            ...context,
            actor,
            system,
            source: actor.system._source,
            isNpc: actor.type === "npc",
            editable: this.isEditable,
            race: ofType("race")[0] ?? null,
            classes: ofType("class"),
            resources: RESOURCE_KEYS.map((key) => ({ key, label: key.capitalize(), ...system.resources[key] })),
            attributeGroups,
            statGroups,
            statSections,
            skills,
            skillMaxPoints: SKILL_MAX_POINTS,
            abilityGroups: sortedAbilityGroups,
            equipment,
            inventory,
            passives,
            monk: passives.some((p) => p.monk)
                ? { die: monkDie(actor as unknown as Actor.Implementation), combo: baseComboChance(actor as unknown as Actor.Implementation) }
                : null,
            shielding: actor.creature.shielding.value,
            heldWeapons,
            twoWeapons,
            effects: otherEffects,
            equipmentEffects,
            equipmentEffectsOpen: this.#equipmentEffectsOpen,
            activeEquipmentEffects: equipmentEffects.filter((e) => !e.inactive).length,
            enrichedBiography: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
                actor.creature.details.biography,
                { relativeTo: actor, secrets: actor.isOwner },
            ),
        } as never;
    }

    protected override async _preparePartContext(partId: string, context: never, options: never): Promise<never> {
        const partContext = (await super._preparePartContext(partId, context, options)) as unknown as Record<string, unknown>;
        const tabs = partContext.tabs as Record<string, unknown> | undefined;
        if (tabs && partId in tabs) partContext.tab = tabs[partId];
        return partContext as never;
    }

    /** Whether the Effects tab's Equipment section is open; remembered across re-renders, closed by default. */
    #equipmentEffectsOpen = false;

    protected override async _onRender(context: never, options: never): Promise<void> {
        await super._onRender(context, options);
        this.element.querySelector<HTMLDetailsElement>("details.equipment-effects")?.addEventListener("toggle", (event) => {
            this.#equipmentEffectsOpen = (event.currentTarget as HTMLDetailsElement).open;
        });
        // Passive states (Thief stance, tide) are edited inline on the passive item.
        for (const select of this.element.querySelectorAll<HTMLSelectElement>("select[data-passive-state]")) {
            select.addEventListener("change", (event) => {
                event.stopPropagation();
                const item = this.#itemFromElement(select);
                if (item) void setState(item, select.dataset.passiveState!, select.value);
            });
        }
        for (const input of this.element.querySelectorAll<HTMLInputElement>("input[data-passive-resource]")) {
            input.addEventListener("change", (event) => {
                event.stopPropagation();
                const item = this.#itemFromElement(input);
                if (item) void item.update({ [`system.resources.${input.dataset.passiveResource}`]: Math.max(0, Number(input.value) || 0) } as never);
            });
        }
        // Skill points are edited inline on embedded items, which the actor form can't submit on its own.
        for (const input of this.element.querySelectorAll<HTMLInputElement>("input[data-item-points]")) {
            input.addEventListener("change", (event) => {
                event.stopPropagation();
                const item = this.#itemFromElement(input);
                const points = Math.clamp(Number(input.value) || 0, 0, SKILL_MAX_POINTS);
                void item?.update({ system: { points } } as never);
            });
        }
    }

    /* -------------------------------------------- */
    /*  Drag and drop                               */
    /* -------------------------------------------- */

    /** Only one race at a time, and no duplicate skills. */
    protected override async _onDropItem(event: DragEvent, item: Item.Implementation): Promise<Item.Implementation | null> {
        const actor = this.barbsActor;
        if (item.parent === actor) return super._onDropItem(event, item);

        if (item.type === "skill" && actor.items.some((i) => i.type === "skill" && i.name === item.name)) {
            ui.notifications?.info(`${actor.name} already knows ${item.name}.`);
            return null;
        }
        if (item.type === "race") {
            const existing = actor.items.filter((i) => i.type === "race").map((i) => i.id!);
            if (existing.length) await actor.deleteEmbeddedDocuments("Item", existing);
        }
        return super._onDropItem(event, item);
    }

    /* -------------------------------------------- */
    /*  Actions                                     */
    /* -------------------------------------------- */

    #itemFromElement(element: HTMLElement): Item.Implementation | undefined {
        const id = element.closest<HTMLElement>("[data-item-id]")?.dataset.itemId;
        return id ? this.barbsActor.items.get(id) : undefined;
    }

    #effectFromElement(element: HTMLElement): ActiveEffect.Implementation | undefined {
        const row = element.closest<HTMLElement>("[data-effect-id]");
        if (!row) return undefined;
        const { effectId, parentId } = row.dataset;
        const parent = parentId ? this.barbsActor.items.get(parentId) : this.barbsActor;
        return parent?.effects.get(effectId!) as ActiveEffect.Implementation | undefined;
    }

    static async #onRollAttribute(this: BarbsCharacterSheet, _event: PointerEvent, target: HTMLElement) {
        await this.barbsActor.rollAttribute(target.dataset.attribute as AttributeKey);
    }

    static async #onRollSkill(this: BarbsCharacterSheet, _event: PointerEvent, target: HTMLElement) {
        const item = this.#itemFromElement(target);
        if (item) await this.barbsActor.rollSkill(item);
    }

    /**
     * Everything else gear and buffs can change, grouped like the Roll20 sheet's Stats tab: misc combat stats, damage
     * multipliers, penetration, damage reduction, and condition resistances. Read-only: effects set them.
     */
    #statSections(rb: RollBonusSummary) {
        const d = this.barbsActor.creature.derived;
        const pct = (v: number) => `${v > 0 ? "+" : ""}${v}%`;
        const row = (label: string, value: number, text = pct(value), hint?: string) => ({ label, value, text, hint, zero: !value });
        // A stat bucket plus the always-on roll modifiers for it, with a tooltip naming where it comes from.
        const withMods = (label: string, base: number, key: string, format = pct, hint?: string) => {
            const total = base + bonusTotal(rb, key);
            const sources = bonusSources(rb, key, { label: "Changes", value: base });
            return row(label, total, format(total), [hint, sources].filter(Boolean).join(" — ") || undefined);
        };
        const conditions = STATUSES.filter((st) => st.category === "condition");
        const cr = d.stats.conditionResist.value;
        const mr = d.stats.magicResist.value;
        return [
            {
                label: "Miscellaneous",
                rows: [
                    ...Object.entries(COMBAT_STATS).filter(([key]) => key !== "accuracy").map(([key, c]) => {
                        const v = d.combat?.[key as keyof typeof COMBAT_STATS] ?? 0;
                        const format = (x: number) => (c.unit === "%" ? pct(x) : `${x > 0 ? "+" : ""}${x}${c.unit}`);
                        return withMods(c.label, v, `combat.${key}`, format, c.hint);
                    }),
                    row("Initiative Bonus", d.initiativeBonus, `${d.initiativeBonus > 0 ? "+" : ""}${d.initiativeBonus}`),
                    row("Buff Effectiveness", d.buffEffectiveness),
                    row("All Skill Checks", d.skillBonus, `${d.skillBonus > 0 ? "+" : ""}${d.skillBonus}`),
                    row("Downed Health", d.downedBonus, `${d.downedBonus > 0 ? "+" : ""}${d.downedBonus}`),
                ],
            },
            {
                label: "Damage Multipliers",
                rows: MULTIPLIER_STAT_KEYS.map((k) => withMods(damageBucketLabel(k), d.damageMultiplier?.[k] ?? 0, `multiplier.${k}`)),
            },
            {
                label: "Accuracy & Penetration",
                rows: [
                    withMods(COMBAT_STATS.accuracy.label, d.combat?.accuracy ?? 0, "combat.accuracy", pct, COMBAT_STATS.accuracy.hint),
                    ...PENETRATION_STAT_KEYS.map((k) =>
                        withMods(
                            k === "physical" ? "Armor (AC) penetration" : k === "allMagic" ? "General magic penetration" : `${damageBucketLabel(k)} penetration`,
                            d.penetration?.[k] ?? 0,
                            `penetration.${k}`,
                        ),
                    ),
                ],
            },
            {
                label: "Damage Reduction",
                rows: [
                    row("General (GDR)", d.damageReduction),
                    { label: "AC", value: d.stats.ac.value, text: String(d.stats.ac.value), zero: false },
                    { label: "Magic Resist", value: mr, text: `${mr}%`, zero: false },
                    ...ELEMENTS.map((e) => {
                        const bonus = d.elementResist[e] ?? 0;
                        return { label: `${damageBucketLabel(e)} MR`, value: bonus, text: `${mr + bonus}%`, zero: !bonus };
                    }),
                    ...Object.entries(d.vulnerability).map(([k, v]) =>
                        row(`${damageBucketLabel(k === "magic" ? "allMagic" : k)} vulnerability`, v, v <= -100 ? "Immune" : pct(v)),
                    ),
                ],
            },
            {
                label: "Condition Resistances",
                rows: [
                    { label: "Condition Resist", value: cr, text: `${cr}%`, zero: false },
                    ...conditions.map((st) => {
                        const immune = !!d.conditionImmunity?.[st.id];
                        const bonus = d.conditionResistBonus?.[st.id] ?? 0;
                        return { label: st.name, value: bonus, text: immune ? "Immune" : `${cr + bonus}%`, zero: !bonus && !immune };
                    }),
                ],
            },
            // Everything that only applies sometimes (a weapon's own mods, "bow attacks", on crit, next roll) or isn't
            // a stat at all (on-hit damage, statuses), spelled out.
            ...(rb.other.length ? [{ label: "Conditional & On-hit Bonuses", rows: [], lines: rb.other, wide: true }] : []),
        ];
    }

    static async #onUseAbility(this: BarbsCharacterSheet, _event: PointerEvent, target: HTMLElement) {
        const item = this.#itemFromElement(target);
        if (item) await this.barbsActor.useAbility(item, (target.dataset.hand as Hand | undefined) ?? "main");
    }

    static async #onDualWieldAttack(this: BarbsCharacterSheet) {
        await this.barbsActor.dualWieldAttack();
    }

    static async #onWeaponAttack(this: BarbsCharacterSheet, _event: PointerEvent, target: HTMLElement) {
        const item = this.#itemFromElement(target);
        if (item) await this.barbsActor.weaponAttack(item);
    }

    static async #onRollPercentStat(this: BarbsCharacterSheet, _event: PointerEvent, target: HTMLElement) {
        await this.barbsActor.rollPercentStat(target.dataset.stat as "evasion" | "conditionResist");
    }

    static async #onPassiveResource(this: BarbsCharacterSheet, _event: PointerEvent, target: HTMLElement) {
        await adjustResource(this.barbsActor as unknown as Actor.Implementation, target.dataset.key!, Number(target.dataset.delta) || 0);
    }

    static async #onPassiveAction(this: BarbsCharacterSheet, _event: PointerEvent, target: HTMLElement) {
        const item = this.#itemFromElement(target);
        const action = item && getPassiveAutomation(item)?.actions?.find((a) => a.key === target.dataset.key);
        if (item && action) await action.run(passiveHandle(item));
    }

    static async #onRollInitiative(this: BarbsCharacterSheet) {
        await this.barbsActor.rollInitiative({ createCombatants: true });
    }

    static async #onDeathSave(this: BarbsCharacterSheet) {
        await this.barbsActor.rollDeathSave();
    }

    static async #onShortRest(this: BarbsCharacterSheet) {
        await this.barbsActor.rest("short");
    }

    static async #onLongRest(this: BarbsCharacterSheet) {
        await this.barbsActor.rest("long");
    }

    static async #onCreateItem(this: BarbsCharacterSheet, _event: PointerEvent, target: HTMLElement) {
        const type = target.dataset.type ?? "equipment";
        await this.barbsActor.createEmbeddedDocuments("Item", [{ name: `New ${type}`, type } as never]);
    }

    static #onEditItem(this: BarbsCharacterSheet, _event: PointerEvent, target: HTMLElement) {
        void this.#itemFromElement(target)?.sheet?.render(true);
    }

    static async #onDeleteItem(this: BarbsCharacterSheet, _event: PointerEvent, target: HTMLElement) {
        await this.#itemFromElement(target)?.deleteDialog();
    }

    static async #onToggleEquipped(this: BarbsCharacterSheet, _event: PointerEvent, target: HTMLElement) {
        const item = this.#itemFromElement(target);
        if (item) await item.update({ system: { equipped: !(item.system as unknown as EquipmentModel).equipped } } as never);
    }

    static #onOpenCompendium(this: BarbsCharacterSheet, _event: PointerEvent, target: HTMLElement) {
        void game.packs?.get(`${SYSTEM_ID}.${target.dataset.pack}`)?.render(true);
    }

    static async #onCreateEffect(this: BarbsCharacterSheet) {
        await this.barbsActor.createEmbeddedDocuments("ActiveEffect", [
            { name: "New Effect", img: "icons/svg/aura.svg" } as never,
        ]);
    }

    static #onEditEffect(this: BarbsCharacterSheet, _event: PointerEvent, target: HTMLElement) {
        void this.#effectFromElement(target)?.sheet?.render(true);
    }

    static async #onDeleteEffect(this: BarbsCharacterSheet, _event: PointerEvent, target: HTMLElement) {
        await this.#effectFromElement(target)?.delete();
    }

    static async #onToggleEffect(this: BarbsCharacterSheet, _event: PointerEvent, target: HTMLElement) {
        const effect = this.#effectFromElement(target);
        if (effect) await effect.update({ disabled: !effect.disabled });
    }
}
