import {
    DAMAGE_TYPES,
    EFFECT_CATEGORIES,
    MODIFIER_ROLL_TYPES,
    MODIFIER_TYPES,
    SYSTEM_ID,
    WEAPON_CATEGORIES,
    WEAPON_FILTERS,
} from "../config.ts";
import type { RollModifierData } from "../data/effect.ts";

const { ActiveEffectConfig } = foundry.applications.sheets;
const { FormDataExtended } = foundry.applications.ux;

type ActionHandler = (this: BarbsEffectConfig, event: PointerEvent, target: HTMLElement) => void | Promise<void>;

const { footer, ...coreParts } = ActiveEffectConfig.PARTS as Record<string, object>;
const coreTabs = (ActiveEffectConfig.TABS as unknown as { sheet: { tabs: object[] } }).sheet;

/**
 * Core effect config plus a "Barbs" tab for the effect's category, single-use flag, and roll modifiers. This is how
 * players build ad-hoc buffs by hand, like the Roll20 sheet's "Effect Creator" box.
 */
export class BarbsEffectConfig extends ActiveEffectConfig {
    static override DEFAULT_OPTIONS = {
        classes: [SYSTEM_ID],
        actions: {
            addModifier: BarbsEffectConfig.#onAddModifier as ActionHandler,
            deleteModifier: BarbsEffectConfig.#onDeleteModifier as ActionHandler,
        },
    };

    static override PARTS = {
        ...coreParts,
        barbs: { template: `systems/${SYSTEM_ID}/templates/effect/barbs.hbs`, scrollable: [""] },
        footer,
    } as never;

    static override TABS = {
        sheet: {
            ...coreTabs,
            tabs: [...coreTabs.tabs, { id: "barbs", icon: "fa-solid fa-dice-d20", label: "Barbs" }],
        },
    } as never;

    protected override async _preparePartContext(partId: string, context: never, options: never): Promise<never> {
        const partContext = (await super._preparePartContext(partId, context, options)) as unknown as Record<string, unknown>;
        if (partId === "barbs") {
            const system = (this.document._source as unknown as { system: { category: string; singleUse: boolean; modifiers: RollModifierData[] } }).system;
            Object.assign(partContext, {
                barbs: system,
                modifiers: system.modifiers.map((m, index) => ({ ...m, index })),
                categoryChoices: EFFECT_CATEGORIES,
                typeChoices: MODIFIER_TYPES,
                rollTypeChoices: Object.fromEntries(MODIFIER_ROLL_TYPES.map((r) => [r, r.capitalize()])),
                damageTypeChoices: {
                    all: "All",
                    allMagic: "All magic",
                    ...Object.fromEntries(DAMAGE_TYPES.map((d) => [d, d.capitalize()])),
                    healing: "Healing",
                },
                weaponChoices: { ...WEAPON_CATEGORIES, "": "Any", ...WEAPON_FILTERS },
            });
        }
        return partContext as never;
    }

    /** Form data arrives as { modifiers: { 0: {...}, 1: {...} } }; the schema wants an array. */
    protected override _processFormData(event: SubmitEvent | null, form: HTMLFormElement, formData: never) {
        const data = super._processFormData(event, form, formData) as Record<string, unknown>;
        const system = data.system as { modifiers?: unknown } | undefined;
        if (system?.modifiers && foundry.utils.getType(system.modifiers) === "Object") {
            system.modifiers = Object.values(system.modifiers as object);
        }
        return data as never;
    }

    #currentModifiers(): RollModifierData[] {
        const data = this._processFormData(null, this.form!, new FormDataExtended(this.form!) as never) as {
            system?: { modifiers?: RollModifierData[] };
        };
        return data.system?.modifiers ?? [];
    }

    static async #onAddModifier(this: BarbsEffectConfig) {
        const modifiers = this.#currentModifiers();
        modifiers.push({ type: "damage", rollType: "physical", damageType: "physical", weapon: "", value: "" });
        await this.submit({ updateData: { system: { modifiers } } } as never);
    }

    static async #onDeleteModifier(this: BarbsEffectConfig, _event: PointerEvent, target: HTMLElement) {
        const modifiers = this.#currentModifiers();
        modifiers.splice(Number(target.closest<HTMLElement>("[data-index]")?.dataset.index), 1);
        await this.submit({ updateData: { system: { modifiers } } } as never);
    }
}
