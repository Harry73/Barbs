/**
 * Action buttons: things an effect lets you do while you have it ("while concentrating, you may use a Major Action to
 * gain another 10% crit chance"). They're trigger rows with the "use" event, plus a label and the action they take.
 *
 * Like PF2e's stances, nothing is added to or removed from the character when the effect comes or goes: the Actions
 * tab lists the buttons of whatever effects are active right now, so an effect ending (expiry, concentration, undo,
 * being Downed) takes its buttons with it and there's nothing to clean up.
 *
 * Rows with the same label are one button, run in order, so "spend 20 mana, then block" is two rows. A button shows
 * while at least one of its rows' conditions hold, and clicking it runs the rows whose conditions hold. A row that
 * can't be done (a spend you can't afford) stops the rest. "Once per turn" and the like work as they do for triggers.
 */
import { EFFECT_ACTION_TYPES, type EffectActionType } from "../config.ts";
import { stacksOf, type BarbsEffectModel, type TriggerData } from "../data/effect.ts";
import { esc } from "../chat/html.ts";
import { parsePredicate, testPredicate } from "../rules/predicate.ts";
import { describeTrigger } from "../effects/bonuses.ts";
import { domainFor, lastFired, passesChance, passesCheck, consumeEffect, runAction, turnKey, type TriggerContext } from "./index.ts";

export interface EffectAction {
    effectUuid: string;
    effectName: string;
    img: string;
    label: string;
    actionType: EffectActionType;
    /** Every row's summary, for the button's tooltip. */
    summary: string;
    /** Set when it can't be used right now ("Used this turn"). */
    unavailable: string;
    /** The effect's stack count, for effects that count up (shown as "×3"). 0 when it isn't a counter. */
    stacks: number;
}

/** The creature on the other end of a button's inflict/damage rows: the one target, if exactly one is targeted. */
function chosenTarget(): Actor.Implementation | null {
    const targets = [...(game.user?.targets ?? [])];
    return targets.length === 1 ? ((targets[0].actor as Actor.Implementation | null) ?? null) : null;
}

function context(other: Actor.Implementation | null, name: string): TriggerContext {
    return { other, sourceName: name };
}

const usable = (bearer: Actor.Implementation, effect: ActiveEffect.Implementation, row: TriggerData, ctx: TriggerContext) =>
    testPredicate(parsePredicate(row.conditions), domainFor(bearer, effect, ctx.other ? "target" : undefined, ctx));

/** The action buttons an actor's active effects give it right now. */
export function effectActions(actor: Actor.Implementation): EffectAction[] {
    const out: EffectAction[] = [];
    const ctx = context(chosenTarget(), "");
    for (const effect of [...actor.allApplicableEffects()] as ActiveEffect.Implementation[]) {
        if (!effect.active) continue;
        const rows = ((effect.system as unknown as BarbsEffectModel).triggers ?? []).map((row, index) => ({ row, index })).filter(({ row }) => row.event === "use");
        const labels = [...new Set(rows.map(({ row }) => row.label || effect.name))];
        for (const label of labels) {
            const mine = rows.filter(({ row }) => (row.label || effect.name) === label);
            if (!mine.some(({ row }) => usable(actor, effect, row, ctx))) continue;
            const spent = mine.find(({ row, index }) => row.oncePer && lastFired.get(`${effect.uuid}#${index}`) === turnKey(row.oncePer));
            // "Add a stack" with a cap that's been reached.
            const stacks = stacksOf(effect);
            const full = mine.find(({ row }) => row.action === "addStack" && row.type && Number.isFinite(Number(row.type)) && stacks >= Number(row.type));
            out.push({
                effectUuid: effect.uuid ?? "",
                effectName: effect.name,
                img: effect.img ?? "icons/svg/aura.svg",
                label,
                actionType: mine[0].row.actionType ?? "major",
                summary: mine.map(({ row }) => describeTrigger(row).replace(/^[^:]*: /, "")).join("; then "),
                unavailable: spent
                    ? `Used ${spent.row.oncePer === "once" ? "already" : `this ${spent.row.oncePer}`}`
                    : full
                      ? `At the most stacks (${stacks})`
                      : "",
                stacks,
            });
        }
    }
    return out;
}

/** Use one of an effect's action buttons. */
export async function useEffectAction(actor: Actor.Implementation, effectUuid: string, label: string): Promise<void> {
    const effect = (await fromUuid(effectUuid)) as ActiveEffect.Implementation | null;
    if (!effect?.active) return void ui.notifications?.warn("That effect isn't active any more.");
    const triggers = (effect.system as unknown as BarbsEffectModel).triggers ?? [];
    const rows = triggers.map((row, index) => ({ row, index })).filter(({ row }) => row.event === "use" && (row.label || effect.name) === label);
    const ctx = context(chosenTarget(), `${actor.name}'s ${label}`);
    const runnable = rows.filter(({ row }) => usable(actor, effect, row, ctx));
    if (!runnable.length) return void ui.notifications?.warn(`${label} can't be used right now.`);

    const actionName = EFFECT_ACTION_TYPES[runnable[0].row.actionType ?? "major"];
    await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: actor as Actor.Stored }),
        content: `<div class="barbs-chat-card"><p><strong>${esc(actor.name)}</strong> uses <strong>${esc(label)}</strong> (${esc(effect.name)}, ${actionName}).</p></div>`,
    } as never);

    let consume = false;
    for (const { row, index } of runnable) {
        const key = `${effect.uuid}#${index}`;
        if (row.oncePer && lastFired.get(key) === turnKey(row.oncePer)) {
            ui.notifications?.warn(`${label}: already used this ${row.oncePer === "once" ? "game" : row.oncePer}.`);
            return;
        }
        if (!(await passesChance(row))) continue;
        if (!(await passesCheck(actor, effect, row))) return;
        if (row.oncePer) lastFired.set(key, turnKey(row.oncePer));
        if (!(await runAction(actor, effect, row, ctx.other ? "target" : undefined, ctx))) return;
        consume ||= row.consume;
    }
    // Used up after the whole button has run, so later rows still see the effect.
    if (consume && effect.parent?.effects.has(effect.id!)) await consumeEffect(effect);
}
