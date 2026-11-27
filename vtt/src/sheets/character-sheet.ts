import {
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
        const stats = STAT_KEYS.map((key) => ({
            key,
            ...STATS[key],
            ...system.stats[key],
            rollable: rollableStats.has(key),
            override: overrides[key] ?? "",
        }));

        const skills = ofType("skill").map((item) => {
            const s = item.system as unknown as SkillModel;
            return {
                item,
                rank: s.rank,
                points: s.points,
                attribute: ATTRIBUTES[s.attribute as AttributeKey]?.abbreviation ?? "?",
                modifier: s.modifier,
            };
        });

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
            abilityGroups.get(name)!.abilities.push({ item, system: a, automated: !!getAutomation(a.className, item.name) });
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
        const heldWeapons = equipment.filter((e) => e.system.isHeldWeapon);

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
                category: system.category,
                summary,
                inactive: !effect.active,
                duration: (effect.duration as { label?: string }).label ?? "",
            };
        });

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
            stats,
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
            effects,
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

    protected override async _onRender(context: never, options: never): Promise<void> {
        await super._onRender(context, options);
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

    static async #onUseAbility(this: BarbsCharacterSheet, _event: PointerEvent, target: HTMLElement) {
        const item = this.#itemFromElement(target);
        if (item) await this.barbsActor.useAbility(item);
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
