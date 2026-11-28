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

/** Attack bonuses by group, in the order the Bonuses picker lists them. */
const ROLL_BONUS_GROUPS: [string, string[]][] = [
    [
        "Attack",
        ["damage", "multiplier", "penetration", "critChance", "critDamage", "canCrit", "cannotMiss", "comboChance", "convert", "accuracy", "lethality", "lifesteal", "unblockable"],
    ],
    ["On hit", ["status", "bleedConvert", "shred", "acReduction", "crShred", "evShred", "vulnerability", "buffStrip", "forcedMovement"]],
    ["Defense (when you're attacked)", ["incomingDamage", "incomingAC", "incomingACPercent", "incomingEvasion", "incomingCR"]],
    ["Effect", ["block", "dot"]],
    ["Other", ["note"]],
];

/**
 * Everything a bonus row can be: character stats (stored as "stat" rows, applied as changes) and attack, on-hit, and
 * defense bonuses (roll modifiers). Identifiers are "stat:<change key>" or "roll:<modifier type>".
 */
function bonusCatalog(): { identifier: string; label: string; search: string }[] {
    const stats = changeKeyGroups().flatMap((g) =>
        g.keys.map((k) => ({ identifier: `stat:${k.key}`, label: `${k.label} (${g.label})`, search: `${k.label} ${g.label} stat ${k.key}`.toLowerCase() })),
    );
    const rolls = ROLL_BONUS_GROUPS.flatMap(([group, types]) =>
        types.map((t) => {
            const label = (MODIFIER_TYPES as Record<string, string>)[t] ?? t;
            return { identifier: `roll:${t}`, label: `${label} (${group})`, search: `${label} ${group} ${t}`.toLowerCase() };
        }),
    );
    return [...rolls, ...stats];
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
 * Core effect config plus a "Barbs" tab for the effect's category, single-use flag, and roll modifiers. This is how
 * players build ad-hoc buffs by hand, like the Roll20 sheet's "Effect Creator" box.
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
                // Templates never apply themselves, so their own triggers never run; say so where it's set up.
                templateWithTriggers: !!(system as unknown as { template?: boolean }).template && (system.triggers ?? []).length > 0,
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

    static async #onAddModifier(this: BarbsEffectConfig) {
        const modifiers = this.#currentModifiers();
        modifiers.push({ type: "stat", rollType: "all", damageType: "all", weapon: "", value: "", key: "" });
        await this.submit({ updateData: { system: { modifiers } } } as never);
    }

    #currentTriggers(): TriggerData[] {
        const data = this._processFormData(null, this.form!, new FormDataExtended(this.form!) as never) as { system?: { triggers?: TriggerData[] } };
        return data.system?.triggers ?? [];
    }

    static async #onAddTrigger(this: BarbsEffectConfig) {
        const triggers = this.#currentTriggers();
        triggers.push({ event: "hit", conditions: "", chance: 0, oncePer: "", consume: false, check: "", action: "restore", value: "", type: "stamina", effect: "", effectData: null });
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
