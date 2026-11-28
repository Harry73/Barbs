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
import { groupEffects, type EffectLike } from "../effects/templates.ts";
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
export class BarbsItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
    static override DEFAULT_OPTIONS = {
        classes: [SYSTEM_ID, "item"],
        position: { width: 560, height: 640 },
        window: { resizable: true },
        form: { submitOnChange: true },
        actions: {
            createEffect: BarbsItemSheet.#onCreateEffect as ActionHandler,
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

    static #onEditEffect(this: BarbsItemSheet, _event: PointerEvent, target: HTMLElement) {
        void this.#effectFromElement(target)?.sheet?.render(true);
    }

    static async #onDeleteEffect(this: BarbsItemSheet, _event: PointerEvent, target: HTMLElement) {
        await this.#effectFromElement(target)?.delete();
    }
}
