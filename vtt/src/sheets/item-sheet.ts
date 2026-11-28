import {
    ATTRIBUTES,
    COST_RESOURCES,
    DAMAGE_TYPES,
    EQUIPMENT_SLOTS,
    SKILL_MAX_POINTS,
    SYSTEM_ID,
    WEAPON_CATEGORIES,
    WEAPON_SCALING,
} from "../config.ts";
import { describeBonus, describeTrigger } from "../effects/bonuses.ts";
import { groupEffects, isTemplate, type EffectLike } from "../effects/templates.ts";
import type { BarbsEffectModel } from "../data/effect.ts";
import { getPassiveAutomation } from "../passives/index.ts";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

const TEMPLATES = `systems/${SYSTEM_ID}/templates/item`;

type ActionHandler = (this: BarbsItemSheet, event: PointerEvent, target: HTMLElement) => void | Promise<void>;

/** What the system automates for a passive, shown on its sheet. */
function describePassive(item: Item.Implementation): string[] | null {
    const a = getPassiveAutomation(item);
    if (!a) return null;
    return [
        ...(a.monkMastery ? ["Raises monk mastery (dU die size and base combo chance)."] : []),
        ...(a.resources ?? []).map((r) => `Tracks ${r.label}${r.max ? ` (max ${r.max})` : ""}${r.gainOnTurnStart ? `, +${r.gainOnTurnStart} each turn` : ""}${r.resetOn?.length ? `, resets on ${r.resetOn.join("/")}` : ""}.`),
        ...(a.states ?? []).map((st) => `Tracks ${st.label}: ${Object.values(st.options).join(" / ")}.`),
        ...(a.actions ?? []).map((ac) => `Sheet action: ${ac.label}.`),
        ...(a.rollHook ? ["Adjusts your rolls automatically."] : []),
        ...(a.abilityChoices ? ["Adds options to relevant ability dialogs."] : []),
        ...(a.afterUse ? ["Reacts automatically when you use abilities."] : []),
        ...(a.extraTargets ? ["Adds Apply buttons to relevant ability cards."] : []),
        ...(a.notes ?? []),
    ];
}

/**
 * One sheet class for every item type. The header is shared; the details part swaps its template per type.
 * List fields that come from the rulebook (race traits, class branches, skill rank notes) are shown read-only for now.
 */
/**
 * An item's main effect: where its affixes live, opened by "Edit bonuses". The one made by that button (flagged), or
 * else the first effect that isn't a template, for items set up before the button existed.
 */
function mainEffect(item: Item.Implementation): ActiveEffect.Implementation | undefined {
    const effects = [...item.effects] as ActiveEffect.Implementation[];
    return (
        effects.find((e) => foundry.utils.getProperty(e, `flags.${SYSTEM_ID}.mainEffect`)) ??
        effects.find((e) => !isTemplate(e as unknown as EffectLike))
    );
}

/**
 * What an item's effects do, as lines for its sheet: each regular effect's bonuses and triggers (main effect first),
 * with what a granted template does under the trigger that grants it.
 */
function bonusSummary(item: Item.Implementation): { id: string; name: string; lines: { text: string; sub: string[] }[] }[] {
    const effects = [...item.effects] as ActiveEffect.Implementation[];
    const main = mainEffect(item);
    const regular = effects.filter((e) => !isTemplate(e as unknown as EffectLike)).sort((a, b) => Number(b === main) - Number(a === main));
    const bonusLines = (e: ActiveEffect.Implementation) => ((e.system as unknown as BarbsEffectModel).modifiers ?? []).map(describeBonus);
    return regular.map((effect) => {
        const system = effect.system as unknown as BarbsEffectModel;
        const triggers = (system.triggers ?? []).map((t) => {
            const name = t.effectData ? null : (t.effect || t.value || "").trim();
            const template = name ? effects.find((e) => e.name === name && isTemplate(e as unknown as EffectLike)) : undefined;
            const stacks = Number(foundry.utils.getProperty(template ?? {}, `flags.${SYSTEM_ID}.maxStacks`) ?? 1);
            const sub = template ? [...bonusLines(template), ...(stacks > 1 && stacks < 999 ? [`stacks up to ${stacks} times`] : [])] : [];
            return { text: describeTrigger(t), sub };
        });
        return { id: effect.id!, name: effect.name, lines: [...bonusLines(effect).map((text) => ({ text, sub: [] })), ...triggers] };
    });
}

