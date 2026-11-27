import { SKILL_ATTRIBUTES, attributeKeyFromName, skillKey } from "../config.ts";
import {
    ATTRIBUTES,
    RESOURCE_KEYS,
    RESOURCE_REGEN,
    type AttributeKey,
} from "../config.ts";
import { dualWieldAttack, useAbility, weaponAttack } from "../abilities/use.ts";
import type { Hand } from "../rolls/attack.ts";
import type { CreatureModel } from "../data/actor/creature.ts";
import type { SkillModel } from "../data/item/models.ts";

export class BarbsActor extends Actor {
    /** The prepared creature data. Every Barbs actor type extends CreatureModel. */
    get creature(): CreatureModel {
        return this.system as unknown as CreatureModel;
    }

    /**
     * New characters get a linked token showing health, so damage applied to a PC's token lands on their character.
     * NPCs keep core's unlinked default so each goblin token tracks its own health.
     */
    protected override async _preCreate(...args: Parameters<Actor["_preCreate"]>) {
        const allowed = await super._preCreate(...args);
        if (allowed === false) return false;
        const data = args[0] as { prototypeToken?: { actorLink?: boolean } };
        const prototypeToken: Record<string, unknown> = {
            bar1: { attribute: "resources.health" },
            displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
        };
        if (this.type === "character" && data.prototypeToken?.actorLink === undefined) {
            Object.assign(prototypeToken, { actorLink: true, disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY });
        }
        this.updateSource({ prototypeToken } as never);
        return allowed;
    }

    get speaker(): ChatMessage.SpeakerData {
        return ChatMessage.getSpeaker({ actor: this as unknown as Actor.Stored });
    }

    override getRollData(): Record<string, unknown> {
        return this.creature.getRollData();
    }

    /* -------------------------------------------- */
    /*  Rolls                                       */
    /* -------------------------------------------- */

    /** Raw attribute check: d100 + attribute. Also used for attribute saves (e.g. Focus for concentration). */
    async rollAttribute(key: AttributeKey): Promise<void> {
        const config = ATTRIBUTES[key];
        const roll = new Roll(`1d100 + @${key}`, this.getRollData());
        await roll.toMessage({
            speaker: this.speaker,
            flavor: `${config.label} (${config.abbreviation}) check`,
        });
    }

    /** Skill check: d100 + 5 per skill point + the skill's attribute. */
    async rollSkill(item: Item.Implementation): Promise<void> {
        await this.skillCheck(item.name);
    }

    /**
     * Roll a skill check by name, optionally against a DC, posting the roll. A skill the character doesn't have rolls
     * with no rank (just the attribute and bonuses). Returns whether it met the DC (true when there's no DC).
     */
    async skillCheck(name: string, { dc, flavor }: { dc?: number; flavor?: string } = {}): Promise<boolean> {
        const item = this.items.find((i) => i.type === "skill" && i.name.toLowerCase() === name.toLowerCase());
        const skill = item?.system as unknown as SkillModel | undefined;
        const attribute = (skill?.attribute ?? attributeKeyFromName(SKILL_ATTRIBUTES[name.toLowerCase()] ?? "") ?? "str") as AttributeKey;
        const attr = ATTRIBUTES[attribute];
        const d = this.creature.derived;
        const bonus = d.skillBonus ? " + @skillBonus[effects]" : "";
        // Gear can add to one skill ("+10 Stealth: Sneak"), on top of bonuses to every skill.
        const specific = d.skillBonuses?.[skillKey(item?.name ?? name)] ?? 0;
        const rank = skill ? ` + @rank[rank ${skill.rank}]` : "";
        const roll = await new Roll(`1d100${rank} + @${attribute}[${attr.abbreviation}]${bonus}${specific ? " + @specific[gear]" : ""}`, {
            ...this.getRollData(),
            rank: skill?.rankBonus ?? 0,
            specific,
        }).evaluate();
        const passed = dc === undefined || (roll.total ?? 0) >= dc;
        await roll.toMessage({
            speaker: this.speaker,
            flavor:
                `${item?.name ?? name} check${skill ? ` (rank ${skill.rank})` : " (untrained)"}` +
                (dc !== undefined ? ` vs DC ${dc}: ${passed ? "<strong>success</strong>" : "failure"}` : "") +
                (flavor ? ` (${flavor})` : ""),
        });
        return passed;
    }

    /** Death saves are a flat d100 subtracted from Downed Health (Patch 1.3). */
    async rollDeathSave(): Promise<void> {
        const roll = await new Roll("1d100").evaluate();
        const downed = this.creature.derived.downed;
        const remaining = Math.max(0, downed.value - (roll.total ?? 0));
        await roll.toMessage({
            speaker: this.speaker,
            flavor: `Death save: Downed Health ${downed.value} → ${remaining}`,
        });
        await this.update({ system: { downed: { value: remaining } } });
    }

    /** Percent-chance stats (Evasion, Condition Resist): succeed on a d100 at or under the stat. */
    async rollPercentStat(key: "evasion" | "conditionResist"): Promise<void> {
        const chance = this.creature.derived.stats[key].value;
        const roll = await new Roll("1d100").evaluate();
        const success = (roll.total ?? 101) <= chance;
        const label = key === "evasion" ? "Evasion" : "Condition Resist";
        await roll.toMessage({
            speaker: this.speaker,
            flavor: `${label} (${chance}%): ${success ? "<strong>success</strong>" : "failure"}`,
        });
    }

    /* -------------------------------------------- */
    /*  Abilities and attacks                       */
    /* -------------------------------------------- */

    async useAbility(item: Item.Implementation, hand: Hand = "main"): Promise<void> {
        await useAbility(this as unknown as Actor.Implementation, item, hand);
    }

    async weaponAttack(item: Item.Implementation): Promise<void> {
        await weaponAttack(this as unknown as Actor.Implementation, item);
    }

    /** Attack with the weapon in each hand. */
    async dualWieldAttack(): Promise<void> {
        await dualWieldAttack(this as unknown as Actor.Implementation);
    }

    /* -------------------------------------------- */
    /*  Rests                                       */
    /* -------------------------------------------- */

    /**
     * Short rest regenerates each resource by its regen percentage of max; long rest refills everything.
     * Posts what changed so it can be undone by hand if someone clicks the wrong button.
     */
    async rest(kind: "short" | "long"): Promise<void> {
        const d = this.creature.derived;
        const updates: Record<string, number> = {};
        const lines: string[] = [];
        for (const key of RESOURCE_KEYS) {
            const { value, max } = d.resources[key];
            const gain =
                kind === "long"
                    ? max - value
                    : Math.min(max - value, Math.round((max * d.stats[RESOURCE_REGEN[key]].value) / 100));
            if (gain <= 0) continue;
            updates[`system.resources.${key}.value`] = value + gain;
            lines.push(`<li>${key}: +${gain} (${value} → ${value + gain})</li>`);
        }
        if (kind === "long") updates["system.downed.value"] = d.downed.max;
        await this.update(foundry.utils.expandObject(updates) as never);
        if (kind === "long") {
            const { resetResources } = await import("../passives/index.ts");
            await resetResources(this as unknown as Actor.Implementation, "longRest");
        }

        const title = kind === "long" ? "Long Rest" : "Short Rest";
        await ChatMessage.create({
            speaker: this.speaker,
            content: `<h3>${title}</h3><ul>${lines.join("") || "<li>Already at full resources.</li>"}</ul>`,
        });
    }
}
