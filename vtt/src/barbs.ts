/**
 * Barbs system entry point.
 *
 * Unlike the Roll20 version, where the sheet forwarded every button press to a server-side API script, everything
 * here runs client-side: actors know their own stats, items, and effects and build rolls from them directly.
 */
import { BarbsActiveEffect } from "./documents/active-effect.ts";
import { ABILITY_AUTOMATION } from "./abilities/catalog.ts";
import { EffectsPanel } from "./apps/effects-panel.ts";
import { registerChatListeners } from "./chat/card.ts";
import { STATUSES, SYSTEM_ID } from "./config.ts";
import * as config from "./config.ts";
import { CharacterModel, NpcModel } from "./data/actor/creature.ts";
import { BarbsEffectModel } from "./data/effect.ts";
import { AbilityModel, ClassModel, EquipmentModel, PassiveModel, RaceModel, SkillModel } from "./data/item/models.ts";
import { BarbsActor } from "./documents/actor.ts";
import { BarbsCombat, registerCombatTriggers } from "./documents/combat.ts";
import { BarbsCharacterSheet } from "./sheets/character-sheet.ts";
import { BarbsEffectConfig } from "./sheets/effect-config.ts";
import { BarbsItemSheet } from "./sheets/item-sheet.ts";
import { registerSocket } from "./socket.ts";
import { registerConditionHooks } from "./effects/apply.ts";
import { registerSummonCleanup } from "./summons.ts";
import { backfillPassives, registerPassiveGranting, registerPassiveResets } from "./passives/index.ts";

Hooks.once("init", () => {
    console.log(`${SYSTEM_ID} | Initializing Barbs`);

    (CONFIG as unknown as { BARBS: typeof config }).BARBS = config;
    (game as unknown as { barbs: unknown }).barbs = { config, abilityAutomation: ABILITY_AUTOMATION };

    // Documents and data models
    CONFIG.Actor.documentClass = BarbsActor as never;
    CONFIG.Combat.documentClass = BarbsCombat as never;
    CONFIG.ActiveEffect.documentClass = BarbsActiveEffect as never;
    Object.assign(CONFIG.Actor.dataModels, { character: CharacterModel, npc: NpcModel });
    Object.assign(CONFIG.Item.dataModels, {
        skill: SkillModel,
        race: RaceModel,
        class: ClassModel,
        ability: AbilityModel,
        equipment: EquipmentModel,
        passive: PassiveModel,
    });
    // Every effect (ability buffs, statuses, item enchantments) carries Barbs roll modifiers.
    CONFIG.ActiveEffect.dataModels.base = BarbsEffectModel as never;

    // Let core remove effects when their duration runs out instead of leaving them flagged as expired.
    CONFIG.ActiveEffect.expiryAction = "delete";

    // Derived maxima aren't in the schema, so tell Foundry which bars tokens can show.
    const bars = { bar: ["resources.health", "resources.stamina", "resources.mana", "downed"], value: [] };
    CONFIG.Actor.trackableAttributes = { character: bars, npc: bars };

    // Initiative: d100 + Agility + any initiative bonuses from effects.
    CONFIG.Combat.initiative = { formula: "1d100 + @agi + @initiativeBonus", decimals: 0 };

    // A combat round is 10 seconds, so effects measured in minutes line up with rounds (1 minute = 6 rounds).
    CONFIG.time.roundTime = 10;

    // Replace core status effects with the rulebook's global buffs and conditions.
    CONFIG.statusEffects = STATUSES.map(({ id, name, img, description, category }) => ({
        id,
        name,
        img,
        description,
        system: { category: category === "state" ? "" : category },
    })) as never;

    // Sheets
    const { DocumentSheetConfig } = foundry.applications.apps;
    DocumentSheetConfig.registerSheet(Actor, SYSTEM_ID, BarbsCharacterSheet as never, {
        types: ["character", "npc"],
        makeDefault: true,
        label: "Barbs Character Sheet",
    });
    DocumentSheetConfig.registerSheet(Item, SYSTEM_ID, BarbsItemSheet as never, {
        makeDefault: true,
        label: "Barbs Item Sheet",
    });
    DocumentSheetConfig.registerSheet(ActiveEffect, SYSTEM_ID, BarbsEffectConfig as never, {
        makeDefault: true,
        label: "Barbs Effect Config",
    });

    registerChatListeners();
    registerCombatTriggers();
    registerPassiveGranting();
    registerPassiveResets();
    registerConditionHooks();
    registerSummonCleanup();
});

Hooks.once("ready", () => {
    registerSocket();
    void backfillPassives();

    const effectsPanel = new EffectsPanel();
    effectsPanel.registerHooks();
    void effectsPanel.render({ force: true });
    (game as unknown as { barbs: Record<string, unknown> }).barbs.effectsPanel = effectsPanel;
    console.log(`${SYSTEM_ID} | Ready`);
});
