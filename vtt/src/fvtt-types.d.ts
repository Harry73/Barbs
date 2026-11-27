/**
 * Type-level registration of Barbs documents and data models with fvtt-types. This must stay in sync with what
 * `barbs.ts` assigns to CONFIG at runtime; fvtt-types has no way to check that for us.
 */
import type { CharacterModel, NpcModel } from "./data/actor/creature.ts";
import type { AbilityModel, ClassModel, EquipmentModel, PassiveModel, RaceModel, SkillModel } from "./data/item/models.ts";
import type { BarbsActor } from "./documents/actor.ts";

declare module "fvtt-types/configuration" {
    interface DocumentClassConfig {
        Actor: typeof BarbsActor;
    }

    interface DataModelConfig {
        Actor: {
            character: typeof CharacterModel;
            npc: typeof NpcModel;
        };
        Item: {
            skill: typeof SkillModel;
            race: typeof RaceModel;
            class: typeof ClassModel;
            ability: typeof AbilityModel;
            equipment: typeof EquipmentModel;
            passive: typeof PassiveModel;
        };
    }

    interface SystemConfig {
        // Barbs defines every Actor/Item type itself; there's no core "base" type or module subtypes to account for.
        Actor: { base: "ignore"; moduleSubtype: "ignore" };
        Item: { base: "ignore"; moduleSubtype: "ignore" };
    }
}
