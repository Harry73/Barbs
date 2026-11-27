/**
 * Combat hooks for start-of-turn effects: Bleed, Burn, Poison, and lingering spells ("takes 4d8 air magic damage at
 * the beginning of each turn") all deal their damage when the bearer's turn starts.
 *
 * Core runs _onStartTurn on exactly one client (the designated GM), so damage is applied once.
 */
import { buildEffectData } from "../abilities/effects.ts";
import { status } from "../abilities/helpers.ts";
import { SYSTEM_ID } from "../config.ts";
import type { BarbsEffectModel } from "../data/effect.ts";
import { applyDamageToActor, applyEffectToActor } from "../effects/apply.ts";
import { activePassives, passivesOnTurnStart } from "../passives/index.ts";
import type { DamageKey } from "../rules/damage-math.ts";

export class BarbsCombat extends Combat {
    protected override async _onStartTurn(...args: Parameters<Combat["_onStartTurn"]>): Promise<void> {
        await super._onStartTurn(...args);
        const actor = args[0].actor as Actor.Implementation | null;
        if (!actor) return;
        await passivesOnTurnStart(actor);
        await this.#frostbite(actor);
        const { postPulse } = await import("../abilities/use.ts");
        for (const effect of actor.allApplicableEffects()) {
            const pulse = (effect.system as unknown as BarbsEffectModel).pulse;
            if (effect.active && pulse?.formula) await postPulse(actor, effect as ActiveEffect.Implementation, pulse);
        }
        for (const effect of actor.allApplicableEffects()) {
            const dot = (effect.system as unknown as BarbsEffectModel).dot;
            if (!effect.active || !dot?.formula) continue;
            const roll = await new Roll(dot.formula).evaluate();
            const type = (dot.damageType || "physical") as DamageKey;
            // Each ticking effect gets its own message (and undo), naming the effect as the source. DoTs bypass AC
            // and MR (otherwise any real armor makes a d10 Bleed do nothing); vulnerability and GDR still apply.
            await applyDamageToActor(
                actor,
                [{ [type]: roll.total ?? 0 }],
                { [type]: 100 },
                `${effect.name} (${roll.formula} = ${roll.total})`,
            );
        }
    }

    /**
     * Cryomancer's Frostbite: each round an enemy is under a condition from a Cryomancer's spells, it gains a stack
     * (one per Cryomancer). Checked at the start of the affected creature's turn.
     */
    async #frostbite(actor: Actor.Implementation): Promise<void> {
        const casters = new Set<string>();
        for (const effect of actor.effects) {
            if ((effect.system as unknown as BarbsEffectModel).category !== "condition" || !effect.active) continue;
            const casterUuid = foundry.utils.getProperty(effect, `flags.${SYSTEM_ID}.casterUuid`) as string | undefined;
            if (casterUuid) casters.add(casterUuid);
        }
        for (const uuid of casters) {
            const caster = (await fromUuid(uuid)) as Actor.Implementation | null;
            if (!activePassives(caster).some((p) => p.handle.item.name === "Frostbite")) continue;
            const data = buildEffectData(status("frostbite"), {
                className: "Cryomancer",
                abilityName: "Frostbite",
                img: "icons/svg/ice-aura.svg",
                duration: "Endless",
                casterUuid: uuid,
            });
            await applyEffectToActor(actor, data, { announce: false });
        }
    }
}
