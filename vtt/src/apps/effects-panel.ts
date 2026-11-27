/**
 * A strip of effect icons in the top right of the canvas for the selected token (or the user's character), like
 * PF2e's effects panel. Hover for details, left-click to open an effect, right-click to remove it.
 */
import { SYSTEM_ID } from "../config.ts";
import type { BarbsEffectModel } from "../data/effect.ts";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

type ActionHandler = (this: EffectsPanel, event: PointerEvent, target: HTMLElement) => void | Promise<void>;

/** Compact remaining-duration badge: "3r" in combat, "50s"/"5m"/"6h" otherwise, blank if indefinite. */
function durationBadge(effect: ActiveEffect.Implementation): string {
    const d = effect.duration as unknown as { units: string; remaining?: number; secondsRemaining?: number };
    if (!Number.isFinite(d.remaining ?? Infinity)) return "";
    if (d.units === "rounds") return `${Math.max(0, d.remaining!)}r`;
    if (d.units === "turns") return `${Math.max(0, d.remaining!)}t`;
    const s = Math.max(0, d.secondsRemaining ?? 0);
    if (s >= 3600) return `${Math.ceil(s / 3600)}h`;
    if (s >= 60) return `${Math.ceil(s / 60)}m`;
    return `${Math.ceil(s)}s`;
}

function escape(text: string): string {
    return foundry.utils.escapeHTML(text);
}

export class EffectsPanel extends HandlebarsApplicationMixin(ApplicationV2) {
    static override DEFAULT_OPTIONS = {
        id: "barbs-effects-panel",
        tag: "aside",
        classes: [SYSTEM_ID],
        window: { frame: false, positioned: false },
        actions: {
            // Listen for both buttons: left opens, right removes.
            effect: { handler: EffectsPanel.#onEffectClick as ActionHandler, buttons: [0, 2] },
        },
    };

    static override PARTS = {
        main: { template: `systems/${SYSTEM_ID}/templates/apps/effects-panel.hbs`, root: true },
    };

    /** Coalesce bursts of hook calls (e.g. several effects created at once) into one render. */
    refresh = foundry.utils.debounce(() => void this.render(), 100);

    get actor(): Actor.Implementation | null {
        return (canvas?.tokens?.controlled[0]?.actor as Actor.Implementation | undefined) ?? (game.user?.character as Actor.Implementation | null) ?? null;
    }

    protected override async _prepareContext(options: never): Promise<never> {
        const context = (await super._prepareContext(options)) as unknown as Record<string, unknown>;
        const actor = this.actor;
        const effects = [];
        for (const effect of actor?.allApplicableEffects() ?? []) {
            if (!effect.active) continue;
            // Gear's enchantments and affixes are always on and never interesting mid-fight; the Effects tab still
            // lists them (in its collapsed Equipment section).
            const parent = effect.parent as Item.Implementation | null;
            if (parent?.documentName === "Item" && parent.type === "equipment") continue;
            const system = effect.system as unknown as BarbsEffectModel;
            const source = effect.parent !== actor ? effect.parent?.name : null;
            const remaining = (effect.duration as { label?: string }).label;
            const tooltip = [
                `<h4>${escape(effect.name)}</h4>`,
                system.category ? `<p><em>${escape(system.category.capitalize())}${source ? ` from ${escape(source)}` : ""}</em></p>` : "",
                remaining && Number.isFinite((effect.duration as { remaining?: number }).remaining ?? Infinity)
                    ? `<p>Remaining: ${escape(remaining)}</p>`
                    : "",
                system.singleUse ? "<p>Single use: consumed by your next matching roll.</p>" : "",
                effect.description ?? "",
                effect.isOwner && !source ? "<p class=\"hint\">Left-click to edit, right-click to remove.</p>" : "",
            ].join("");
            effects.push({
                uuid: effect.uuid,
                img: effect.img,
                badge: system.singleUse ? "1×" : durationBadge(effect as ActiveEffect.Implementation),
                category: system.category || "other",
                tooltip,
            });
        }
        // Buffs first, then conditions, then anything else.
        const order: Record<string, number> = { buff: 0, condition: 1, other: 2 };
        effects.sort((a, b) => order[a.category] - order[b.category]);
        return { ...context, effects } as never;
    }

    protected override async _onRender(context: never, options: never): Promise<void> {
        await super._onRender(context, options);
        // Mount above the sidebar column, where PF2e puts its panel, the first time we render.
        const column = document.getElementById("ui-right-column-1");
        if (column && this.element.parentElement !== column) column.prepend(this.element);
    }

    static async #onEffectClick(this: EffectsPanel, event: PointerEvent, target: HTMLElement) {
        const effect = fromUuidSync(target.dataset.uuid ?? "") as ActiveEffect.Implementation | null;
        if (!effect?.isOwner) return;
        if (event.button === 2) {
            // Effects transferred from items belong to the item (e.g. an enchantment); unequip it instead.
            if (effect.parent !== this.actor) {
                ui.notifications?.info(`${effect.name} comes from ${effect.parent?.name}. Unequip it to remove the effect.`);
                return;
            }
            await effect.delete();
        } else {
            void effect.sheet?.render(true);
        }
    }

    /**
     * Re-render whenever something could change the displayed effects. This deliberately doesn't try to match the
     * changed document against the displayed actor: an unlinked token's synthetic actor is a different object from
     * the sidebar actor whose sheet you used, so identity checks miss real changes. Renders are debounced and cheap.
     */
    registerHooks(): void {
        const refresh = () => this.refresh();
        for (const hook of ["controlToken", "updateUser", "updateCombat", "deleteCombat", "updateWorldTime", "updateActor", "updateToken"]) {
            Hooks.on(hook as never, refresh as never);
        }
        for (const event of ["create", "update", "delete"]) {
            Hooks.on(`${event}ActiveEffect` as never, refresh as never);
            Hooks.on(`${event}Item` as never, refresh as never);
        }
    }
}
