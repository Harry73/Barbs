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
import { bonusCatalog } from "../effects/bonuses.ts";
import { changeKeyGroups } from "../effects/change-keys.ts";
import { grantersOf, isTemplate, type EffectLike } from "../effects/templates.ts";

const { ActiveEffectConfig } = foundry.applications.sheets;
const { FormDataExtended } = foundry.applications.ux;

type ActionHandler = (this: BarbsEffectConfig, event: PointerEvent, target: HTMLElement) => void | Promise<void>;

const { footer, ...coreParts } = ActiveEffectConfig.PARTS as Record<string, object>;
const coreTabs = (ActiveEffectConfig.TABS as unknown as { sheet: { tabs: object[] } }).sheet;

/** Bonuses that deal damage of one type, so "All" isn't a choice for them. */
const DAMAGE_NEEDS_TYPE = new Set(["damage", "dot"]);

/** Trigger actions that copy a template effect onto someone. */
const GRANT_ACTIONS = new Set(["grant", "inflict"]);

/** A trigger row's Effect column (and its edit button) only means something for grant/inflict. */
function syncTriggerRow(row: HTMLElement): void {
    const grants = GRANT_ACTIONS.has(row.querySelector<HTMLSelectElement>("select[name$='.action']")?.value ?? "");
    const cell = row.querySelector<HTMLElement>("td.barbs-trigger-effect");
    if (!cell) return;
    cell.classList.toggle("muted", !grants);
    for (const field of cell.querySelectorAll<HTMLSelectElement>("select")) field.disabled = !grants;
    cell.querySelector<HTMLElement>("[data-action='editGranted']")?.toggleAttribute("hidden", !grants);
}

/**
 * Which of a bonus row's other columns mean anything for its type: stat bonuses and blocks are always on, damage over
 * time only has a damage type, and attack bonuses use them all. The rest are greyed out.
 */
function syncBonusRow(row: HTMLElement): void {
    const type = row.querySelector<HTMLInputElement>('input[name$=".type"]')?.value ?? "";
    const applies = (field: string) => (type === "stat" || type === "block" ? false : type === "dot" ? field === "damageType" : true);
    for (const field of row.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-limit]")) {
        const off = !applies(field.dataset.limit ?? "");
        field.disabled = off;
        field.closest("td")?.classList.toggle("muted", off);
    }
}

/**
 * Core effect config plus a "Barbs" tab (first, and open by default) for the effect's settings, its Bonuses, and its
 * Triggers. This is how players build gear affixes and ad-hoc buffs by hand, like the Roll20 sheet's "Effect
 * Creator" box.
 */