export class BarbsItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
    static override DEFAULT_OPTIONS = {
        classes: [SYSTEM_ID, "item"],
        position: { width: 560, height: 640 },
        window: { resizable: true },
        form: { submitOnChange: true },
        actions: {
            createEffect: BarbsItemSheet.#onCreateEffect as ActionHandler,
            editBonuses: BarbsItemSheet.#onEditBonuses as ActionHandler,
            editEffect: BarbsItemSheet.#onEditEffect as ActionHandler,
            deleteEffect: BarbsItemSheet.#onDeleteEffect as ActionHandler,
        },
    };

    static override PARTS = {
        header: { template: `${TEMPLATES}/header.hbs` },
        details: {
            template: `${TEMPLATES}/skill.hbs`,
            templates: [`${TEMPLATES}/effects-list.hbs`],
            scrollable: [""],
        },
    };

    protected override _configureRenderParts(options: never) {
        const parts = super._configureRenderParts(options) as Record<string, { template: string }>;
        parts.details.template = `${TEMPLATES}/${this.document.type}.hbs`;
        return parts as never;
    }

    protected override async _prepareContext(options: never): Promise<never> {
        const context = (await super._prepareContext(options)) as unknown as Record<string, unknown>;
        const item = this.document;
        const system = item.system as unknown as Record<string, unknown>;
        const enrich = (html: unknown) =>
            foundry.applications.ux.TextEditor.implementation.enrichHTML(String(html ?? ""), {
                relativeTo: item,
                secrets: item.isOwner,
            });

        return {
            ...context,
            item,
            system,
            editable: this.isEditable,
            enrichedDescription: await enrich(system.description),
            enrichedFlavor: await enrich(system.flavorText),
            attributeChoices: Object.fromEntries(Object.values(ATTRIBUTES).map((a) => [a.key, a.label])),
            costResourceChoices: Object.fromEntries(COST_RESOURCES.map((r) => [r, r ? r.capitalize() : "—"])),
            slotChoices: EQUIPMENT_SLOTS,
            useTargetChoices: { self: "Yourself", target: "Targeted creatures" },
            restoreChoices: { "": "—", stamina: "Stamina", mana: "Mana" },
            weaponCategoryChoices: WEAPON_CATEGORIES,
            weaponScalingChoices: WEAPON_SCALING,
            damageTypeChoices: Object.fromEntries(DAMAGE_TYPES.map((d) => [d, d.capitalize()])),
            skillMaxPoints: SKILL_MAX_POINTS,
            // Templates are listed under the effect whose trigger grants them.
            effectGroups: groupEffects(item.effects as unknown as Iterable<EffectLike>),
            usable: !!(item.system as unknown as { use?: { enabled?: boolean } }).use?.enabled,
            bonusSummary: bonusSummary(item),
            effectCount: item.effects.size,
            automation: item.type === "passive" ? describePassive(item) : null,
        } as never;
    }

    #effectFromElement(element: HTMLElement): ActiveEffect.Implementation | undefined {
        const id = element.closest<HTMLElement>("[data-effect-id]")?.dataset.effectId;
        return id ? (this.document.effects.get(id) as ActiveEffect.Implementation | undefined) : undefined;
    }

    static async #onCreateEffect(this: BarbsItemSheet) {
        // transfer: true makes the effect apply to whoever owns (and, for equipment, has equipped) the item.
        await this.document.createEmbeddedDocuments("ActiveEffect", [
            { name: `${this.document.name} effect`, img: this.document.img, transfer: true } as never,
        ]);
    }

    /** Open the item's main effect (its affixes), making it the first time. */
    static async #onEditBonuses(this: BarbsItemSheet) {
        let effect = mainEffect(this.document);
        if (!effect) {
            // Applies to whoever has the item equipped, like any gear effect. Named after the item, since it *is* the
            // item's bonuses as far as the effects panel and Stats tooltips are concerned.
            [effect] = (await this.document.createEmbeddedDocuments("ActiveEffect", [
                { name: this.document.name, img: this.document.img, transfer: true, flags: { [SYSTEM_ID]: { mainEffect: true } } } as never,
            ])) as unknown as ActiveEffect.Implementation[];
        }
        await effect?.sheet?.render({ force: true } as never);
    }

    static #onEditEffect(this: BarbsItemSheet, _event: PointerEvent, target: HTMLElement) {
        void this.#effectFromElement(target)?.sheet?.render(true);
    }

    static async #onDeleteEffect(this: BarbsItemSheet, _event: PointerEvent, target: HTMLElement) {
        await this.#effectFromElement(target)?.delete();
    }
}
