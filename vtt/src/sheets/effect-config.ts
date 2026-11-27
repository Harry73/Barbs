import {
    DAMAGE_TYPES,
    EFFECT_CATEGORIES,
    MODIFIER_ROLL_TYPES,
    MODIFIER_TYPES,
    SYSTEM_ID,
    TRIGGER_ACTIONS,
    TRIGGER_EVENTS,
    WEAPON_CATEGORIES,
    WEAPON_FILTERS,
} from "../config.ts";
import type { RollModifierData, TriggerData } from "../data/effect.ts";
import { changeKeyGroups } from "../effects/change-keys.ts";

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
            addTrigger: BarbsEffectConfig.#onAddTrigger as ActionHandler,
            deleteTrigger: BarbsEffectConfig.#onDeleteTrigger as ActionHandler,
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
            const system = (
                this.document._source as unknown as { system: { category: string; singleUse: boolean; modifiers: RollModifierData[]; triggers: TriggerData[] } }
            ).system;
            const maxStacks = Number(foundry.utils.getProperty(this.document._source, `flags.${SYSTEM_ID}.maxStacks`) ?? 1) || 1;
            // Template effects next to this one, for grant/inflict triggers to pick from.
            const siblings = ((this.document.parent as { effects?: Iterable<ActiveEffect.Implementation> } | null)?.effects ?? []) as Iterable<ActiveEffect.Implementation>;
            const templates = [...siblings].filter((e) => (e.system as unknown as { template?: boolean }).template && e.id !== this.document.id).map((e) => e.name);
            Object.assign(partContext, {
                barbs: system,
                maxStacks: maxStacks >= 999 ? "" : maxStacks,
                modifiers: system.modifiers.map((m, index) => ({ ...m, index })),
                triggers: (system.triggers ?? []).map((t, index) => ({ ...t, index, inline: !!t.effectData })),
                eventChoices: TRIGGER_EVENTS,
                actionChoices: TRIGGER_ACTIONS,
                onceChoices: { "": "Every time", turn: "Once per turn", round: "Once per round", once: "Only once" },
                templateChoices: Object.fromEntries([["", "—"], ...templates.map((n) => [n, n])]),
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
        const system = data.system as { modifiers?: unknown; triggers?: unknown } | undefined;
        if (system?.modifiers && foundry.utils.getType(system.modifiers) === "Object") {
            system.modifiers = Object.values(system.modifiers as object);
        }
        if (system?.triggers && foundry.utils.getType(system.triggers) === "Object") {
            // Keep inline effect data (from ability automation) that the form doesn't show.
            const current = (this.document._source as unknown as { system: { triggers: TriggerData[] } }).system.triggers ?? [];
            system.triggers = Object.entries(system.triggers as Record<string, TriggerData>).map(([i, t]) => ({
                ...t,
                chance: Number(t.chance) || 0,
                effectData: current[Number(i)]?.effectData ?? null,
            }));
        }
        // "Max stacks" is a flag (blank = without limit, stored as a large number like other stacking effects).
        const stacks = foundry.utils.getProperty(data, `flags.${SYSTEM_ID}.maxStacks`);
        if (stacks !== undefined) foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.maxStacks`, Number(stacks) > 0 ? Number(stacks) : 999);
        return data as never;
    }

    /**
     * Core renders each change's key as free text, and nobody remembers `system.stats.conditionResist.bonus`. Swap it
     * for a searchable picker over every key Barbs creatures understand: type any words from the label, group, or
     * key ("fire pen", "stun cr") and pick from the menu. The real key rides along in a hidden input.
     *
     * A key that isn't in the list (typed by hand, or from an older version) shows as-is and is kept, so opening the
     * sheet never changes an effect. Typing a full `system.` path and pressing Enter sets a custom key.
     */
    /** Listeners the key pickers put on the document; replaced each render and dropped on close. */
    #pickerListeners: AbortController | null = null;

    protected override async _onRender(context: never, options: never): Promise<void> {
        await super._onRender(context, options);
        this.#pickerListeners?.abort();
        this.#pickerListeners = new AbortController();
        const entries = changeKeyGroups().flatMap((g) =>
            g.keys.map((k) => ({ identifier: k.key, label: `${k.label} (${g.label})`, search: `${k.label} ${g.label} ${k.key}`.toLowerCase() })),
        );
        const labels = new Map(entries.map((e) => [e.identifier, e.label]));
        for (const input of this.element.querySelectorAll<HTMLInputElement>('.tab.changes input[name$=".key"]')) {
            this.#makeKeyPicker(input, entries, labels);
        }
    }

    protected override _onClose(options: never): void {
        super._onClose(options);
        this.#pickerListeners?.abort();
        this.#pickerListeners = null;
    }

    #makeKeyPicker(
        original: HTMLInputElement,
        entries: { identifier: string; label: string; search: string }[],
        labels: Map<string, string>,
    ): void {
        const hidden = document.createElement("input");
        hidden.type = "hidden";
        hidden.name = original.name;
        hidden.value = original.value;

        const search = document.createElement("input");
        search.type = "text";
        search.className = "barbs-key-search";
        search.disabled = original.disabled;
        search.placeholder = "Search: AC, fire pen, stun CR...";
        const shown = () => (hidden.value ? (labels.get(hidden.value) ?? hidden.value) : "");
        search.value = shown();
        search.dataset.tooltip = hidden.value;

        const Autocomplete = foundry.applications.ux.Autocomplete as unknown as {
            implementation: new (options: { onSelect: (identifier: string) => void }) => {
                activate(target: HTMLElement, entries: { identifier: string; label: string }[]): void;
                select(increment?: number): void;
                dismiss(): void;
                element: HTMLElement | null;
            };
        };
        const choose = (key: string) => {
            hidden.value = key;
            search.value = shown();
            search.dataset.tooltip = key;
        };
        const menu = new Autocomplete.implementation({ onSelect: choose });
        const refresh = () => {
            // Every word typed has to appear somewhere in the label, group, or key. Empty search lists everything.
            const words = search.value.toLowerCase().split(/\s+/).filter(Boolean);
            const typingFresh = search.value !== shown();
            const matches = typingFresh ? entries.filter((e) => words.every((w) => e.search.includes(w))) : entries;
            if (!matches.length) return menu.dismiss();
            menu.activate(search, matches);
            // Highlight the best match while searching, so Enter picks it.
            if (typingFresh) menu.select(0);
        };
        search.addEventListener("focus", () => {
            search.select();
            refresh();
        });
        search.addEventListener("click", refresh);
        search.addEventListener("input", refresh);
        search.addEventListener("keydown", (event) => {
            // Enter on a menu entry is handled by the menu before this runs. Otherwise Enter would submit (and
            // close) the sheet, so swallow it, unless it's a full path typed by hand for a key the list doesn't have.
            if (event.key !== "Enter") return;
            event.preventDefault();
            if (search.value.trim().startsWith("system.")) choose(search.value.trim());
            else search.value = shown();
            menu.dismiss();
        });
        // Leaving without picking puts the current choice back.
        search.addEventListener("blur", () => {
            setTimeout(() => {
                if (document.activeElement !== search) search.value = shown();
            }, 200);
        });
        // Clicking anywhere else closes the menu.
        document.body.addEventListener(
            "click",
            (event) => {
                const target = event.target as Node;
                if (target === search || menu.element?.contains(target)) return;
                if ((ui as unknown as { autocomplete?: unknown }).autocomplete === menu) menu.dismiss();
            },
            { signal: this.#pickerListeners!.signal },
        );

        original.replaceWith(hidden, search);
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

    #currentTriggers(): TriggerData[] {
        const data = this._processFormData(null, this.form!, new FormDataExtended(this.form!) as never) as { system?: { triggers?: TriggerData[] } };
        return data.system?.triggers ?? [];
    }

    static async #onAddTrigger(this: BarbsEffectConfig) {
        const triggers = this.#currentTriggers();
        triggers.push({ event: "hit", conditions: "", chance: 0, oncePer: "", consume: false, action: "restore", value: "", type: "stamina", effect: "", effectData: null });
        await this.submit({ updateData: { system: { triggers } } } as never);
    }

    static async #onDeleteTrigger(this: BarbsEffectConfig, _event: PointerEvent, target: HTMLElement) {
        const triggers = this.#currentTriggers();
        triggers.splice(Number(target.closest<HTMLElement>("[data-trigger-index]")?.dataset.triggerIndex), 1);
        await this.submit({ updateData: { system: { triggers } } } as never);
    }

    static async #onDeleteModifier(this: BarbsEffectConfig, _event: PointerEvent, target: HTMLElement) {
        const modifiers = this.#currentModifiers();
        modifiers.splice(Number(target.closest<HTMLElement>("[data-index]")?.dataset.index), 1);
        await this.submit({ updateData: { system: { modifiers } } } as never);
    }
}