export class BarbsEffectConfig extends ActiveEffectConfig {
    static override DEFAULT_OPTIONS = {
        classes: [SYSTEM_ID],
        // Twice core's width: the modifier and trigger tables have a lot of columns.
        position: { width: 1120 },
        window: { resizable: true },
        actions: {
            addModifier: BarbsEffectConfig.#onAddModifier as ActionHandler,
            deleteModifier: BarbsEffectConfig.#onDeleteModifier as ActionHandler,
            addTrigger: BarbsEffectConfig.#onAddTrigger as ActionHandler,
            deleteTrigger: BarbsEffectConfig.#onDeleteTrigger as ActionHandler,
            editGranted: BarbsEffectConfig.#onEditGranted as ActionHandler,
            openEffect: BarbsEffectConfig.#onOpenEffect as ActionHandler,
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
            // Barbs first and open by default: it's where nearly everything about an effect is set up.
            tabs: [{ id: "barbs", icon: "fa-solid fa-dice-d20", label: "Barbs" }, ...coreTabs.tabs],
            initial: "barbs",
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
            const template = isTemplate(this.document as unknown as EffectLike);
            const grantedBy = template ? grantersOf(this.document as unknown as EffectLike, siblings as unknown as Iterable<EffectLike>) : [];
            Object.assign(partContext, {
                barbs: system,
                // Templates never apply themselves, so their own triggers never run; say so where it's set up.
                templateWithTriggers: template && (system.triggers ?? []).length > 0,
                // A template's own triggers never run, so it gets no Triggers section (unless it somehow has some, to
                // warn about), and one a trigger grants says so instead of showing the Template checkbox.
                hideTriggers: template && (system.triggers ?? []).length === 0,
                grantedBy: grantedBy.map((e) => ({ id: e.id, name: e.name })),
                maxStacks: maxStacks >= 999 ? "" : maxStacks,
                // Sections start open when they have rows, then stay however they were last left.
                open: {
                    bonuses: this.#open.bonuses ?? system.modifiers.length > 0,
                    triggers: this.#open.triggers ?? (system.triggers ?? []).length > 0,
                },
                modifiers: system.modifiers.map((m, index) => ({ ...m, index })),
                triggers: (system.triggers ?? []).map((t, index) => ({ ...t, index, inline: !!t.effectData, grants: GRANT_ACTIONS.has(t.action) })),
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
    /** Sections the user opened or closed by hand, so a re-render (e.g. adding a row) doesn't undo it. */
    #open: Record<string, boolean> = {};

    /** Listeners the key pickers put on the document; replaced each render and dropped on close. */
    #pickerListeners: AbortController | null = null;

    protected override async _onRender(context: never, options: never): Promise<void> {
        await super._onRender(context, options);
        this.#pickerListeners?.abort();
        this.#pickerListeners = new AbortController();

        // Changes tab: the raw change key, picked from every key Barbs creatures understand.
        const keyEntries = changeKeyGroups().flatMap((g) =>
            g.keys.map((k) => ({ identifier: k.key, label: `${k.label} (${g.label})`, search: `${k.label} ${g.label} ${k.key}`.toLowerCase() })),
        );
        const keyLabels = new Map(keyEntries.map((e) => [e.identifier, e.label]));
        for (const input of this.element.querySelectorAll<HTMLInputElement>('.tab.changes input[name$=".key"]')) {
            const hidden = document.createElement("input");
            hidden.type = "hidden";
            hidden.name = input.name;
            hidden.value = input.value;
            const search = document.createElement("input");
            search.type = "text";
            search.className = "barbs-key-search";
            search.disabled = input.disabled;
            search.placeholder = "Search: AC, fire resist, stun CR...";
            input.replaceWith(hidden, search);
            this.#attachPicker(search, keyEntries, {
                label: () => (hidden.value ? (keyLabels.get(hidden.value) ?? hidden.value) : ""),
                choose: (key) => {
                    hidden.value = key;
                    search.dataset.tooltip = key;
                },
                // A full path typed by hand, for keys the list doesn't have.
                custom: (text) => (text.startsWith("system.") ? text : null),
            });
            search.dataset.tooltip = hidden.value;
        }

        for (const row of this.element.querySelectorAll<HTMLElement>("tr[data-trigger-index]")) {
            row.querySelector("select[name$='.action']")?.addEventListener("change", () => syncTriggerRow(row));
            syncTriggerRow(row);
        }

        for (const section of this.element.querySelectorAll<HTMLDetailsElement>("details.barbs-section")) {
            section.addEventListener("toggle", () => (this.#open[section.dataset.section!] = section.open));
        }

        // Barbs tab: each bonus row picks its kind (a stat, or an attack/on-hit/defense bonus) from one list.
        const bonusEntries = bonusCatalog();
        const bonusLabels = new Map(bonusEntries.map((e) => [e.identifier, e.label]));
        for (const search of this.element.querySelectorAll<HTMLInputElement>("input.barbs-bonus-search")) {
            const row = search.closest<HTMLElement>("tr")!;
            const type = row.querySelector<HTMLInputElement>('input[name$=".type"]')!;
            const key = row.querySelector<HTMLInputElement>('input[name$=".key"]')!;
            const current = () => (type.value === "stat" ? `stat:${key.value}` : `roll:${type.value}`);
            this.#attachPicker(search, bonusEntries, {
                label: () => bonusLabels.get(current()) ?? (type.value === "stat" ? key.value : type.value),
                choose: (id) => {
                    const [kind, value] = [id.slice(0, id.indexOf(":")), id.slice(id.indexOf(":") + 1)];
                    type.value = kind === "stat" ? "stat" : value;
                    key.value = kind === "stat" ? value : "";
                    // New rows start on "All" damage types, which multipliers and penetration take but damage and
                    // damage over time don't: they need a real type.
                    const damageType = row.querySelector<HTMLSelectElement>('select[name$=".damageType"]');
                    if (damageType && DAMAGE_NEEDS_TYPE.has(type.value) && ["all", "allMagic"].includes(damageType.value)) damageType.value = "physical";
                    syncBonusRow(row);
                },
            });
            syncBonusRow(row);
        }
    }

    protected override _onClose(options: never): void {
        super._onClose(options);
        this.#pickerListeners?.abort();
        this.#pickerListeners = null;
    }

    /**
     * A searchable picker on a text box, using core's Autocomplete menu: typing filters the entries (every word must
     * appear in the label or search text), arrows and Enter pick. Leaving without picking restores the current choice,
     * and Enter never submits (and closes) the sheet.
     */
    #attachPicker(
        search: HTMLInputElement,
        entries: { identifier: string; label: string; search: string }[],
        { label, choose, custom }: { label: () => string; choose: (id: string) => void; custom?: (text: string) => string | null },
    ): void {
        const Autocomplete = foundry.applications.ux.Autocomplete as unknown as {
            implementation: new (options: { onSelect: (identifier: string) => void }) => {
                activate(target: HTMLElement, entries: { identifier: string; label: string }[]): void;
                select(increment?: number): void;
                dismiss(): void;
                element: HTMLElement | null;
            };
        };
        search.value = label();
        const pick = (id: string) => {
            choose(id);
            search.value = label();
        };
        const menu = new Autocomplete.implementation({ onSelect: pick });
        const refresh = () => {
            const words = search.value.toLowerCase().split(/\s+/).filter(Boolean);
            const typingFresh = search.value !== label();
            const matches = typingFresh ? entries.filter((e) => words.every((w) => e.search.includes(w))) : entries;
            if (!matches.length) return menu.dismiss();
            menu.activate(search, matches);
            if (typingFresh) menu.select(0);
        };
        search.addEventListener("focus", () => {
            search.select();
            refresh();
        });
        search.addEventListener("click", refresh);
        search.addEventListener("input", refresh);
        search.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            const own = custom?.(search.value.trim());
            if (own) pick(own);
            else search.value = label();
            menu.dismiss();
        });
        search.addEventListener("blur", () => {
            setTimeout(() => {
                if (document.activeElement !== search) search.value = label();
            }, 200);
        });
        document.body.addEventListener(
            "click",
            (event) => {
                const target = event.target as Node;
                if (target === search || menu.element?.contains(target)) return;
                if ((ui as unknown as { autocomplete?: unknown }).autocomplete === menu) menu.dismiss();
            },
            { signal: this.#pickerListeners!.signal },
        );
    }

    #currentModifiers(): RollModifierData[] {
        const data = this._processFormData(null, this.form!, new FormDataExtended(this.form!) as never) as {
            system?: { modifiers?: RollModifierData[] };
        };
        return data.system?.modifiers ?? [];
    }

    static async #onAddModifier(this: BarbsEffectConfig, event: PointerEvent) {
        // The button sits in the section's summary: add a row and open the section, rather than toggling it.
        event.preventDefault();
        this.#open.bonuses = true;
        const modifiers = this.#currentModifiers();
        modifiers.push({ type: "stat", rollType: "all", damageType: "all", weapon: "", value: "", key: "" });
        await this.submit({ updateData: { system: { modifiers } } } as never);
    }

    #currentTriggers(): TriggerData[] {
        const data = this._processFormData(null, this.form!, new FormDataExtended(this.form!) as never) as { system?: { triggers?: TriggerData[] } };
        return data.system?.triggers ?? [];
    }

    static async #onAddTrigger(this: BarbsEffectConfig, event: PointerEvent) {
        event.preventDefault();
        this.#open.triggers = true;
        const triggers = this.#currentTriggers();
        triggers.push({ event: "hit", conditions: "", chance: 0, oncePer: "", consume: false, check: "", action: "restore", value: "", type: "stamina", effect: "", effectData: null });
        await this.submit({ updateData: { system: { triggers } } } as never);
    }

    /**
     * Open the template a grant/inflict trigger copies, making it first if there isn't one: a new template effect next
     * to this one, named after the trigger's Effect (or Value), or after this effect if both are blank.
     */
    static async #onEditGranted(this: BarbsEffectConfig, event: PointerEvent, target: HTMLElement) {
        event.preventDefault();
        const index = Number(target.closest<HTMLElement>("[data-trigger-index]")?.dataset.triggerIndex);
        const triggers = this.#currentTriggers();
        const trigger = triggers[index];
        if (!trigger) return;
        const parent = this.document.parent as unknown as {
            effects: Iterable<ActiveEffect.Implementation>;
            createEmbeddedDocuments(type: string, data: object[]): Promise<ActiveEffect.Implementation[]>;
        };
        const findTemplate = (name: string) => [...parent.effects].find((e) => e.name === name && isTemplate(e as unknown as EffectLike));
        let name = (trigger.effect || trigger.value || "").trim();
        let template = name ? findTemplate(name) : undefined;
        if (!template) {
            const inflict = trigger.action === "inflict";
            if (!name) {
                const base = `${this.document.name} (${inflict ? "inflicted" : "granted"})`;
                name = base;
                for (let n = 2; findTemplate(name); n++) name = `${base} ${n}`;
            }
            [template] = await parent.createEmbeddedDocuments("ActiveEffect", [
                // Not transferred: a template never applies to whoever holds the item; the trigger copies it.
                { name, img: this.document.img, transfer: false, system: { template: true, category: inflict ? "condition" : "buff" } },
            ]);
        }
        triggers[index] = { ...trigger, effect: name, value: trigger.effect ? trigger.value : trigger.value === name ? "" : trigger.value };
        await this.submit({ updateData: { system: { triggers } } } as never);
        await template?.sheet?.render({ force: true } as never);
    }

    /** "Granted by X" links on a template open the granting effect. */
    static async #onOpenEffect(this: BarbsEffectConfig, _event: PointerEvent, target: HTMLElement) {
        const id = target.dataset.effectId;
        const parent = this.document.parent as unknown as { effects: { get(id: string): ActiveEffect.Implementation | undefined } };
        await (id ? parent.effects.get(id) : undefined)?.sheet?.render({ force: true } as never);
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
