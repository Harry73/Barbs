var BarbsComponents = BarbsComponents || (function () {
    'use_strict';

    function assert(condition, message) {
        if (condition === null || condition === undefined) {
            throw 'assert() missing condition';
        }
        if (message === null || message === undefined) {
            throw 'assert() missing message';
        }

        if (!condition) {
            throw 'AssertionError: ' + message;
        }
    }

    function assert_not_null(parameter, message) {
        if (message === null || message === undefined) {
            throw 'assert_not_null() missing message';
        }

        assert(parameter !== null, message);
        assert(parameter !== undefined, message);
    }


    const characters_by_owner = {
        'Hoshiko Nightside': [
            'Hoshiko Nightside',
            'Hoshiko',
            'Ren',
            'Luna',
            'Ian',
            'Ian P.',
            '-LjmvO3KlA-S3iHQlRW3',
        ],
        'Ren Nightside': [
            'Ren Nightside',
            'Hoshiko',
            'Ren',
            'Luna',
            'Ian',
            'Ian P.',
            '-LjmvO3KlA-S3iHQlRW3',
        ],
        'Luna Nightside': [
            'Luna Nightside',
            'Hoshiko',
            'Ren',
            'Luna',
            'Ian',
            'Ian P.',
            '-LjmvO3KlA-S3iHQlRW3',
        ],
        'Ahasan (To be named)': [
            'Ahasan (To be named)',
            'Edwin',
            'Adric',
            'Ahasan R.',
            'Ahasan',
            '-Ljmverqp4J9xjCdHGq4',
        ],
        'Kirin Inagami': [
            'Kirin Inagami',
            'Kirin',
            'Sanjay N.',
            'Sanjay',
            '-Lk1li2MqriN_SAJ1ARF',
        ],
        'Russ': [
            'Russ',
            'Ravi B.',
            'Ravi',
            '-Lk7Ovry6ltsLmK8qnUY',
        ],
        'Russ Finnegan': [
            'Russ Finnegan',
            'Russ',
            'Ravi B.',
            'Ravi',
            '-Lk7Ovry6ltsLmK8qnUY',
        ],
        'Cordelia Tenebris': [
            'Cordelia Tenebris',
            'Cordelia',
            'Jason',
            'Jason V.',
        ],
        'Jørgen Espensen': [
            'Jørgen Espensen',
            'Jørgen',
            'Steve K.',
            'Steve',
        ],
        "Suro N'Gamma": [
            "Suro N'Gamma",
            'Suro',
            'Steve K.',
            'Steve',
        ],
        'Orpheus Glacierum': [
            'Orpheus Glacierum',
            'Orpheus',
            'Matthew H.',
            'Matthew',
            'Matt H.',
            'Matt',
        ],
        'Faust Brightwood': [
            'Faust Brightwood',
            'Faust',
            'Nevil A.',
            'Nevil,',
            'Drenieon',
            'Drenieon A.',
            '-Ljmv81n7XaR6f9smrur'
        ],
        'Janatris': [
            'Janatris',
            'Daniel B.',
            'Daniel',
            'Dan B.',
            'Dan',
        ],
        'Raizzon bin Qalal min Taid al Kurim': [
            'Raizzon bin Qalal min Taid al Kurim',
            'Raizzon',
            'Marcus I.',
            'Marcus',
        ],
    };


    // ################################################################################################################
    // Stats


    class StatObject {
        constructor(name, attr_tla, formula) {
            this.type = 'stat';
            this.name = name;
            this.attr_tla = attr_tla;
            this.formula = formula;
        }

        value(v) {
            return this.formula(v);
        }
    }


    const Stat = {
        HEALTH: new StatObject('health', 'VIT', function (v) {
            return 100 + 10 * v;
        }),
        STAMINA: new StatObject('stamina', 'END', function (v) {
            return 100 + 10 * v;
        }),
        MANA: new StatObject('mana', 'SPT', function (v) {
            return 100 + 10 * v;
        }),
        HEALTH_REGENERATION: new StatObject('health regeneration', 'RCV', function (v) {
            return 10 + v;
        }),
        STAMINA_REGENERATION: new StatObject('stamina regeneration', 'PER', function (v) {
            return 10 + v;
        }),
        MANA_REGENERATION: new StatObject('mana regeneration', 'SAN', function (v) {
            return 10 + v;
        }),
        MOVEMENT_SPEED: new StatObject('movement speed', 'AGI', function (v) {
            return 30 + 5 * Math.floor(v / 2);
        }),
        AC: new StatObject('ac', 'TGH', function (v) {
            return 10 + v;
        }),
        EVASION: new StatObject('evasion', 'REF', function (v) {
            return 10 + v;
        }),
        MAGIC_RESIST: new StatObject('magic resist', 'RES', function (v) {
            return 10 + v;
        }),
        CONDITION_RESIST: new StatObject('condition resist', 'FRT', function (v) {
            return 10 + v;
        }),
        MELEE_DAMAGE: new StatObject('melee damage', 'STR', function (v) {
            return v;
        }),
        RANGED_FINE_DAMAGE: new StatObject('ranged fine damage', 'DEX', function (v) {
            return v;
        }),
        MAGIC_DAMAGE: new StatObject('magic damage', 'ATN', function (v) {
            return v;
        }),
        CRITICAL_HIT_CHANCE: new StatObject('critical hit chance', 'PRE', function (v) {
            return 10 + v;
        }),
        COMMANDS: new StatObject('commands', 'APL', function (v) {
            return Math.floor((v + 10) / 10) + 1;
        }),
        LANGUAGES: new StatObject('languages', 'INT', function (v) {
            return Math.floor((v + 10) / 3) + 1;
        }),
        ITEM_EFFICIENCY: new StatObject('item efficiency', 'WIS', function (v) {
            return (v + 10) * 5;
        }),
        BUFF_LIMIT: new StatObject('buff limit', 'COM', function (v) {
            return Math.floor((v + 10) / 2);
        }),
        CONCENTRATION_LIMIT: new StatObject('concentration limit', 'FCS', function (v) {
            return Math.floor((v + 10) / 2);
        }),
    };


    const HiddenStat = {
        ACCURACY: '%s% accuracy',
        AC_PENETRATION: '%s% armor penetration',
        BUFF_STRIP: 'Strip %s buff(s) from the target',
        CRIPPLE_CHANCE: '%s% cripple chance',
        FORCED_MOVEMENT: 'Forcibly move target %s ft',
        LETHALITY: '%s% lethality',
        LIFESTEAL: '%s% lifesteal',
        PARALYZE: '%s% chance to paralyze',
        REACH: '+%s ft reach',
        UNBLOCKABLE_CHANCE: '%s% chance to be unblockable',

        REDUCE_EVASION: 'Target loses %s% evasion for 1 minute',
        REDUCE_CR: 'Target loses %s% CR',
        REDUCE_AC: 'Target loses %s AC',

        GENERAL_MAGIC_PENETRATION: '%s% magic penetration',
        FIRE_MAGIC_PENETRATION: '%s% fire magic penetration',
        WATER_MAGIC_PENETRATION: '%s% water magic penetration',
        EARTH_MAGIC_PENETRATION: '%s% earth magic penetration',
        AIR_MAGIC_PENETRATION: '%s% air magic penetration',
        ICE_MAGIC_PENETRATION: '%s% ice magic penetration',
        LIGHTNING_MAGIC_PENETRATION: 's% lightning magic penetration',
        LIGHT_MAGIC_PENETRATION: '%s% light magic penetration',
        DARK_MAGIC_PENETRATION: '%s% dark magic penetration',
    };


    // ################################################################################################################
    // Skills


    class SkillObject {
        constructor(name, scaling_attr_tla) {
            this.name = name;
            this.scaling_attr_tla = scaling_attr_tla;
        }
    }


    // The elements of this dictionary are auto-generated by running convert.py. The contents of the resulting
    // skills.txt file can be copy-pasted into here.
    const Skill = {
        ALCHEMY_AUGMENTATION: new SkillObject('Alchemy: Augmentation', 'INT'),
        ALCHEMY_CONSTRUCTS: new SkillObject('Alchemy: Constructs', 'INT'),
        ALCHEMY_ORGANICS: new SkillObject('Alchemy: Organics', 'INT'),
        ALCHEMY_TRANSFORMATION: new SkillObject('Alchemy: Transformation', 'INT'),
        ARMOR_MASTERY_CLOTH: new SkillObject('Armor Mastery: Cloth', 'RES'),
        ARMOR_MASTERY_HEAVY: new SkillObject('Armor Mastery: Heavy', 'TGH'),
        ARMOR_MASTERY_LIGHT: new SkillObject('Armor Mastery: Light', 'REF'),
        ARMOR_MASTERY_SHIELDS: new SkillObject('Armor Mastery: Shields', 'TGH'),
        ARTISTRY_ACTING: new SkillObject('Artistry: Acting', 'APL'),
        ARTISTRY_DANCING: new SkillObject('Artistry: Dancing', 'APL'),
        ARTISTRY_ILLUSTRATION: new SkillObject('Artistry: Illustration', 'APL'),
        ARTISTRY_LITERATURE: new SkillObject('Artistry: Literature', 'APL'),
        ARTISTRY_MUSIC: new SkillObject('Artistry: Music', 'APL'),
        ARTISTRY_SCULPTURE: new SkillObject('Artistry: Sculpture', 'APL'),
        ATHLETICS_BALANCE: new SkillObject('Athletics: Balance', 'DEX'),
        ATHLETICS_CLIMBING: new SkillObject('Athletics: Climbing', 'AGI'),
        ATHLETICS_FLEXIBILITY: new SkillObject('Athletics: Flexibility', 'DEX'),
        ATHLETICS_FORCE: new SkillObject('Athletics: Force', 'STR'),
        ATHLETICS_MOVEMENT: new SkillObject('Athletics: Movement', 'AGI'),
        ATHLETICS_PAIN_TOLERANCE: new SkillObject('Athletics: Pain Tolerance', 'COM'),
        BEAST_MASTERY_BATTLE_PET: new SkillObject('Beast Mastery: Battle Pet', 'WIS'),
        BEAST_MASTERY_RIDING: new SkillObject('Beast Mastery: Riding', 'AGI'),
        BEAST_MASTERY_TAMING: new SkillObject('Beast Mastery: Taming', 'WIS'),
        COMBAT_BLOCKING: new SkillObject('Combat: Blocking', 'TGH'),
        COMBAT_DODGING: new SkillObject('Combat: Dodging', 'REF'),
        COMBAT_GRAPPLING: new SkillObject('Combat: Grappling', 'AGI'),
        COMBAT_TRAPPING: new SkillObject('Combat: Trapping', 'FRT'),
        CRAFTING_ARMORSMITHING: new SkillObject('Crafting: Armorsmithing', 'TGH'),
        CRAFTING_ARTIFICING: new SkillObject('Crafting: Artificing', 'RES'),
        CRAFTING_COOKING: new SkillObject('Crafting: Cooking', 'APL'),
        CRAFTING_ENCHANTING: new SkillObject('Crafting: Enchanting', 'RES'),
        CRAFTING_FINE_WEAPONS: new SkillObject('Crafting: Fine Weapons', 'REF'),
        CRAFTING_FORGERY: new SkillObject('Crafting: Forgery', 'PRE'),
        CRAFTING_LEATHERWORKING: new SkillObject('Crafting: Leatherworking', 'REF'),
        CRAFTING_JEWELRY: new SkillObject('Crafting: Jewelry', 'FRT'),
        CRAFTING_HEAVY_WEAPONS: new SkillObject('Crafting: Heavy Weapons', 'TGH'),
        CRAFTING_POISONS: new SkillObject('Crafting: Poisons', 'FRT'),
        CRAFTING_POTIONS: new SkillObject('Crafting: Potions', 'FRT'),
        CRAFTING_RANGED_WEAPONS: new SkillObject('Crafting: Ranged Weapons', 'REF'),
        CRAFTING_SHORTBLADES: new SkillObject('Crafting: Shortblades', 'PRE'),
        CRAFTING_TAILORING: new SkillObject('Crafting: Tailoring', 'RES'),
        ELEMENT_MASTERY_AIR: new SkillObject('Element Mastery: Air', 'AGI'),
        ELEMENT_MASTERY_DARK: new SkillObject('Element Mastery: Dark', 'FRT'),
        ELEMENT_MASTERY_EARTH: new SkillObject('Element Mastery: Earth', 'RES'),
        ELEMENT_MASTERY_FIRE: new SkillObject('Element Mastery: Fire', 'ATN'),
        ELEMENT_MASTERY_ICE: new SkillObject('Element Mastery: Ice', 'FRT'),
        ELEMENT_MASTERY_LIGHT: new SkillObject('Element Mastery: Light', 'FCS'),
        ELEMENT_MASTERY_LIGHTNING: new SkillObject('Element Mastery: Lightning', 'ATN'),
        ELEMENT_MASTERY_WATER: new SkillObject('Element Mastery: Water', 'FCS'),
        GATHERING_FORESTRY: new SkillObject('Gathering: Forestry', 'TGH'),
        GATHERING_HARVEST: new SkillObject('Gathering: Harvest', 'AGI'),
        GATHERING_HERBOLOGY: new SkillObject('Gathering: Herbology', 'RES'),
        GATHERING_HUNTING: new SkillObject('Gathering: Hunting', 'REF'),
        GATHERING_MINING: new SkillObject('Gathering: Mining', 'TGH'),
        GATHERING_SKINNING: new SkillObject('Gathering: Skinning', 'REF'),
        INTERACTION_DECEPTION: new SkillObject('Interaction: Deception', 'APL'),
        INTERACTION_INTENT: new SkillObject('Interaction: Intent', 'WIS'),
        INTERACTION_INTIMIDATION: new SkillObject('Interaction: Intimidation', 'COM'),
        INTERACTION_LEADERSHIP: new SkillObject('Interaction: Leadership', 'COM'),
        INTERACTION_PERSUASION: new SkillObject('Interaction: Persuasion', 'APL'),
        INTERACTION_SEDUCTION: new SkillObject('Interaction: Seduction', 'APL'),
        ITEM_USE_APPRAISAL: new SkillObject('Item Use: Appraisal', 'WIS'),
        ITEM_USE_CONSTRUCTION: new SkillObject('Item Use: Construction', 'STR'),
        ITEM_USE_FIRST_AID: new SkillObject('Item Use: First Aid', 'FRT'),
        ITEM_USE_LITERACY: new SkillObject('Item Use: Literacy', 'INT'),
        ITEM_USE_ROPES: new SkillObject('Item Use: Ropes', 'WIS'),
        ITEM_USE_TINKERING: new SkillObject('Item Use: Tinkering', 'WIS'),
        ITEM_USE_TRAPS: new SkillObject('Item Use: Traps', 'COM'),
        KNOWLEDGE_ARCANA: new SkillObject('Knowledge: Arcana', 'INT'),
        KNOWLEDGE_CULTURE: new SkillObject('Knowledge: Culture', 'INT'),
        KNOWLEDGE_HISTORY: new SkillObject('Knowledge: History', 'INT'),
        KNOWLEDGE_NATURE: new SkillObject('Knowledge: Nature', 'INT'),
        KNOWLEDGE_RELIGION: new SkillObject('Knowledge: Religion', 'INT'),
        MAGIC_BUFFS: new SkillObject('Magic: Buffs', 'FCS'),
        MAGIC_CONDITIONS: new SkillObject('Magic: Conditions', 'ATN'),
        MAGIC_CONJURATION: new SkillObject('Magic: Conjuration', 'FCS'),
        MAGIC_CONTROL: new SkillObject('Magic: Control', 'ATN'),
        MAGIC_DEFENSIVE: new SkillObject('Magic: Defensive', 'RES'),
        MAGIC_DESTRUCTION: new SkillObject('Magic: Destruction', 'ATN'),
        MAGIC_DIVINATION: new SkillObject('Magic: Divination', 'ATN'),
        MAGIC_ENCHANTMENT: new SkillObject('Magic: Enchantment', 'FCS'),
        MAGIC_ILLUSIONS: new SkillObject('Magic: Illusions', 'FCS'),
        MAGIC_MANA_CHANNELING: new SkillObject('Magic: Mana Channeling', 'COM'),
        MAGIC_RESTORATION: new SkillObject('Magic: Restoration', 'ATN'),
        MAGIC_SUMMONING: new SkillObject('Magic: Summoning', 'FCS'),
        MAGIC_TRANSMUTATION: new SkillObject('Magic: Transmutation', 'FCS'),
        MAGIC_UTILITY: new SkillObject('Magic: Utility', 'ATN'),
        OBSERVATION_LISTEN: new SkillObject('Observation: Listen', 'WIS'),
        OBSERVATION_SEARCH: new SkillObject('Observation: Search', 'WIS'),
        OBSERVATION_TRACKING: new SkillObject('Observation: Tracking', 'WIS'),
        PSIONICS_DEFENSIVE: new SkillObject('Psionics: Defensive', 'COM'),
        PSIONICS_OFFENSIVE: new SkillObject('Psionics: Offensive', 'COM'),
        PSIONICS_UTILITY: new SkillObject('Psionics: Utility', 'COM'),
        STEALTH_DISGUISE: new SkillObject('Stealth: Disguise', 'PRE'),
        STEALTH_LOCKPICKING: new SkillObject('Stealth: Lockpicking', 'PRE'),
        STEALTH_SLEIGHT_OF_HAND: new SkillObject('Stealth: Sleight of Hand', 'PRE'),
        STEALTH_SNEAK: new SkillObject('Stealth: Sneak', 'PRE'),
        STEALTH_STEAL: new SkillObject('Stealth: Steal', 'PRE'),
        TRANSPORTATION_AIR_VEHICLES: new SkillObject('Transportation: Air Vehicles', 'COM'),
        TRANSPORTATION_LAND_VEHICLES: new SkillObject('Transportation: Land Vehicles', 'AGI'),
        TRANSPORTATION_SEA_VEHICLES: new SkillObject('Transportation: Sea Vehicles', 'FCS'),
        WEAPON_MASTERY_AXES: new SkillObject('Weapon Mastery: Axes', 'STR'),
        WEAPON_MASTERY_BLUNT: new SkillObject('Weapon Mastery: Blunt', 'STR'),
        WEAPON_MASTERY_BOWS: new SkillObject('Weapon Mastery: Bows', 'DEX'),
        WEAPON_MASTERY_BULLETS: new SkillObject('Weapon Mastery: Bullets', 'DEX'),
        WEAPON_MASTERY_CROSSBOWS: new SkillObject('Weapon Mastery: Crossbows', 'DEX'),
        WEAPON_MASTERY_FINE: new SkillObject('Weapon Mastery: Fine', 'DEX'),
        WEAPON_MASTERY_IMPROVISED_WEAPONS: new SkillObject('Weapon Mastery: Improvised Weapons', 'WIS'),
        WEAPON_MASTERY_HEAVY_THROWN_WEAPONS: new SkillObject('Weapon Mastery: Heavy Thrown Weapons', 'STR'),
        WEAPON_MASTERY_LIGHT_THROWN_WEAPONS: new SkillObject('Weapon Mastery: Light Thrown Weapons', 'DEX'),
        WEAPON_MASTERY_LONGBLADES: new SkillObject('Weapon Mastery: Longblades', 'STR'),
        WEAPON_MASTERY_POLEARMS: new SkillObject('Weapon Mastery: Polearms', 'STR'),
        WEAPON_MASTERY_SHIELDS: new SkillObject('Weapon Mastery: Shields', 'STR'),
        WEAPON_MASTERY_SHORTBLADES: new SkillObject('Weapon Mastery: Shortblades', 'PRE'),
        WEAPON_MASTERY_UNARMED: new SkillObject('Weapon Mastery: Unarmed', 'DEX'),
        ALL: new SkillObject('All', ''),
    };


    // ################################################################################################################
    // All components, excluding items, as parsed from the rulebook


    // The contents of this list are auto-generated by running convert.py. The contents of the resulting components.json
    // file can be copy-pasted here.
    const all_abilities = [
        {
            "type": "ability",
            "name": "Shield",
            "class": "Abjurer",
            "branch": "Secure",
            "tier": 1,
            "action": "1 Reaction",
            "cost": "5 mana",
            "range": "80 ft",
            "duration": "Instant",
            "description": [
                "You protect an ally with a brief yet powerful shield. Block one attack on yourself or an ally in range. Until the beginning of the target's next turn, they have +10 AC and +10% MR"
            ],
            "tags": [
                "Spell",
                "defensive",
                "gain AC",
                "gain MR"
            ]
        },
        {
            "type": "ability",
            "name": "Weak",
            "class": "Abjurer",
            "branch": "Contain",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 mana",
            "range": "80 ft",
            "duration": "1 minute",
            "description": [
                "You dampen an enemy's aggression with magic. A target in range gains a 20% Weaken if they aren't already weakened; otherwise, they gain a 10% Weaken."
            ],
            "tags": [
                "Spell",
                "defensive",
                "condition",
                "Weaken",
                "single-target"
            ]
        },
        {
            "type": "ability",
            "name": "Stoneskin",
            "class": "Abjurer",
            "branch": "Protect",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "20 mana",
            "range": "80 ft",
            "duration": "1 minute",
            "description": [
                "You boost the natural armor of your allies. Up to 5 targets in range have their AC and MR increased by 30%. You may spend 1 minute to cast this spell as a minor ritual; if you do, its duration is extended to 1 hour. You may spend 10 minutes to cast this spell as a major ritual; if you do, its duration is extended to 6 hours."
            ],
            "tags": [
                "Spell",
                "defensive",
                "buff",
                "gain AC",
                "gain MR",
                "modal",
                "minor ritual",
                "major ritual"
            ]
        },
        {
            "type": "ability",
            "name": "Wind Slash",
            "class": "Aeromancer",
            "branch": "Gale",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 mana",
            "range": "100 ft",
            "duration": "Instant",
            "description": [
                "You fire a fast moving blade of air. Deal 6d8 air magic damage to a target in range and up to 2 enemies adjacent to your target. This attack cannot miss, cannot be blocked, and bypasses barriers and walls."
            ],
            "tags": [
                "Spell",
                "attack",
                "ranged",
                "air",
                "destruction",
                "single-target",
                "multi-target",
                "ignore barriers/walls/blocks",
                "no-miss"
            ]
        },
        {
            "type": "ability",
            "name": "Sky Uppercut",
            "class": "Aeromancer",
            "branch": "Gale",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "25 mana",
            "range": "100 ft",
            "duration": "Instant",
            "description": [
                "You release an upwards draft of air. Deal 8d8 air magic damage to a target in range. The target is then Knocked Up and inflicted with 50% air vulnerability until this condition ends."
            ],
            "tags": [
                "Spell",
                "attack",
                "ranged",
                "air",
                "destruction",
                "single-target",
                "control",
                "condition",
                "knock up",
                "vulnerability"
            ]
        },
        {
            "type": "ability",
            "name": "Vicious Cyclone",
            "class": "Aeromancer",
            "branch": "Gale",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "40 mana",
            "range": "100 ft",
            "duration": "1 minute",
            "description": [
                "You conjure a violent twister that buffets your foes with slashing winds. Create a 15 foot square Cyclone centered on a space in range. It reaches up 100 ft as well. When it initially appears it deals 6d8 air magic damage to all enemies in its AOE. If an enemy begins its turn in the AOE, they take 4d8 air magic damage, and if they are Knocked Up, they remain Airborne. When you cast this spell, you may increase the AOE size by 5 ft for every additional 20 mana you expend."
            ],
            "tags": [
                "Spell",
                "attack",
                "air",
                "destruction",
                "conjuration",
                "AOE",
                "square",
                "conditional",
                "knock up",
                "modal",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Vicious Hurricane",
            "class": "Aeromancer",
            "branch": "Gale",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "80 mana",
            "range": "100 ft",
            "duration": "1 minute",
            "description": [
                "You conjure a violent hurricane that persistently damages and knocks up enemies. At the end of each of your turns, deal 10d8 air magic damage to all enemies in range and they are all Knocked Up. While you concentrate on this spell, your air spells ignore all MR and you can cast any air spell you know as a reaction."
            ],
            "tags": [
                "Spell",
                "attack",
                "air",
                "destruction",
                "conjuration",
                "AOE",
                "square",
                "knock up",
                "ignore MR",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Aeroblast",
            "class": "Aeromancer",
            "branch": "Gust",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "15 mana",
            "range": "100 ft",
            "duration": "Instant",
            "description": [
                "You release a powerful blast of air that sends people flying. Push a target in range 20 ft in a direction of your choice. When you cast this spell, you may choose to expend 4 stacks of Winds of War to additionally knock the target prone."
            ],
            "tags": [
                "Spell",
                "attack",
                "ranged",
                "air",
                "control",
                "utility",
                "conjuration",
                "knock prone",
                "push",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Whisk Away",
            "class": "Aeromancer",
            "branch": "Gust",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "20 mana",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You fire a gust of air behind you to quickly reposition yourself. Dash up to 50 ft in any direction including upwards and downwards"
            ],
            "tags": [
                "Spell",
                "air",
                "utility",
                "conjuration",
                "dash"
            ]
        },
        {
            "type": "ability",
            "name": "Buffeting Storm",
            "class": "Aeromancer",
            "branch": "Gust",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "50 mana",
            "range": "Battlefield",
            "duration": "1 minute",
            "description": [
                "You maintain powerful winds to impede foes and assist allies. While you concentrate on this spell, powerful winds decrease enemy movement speed by 20 and increase ally movement speed by 20. Additionally, while you concentrate on this spell, you may spend 5 mana to push any target 10 ft in any direction as a Minor Action."
            ],
            "tags": [
                "Spell",
                "air",
                "control",
                "conjuration",
                "modal",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Take Flight",
            "class": "Aeromancer",
            "branch": "Gust",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "60 mana",
            "range": "Touch",
            "duration": "1 minute",
            "description": [
                "You provide yourself or an ally the ability to fly without restrictions. Target willing entity in range gains a buff that converts all of their movement speed into flying speed, grants 20% evasion, and increases the range of their attacks by 50%."
            ],
            "tags": [
                "Spell",
                "air",
                "buff",
                "gain evasion",
                "gain range",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Tailwind",
            "class": "Aeromancer",
            "branch": "Breeze",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "15 mana",
            "range": "Touch",
            "duration": "1 minute",
            "description": [
                "You provide an aiding tailwind to increase an ally's speed. Target willing entity in range gains the following buff: Gain +20 movement speed; can end this buff as a reaction to dash 20 ft in any direction."
            ],
            "tags": [
                "Spell",
                "air",
                "utility",
                "conjuration",
                "buff",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Blowback",
            "class": "Aeromancer",
            "branch": "Breeze",
            "tier": 2,
            "action": "1 Reaction",
            "cost": "20 mana",
            "range": "100 ft",
            "duration": "Instant",
            "description": [
                "You counter a spell and muddle the caster's senses. As a reaction to a target in range casting a spell, you may counter that spell. Until the end of the target's next turn, their non-melee abilities have their range halved."
            ],
            "tags": [
                "Spell",
                "air",
                "defensive",
                "counterspell",
                "conditional",
                "single-target",
                "condition",
                "range decrease"
            ]
        },
        {
            "type": "ability",
            "name": "Rotation Barrier",
            "class": "Aeromancer",
            "branch": "Breeze",
            "tier": 3,
            "action": "1 Reaction",
            "cost": "30 mana",
            "range": "10 ft",
            "duration": "Instant",
            "description": [
                "You rotate the air surrounding you quickly, knocking down incoming projectiles. All non-melee, non-AOE attacks that target or affect a space within range are blocked."
            ],
            "tags": [
                "Spell",
                "air",
                "defensive",
                "conditional",
                "AOE",
                "block"
            ]
        },
        {
            "type": "ability",
            "name": "Summon Wyvern",
            "class": "Aeromancer",
            "branch": "Breeze",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "100 mana",
            "range": "50 ft",
            "duration": "1 hour",
            "description": [
                "You summon a wyvern borne of the skies. Summon a Wyvern with 100 HP, 50 flying speed, 20 AC, 50% evasion, 50% general MR, and an innate 100% vulnerability to attacks from bows and crossbows. It obeys your Commands; otherwise, it uses its Move Action to fly towards enemies and its Major Action to do a melee claw attack for 5d10 physical damage or a 30 ft cone breath attack for 10d8 air magic damage (33% recharge rate)."
            ],
            "tags": [
                "Spell",
                "air",
                "summoning",
                "minion"
            ]
        },
        {
            "type": "ability",
            "name": "Gale Shot",
            "class": "Air Duelist",
            "branch": "Dueling",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 stamina",
            "range": "150 ft",
            "duration": "Instant",
            "description": [
                "You fire at an enemy while making evasive maneuvers. Deal 4d8 physical damage to a target in range, then dash 10 ft in any direction"
            ],
            "tags": [
                "Attack",
                "ranged",
                "physical",
                "bow",
                "dash",
                "single-target"
            ]
        },
        {
            "type": "ability",
            "name": "Zephyr Shot",
            "class": "Air Duelist",
            "branch": "Dueling",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "25 stamina",
            "range": "150 ft",
            "duration": "Instant",
            "description": [
                "You fire a series of several arrows at the enemy. Deal d8 physical damage to a target in range. This attack repeats 5 times, and you may change targets with each hit."
            ],
            "tags": [
                "Attack",
                "ranged",
                "physical",
                "bow",
                "single-target",
                "multi-target",
                "multi-hit"
            ]
        },
        {
            "type": "ability",
            "name": "Storm Shot",
            "class": "Air Duelist",
            "branch": "Dueling",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "30 stamina",
            "range": "150 ft",
            "duration": "Instant",
            "description": [
                "You fire a rain of arrows from the skies. Deal 6d8 physical damage to all enemies in a 25 ft square centered on a space in range, Crippling them for 1 minute. Flying enemies take 100% increased damage from this ability, cannot evade this attack, and are additionally Knocked Prone."
            ],
            "tags": [
                "Attack",
                "ranged",
                "physical",
                "bow",
                "AOE",
                "square",
                "condition",
                "Cripple",
                "conditional",
                "no-miss",
                "Knock Prone"
            ]
        },
        {
            "type": "ability",
            "name": "Wind Strike",
            "class": "Air Duelist",
            "branch": "Casting",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 mana",
            "range": "150 ft",
            "duration": "Instant",
            "description": [
                "You fire a powerful gust of air to blow enemies away. Deal 5d8 air magic damage to a target in range, pushing them 10 ft away from you."
            ],
            "tags": [
                "Spell",
                "attack",
                "ranged",
                "air",
                "destruction",
                "single-target",
                "control",
                "utility",
                "conjuration",
                "push."
            ]
        },
        {
            "type": "ability",
            "name": "Cutting Winds",
            "class": "Air Duelist",
            "branch": "Casting",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "25 mana",
            "range": "150 ft",
            "duration": "Instant",
            "description": [
                "You conjure winds as sharp as blades to damage and knock down enemies. Deal 6d8 air magic damage to all entities in a 25 ft square centered on a space in range, knocking them all Prone."
            ],
            "tags": [
                "Spell",
                "attack",
                "ranged",
                "air",
                "destruction",
                "AOE",
                "square",
                "conjuration",
                "Knock Prone"
            ]
        },
        {
            "type": "ability",
            "name": "Harassing Whirlwind",
            "class": "Air Duelist",
            "branch": "Casting",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "40 mana",
            "range": "150 ft",
            "duration": "1 minute",
            "description": [
                "You create a whirlwind around a target that constantly damages and pushes them. Deal 4d8 air magic damage to a target in range. While concentrating on this spell, for the spell's duration, the target takes 4d8 air magic damage and is pushed 20 ft in a direction of your choice at the beginning of each turn."
            ],
            "tags": [
                "Spell",
                "attack",
                "ranged",
                "air",
                "destruction",
                "control",
                "conjuration",
                "forced movement",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Mistral Bow",
            "class": "Air Duelist",
            "branch": "Buffing",
            "tier": 1,
            "action": "1 Minor Action",
            "cost": "10 mana",
            "range": "Self",
            "duration": "1 minute",
            "description": [
                "You use air magic to provide your bow with extra stopping power. For the spell's duration, when you hit a target with a bow attack, push the target 5 ft away from you as an on-hit effect."
            ],
            "tags": [
                "Spell",
                "air",
                "buff",
                "self-target",
                "on-hit",
                "bow",
                "push"
            ]
        },
        {
            "type": "ability",
            "name": "Arc of Air",
            "class": "Air Duelist",
            "branch": "Buffing",
            "tier": 2,
            "action": "1 Minor Action",
            "cost": "20 mana",
            "range": "Self",
            "duration": "1 minute",
            "description": [
                "You envelop your bow in air magic energy. For the spell's duration, when you hit a target with a bow attack, deal an additional 2d8 air magic damage on hit."
            ],
            "tags": [
                "Spell",
                "air",
                "buff",
                "self-target",
                "on-hit",
                "bow",
                ""
            ]
        },
        {
            "type": "ability",
            "name": "Bow of Hurricanes",
            "class": "Air Duelist",
            "branch": "Buffing",
            "tier": 3,
            "action": "1 Minor Action",
            "cost": "30 mana",
            "range": "Self",
            "duration": "1 minute",
            "description": [
                "Your bow becomes a thick arc of air magic. For the spell's duration, all damage that you would deal with bow attacks have their damage converted to air magic damage. While this buff is active, your bow attacks using special ammunition have 50% increased range."
            ],
            "tags": [
                "Spell",
                "air",
                "buff",
                "self-target",
                "on-hit",
                "bow",
                "damage convert",
                "increase range",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Improved Aggression",
            "class": "Amplifier",
            "branch": "Bolster",
            "tier": 1,
            "action": "1 minute",
            "cost": "2 animal ingredients",
            "range": "---",
            "duration": "1 minute",
            "description": [
                "You amplify an entity's aggressive nature. Target entity's physical damage increases by 25%. That entity may expend 30 HP as a free action in order to increase the physical damage of its next attack by an additional 25%."
            ],
            "tags": [
                "alchemy",
                "augmentation",
                "increase damage",
                "gain action"
            ]
        },
        {
            "type": "ability",
            "name": "Enhanced Vigor",
            "class": "Amplifier",
            "branch": "Fortify",
            "tier": 1,
            "action": "1 minute",
            "cost": "2 mineral ingredients",
            "range": "---",
            "duration": "1 minute",
            "description": [
                "You amplify an entity's heartiness. Target entity's maximum HP increases by 25% (its current HP increases by the same amount, and also decreases by the same amount when this effect expires). That entity may convert any amount of its current stamina and/or mana in order to heal HP equal to that amount as a free action."
            ],
            "tags": [
                "alchemy",
                "augmentation",
                "increase max HP",
                "gain action"
            ]
        },
        {
            "type": "ability",
            "name": "Refined Agility",
            "class": "Amplifier",
            "branch": "Supplement",
            "tier": 1,
            "action": "1 minute",
            "cost": "2 plant ingredients",
            "range": "---",
            "duration": "1 minute",
            "description": [
                "You amplify an entity's natural reflexes. Target entity's gains an additional 20 ft of speed. That entity may use a second Reaction in a round, but if they do so, they lose their next turn's Minor action."
            ],
            "tags": [
                "alchemy",
                "augmentation",
                "add speed",
                "action conversion"
            ]
        },
        {
            "type": "ability",
            "name": "Hydro Pump",
            "class": "Aquamancer",
            "branch": "Geyser",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 mana",
            "range": "60 ft",
            "duration": "Instant",
            "description": [
                "You fire a stream of powerfully moving water. Deal 6d6 water magic damage to all enemies in a 60 foot line starting from your position in any direction. The last enemy in the line is pushed 10 ft away from you."
            ],
            "tags": [
                "Spell",
                "attack",
                "water",
                "destruction",
                "damage",
                "AOE",
                "line",
                "forced movement"
            ]
        },
        {
            "type": "ability",
            "name": "Tidal Wave",
            "class": "Aquamancer",
            "branch": "Geyser",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "25 mana",
            "range": "60 ft",
            "duration": "Instant",
            "description": [
                "You conjure a large wave of water that crashes into your foes. Deal 8d6 water magic damage to all enemies in a 30 ft cube, centered on a space in range, leaving behind a field of shallow water in the spaces affected that act as difficult terrain for 1 hour."
            ],
            "tags": [
                "Spell",
                "attack",
                "water",
                "destruction",
                "control",
                "conjuration",
                "AOE",
                "cube",
                "field"
            ]
        },
        {
            "type": "ability",
            "name": "Water Whip",
            "class": "Aquamancer",
            "branch": "Geyser",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "35 mana",
            "range": "60 ft",
            "duration": "Instant",
            "description": [
                "You create a thin whip of liquid that lacerates enemies. Deal 9d6 water magic damage to a target in range. This attack cannot be blocked and cannot miss, and it is affected by your critical strike chance and critical damage modifier. If this attack does not fail, you may pull the target towards you by 10 ft."
            ],
            "tags": [
                "Spell",
                "attack",
                "ranged",
                "water",
                "destruction",
                "control",
                "conjuration",
                "no-miss",
                "no-block",
                "conditional",
                "modal",
                "forced movement"
            ]
        },
        {
            "type": "ability",
            "name": "Whirlpool",
            "class": "Aquamancer",
            "branch": "Geyser",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "60 mana",
            "range": "60 ft",
            "duration": "Instant",
            "description": [
                "You create a swirling pool of dangerous waters. Create a 35 ft square whirlpool centered on a space in range. At the beginning of each enemy's turn that is within the whirlpool, they become Immobilized, take 10d6 water magic damage, and are pulled to the center of the whirlpool (or as far as available space will allow), skirting around any other entities or blockages during their forced movement (but not blockages that completely encircle the center of the whirlpool). If they are within the center 15 ft square of the whirlpool when their turn begins, they instead take 15d6 water magic damage, are Immobilized, and begin drowning. Drowning entities have a 25% chance of instantly dying at the end of their turn. You may use a Major Action to move the whirlpool up to 20 ft in any direction at no mana cost."
            ],
            "tags": [
                "Spell",
                "attack",
                "ranged",
                "water",
                "destruction",
                "conjuration",
                "condition",
                "Immobilize",
                "conditional",
                "modal",
                "forced movement",
                "instant death",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Water Pulse",
            "class": "Aquamancer",
            "branch": "Harbor",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "15 mana",
            "range": "60 ft",
            "duration": "Instant",
            "description": [
                "You push and pull water to adjust the position of others. For all targets in range, choose one or neither:",
                "<ul>",
                "<li>Push the target 10 feet away from you</li>",
                "<li>Pull the target 10 feet towards you</li>",
                "</ul>",
                "Targets cannot occupy the same space, and so they will bump into each other and stop their forced movement as needed to accommodate. All forced movement occurs simultaneously."
            ],
            "tags": [
                "Spell",
                "water",
                "control",
                "multi-target",
                "modal",
                "forced movement"
            ]
        },
        {
            "type": "ability",
            "name": "Washout",
            "class": "Aquamancer",
            "branch": "Harbor",
            "tier": 2,
            "action": "1 Reaction",
            "cost": "20 mana",
            "range": "100 ft",
            "duration": "Instant",
            "description": [
                "You turn a mage's mana into nourishing water. As a reaction to a target in range casting a spell, you may counter that spell. You heal equal to the amount of mana spent on the countered spell."
            ],
            "tags": [
                "Spell",
                "water",
                "defensive",
                "counterspell",
                "conditional",
                "single-target",
                "heal"
            ]
        },
        {
            "type": "ability",
            "name": "Bubble Barrier",
            "class": "Aquamancer",
            "branch": "Harbor",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "30 mana",
            "range": "60 ft",
            "duration": "Instant",
            "description": [
                "You create orbs of water to protect allies. Create 3 orbs of water which surround yourself or a target ally in range (you may divide the 3 orbs amongst multiple targets). The first orb grants a +20 AC buff. The second orb grants a +30% MR buff. The third orb grants a +25% Evasion buff. An orb will automatically block 1 attack targeting the entity it is surrounding before dissipating if the entity would otherwise take damage."
            ],
            "tags": [
                "Spell",
                "water",
                "defensive",
                "conjuration",
                "modal",
                "conditional",
                "buff",
                "block"
            ]
        },
        {
            "type": "ability",
            "name": "Summon Water Weird",
            "class": "Aquamancer",
            "branch": "Harbor",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "70 mana",
            "range": "60 ft",
            "duration": "1 minute",
            "description": [
                "You summon a creature made of magically enhanced water. Summon a Weird with large size, 100 health, 50% evasion, 50% MR, 100% CR, water element affinity, and immunity to physical damage. It follows your Commands; otherwise, it uses its Move Action to approach nearby enemies, its Major Action to either swipe at all adjacent enemies for 10d6 physical damage, pushing them back 20 ft, or fire a blast of water that deals 12d6 water magic damage in a 15 ft square centered on a space within 60 ft, inflicting 20% water vulnerability which stacks, and its reaction to block an attack targeting an adjacent ally."
            ],
            "tags": [
                "Spell",
                "water",
                "summoning",
                "minion",
                "forced movement",
                "water vulnerability",
                "block"
            ]
        },
        {
            "type": "ability",
            "name": "Baptize",
            "class": "Aquamancer",
            "branch": "Confluence",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "15 mana",
            "range": "60 ft",
            "duration": "Instant",
            "description": [
                "You spray an ally with a soothing mist. Heal 6d6 to a target in range. For every 6 you roll, cleanse a random condition on the target."
            ],
            "tags": [
                "Spell",
                "water",
                "restoration",
                "heal",
                "conditional",
                "random",
                "cleanse",
                "single-target"
            ]
        },
        {
            "type": "ability",
            "name": "Rain of Wellness",
            "class": "Aquamancer",
            "branch": "Confluence",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "30 mana",
            "range": "60 ft",
            "duration": "Instant",
            "description": [
                "You conjure a healing rain to restore multiple allies. All allies in a 30 ft cube centered on a space in range are cleansed of a condition of their choice. This rain persists, granting allies inside of it +20% general condition resist until the beginning of your next turn, at which point it cleanses all allies of a condition of their choice before dissipating."
            ],
            "tags": [
                "Spell",
                "water",
                "restoration",
                "buff field",
                "cleanse",
                "AOE",
                "cube"
            ]
        },
        {
            "type": "ability",
            "name": "Draught of Vigor",
            "class": "Aquamancer",
            "branch": "Confluence",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "40 mana",
            "range": "60 ft",
            "duration": "1 minute",
            "description": [
                "You provide a swig of magically enhanced drink to an ally. Target ally in range gains two of the following buffs for the duration of your choosing (you can't choose the same effect more than once and similar effects from multiple casts of this spell do not stack):",
                "<ul>",
                "<li>Physical attacks gain, \"On Hit: Deal 4d6 water magic damage\"</li>",
                "<li>Spell attacks have their magic damage increased by 30%</li>",
                "<li>At the beginning of each turn, heal for 10 health</li>",
                "<li>Gain +20 movement speed</li>",
                "<li>Gain +10% critical strike chance</li>",
                "<li>Gain +100% critical damage modifier</li>",
                "<li>Gain +20 to all skill checks</li>",
                "<li>Gain the ability to roll a skill of the caster's choosing that the caster has, with the caster's modifier</li>",
                "<li>Gain the ability to speak, understand, read, and write a language of the caster's choosing that the caster knows</li>",
                "</ul>",
                "You may expend an additional 20 mana to bottle the effects you choose into a potion which will expire in 1 hour."
            ],
            "tags": [
                "Spell",
                "water",
                "restoration",
                "buffing",
                "divination",
                "buff",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Fountain of Purity",
            "class": "Aquamancer",
            "branch": "Confluence",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "60 mana",
            "range": "60 ft",
            "duration": "1 minute",
            "description": [
                "You create nourishing fountains. Create 2 large fountains in empty spaces within range. When the fountains initially appear, allies within 10 ft heal for 30 health and cleanse 1 condition of their choice. Allies standing next to a fountain gain 30% CR and 30% evasion. While the fountains persist, allies may use a minor action to drink from an adjacent fountain, healing for 30 health and cleansing for 1 condition of their choice. When you cast this spell, you may create additional fountains for 30 additional mana each."
            ],
            "tags": [
                "Spell",
                "water",
                "restoration",
                "conjuration",
                "cleanse",
                "heal",
                "buff field",
                "modal",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Magic Dart",
            "class": "Arcanist",
            "branch": "Zapping",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 mana",
            "range": "70 ft",
            "duration": "Instant",
            "description": [
                "You fire bolts of pure magic at one or more enemies. Create 3 magic darts of any elements and divide them as you choose amongst 1, 2, or 3 enemies. Each dart deals d12 magic damage of its chosen element."
            ],
            "tags": [
                "Spell",
                "attack",
                "destruction",
                "single-target",
                "multi-target",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Magic Sear",
            "class": "Arcanist",
            "branch": "Zapping",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "20 mana",
            "range": "70 ft",
            "duration": "1 minute",
            "description": [
                "You douse an enemy in destructive mana. Deal 3d12 magic damage of a chosen element to a target in range. The target takes d12 magic damage of the same type at the beginning of each of its turns."
            ],
            "tags": [
                "Spell",
                "attack",
                "destruction",
                "single-target",
                "condition"
            ]
        },
        {
            "type": "ability",
            "name": "Magic Bomb",
            "class": "Arcanist",
            "branch": "Blasting",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "20 mana",
            "range": "70 ft",
            "duration": "Instant",
            "description": [
                "You create a small explosive ball of mana. Deal 4d12 magic damage of a chosen element type in one of the following AOE shapes of your choice:",
                "<ul>",
                "<li>A 25 ft cube</li>",
                "<li>A 45 ft cross</li>",
                "</ul>"
            ],
            "tags": [
                "Spell",
                "attack",
                "destruction",
                "AOE",
                "square",
                "cross",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Magic Ray",
            "class": "Arcanist",
            "branch": "Blasting",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "30 mana",
            "range": "70 ft",
            "duration": "Instant",
            "description": [
                "You fire rays of destructive mana. Deal 4d12 magic damage of a chosen element type to all enemies in a 70 ft cone, inflicting a 10% Magic Vulnerability to all targets."
            ],
            "tags": [
                "Spell",
                "attack",
                "destruction",
                "AOE",
                "cone",
                "condition",
                "Vulnerability"
            ]
        },
        {
            "type": "ability",
            "name": "Magic Primer",
            "class": "Arcanist",
            "branch": "Arcane",
            "tier": 1,
            "action": "1 Minor Action",
            "cost": "15 mana",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You charge mana to augment your next spell with raw power. Your next spell attack's damage increases by 30% and will be affected by your critical strike chance and critical damage modifier."
            ],
            "tags": [
                "Spell",
                "empower",
                "destruction",
                "self-target",
                "damage increase"
            ]
        },
        {
            "type": "ability",
            "name": "Force Spike",
            "class": "Arcanist",
            "branch": "Arcane",
            "tier": 2,
            "action": "1 Reaction",
            "cost": "20 mana",
            "range": "100 ft",
            "duration": "Instant",
            "description": [
                "You turn a mage's mana against them. As a reaction to a spell being cast within range, counter that spell. The caster of the countered spell loses health equal to the amount of mana spent on the countered spell."
            ],
            "tags": [
                "Spell",
                "destruction",
                "defensive",
                "counterspell"
            ]
        },
        {
            "type": "ability",
            "name": "Vanish",
            "class": "Assassin",
            "branch": "Skulk",
            "tier": 1,
            "action": "1 Minor Action",
            "cost": "10 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You move quickly to avoid detection. You immediately become Hidden, and you may dash up to 10 ft in any direction. You may cast this ability as a reaction for 30 stamina."
            ],
            "tags": [
                "self-target",
                "Hidden",
                "buff",
                "dash",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Maneuver",
            "class": "Assassin",
            "branch": "Skulk",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "20 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You move quickly and can ascend sheer walls. Dash up to 40 ft. During your dash, you can also scale walls up to 40 ft."
            ],
            "tags": [
                "Dash",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Pursue",
            "class": "Assassin",
            "branch": "Skulk",
            "tier": 3,
            "action": "1 Reaction",
            "cost": "25 stamina",
            "range": "100 ft",
            "duration": "Instant",
            "description": [
                "You follow quickly after a fleeing enemy. As a reaction to a target in range moving, you may move an equal distance towards the target. You then mark the target, increasing your critical damage modifier by 50% on the marked target. This mark can stack multiple times."
            ],
            "tags": [
                "Dash",
                "conditional",
                "reaction",
                "condition",
                "stackable"
            ]
        },
        {
            "type": "ability",
            "name": "Stalk",
            "class": "Assassin",
            "branch": "Skulk",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "50 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You move quickly from shadow to shadow. Become Hidden. Then, while hidden, you may use this ability to dash up to 60 ft. At the end of your dash, if you make a successful Sneak check, you may repeat this ability at no cost."
            ],
            "tags": [
                "Dash",
                "conditional",
                "Sneak",
                "continuous"
            ]
        },
        {
            "type": "ability",
            "name": "Focus",
            "class": "Assassin",
            "branch": "Preparation",
            "tier": 1,
            "action": "1 Minor Action",
            "cost": "5 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You ready yourself for the kill. Your next attack gains an additional 30% critical strike chance. This buff is consumed even if you miss or all of your damage is blocked, and it does not stack with itself."
            ],
            "tags": [
                "self-target",
                "buff",
                "improve critical strike chance"
            ]
        },
        {
            "type": "ability",
            "name": "Sharpen",
            "class": "Assassin",
            "branch": "Preparation",
            "tier": 2,
            "action": "1 Minor Action",
            "cost": "15 stamina",
            "range": "Self",
            "duration": "1 minute",
            "description": [
                "You prepare your blades for the kill. For this ability's duration, all of your d4 damage dice become d6 damage dice instead."
            ],
            "tags": [
                "self-target",
                "buff",
                "improve damage dice"
            ]
        },
        {
            "type": "ability",
            "name": "Haste",
            "class": "Assassin",
            "branch": "Preparation",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "50 stamina",
            "range": "Self",
            "duration": "20 seconds",
            "description": [
                "You temporarily speed up your actions. During your next turn, you gain an additional Major action and Minor action. Also, until the end of your next turn, you may take any number of reactions."
            ],
            "tags": [
                "self-target",
                "buff",
                "action gain",
                "delayed effect"
            ]
        },
        {
            "type": "ability",
            "name": "Bloodlust",
            "class": "Assassin",
            "branch": "Preparation",
            "tier": 4,
            "action": "1 Minor Action",
            "cost": "100 stamina",
            "range": "Self",
            "duration": "1 minute",
            "description": [
                "You become a spectre of whirling death. For this ability's duration, dealing a killing blow on an enemy resets your Move, Major, and Minor actions."
            ],
            "tags": [
                "self-target",
                "buff",
                "action reset",
                "concentration",
                "on-kill"
            ]
        },
        {
            "type": "ability",
            "name": "Backstab",
            "class": "Assassin",
            "branch": "Execution",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You attack from your enemy's blind spot. Deal 3d4 physical damage to a target in range. If you are Hidden, you roll max damage on all damage dice automatically."
            ],
            "tags": [
                "Attack",
                "physical",
                "conditional",
                "melee",
                "Hidden"
            ]
        },
        {
            "type": "ability",
            "name": "Pounce",
            "class": "Assassin",
            "branch": "Execution",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "15 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You quickly close in on your target before dealing the killing blow. Dash up to 15 ft towards a target, then deal 4d4 physical damage to a target in range."
            ],
            "tags": [
                "Attack",
                "melee",
                "physical",
                "dash"
            ]
        },
        {
            "type": "ability",
            "name": "Skyfall",
            "class": "Assassin",
            "branch": "Execution",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "30 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You bring death from above. You may cast this ability while falling on a target from at least 10 ft above it. Deal 8d4 physical damage to the target, with a 100% increased critical damage modifier."
            ],
            "tags": [
                "Attack",
                "physical",
                "conditional",
                "melee",
                "aerial",
                "empowered"
            ]
        },
        {
            "type": "ability",
            "name": "Massacre",
            "class": "Assassin",
            "branch": "Execution",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "60 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You strike as a blur, killing many. Deal 16d4 physical damage, dividing your damage dice amongst any number of adjacent targets as you choose. For every damage die a target is hit by, that attack gains 5% Lethality. You roll for critical strike chance only once, for all dice."
            ],
            "tags": [
                "Attack",
                "physical",
                "melee",
                "single-target",
                "multi-target",
                "modal",
                "Lethal"
            ]
        },
        {
            "type": "ability",
            "name": "Amalgam Hunter",
            "class": "Bioengineer",
            "branch": "Aggressive",
            "tier": 1,
            "action": "1 minute",
            "cost": "2 different creatures with teeth/claws",
            "range": "---",
            "duration": "1 minute",
            "description": [
                "You fuse two already dangerous beasts together. Create a Hunter organism with 30 HP to fight in combat. The Hunter acts on your turn, and has a Move, Major, and Minor action. You can use Command Actions to give it various orders; otherwise, it attacks the closest enemy. It can use its Move action to move up to 30 ft. It can use its Major action to deal 3d12 physical damage to targets in melee range. It can use its Minor action to heal itself for 20 HP"
            ],
            "tags": [
                "alchemy",
                "organics",
                "minion",
                "physical",
                "melee"
            ]
        },
        {
            "type": "ability",
            "name": "Amalgam Artillery",
            "class": "Bioengineer",
            "branch": "Aggressive",
            "tier": 2,
            "action": "1 minute",
            "cost": "1 elemental ingredient and 1 creature",
            "range": "---",
            "duration": "1 minute",
            "description": [
                "You create a ranged attacker organism. Create an Artillery organism with 20 HP to fight in combat. The Artillery acts on your turn, and has a Move, Major, and Minor action. You can use Command Actions to give it various orders; otherwise, it attacks the closest enemy. It can use its Move action to move up to 10 ft. It can use its Major action to deal 3d12 physical damage to targets up to 60 ft away. It can use its Minor action to mark targets up to 60 ft away, decreasing their evasion by 20%."
            ],
            "tags": [
                "alchemy",
                "organics",
                "minion",
                "physical",
                "single-target",
                "evasion loss"
            ]
        },
        {
            "type": "ability",
            "name": "Amalgam Trapper",
            "class": "Bioengineer",
            "branch": "Aggressive",
            "tier": 3,
            "action": "1 minute",
            "cost": "1 corrosive or toxic ingredient and 1 creature",
            "range": "---",
            "duration": "1 minute",
            "description": [
                "You create a melee trapper organism. Create an Trapper organism with 40 HP to fight in combat. The Trapper acts on your turn, and has a Move, Major, and Minor action. You can use Command Actions to give it various orders; otherwise, it attacks the closest enemy. It can use its Move action to move up to 70 ft. It can use its Major action to grapple an adjacent target, Immobilizing it. It can use its Minor action to decrease a grappled target's AC or MR by half (if you don't specify, it will choose one randomly)."
            ],
            "tags": [
                "alchemy",
                "organics",
                "minion",
                "single-target",
                "AC loss",
                "MR loss",
                "condition",
                "Immobilize"
            ]
        },
        {
            "type": "ability",
            "name": "Amalgam Bomber",
            "class": "Bioengineer",
            "branch": "Aggressive",
            "tier": 4,
            "action": "1 minute",
            "cost": "5 explosive ingredients and 5 large creatures",
            "range": "---",
            "duration": "1 minute",
            "description": [
                "You create a bloated creature rigged to explode. Create a Bomber organism with 20 HP to fight in combat. The Bomber acts on your turn, and has a Move, Major, and Minor action. You can use Command Actions to give it various orders; otherwise, it walks towards the closest enemy. It can use its Move action to move up to 15 ft. It can use its Major action to self destruct, dealing 8d12 magic damage of its aspected element in a 25 ft cube (it deals physical damage if non-aspected instead). It can use its Minor action to change its aspected element (if you don't specify, it will choose one randomly; it begins as non-elemental)."
            ],
            "tags": [
                "alchemy",
                "organics",
                "minion",
                "AOE",
                "physical",
                "magic",
                ""
            ]
        },
        {
            "type": "ability",
            "name": "Crafted Cleric",
            "class": "Bioengineer",
            "branch": "Steadfast",
            "tier": 1,
            "action": "5 minutes",
            "cost": "2 healing ingredients and 1 creature",
            "range": "---",
            "duration": "1 minute",
            "description": [
                "You invent an organism that can donate its own life force. Create a Healer organism with 30 HP and 30 mana to heal in combat. The Healer acts on your turn, and has a Move, Major, and Minor action. You can use Command Actions only to give it an order to heal a specific target; otherwise, it heals the closest ally. It can use its Move action to move up to 20 ft. It can use its Major action to expend 10 mana to heal an adjacent target for 3d12. It can use its Minor Action to drink health or mana potions."
            ],
            "tags": [
                "alchemy",
                "organics",
                "minion",
                "heal"
            ]
        },
        {
            "type": "ability",
            "name": "Generate Guardian",
            "class": "Bioengineer",
            "branch": "Steadfast",
            "tier": 2,
            "action": "5 minutes",
            "cost": "2 healing ingredients and 1 creature",
            "range": "---",
            "duration": "1 minute",
            "description": [
                "You design an organism to protect you and your allies. Create a Guardian organism with 50 HP, 20 AC, and 50% general MR. The Guardian acts on your turn, and has a Move, Major, and Minor action, as well as a reaction. You can use Command Actions to give it various orders; otherwise, it stays near you and uses all abilities on you. It can use its Move action to move up to 30 ft. It can use its Major action to transfer either its AC or MR to a target within 30 ft. It can use its Minor action to heal itself for 5 HP or cleanse a condition on itself. It can use its reaction in response to an attack to block the attack, redirecting the attack to itself instead."
            ],
            "tags": [
                "alchemy",
                "organics",
                "minion",
                "defensive"
            ]
        },
        {
            "type": "ability",
            "name": "Absorbing Angel",
            "class": "Bioengineer",
            "branch": "Steadfast",
            "tier": 3,
            "action": "5 minutes",
            "cost": "2 healing ingredients and 1 creature",
            "range": "---",
            "duration": "1 minute",
            "description": [
                "You design an organism to cleanse conditions from you and your allies. Create an Angel organism with 10 HP. The Angel acts on your turn, and has a Move and Major action. You can use Command Actions to give it various orders; otherwise, it stays near you and uses all abilities on you. It can use its Move action to move up to 30 ft. It can use its Major action to cleanse a condition on an adjacent target, taking 2 damage in the process."
            ],
            "tags": [
                "alchemy",
                "organics",
                "minion",
                "cleanse"
            ]
        },
        {
            "type": "ability",
            "name": "Child of Life",
            "class": "Bioengineer",
            "branch": "Steadfast",
            "tier": 4,
            "action": "5 minutes",
            "cost": "6 healing ingredients and 3 creatures",
            "range": "---",
            "duration": "1 minute",
            "description": [
                "You design an organism to protect you from fatal attacks. Create a homunculus organism with 1 HP. The homunculus acts on your turn, and has a Move and Major action, as well as a Reaction. You can use Command Actions to give it various orders; otherwise, it attaches itself to you and becomes Immune to all damage and conditions. It can use its Move action to move up to 30 ft. It can use its Major action to attach to an entity and become Immune to all damage and conditions, or to stabilize a downed entity. It can use its Reaction to completely absorb an attack that would down/kill the entity it is attached to, killing itself in the process."
            ],
            "tags": [
                "alchemy",
                "organics",
                "minion",
                "defensive"
            ]
        },
        {
            "type": "ability",
            "name": "Call to Heel",
            "class": "Bioengineer",
            "branch": "Research",
            "tier": 1,
            "action": "1 Minor Action",
            "cost": "---",
            "range": "100 ft",
            "duration": "Instant",
            "description": [
                "You call your creations to return to your side. Any number of target organisms that you created dash up to 100 ft to any space adjacent to you."
            ],
            "tags": [
                "alchemy",
                "organics",
                "command",
                "minion",
                "dash"
            ]
        },
        {
            "type": "ability",
            "name": "Transfer Lifeforce",
            "class": "Bioengineer",
            "branch": "Research",
            "tier": 2,
            "action": "1 Minor Action",
            "cost": "---",
            "range": "100 ft",
            "duration": "Instant",
            "description": [
                "You sacrifice an organism to heal another organism. Destroy a target organism you created in range, then heal another target organism in range for the amount of HP the destroyed organism had left."
            ],
            "tags": [
                "alchemy",
                "organics",
                "command",
                "minion",
                "sacrifice"
            ]
        },
        {
            "type": "ability",
            "name": "Hibernate",
            "class": "Bioengineer",
            "branch": "Research",
            "tier": 3,
            "action": "1 Minor Action",
            "cost": "---",
            "range": "100 ft",
            "duration": "Instant",
            "description": [
                "You command an organism to freeze its metabolism. A target organism you created becomes Incapacitated. While Incapacitated in this way, an organism does not deplete its duration. If you cast this ability on an organism that is already Incapacitated in this manner, it cleanses the condition"
            ],
            "tags": [
                "alchemy",
                "organics",
                "command",
                "minion",
                "condition",
                "Incapacitate"
            ]
        },
        {
            "type": "ability",
            "name": "Adoption",
            "class": "Bioengineer",
            "branch": "Research",
            "tier": 4,
            "action": "1 Minor Action",
            "cost": "---",
            "range": "100 ft",
            "duration": "Instant",
            "description": [
                "You command an organism to obey a new master. Choose an ally you can see. A target organism you created in range has control if it given to that ally. If you cast this ability on an organism you created in range that is under someone else's control, you may either take control of the organism or give control of it to a new ally."
            ],
            "tags": [
                "alchemy",
                "organics",
                "command",
                "minion",
                "condition",
                "Incapacitate"
            ]
        },
        {
            "type": "ability",
            "name": "Web",
            "class": "Conjurer",
            "branch": "Ephemeral",
            "tier": 1,
            "action": "1 Major Action or Reaction",
            "cost": "10 mana",
            "range": "50 ft",
            "duration": "Instant",
            "description": [
                "You spew out skeins of sticky mana. Choose one:",
                "<ul>",
                "<li>Attach yourself or another target in range to a surface within range, preventing them from falling or being pushed further from that surface until the beginning of your next turn</li>",
                "<li>Target in range becomes Immobilized until the end of their next turn</li>",
                "</ul>"
            ],
            "tags": [
                "Spell",
                "conjuration",
                "modal",
                "attack",
                "condition",
                "Immobilize"
            ]
        },
        {
            "type": "ability",
            "name": "Fog",
            "class": "Conjurer",
            "branch": "Ephemeral",
            "tier": 2,
            "action": "1 Major Action or Reaction",
            "cost": "15 mana",
            "range": "50 ft",
            "duration": "20 seconds",
            "description": [
                "You cast out mana as a cloud. Create a Fog field in a 35 ft square centered on a point in range. You and your allies can see through the Fog; other entities have obscured vision (Blinded) within the field. The field lasts until the end of your next turn. If this spell would end, you may recast this spell as a free reaction instead."
            ],
            "tags": [
                "Spell",
                "conjuration",
                "field",
                "condition",
                "Blind",
                "AOE",
                "square"
            ]
        },
        {
            "type": "ability",
            "name": "Armament",
            "class": "Conjurer",
            "branch": "Formed",
            "tier": 1,
            "action": "1 Minor Action",
            "cost": "10 mana",
            "range": "50 ft",
            "duration": "1 minute",
            "description": [
                "You create a weapon or piece of armor for temporary use. Create a mundane weapon or piece of armor of your choosing and equip it to a target in range. This spell fails if the equipment slot being affected is already filled."
            ],
            "tags": [
                "Spell",
                "conjuration",
                "modal",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Self Defense Turret",
            "class": "Conjurer",
            "branch": "Formed",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "20 mana",
            "range": "50 ft",
            "duration": "1 minute",
            "description": [
                "You create a specialized defense totem. Create an SDF totem in an empty space within range, with 100 HP. When the totem takes damage, it deals twice as much damage of the same type back at the attacker. While the SDF totem is active and within 50 ft of you, you may use your reaction to redirect an attack targeting you or an ally to the totem."
            ],
            "tags": [
                "Spell",
                "conjuration",
                "modal",
                "conditional",
                "totem"
            ]
        },
        {
            "type": "ability",
            "name": "Force Wall",
            "class": "Conjurer",
            "branch": "Lasting",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "20 mana",
            "range": "50 ft",
            "duration": "1 hour",
            "description": [
                "You form a surface of solidified mana. Choose one:",
                "<ul>",
                "<li>Create a 10 ft wide, 100 ft long bridge starting in an empty space in range. Allies cannot be pushed off the bridge.</li>",
                "<li>Create a 20 ft high, 20 ft wide wall centered on an empty space in range. Allies can freely see through, walk through, and fire projectiles through the wall.</li>",
                "</ul>"
            ],
            "tags": [
                "Spell",
                "conjuration",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Mansion",
            "class": "Conjurer",
            "branch": "Lasting",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "30 mana",
            "range": "200 ft",
            "duration": "6 hours",
            "description": [
                "You create a large building for a group to rest in. Create a Mansion that occupies an empty 105 ft square centered on a point in range (you may optionally decrease the size of the Mansion to fit smaller spaces, down to a lower limit of 35 ft square). You freely control who can enter the Mansion, and occupants of the Mansion can freely control the interior's furnishings. The Mansion protects occupants from the elements as well as from intruders."
            ],
            "tags": [
                "Spell",
                "conjuration",
                "modal",
                "AOE",
                "square"
            ]
        },
        {
            "type": "ability",
            "name": "Hold Person",
            "class": "Controller",
            "branch": "Subjugate",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "20 mana",
            "range": "60 ft",
            "duration": "20 seconds",
            "description": [
                "You bind an enemy with magic. A target in range becomes Stunned until the end of your next turn. You may recast this spell while concentrating on it for 10 mana; if you do, the duration is extended for an additional round."
            ],
            "tags": [
                "Spell",
                "attack",
                "single-target",
                "control",
                "condition",
                "Stun",
                "conditional",
                "modal",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Mass Slow",
            "class": "Controller",
            "branch": "Dominate",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "25 mana",
            "range": "60 ft",
            "duration": "1 minute",
            "description": [
                "You cast out many skeins of mana to impede opponents. Up to 4 targets in range become Slowed for the duration. For every additional 15 mana you spend when you cast this spell, you may choose 4 additional targets."
            ],
            "tags": [
                "Spell",
                "attack",
                "multi-target",
                "control",
                "condition",
                "Slow",
                "modal",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Baneful Curse",
            "class": "Controller",
            "branch": "Tyranny",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "15 mana",
            "range": "60 ft",
            "duration": "1 hour",
            "description": [
                "You curse an enemy with bad luck. A target in range gains a mark which gives -20 to all skill checks for the duration. You may spend 1 minute casting this spell as a minor ritual; if you do, its duration is 6 hours. You may spend 10 minutes casting this spell as a major ritual; if you do, its duration is 24 hours."
            ],
            "tags": [
                "Spell",
                "control",
                "modal",
                "minor ritual",
                "major ritual"
            ]
        },
        {
            "type": "ability",
            "name": "Ice Spear",
            "class": "Cryomancer",
            "branch": "Arctic",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 mana",
            "range": "30 ft",
            "duration": "Instant",
            "description": [
                "You form a spear of ice and fire it at a nearby target. Deal 6d8 ice magic damage to a target in range. The ice spear passes through any enemies along its path, dealing half damage."
            ],
            "tags": [
                "Spell",
                "attack",
                "ranged",
                "ice",
                "destruction",
                "damage",
                "single-target",
                "multi-target"
            ]
        },
        {
            "type": "ability",
            "name": "Glacial Crash",
            "class": "Cryomancer",
            "branch": "Arctic",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "30 mana",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You cause spears of ice to erupt around you. Enemies within 5 ft of you take 8d8 ice magic damage and are Frozen. Enemies within 10 ft of you take 6d8 ice magic damage and are Slowed. Enemies within 15 ft of you take 4d8 damage."
            ],
            "tags": [
                "Spell",
                "attack",
                "ice",
                "destruction",
                "damage",
                "self-target",
                "condition",
                "control",
                "Slow",
                "Frozen",
                "AOE"
            ]
        },
        {
            "type": "ability",
            "name": "Shatter",
            "class": "Cryomancer",
            "branch": "Arctic",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "50 mana",
            "range": "30 ft",
            "duration": "Instant",
            "description": [
                "You shatter an enemy encased in ice. Deal 10d8 ice magic damage to a target within range who is Frozen. Their Frozen condition ends, and they are Slowed. Then, this spell's effect repeat for an adjacent Frozen target. A target cannot be damaged by this spell more than once per cast."
            ],
            "tags": [
                "Spell",
                "attack",
                "ice",
                "destruction",
                "damage",
                "single-target",
                "conditional",
                "Frozen",
                "Slow",
                "repeatable"
            ]
        },
        {
            "type": "ability",
            "name": "Aurora Beam",
            "class": "Cryomancer",
            "branch": "Arctic",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "X mana",
            "range": "60 ft",
            "duration": "Instant",
            "description": [
                "You emit a powerful beam of ice. Deal Xd8 ice magic damage to all targets in a line, where X is the amount of mana expended on this spell divided by 5. You may choose to concentrate on this spell further, and if you do, you may use a major action to repeat this spell for no mana cost, at half its previous damage. If this spell consumes at least 5 stacks of Frostbite, refund half of the mana cost. If this attack consumes at least 10 stacks of Frostbite, refund the full mana cost."
            ],
            "tags": [
                "Spell",
                "attack",
                "ice",
                "destruction",
                "damage",
                "AOE",
                "line",
                "modal",
                "continuous",
                "concentration",
                "gain mana"
            ]
        },
        {
            "type": "ability",
            "name": "Flash Freeze",
            "class": "Cryomancer",
            "branch": "Chilling",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "15 mana",
            "range": "30 ft",
            "duration": "1 minute",
            "description": [
                "You freeze a target solid. Apply Frozen to a target in range, and apply Slow to any enemies adjacent to your target. Applies a stack of your passive on cast, even if resisted."
            ],
            "tags": [
                "Spell",
                "attack",
                "ice",
                "condition",
                "control",
                "Frozen",
                "Slow",
                "single target"
            ]
        },
        {
            "type": "ability",
            "name": "Freezing Wind",
            "class": "Cryomancer",
            "branch": "Chilling",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "35 mana",
            "range": "60 ft cone",
            "duration": "Instant",
            "description": [
                "You conjure a cone of icy wind. Enemies in a 60 ft cone in front of you are Slowed. If an enemy is hit by this spell, and already is Slowed or has a stack of your passive on them, they are Frozen instead."
            ],
            "tags": [
                "Spell",
                "attack",
                "ice",
                "conjuration",
                "control",
                "Frozen",
                "Slow",
                "AOE",
                "cone"
            ]
        },
        {
            "type": "ability",
            "name": "Hypothermia",
            "class": "Cryomancer",
            "branch": "Chilling",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "70 mana",
            "range": "30 ft",
            "duration": "Instant",
            "description": [
                "You drop a target's body temperature, slowing their metabolism. A target within range becomes Slowed, loses its Major action, Minor action, and reaction, and loses all Evasion. This spell requires concentration."
            ],
            "tags": [
                "Spell",
                "attack",
                "ice",
                "condition",
                "control",
                "Slow",
                "action loss",
                "evasion loss",
                "single-target",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Heart of Ice",
            "class": "Cryomancer",
            "branch": "Chilling",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "100 mana",
            "range": "Self",
            "duration": "1 hour",
            "description": [
                "You drape yourself in an icy aura. For the duration of this spell, enemies who move into a space within 30 feet of you become Slowed. Adjacent enemies who attack you become Frozen. Attacks from enemies more than 30 ft away grant you 40% evasion for that attack. Allies who are adjacent to you have all types of damage they deal converted to ice magic damage, and inflict Frostbite on-hit (limited to once per turn). You may use your reaction to cast any ice spell while this buff is active."
            ],
            "tags": [
                "Spell",
                "ice",
                "buff",
                "condition",
                "Slow",
                "Frozen",
                "self-target",
                "on-hit",
                "add evasion",
                "ally buff",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Ice Crafting",
            "class": "Cryomancer",
            "branch": "Snow",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "5 mana",
            "range": "50 ft",
            "duration": "10 minutes",
            "description": [
                "You create sheets of ice and snow. Cover the ground in a target space in your choice of either ice or snow. Ice spaces force creatures to make Balance checks or fall prone. Snow spaces count as difficult terrain. When you cast this spell, you can repeat it for as many spaces within range as desired, expending 5 more mana for every additional space. You can also create a pillar of ice or snow, with a height of up to 10 ft, in any space for an additional 5 mana."
            ],
            "tags": [
                "Spell",
                "smite-target",
                "conjuration",
                "ice",
                "modal",
                "repeatable"
            ]
        },
        {
            "type": "ability",
            "name": "Extinguish",
            "class": "Cryomancer",
            "branch": "Snow",
            "tier": 2,
            "action": "1 Reaction",
            "cost": "20 mana",
            "range": "100 ft",
            "duration": "Instant",
            "description": [
                "You take advantage of a mage casting a spell, freezing his mana. As a reaction to a target in range casting a spell, you may counter that spell. That target becomes Silenced until the end of their next turn."
            ],
            "tags": [
                "Spell",
                "counterspell",
                "condition",
                "defensive",
                "Silence",
                "control",
                "ice",
                "single-target"
            ]
        },
        {
            "type": "ability",
            "name": "Ice Block",
            "class": "Cryomancer",
            "branch": "Snow",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "40 mana",
            "range": "Self",
            "duration": "1 minute",
            "description": [
                "You surround yourself in an icy armor, and manipulate a shield of ice. Increase your AC by 20, and increase your general MR by 30% until the beginning of your next turn. While you have this buff, you may use your reaction to completely block one attack on you or an ally within 30 ft, for no additional mana."
            ],
            "tags": [
                "Spell",
                "defensive",
                "buff",
                "AC increase",
                "MR increase",
                "block",
                "self-target",
                "single-target"
            ]
        },
        {
            "type": "ability",
            "name": "Frozen  Arena",
            "class": "Cryomancer",
            "branch": "Snow",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "60 mana",
            "range": "1000 ft",
            "duration": "1 minute",
            "description": [
                "You create an arena surrounded in ice. Create a 200 ft cube zone centered on a point within range. Within this zone, all enemies have the following: they are revealed; they cannot leave the zone unless you allow them as a free reaction; if they have at least 1 stack of Frostbite, they have their Frostbite doubled at the beginning of each turn. Any entity that dies with at least 1 stack of Frostbite has its Frostbite stacks transferred to another entity of your choice within the zone."
            ],
            "tags": [
                "Spell",
                "ice",
                "AOE",
                "zone",
                "cube",
                "on-death",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Belly Dance",
            "class": "Dancer",
            "branch": "Sway",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 stamina",
            "range": "Touch",
            "duration": "1 minute",
            "description": [
                "You charm attackers with your sensual touch and dull their strikes. Inflict a 10% Weaken to a target in range for the duration. This Weaken can stack up to 4 times. This ability costs 10 less stamina if your last Move Action included a Step 3 dance ability."
            ],
            "tags": [
                "Attack",
                "condition",
                "Weaken",
                "stacking",
                "conditional",
                "dance",
                "Step 1"
            ]
        },
        {
            "type": "ability",
            "name": "Swing",
            "class": "Dancer",
            "branch": "Sway",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "15 stamina",
            "range": "Touch",
            "duration": "Instant",
            "description": [
                "You force enemies to join you in dance. Push a target in range 20 ft in any direction. If the target hits other entities during its forced movement, it pushes them as well. This ability costs 15 less stamina if your last Move Action included a Step 1 dance ability."
            ],
            "tags": [
                "Attack",
                "push",
                "conditional",
                "dance",
                "Step 2"
            ]
        },
        {
            "type": "ability",
            "name": "Jive",
            "class": "Dancer",
            "branch": "Sway",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "20 stamina",
            "range": "Touch",
            "duration": "Instant",
            "description": [
                "You confound enemies with swirling limb and step. Inflict Confusion on an enemy in range. While an enemy is Confused in this manner, you may choose a specific direction when they move or attack, and the chosen direction becomes 3 times as likely to be selected when they roll. This ability costs 20 less stamina if your last Move Action included a Step 2 dance ability."
            ],
            "tags": [
                "Attack",
                "condition",
                "Confuse",
                "modal",
                "dance",
                "Step 3"
            ]
        },
        {
            "type": "ability",
            "name": "Tango",
            "class": "Dancer",
            "branch": "Strut",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 stamina",
            "range": "Touch",
            "duration": "Instant",
            "description": [
                "You join up with a partner, giving them time to recover while you guide their step. Cleanse 1 condition on yourself or cleanse 1 condition on an ally in range and push them 5 ft in any direction. This ability costs 10 less stamina if your last Move Action included a Step 1 dance ability."
            ],
            "tags": [
                "Cleanse",
                "push",
                "conditional",
                "dance",
                "Step 2"
            ]
        },
        {
            "type": "ability",
            "name": "Waltz",
            "class": "Dancer",
            "branch": "Strut",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "15 stamina",
            "range": "Touch",
            "duration": "Instant",
            "description": [
                "You reinvigorate an ally with your beautiful dance moves. Heal 3d10 for a target in range and cleanse Poison, Bleed, and Burn. This ability costs 15 less stamina if your last Move Action included a Step 2 ability."
            ],
            "tags": [
                "Cleanse",
                "heal",
                "conditional",
                "dance",
                "Step 3"
            ]
        },
        {
            "type": "ability",
            "name": "Boogie",
            "class": "Dancer",
            "branch": "Strut",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "20 stamina",
            "range": "Touch",
            "duration": "Instant",
            "description": [
                "You dance with an ally, energizing them. Dash up to your move speed, moving an ally in range with you (if you cast this ability as a Move Action, your movement becomes a dash instead). That ally gains an additional Major Action during their next turn. This ability costs 20 less stamina if your last Move Action included a Step 3 ability."
            ],
            "tags": [
                "Dash",
                "conditional",
                "dance",
                "Step 1"
            ]
        },
        {
            "type": "ability",
            "name": "Foxtrot",
            "class": "Dancer",
            "branch": "Shimmy",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 stamina",
            "range": "Self",
            "duration": "1 minute",
            "description": [
                "You quickly step and weave across the dance hall. Gain 10% evasion and 10% general MR for the duration. This buff can stack up to 4 times. This ability costs 10 less stamina if your last Move Action included a Step 2 dance ability."
            ],
            "tags": [
                "Buff",
                "gain evasion",
                "gain MR",
                "dance",
                "Step 3"
            ]
        },
        {
            "type": "ability",
            "name": "Moonwalk",
            "class": "Dancer",
            "branch": "Shimmy",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "15 stamina",
            "range": "Self",
            "duration": "1 minute",
            "description": [
                "You slide across the dance hall. Gain 10 movement speed. This buff can stack up to 4 times. This ability costs 15 less stamina if your last Move Action included a Step 3 dance ability."
            ],
            "tags": [
                "Buff",
                "gain move speed",
                "conditional",
                "dance",
                "Step 1"
            ]
        },
        {
            "type": "ability",
            "name": "Ballet",
            "class": "Dancer",
            "branch": "Shimmy",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "20 stamina",
            "range": "Self",
            "duration": "1 minute",
            "description": [
                "Your mystical dance seems graceful on the outside, yet requires incredible athletics. Gain +10% general CR and +10% CR of a type of your choice. This buff can stack up to 2 times. This ability costs 20 less stamina if your last Move Action included a Step 1 dance ability."
            ],
            "tags": [
                "Buff",
                "gain CR",
                "conditional",
                "dance",
                "Step 2"
            ]
        },
        {
            "type": "ability",
            "name": "Shadow Strike",
            "class": "Dark Duelist",
            "branch": "Dueling",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You slash with your blade, which thirsts for cursed flesh. Deal 3d12 + Xd12 physical damage to a target in range, where X is the number of Curses on the target."
            ],
            "tags": [
                "Attack",
                "melee",
                "physical",
                "greatsword",
                "conditional",
                "Curse"
            ]
        },
        {
            "type": "ability",
            "name": "Void Slash",
            "class": "Dark Duelist",
            "branch": "Dueling",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "20 stamina",
            "range": "40 ft",
            "duration": "Instant",
            "description": [
                "You strike from afar as your blade seeks cursed flesh. Deal 4d12 physical damage to a target you can see within range. If your target is Cursed, this attack can hit through barriers and walls, ignores shields and blocks, and bypasses AC."
            ],
            "tags": [
                "Attack",
                "ranged",
                "physical",
                "greatsword",
                "conditional",
                "Curse",
                "armor penetration",
                "phase wall",
                "phase block"
            ]
        },
        {
            "type": "ability",
            "name": "Vampiric Slash",
            "class": "Dark Duelist",
            "branch": "Dueling",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "35 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You reap life energy from cursed flesh. Deal 5d12 physical damage to a target in range. If the target has any Curses, expunge those Curses immediately, then select one of the following effects for each Curse expunged this way:",
                "<ul>",
                "<li>Heal for 2d12</li>",
                "<li>Empower your next attack with a greatsword or dark spell, increasing damage by 50%</li>",
                "</ul>"
            ],
            "tags": [
                "Attack",
                "melee",
                "physical",
                "greatsword",
                "conditional",
                "Curse",
                "modal",
                "heal",
                "empower"
            ]
        },
        {
            "type": "ability",
            "name": "Lifereaper",
            "class": "Dark Duelist",
            "branch": "Dueling",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "80 stamina",
            "range": "20 ft",
            "duration": "Instant",
            "description": [
                "Your blade expands, empowered by dark magic, and you raze entire groups in one swing. Deal 8d12 physical damage to all targets in range. During the turn you use this ability, Scars of Darkness is changed such that consumed Scars grant you a bonus Major Action rather than refreshing your Major Action."
            ],
            "tags": [
                "Attack",
                "melee",
                "physical",
                "greatsword",
                "passive alter",
                "AOE"
            ]
        },
        {
            "type": "ability",
            "name": "Dark Pulse",
            "class": "Dark Duelist",
            "branch": "Casting",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 mana",
            "range": "20 ft",
            "duration": "Instant",
            "description": [
                "You fire a wave of dark, cursed energy. Deal 3d12 dark magic damage and apply a stack of Curse to all enemies in a 20 ft cone in front of you."
            ],
            "tags": [
                "Spell",
                "attack",
                "dark",
                "AOE",
                "cone",
                "condition",
                "Curse"
            ]
        },
        {
            "type": "ability",
            "name": "Shadow Missiles",
            "class": "Dark Duelist",
            "branch": "Casting",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "15 mana",
            "range": "40 ft",
            "duration": "Instant",
            "description": [
                "You fire a series of dark missiles. Deal 3d12 dark magic damage and apply a stack of Curse to up to 3 targets in range. If the target is Cursed, this spell cannot miss and ignores MR."
            ],
            "tags": [
                "Spell",
                "attack",
                "dark",
                "multi-target",
                "condition",
                "Curse",
                "conditional",
                "no-miss",
                "MR penetration"
            ]
        },
        {
            "type": "ability",
            "name": "Shadow Grasp",
            "class": "Dark Duelist",
            "branch": "Casting",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "25 mana",
            "range": "40 ft",
            "duration": "Instant",
            "description": [
                "You wrap a target in dark energy. Deal 3d12 dark magic damage to a target in range and inflict Immobilize. While a target is Immobilized by this ability, it takes d12 dark magic damage at the beginning of each of its turns, gains a stack of Curse, and cannot have its Curse stacks expunged, except by your abilities or by a free action you can take at any time."
            ],
            "tags": [
                "Spell",
                "attack",
                "dark",
                "single-target",
                "condition",
                "Immobilize",
                "Curse",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Shadow Puppet",
            "class": "Dark Duelist",
            "branch": "Casting",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "50 mana",
            "range": "10 ft",
            "duration": "1 minute",
            "description": [
                "You summon your shadow to fight by your side. Create a Shadow in range. The shadow has 1 HP and is Immune to physical damage, magic damage, and all conditions. At the beginning of your turn, the Shadow teleports to and attacks an enemy of your choice within 80 ft, dealing damage as if you had autoattacked that enemy, and inflicting any on-hit effects, including a Scar. Instead of using an autoattack, you may have the Shadow use one of your greatsword abilities or one of your dark spells instead, but you must make any stamina or mana expenditures if you do so."
            ],
            "tags": [
                "Spell",
                "summoning",
                "dark",
                "concentration",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Accursed Blade",
            "class": "Dark Duelist",
            "branch": "Buffing",
            "tier": 1,
            "action": "1 Minor Action",
            "cost": "10 mana",
            "range": "Self",
            "duration": "1 minute",
            "description": [
                "You infuse your sword with a terrible curse. For the spell's duration, when you hit a target with a greatsword attack, inflict a Curse on the target."
            ],
            "tags": [
                "Spell",
                "dark",
                "buff",
                "self-target",
                "condition",
                "Curse",
                "on-hit",
                "greatsword"
            ]
        },
        {
            "type": "ability",
            "name": "Sword of Darkness",
            "class": "Dark Duelist",
            "branch": "Buffing",
            "tier": 2,
            "action": "1 Minor Action",
            "cost": "20 mana",
            "range": "Self",
            "duration": "1 minute",
            "description": [
                "You infuse your sword with dark magic energy. For the spell's duration, when you hit a target with a greatsword attack, deal an additional 2d12 dark magic damage on hit."
            ],
            "tags": [
                "Spell",
                "dark",
                "buff",
                "self-target",
                "on-hit",
                "greatsword"
            ]
        },
        {
            "type": "ability",
            "name": "Blade of Shadows",
            "class": "Dark Duelist",
            "branch": "Buffing",
            "tier": 3,
            "action": "1 Minor Action",
            "cost": "30 mana",
            "range": "Self",
            "duration": "1 minute",
            "description": [
                "Your blade becomes a thin sheet of dark magic. All damage that you would deal with greatsword attacks have their damage converted to dark magic damage. While this buff is active, dark magic damage you deal with melee sword attacks creates Scars, and consuming Scars additionally refreshes your Minor Action and regenerates 10 stamina."
            ],
            "tags": [
                "Spell",
                "dark",
                "buff",
                "self-target",
                "damage convert",
                "greatsword",
                "gain stamina"
            ]
        },
        {
            "type": "ability",
            "name": "Accursed Armor",
            "class": "Dark Duelist",
            "branch": "Buffing",
            "tier": 4,
            "action": "1 Minor Action",
            "cost": "70 mana",
            "range": "Self",
            "duration": "1 minute",
            "description": [
                "You don magically conjured dark armor. Whenever a cursed enemy targets you with an attack, they take 2d12 dark magic damage for each curse on them, gain a 25% chance to miss with their attack (even for attacks that cannot be evaded) for each curse on them, and are dragged 10 ft towards you for each curse on them. For each curse you inflict that is expunged while this ability is active, you gain a stack of Darkness. Each stack of darkness increases your physical and dark magic damage by 25%, up to a limit of 20 stacks."
            ],
            "tags": [
                "Spell",
                "dark",
                "buff",
                "conjuration",
                "self-target",
                "condition",
                "Curse",
                "stacking buff",
                "concentration",
                "pull"
            ]
        },
        {
            "type": "ability",
            "name": "Slam",
            "class": "Destroyer",
            "branch": "Sunder",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You hit an enemy hard and expose their weakness. Deal 4d10 physical damage to a target in range, and inflict Physical Vulnerability equal to 10% + X%, where X is the target's current Physical Vulnerability."
            ],
            "tags": [
                "Attack",
                "melee",
                "physical",
                "single-target",
                "blunt weapon",
                "on hit",
                "condition",
                "vulnerability"
            ]
        },
        {
            "type": "ability",
            "name": "Mortal Strike",
            "class": "Destroyer",
            "branch": "Sunder",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "20 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You crush an enemy's armor. Deal 5d10 physical damage to a target in range. This attack destroys armor before damage calculation, reducing the target's armor by 25% on hit."
            ],
            "tags": [
                "Attack",
                "melee",
                "physical",
                "single-target",
                "blunt weapon",
                "on hit",
                "armor shred"
            ]
        },
        {
            "type": "ability",
            "name": "Execute",
            "class": "Destroyer",
            "branch": "Sunder",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "30 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You finish off a weakened foe. Deal 6d10 physical damage to a target in range, with lethality equal to the target's missing health after damage calculation."
            ],
            "tags": [
                "Attack",
                "melee",
                "physical",
                "single-target",
                "blunt weapon",
                "lethality"
            ]
        },
        {
            "type": "ability",
            "name": "Cleave",
            "class": "Destroyer",
            "branch": "Raze",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "15 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You swing at two enemies. Deal 4d10 physical damage to up to 2 different targets in range. If either target dies, deal 8d10 physical damage to the other target."
            ],
            "tags": [
                "Attack",
                "melee",
                "physical",
                "single-target",
                "multi-target",
                "blunt weapon",
                "modal",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Whirlwind",
            "class": "Destroyer",
            "branch": "Raze",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "25 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You swing in a wide arc. Deal 5d10 physical damage to all targets in range. Targets with full health take double damage."
            ],
            "tags": [
                "Attack",
                "melee",
                "physical",
                "multi-target",
                "blunt weapon",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Rampage",
            "class": "Destroyer",
            "branch": "Raze",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "35 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You slam your weapon down on a large group. Deal 6d10 physical damage to all targets in a 15 ft cone starting in range, knocking targets prone."
            ],
            "tags": [
                "Attack",
                "melee",
                "physical",
                "multi-target",
                "blunt weapon"
            ]
        },
        {
            "type": "ability",
            "name": "Demolish",
            "class": "Destroyer",
            "branch": "Teardown",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You destroy buildings and constructs. Attack a construct, building, vehicle, or terrain object that is destructible, and destroy it. You may need to make a Blunt Weapons check for larger or armored targets, and some objects aren't destructible at all (such as hills or mountains)."
            ],
            "tags": [
                "Terrain destruction"
            ]
        },
        {
            "type": "ability",
            "name": "Challenge",
            "class": "Destroyer",
            "branch": "Teardown",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "20 stamina",
            "range": "20 ft",
            "duration": "1 minute",
            "description": [
                "You force enemies to turn their attention to you. Taunt all enemies within range for the duration. Gain 10% increased AC and MR for every enemy taunted this way for the duration"
            ],
            "tags": [
                "Condition",
                "Taunt",
                "gain AC",
                "gain MR"
            ]
        },
        {
            "type": "ability",
            "name": "Flatten",
            "class": "Destroyer",
            "branch": "Teardown",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "25 stamina",
            "range": "20 ft",
            "duration": "Instant",
            "description": [
                "You reduce parts of the ground to flat earth, or create a ditch. Create a shockwave centered on you that causes all spaces within range to be depressed downwards by 20 ft."
            ],
            "tags": [
                "Terrain destruction"
            ]
        },
        {
            "type": "ability",
            "name": "Spark Bolt",
            "class": "Dynamancer",
            "branch": "Shock",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 mana",
            "range": "150 ft",
            "duration": "Instant",
            "description": [
                "You fire a small bolt of lightning at an enemy. Deal 4d12 lightning magic damage to a target in range, then randomly choose one of the following:",
                "<ul>",
                "<li>50% chance: Deal an additional d12 lightning magic damage</li>",
                "<li>30% chance: Inflict Paralyzed for 1 minute</li>",
                "<li>20% chance: Inflict Stunned until the beginning of your next turn</li>",
                "</ul>"
            ],
            "tags": [
                "Spell",
                "attack",
                "lightning",
                "destruction",
                "modal",
                "random",
                "condition",
                "Paralysis",
                "Stun",
                "single-target"
            ]
        },
        {
            "type": "ability",
            "name": "Live Wire",
            "class": "Dynamancer",
            "branch": "Shock",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "25 mana",
            "range": "150 ft",
            "duration": "1 minute",
            "description": [
                "You charge an enemy with electricity. Deal 2d12 lightning magic damage to a target in range. For the duration, one of the following effects randomly occurs at the beginning of each of the target's turns:",
                "<ul>",
                "<li>50% chance: The target takes 2d12 lightning magic damage</li>",
                "<li>30% chance: The target and all adjacent enemies take 2d12 lightning magic damage</li>",
                "<li>20% chance: The target and all adjacent enemies take 2d12 lightning magic damage and are inflicted with 20% Lightning Vulnerability</li>",
                "</ul>"
            ],
            "tags": [
                "Spell",
                "attack",
                "lightning",
                "destruction",
                "modal",
                "random",
                "condition",
                "Vulnerability",
                "single-target",
                "multi-target"
            ]
        },
        {
            "type": "ability",
            "name": "Lightning Bolt",
            "class": "Dynamancer",
            "branch": "Electrify",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "20 mana",
            "range": "150 ft",
            "duration": "Instant",
            "description": [
                "You fire a large bolt of lightning at multiple enemies. Deal 4d12 lightning magic damage and inflict Paralyzed to all enemies in a 150 ft line starting from your position in any direction. This spell randomly has the following additional properties:",
                "<ul>",
                "<li>50% chance: Deal an additional d12 lightning magic damage</li>",
                "<li>30% chance: This attack ignores MR</li>",
                "<li>20% chance: This spell cannot be counterspelled</li>",
                "</ul>"
            ],
            "tags": [
                "Spell",
                "attack",
                "lightning",
                "destruction",
                "modal",
                "random",
                "AOE",
                "line",
                "condition",
                "Paralysis",
                "ignore MR"
            ]
        },
        {
            "type": "ability",
            "name": "Lightning Rod",
            "class": "Dynamancer",
            "branch": "Electrify",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "30 mana",
            "range": "150 ft",
            "duration": "Instant",
            "description": [
                "You erect a rod that attracts lightning. Deal 3d12 lightning magic damage to all enemies in a 25 ft square centered on a space in range, leaving behind a Lightning Rod totem. The totem activates and deals a random amount of lightning magic damage to all enemies within 25 ft whenever a lightning spell is cast within 100 ft, with the random damage varying between d12 and 3d12."
            ],
            "tags": [
                "Spell",
                "attack",
                "lightning",
                "destruction",
                "random",
                "AOE",
                "square",
                "conditional",
                "totem"
            ]
        },
        {
            "type": "ability",
            "name": "Energize",
            "class": "Dynamancer",
            "branch": "Thunder",
            "tier": 1,
            "action": "1 Minor Action",
            "cost": "15 mana",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You take advantage of random energy to power your spells. The next damaging spell you cast is affected by your critical strike chance and critical damage modifier. That spell also randomly gains one of the following effects:",
                "<ul>",
                "<li>50% chance: The spell deals an additional d12 lightning magic damage</li>",
                "<li>30% chance: The spell's range increases by 20 or 20%, whichever is higher</li>",
                "<li>20% chance: The spell's mana cost is decreased by 20 or 20%, whichever is lower.</li>",
                "</ul>"
            ],
            "tags": [
                "Empower",
                "modal",
                "random",
                "range increase",
                "spell",
                "lightning",
                "transmutation",
                "utility"
            ]
        },
        {
            "type": "ability",
            "name": "Frazzle",
            "class": "Dynamancer",
            "branch": "Thunder",
            "tier": 2,
            "action": "1 Reaction",
            "cost": "20 mana",
            "range": "100 ft",
            "duration": "Instant",
            "description": [
                "You ignite enemy mana with random energy. As a reaction to a target in range casting a spell, counter that spell, then randomly choose one:",
                "<ul>",
                "<li>50% chance: The target takes 2d12 lightning magic damage</li>",
                "<li>30% chance: The target is inflicted with Paralysis</li>",
                "<li>20% chance: The target is Stunned until the end of its turn</li>",
                "</ul>"
            ],
            "tags": [
                "Spell",
                "counterspell",
                "lightning",
                "defensive",
                "condition",
                "Paralysis",
                "Stun",
                "random",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Modify Weapon",
            "class": "Enchanter",
            "branch": "Personal",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 mana",
            "range": "Touch",
            "duration": "1 minute",
            "description": [
                "You temper a weapon with runes of strengthening or weakening. Choose one:",
                "<ul>",
                "<li>Target weapon in range gains, \"On Hit: Deal 4d10 physical damage.\"</li>",
                "<li>Target weapon in range gains, \"While equipped, deal 50% decreased physical damage.\"</li>",
                "</ul>"
            ],
            "tags": [
                "Spell",
                "enchantment",
                "modal",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Reforge Armor",
            "class": "Enchanter",
            "branch": "Personal",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "20 mana",
            "range": "Touch",
            "duration": "1 minute",
            "description": [
                "You temper armor with runes of strengthening or weakening. Choose one:",
                "<ul>",
                "<li>Target armor in range has its implicit AC, Evasion, MR, and CR increased by 50%.</li>",
                "<li>Target armor in range loses all AC, Evasion, MR, and CR.</li>",
                "</ul>"
            ],
            "tags": [
                "Spell",
                "enchantment",
                "modal",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Alter Jewelry",
            "class": "Enchanter",
            "branch": "Personal",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "30 mana",
            "range": "Touch",
            "duration": "1 minute",
            "description": [
                "You affix runes to an accessory for a variety of effects. Choose one:",
                "<ul>",
                "<li>Target ring in range gains, \"On Hit: Deal 2d20 magic damage of a chosen type.\"</li>",
                "<li>Target ring in range gains, \"At the beginning of your turn, lose 40 mana and stamina.\"</li>",
                "<li>Target belt in range gains, \"You have elemental resistance against 2 chosen types.\"</li>",
                "<li>Target belt in range gains, \"You have elemental weakness against 2 chosen types.\"</li>",
                "<li>Target necklace in range gains, \"At the beginning of your turn, heal 30 health.\"</li>",
                "<li>Target necklace in range gains, \"At the beginning of your turn, lose 30 health.\"</li>",
                "</ul>",
                "You may spend an additional 20 mana to choose a second effect for a type of accessory not previously chosen. You may then spend another additional 10 mana to choose a third effect for the last accessory type not previously chosen."
            ],
            "tags": [
                "Spell",
                "enchantment",
                "modal",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Reconstruct Barrier",
            "class": "Enchanter",
            "branch": "Structural",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 mana",
            "range": "Touch",
            "duration": "1 minute",
            "description": [
                "You rebuild a wall or door with runes of locking or breaking. Choose one:",
                "Target wall in range becomes unbreakable, and all windows and doors in that wall become magically locked.",
                "Target wall in range crumbles and weakens to become easily breakable, and all windows and doors in that wall become unlocked.",
                "After choosing an effect, you may choose to spend 1 minute to cast this spell as a minor ritual, extending the duration to 1 hour, or you may spend 10 minutes to cast this spell as a major ritual, extending the duration to 24 hours."
            ],
            "tags": [
                "Spell",
                "enchantment",
                "utility",
                "minor ritual",
                "major ritual",
                "modal",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Rebuild Floor",
            "class": "Enchanter",
            "branch": "Structural",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "20 mana",
            "range": "Touch",
            "duration": "1 minute",
            "description": [
                "You reconstruct the floor or ceiling to various effect. Choose one:",
                "<ul>",
                "<li>The surface becomes difficult terrain.</li>",
                "<li>The surface becomes fragile, crumbling underneath the weight of entities walking over it.</li>",
                "<li>The surface becomes slick, granting entities doubled move speed.</li>",
                "<li>The surface becomes unbreakable.</li>",
                "</ul>",
                "After choosing an effect, you may choose to spend 1 minute to cast this spell as a minor ritual, extending the duration to 1 hour, or you may spend 10 minutes to cast this spell as a major ritual, extending the duration to 24 hours."
            ],
            "tags": [
                "Spell",
                "enchantment",
                "utility",
                "minor ritual",
                "major ritual",
                "modal",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Secure Building",
            "class": "Enchanter",
            "branch": "Structural",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "30 mana",
            "range": "Touch",
            "duration": "1 minute",
            "description": [
                "You magically ward a building or some number of rooms in a building against enemy magic. Target building in range has any number of its rooms or the entire building gain the following effects: scrying and teleportation magic in or out of the warded area fails; you know if anyone casts a spell inside the warded area and what spell was cast; you know the positions and true magic signatures of all entities within the warded area. You may choose to spend 1 minute to cast this spell as a minor ritual, extending the duration to 1 hour, or you may spend 10 minutes to cast this spell as a major ritual, extending the duration to 24 hours."
            ],
            "tags": [
                "Spell",
                "enchantment",
                "utility",
                "defense",
                "minor ritual",
                "major ritual",
                "modal",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Mint Coinage",
            "class": "Enchanter",
            "branch": "Minutiae",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 mana",
            "range": "Touch",
            "duration": "24 hours",
            "description": [
                "You stamp a variety of runes on the face of a coin. While touching a target coin, choose one:",
                "<ul>",
                "<li>Inscribe a magical telepathic message of up to 100 words or 10 images that can be heard/seen by anyone who picks up the coin.</li>",
                "<li>Inscribe a magical access point that allows you to telepathically communicate freely with anyone holding the coin.</li>",
                "<li>Inscribe a magical tracker that allows you to always know the coin's position and if/when it changes owners.</li>",
                "<li>Inscribe a magical storage space that grants the wielder of the coin +1 buff limit and +1 concentration limit.</li>",
                "<li>Inscribe a restorative rune that grants the wielder of the coin 5% health, mana, and stamina regeneration.</li>",
                "<li>Inscribe a rune of luck that grants the wielder of the coin +5 to all skill checks.</li>",
                "</ul>",
                "When you cast this spell, you may choose to expend an additional 5 mana to choose a second effect for the coin's opposite face. An entity can only benefit from one coin made by this ability at a time."
            ],
            "tags": [
                "Spell",
                "enchantment",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Enhance Vehicle",
            "class": "Enchanter",
            "branch": "Minutiae",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "20 mana",
            "range": "Touch",
            "duration": "24 hours",
            "description": [
                "You power up or power down a vehicle. Choose one:",
                "<ul>",
                "<li>Target vehicle in range has its move speed doubled and no longer requires a system to propel it forward (horses, engines) for the duration.</li>",
                "<li>Target vehicle becomes immotile through its regular means (wheels lock, sails fail, etc) for the duration.</li>",
                "</ul>",
                "When you cast this spell, you may choose to expend an additional 10 mana to affect another target Vehicle with a new choice, and you may do this any number of times. Concentration is held once for all instances of this spell within one cast."
            ],
            "tags": [
                "Spell",
                "enchantment",
                "utility",
                "modal",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Empower Ammo",
            "class": "Enchanter",
            "branch": "Minutiae",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "30 mana",
            "range": "Touch",
            "duration": "24 hours",
            "description": [
                "You bless any type of ammo with empowering runes. Target set of up to 10 pieces of ammunition becomes special ammo for the duration, gaining, \"Attacks with this ammo have 50% increased damage and inflict a random condition chosen from the following list: Slow, Immobilize, Cripple, Stun, Blind, Confuse, Sleep, Silence.\""
            ],
            "tags": [
                "Spell",
                "enchantment",
                "utility",
                "modal",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Burner Bot",
            "class": "Inventor",
            "branch": "Haywire",
            "tier": 1,
            "action": "1 minute",
            "cost": "1 lb of steel, 1 lb of copper, 2L of lantern oil",
            "range": "5 ft",
            "duration": "1 minute",
            "description": [
                "You build a small robot filled with flammable oil. Create a Burner Bot with 25 HP and 25 ft Move Speed. It obeys your Commands; otherwise, it uses its Move Action to approach the closest enemy, its Major Action to attack an enemy in melee range for 4d6 physical damage, and its Minor Action to quaff potions or flasks of oil from its inventory. When you create this construct, choose one of the following Modular Components:",
                "<ul>",
                "<li>The construct consumes half a liter of oil to augment each attack, dealing an additional 2d10 fire magic damage with each attack.</li>",
                "<li>The construct explodes upon dying, dealing 4d10 fire magic damage to all enemies within 10 ft.</li>",
                "</ul>"
            ],
            "tags": [
                "alchemy",
                "constructs",
                "minion",
                "physical",
                "melee",
                "modular component",
                "modal",
                "fire",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Potion Puppet",
            "class": "Inventor",
            "branch": "Processor",
            "tier": 1,
            "action": "1 minute",
            "cost": "1 lb of steel, 1 lb of copper, 1 health, stamina, or mana potion",
            "range": "5 ft",
            "duration": "1 minute",
            "description": [
                "You build a bulbous puppet with a large abdominal sinus. Create a Potion Puppet with 20 HP and 25 ft Move Speed. It obeys your Commands; otherwise, it uses its Move Action to stay near you and its Minor Action to take a potion from your inventory if it is adjacent to you and does not already have a potion. When ordered to do so, it will attempt to use its Major Action to use its potion on an ally within 30 ft. When you create this construct, choose one of the following Modular Components:",
                "<ul>",
                "<li>The construct has a 30 ft aura, providing allies with 30% Item Efficiency</li>",
                "<li>The construct explodes upon dying, providing its potion effect to all allies within 10 ft.</li>",
                "</ul>"
            ],
            "tags": [
                "alchemy",
                "constructs",
                "minion",
                "modular component",
                ""
            ]
        },
        {
            "type": "ability",
            "name": "Remodulate",
            "class": "Inventor",
            "branch": "Maintenance",
            "tier": 1,
            "action": "1 Minor Action",
            "cost": "---",
            "range": "100 ft",
            "duration": "Instant",
            "description": [
                "You make adjustments to a currently existing construct. Change the Modular Component of a target allied construct in range to another installed Modular Component."
            ],
            "tags": [
                "alchemy",
                "constructs"
            ]
        },
        {
            "type": "ability",
            "name": "Lightning Lunge",
            "class": "Lightning Duelist",
            "branch": "Dueling",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You make a lunging strike at an enemy with your rapier. Dash up to 10 ft, then deal 4d8 physical damage to a target in range."
            ],
            "tags": [
                "Attack",
                "melee",
                "physical",
                "rapier",
                "dash",
                "single-target"
            ]
        },
        {
            "type": "ability",
            "name": "Blade Storm",
            "class": "Lightning Duelist",
            "branch": "Dueling",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "25 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You stab rapidly and repeatedly at an enemy with your rapier. Deal d8 physical damage to a target in range. This attack repeats 2-6 times."
            ],
            "tags": [
                "Attack",
                "melee",
                "physical",
                "rapier",
                "multi-hit",
                "single-target."
            ]
        },
        {
            "type": "ability",
            "name": "Shocking Parry",
            "class": "Lightning Duelist",
            "branch": "Dueling",
            "tier": 3,
            "action": "1 Reaction",
            "cost": "30 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You parry an enemy's strike and counter. As a reaction to an enemy in range attacking you with a weapon, fully block the attack with your rapier and counterattack, dealing 5d8 physical damage to that enemy. When you hit an enemy with this ability, you have a 50% chance of recovering half the stamina cost."
            ],
            "tags": [
                "Attack",
                "melee",
                "physical",
                "rapier",
                "single-target",
                "restore stamina",
                "reaction",
                "counter",
                "block"
            ]
        },
        {
            "type": "ability",
            "name": "Flash of Swords",
            "class": "Lightning Duelist",
            "branch": "Dueling",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "70 stamina",
            "range": "25 ft",
            "duration": "Instant",
            "description": [
                "You move and strike in a blur of deadly speed. Deal 8d8 physical damage to all enemies adjacent to you. Then, dash up to 25 ft to an empty space in range, dealing 4d8 physical damage to all enemies in spaces you pass through. Finally, deal 8d8 physical damage to all enemies adjacent to your dash's final destination. An enemy cannot be hit more than once with this ability per cast (Battle Current's activation counts as a separate cast)."
            ],
            "tags": [
                "Attack",
                "melee",
                "multi-target",
                "physical",
                "rapier",
                "dash"
            ]
        },
        {
            "type": "ability",
            "name": "Shock Tendrils",
            "class": "Lightning Duelist",
            "branch": "Casting",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 mana",
            "range": "20 ft",
            "duration": "Instant",
            "description": [
                "You release tendril of energy in front of you. Deal 3d8 lightning magic damage to all enemy targets in a 20 ft line. Then at the end of your turn, this spell deals 3d8 damage to all targets in a 20 ft line with random direction."
            ],
            "tags": [
                "Spell",
                "attack",
                "lightning",
                "AOE",
                "line",
                "random"
            ]
        },
        {
            "type": "ability",
            "name": "Ball Lightning",
            "class": "Lightning Duelist",
            "branch": "Casting",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "25 mana",
            "range": "20 ft",
            "duration": "1 minute",
            "description": [
                "You summon a ball of energy that erratically flies around attacking enemies. Summon a Ball Lightning object in an empty space in range. When summoned, it deals 4d8 lightning magic damage to all adjacent enemies. At the beginning of each of your turns, it travels 20 ft in a random direction (stopping when it hits a space it can't enter), then discharges, dealing 2d8 lightning magic damage to all adjacent targets."
            ],
            "tags": [
                "Spell",
                "attack",
                "lightning",
                "AOE",
                "summoning",
                "destruction",
                "random",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Thunder Blast",
            "class": "Lightning Duelist",
            "branch": "Casting",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "40 mana",
            "range": "100 ft",
            "duration": "Instant",
            "description": [
                "You call down a mighty bolt of thunder. Deal 8d8 lightning magic damage to all entities in a 20 ft square. Until the beginning of your next turn, random lightning strikes occur every turn in the target square, dealing 4d8 lightning magic damage to entities struck."
            ],
            "tags": [
                "Spell",
                "attack",
                "lightning",
                "AOE",
                "ground-target",
                "random"
            ]
        },
        {
            "type": "ability",
            "name": "Arc Lightning",
            "class": "Lightning Duelist",
            "branch": "Casting",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "60 mana",
            "range": "40 ft",
            "duration": "1 round",
            "description": [
                "You release a powerful bolt of lightning that bounces between targets. Deal 6d8 lightning magic damage to a target in range, marking them until the end of your next turn. Dealing physical damage to the marked target with a rapier causes a lightning bolt to fire from their bodies, dealing 6d8 lightning magic damage to them and cleansing their mark, as well as dealing 6d8 lightning magic damage to another random enemy within 40 ft and marking them until the end of your next turn."
            ],
            "tags": [
                "Spell",
                "attack",
                "ranged",
                "lightning",
                "single-target",
                "mark",
                "random",
                ""
            ]
        },
        {
            "type": "ability",
            "name": "Taser Blade",
            "class": "Lightning Duelist",
            "branch": "Buffing",
            "tier": 1,
            "action": "1 Minor Action",
            "cost": "10 mana",
            "range": "Self",
            "duration": "1 minute",
            "description": [
                "You envelop your blade in an electric current. For the spell's duration, when you hit a target with a rapier attack, inflict a stack of Paralysis on the target."
            ],
            "tags": [
                "Spell",
                "lightning",
                "buff",
                "self-target",
                "on-hit",
                "condition",
                "Paralysis",
                "rapier"
            ]
        },
        {
            "type": "ability",
            "name": "Sword of Lightning",
            "class": "Lightning Duelist",
            "branch": "Buffing",
            "tier": 2,
            "action": "1 Minor Action",
            "cost": "20 mana",
            "range": "Self",
            "duration": "1 minute",
            "description": [
                "You envelop your blade in lightning magic energy. For the spell's duration, when you hit a target with a rapier attack, deal an additional 2d8 lightning magic damage on hit."
            ],
            "tags": [
                "Spell",
                "lightning",
                "buff",
                "self-target",
                "on-hit",
                "rapier"
            ]
        },
        {
            "type": "ability",
            "name": "Plasma Saber",
            "class": "Lightning Duelist",
            "branch": "Buffing",
            "tier": 3,
            "action": "1 Minor Action",
            "cost": "30 mana",
            "range": "Self",
            "duration": "1 minute",
            "description": [
                "Your blade becomes a thin sheet of lightning magic. All damage that you would deal with rapier attacks have their damage converted to lightning magic damage. While this buff is active, Battle Current empowered attacks recover 5, 10, or 15 stamina randomly."
            ],
            "tags": [
                "Spell",
                "lightning",
                "buff",
                "self-target",
                "damage convert",
                "rapier",
                "gain stamina"
            ]
        },
        {
            "type": "ability",
            "name": "Lightning Coil Cuirass",
            "class": "Lightning Duelist",
            "branch": "Buffing",
            "tier": 4,
            "action": "1 Minor Action",
            "cost": "80 mana",
            "range": "Self",
            "duration": "1 minute",
            "description": [
                "You don magically conjured lightning armor. Whenever an adjacent enemy targets you with an attack, they are inflicted with a stack of Paralysis and take 2d8 lightning magic damage. Whenever you take damage, you may freely dash up to your speed in any direction. While this ability is active, you gain a stack of Lightning on every physical damage hit. You expend all stacks of Lightning when you cast a lightning spell attack, increasing lightning magic damage by 10% for each stack of Lightning expended this way, up to a limit of 20 stacks."
            ],
            "tags": [
                "Spell",
                "lightning",
                "buff",
                "self-target",
                "condition",
                "Paralysis",
                "stacking buff",
                "concentration",
                "dash"
            ]
        },
        {
            "type": "ability",
            "name": "Lightbolt",
            "class": "Luxomancer",
            "branch": "Luminosity",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 mana",
            "range": "100 ft",
            "duration": "Instant",
            "description": [
                "You fire photons at an enemy. Deal 4d10 light magic damage to a target in range. This spell banks 100% of its mana cost for your Guiding Light passive."
            ],
            "tags": [
                "Spell",
                "attack",
                "light",
                "destruction",
                "single-target"
            ]
        },
        {
            "type": "ability",
            "name": "Light Touch",
            "class": "Luxomancer",
            "branch": "Radiance",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 mana",
            "range": "100 ft",
            "duration": "Instant",
            "description": [
                "You pass light into an ally's wounds. Heal a target for 4d10 health. If you cast this spell at touch range, heal the target for 6d10 health instead."
            ],
            "tags": [
                "Spell",
                "light",
                "restoration",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Dancing Lights",
            "class": "Luxomancer",
            "branch": "Gleam",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 mana",
            "range": "100 ft",
            "duration": "1 minute",
            "description": [
                "You create motes of floating light to see in the dark. Create up to 5 motes of light in spaces within range; they can be attached to visible surfaces or entities. They each cast light in a 50 ft radius. You may spend 1 minute to cast this spell as a minor ritual; if you do, its duration is extended to 1 hour. You may spend 10 minutes to cast this spell as a major ritual; if you do, its duration is extended to 6 hours."
            ],
            "tags": [
                "Spell",
                "light",
                "conjuration",
                "utility",
                "modal",
                "minor ritual",
                "major ritual"
            ]
        },
        {
            "type": "ability",
            "name": "Shadow Bolt",
            "class": "Noxomancer",
            "branch": "Devastation",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 mana",
            "range": "40 ft",
            "duration": "Instant",
            "description": [
                "You amass dark energy and toss it at an enemy. Deal 4d10 dark magic damage to a target in range, and inflict the target with a curse for every 15 dark magic damage dealt this way."
            ],
            "tags": [
                "Spell",
                "attack",
                "ranged",
                "dark",
                "destruction",
                "condition",
                "Curse",
                "conditional",
                "single target"
            ]
        },
        {
            "type": "ability",
            "name": "Darkbomb",
            "class": "Noxomancer",
            "branch": "Devastation",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "30 mana",
            "range": "40 ft",
            "duration": "Instant",
            "description": [
                "You release an orb of dark magic, primed to explode. Create a Darkbomb in an unoccupied space in range. You may have it detonate immediately to deal 4d10 dark magic damage and inflict a curse on every entity within 20 ft of the bomb. Alternatively, you may delay the explosion until the beginning of your next turn; if you do, it will deal 8d10 dark magic damage and inflict 2 curses on every entity within 20 ft of the bomb."
            ],
            "tags": [
                "Spell",
                "attack",
                "dark",
                "destruction",
                "condition",
                "Curse",
                "AOE",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Corruption",
            "class": "Noxomancer",
            "branch": "Devastation",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "40 mana",
            "range": "40 ft",
            "duration": "1 minute",
            "description": [
                "You corrupt an enemy's body with dark energy. Deal 5d10 dark magic damage to a target and inflict them with a condition that causes them to gain a Curse and take 3d10 dark magic damage at the beginning of each turn and prevents Curses from expunging until the condition ends."
            ],
            "tags": [
                "Spell",
                "attack",
                "single-target",
                "dark",
                "destruction",
                "condition",
                "Curse",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Defile",
            "class": "Noxomancer",
            "branch": "Affliction",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "15 mana",
            "range": "40 ft",
            "duration": "1 minute",
            "description": [
                "You infuse an enemy with dark energy, weakening and cursing them. Select a target in range, and choose one of the following:",
                "<ul>",
                "<li>Inflict a 30% Weaken for 1 minute</li>",
                "<li>Inflict a 20% Weaken for 1 minute, and inflict 1 curse</li>",
                "<li>Inflict a 10% Weaken for 1 minute, and inflict 2 curses</li>",
                "</ul>"
            ],
            "tags": [
                "Spell",
                "attack",
                "dark",
                "condition",
                "Weakened",
                "Curse",
                "modal",
                "single target"
            ]
        },
        {
            "type": "ability",
            "name": "Shriek",
            "class": "Noxomancer",
            "branch": "Affliction",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "30 mana",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You release dark energy through your words, affecting the nervous system of nearby opponents. Enemies within 40 ft of you are Blinded and enemies within 20 ft of you are instead Feared."
            ],
            "tags": [
                "Spell",
                "attack",
                "dark",
                "condition",
                "control",
                "Blind",
                "Fear",
                "conditional",
                "AOE"
            ]
        },
        {
            "type": "ability",
            "name": "Spreading Madness",
            "class": "Noxomancer",
            "branch": "Affliction",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "50 mana",
            "range": "40 ft",
            "duration": "1 minute",
            "description": [
                "You corrupt the mind of an enemy with infectious dark magic. Inflict a condition on a target in range that causes 50% of their targeted attacks to be redirected at one of their allies in range if possible. When an enemy with this condition deals damage to another enemy, they inflict the same condition on hit. When you break concentration on this ability, all copies of this condition end as well."
            ],
            "tags": [
                "Spell",
                "attack",
                "single-target",
                "multi-target",
                "dark",
                "condition",
                "control",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Siphon Soul",
            "class": "Noxomancer",
            "branch": "Obfuscation",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "15 mana",
            "range": "40 ft",
            "duration": "Instant",
            "description": [
                "You tear away magical effects on allies and enemies. Choose one of the following:",
                "<ul>",
                "<li>Target entity in range loses a buff of your choice</li>",
                "<li>Target entity in range is cleansed of a condition of your choice</li>",
                "</ul>",
                "You may choose to expend an additional 10 mana to use both options."
            ],
            "tags": [
                "Spell",
                "dark",
                "modal",
                "buff strip",
                "cleanse",
                "single-target",
                "multi-target"
            ]
        },
        {
            "type": "ability",
            "name": "Treachery",
            "class": "Noxomancer",
            "branch": "Obfuscation",
            "tier": 2,
            "action": "1 Reaction",
            "cost": "20 mana",
            "range": "100 ft",
            "duration": "Instant",
            "description": [
                "You cause a mage to lose control of a spell during its casting. As a reaction to a target in range casting a spell, you may counter that spell. The target then expends 20 mana to deal 3d10 dark magic damage and inflict a curse on all of its allies within 10 ft of them."
            ],
            "tags": [
                "Spell",
                "dark",
                "single-target",
                "AOE",
                "destruction",
                "defensive",
                "counterspell",
                "condition",
                "Curse"
            ]
        },
        {
            "type": "ability",
            "name": "Fiendish Circle",
            "class": "Noxomancer",
            "branch": "Obfuscation",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "40 mana",
            "range": "40 ft",
            "duration": "Instant",
            "description": [
                "You call upon imps from a dark realm. Summon an Imp with 50 HP and 40 speed. Imps follow your Command Actions; otherwise, they use their Move Action to move towards enemies, their Major Action to make a melee attack that deals 4d10 dark magic damage, and their Minor Action to drink any potions they are carrying. When you cast this spell, you may choose to concentrate on this spell in order to spend an additional 20 mana to summon an extra Imp, and you may do this up to two more times to have a maximum of 4 Imps at one time."
            ],
            "tags": [
                "Spell",
                "summoning",
                "dark",
                "minion",
                "conditional",
                "modal",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Psyshock",
            "class": "Psion",
            "branch": "Migraine",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 of any resource",
            "range": "100 ft",
            "duration": "Instant",
            "description": [
                "You send waves of harmful energy directly into someone's mind. Deal 4d10 psychic damage to a target in range. When you cast this ability, you may expend an additional 10 of any resource aside from the type initially used; if you do, this attack deals 100% increased damage and your Offensive Psionics check gains +20."
            ],
            "tags": [
                "Psionic",
                "offensive",
                "attack",
                "psychic",
                "single-target",
                "damage",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Psywave",
            "class": "Psion",
            "branch": "Migraine",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "20 of any resource",
            "range": "50 ft",
            "duration": "Instant",
            "description": [
                "You fire waves of errant psionics. Deal 5d10 psychic damage to all enemies in a 50 ft cone starting in front of you. When you cast this ability, you may expend an additional 20 of any resource aside from the type initially used; if you do, this attack deals 100% increased damage and strips a random buff from all affected targets."
            ],
            "tags": [
                "Psionic",
                "offensive",
                "attack",
                "psychic",
                "damage",
                "modal",
                "multi-target"
            ]
        },
        {
            "type": "ability",
            "name": "Befuddle",
            "class": "Psion",
            "branch": "Mentalism",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "15 of any resource",
            "range": "100 ft",
            "duration": "Instant",
            "description": [
                "You scramble an enemy's thoughts. Inflict Confusion on a target in range until the end of its next turn. When you cast this ability, you may expend an additional 15 of any resource aside from the type initially used; if you do, Stun the target until the end of its next turn instead."
            ],
            "tags": [
                "Psionic",
                "offensive",
                "attack",
                "condition",
                "Confusion",
                "modal",
                "Stun"
            ]
        },
        {
            "type": "ability",
            "name": "Insinuate",
            "class": "Psion",
            "branch": "Mentalism",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "30 of any resource",
            "range": "100 ft",
            "duration": "1 minute",
            "description": [
                "You corrupt minds with paranoia. Choose one:",
                "<ul>",
                "<li>Inflict Fear on up to 5 targets in range for the duration. When you cast this ability and choose this mode, you may expend an additional 30 of any resource aside from the type initially used; if you do, you may target up to 10 targets in range instead, and they are additionally inflicted with Slowed for the duration</li>",
                "<li>Spend an additional 5 minutes casting this ability while speaking to a target. If the target loses the psionic contest, the target becomes marked, becoming paranoid and fearful, and immediately seeks the safest place they know and avoids both friend and foe due to mistrust. The mark lasts for 1 hour. When you cast this ability and choose this mode, you may expend an additional 30 of any resource aside from the type initially used; if you do, the duration of the mark is extended to 6 hours. If you lose the psionic contest when you choose this mode, the target will not know you attempted to attack it, and becomes immune to psionic attacks until its next short rest.</li>",
                "</ul>"
            ],
            "tags": [
                "Psionic",
                "offensive",
                "attack",
                "condition",
                "modal",
                "Fear",
                "Slow"
            ]
        },
        {
            "type": "ability",
            "name": "Focal Point",
            "class": "Psion",
            "branch": "Memory",
            "tier": 1,
            "action": "1 Reaction",
            "cost": "10 of any resource",
            "range": "30 ft",
            "duration": "Instant",
            "description": [
                "You draw in aberrant psionic attacks to protect your fellow man. As a reaction to a psionic attack on an ally in range, choose one:",
                "<ul>",
                "<li>Redirect the attack to yourself. You make the Defensive Psionics skill check instead</li>",
                "<li>Add half your Defensive Psionics skill check bonus to the ally's Defensive Psionics skill check</li>",
                "</ul>"
            ],
            "tags": [
                "Psionics",
                "defensive",
                "modal",
                "redirect"
            ]
        },
        {
            "type": "ability",
            "name": "Brain Barrier",
            "class": "Psion",
            "branch": "Memory",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "30 of any resource",
            "range": "30 ft",
            "duration": "1 minute",
            "description": [
                "You use powerful psionics to boost your allies' defensive instincts. A target ally in range gains 20% General Damage Reduction against psychic damage, and additionally gains the following effects, based on their stats:",
                "<ul>",
                "<li>If TGH is their highest defensive attribute, their AC is increased by 50%</li>",
                "<li>If REF is their highest defensive attribute, their Evasion is increased by 50%</li>",
                "<li>If RES is their highest defensive attribute, their General MR is increased by 50%</li>",
                "<li>If FRT is their highest defensive attribute, their General CR is increased by 50%</li>",
                "</ul>",
                "When you cast this ability, you may expend an additional 30 of any resource aside from the type initially used; if you do, you may target an additional ally, and the psychic GDR increases to 40%. You may spend an additional 30 of the final unused resource aside from the two types used in order to target a third ally and have the psychic GDR increase to 60%."
            ],
            "tags": [
                "Psionics",
                "defensive",
                "modal",
                "conditional",
                "increase AC",
                "increase Evasion",
                "increase MR",
                "increase CR",
                "GDR"
            ]
        },
        {
            "type": "ability",
            "name": "Firebolt",
            "class": "Pyromancer",
            "branch": "Incineration",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 mana",
            "range": "120 ft",
            "duration": "Instant",
            "description": [
                "You toss a mote of fire at an enemy. Deal 4d12 fire magic damage to a target in range. This spell deals an additional 2d12 fire magic damage if it's the second fire spell you've cast this turn."
            ],
            "tags": [
                "Spell",
                "attack",
                "fire",
                "destruction",
                "single-target",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Searing Blaze",
            "class": "Pyromancer",
            "branch": "Incineration",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "20 mana",
            "range": "120 ft",
            "duration": "Instant",
            "description": [
                "You scald an enemy with vicious flames. Deal 5d12 fire magic damage to a target in range. The target is then inflicted with Burn X, where X is equal to the amount of damage rolled."
            ],
            "tags": [
                "Spell",
                "attack",
                "fire",
                "destruction",
                "single-target",
                "condition",
                "Burn",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Banefire",
            "class": "Pyromancer",
            "branch": "Incineration",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "30 mana",
            "range": "120 ft",
            "duration": "Instant",
            "description": [
                "You burn an enemy with overpowering fire. Deal 6d12 fire magic damage to a target in range. This spell cannot be blocked or counterspelled if it's the second fire spell you've cast this turn."
            ],
            "tags": [
                "Spell",
                "attack",
                "fire",
                "destruction",
                "single-target",
                "conditional",
                "no block",
                "no counter"
            ]
        },
        {
            "type": "ability",
            "name": "Magma Spray",
            "class": "Pyromancer",
            "branch": "Conflagration",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "15 mana",
            "range": "30 ft",
            "duration": "Instant",
            "description": [
                "You spray flames from outstretched hands. Deal 4d12 fire magic damage to all enemies in a 30 ft cone. Enemies hit by this spell that are at most 15 ft from you are additionally inflicted with Burn X, where X is equal to the amount of damage rolled."
            ],
            "tags": [
                "Spell",
                "attack",
                "fire",
                "destruction",
                "AOE",
                "cone",
                "conditional",
                "condition",
                "Burn"
            ]
        },
        {
            "type": "ability",
            "name": "Fireball",
            "class": "Pyromancer",
            "branch": "Conflagration",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "25 mana",
            "range": "120 ft",
            "duration": "Instant",
            "description": [
                "You conjure a massive ball of flames. Deal 5d12 fire magic damage to all enemies in a 35 ft square centered on a space in range. When you cast this spell, you may pay an additional 5 mana to add 1 damage die to the spell's damage roll, and you may do this any number of times."
            ],
            "tags": [
                "Spell",
                "attack",
                "fire",
                "destruction",
                "AOE",
                "square",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Heat Ray",
            "class": "Pyromancer",
            "branch": "Conflagration",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "35 mana",
            "range": "120 ft",
            "duration": "Instant",
            "description": [
                "You fire a beam of heat and fire. Deal 6d12 fire magic damage to all enemies in a 120 ft line. This spell deals an additional 3d12 fire magic damage if it's the second fire spell you've cast this turn."
            ],
            "tags": [
                "Spell",
                "attack",
                "fire",
                "destruction",
                "AOE",
                "cone",
                "conditional",
                "condition",
                "Burn"
            ]
        },
        {
            "type": "ability",
            "name": "Burn Trail",
            "class": "Pyromancer",
            "branch": "Wildfire",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "15 mana",
            "range": "60 ft",
            "duration": "1 minute",
            "description": [
                "You let your flames run loose. Create flames in up to 5 spaces within range for the duration; all target spaces must touch at least one other target space in an orthogonal or diagonal direction. These flames deal 3d12 fire magic damage to any entity that passes through their space, starts in their space, or ends a turn in their space."
            ],
            "tags": [
                "Spell",
                "fire",
                "conjuration",
                "modal",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Pyroblast",
            "class": "Pyromancer",
            "branch": "Wildfire",
            "tier": 2,
            "action": "1 Reaction",
            "cost": "20 mana",
            "range": "100 ft",
            "duration": "Instant",
            "description": [
                "You ignite an enemy mage's mana. As a reaction to a target in range casting a spell, you may counter that spell. The target takes fire magic damage equal to the amount of mana they spent on the countered spell"
            ],
            "tags": [
                "Spell",
                "fire",
                "destruction",
                "defensive",
                "counterspell",
                "single-target"
            ]
        },
        {
            "type": "ability",
            "name": "Inflame",
            "class": "Pyromancer",
            "branch": "Wildfire",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "25 mana",
            "range": "120 ft",
            "duration": "1 minute",
            "description": [
                "You create a flame within a target. Target in range gains the Inflame mark. When a target marked this way dies (or is knocked unconscious), they deal fire magic damage equal to half the amount of damage taken from the lethal hit to all adjacent targets, inflicting those targets with the Inflame mark. You may cast this spell as a reaction if you spend an additional 15 mana."
            ],
            "tags": [
                "Spell",
                "fire",
                "conjuration",
                "destruction",
                "conditional",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Bodyshot",
            "class": "Rifleman",
            "branch": "Operation",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 stamina",
            "range": "50 ft",
            "duration": "Instant",
            "description": [
                "You aim for center of mass. Fire your currently equipped firearm at an enemy in range, dealing an additional 3d12 physical damage. Your target then chooses to either fall prone or be pushed back 10 ft. If this attack is made with a silver bullet, your target must choose both.",
                "<br>",
                "Secondary Fire: Fire your currently equipped firearm at an enemy in range, dealing an additional 2d12 physical damage. The target is inflicted with 10% physical vulnerability, which can stack up to 5 times. If this attack is made with a silver bullet, your target gains 2 stacks of this vulnerability."
            ],
            "tags": [
                "Attack",
                "physical",
                "single-target",
                "ranged",
                "firearm",
                "vulnerability",
                "knock prone",
                "forced movement",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Burst Fire",
            "class": "Rifleman",
            "branch": "Operation",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "30 stamina",
            "range": "50 ft",
            "duration": "Instant",
            "description": [
                "You fire several shots in quick succession. Fire your currently equipped firearm 3 times at up to 3 targets in range, with each shot dealing an additional d12 physical damage. If the first shot is a silver bullet, the other two bullets gain its properties.",
                "<br>",
                "Secondary Fire: Fire your currently equipped firearm at a target in range, dealing 3d12 physical damage, inflicting any on-hit effects with tripled effectiveness."
            ],
            "tags": [
                "Attack",
                "physical",
                "single-target",
                "multi-target",
                "ranged",
                "firearm",
                "modal",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Iron Sights",
            "class": "Rifleman",
            "branch": "Assembly",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You aim down your iron sights for increased accuracy. Your next firearm attack has +10% critical strike chance; it also has +100% critical damage modifier if it is made with a silver bullet."
            ],
            "tags": [
                "Empower",
                "conditional",
                "increase critical"
            ]
        },
        {
            "type": "ability",
            "name": "Bleeding Bullet",
            "class": "Rifleman",
            "branch": "Assembly",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "20 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You aim for areas of high blood flow. Your next firearm attack inflicts a d12 Bleed, increased to 2d12 Bleed if it is made with a silver bullet."
            ],
            "tags": [
                "Empower",
                "conditional",
                "condition",
                "Bleed"
            ]
        },
        {
            "type": "ability",
            "name": "Quick Reload",
            "class": "Rifleman",
            "branch": "Maintenance",
            "tier": 1,
            "action": "1 Minor Action",
            "cost": "10 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You've learned how to quickly load a new clip of ammo. Reload each firearm you have currently equipped. When you do, each firearm you have currently equipped gains a silver bullet in a chamber of your choice."
            ],
            "tags": [
                "Reload"
            ]
        },
        {
            "type": "ability",
            "name": "Steady Shooting",
            "class": "Rifleman",
            "branch": "Maintenance",
            "tier": 2,
            "action": "1 Minor Action",
            "cost": "15 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You've learned to steady your gun to minimize misfire rate. Your next attack has -10% Misfire Rate. When you cast this ability, you may drop into a prone position; if you do, your next attack has -20% Misfire Rate instead."
            ],
            "tags": [
                "Modal"
            ]
        },
        {
            "type": "ability",
            "name": "Crossguard Guillotine",
            "class": "Sentinel",
            "branch": "Dauntless",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "15 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You swing your bladed shields in an X shaped pattern. Deal 4d10 physical damage to a target in range. This attack can block all incoming attacks that it reacts to, and if this attack combos with a dash, the block will also block any attacks along the path of your dash as well as at the final destination. If you are dual wielding shields, you may expend any number of Shield stacks; this attack deals an additional Xd10 physical damage, where X is the number of Shield stacks spent, and also hits enemies diagonally to your target."
            ],
            "tags": [
                "Attack",
                "physical",
                "single-target",
                "melee",
                "multi-target",
                "conditional",
                "block",
                "shield",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Bladeshield Arc",
            "class": "Sentinel",
            "branch": "Dauntless",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "25 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You spin your shields around you in a wide arc. Deal 5d10 physical damage to all targets in range. This attack acts as an AOE block for the spaces it hits as well as your current space when it is used as a reaction. If you are dual wielding shields, you may expend any number of Shield stacks; this attack deals an additional Xd10 physical damage, where X is the number of Shield stacks spent, and has its range increased to 10 ft."
            ],
            "tags": [
                "Attack",
                "physical",
                "melee",
                "multi-target",
                "conditional",
                "AOE block",
                "shield",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Parallel Shields",
            "class": "Sentinel",
            "branch": "Stalwart",
            "tier": 1,
            "action": "1 Reaction",
            "cost": "20 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You manipulate two shields to maximize coverage or layer your defenses. For each shield currently equipped, block an attack on yourself or on an ally in an adjacent space. If this ability combos with a dash, you can split up the two blocks to occur at two different points along the dash.",
                "<br>",
                "Alternatively, if you are dual wielding shields, you may expend a Shield stack to layer the shields atop each other, blocking a single attack on yourself. This block is effective even against attacks that normally cannot be blocked, and an attack blocked this way cannot penetrate AC."
            ],
            "tags": [
                "Block",
                "shield",
                "self-target",
                "ally-target",
                "conditional",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Rapid Shields",
            "class": "Sentinel",
            "branch": "Stalwart",
            "tier": 2,
            "action": "1 Reaction",
            "cost": "30 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You toss up your shields to block multiple attacks from a dangerous enemy. Block all the hits of a multi-hit attack on yourself or an ally in range. For each hit blocked this way, you may autoattack the attacking enemy as a free reaction. If you are dual wielding shields, you may expend a Shield stack to autoattack with each shield per hit instead."
            ],
            "tags": [
                "Block",
                "shield",
                "self-target",
                "ally-target",
                "conditional",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Chain Rush",
            "class": "Sentinel",
            "branch": "Tenacious",
            "tier": 1,
            "action": "1 Minor Action",
            "cost": "15 stamina",
            "range": "30 ft",
            "duration": "Instant",
            "description": [
                "You toss your shield and pull yourself to a new location with the chains. Toss your shield to a target space in range; if the space is occupied, push the entity in that space 5 ft away from you. If you are dual wielding shields, drop your other shield in your current space, then dash along your chain to the target space and pick up the shield there. As long as you do not use the shield at your original location for another action, you may dash along the chain back to that shield as a free reaction, picking the shield back up."
            ],
            "tags": [
                "Dash",
                "conditional",
                "modal",
                "shield"
            ]
        },
        {
            "type": "ability",
            "name": "Chain Drag",
            "class": "Sentinel",
            "branch": "Tenacious",
            "tier": 2,
            "action": "1 Minor Action",
            "cost": "20 stamina",
            "range": "30 ft",
            "duration": "Instant",
            "description": [
                "You toss your shield at an enemy to pull them towards you. Toss your shield at a target enemy in range, then drag them to a space within melee range. If you are dual wielding shields, do this twice. If you dash during this ability, drag your targets along with you."
            ],
            "tags": [
                "Forced movement",
                "pull",
                "conditional",
                "shield"
            ]
        },
        {
            "type": "ability",
            "name": "Piercing Shot",
            "class": "Sniper",
            "branch": "Shooting",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 stamina",
            "range": "200 ft",
            "duration": "Instant",
            "description": [
                "You fire an empowered arrow, skewering multiple enemies. Deal 5d8 physical damage to all enemy targets in a 200 ft line. Targets beyond the first one hit take half damage, unless they are Spotted."
            ],
            "tags": [
                "Attack",
                "ranged",
                "physical",
                "multi-target",
                ""
            ]
        },
        {
            "type": "ability",
            "name": "Kill Shot",
            "class": "Sniper",
            "branch": "Shooting",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "30 stamina",
            "range": "200 ft",
            "duration": "Instant",
            "description": [
                "You fire a single, massive arrow with deadly accuracy. Deal 7d8 physical damage to a target in range. You may choose to expend any number of Spotting stacks to add 10% Lethality to the attack per stack."
            ],
            "tags": [
                "Attack",
                "ranged",
                "physical",
                "single-target",
                "modal",
                "Lethal"
            ]
        },
        {
            "type": "ability",
            "name": "Shrapnel Shot",
            "class": "Sniper",
            "branch": "Shooting",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "45 stamina",
            "range": "200 ft",
            "duration": "Instant",
            "description": [
                "You fire an arrow rigged to detonate, shooting deadly shrapnel from the arrowhead after initial impact. Deal 6d8 to a target in range. If the target is Spotted, this ability deals half as much damage taken by the target to all enemies within 20 ft of the target. If the target was killed by the initial hit, this ability deals damage equal to the damage taken by the target to all enemies within 20 ft of the target instead."
            ],
            "tags": [
                "Attack",
                "ranged",
                "physical",
                "single-target",
                "conditional",
                "AOE"
            ]
        },
        {
            "type": "ability",
            "name": "Rapid Shot",
            "class": "Sniper",
            "branch": "Shooting",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "X stamina",
            "range": "200 ft",
            "duration": "Instant",
            "description": [
                "You fire a heavy stream of arrows. Expend any amount of stamina in order to deal 2d8 physical damage to a target in range for every 10 stamina spent this way. If the target is Spotted, these hits gain the damage increase from consuming Spotting stacks without actually consuming them until the last hit."
            ],
            "tags": [
                "Attack",
                "ranged",
                "physical",
                "single-target",
                "multi-hit",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Distance Shooter",
            "class": "Sniper",
            "branch": "Aiming",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "15 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You fire specialized arrows which speed up as they fly. Your next ranged attack deals 2 additional damage for every 5 ft between you and your target."
            ],
            "tags": [
                "Buff",
                "self-target",
                "conditional",
                "ranged",
                "bow"
            ]
        },
        {
            "type": "ability",
            "name": "Precision Shooter",
            "class": "Sniper",
            "branch": "Aiming",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "30 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You fire specialized arrows which fly faster and punch through armor. Your next ranged attack ignores AC and MR, cannot miss, bypasses barriers and walls, cannot be blocked or redirected, and cannot be reacted to."
            ],
            "tags": [
                "Buff",
                "self-target",
                "ignore AC",
                "ignore MR",
                "ignore barriers/walls/blocks",
                "no-miss",
                "no-react",
                "bow"
            ]
        },
        {
            "type": "ability",
            "name": "Analytical Shooter",
            "class": "Sniper",
            "branch": "Aiming",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "55 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You aim carefully, scanning for a target's weak points. Your next ranged attack gains 20% critical strike chance and 50% critical damage modifier. When you cast this ability, you may choose to concentrate on it. While concentrating on this ability, you may use a Major Action to gain an additional 10% critical strike chance and 25% critical damage modifier on your next ranged attack. This ability cannot grant more than 100% critical strike chance or more than 200% critical damage modifier. Concentration on this ability ends immediately upon making an attack."
            ],
            "tags": [
                "Buff",
                "self-target",
                "stat improve",
                "critical",
                "concentration",
                "repeatable",
                "bow"
            ]
        },
        {
            "type": "ability",
            "name": "Professional Shooter",
            "class": "Sniper",
            "branch": "Aiming",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "120 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You force your senses past their limit. If you have an enemy Spotted, when you cast this ability, you instantly gain max Spotting stacks. After casting this ability, you lose the benefits of the Spotter passive until your next long rest."
            ],
            "tags": [
                "Self-target",
                "bow"
            ]
        },
        {
            "type": "ability",
            "name": "Swift Sprint",
            "class": "Sniper",
            "branch": "Improvising",
            "tier": 1,
            "action": "1 Major Action or Reaction",
            "cost": "15 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You quickly spring to your feet and sprint from danger. Cleanse Slow, Immobilize, Crippled, and Prone, then dash 10 ft in any direction. You may choose to expend a stack of Spotting to dash 25 ft instead."
            ],
            "tags": [
                "Dash",
                "modal",
                "cleanse"
            ]
        },
        {
            "type": "ability",
            "name": "Swift Shot",
            "class": "Sniper",
            "branch": "Improvising",
            "tier": 2,
            "action": "1 Minor Action or Reaction",
            "cost": "25 stamina",
            "range": "200 ft",
            "duration": "Instant",
            "description": [
                "You flick your aim elsewhere and take a snap potshot. Deal 3d8 physical damage to a target in range, Stunning them until the end of the turn."
            ],
            "tags": [
                "Attack",
                "ranged",
                "physical",
                "single-target",
                "condition",
                "Stun"
            ]
        },
        {
            "type": "ability",
            "name": "Bola Shot",
            "class": "Sniper",
            "branch": "Improvising",
            "tier": 3,
            "action": "1 Major Action or Reaction",
            "cost": "35 stamina",
            "range": "200 ft",
            "duration": "Instant",
            "description": [
                "You fire an arrow with a bola head. Deal 4d8 damage and inflict Slow on a target in range. You may choose to expend a stack of Spotting to inflict Immobilize instead."
            ],
            "tags": [
                "Attack",
                "ranged",
                "physical",
                "single-target",
                "condition",
                "Slow",
                "modal",
                "Immobilize"
            ]
        },
        {
            "type": "ability",
            "name": "Evasive Maneuvers",
            "class": "Sniper",
            "branch": "Improvising",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "70 stamina",
            "range": "Self",
            "duration": "1 minute",
            "description": [
                "You concentrate all your energy on avoiding attacks. Expend any number of Spotting stacks to gain 10% evasion per stack expended this way. While this buff is active, you may use your Reaction to cast any Sniper ability."
            ],
            "tags": [
                "Buff",
                "concentration",
                "add evasion",
                ""
            ]
        },
        {
            "type": "ability",
            "name": "Fleetfoot Blade",
            "class": "Soldier",
            "branch": "Skirmish",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You slash quickly at an enemy while staying mobile. Deal 4d10 physical damage to a target in range. If you cast a dash reaction ability, you may cast this ability as a free reaction at the beginning or end of your dash."
            ],
            "tags": [
                "Attack",
                "physical",
                "single-target",
                "melee",
                "longblade",
                "modal",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Steadfast Strikes",
            "class": "Soldier",
            "branch": "Skirmish",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "20 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You attack relentlessly in between evasive moves. Deal 2d10 physical damage to a target in range. You may choose to concentrate on this ability when you cast it. If you do, you may use your Major Action to repeat this ability at no stamina cost, dealing 2d10 + Xd10 physical damage to a target in range, where X is the number of times you have hit with this ability since beginning concentration. Concentration on this ability ends immediately when you take at least 1 point of damage or recieve a condition."
            ],
            "tags": [
                "Attack",
                "physical",
                "single-target",
                "melee",
                "longblade",
                "concentration",
                "repeatable",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Biding Blade",
            "class": "Soldier",
            "branch": "Skirmish",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "40 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You build energy while blocking to attack when the opening presents itself. Deal 5d10 physical damage to a target in range. If you cast a block reaction ability, you may cast this ability as a free reaction after your block, dealing 5d10 + X physical damage to a target in range, where X is half the blocked damage amount."
            ],
            "tags": [
                "Attack",
                "physical",
                "single-target",
                "melee",
                "longblade",
                "modal",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Sever The Head",
            "class": "Soldier",
            "branch": "Skirmish",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "50 stamina",
            "range": "30 ft",
            "duration": "Instant",
            "description": [
                "You dive the enemy's backline with the goal of slaying their commander. Dash to a space adjacent to a target in range, marking the target and dealing 6d10 physical damage to it. While the target is marked, it loses its reaction and takes 50% increased damage from your attacks. The mark lasts until the beginning of your next turn or until you take at least 1 point of damage or gain a condition. Alternatively, you may end the mark early to dash up to 30 ft in any direction as a free reaction at any time."
            ],
            "tags": [
                "Attack",
                "physical",
                "single-target",
                "melee",
                "longblade",
                "modal",
                "mark",
                "damage boost",
                "dash"
            ]
        },
        {
            "type": "ability",
            "name": "Intercept",
            "class": "Soldier",
            "branch": "Safeguard",
            "tier": 1,
            "action": "1 Reaction",
            "cost": "10 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You toss your shield up to block an attack. Completely block one single-target attack on you as a reaction. If the attacker is in melee range, you may dash to any empty space that is still in melee range."
            ],
            "tags": [
                "Block",
                "self-target",
                "dash",
                "conditional",
                "shield"
            ]
        },
        {
            "type": "ability",
            "name": "Shield Bash",
            "class": "Soldier",
            "branch": "Safeguard",
            "tier": 2,
            "action": "1 Reaction",
            "cost": "30 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You preemptively counterattack before your enemy's attack lands. When an enemy in range targets you with an attack, deal 4d6 physical damage to that enemy. If you roll at least 18 on your damage dice for this ability, it also Stuns your target until the beginning of their next turn."
            ],
            "tags": [
                "Single-target",
                "attack",
                "physical",
                "melee",
                "shield",
                "conditional",
                "Stun",
                "condition"
            ]
        },
        {
            "type": "ability",
            "name": "Protective Sweep",
            "class": "Soldier",
            "branch": "Safeguard",
            "tier": 3,
            "action": "1 Reaction",
            "cost": "40 stamina",
            "range": "5 ft",
            "duration": "Instant",
            "description": [
                "You spin your shield in a wide circle, protecting an entire area. Block all the effects of an incoming AOE attack for all spaces within range."
            ],
            "tags": [
                "Block",
                "AOE",
                "shield"
            ]
        },
        {
            "type": "ability",
            "name": "Long Live The King",
            "class": "Soldier",
            "branch": "Safeguard",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "50 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You stand by an important ally, protecting them from harm. Until the beginning of your next turn, you may use any number of free reactions to redirect all attacks that would hit target adjacent ally to yourself, blocking 50% of the damage of those attacks. If the ally you targetted is not adjacent to you when they are attacked, you may dash to a space adjacent to them as a free reaction to such an attack, expending 5 stamina for every 5 ft traveled this way up to a limit of 50 ft."
            ],
            "tags": [
                "Block",
                "dash",
                "modal",
                "variable stamina cost",
                "redirect"
            ]
        },
        {
            "type": "ability",
            "name": "Dodge Roll",
            "class": "Soldier",
            "branch": "Sprint",
            "tier": 1,
            "action": "1 Minor Action or Reaction",
            "cost": "10 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You roll away or towards enemies. Dash up to 20 ft in any direction at any time. The max dash range extends to 30 ft if you use this ability as a reaction after using it as a minor action in the same round."
            ],
            "tags": [
                "Dash",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Double Time",
            "class": "Soldier",
            "branch": "Sprint",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "20 stamina",
            "range": "Self",
            "duration": "1 minute",
            "description": [
                "You speed up your pace in combat. Increase your move speed by +20 and convert all movement made during Move Actions to dashes."
            ],
            "tags": [
                "Buff",
                "move speed"
            ]
        },
        {
            "type": "ability",
            "name": "Tactical Withdrawal",
            "class": "Soldier",
            "branch": "Sprint",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "40 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You sprint out of a tactically unsound position. When you successfully resolve this ability, actions you take this turn do not trigger enemy reactions (although the initial cast of this ability can be reacted to). Dash up to 40 ft in any direction to a space that is not adjacent to an enemy."
            ],
            "tags": [
                "Dash",
                "conditional",
                "action denial"
            ]
        },
        {
            "type": "ability",
            "name": "Vigor of Battle",
            "class": "Soldier",
            "branch": "Sprint",
            "tier": 4,
            "action": "1 Minor Action",
            "cost": "50 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You build up speed as you deliver death. Until the beginning of your next turn, you gain 5 ft of additional move speed for every 5 damage you deal this round, and you gain 5% evasion for every 10 damage you deal this round. At the beginning of your next turn, any unused move speed you accumulated during the last round carries over to the new turn."
            ],
            "tags": [
                "Gain move speed",
                "gain evasion"
            ]
        },
        {
            "type": "ability",
            "name": "Summon Ascarion Beast",
            "class": "Summoner",
            "branch": "Pack",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 mana",
            "range": "20 ft",
            "duration": "1 minute",
            "description": [
                "You summon one of the monstrous, toxic beasts of Ascari, the plane of amethyst poisons. Summon an Ascarion Beast with 30 HP, 40 ft Move Speed, 10 AC, 20% Evasion, 20% MR, and 20% CR. The Beast obeys your commands; otherwise, it uses its Move Action to approach enemies and its Major Action to attack them for 4d6 physical damage with \"On Hit: Inflict 2d6 Poison\". The Beast has a 20 ft aura that causes attacks made by allies to ignore 20% of their targets' CR."
            ],
            "tags": [
                "Spell",
                "summoning",
                "minion",
                "physical",
                "condition",
                "Poison"
            ]
        },
        {
            "type": "ability",
            "name": "Summon Asiok Dracolord",
            "class": "Summoner",
            "branch": "Pack",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "20 mana",
            "range": "20 ft",
            "duration": "1 minute",
            "description": [
                "You summon one of the elite Draconian siegebreakers of Asiok, the war-scarred plane of scarlet tragedy. Summon an Asiok Dracolord with 50 HP, 40 ft Move Speed, 40 AC, 30% MR, and 30% CR. The Dracolord obeys your commands; otherwise, it uses its Move Action to approach enemies and its Major Action to use Firebreath, dealing 6d10 fire magic damage in a 30 ft cone. Firebreath deals double damage to constructs and buildings. The Dracolord has a 20 ft aura that increases ally damage by 30%."
            ],
            "tags": [
                "Spell",
                "summoning",
                "minion",
                "AOE",
                "cone"
            ]
        },
        {
            "type": "ability",
            "name": "Summon Throatslitter Demon",
            "class": "Summoner",
            "branch": "Pack",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "30 mana",
            "range": "20 ft",
            "duration": "1 minute",
            "description": [
                "You summon one of the terrifying, evil demons that stalk the Aetherways. Summon a Throatslitter Demon with 50 HP, 50 ft Move Speed, 70% EV, 20% MR, 100% Armor Penetration, 50% Critical Strike Chance, and +100% Critical Damage Modifier. The Demon obeys your commands; otherwise, it uses its Move Action to approach enemies, its Major Action to attack in melee range for 6d6 physical damage, and its Minor Action to make Sneak checks with a +20 bonus. The Demon has a 20 ft aura that increases ally critical strike chance by +15%."
            ],
            "tags": [
                "Spell",
                "summoning",
                "minion",
                "physical"
            ]
        },
        {
            "type": "ability",
            "name": "Summon Siretsu Leviathan",
            "class": "Summoner",
            "branch": "Pack",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "60 mana",
            "range": "20 ft",
            "duration": "1 minute",
            "description": [
                "You summon a monster from the depths of the oceans of Siretsu, the plane of lifestealing waters. Summon a Leviathan with 200 HP, massive size, 100 ft speed on land and in water, 50 AC, 50% MR, and 50% CR. The Leviathan obeys your commands; otherwise, it uses its Move Action to approach enemies, its Major Action to spawn tidal waves that deal 10d10 water magic damage in a 45 ft square centered on a space within 100 ft, and its Minor Action to grapple up to 4 enemies with its tentacles or to devour grappled enemies, dealing 10d10 physical damage and banishing them to Siretsu. The Leviathan has a 100 ft aura that drains 30 stamina and 30 mana from each enemy within the aura."
            ],
            "tags": [
                "Spell",
                "summoning",
                "minion",
                "water",
                "AOE",
                "square"
            ]
        },
        {
            "type": "ability",
            "name": "Summon Batusan Golem",
            "class": "Summoner",
            "branch": "Herd",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 mana",
            "range": "20 ft",
            "duration": "1 minute",
            "description": [
                "You summon an armored golem from Batusa, the plane of blacksteel mountains. Summon a Batusan Golem with 60 HP, 30 ft Move Speed, 30 AC, 50% MR, and 40% CR. The Golem obeys your commands; otherwise, it uses its Move Action to move towards you, its Major Action to make a melee multi-target attack, knocking back enemies 20 ft away from you, and its Reaction to block one attack or AOE hit on you. The Golem has a 20 ft aura that increases the AC of allies by 30%."
            ],
            "tags": [
                "Spell",
                "summoning",
                "minion",
                "knockback",
                "AC increase"
            ]
        },
        {
            "type": "ability",
            "name": "Summon Noxian Seraph",
            "class": "Summoner",
            "branch": "Herd",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "20 mana",
            "range": "20 ft",
            "duration": "1 minute",
            "description": [
                "You summon an angel from the domain of Nox. Summon a Noxian Seraph with 50 HP, 40 ft Move Speed, 10 AC, 50% MR, and 70% CR. The Seraph obeys your commands; otherwise, it uses its Move Action to move towards you, its Major Action to heal you for 5d10 health, and its Minor Action to cleanse you of 1 random condition. The Seraph has a 20 ft aura that increases the MR of allies by 30%."
            ],
            "tags": [
                "Spell",
                "summoning",
                "minion",
                "healing",
                "cleanse",
                "MR increase"
            ]
        },
        {
            "type": "ability",
            "name": "Summon Vilyrian Spellmaster",
            "class": "Summoner",
            "branch": "Herd",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "30 mana",
            "range": "20 ft",
            "duration": "1 minute",
            "description": [
                "You summon a wizard from Vilyr, the Infinite Library. Summon a Vilyrian Spellmaster with 40 HP, 30 ft Move Speed, 70% MR, and 20% CR. The Spellmaster obeys your commands; otherwise, it uses its Move Action to move towards you, its Major Action to dispel a non-allied magical field or effect that it is adjacent to or inside of, and its reaction to cast a counterspell, countering an enemy spell cast within 50 ft. The Spellcaster has a 20 ft aura that increases the CR of allies by 20%."
            ],
            "tags": [
                "Spell",
                "summoning",
                "minion",
                "defense",
                "counterspell"
            ]
        },
        {
            "type": "ability",
            "name": "Summon Warpwurm",
            "class": "Summoner",
            "branch": "Herd",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "40 mana",
            "range": "20 ft",
            "duration": "1 minute",
            "description": [
                "You summon a warpwurm from the Aetherways. Summon a Warpwurm with 50 HP. The Warpwurm obeys you commands; otherwise, it does nothing. It uses its Major Action to create up to 2  temporary portals in empty spaces within 100 ft, linked to its own duration; these portals can be walked into to teleport to any other portal made by the Warpwurm. It uses its reaction to teleport you or other allies out of danger, such as to avoid AOE spells or to rescue someone from falling. The Warpwurm has a 20 ft aura; within this aura, all allies are spatially locked to the current plane of existence and cannot be forcibly banished or teleported."
            ],
            "tags": [
                "Spell",
                "summoning",
                "minion"
            ]
        },
        {
            "type": "ability",
            "name": "Summon Unseen Servant",
            "class": "Summoner",
            "branch": "Flock",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 mana",
            "range": "20 ft",
            "duration": "1 hour",
            "description": [
                "You summon a spirit from beyond the gates of Adol. Summon an Unseen Servant with 1 HP, 30 ft Move Speed, and natural invisibility. The Unseen Servant obeys your commands; otherwise, it follows you and does nothing. The Servant is able to use tools and make the following skill checks with a +25 bonus:",
                "<ul>",
                "<li>Athletics: Balance, Climbing, Force, Movement</li>",
                "<li>Gathering: All</li>",
                "<li>Item Use: Construction, First Aid, Ropes, Tinkering, Traps</li>",
                "<li>Observation: Listen, Search</li>",
                "<li>Stealth: Lockpicking, Sleight of Hand, Sneak, Steal</li>",
                "<li>Transportation: Air Vehicles, Land Vehicles, Sea Vehicles</li>",
                "</ul>"
            ],
            "tags": [
                "Spell",
                "summoning",
                "minion"
            ]
        },
        {
            "type": "ability",
            "name": "Summon Estian Wayfinder",
            "class": "Summoner",
            "branch": "Flock",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "20 mana",
            "range": "20 ft",
            "duration": "1 hour",
            "description": [
                "You summon a psionic guide from Estia, the plane of ephemeral, psychic pleasures. Summon an Estian Wayfinder with 30 HP, 150 ft Move Speed, 100% Evasion, and 50% CR. The Wayfinder obeys your commands; otherwise, it follows you and does nothing. The Wayfinder has masterful knowledge of most planes, and can act as a guide to nearly any location on a plane that isn't a well kept secret or whose location isn't lost to the ages. The Wayfinder has a 150 ft aura with the following effects: allies, mounts, and vehicles have doubled Move Speed; allies have +30 to Psionics: Defense checks; allies cannot be charmed, Feared, Confused, or put to Sleep."
            ],
            "tags": [
                "Spell",
                "summoning",
                "minion"
            ]
        },
        {
            "type": "ability",
            "name": "Summon Xat'hul Charmspirit",
            "class": "Summoner",
            "branch": "Flock",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "30 mana",
            "range": "20 ft",
            "duration": "1 hour",
            "description": [
                "You summon a small totemic spirit from Xat'hul, the plane of living, virulent mana. Summon a Xat'hul Charmspirit with 10 HP and 60 ft Move Speed. The Charmspirit obeys your commands; otherwise, it follows you and does nothing. The Charmspirit will imprint upon a humanoid of your choice, following them instead and granting them a random benefit (a humanoid cannot be imprinted by more than one Charmspirit at a time). The Charmspirit is attracted to sources of mana, informing its imprinted humanoid of nearby people or objects that contain mana up to a range of 1 mile, although it struggles with expressing exact numbers. The Charmspirit has a 5 ft aura with the following effects: allies have +25 to Artistry and Interaction skill checks; allies have +10% Health Regeneration; allies automatically stabilize if downed."
            ],
            "tags": [
                "Spell",
                "summoning",
                "minion"
            ]
        },
        {
            "type": "ability",
            "name": "Summon Watcher",
            "class": "Summoner",
            "branch": "Flock",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "50 mana",
            "range": "20 ft",
            "duration": "6 hours",
            "description": [
                "You summon a silent guardian from a plane long dead. Summon a Watcher with 1 HP and immunity to all damage and conditions. The Watcher maintains a vigilant guard upon all spaces within 100 ft of it, has true sight and can see through walls and barriers, and can telepathically inform the caster of the status of all entities within its sight. The Watcher will warn the caster of any changes or threats in the area. The Watcher prevents scrying magic or teleportation magic from affecting the spaces it watches unless otherwise commanded. If commanded, the Watcher can cause the spaces and entities it sees to phase out of the current plane of existence, moving everyone within its area of influence to a pocket realm for 1 hour before dying. Allies that short rest while being guarded by a Watcher gain +30% health regeneration, +30% stamina regeneration, and +30% mana regeneration. Allies that long rest while being guarded by a Watcher have dreams of possible future events."
            ],
            "tags": [
                "Spell",
                "summoning",
                "minion"
            ]
        },
        {
            "type": "ability",
            "name": "Strengthen Soul",
            "class": "Symbiote",
            "branch": "Fiery Soul",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 mana",
            "range": "50 ft",
            "duration": "1 minute",
            "description": [
                "You strengthen an ally's conviction and confidence. Target ally in range gains a buff that increases their damage by 50% for the duration. When an ally gains this buff, they may use their reaction to make an autoattack."
            ],
            "tags": [
                "Spell",
                "buff",
                "increase damage"
            ]
        },
        {
            "type": "ability",
            "name": "Empower Soul",
            "class": "Symbiote",
            "branch": "Fiery Soul",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "20 mana",
            "range": "50 ft",
            "duration": "1 minute",
            "description": [
                "You empower an ally's willpower and forcefulness. Target ally in range gains a buff that causes their attacks to ignore 20% MR and evasion for the duration. You may expend any amount of additional mana when you cast this spell to add to the percentage MR and evasion ignored by twice the amount of additional mana spent."
            ],
            "tags": [
                "Spell",
                "buff",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Bolster Soul",
            "class": "Symbiote",
            "branch": "Fiery Soul",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "30 mana",
            "range": "50 ft",
            "duration": "1 minute",
            "description": [
                "You bolster an ally's focus and precision. Target ally in range gains a buff that grants +20% critical strike chance and +100% critical damage modifier for the duration. As a free reaction to attacking an enemy, an ally with this buff may end the buff early to make the triggering attack a critical hit that cannot be reacted to."
            ],
            "tags": [
                "Spell",
                "buff",
                "modal",
                "increase critical strike chance",
                "increase critical damage modifier"
            ]
        },
        {
            "type": "ability",
            "name": "Embolden Soul",
            "class": "Symbiote",
            "branch": "Fiery Soul",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "50 mana",
            "range": "50 ft",
            "duration": "1 minute",
            "description": [
                "You embolden an ally's forward advance. Target ally in range gains a buff that causes them to lose their Minor Action but gain an extra Major Action each turn. When this buff ends (for any reason), the target may make an attack as a free reaction."
            ],
            "tags": [
                "Spell",
                "buff",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Strengthen Body",
            "class": "Symbiote",
            "branch": "Stone Body",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 mana",
            "range": "50 ft",
            "duration": "1 minute",
            "description": [
                "You strengthen an ally's attention and constitution. Target ally in range gains a buff that increases their AC and Evasion by 40% for the duration. You may cast this spell as a reaction for an additional 10 mana."
            ],
            "tags": [
                "Spell",
                "buff",
                "increase AC",
                "increase Evasion",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Empower Body",
            "class": "Symbiote",
            "branch": "Stone Body",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "20 mana",
            "range": "50 ft",
            "duration": "1 minute",
            "description": [
                "You suffuse an ally's body with protective magic. Target ally in range gains a buff that grants +20% general MR and +20% MR for an element of your choice for the duration. You may cast this spell as a reaction for an additional 10 mana."
            ],
            "tags": [
                "Spell",
                "buff",
                "defensive",
                "increase MR",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Bolster Body",
            "class": "Symbiote",
            "branch": "Stone Body",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "30 mana",
            "range": "50 ft",
            "duration": "1 minute",
            "description": [
                "You bolster an ally's natural defenses against conditions. Target ally in range gains a buff that grants +20% general CR and +20% CR for a condition of your choice for the duration. You may cast this spell as a reaction for an additional 10 mana."
            ],
            "tags": [
                "Spell",
                "buff",
                "defensive",
                "increase CR",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Embolden Body",
            "class": "Symbiote",
            "branch": "Stone Body",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "50 mana",
            "range": "50 ft",
            "duration": "1 minute",
            "description": [
                "You embolden an ally's forward advance. Target ally in range gains a buff that causes them to lose their Minor Action but gain an extra Reaction each turn. When this buff ends (for any reason), the target becomes invulnerable to damage until the end of the turn."
            ],
            "tags": [
                "Spell",
                "buff",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Strengthen Mind",
            "class": "Symbiote",
            "branch": "Fluid Mind",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 mana",
            "range": "50 ft",
            "duration": "1 hour",
            "description": [
                "You strengthen an ally's instincts and proficiency. Target ally in range gains a buff that grants +30 to all skill checks for the duration. The target may consume 10 minutes of this buff's duration to reroll a skill check and take the new result while this buff is active."
            ],
            "tags": [
                "Spell",
                "buff",
                "skill boost"
            ]
        },
        {
            "type": "ability",
            "name": "Power Spike",
            "class": "Symbiote",
            "branch": "Fluid Mind",
            "tier": 2,
            "action": "1 Minor Action",
            "cost": "15 mana",
            "range": "50 ft",
            "duration": "Instant",
            "description": [
                "You empower a buff effect at the cost of its duration. Target buff effect in range that you originally granted has its effectiveness increased by 50% and its current duration cut in half (always rounded down to the nearest 10 second, 10 minute, or 6 hour interval as applicable for minute, hour, and day long buffs)."
            ],
            "tags": [
                "Spell",
                "utility"
            ]
        },
        {
            "type": "ability",
            "name": "Bolster Speed",
            "class": "Symbiote",
            "branch": "Fluid Mind",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "30 mana",
            "range": "50 ft",
            "duration": "1 minute",
            "description": [
                "You bolster an ally's quickness and endurance. Target ally in range gains a buff that grants +30 move speed for the duration. The target may consume 10 seconds of this buff's duration to dash 30 ft in any direction as a minor action or reaction."
            ],
            "tags": [
                "Spell",
                "buff",
                "increase speed"
            ]
        },
        {
            "type": "ability",
            "name": "Power Surge",
            "class": "Symbiote",
            "branch": "Fluid Mind",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "30 + X mana",
            "range": "---",
            "duration": "Instant",
            "description": [
                "You layer multiple buff spells together. When you successfully cast this spell, immediately cast 2 different buff spells on a target in range. Those buff spells cannot be countered when cast this way, and if one of those buff effects is targeted by the Power Spike spell, the other is also affected by it. The mana cost of Power Surge is 30 + X where X is the sum of the mana costs of the 2 buff spells being cast by Power Surge."
            ],
            "tags": [
                "Spell",
                "utility",
                "modal",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Pivot and Slash",
            "class": "Warlord",
            "branch": "Close Range",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You focus on your footwork while you attack, looking for an opening. Deal 4d10 physical damage to a target in range. You may dash up to 5 ft in any direction before or after this attack."
            ],
            "tags": [
                "Attack",
                "physical",
                "single-target",
                "melee",
                "modal",
                "dash"
            ]
        },
        {
            "type": "ability",
            "name": "Knock Aside",
            "class": "Warlord",
            "branch": "Close Range",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "20 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You slam your weapon into your opponent to push them. Deal 5d10 physical damage to a target in range, pushing them 10 ft in any direction except towards you."
            ],
            "tags": [
                "Attack",
                "physical",
                "single-target",
                "melee",
                "forced movement"
            ]
        },
        {
            "type": "ability",
            "name": "Crippling Blow",
            "class": "Warlord",
            "branch": "Close Range",
            "tier": 3,
            "action": "1 Reaction",
            "cost": "25 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You aim for an enemy's legs as they attempt to escape. As a reaction to an enemy attempt to move out of your reach, deal 5d10 physical damage to them, reduce their move speed to 0 for the turn, and inflict Crippled."
            ],
            "tags": [
                "Attack",
                "physical",
                "single-target",
                "melee",
                "Crippled"
            ]
        },
        {
            "type": "ability",
            "name": "Advancing Fire",
            "class": "Warlord",
            "branch": "Long Range",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 stamina",
            "range": "Weapon",
            "duration": "Instant",
            "description": [
                "You fire at an enemy as you approach. Deal 4d10 physical damage to a target in range. You may dash up to 15 ft towards the target if your attack does not miss."
            ],
            "tags": [
                "Attack",
                "physical",
                "single-target",
                "ranged",
                "conditional",
                "modal",
                "dash"
            ]
        },
        {
            "type": "ability",
            "name": "Hookshot",
            "class": "Warlord",
            "branch": "Long Range",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "20 stamina",
            "range": "Weapon",
            "duration": "Instant",
            "description": [
                "You fire at an enemy with a projectile and chain. Deal 5d10 physical damage to a target in range, then pull them 20 ft towards you."
            ],
            "tags": [
                "Attack",
                "physical",
                "single-target",
                "ranged",
                "forced movement"
            ]
        },
        {
            "type": "ability",
            "name": "Stopping Shot",
            "class": "Warlord",
            "branch": "Long Range",
            "tier": 3,
            "action": "1 Reaction",
            "cost": "25 stamina",
            "range": "Weapon",
            "duration": "Instant",
            "description": [
                "You shoot an enemy with a heavy projectile designed to stop their progression. As a reaction to an enemy moving into range or moving towards you, deal 5d10 physical damage to that enemy, reduce their move speed to 0 for the turn, and inflict Crippled."
            ],
            "tags": [
                "Attack",
                "physical",
                "single-target",
                "ranged",
                "forced movement"
            ]
        },
        {
            "type": "ability",
            "name": "Weapon Swap: Roll",
            "class": "Warlord",
            "branch": "Weapon Swap",
            "tier": 1,
            "action": "1 Minor Action",
            "cost": "10 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You roll while swapping weapons. Dash up to 20 ft in any direction, then you may swap weapons in both hands."
            ],
            "tags": [
                "Modal",
                "dash"
            ]
        },
        {
            "type": "ability",
            "name": "Weapon Swap: Quaff",
            "class": "Warlord",
            "branch": "Weapon Swap",
            "tier": 2,
            "action": "1 Minor Action",
            "cost": "15 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You quickly down a potion while swapping weapons. Quaff a potion from your inventory, then you may swap weapons in both hands."
            ],
            "tags": [
                "Modal"
            ]
        },
        {
            "type": "ability",
            "name": "Weapon Swap: Attack",
            "class": "Warlord",
            "branch": "Weapon Swap",
            "tier": 3,
            "action": "1 Minor Action",
            "cost": "20 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You swap weapons and make a quick attack. Swap weapons in both hands, then you may make an autoattack with each weapon currently equipped if applicable."
            ],
            "tags": [
                "Modal",
                "attack",
                "physical",
                "melee",
                "ranged",
                "single-target"
            ]
        },
        {
            "type": "ability",
            "name": "Spill Blood",
            "class": "Warrior",
            "branch": "Assault",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You hack at an enemy, severing blood vessels. Deal 4d10 physical damage to a target in range. Inflict a d10 Bleed on the target. This Bleed's damage is amplified by your passive."
            ],
            "tags": [
                "Attack",
                "physical",
                "single-target",
                "melee",
                "condition",
                "Bleed"
            ]
        },
        {
            "type": "ability",
            "name": "Cut Down",
            "class": "Warrior",
            "branch": "Assault",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "20 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You deliver a wide slash to the enemy's frontlines, adjusting for their formation. Choose one of the following:",
                "<ul>",
                "<li>Deal 3d10 damage to all enemies in a 10 ft cone, knocking them prone</li>",
                "<li>Deal 3d10 damage to all enemies in a 25 ft horizontal line, knocking them back 10 ft</li>",
                "</ul>",
                "If you have at least 3 buffs active on you, choose both options."
            ],
            "tags": [
                "Attack",
                "physical",
                "melee",
                "AOE",
                "cone",
                "horizontal line",
                "Knock Prone",
                "Knock Back",
                "modal",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Hack and Slash",
            "class": "Warrior",
            "branch": "Assault",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "40 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You turn vigor into violence, attacking quickly. Deal 4d10 physical damage to a target in range. Then, you may sacrifice a buff on you to repeat this skill at no cost."
            ],
            "tags": [
                "Attack",
                "physical",
                "single-target",
                "melee",
                "repeatable",
                "sacrifice"
            ]
        },
        {
            "type": "ability",
            "name": "Summary Execution",
            "class": "Warrior",
            "branch": "Assault",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "70 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You finish off weakened enemies. Deal 8d10 physical damage to all targets in range. This attack has lethality equal to each target's percentage of missing health (calculated after this ability's damage). You may sacrifice any number of buffs on you as you cast this ability to increase the base lethality of this attack by 10% per buff sacrificed this way."
            ],
            "tags": [
                "Attack",
                "physical",
                "multi-target",
                "melee",
                "sacrifice",
                "lethality",
                "missing health"
            ]
        },
        {
            "type": "ability",
            "name": "Shields Up",
            "class": "Warrior",
            "branch": "Protect",
            "tier": 1,
            "action": "1 Reaction",
            "cost": "15 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You toss up your shield or armguard to defend against an attack. Block an attack on you or an adjacent ally, reducing damage by 25%. Gain an additional 25% damage reduction for each buff you have."
            ],
            "tags": [
                "Block",
                "damage reduction",
                "self-target",
                "ally-target"
            ]
        },
        {
            "type": "ability",
            "name": "Reinforce Armor",
            "class": "Warrior",
            "branch": "Protect",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "25 stamina",
            "range": "Self",
            "duration": "1 minute",
            "description": [
                "You strengthen your armor's natural defenses. Sacrifice any number of buffs active on you. Gain 25% increased AC, Evasion, or MR for each buff sacrificed this way for 1 minute. Recasting this ability while its buff is active will end your previous buff and start a new one."
            ],
            "tags": [
                "Buff",
                "concentration",
                "sacrifice",
                "increase AC",
                "increase Evasion",
                "increase MR"
            ]
        },
        {
            "type": "ability",
            "name": "Take Cover",
            "class": "Warrior",
            "branch": "Protect",
            "tier": 3,
            "action": "1 Reaction",
            "cost": "35 stamina",
            "range": "30 ft",
            "duration": "Instant",
            "description": [
                "You dive and roll to rescue a comrade from danger. As a reaction to an attack on an allied target in range, immediately dash to them before the attack lands. Then, choose one of the following:",
                "<ul>",
                "<li>Use your body as a shield. Your target gains 30 AC, and the attack will be redirected to both you and your target</li>",
                "<li>Tackle your target to the ground. You and your target gain 30% evasion, and both of you are knocked prone</li>",
                "<li>Drag them to safety. Dash an additional 20 ft in any direction, dragging your target with you, and your target loses their reaction if they still have one</li>",
                "</ul>"
            ],
            "tags": [
                "Dash",
                "ally-target",
                "modal",
                "redirect",
                "knock prone",
                "increase AC",
                "increase Evasion"
            ]
        },
        {
            "type": "ability",
            "name": "Paragon of Victory",
            "class": "Warrior",
            "branch": "Protect",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "100 stamina",
            "range": "Self",
            "duration": "1 minute",
            "description": [
                "You become a powerful avatar of war. When you cast this ability, sacrifice any number of buffs on you. Gain the following effects, depending on the number of buffs sacrificed.",
                "<ul>",
                "<li>5 Buffs - Gain immunity to physical damage</li>",
                "<li>10 Buffs - Gain all of the above in addition to immunity to conditions and crowd control</li>",
                "<li>15 Buffs - Gain all of the above in addition to 50 ft of added speed and 100% increased damage</li>",
                "</ul>"
            ],
            "tags": [
                "Buff",
                "concentration",
                "sacrifice",
                "Immunity",
                "add speed",
                "increase damage",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "\"Charge!\"",
            "class": "Warrior",
            "branch": "Warcry",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "20 stamina",
            "range": "---",
            "duration": "Instant",
            "description": [
                "You bellow a righteous cry, calling all to drive forward into battle. You and all allies who can hear you gain 50% increased damage until the end of your next turn. When you cast this ability, all allies who can hear you may use their reaction to move up to their speed in any direction."
            ],
            "tags": [
                "Buff",
                "multi-target",
                "self-target",
                "ally-target",
                "damage increase"
            ]
        },
        {
            "type": "ability",
            "name": "\"Fight me!\"",
            "class": "Warrior",
            "branch": "Warcry",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "30 stamina",
            "range": "---",
            "duration": "1 minute",
            "description": [
                "You bellow a belligerent cry, igniting your enemies' fury. All enemies who can hear you are Taunted for 1 minute. An enemy Taunted by this ability previously is Immune to this ability's Taunt. When you cast this ability, all enemies who can hear you break concentration."
            ],
            "tags": [
                "Condition",
                "Taunt",
                "multi-target",
                "break concentration"
            ]
        },
        {
            "type": "ability",
            "name": "\"Overcome!\"",
            "class": "Warrior",
            "branch": "Warcry",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "40 stamina",
            "range": "---",
            "duration": "Instant",
            "description": [
                "You bellow an inspiring cry, encouraging everyone to persist. You and all allies who can hear you are cleansed of Fear, Stun, Paralysis, Confusion, Sleep, and Charm. Allies in a 1000 ft range who are in a downed state become immediately stabilized. When you cast this ability, all allies who can hear you may use their reaction to cleanse an additional condition on them of their choice."
            ],
            "tags": [
                "Cleanse",
                "Stabilize",
                "multi-target",
                "self-target",
                "ally-target"
            ]
        },
        {
            "type": "ability",
            "name": "\"Kill them all!\"",
            "class": "Warrior",
            "branch": "Warcry",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "70 stamina",
            "range": "---",
            "duration": "Instant",
            "description": [
                "You bellow a powerful cry, cowing your enemies and announcing their coming deaths. All enemies who can hear you gain 50% physical damage vulnerability, lose natural elemental resistances, and become Feared. When you cast this ability, all enemies who can hear you are stripped of all buffs, and those buffs are distributed as you choose amongst you and all allies who can hear you."
            ],
            "tags": [
                "Condition",
                "multi-target",
                "Fear",
                "vulnerability",
                "buff stripping",
                "buff"
            ]
        },
        {
            "type": "ability",
            "name": "Slice and Dice",
            "class": "Champion",
            "branch": "Type A Weapons",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "15 stamina",
            "range": "Weapon",
            "duration": "Instant",
            "description": [
                "You hack at an enemy with your weapon. Deal 5d10 physical damage to a target in range. You may reroll any damage dice rolled with this attack, taking the second result. If this attack is made with an axe or sword, take the higher result instead."
            ],
            "tags": [
                "Attack",
                "physical",
                "single-target",
                "melee",
                "ranged",
                "axe",
                "blunt",
                "longblade",
                "polearm",
                "shield",
                "heavy throwing weapon",
                "modal",
                "conditional",
                "reroll"
            ]
        },
        {
            "type": "ability",
            "name": "Skull Bash",
            "class": "Champion",
            "branch": "Type A Weapons",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "25 stamina",
            "range": "Weapon",
            "duration": "Instant",
            "description": [
                "You bash an enemy's head in with your weapon. Deal 6d10 physical damage to a target in range and Stun them until the end of their next turn. If this attack is made with a blunt weapon or shield, it also hits enemies adjacent to your target."
            ],
            "tags": [
                "Attack",
                "physical",
                "single-target",
                "melee",
                "ranged",
                "axe",
                "blunt",
                "longblade",
                "polearm",
                "shield",
                "heavy throwing weapon",
                "condition",
                "Stun",
                "conditional",
                "multi-target"
            ]
        },
        {
            "type": "ability",
            "name": "Piercing Blow",
            "class": "Champion",
            "branch": "Type A Weapons",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "35 stamina",
            "range": "Weapon",
            "duration": "Instant",
            "description": [
                "You skewer your enemy. Deal 7d10 physical damage to a target in range. This attack pierces your target to hit an enemy behind them that is within 15 ft of the initial target for half damage. If this attack is made with a polearm or heavy throwing weapon, the second hit deals full damage instead."
            ],
            "tags": [
                "Attack",
                "physical",
                "single-target",
                "multi-target",
                "melee",
                "ranged",
                "axe",
                "blunt",
                "longblade",
                "polearm",
                "shield",
                "heavy throwing weapon",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Arsenal of Power",
            "class": "Champion",
            "branch": "Type A Weapons",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "80 stamina",
            "range": "Weapon",
            "duration": "Instant",
            "description": [
                "You use every heavy weapon available to you to pound an enemy into submission. Swap weapons in both hands, then choose one of the following:",
                "<ul>",
                "<li>With an axe equipped, deal 8d10 physical damage to a target in range, inflicting half your damage dealt as Bleed for 1 minute</li>",
                "<li>With a blunt weapon equipped, deal 8d10 physical damage to a target in range, inflicting a condition that decreases the target's move speed by half your damage dealt for 1 minute</li>",
                "<li>With a longblade equipped, deal 8d10 physical damage to a target in range, inflicting physical vulnerability equal to half your damage dealt for 1 minute (append a \"%\" to the value)</li>",
                "<li>With a polearm equipped, deal 8d10 physical damage to a target in range, inflicting AC loss equal to half your damage dealt for 1 minute</li>",
                "<li>With a shield equipped, deal 8d10 physical damage to a target in range, gaining AC equal to half you damage dealt for 1 minute</li>",
                "<li>With a heavy throwing weapon equipped, deal 8d10 physical damage to a target in range, and this attack does not consume special ammunition (unless it is special ammunition granted by a class ability)</li>",
                "</ul>",
                "Then, you may concentrate on this ability. If you do, you may repeat it as a free action at no cost once per turn, choosing a new selection from the list above. Concentration ends when you exhaust the list."
            ],
            "tags": [
                "Attack",
                "physical",
                "single-target",
                "melee",
                "ranged",
                "axe",
                "blunt",
                "longblade",
                "polearm",
                "shield",
                "heavy throwing weapon",
                "conditional",
                "modal",
                "concentration",
                "condition",
                "Bleed",
                "Vulnerability"
            ]
        },
        {
            "type": "ability",
            "name": "Precision Strike",
            "class": "Champion",
            "branch": "Type B Weapons",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "15 stamina",
            "range": "Weapon",
            "duration": "Instant",
            "description": [
                "You carefully strike for a precise point to pass through an enemy's armor. Deal 5d8 physical damage to a target in range. This attack cannot miss, cannot be blocked, ignores AC, and ignores magical defenses. If this attack is made with a fine weapon or unarmed combat, you may dash up to 20 ft before or after the attack."
            ],
            "tags": [
                "Attack",
                "physical",
                "single-target",
                "melee",
                "ranged",
                "bow",
                "crossbow",
                "bullet",
                "fine weapon",
                "unarmed",
                "light throwing weapon",
                "conditional",
                "modal",
                "dash"
            ]
        },
        {
            "type": "ability",
            "name": "Fan The Hammer",
            "class": "Champion",
            "branch": "Type B Weapons",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "25 stamina",
            "range": "Weapon",
            "duration": "Instant",
            "description": [
                "You fire multiple attacks quickly at a single target. Deal 2d8 physical damage to a target in range, then repeat this for 3 more hits against the same target. This attack cannot be reacted to. If this attack is made with a crossbow or bullet weapon, this ability gains, \"On Hit: Push target 10 ft.\""
            ],
            "tags": [
                "Attack",
                "physical",
                "single-target",
                "melee",
                "ranged",
                "bow",
                "crossbow",
                "bullet",
                "fine weapon",
                "unarmed",
                "light throwing weapon",
                "multi-hit",
                "conditional",
                "forced movement"
            ]
        },
        {
            "type": "ability",
            "name": "Painful Blow",
            "class": "Champion",
            "branch": "Type B Weapons",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "35 stamina",
            "range": "Weapon",
            "duration": "Instant",
            "description": [
                "You attack an enemy's weak points, dealing immense pain. Deal 6d8 physical damage to a target in range and inflict them with a 2d8 Bleed. If this attack is made with a bow or light throwing weapon, inflict the target with 50% physical vulnerability as well."
            ],
            "tags": [
                "Attack",
                "physical",
                "single-target",
                "melee",
                "ranged",
                "bow",
                "crossbow",
                "bullet",
                "fine weapon",
                "unarmed",
                "light throwing weapon",
                "conditional",
                "Bleed",
                "Vulnerability",
                "condition"
            ]
        },
        {
            "type": "ability",
            "name": "Arsenal of Finesse",
            "class": "Champion",
            "branch": "Type B Weapons",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "80 stamina",
            "range": "Weapon",
            "duration": "Instant",
            "description": [
                "You attack quickly with all of your fast weapons. Swap weapons in both hands, then choose one of the following:",
                "<ul>",
                "<li>With a bow equipped, deal 7d10 physical damage to a target in range, inflicting evasion loss equal to half the damage dealt (append a \"%\" to the value)</li>",
                "<li>With a crossbow equipped, deal 7d10 physical damage to a target in range, pushing the target back a distance equal to half your damage dealt in feet</li>",
                "<li>With a bullet weapon equipped, deal 7d10 physical damage to a target in range; this attack has a chance of stunning equal to half your damage dealt as a percentage</li>",
                "<li>With a fine weapon equipped, deal 7d10 physical damage to a target in range, then dash up to half your damage dealt in any direction</li>",
                "<li>With unarmed combat, deal 7d10 physical damage to a target in range; this attack has a chance to combo equal to 10% of your damage dealt as a percentage</li>",
                "<li>With a light throwing weapon equipped, deal 7d10 physical damage to a target in range, and this attack does not consume special ammunition (unless it is special ammunition granted by a class ability)</li>",
                "</ul>",
                "Then, you may concentrate on this ability. If you do, you may repeat it as a free action at no cost once per turn, choosing a new selection from the list above. Concentration ends when you exhaust the list."
            ],
            "tags": [
                "Attack",
                "physical",
                "single-target",
                "melee",
                "ranged",
                "bow",
                "crossbow",
                "bullet",
                "fine weapon",
                "unarmed",
                "light throwing weapon",
                "conditional",
                "modal",
                "combo",
                "dash",
                "condition",
                "Stun",
                "forced movement",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Disarming Blow",
            "class": "Champion",
            "branch": "Type C Weapons",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "15 stamina",
            "range": "Weapon",
            "duration": "Instant",
            "description": [
                "You slam your weapon home while also disarming your opponent. Deal 5d6 physical damage to a target in range. That target is disarmed and you may choose to kick the dropped item 30 ft in any direction. If this attack is made with an improvised weapon, you may pick up whatever the target dropped instead and make an autoattack with it if it is a weapon."
            ],
            "tags": [
                "Attack",
                "physical",
                "single-target",
                "melee",
                "shortblade",
                "improvised weapon",
                "conditional",
                "modal",
                "disarm"
            ]
        },
        {
            "type": "ability",
            "name": "Throat Slitter",
            "class": "Champion",
            "branch": "Type C Weapons",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "25 stamina",
            "range": "Weapon",
            "duration": "Instant",
            "description": [
                "You aim for an enemy's weak points. Deal 6d6 physical damage to a target in range. This attack has your choice of either 15% critical strike chance or 150% critical damage modifier. If this attack is made with a shortblade, you may choose both."
            ],
            "tags": [
                "Attack",
                "physical",
                "single-target",
                "melee",
                "shortblade",
                "improvised weapon",
                "conditional",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Parry and Draw",
            "class": "Champion",
            "branch": "Type C Weapons",
            "tier": 3,
            "action": "1 Reaction",
            "cost": "30 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You ward off attacks as you switch weapons. As a reaction to an attack, block the attack fully with your currently equipped weapon or shield. Then, you may swap weapons in both hands."
            ],
            "tags": [
                "Block",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Weapon Juggling",
            "class": "Champion",
            "branch": "Type C Weapons",
            "tier": 4,
            "action": "1 Minor Action",
            "cost": "50 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You've mastered the art of swapping weapons seamlessly while attacking with them. Concentrate on this ability; while you do, the weapon swap action is a free action, and Master of Arms can trigger up to twice per turn instead of once per turn. If you would swap to a weapon which would trigger a \"draw weapon\" trigger, ignore the trigger while concentrating on this ability."
            ],
            "tags": [
                "Concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Fadeaway Slice",
            "class": "Daggerspell",
            "branch": "Finesse",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "15 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You slash at an enemy while retreating. Deal 4d4 physical damage to a target in range, then dash up 10 ft in any direction. If this attack was made with an empowered shortblade, dash up to 20 ft instead."
            ],
            "tags": [
                "Attack",
                "physical",
                "conditional",
                "melee",
                "single-target",
                "dash",
                "shortblade"
            ]
        },
        {
            "type": "ability",
            "name": "Rapid Jab",
            "class": "Daggerspell",
            "branch": "Finesse",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "25 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You stab repeatedly with your favored knife. Deal d4 physical damage to a target in range, repeating this attack twice more. If the initial hit was made with an empowered shortblade, the subsequent two hits are empowered in the same manner."
            ],
            "tags": [
                "Attack",
                "physical",
                "conditional",
                "melee",
                "single-target",
                "multi-target",
                "shortblade"
            ]
        },
        {
            "type": "ability",
            "name": "Shieldbreaker",
            "class": "Daggerspell",
            "branch": "Finesse",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "30 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You slash at magical weavings. Deal 6d4 physical damage to a target in range. This attack cannot be blocked by spells or magical effects and inflicts the target with -20% MR, non-stacking. If this attack was made with an empowered shortblade, inflict -40% MR instead."
            ],
            "tags": [
                "Attack",
                "physical",
                "melee",
                "shortblade",
                "single-target",
                "condition",
                "lose MR",
                "no block",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Calling Card",
            "class": "Daggerspell",
            "branch": "Acumen",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "15 mana",
            "range": "30 ft",
            "duration": "Instant",
            "description": [
                "You fire an opening salvo of magic before approaching. Deal 5d8 magic damage of a chosen type to a target in range, then dash up to 20 ft towards the target. This spell triggers your Ritual Dagger passive for twice as much empowerment damage."
            ],
            "tags": [
                "Spell",
                "destruction",
                "attack",
                "single-target",
                "dash"
            ]
        },
        {
            "type": "ability",
            "name": "Witchbolt",
            "class": "Daggerspell",
            "branch": "Acumen",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "30 mana",
            "range": "30 ft",
            "duration": "Instant",
            "description": [
                "You fire a repeating chain of spells. Deal 6d8 magic damage of a chosen type to a target in range, then concentrate on this spell. While you are concentrating on this spell, you may cast it as a major action for no mana cost (treat this as having spent 30 mana for the purposes of your Ritual Dagger passive)."
            ],
            "tags": [
                "Spell",
                "destruction",
                "attack",
                "single-target",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Exposing Tear",
            "class": "Daggerspell",
            "branch": "Acumen",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "40 mana",
            "range": "30 ft",
            "duration": "Instant",
            "description": [
                "You slash at an enemy with blades of mana. Deal 8d8 magic damage of a chosen type to a target in range and mark the target. A target marked this way grants attacks against the marked target +10% Critical Strike Chance, and additionally grants attacks with an empowered weapon +100% Critical Damage Modifier."
            ],
            "tags": [
                "Spell",
                "destruction",
                "attack",
                "single-target",
                "mark",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Hidden Blade",
            "class": "Daggerspell",
            "branch": "Guile",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "20 mana",
            "range": "Self",
            "duration": "1 minute",
            "description": [
                "You prepare yourself to engage with your knife. You gain +15% Critical Strike Chance, and your attacks with empowered shortblades grant you Hidden."
            ],
            "tags": [
                "Spell",
                "utility",
                "buff",
                "conditional",
                "Hidden"
            ]
        },
        {
            "type": "ability",
            "name": "Invisibility",
            "class": "Daggerspell",
            "branch": "Guile",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "40 mana",
            "range": "Touch",
            "duration": "Instant",
            "description": [
                "You mask your approach with concealing magic. Choose one:",
                "<ul>",
                "<li>Target in range becomes invisible for 1 minute.</li>",
                "<li>Target in range becomes invisible for 1 hour, which ends when the target casts a spell or makes an attack.</li>",
                "</ul>",
                "When you cast this spell, you may spend an additional 20 mana to recast it on a new target, and you may do this any number of times."
            ],
            "tags": [
                "Spell",
                "utility",
                "buff",
                "modal",
                "Hidden"
            ]
        },
        {
            "type": "ability",
            "name": "Rogue's Anlace",
            "class": "Daggerspell",
            "branch": "Guile",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "45 mana",
            "range": "Touch",
            "duration": "1 hour",
            "description": [
                "You enchant your dagger with a variety of utility effects. Enchant a target shortblade in range with the following effects: this weapon acts as a magical key, able to unlock mundanely locked doors and chests with ease; this weapon dowses for mundane traps and can disarm them with ease; this weapon warns of enemies within 30 ft, but doesn't provide any other info; when balanced by its hilt on a finger, this weapon falls in the direction of a safe exit path to a building or dungeon one is currently in."
            ],
            "tags": [
                "Spell",
                "destruction",
                "attack",
                "single-target",
                "dash"
            ]
        },
        {
            "type": "ability",
            "name": "Summon Bronze Dragon",
            "class": "Dragoncaller",
            "branch": "Descent",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "50 mana",
            "range": "40 ft",
            "duration": "1 minute",
            "description": [
                "You summon a juvenile bronze dragon, bringer of lightning. Summon a Bronze Dragon with 200 health, large size, 20 AC, 80% EV, 20% MR, 30% CR, and 80 ft flying Move Speed. The Dragon obeys your Commands; otherwise, it uses its Move Action to fly to positions above enemies, its Major Action to either swipe with its claws for 10d10 physical damage on a single target in melee range or use its breath attack for 10d12 lightning magic damage in a 200 ft line AOE, and its Minor Action to either buff all allies with +10 Move Speed and +10% Armor Penetration, stacking, or inflict all enemies with -10 Move Speed and +10% Physical Vulnerability, stacking. The Bronze Dragon is a superior predator and hunter; if supplied with a magical signature, it can hunt down any individual anywhere on a plane regardless of distance, unless they are magically hidden."
            ],
            "tags": [
                "Spell",
                "summoning",
                "minion",
                "physical",
                "lightning",
                "buff",
                "condition"
            ]
        },
        {
            "type": "ability",
            "name": "Bronze Dragon Breath",
            "class": "Dragoncaller",
            "branch": "Derivation",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "25 mana",
            "range": "200 ft",
            "duration": "Instant",
            "description": [
                "You release the swift death of a bronze dragon's breath attack. Deal 6d12 lightning magic damage to all enemies in a 200 ft line AOE. All Bronze Dragons you control then use their reactions to use their breath attacks in directions of your choosing."
            ],
            "tags": [
                "Spell",
                "attack",
                "destruction",
                "lightning",
                "AOE",
                "line",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Dragonfear",
            "class": "Dragoncaller",
            "branch": "Dignify",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "30 mana",
            "range": "Battlefield",
            "duration": "1 minute",
            "description": [
                "You invoke the terrifying aspect of the dragon. Inflict all enemies in the battlefield with Fear and a +20% Weaken. Increase the Weaken by an additional +20% for every Dragon you control."
            ],
            "tags": [
                "Spell",
                "control",
                "condition",
                "conditional",
                "Fear",
                "Weaken"
            ]
        },
        {
            "type": "ability",
            "name": "Golem Soldier",
            "class": "Golem Master",
            "branch": "Knighthood",
            "tier": 1,
            "action": "10 minutes",
            "cost": "20 lbs organic material, 10 lbs steel, 10 lbs copper , 2 crafting materials of at least Grade D",
            "range": "5 ft",
            "duration": "1 hour",
            "description": [
                "You develop a golem suited to warfare. Create a Golem Soldier with 100 Health, 50 Stamina, and 30 ft Move Speed. The Soldier obeys all your commands; otherwise, it acts according to its basic level of intelligence to fight with you in combat encounters. The Soldier can equip at most 1 piece of armor, 1 accessory, and 1 weapon. The Soldier can learn physical arts and abilities from other entities by spending 1 minute per ability concentrating with the teaching entity."
            ],
            "tags": [
                "alchemy",
                "golem",
                "minion"
            ]
        },
        {
            "type": "ability",
            "name": "Golem Sapper",
            "class": "Golem Master",
            "branch": "Knighthood",
            "tier": 2,
            "action": "10 minutes",
            "cost": "20 lbs organic material, 10 lbs steel, 10 lbs copper , 2 crafting materials of at least Grade D",
            "range": "5 ft",
            "duration": "2 hours",
            "description": [
                "You develop a golem suited to physical effort. Create a Golem Sapper with 50 Health, 100 Stamina, and 30 ft Move Speed. The Sapper obeys all your commands; otherwise, it acts according to its basic level of intelligence to fight with you in combat encounters. The Sapper can equip at most 1 piece of armor, 1 accessory, and 1 weapon. The Sapper is trained in physical skills, and can make any Armor, Athletics, Beast Mastery, Combat, Item Use, or Weapons skill check with a +25 bonus."
            ],
            "tags": [
                "alchemy",
                "golem",
                "minion"
            ]
        },
        {
            "type": "ability",
            "name": "Golem Mage",
            "class": "Golem Master",
            "branch": "Cadre",
            "tier": 1,
            "action": "10 minutes",
            "cost": "20 lbs organic material, 10 lbs steel, 10 lbs copper , 2 crafting materials of at least Grade D",
            "range": "5 ft",
            "duration": "1 hour",
            "description": [
                "You develop a golem suited to sorcery. Create a Golem Mage with 100 Health, 50 Mana, and 30 ft Move Speed. The Mage obeys all your commands; otherwise, it acts according to its basic level of intelligence to fight with you in combat encounters. The Mage can equip at most 1 piece of armor, 1 accessory, and 1 magic focus. The Mage can learn magical arts and abilities from other entities by spending 1 minute per ability concentrating with the teaching entity."
            ],
            "tags": [
                "alchemy",
                "golem",
                "minion"
            ]
        },
        {
            "type": "ability",
            "name": "Golem Scholar",
            "class": "Golem Master",
            "branch": "Cadre",
            "tier": 2,
            "action": "10 minutes",
            "cost": "20 lbs organic material, 10 lbs steel, 10 lbs copper , 2 crafting materials of at least Grade D",
            "range": "5 ft",
            "duration": "2 hours",
            "description": [
                "You develop a golem suited to magical knowledge. Create a Golem Scholar with 50 Health, 100 Mana, and 30 ft Move Speed. The Scholar obeys all your commands; otherwise, it acts according to its basic level of intelligence to fight with you in combat encounters. The Scholar can equip at most 1 piece of armor, 1 accessory, and 1 magic focus. The Scholar is trained in studious skills and can make any Alchemy, Artistry, Elements, Knowledge, Magic, or Psionics skill check with a +25 bonus."
            ],
            "tags": [
                "alchemy",
                "golem",
                "minion"
            ]
        },
        {
            "type": "ability",
            "name": "Temporary Shutdown",
            "class": "Golem Master",
            "branch": "Retrain",
            "tier": 1,
            "action": "1 Minor Action",
            "cost": "---",
            "range": "100 ft",
            "duration": "Instant",
            "description": [
                "You disable a golem to save up its life span. Target golem in range returns to your inventory, retaining its current Duration, Health, Stamina, Mana, and any equipment or abilities it has."
            ],
            "tags": [
                "alchemy",
                "constructs",
                "organics"
            ]
        },
        {
            "type": "ability",
            "name": "Recycle",
            "class": "Golem Master",
            "branch": "Retrain",
            "tier": 2,
            "action": "1 Minor Action",
            "cost": "---",
            "range": "100 ft",
            "duration": "Instant",
            "description": [
                "You store away a dead golem's brain for later use. Target golem corpse in range is broken down, and its brain is added to your inventory. The brain can be used in crafting any golem to impart the owner's knowledge, skills, and abilities to the newly crafted golem."
            ],
            "tags": [
                "alchemy",
                "constructs",
                "organics"
            ]
        },
        {
            "type": "ability",
            "name": "Wild Swing",
            "class": "Juggernaut",
            "branch": "Butchery",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "30 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You swing at an enemy and steal their ardor. Deal 5d10 physical damage to a target in range, and lifesteal for 30% of the damage dealt, increasing to 60% instead if your health is below 30%."
            ],
            "tags": [
                "Attack",
                "melee",
                "physical",
                "single-target",
                "blunt weapon",
                "axe",
                "on hit",
                "lifesteal",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Violent Riot",
            "class": "Juggernaut",
            "branch": "Butchery",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "40 stamina",
            "range": "20 ft",
            "duration": "Instant",
            "description": [
                "You hit multiple enemies to steal their health. Deal 6d10 physical damage to any number of targets in range. Heal 10 health for every enemy who takes damage from this ability."
            ],
            "tags": [
                "Attack",
                "melee",
                "physical",
                "multi-target",
                "blunt weapon",
                "axe",
                "heal",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Draining Blow",
            "class": "Juggernaut",
            "branch": "Butchery",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "50 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You focus on a single enemy to constantly drain their health. Deal 7d10 physical damage to a target in range, healing for the amount of damage rolled. Then you may begin concentrating on this ability. For as long as you maintain concentration, you may repeat this ability at half its cost as long as you continue attacking the same target."
            ],
            "tags": [
                "Attack",
                "melee",
                "physical",
                "single-target",
                "blunt weapon",
                "axes",
                "heal",
                "concentration",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "All Out Attack",
            "class": "Juggernaut",
            "branch": "Butchery",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "60 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You convert missing health into pure power. Deal X physical damage to a target in range, where X is your missing health. Until your next long rest, your current health becomes your new maximum health. If your maximum health is reduced by this effect, you are immune to other effects that reduce your maximum health (except casting this ability again)."
            ],
            "tags": [
                "Attack",
                "melee",
                "physical",
                "single-target",
                "blunt weapon",
                "axes"
            ]
        },
        {
            "type": "ability",
            "name": "Hypertension",
            "class": "Juggernaut",
            "branch": "Bloodshed",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "20 stamina",
            "range": "Self",
            "duration": "1 minute",
            "description": [
                "You increase your blood pressure and maximize your heartiness. Increase your maximum health by 100%; your current health changes by the same ratio. When this buff ends, your current health reverts using the same ratio."
            ],
            "tags": [
                "Buff",
                "health increase",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Blood Boil",
            "class": "Juggernaut",
            "branch": "Bloodshed",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "30 stamina",
            "range": "30 ft",
            "duration": "1 minute",
            "description": [
                "You stand at the front lines and dare enemies to come close. All enemies in range are Taunted for the duration. For every enemy Taunted this way, heal for 10% of your maximum health at the beginning of each of your turns for the duration."
            ],
            "tags": [
                "Buff",
                "heal",
                "condition",
                "Taunt",
                "multi-target"
            ]
        },
        {
            "type": "ability",
            "name": "Purge",
            "class": "Juggernaut",
            "branch": "Bloodshed",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "35 stamina",
            "range": "Self",
            "duration": "1 minute",
            "description": [
                "You shed off some health or stamina to shrug off conditions. Cleanse yourself of a condition of your choice; if you spend health for this ability, cleanse 2 conditions instead. Then gain a percentage general CR equal to your percentage missing health for the duration."
            ],
            "tags": [
                "Cleanse",
                "conditional",
                "gain CR",
                "buff",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Critical Condition",
            "class": "Juggernaut",
            "branch": "Bloodshed",
            "tier": 4,
            "action": "Free Reaction",
            "cost": "100 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You make a final stand before falling. If you would take damage or would pay Health that would deplete your Health to 0, your Health becomes 1 instead. Until the end of your next turn, you gain 100% increased physical damage, 100% Accuracy, 100% Armor Penetration, and your attacks cannot be blocked. At the end of your next turn your health drops to 0 and you become Downed with 70 Downed Health."
            ],
            "tags": [
                "---"
            ]
        },
        {
            "type": "ability",
            "name": "Hostility",
            "class": "Juggernaut",
            "branch": "Gore",
            "tier": 1,
            "action": "1 Minor Action",
            "cost": "15 health",
            "range": "Self",
            "duration": "1 minute",
            "description": [
                "You fuel your attacks with health draining power. Your weapon attacks gain, \"On Hit: 15% Lifesteal\" for the duration. If you choose to concentrate on this ability when you cast it, instead your weapon attacks gain, \"On Hit: 25% Lifesteal\"."
            ],
            "tags": [
                "Buff",
                "modal",
                "concentration",
                "on hit",
                "lifesteal"
            ]
        },
        {
            "type": "ability",
            "name": "Blood For Power",
            "class": "Juggernaut",
            "branch": "Gore",
            "tier": 2,
            "action": "1 Minor Action",
            "cost": "40 health",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You exchange health for stamina or mana. Choose one:",
                "<ul>",
                "<li>Recover 6d10 stamina</li>",
                "<li>Recover 6d10 mana</li>",
                "<li>Recover 3d10 stamina and 3d10 mana</li>",
                "</ul>"
            ],
            "tags": [
                "Recover mana",
                "recover stamina"
            ]
        },
        {
            "type": "ability",
            "name": "Tachycardia",
            "class": "Juggernaut",
            "branch": "Gore",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "50 health",
            "range": "Melee",
            "duration": "1 minute",
            "description": [
                "You increase your heart rate and natural speed and power. Gain +30 Move Speed, +5 reach on melee weapons, and +50% Armor Penetration for the duration. Additionally, if you are under 30% health while this buff is active, you have 100% increased physical damage."
            ],
            "tags": [
                "Buff",
                "concentration",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Blood For Vigor",
            "class": "Juggernaut",
            "branch": "Gore",
            "tier": 4,
            "action": "Free Action",
            "cost": "100 health",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You exchange health for actions. Gain a Major Action this turn. You cannot cast this ability more than once per turn. This ability cannot be reacted to or prevented. Nothing can reduce or prevent the loss of life caused by paying for this ability's cost."
            ],
            "tags": [
                "---"
            ]
        },
        {
            "type": "ability",
            "name": "Glass Shot",
            "class": "Mirror Mage",
            "branch": "Ray",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "20 mana",
            "range": "60 ft",
            "duration": "Instant",
            "description": [
                "You fire a bolt of mana that vacillates between light and ice. Deal 7d8 magic damage to a target in range; if this attack travels over an odd number of spaces, its magic damage type is ice and it inflicts Slow; if this attack travels over an even number of spaces its magic damage type is light and it inflicts -10% EV."
            ],
            "tags": [
                "Spell",
                "attack",
                "single-target",
                "destruction",
                "ice",
                "light",
                "conditional",
                "condition",
                "Slow",
                "lose EV"
            ]
        },
        {
            "type": "ability",
            "name": "Plane Mirror",
            "class": "Mirror Mage",
            "branch": "Refraction",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "20 mana",
            "range": "70 ft",
            "duration": "1 minute",
            "description": [
                "You create a mirror of ice and light. Create a Plane Mirror in an empty space in range for the duration, choosing its orientation to be either orthogonal or diagonal direction; it is immune to damage and conditions, cannot be forcibly moved or teleported, but can be dispelled. The Mirror reflects what it sees, providing an additional line of sight for you and allies alone; it acts as an opaque barrier otherwise. When you hit the mirror with a line AOE or straight moving single-target projectile spell, it redirects the attack based on the angle, resetting the attack's range and granting the attack +20% Accuracy. If the mirror is hit by a spell that has been redirected this way twice already, it is dispelled."
            ],
            "tags": [
                "Spell",
                "ice",
                "light",
                "defensive",
                "conjuration",
                "utility",
                "conditional",
                "modal",
                "totem"
            ]
        },
        {
            "type": "ability",
            "name": "Reflective Barrier",
            "class": "Mirror Mage",
            "branch": "Reflection",
            "tier": 1,
            "action": "1 Reaction",
            "cost": "20 mana",
            "range": "30 ft",
            "duration": "10 seconds",
            "description": [
                "You protect an area with a mirror. As a reaction to a targeted projectile attack or line AOE attack that would hit you or an ally, create a 15 ft long barrier in empty spaces within range that lasts for the duration. This barrier redirects projectile attacks and line AOEs back at the attacker and also acts as an opaque barrier that blocks line of sight until the end of the turn."
            ],
            "tags": [
                "Spell",
                "defensive",
                "conjuration",
                "ice",
                "light",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Basic Voltron Chassis",
            "class": "Modifier",
            "branch": "Generate",
            "tier": 1,
            "action": "10 minutes",
            "cost": "10 lbs of steel, 10 lb of copper",
            "range": "5 ft",
            "duration": "Endless",
            "description": [
                "You build a basic chassis for a construct designed to operate forever. Create a Voltron construct with 30 HP and 30 ft Move Speed. This construct can be deployed as a free action and returned to your inventory as a free action. The Voltron obeys your Commands; otherwise, it uses its Move Action to approach enemies and its Major Action to attack an enemy in melee range for 2d10 physical damage. Outside of combat, you may use augmentation alchemy abilities on the construct even if it is not deployed; if you do, the augmentation has its duration extended to match the Voltron's duration. If the Voltron would die, it is instead returned to your inventory, losing 2 augmentations in the process."
            ],
            "tags": [
                "alchemy",
                "constructs",
                "minion",
                "physical",
                "melee"
            ]
        },
        {
            "type": "ability",
            "name": "Modular Weapons and Armor Set",
            "class": "Modifier",
            "branch": "Attachment",
            "tier": 1,
            "action": "1 minute",
            "cost": "2 crafting materials of at least grade D",
            "range": "5 ft",
            "duration": "1 minute",
            "description": [
                "You arm your construct with powerful weapons and new physical arts. Target construct in range gains one of the following as a Major Action of your choice:",
                "<ul>",
                "<li>Attack an enemy in melee range for 5d10 physical damage</li>",
                "<li>Attack all enemies in melee range for 3d10 physical damage</li>",
                "<li>Attack an enemy within 60 ft for 4d10 physical damage</li>",
                "</ul>",
                "<br>",
                "That same target also gains one of the following, of your choice:",
                "<ul>",
                "<li>+50 AC, +30% MR</li>",
                "<li>+50% EV, +30 AC</li>",
                "<li>+50% MR, +30% EV</li>",
                "</ul>"
            ],
            "tags": [
                "alchemy",
                "augmentation",
                "modal",
                "increase AC",
                "increase MR",
                "increase EV"
            ]
        },
        {
            "type": "ability",
            "name": "Voltron Heart",
            "class": "Modifier",
            "branch": "Extension",
            "tier": 1,
            "action": "1 minute",
            "cost": "1 crafting material of at least grade D",
            "range": "5 ft",
            "duration": "1 minute",
            "description": [
                "You provide a construct with greatly increased life. Target construct gains 200% increased Health, 100% Health Regeneration, and cannot have its maximum Health decreased for any reason while this augmentation is active."
            ],
            "tags": [
                "alchemy",
                "augmentation",
                "increase Health"
            ]
        },
        {
            "type": "ability",
            "name": "Soul Rend",
            "class": "Reaper",
            "branch": "Decapitate",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "20 mana",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You swing your magically enchanted scythe to damage an enemy's soul directly. Deal 5d10 physical damage to a target in range, then choose one:",
                "<ul>",
                "<li>This attack ignores all AC and cannot be blocked.</li>",
                "<li>This attack has 20% lifesteal</li>",
                "</ul>"
            ],
            "tags": [
                "Attack",
                "melee",
                "single-target",
                "scythe",
                "AC penetration",
                "ignore Block",
                "modal",
                "heal"
            ]
        },
        {
            "type": "ability",
            "name": "Tornado of Souls",
            "class": "Reaper",
            "branch": "Decapitate",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "40 mana",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You spin your scythe in a wide arc, harvesting power as you take life. Deal 5d10 physical damage to all adjacent targets. If this ability kills a target, you may repeat this ability immediately at no cost."
            ],
            "tags": [
                "Attack",
                "melee",
                "multi-target",
                "scythe",
                "conditional",
                "repeatable"
            ]
        },
        {
            "type": "ability",
            "name": "Deathstroke",
            "class": "Reaper",
            "branch": "Decapitate",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "50 mana",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You absorb the life force of recently slain enemies and deliver a killing blow. Sacrifice any number of souls you've created with your Ferryman of the Dead passive. Deal 6d10 physical damage to a target in range, with 100% increased damage and 20% lethality for each soul sacrificed."
            ],
            "tags": [
                "Attack",
                "melee",
                "single-target",
                "scythe",
                "modal",
                "conditional",
                "sacrifice"
            ]
        },
        {
            "type": "ability",
            "name": "Inevitable End",
            "class": "Reaper",
            "branch": "Decapitate",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "60 mana",
            "range": "30 ft",
            "duration": "Instant",
            "description": [
                "You cut down flesh which has known your corruption. Deal 8d10 physical damage to all enemies in range. This attack has the following properties for each individual enemy targeted, based on how many different, unique conditions that enemy has suffered over the course of the current combat encounter that originated from you or your minions:",
                "<ul>",
                "<li>At least 2 conditions - The attack cannot be blocked or dodged</li>",
                "<li>At least 4 conditions - The attack penetrates all AC</li>",
                "<li>At least 6 conditions - The attack deals double damage and has 100% Lethality</li>",
                "</ul>"
            ],
            "tags": [
                "Attack",
                "melee",
                "multi-target",
                "scythe",
                "conditional",
                "Lethality",
                "no-block",
                "no-dodge",
                "ignore AC"
            ]
        },
        {
            "type": "ability",
            "name": "Call of the Void",
            "class": "Reaper",
            "branch": "Dread",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "25 mana",
            "range": "100 ft",
            "duration": "1 minute",
            "description": [
                "You afflict a target with deadly magic to prevent escape. Deal 4d10 dark magic damage to a target in range. They are afflicted with a condition for the duration that makes movement that isn't towards you count as moving over difficult terrain and prevents dashes or teleports that aren't towards you."
            ],
            "tags": [
                "Spell",
                "dark",
                "destruction",
                "damage",
                "condition",
                "conditional",
                "single-target"
            ]
        },
        {
            "type": "ability",
            "name": "Harvester of Life",
            "class": "Reaper",
            "branch": "Dread",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "50 mana",
            "range": "40 ft",
            "duration": "1 hour",
            "description": [
                "You create a spirit reaper to assist you in your work. Summon a Harvester in an empty space in range with 50 HP, 40 ft flying speed, and 100% evasion. It wields an ephemeral copy of the scythe you wield when you cast this spell. It obeys your Commands and telepathically communicates to you everything it sees or hears, but not across planes. It persists regardless of the distance from its summoner. It can freely travel through mundane walls but cannot pass through enchanted or hallowed barriers. The Harvester's kills with its scythe count towards your Ferryman of the Dead passive. Unless you give it commands otherwise, it automatically does the following on its turn: It uses its Move Action to move up to its speed towards an enemy it sees. It uses its Major Action to attack with its scythe. It uses its Minor Action to inflict a random target within 30 ft with Fear."
            ],
            "tags": [
                "Spell",
                "dark",
                "scythe",
                "summoning",
                "minion"
            ]
        },
        {
            "type": "ability",
            "name": "Drag To Hell",
            "class": "Reaper",
            "branch": "Dread",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "70 mana",
            "range": "100 ft",
            "duration": "1 minute",
            "description": [
                "You chain an enemy's soul to its ultimate fate. Deal 6d10 dark magic damage to a target in range. They are afflicted with a condition for the duration that pulls them 30 ft in a direction of your choice and deals 3d10 dark magic damage to them at the beginning of each of their turns. Additionally, while this condition persists, you may use your reaction to pull the afflicted target 20 ft in a direction of your choice."
            ],
            "tags": [
                "Spell",
                "dark",
                "destruction",
                "damage",
                "condition",
                "control",
                "single-target",
                "forced movement",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Enslaved Soul",
            "class": "Reaper",
            "branch": "Dread",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "X mana",
            "range": "100 ft",
            "duration": "1 minute",
            "description": [
                "You call upon one of many souls you've harvested. Select an entity whom you have killed at any point in the past. Unless blocked by divine intervention, you summon the soul of the selected entity assuming it is still intact, spending mana equal to the entity's Level. The Enslaved Soul has all of the same stats, abilities, and knowledge as it did in life. It is bound by your magic to assist you in combat and obey Command Actions that involve attacking enemies, defending allies, or being otherwise tactically relevant (including staying near you instead of trying to escape or staying quiet during stealthy operations). However, it knows you had a hand in ending its life, and may not be cooperative if you seek information. The Enslaved Soul remains with you for 1 minute or until its health reaches 0. You may choose to spend 1 minute to cast this spell as a minor ritual, extending the duration to 1 hour, or you may spend 10 minutes to cast this spell as a major ritual, extending the duration to 6 hours."
            ],
            "tags": [
                "Spell",
                "dark",
                "necromancy",
                "summoning",
                "control",
                "minor ritual",
                "major ritual"
            ]
        },
        {
            "type": "ability",
            "name": "The End Is Coming",
            "class": "Reaper",
            "branch": "Doomsday",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "30 mana",
            "range": "100 ft",
            "duration": "Endless",
            "description": [
                "You afflict an enemy with a curse that slowly kills. A target in range is afflicted with a condition that causes them to gain a Curse at the beginning of each of their turns (or every 10 seconds while out of combat)."
            ],
            "tags": [
                "Spell",
                "dark",
                "destruction",
                "condition",
                "Curse",
                "single-target"
            ]
        },
        {
            "type": "ability",
            "name": "Death Throes",
            "class": "Reaper",
            "branch": "Doomsday",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "45 mana",
            "range": "100 ft",
            "duration": "Endless",
            "description": [
                "You afflict an enemy with a curse that makes their efforts to avoid death helpless and pathetic. A target in range is afflicted with a condition that forces them to reroll all dice they roll, taking the lower of the two results each time. The sole exception is death saves, for which the target must reroll and take the higher result. Additionally, healing on the target is half as effective while they have this condition."
            ],
            "tags": [
                "Spell",
                "dark",
                "condition",
                "single-target"
            ]
        },
        {
            "type": "ability",
            "name": "Frailty of Man",
            "class": "Reaper",
            "branch": "Doomsday",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "80 mana",
            "range": "100 ft",
            "duration": "Endless",
            "description": [
                "You afflict an enemy with a curse that tears away their strength and leaves them frail. A target in range is stripped of all buffs and breaks all concentration. They are then afflicted with a condition that prevents them from gaining buffs, concentrating on abilities, benefiting from potions or fields, and using reactions and minor actions. This condition also afflicts the target with a 50% Weaken."
            ],
            "tags": [
                "Spell",
                "dark",
                "condition",
                "single-target",
                "Weaken",
                "buff strip",
                "concentration break"
            ]
        },
        {
            "type": "ability",
            "name": "Final Fate",
            "class": "Reaper",
            "branch": "Doomsday",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "100 mana",
            "range": "100 ft",
            "duration": "24 hours",
            "description": [
                "You sentence an enemy to death. A target in range becomes marked for the duration. While marked this way, the target will be vaguely aware of a sense of doom, which will rapidly become more prominent over time. They will also become unable to take life while marked this way, finding that their courage or calmness fails them. When the duration of the mark expires, the target will die, even if it is Lethality-immune. The mark can only be removed by a blessing with divine support, such as from a priest of Adol or a paladin of Nox."
            ],
            "tags": [
                "Spell",
                "dark",
                "control",
                "mark"
            ]
        },
        {
            "type": "ability",
            "name": "Cloak and Dagger",
            "class": "Thief",
            "branch": "Predator",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "20 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You stab at an enemy behind the veil of stealth or with the sudden violence of a mugging. Deal 5d4 physical damage to a target in range. If you are in Hit Stance, this attack has +100% critical damage modifier. If you are in Run Stance, this attack has +20% critical strike chance."
            ],
            "tags": [
                "Attack",
                "physical",
                "melee",
                "conditional",
                "stance",
                "single-target"
            ]
        },
        {
            "type": "ability",
            "name": "Blade in the Dark",
            "class": "Thief",
            "branch": "Predator",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "25 stamina",
            "range": "30 ft",
            "duration": "Instant",
            "description": [
                "You toss a knife from the shadows. Deal 5d4 physical damage to a target in range. If you entered Hit Stance this turn, you may dash to a space adjacent to your target after the attack, gaining 50% critical damage modifier until the end of your next turn. If you entered Run Stance this turn, this attack does not break your Hidden status, and you gain 10% critical strike chance until the end of your next turn."
            ],
            "tags": [
                "Attack",
                "physical",
                "ranged",
                "conditional",
                "stance",
                "Hidden",
                "buff",
                "modal",
                "single-target"
            ]
        },
        {
            "type": "ability",
            "name": "Frenetic Assault",
            "class": "Thief",
            "branch": "Predator",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "40 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You quickly stab with your dagger multiple times. Deal d4 physical damage to a target in range, repeated 3 times. If you are in Hit Stance, these hits have, \"On Hit: Target loses your choice of 10 AC, 10% evasion, or 10% MR.\" If you are in Run Stance, you may dash up to 10 ft before each hit, and you may choose new targets for each hit."
            ],
            "tags": [
                "Attack",
                "physical",
                "melee",
                "conditional",
                "stance",
                "dash",
                "single-target",
                "multi-target"
            ]
        },
        {
            "type": "ability",
            "name": "Unavoidable Casualties",
            "class": "Thief",
            "branch": "Predator",
            "tier": 4,
            "action": "1 Reaction",
            "cost": "80 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You cut down the unsuspecting person who just happens to be in your way. As a reaction to stealing from an enemy, moving out of melee range of an enemy, or being attacked by an enemy in range, deal 20d4 physical damage to that enemy. If you are in Hit Stance, this attack gains 5% Lethality for every damage die that rolls its maximum. If you are in Run Stance, gain 5 stamina for every damage die that rolls its maximum. You may not attack an enemy who was hit by this ability during your next turn."
            ],
            "tags": [
                "Attack",
                "physical",
                "melee",
                "conditional",
                "stance",
                "Lethality",
                "recover stamina"
            ]
        },
        {
            "type": "ability",
            "name": "Snatch and Grab",
            "class": "Thief",
            "branch": "Pilfer",
            "tier": 1,
            "action": "1 Minor Action",
            "cost": "15 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You reach into a distracted enemy's bag and grab the first thing you touch. Steal a random item or up to 100 gp from the inventory of a target in range. If you are in Hit Stance, steal twice from the target. If you fail to steal an item because the target's inventory is empty, you may make an auto attack against the target with an equipped dagger as a free action."
            ],
            "tags": [
                "Conditional",
                "random",
                "modal",
                "attack",
                "physical",
                "dagger",
                "stance"
            ]
        },
        {
            "type": "ability",
            "name": "Charm and Disarm",
            "class": "Thief",
            "branch": "Pilfer",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "40 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You distract an enemy and snatch the weapon right out of an enemy's hand, or loosen the clasps on their armor so it falls free. A target in range becomes Confused until the beginning of their next turn. Then steal a weapon or armor piece that is equipped to that target. If you are in Hit Stance and steal a weapon this way, you may make an autoattack with that weapon as a free action before stowing or discarding it. If you are in Hit Stance and steal a piece of armor this way, the target's Confusion lasts until the end of their next turn instead."
            ],
            "tags": [
                "Conditional",
                "stance",
                "modal",
                "attack",
                "condition",
                "Confuse"
            ]
        },
        {
            "type": "ability",
            "name": "Purloin Powers",
            "class": "Thief",
            "branch": "Pilfer",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "50 stamina",
            "range": "30 ft",
            "duration": "Instant",
            "description": [
                "Your deft stealing skills allow you to steal an enemy's magic effects. Choose one:",
                "<ul>",
                "<li>Strip all buffs from all enemy targets in range, then gain those buffs yourself, or distribute them as you choose amongst allies within 30 ft.</li>",
                "<li>If you are in Hit Stance, cast this ability as a reaction to a spell that is cast within range. Counter that spell, then you may copy and cast it yourself, choosing new targets and paying stamina instead of mana.</li>",
                "</ul>"
            ],
            "tags": [
                "Buff strip",
                "buff",
                "modal",
                "conditional",
                "stance",
                "counterspell"
            ]
        },
        {
            "type": "ability",
            "name": "Grand Thievery",
            "class": "Thief",
            "branch": "Pilfer",
            "tier": 4,
            "action": "1 Minor Action",
            "cost": "60 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You dash forward with the intent of stealing everything you can get your hands on. Dash up to 30 ft in any direction. Then, steal a random item or up to 100 gp from the inventory of a target in range. If you are in Hit Stance, steal twice instead. Then make a Steal check with a DC of 10 + X where X is 10 times the number of times you have stolen with this ability. If your Steal check succeeds, repeat this ability as a free action with no cost."
            ],
            "tags": [
                "Conditional",
                "random",
                "stance",
                "repeatable"
            ]
        },
        {
            "type": "ability",
            "name": "Infiltrate",
            "class": "Thief",
            "branch": "Prowl",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "20 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You move quickly and quietly past doors and guards. Dash up to 40 ft in any direction. During this dash, you automatically unlock doors and windows and pass through magical barriers without harm. If you are in Run Stance, you may cast this ability as a Minor Action instead."
            ],
            "tags": [
                "Dash",
                "conditional",
                "modal",
                "stance"
            ]
        },
        {
            "type": "ability",
            "name": "Dodge the Law",
            "class": "Thief",
            "branch": "Prowl",
            "tier": 2,
            "action": "1 Reaction",
            "cost": "30 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You evade an attempt at capture and escape the hands of your pursuers. Cleanse Cripple, Immobilize, Prone, and Slow. Break any grapple or bindings you are in and temporarily ignore any condition or spell that would prevent you from moving freely until the end of your next turn. Then dash up to 30 ft in any direction. If you are in Run Stance, you may instead dash up to 40 ft in any direction and become Hidden after your dash."
            ],
            "tags": [
                "Cleanse",
                "dash",
                "conditional",
                "stance",
                "Hidden"
            ]
        },
        {
            "type": "ability",
            "name": "Smokescreen",
            "class": "Thief",
            "branch": "Prowl",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "60 stamina",
            "range": "Self",
            "duration": "1 minute",
            "description": [
                "You drop a smoke bomb and disappear. Drop a 35 ft square of thick smoke that enemies cannot see through. You and your allies remain Hidden while in this smoke, and can see through it. This smoke suppresses the field effects of your enemies that overlap with it, and enemies inside the smoke have -50% evasion and -50% MR. This smoke can be blown away by a strong wind. If you are in Run Stance, you may cast this ability as a reaction; if you do, the smoke blocks AOE attacks and effects within its spaces until the beginning of your next turn."
            ],
            "tags": [
                "Hidden",
                "conditional",
                "stance",
                "modal",
                "block"
            ]
        },
        {
            "type": "ability",
            "name": "Phantom Thief",
            "class": "Thief",
            "branch": "Prowl",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "100 stamina",
            "range": "Self",
            "duration": "1 minute",
            "description": [
                "You embody the legend of the master thief that you are, a spirit of freedom. Gain a buff that grants +100% Evasion, +100% crowd control CR, 1 additional Minor Action per turn, and 1 additional reaction per round, for the duration. If you enter Run stance while this buff is active, gain an additional Major Action."
            ],
            "tags": [
                "Buff",
                "conditional",
                "stance",
                "gain actions",
                "gain evasion",
                "gain CR"
            ]
        },
        {
            "type": "ability",
            "name": "Abhorrent Chimera",
            "class": "Transfusionist",
            "branch": "Mutualism",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "2 different organics alchemy products",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You graft one organism onto another's body. Choose a target deployed host organism you've crafted that you can see in range, as well as a target graft organism in your inventory or one you can see in range. Target host replaces any of its stats with the graft's stats if any of the graft's current stats are higher than its own. The host also gains all abilities of the graft."
            ],
            "tags": [
                "alchemy",
                "organics",
                "augmentation",
                "minion"
            ]
        },
        {
            "type": "ability",
            "name": "Organ Donor",
            "class": "Transfusionist",
            "branch": "Mutualism",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "1 undeployed organics alchemy product with at least 50 health",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You fuse one organism into the body of another to extend its lifetime. Choose a target deployed host organism you've crafted that you can see in range or one in your inventory and a graft with the cost of this ability. The host gains 50% increased maximum health, heals to full health, and gains an additional 10 minutes of duration."
            ],
            "tags": [
                "alchemy",
                "organics",
                "augmentation",
                "minion",
                "stat improve"
            ]
        },
        {
            "type": "ability",
            "name": "Brain Worm",
            "class": "Transfusionist",
            "branch": "Mutualism",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "1 undeployed organics alchemy product with at least 30 mana",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You fuse one organism into the nervous system of another to experience its senses. Choose a target deployed host organism you've crafted that you can see in range and graft with the cost of this ability. For the duration of the host's lifetime, you can see and hear what it does as a free action, regardless of how far away it is. You can also provide Command Actions telepathically to the host."
            ],
            "tags": [
                "alchemy",
                "organics",
                "augmentation",
                "minion"
            ]
        },
        {
            "type": "ability",
            "name": "Perfect Fusion",
            "class": "Transfusionist",
            "branch": "Mutualism",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "4 undeployed organisms",
            "range": "Melee",
            "duration": "1 hour",
            "description": [
                "You use the life force of many organisms to temporarily power your own fusion into an organism. Choose a target deployed organism in range with at least 30 health. Your body, or the body of a humanoid ally, merges with its body. The new hybrid body has combined stats, abilities, knowledge, and inventory. The original organism's duration is ignored and becomes the duration of this ability. When the hybrid's health drops to 0, the original host dies and the humanoid remains with its stats at the time of casting this ability. The humanoid may also use a free major action to terminate the host early."
            ],
            "tags": [
                "alchemy",
                "organics",
                "augmentation",
                "minion"
            ]
        },
        {
            "type": "ability",
            "name": "Restoring Parasite",
            "class": "Transfusionist",
            "branch": "Parasitism",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "1 organics alchemy product",
            "range": "100 ft",
            "duration": "1 minute",
            "description": [
                "You release an altered, parasitic form of one of your creatures to assist another. You use an organism you can see in range or one in your inventory to do the following: target ally in range recovers health equal to the maximum health of the used organism; for the duration, that same ally may cast abilities originally owned by the organism used, except those abilities are affected by the ally's stats, buffs, and gear. This buff requires the target ally to use concentration."
            ],
            "tags": [
                "alchemy",
                "organics",
                "augmentation",
                "buff",
                "concentration",
                "minion"
            ]
        },
        {
            "type": "ability",
            "name": "Corrupting Parasite",
            "class": "Transfusionist",
            "branch": "Parasitism",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "1 organics alchemy product",
            "range": "100 ft",
            "duration": "1 minute",
            "description": [
                "You release an altered, parasitic form of one of your creatures to attack an enemy. You use an organism you can see in range or one in your inventory to do the following: target enemy in range takes physical damage equal to half the organism's current health and gains an X damage Bleed, where X is the organism's maximum health divided by 5 and rounded down."
            ],
            "tags": [
                "alchemy",
                "organics",
                "augmentation",
                "condition",
                "Bleed",
                "minion"
            ]
        },
        {
            "type": "ability",
            "name": "Enhancing Parasite",
            "class": "Transfusionist",
            "branch": "Parasitism",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "3 organics alchemy products with at least 30 health",
            "range": "100 ft",
            "duration": "1 minute",
            "description": [
                "You release an altered, parasitic form of one of your creatures to assist another to push past their limits. You use organisms you can see in range or those in your inventory to do the following: target ally rolls a d4 at the beginning of each of their turns and gains the following effects based on the result:",
                "<ul>",
                "<li>1: This buff immediately ends</li>",
                "<li>2: Gain an additional Minor Action</li>",
                "<li>3: Gain an additional Major and Minor Action</li>",
                "<li>4: Gain an additional Move, Major, and Minor Action</li>",
                "</ul>"
            ],
            "tags": [
                "alchemy",
                "organics",
                "augmentation",
                "minion",
                "buff",
                "gain actions"
            ]
        },
        {
            "type": "ability",
            "name": "Parasitic Plague",
            "class": "Transfusionist",
            "branch": "Parasitism",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "Any number of organisms with at least 30 health and 30 mana",
            "range": "200 ft",
            "duration": "Endless",
            "description": [
                "You convert your organisms into a mass of diseased parasites, ready to kill from the inside. Select a number of target enemies in range equal to the number of organisms you choose to pay for this ability's cost. Those enemies become Parasitized (checks against CR). While Parasitized, at the beginning of their turn, an enemy gains a stack of Plague and then rolls for a Lethal Blow, with Lethality equal to 10% times the number of Plague stacks it has. You may have the Parasitized condition remain dormant instead of immediately stacking, and you may activate the pathogen at any time. Dormant conditions cannot be cleansed."
            ],
            "tags": [
                "alchemy",
                "organics",
                "augmentation",
                "minion",
                "condition",
                "disease",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Augment Transfer",
            "class": "Transfusionist",
            "branch": "Experimentation",
            "tier": 1,
            "action": "1 Reaction",
            "cost": "---",
            "range": "100 ft",
            "duration": "Instant",
            "description": [
                "You move augmentations between organisms. When an organism you control that you can see dies in range, you use your reaction to move any number of augmentations or buffs it has to a target organism you control that you can see in range."
            ],
            "tags": [
                "alchemy",
                "organics",
                "augmentation",
                "minion",
                "buff"
            ]
        },
        {
            "type": "ability",
            "name": "Product Recall",
            "class": "Transfusionist",
            "branch": "Experimentation",
            "tier": 2,
            "action": "1 Minor Action",
            "cost": "---",
            "range": "100 ft",
            "duration": "Instant",
            "description": [
                "You recover any currently deployed grafts or parasites. Any target entities in range of your choice that are currently augmented by a graft or parasite organism you crafted lose the effects of those augmentations."
            ],
            "tags": [
                "alchemy",
                "organics",
                "augmentation",
                "minion",
                "cleanse"
            ]
        },
        {
            "type": "ability",
            "name": "Swap Parts",
            "class": "Transfusionist",
            "branch": "Experimentation",
            "tier": 3,
            "action": "1 Minor Action",
            "cost": "---",
            "range": "100 ft",
            "duration": "Instant",
            "description": [
                "You swap out grafts already deployed. A target organism with a graft in range loses its graft and all grafted abilities. Then you may immediately cast an augmentation alchemy ability that targets that same organism, paying that ability's costs but ignoring that ability's range and cast time."
            ],
            "tags": [
                "alchemy",
                "organics",
                "augmentation",
                "minion",
                "cleanse",
                "buff"
            ]
        },
        {
            "type": "ability",
            "name": "Adrenaline Rush",
            "class": "Transfusionist",
            "branch": "Experimentation",
            "tier": 4,
            "action": "1 Minor Action",
            "cost": "---",
            "range": "100 ft",
            "duration": "Instant",
            "description": [
                "You overcharge the effects of an organic augmentation. Choose a target in range that is affected by an organism you grafted or parasitized onto them. Double the effectiveness of any persisting effects on that target, and cut the duration of the effect by half, rounded down. If the target is a deployed organism, cut its duration in half as well, rounded down."
            ],
            "tags": [
                "alchemy",
                "organics",
                "augmentation",
                "minion"
            ]
        },
        {
            "type": "ability",
            "name": "Quicksilver Dagger",
            "class": "Warper",
            "branch": "Stabbing",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "20 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You slip your knife into the back of a weakened foe. Deal 5d4 + Xd4 physical damage to a target in range, where X is the number of crowd control conditions that target has."
            ],
            "tags": [
                "Attack",
                "physical",
                "conditional",
                "melee"
            ]
        },
        {
            "type": "ability",
            "name": "Sever Tendons",
            "class": "Warper",
            "branch": "Stabbing",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "30 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You slice low at the muscles of the leg in order to escape or prevent escape. Deal 6d4 physical damage to a target in range and inflict Crippled. You may then choose to dash 20 ft in any direction."
            ],
            "tags": [
                "Attack",
                "physical",
                "melee",
                "crowd control",
                "Cripple",
                "modal",
                "dash"
            ]
        },
        {
            "type": "ability",
            "name": "Hunter's Knife",
            "class": "Warper",
            "branch": "Stabbing",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "40 stamina",
            "range": "25 ft",
            "duration": "1 minute",
            "description": [
                "You throw your equipped dagger at your prey. Deal 6d4 physical damage to a target in range and mark them, then select one of the following effects:",
                "<ul>",
                "<li>The marked target loses 20% of its Condition Resist.</li>",
                "<li>Your teleports to spaces next to the marked target cost half mana.</li>",
                "</ul>"
            ],
            "tags": [
                "Attack",
                "physical",
                "ranged",
                "stat loss",
                "Condition Resist",
                "cost reduction",
                "mark",
                "modal",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "From Nowhere",
            "class": "Warper",
            "branch": "Stabbing",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "60 stamina",
            "range": "Self",
            "duration": "1 minute",
            "description": [
                "You become a spectre of sudden death. For 1 minute, you gain the following effects: When you teleport, you may cast an attack ability as a free action; Your attacks that deal more than 10% of an enemy's maximum health refresh the duration of their crowd control conditions; When you kill an enemy, you gain a special free reaction, allowing you to cast any teleport spell immediately without paying its costs."
            ],
            "tags": [
                "Buff",
                "concentration",
                "conditional",
                "modal",
                "teleport"
            ]
        },
        {
            "type": "ability",
            "name": "Controlled Blink",
            "class": "Warper",
            "branch": "Translocations",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "20 mana",
            "range": "60 ft",
            "duration": "Instant",
            "description": [
                "You teleport towards your prey. Teleport to a target empty space within range that you can see. You may cast this ability as a reaction to an enemy gaining a crowd control condition, but if you do, the target space you teleport to must be adjacent to that enemy."
            ],
            "tags": [
                "Spell",
                "conjuration",
                "teleport",
                "conditional",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Dispersal",
            "class": "Warper",
            "branch": "Translocations",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "40 mana",
            "range": "100 ft",
            "duration": "Instant",
            "description": [
                "You and your allies teleport randomly to escape. You and up to 4 target allies within range that you can see teleport 1000 ft in a random direction (corrected slightly to avoid barriers). You may target additional allies when you cast this ability, at a cost of an additional 5 mana per additional target."
            ],
            "tags": [
                "Spell",
                "conjuration",
                "multi-target",
                "teleport",
                "random",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Teleport Other",
            "class": "Warper",
            "branch": "Translocations",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "60 mana",
            "range": "200 ft",
            "duration": "Instant",
            "description": [
                "You forcibly teleport someone else to a new location. Fire a bolt of dispersed energy at a target within range (checks against Evasion) and teleport them to any empty location up to a distance of 400 ft (checks against Condition Resist). If the target is willing to be teleported, this spell costs half mana."
            ],
            "tags": [
                "Spell",
                "conjuration",
                "single-target",
                "teleport",
                "conditional",
                "forced movement"
            ]
        },
        {
            "type": "ability",
            "name": "Malign Gateway",
            "class": "Warper",
            "branch": "Translocations",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "80 mana",
            "range": "1000 ft",
            "duration": "1 hour",
            "description": [
                "You create a temporary portal for you and your allies, guarded by magical lashing tentacles. Create 2 linked portals: one in an adjacent empty space and one in an empty space you can see in range. When you or an ally enters a portal's space, they are teleported to an empty space of their choice adjacent to the other linked portal. Enemies cannot enter spaces with portals, and enemies who begin or end their turn in a space adjacent to a portal take 5d10 physical damage.",
                "<br>",
                "Instead of casting this ability as a Major Action, you may instead choose to spend 10 minutes casting this spell as a minor ritual and expend an additional 40 mana. If you do, the duration of this ability is extended to 12 hours, and you may wait to place the second portal as a Major Action at any time during the ability's duration."
            ],
            "tags": [
                "Spell",
                "conjuration",
                "teleport",
                "modal",
                "physical",
                "ritual"
            ]
        },
        {
            "type": "ability",
            "name": "Stunbolt",
            "class": "Warper",
            "branch": "Hexes",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "20 mana",
            "range": "60 ft",
            "duration": "Instant",
            "description": [
                "You fire a pulse of mana to rattle an enemy's senses. A target entity within range becomes Stunned until the beginning of their next turn."
            ],
            "tags": [
                "Spell",
                "control",
                "Stun",
                "crowd control"
            ]
        },
        {
            "type": "ability",
            "name": "Ensorcelled Hibernation",
            "class": "Warper",
            "branch": "Hexes",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "40 mana",
            "range": "40 ft",
            "duration": "1 minute",
            "description": [
                "You put large crowds to sleep. All entities in a 20 ft cube, centered on a point in range, fall Asleep for the duration. Any entity that resists this Sleep becomes Stunned instead."
            ],
            "tags": [
                "Spell",
                "control",
                "Sleep",
                "Stun",
                "crowd control",
                "AOE",
                "cube"
            ]
        },
        {
            "type": "ability",
            "name": "Dazzling Spray",
            "class": "Warper",
            "branch": "Hexes",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "60 mana",
            "range": "60 ft",
            "duration": "1 minute",
            "description": [
                "You fire magical bolts designed to disorient. All entities in a 60 ft cone in front of you become Confused. You are considered Hidden from any entities Confused in this way."
            ],
            "tags": [
                "Spell",
                "control",
                "AOE",
                "cone",
                "Confuse",
                "Hidden"
            ]
        },
        {
            "type": "ability",
            "name": "Fulminant Prism",
            "class": "Warper",
            "branch": "Hexes",
            "tier": 4,
            "action": "1 Major Action",
            "cost": "80 mana",
            "range": "100 ft",
            "duration": "1 minute",
            "description": [
                "You capture an enemy in a magical prison. A target entity within range becomes captured by your magic and has their current position locked. While captured in this way, they cannot move, dash, teleport, planeswalk, or be displaced by any means. For the duration of this ability, teleport spells you cast can have their target destination be an empty space adjacent to the captured target instead."
            ],
            "tags": [
                "Spell",
                "control",
                "single-target",
                "conjuration",
                "condition",
                "Immobilize"
            ]
        },
        {
            "type": "ability",
            "name": "Demonbane Blast",
            "class": "Demon Hunter",
            "branch": "Slayer",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "30 stamina",
            "range": "60 ft",
            "duration": "Instant",
            "description": [
                "You fire projectiles primed with a blessing to exploit a demon's magical circuit and otherworldly energy. Deal 10d8 physical damage to a target in range; that target then loses 10% of their mana and stamina and loses health equal to the amount of mana and stamina they lost (or would lose if they do not have the stamina or mana to lose). If this attack is made against an entity of demonic origin, it deals double damage and the target loses twice as much health after their mana and stamina loss. You may cast this ability as a free action if you expend 2 Hunter stacks; if you do, this attack ignores AC, cannot be blocked, and bypasses magical barriers."
            ],
            "tags": [
                "Attack",
                "physical",
                "single-target",
                "bow",
                "crossbow",
                "firearm",
                "no block",
                "conditional",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Consecrated Carnage",
            "class": "Demon Hunter",
            "branch": "Slayer",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "40 stamina",
            "range": "30 ft",
            "duration": "Instant",
            "description": [
                "You dive into danger and fire wildly in a circle, forcing hordes of demons back and to their knees. Dash up to 40 ft in any direction, then deal 8d8 physical damage to all targets in range, pushing them back until they are outside the range, then inflicting Crippled and a 30% Weaken. This attack has 20% increased damage for every enemy within range. Each enemy of demonic origin adds 40% increased damage instead, and is inflicted with a 50% Weaken instead. You may cast this ability as a free action if you expend 2 Hunter stacks; if you do, this attack ignores AC, cannot be blocked, and bypasses magical barriers."
            ],
            "tags": [
                "Attack",
                "physical",
                "multi-target",
                "condition",
                "Cripple",
                "Weaken",
                "conditional",
                "modal",
                "no-block",
                "bow",
                "crossbow",
                "firearm"
            ]
        },
        {
            "type": "ability",
            "name": "Sanctifying Skewer",
            "class": "Demon Hunter",
            "branch": "Slayer",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "60 stamina",
            "range": "30 ft",
            "duration": "Instant",
            "description": [
                "You fire penetrating bullets into ranks of demons. Deal 12d8 physical damage to all enemies in a 30 ft line. For every entity of demonic origin this attack targets, its range is increased by 10 ft, and its damage increases by 50%. Enemies damaged by this ability are afflicted with a 20% Light and Lightning Vulnerability, increased to 40% for entities of demonic origin. You may cast this ability as a free action if you expend 2 Hunter stacks; if you do, this attack ignores AC, cannot be blocked, and bypasses magical barriers."
            ],
            "tags": [
                "Attack",
                "physical",
                "multi-target",
                "condition",
                "Vulnerability",
                "conditional",
                "modal",
                "no-block",
                "bow",
                "crossbow",
                "firearm"
            ]
        },
        {
            "type": "ability",
            "name": "Banishing Bolt",
            "class": "Demon Hunter",
            "branch": "Exorcism",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "40 mana",
            "range": "60 ft",
            "duration": "Instant",
            "description": [
                "You fire a bolt of magical energy that tears away a demon's hold on the physical realm. Deal 6d8 lightning magic damage and 5d10 light magic damage to all enemies in a 35 ft square, centered on a space in range; this attack deals double damage and has 30% Lethality against entities of demonic origin. Allies, including yourself, that are caught in the blast will gain the lightning damage rolled as on-hit damage for their next attack and heal for the light damage rolled. This attack leaves behind a field of banishment; within this field, attacks against entities of demonic origin have 30% Lethality and all enemies have -20% MR and CR. The field lasts for 1 minute, but you may expend it as a free action, cleansing 1 condition on every ally, including yourself, that was within the field. You may cast this ability as a free action if you expend 2 Hunter stacks; if you do, this attack ignores MR, cannot be blocked, and bypasses magical barriers."
            ],
            "tags": [
                "Spell",
                "light",
                "lightning",
                "attack",
                "heal",
                "on-hit",
                "cleanse",
                "decrease MR",
                "decrease CR",
                "field",
                "Lethality",
                "destruction",
                "restoration",
                "conditional",
                "modal",
                "no block",
                "empower"
            ]
        },
        {
            "type": "ability",
            "name": "Lifesteal Elegy",
            "class": "Demon Hunter",
            "branch": "Exorcism",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "50 mana",
            "range": "30 ft",
            "duration": "Instant",
            "description": [
                "You fire waves of magical energy to sap strength from demons. Choose one:",
                "<ul>",
                "<li>Deal 10d8 lightning magic damage to all enemies in range. Your next attack is empowered to deal additional light magic damage equal to half the damage dealt by this spell. If this attack hits at least 5 enemies, it also inflicts 2 stacks of Paralysis.</li>",
                "<li>Deal 9d10 light magic damage to all enemies in range. Heal for half the damage dealt. If this attack hits at least 5 enemies, it also cleanses 3 conditions on any targets within range of your choosing.</li>",
                "</ul>",
                "Entities of demonic origin take double damage from this spell and count as 3 enemies each. You may cast this ability as a free action if you expend 2 Hunter stacks; if you do, this attack ignores MR, cannot be blocked, and bypasses magical barriers."
            ],
            "tags": [
                "Spell",
                "light",
                "lightning",
                "attack",
                "AOE",
                "square",
                "heal",
                "condition",
                "Paralysis",
                "destruction",
                "restoration",
                "cleanse",
                "conditional",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Soul Searing Light",
            "class": "Demon Hunter",
            "branch": "Exorcism",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "50 mana",
            "range": "30 ft",
            "duration": "Instant",
            "description": [
                "You burn away demonic ichor with your light. Target in range is afflicted with a condition with the following effects: they take 4d8 light magic damage and 4d8 lightning magic damage at the beginning of each of their turns, which is doubled for entities of demonic origin; they are afflicted with a 20% physical damage vulnerability, increased to 40% for entities of demonic origin. You may cast this ability as a free action if you expend 2 Hunter stacks; if you do, this attack cannot be blocked and bypasses magical barriers."
            ],
            "tags": [
                "Spell",
                "light",
                "lightning",
                "attack",
                "condition",
                "Vulnerability",
                "modal",
                "conditional",
                "no-block"
            ]
        },
        {
            "type": "ability",
            "name": "Hunter's Guile",
            "class": "Demon Hunter",
            "branch": "Humanity",
            "tier": 1,
            "action": "1 Reaction",
            "cost": "30 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You work tirelessly to defend others. As a reaction to an attack on you or an ally, dash up to 30 ft in any direction, blocking all incoming damage and effects in the spaces you travel through (including your original position and your destination) until the end of the turn. If this ability is used to block an attack from an entity of demonic origin, it redirects attacks with doubled damage back at the attacker instead of blocking. After casting this ability, your next attack gains 20% increased damage, which can stack up to 5 times. When you cast this ability, you may expend 1 Hunter stack; if you do, extend the range of the dash to 50 ft."
            ],
            "tags": [
                "Dash",
                "AOE block",
                "conditional",
                "modal",
                "redirect",
                "empower"
            ]
        },
        {
            "type": "ability",
            "name": "Essence Scatter",
            "class": "Demon Hunter",
            "branch": "Humanity",
            "tier": 2,
            "action": "1 Reaction",
            "cost": "40 mana",
            "range": "100 ft",
            "duration": "Instant",
            "description": [
                "You counter a demonic spell. As a reaction to a target in range casting a spell, you may counter that spell and mark that target until the end of your next turn. A target marked this way takes 50% increased damage from your damaging spells and has -20% CR against your condition-inflicting spells. If this spell is used to counter a spell that would summon a demon, your reaction refreshes. If this spell is used to counter a spell cast by an entity of demonic origin, you are refunded half this spell's mana cost."
            ],
            "tags": [
                "Spell",
                "light",
                "lightning",
                "counterspell",
                "defensive",
                "mark",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Hunter's Instinct",
            "class": "Demon Hunter",
            "branch": "Humanity",
            "tier": 3,
            "action": "1 Minor Action",
            "cost": "50 mana",
            "range": "1 mile",
            "duration": "Instant",
            "description": [
                "You rely on your finely honed senses to track down demons. You gain information about the position, levels, affinities, and numbers of groups of demons within range. After you detect a demon this way, you can track it regardless of distance for the next 24 hours if you concentrate, even across planes. Demons that are being tracked this way cannot surprise you or hide from you even if invisible, and you see through any illusions they cast. You may track multiple demons this way, but each individual demon requires separate concentration."
            ],
            "tags": [
                "Spell",
                "divination",
                "utility",
                "defense",
                "modal",
                "concentration"
            ]
        },
        {
            "type": "ability",
            "name": "Krystalline Basileia",
            "class": "Evangelist",
            "branch": "Gelidus Ouranos",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "40 mana",
            "range": "200 ft",
            "duration": "Instant",
            "description": [
                "You cause an explosion of ice shards and dark energy. Deal 6d8 ice magic damage and 6d8 dark magic damage to all enemies in a 65 ft square centered on a space in range, then choose two additional effects from the following list:",
                "<ul>",
                "<li>Inflict Frozen for 1 minute</li>",
                "<li>Inflict Slowed for 1 minute</li>",
                "<li>Inflict Blinded for 1 minute</li>",
                "<li>Inflict 2 curses</li>",
                "</ul>",
                "Instead of choosing two effects from the above list, you may instead have this spell deal an additional 4d8 magic damage of either ice or dark.",
                "<br>",
                "If you absorb this spell with Magia Erebea, you may have it be cast when you release Magia Erebea as long as it was absorbed for at least 2 turns. If you do release the spell in this way, you may select 3 conditions from the above list, or have the spell deal an additional 6d8 magic damage of either ice or dark."
            ],
            "tags": [
                "Spell",
                "attack",
                "destruction",
                "AOE",
                "square",
                "condition",
                "Frozen",
                "Slowed",
                "Blinded",
                "curse",
                "modal",
                "conditional",
                "dark",
                "ice"
            ]
        },
        {
            "type": "ability",
            "name": "Iaculatio Orcus",
            "class": "Evangelist",
            "branch": "Gelidus Ouranos",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "60 mana",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You cause spears of ice and darkness to fire from your hands in a wide arc. Deal 16d8 magic damage to all enemies in a 60 ft cone in front of you; the type of magic damage dealt and additional effects are dependant on each enemy's distance from you as follows:",
                "<ul>",
                "<li>Within 10 ft: 4d8 ice magic damage and 12d8 dark magic damage, and the attack has 30% Lethality</li>",
                "<li>11 to 20 ft: 6d8 ice magic damage and 10d8 dark magic damage, and inflict a 30% Weaken</li>",
                "<li>21 to 40 ft: 8d8 ice magic damage and 8d8 dark magic damage</li>",
                "<li>41 to 50 ft: 10d8 ice magic damage and 6d8 dark magic damage, and inflict Slowed</li>",
                "<li>51 to 60 ft: 12d8 ice magic damage and 4d8 dark magic damage, and inflict Frozen</li>",
                "</ul>",
                "<br>",
                "If you absorb this spell with Magia Erebea, you may have it be cast when you release Magia Erebea as long as it was absorbed for at least 2 turns. If you do release the spell in this way, the cone's range extends to 120 ft, and the above list's effect ranges change to within 20 ft, 21 to 40, 41 to 80, 81 to 100, and 101 to 120 respectively."
            ],
            "tags": [
                "Spell",
                "attack",
                "destruction",
                "dark",
                "ice",
                "AOE",
                "cone",
                "conditional",
                "condition",
                "Lethality",
                "Weaken",
                "Slow",
                "Frozen",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Ensis Exsequens",
            "class": "Evangelist",
            "branch": "Gelidus Ouranos",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "70 mana",
            "range": "Self",
            "duration": "1 minute",
            "description": [
                "You conjure a sword of ice and darkness to cut down enemies. When you cast this spell, create and equip a Sword of Conviction in your main hand. The Sword deals 6d8 ice magic damage and 6d8 dark magic damage to all enemies within 20 ft whenever you make an attack with it. Additionally, it has 50% Lethality against minions and ignores magical barriers. This spell can be absorbed via Magia Erebea as a free Major Action even after the Sword has been deployed as long as it still has at least 20 seconds of its Duration left. If you are under the effects of Magia Erebea, the sword gains your passive's on-hit effects. You may have up to 2 Swords active at a time, with the second Sword occupying your off hand, allowing you to make standard off hand weapon attacks with the same effects as the main hand Sword."
            ],
            "tags": [
                "Spell",
                "conjuration",
                "destruction",
                "dark",
                "ice",
                "conditional",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Frigerans Barathrum",
            "class": "Evangelist",
            "branch": "Nivis Obscurans",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "50 mana",
            "range": "200 ft",
            "duration": "Endless",
            "description": [
                "You overload the souls of your enemies with corrupting and chilling energy. All enemies in a 65 ft square centered on a space in range gain 2 of the following conditions of your choice:",
                "<ul>",
                "<li>Each turn, their move speed and dash/teleport distance decreases by 10.</li>",
                "<li>Using a dash ability, teleport ability, or Move Action causes their move speed and dash/teleport distance to decrease by 10 after their movement ends.</li>",
                "<li>Each turn, they gain a curse.</li>",
                "<li>Making an attack causes them to gain a curse after their attack concludes.</li>",
                "</ul>",
                "<br>",
                "If you cast this spell with Magia Erebea active, you may select all 4 options from the above list."
            ],
            "tags": [
                "Spell",
                "dark",
                "ice",
                "condition",
                "control",
                "Curse",
                "AOE",
                "square",
                "modal",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Anthos Pagetou Khilion Eton",
            "class": "Evangelist",
            "branch": "Nivis Obscurans",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "70 mana",
            "range": "200 ft",
            "duration": "30 seconds",
            "description": [
                "You pull enemies together to set up for later spell attacks. Create a Flower on a space in range; it is immune to damage and conditions and resists all forced movement, but can be dispelled, and it lasts for 30 seconds. You may only have one Flower active at one time. If a damaging AOE spell you cast also hits the Flower, the damage for that spell is doubled and the Flower is dispelled. Enemies within 1000 ft of it roll a d6 at the beginning of their turns, causing the following effects:",
                "<ul>",
                "<li>On a 1 or 2, the enemy gains a curse and is inflicted with Slowed and Confused</li>",
                "<li>On a 3 or 4, the enemy gains 2 curses, and may not move away from the Flower in any way</li>",
                "<li>On a 5 or 6, the enemy gains 3 curses, and must use its Move Action to move toward the Flower up to its move speed, even if already next to the Flower. The enemy loses any excess move speed that turn</li>",
                "</ul>",
                "<br>",
                "If you cast this spell with Magia Erebea active, enemies within 1000 ft of the Flower will roll the d6 twice, taking the higher result each time."
            ],
            "tags": [
                "Spell",
                "dark",
                "ice",
                "condition",
                "control",
                "Curse",
                "AOE",
                "field",
                "totem",
                "conditional",
                "Confused"
            ]
        },
        {
            "type": "ability",
            "name": "Aperantos Capulus",
            "class": "Evangelist",
            "branch": "Nivis Obscurans",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "90 mana",
            "range": "200 ft",
            "duration": "1 minute",
            "description": [
                "You create a field that absorbs magical energy to gain power. Create a 65 ft field centered on a space within range. For each enemy within the field, the field triggers at the beginning of each of their turns, causing the following effects: they gain 1 curse; they gain 10% Vulnerability; they gain 10% Weaken.",
                "<br>",
                "If you cast this spell with Magia Erebea active, the field triggers twice at the beginning of each enemy turn instead.",
                "<br>",
                "Whenever you cast an AOE spell that at least partially hits the field, the field is permanently extended to include the spaces affected by the AOE spell.",
                "<br>",
                "Whenever an enemy casts a spell while inside the field, or whenever they cast a spell that affects a space or entity within the field, the field triggers once."
            ],
            "tags": [
                "Spell",
                "field",
                "concentration",
                "conditional",
                "condition",
                "Weaken",
                "Vulnerability",
                "Curse"
            ]
        },
        {
            "type": "ability",
            "name": "Actus Noctis Erebeae",
            "class": "Evangelist",
            "branch": "Magia Ensis",
            "tier": 1,
            "action": "Free Reaction",
            "cost": "X mana",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You exploit your enhanced body's new affinity for magic to store spells for quicker casting. You may only cast this ability while under the effects of Magia Erebea. When you cast a spell, you may pay an additional X mana, where X is the spell's mana cost. If you do, you absorb the spell being cast instead of releasing it. While a spell is absorbed in this manner, you may cast it as a Minor Action or reaction at half its mana cost. You may have multiple spells absorbed simultaneously in this manner. When Magia Erebea is released, all absorbed spells are dispelled."
            ],
            "tags": [
                "Conditional",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Supplementum Pro Armationem",
            "class": "Evangelist",
            "branch": "Magia Ensis",
            "tier": 2,
            "action": "Free Action",
            "cost": "None",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You reconfigure the mana which flows wildly through you. You may only cast this ability while under the effects of Magia Erebea. Magia Erebea gains the following effects until you release it:",
                "<ul>",
                "<li>Maximum health loss per turn increases to 20</li>",
                "<li>Your unarmed and weapon attacks gain the absorbed spell's damage dice and conditions as on-hit damage and conditions, in a similar manner as your spells do</li>",
                "<li>Your move speed doubles and your Move Actions are teleports</li>",
                "<li>Your single-target attacks ignore AC, MR, and Evasion</li>",
                "</ul>"
            ],
            "tags": [
                "Conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Armis Cantamen",
            "class": "Evangelist",
            "branch": "Magia Ensis",
            "tier": 3,
            "action": "Free Reaction",
            "cost": "20 mana",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You convert mana into physical shielding. You may only cast this ability while under the effects of Magia Erebea. When you cast a damaging spell, you may pay an additional 20 mana. If you do, you absorb the spell being cast instead of releasing it. While a spell is absorbed in this manner, the next instance of damage you would take is negated (along with any negative effects associated with that damage), activating the absorbed spell in response and casting it on the damage's source, regardless of distance. When an absorbed spell is cast this way, it cannot be counterspelled. You may have multiple spells absorbed simultaneously in this manner; if you do, they activate one at a time per incoming damage instance, in an order of your choosing. When Magia Erebea is released, all absorbed spells are dispelled."
            ],
            "tags": [
                "Conditional",
                "modal",
                "negate damage"
            ]
        },
        {
            "type": "ability",
            "name": "Straight Punch",
            "class": "Martial Artist",
            "branch": "Pummel",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "10 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You strike at an enemy with your fists. Deal 4dU physical damage to a target in range. Your next combo roll has +20% if this is the first move in the combo."
            ],
            "tags": [
                "Attack",
                "physical",
                "melee",
                "single-target",
                "unarmed",
                "conditional",
                "combo"
            ]
        },
        {
            "type": "ability",
            "name": "Choke Hold",
            "class": "Martial Artist",
            "branch": "Pummel",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "20 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You hold an enemy in place with a skilled hold. Deal 5dU physical damage to a target in range and grapple them. You have +15% combo chance for any ability targetting an enemy grappled in this manner. At the end of your combo, you may choose to throw the grappled target 20 ft in any direction."
            ],
            "tags": [
                "Attack",
                "physical",
                "melee",
                "single-target",
                "unarmed",
                "conditional",
                "combo",
                "modal",
                "forced movement"
            ]
        },
        {
            "type": "ability",
            "name": "Flying Kick",
            "class": "Martial Artist",
            "branch": "Pummel",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "30 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You fly at an enemy with a strong kick. Dash up to 20 ft, then deal 6dU physical damage to a target in range. This ability has +20% combo chance if your dash's total displacement is 20 ft."
            ],
            "tags": [
                "Attack",
                "physical",
                "melee",
                "single-target",
                "unarmed",
                "conditional",
                "combo",
                "dash"
            ]
        },
        {
            "type": "ability",
            "name": "Roundhouse Kick",
            "class": "Martial Artist",
            "branch": "Thrash",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "15 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You kick with a wide stance at nearby enemies. Deal 4dU physical damage to all targets in range. Your next combo roll has +5% for every enemy this attack hits."
            ],
            "tags": [
                "Attack",
                "physical",
                "melee",
                "multi-target",
                "unarmed",
                "conditional",
                "combo"
            ]
        },
        {
            "type": "ability",
            "name": "Axe Kick",
            "class": "Martial Artist",
            "branch": "Thrash",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "25 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You drop your heel on a group of enemies. Deal 5dU physical damage to all targets in a 10 ft cone; adjacent targets are stunned until the beginning of their next turn, and non-adjacent targets are pushed 15 ft from you. If you fail to deal damage to, stun, or push any targets, your next combo roll has +20%."
            ],
            "tags": [
                "Attack",
                "physical",
                "melee",
                "multi-target",
                "unarmed",
                "conditional",
                "combo",
                "condition",
                "Stun",
                "forced movement"
            ]
        },
        {
            "type": "ability",
            "name": "Open Palm Strike",
            "class": "Martial Artist",
            "branch": "Thrash",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "35 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You dash forward, striking enemies with an open palm. Dash up to 20 ft in any direction, dealing 6dU physical damage to all enemies you dash through. If you dash through at least 3 enemies, or if you dash through an ally, your next combo roll has +20%"
            ],
            "tags": [
                "Attack",
                "physical",
                "melee",
                "multi-target",
                "unarmed",
                "conditional",
                "combo",
                "dash"
            ]
        },
        {
            "type": "ability",
            "name": "Focus Energy",
            "class": "Martial Artist",
            "branch": "Balance",
            "tier": 1,
            "action": "1 Minor Action",
            "cost": "5 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You focus your energy into your attacks. Your next attack gains an additional +30% combo chance. This buff is consumed even if you fail to combo, if you miss, or your damage is blocked, and it does not stack with itself."
            ],
            "tags": [
                "Self-target",
                "buff",
                "combo"
            ]
        },
        {
            "type": "ability",
            "name": "Backstep",
            "class": "Martial Artist",
            "branch": "Balance",
            "tier": 2,
            "action": "1 Reaction",
            "cost": "15 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You quickly evade enemy attacks before preparing for a counterattack. Dash up to 20 ft in any direction. If this dash is used to avoid damage, your next combo roll has +20%."
            ],
            "tags": [
                "Self-target",
                "dash",
                "conditional",
                "combo"
            ]
        },
        {
            "type": "ability",
            "name": "Arrow Catch",
            "class": "Martial Artist",
            "branch": "Balance",
            "tier": 3,
            "action": "1 Reaction",
            "cost": "20 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You catch arrows and send them back at archers. Block a ranged attack on you or an adjacent ally, then you may have your next combo roll have +15% or redirect the attack back at the attacker."
            ],
            "tags": [
                "Self-target",
                "block",
                "modal",
                "combo",
                "conditional",
                "attack"
            ]
        },
        {
            "type": "ability",
            "name": "Spirit Punch",
            "class": "Ki Monk",
            "branch": "Discipline",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "15 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You fire a quick punch to energize your body. Deal 4dU physical damage to a target in range and gain Ki equal to the rolled value. When you cast this ability, you may spend 15 Ki to additionally inflict 4dU psychic damage to the target."
            ],
            "tags": [
                "Attack",
                "physical",
                "melee",
                "single-target",
                "combo",
                "psionic",
                "offensive",
                "psychic",
                "modal",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Drain Punch",
            "class": "Ki Monk",
            "branch": "Discipline",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "25 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You drain the vital force of an enemy with a punch. Deal 5dU physical damage to a target in range and gain Ki equal to half the rolled value. When you cast this ability, you may spend 25 Ki to additionally inflict 5dU psychic damage to the target; if you do, you heal for an amount equal to the psychic damage rolled."
            ],
            "tags": [
                "Attack",
                "physical",
                "melee",
                "single-target",
                "combo",
                "psionic",
                "offensive",
                "psychic",
                "modal",
                "conditional",
                "heal"
            ]
        },
        {
            "type": "ability",
            "name": "Stunning Strike",
            "class": "Ki Monk",
            "branch": "Discipline",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "40 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You use Ki to addle an enemy's senses. Deal 6dU physical damage to a target in range and gain dU ki. When you cast this ability, you may spend 40 Ki to additionally inflict 6dU psychic damage to the target; if you do, the target is Stunned until the end of their next turn."
            ],
            "tags": [
                "Attack",
                "physical",
                "melee",
                "single-target",
                "combo",
                "psionic",
                "offensive",
                "psychic",
                "modal",
                "conditional",
                "condition",
                "Stun"
            ]
        },
        {
            "type": "ability",
            "name": "Spirit Gun",
            "class": "Ki Monk",
            "branch": "Spirit",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "15 stamina or ki",
            "range": "60 ft",
            "duration": "Instant",
            "description": [
                "You fire a bullet of concentrated ki. Deal 4dU psychic damage to a target in range. If ki is spent to cast this ability, it has +50% increased damage and the target's Psionics: Defense roll has -20."
            ],
            "tags": [
                "Attack",
                "ranged",
                "single-target",
                "combo",
                "psionic",
                "offensive",
                "psychic",
                "modal",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Spirit Shotgun",
            "class": "Ki Monk",
            "branch": "Spirit",
            "tier": 2,
            "action": "1 Major Action",
            "cost": "25 stamina or ki",
            "range": "60 ft",
            "duration": "Instant",
            "description": [
                "You fire a spray of ki bullets at many enemies. Deal 5dU psychic damage to all enemies in a 60 ft cone. If ki is spent to cast this ability, it has +50% increased damage and all targets that are hit are knocked back 20 ft."
            ],
            "tags": [
                "Attack",
                "ranged",
                "multi-target",
                "combo",
                "psionic",
                "offensive",
                "psychic",
                "modal",
                "conditional",
                "forced movement"
            ]
        },
        {
            "type": "ability",
            "name": "Spirit Wave",
            "class": "Ki Monk",
            "branch": "Spirit",
            "tier": 3,
            "action": "1 Major Action",
            "cost": "35 stamina or ki",
            "range": "120 ft",
            "duration": "Instant",
            "description": [
                "You fire a wave of ki. Deal 6dU psychic damage to all enemies in a 120 ft line. If ki is spent to cast this ability, it has +50% increased damage and inflicts 30% Psychic Vulnerability to all targets."
            ],
            "tags": [
                "Attack",
                "ranged",
                "single-target",
                "combo",
                "psionic",
                "offensive",
                "psychic",
                "modal",
                "conditional",
                "condition",
                "Vulnerability"
            ]
        },
        {
            "type": "ability",
            "name": "Find Center",
            "class": "Ki Monk",
            "branch": "Meditation",
            "tier": 1,
            "action": "1 Minor Action",
            "cost": "10 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You take a moment to center yourself and find stability. Gain 3dU ki. This ability cannot be reacted to by enemies."
            ],
            "tags": [
                "No-react"
            ]
        },
        {
            "type": "ability",
            "name": "Find Stability",
            "class": "Ki Monk",
            "branch": "Meditation",
            "tier": 2,
            "action": "Free Reaction",
            "cost": "30 stamina",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You find stability while under fire. As a reaction to taking damage, gain ki equal to half the percentage of your maximum health that is lost. If your health is below 40%, gain twice as much ki."
            ],
            "tags": [
                "Conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Find Solace",
            "class": "Ki Monk",
            "branch": "Meditation",
            "tier": 3,
            "action": "1 Minor Action",
            "cost": "35 ki",
            "range": "Self",
            "duration": "Instant",
            "description": [
                "You use ki to cleanse your body of impurities. Cleanse up to 2 conditions on yourself. If your health is below 40%, cleanse up to 4 conditions on yourself instead."
            ],
            "tags": [
                "Cleanse",
                "conditional"
            ]
        },
        {
            "type": "ability",
            "name": "Blitzkrieg",
            "class": "Captain",
            "branch": "Tactics",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "20 stamina",
            "range": "Melee",
            "duration": "Instant",
            "description": [
                "You lead your forces into swift battle. Deal 5d10 physical damage to a target in range. Then, an ally within 50 ft gains a free reaction to dash to a space adjacent to you. They may then use their normal reaction to cast a non-spell, melee, attack ability. Then, set standing Orders for your Follow The Leader passive as follows: allies cast a non-spell, melee, attack ability."
            ],
            "tags": [
                "Attack",
                "single-target",
                "melee",
                "physical",
                "modal"
            ]
        },
        {
            "type": "ability",
            "name": "Retreat",
            "class": "Captain",
            "branch": "Strategy",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "20 stamina",
            "range": "50 ft",
            "duration": "Instant",
            "description": [
                "You call for a tactical retreat to regroup. All allies in range gain a free reaction to dash up to their Move Speed away from enemies, then any number of allies may use their normal reaction to cast any heal ability. This ability, nor the heal abilities cast by allies due to this ability, cannot be reacted to. Then, set standing Orders for your Follow The Leader passive as follows: allies cast a heal ability."
            ],
            "tags": [
                "Dash",
                "no-react"
            ]
        },
        {
            "type": "ability",
            "name": "Inspirational Speech",
            "class": "Captain",
            "branch": "Gambits",
            "tier": 1,
            "action": "1 Major Action",
            "cost": "20 stamina",
            "range": "50 ft",
            "duration": "Instant",
            "description": [
                "You give a rousing speech to the troops. All allies in range gain +100% increased damage until the beginning of your next turn. Then, set standing Orders for your Follow The Leader passive as follows: allies cast a buff ability."
            ],
            "tags": [
                "Buff"
            ]
        }
    ];

    const all_classes = [
        {
            "type": "class",
            "name": "Abjurer",
            "preview": "A mage that specializes in the magical school of Defense. As a mid-tier practitioner, this class has various spells to defend himself and his allies from attacks, conditions, and AOE spells.",
            "num_requirements": 2,
            "known_requirements": [
                "Magic: Defensive Rank A",
                "Armor Mastery: Cloth Rank A"
            ],
            "all_reqs_known": false,
            "flavor_text": "The 41st Mage Corps' first training objective is usually to learn how to form a proper defensive line. Unlike regular infantry, a defense line for a horde of mage soldiers involves a complex layering of defensive magical fields, floating magical shields, reflecting panels, and a host of other defensive spells. The result is a nearly unbreakable line with enough redundancy to cover the loss of up to half the squad.",
            "description": "The Abjurer is a mid-level magical practitioner who has specialized in the magical school of Defense. As the name suggests, Defense magic protects the caster and their allies from enemy attacks. The school contains spells such as shields, temporary health, counterspells, buffs that boost defensive stats, and a variety of other methods to defend a person or group. The class contains no offensive abilities whatsoever, so such a mage is usually included as part of a party or regularly seen with other defensive mages within a section of an army. The class plays especially well with other members of the party who play the tank role, further augmenting their ability to protect the backline. Being an effective Abjurer requires excellent concentration.",
            "requirements": [
                "Magic: Defensive Rank A",
                "Armor Mastery: Cloth Rank A"
            ],
            "branches": {
                "Secure": "The Secure branch gives options for immediate and brief protection in response to enemy attacks.",
                "Contain": "The Contain branch gives options for using defensive magic to neutralize threats for a short  time.",
                "Protect": "The Protect branch gives options for defending a location or group over a longer period of time."
            },
            "passive": {
                "Positive Feedback": "When a Defense spell you control prevents damage, 10% of the damage prevented is converted to recover your mana, up to a limit of the cost of the Defense spell that prevented that damage."
            },
            "abilities": [
                "Shield",
                "Weak",
                "Stoneskin"
            ]
        },
        {
            "type": "class",
            "name": "Aeromancer",
            "preview": "A mage that has begun to master the basics of air magic. At this entry level, this class mostly focuses on spells that inflict damage on enemies, with the added aspects and flavors that air spells tend to provide in terms of mobility and positional play.",
            "num_requirements": 2,
            "known_requirements": [
                "Armor Mastery: Cloth Rank A or Magic: Destruction Rank A",
                "Element Mastery: Air Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "\"When I quit the Academy to become an adventurer, they told me I'd be successful as long as I remembered to go where the wind blows. But then the wind kept blowing me straight towards trouble, so I figured I'd take the wheel; now, the wind blows where I go.\"",
            "description": "The Aeromancer is one of 8 offensive elemental mages. Harnessing the whimsical aspect of air, the Aeromancer values speed, creativity, and taking the initiative. Unlike other mages who plant themselves in the backlines, the Aeromancer uses its high mobility to literally fly across the battlefield, controlling wind to speed allies and slow enemies while inflicting damage through wind blasts and tornados. An adept Aeromancer never stays in one spot, abusing its speed and range to maximum effect to kite and whittle down even the staunchest foes.",
            "requirements": [
                "Element Mastery: Air Rank A",
                "Magic: Destruction Rank A or Armor Mastery: Cloth Rank A"
            ],
            "branches": {
                "Gale": "The Gale branch provides options for dealing damage to single and multiple targets",
                "Gust": "The Gust branch provides options for battlefield control, pushing and pulling entities with wind and providing speed and mobility.",
                "Breeze": "The Breeze branch provides options for utility spells."
            },
            "passive": {
                "Winds of War": "For every 5 feet you move using a Move Action or dash ability, gain a stack of Winds of War. When you inflict air magic damage on a target, you may choose to consume all stacks of Winds of War. Your air magic damage is increased by 5% for every stack of Winds of War consumed in this manner for that instance of air magic damage."
            },
            "abilities": [
                "Wind Slash",
                "Sky Uppercut",
                "Vicious Cyclone",
                "Vicious Hurricane",
                "Aeroblast",
                "Whisk Away",
                "Buffeting Storm",
                "Take Flight",
                "Tailwind",
                "Blowback",
                "Rotation Barrier",
                "Summon Wyvern"
            ]
        },
        {
            "type": "class",
            "name": "Air Duelist",
            "preview": "An archer that primarily uses the longbow, amplifying their attacks with air magic spells both damaging and buffing in nature, and performing brilliant magic/archery combos.",
            "num_requirements": 2,
            "known_requirements": [
                "Weapon Mastery: Bows Rank A",
                "Element Mastery: Air Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "\"I used to think I was the best. I could hit a goblin off its warg from 300 feet away. I used to split my first arrow with my second at the shooting range at school. But I had a rude awakening when I met her. She could shoot dragons out of the sky against the winds created by their beating wings. Her arrows whistled like mystical birdsong. I shot for sport; she created art.\"",
            "description": "The Air Duelist is one of many spellblade variants that focuses on one element and one weapon. This class wields a bow as well as powerful air magic. By interlacing shots from her bow with precise wind strikes, the Air Duelist maximizes its action economy. Her individual spells are weaker than a dedicated air mage's, but her weapon provides increased flexibility and effectiveness at longer ranges, and his offensive output can surpass a regular duelist's with efficient usage of physical and magical arts. Her spells are primarily buffing and damaging in nature, with all the additional support and utility that air magic tends to provide, and there is a heavy emphasis on forced movement and mobility.",
            "requirements": [
                "Weapon Mastery: Bows Rank A",
                "Element Mastery: Air Rank A"
            ],
            "branches": {
                "Dueling": "The Dueling branch gives options for attacks with the bow, focusing on medium range attacks with minor utility.",
                "Casting": "The Casting branch gives options for various air magic spells, with a focus on dealing damage to single and multiple targets.",
                "Buffing": "The Buffing branch gives options for air aspected buff spells, which are largely offensive in nature."
            },
            "passive": {
                "Whirlwind Quiver": "Once per turn, when you deal air magic damage to a target with a spell, gain one Whirlwind Arrow special ammunition. You may have up to 2 Whirlwind Arrows at a time, this special ammunition can not be recovered, and they expire at the end of combat. When you use a Whirlwind Arrow to make an attack with a bow, you may do so as a free action (you still pay any other costs)."
            },
            "abilities": [
                "Gale Shot",
                "Zephyr Shot",
                "Storm Shot",
                "Wind Strike",
                "Cutting Winds",
                "Harassing Whirlwind",
                "Mistral Bow",
                "Arc of Air",
                "Bow of Hurricanes"
            ]
        },
        {
            "type": "class",
            "name": "Ambusher",
            "preview": "A rogue that hides amongst nature to set up deadly ambushes with its special weapon, the blow gun. This weapon allows them to inject toxins from afar with great precision, and the weapon is faster than the more modern firearm.",
            "num_requirements": 3,
            "known_requirements": [
                "Stealth: Sneak Rank A",
                "Weapon Mastery: Bullets Rank A",
                "Crafting: Poisons Rank A"
            ],
            "all_reqs_known": true
        },
        {
            "type": "class",
            "name": "Amplifier",
            "preview": "An alchemist that has mastered augmentation alchemy. This class has its own augmentations that can upgrade the natural abilities of creatures and objects.",
            "num_requirements": 2,
            "known_requirements": [
                "Armor Mastery: Cloth Rank A",
                "Alchemy: Augmentation Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "It was complete. Finally, I would become beautiful. Finally, I would obtain the life I deserved. Finally, I would become the girl I always wanted to be. The cost was great. But the reward will be worth it. It has to be\u2026",
            "description": "The Amplifier is a practitioner of Augmentation alchemy. As one of the most common types of alchemy, many towns will have an amplifier, selling blueprints for strengthening tools and weapons. The Amplifier provides an avenue for buffing allies and their equipment without requiring concentration, buff limit, or even mana or stamina. Instead, the Amplifier takes time outside of combat to complete the products of their abilities and blueprints, in order to provide bonuses in combat.",
            "requirements": [
                "Alchemy: Augmentation Rank A",
                "Armor Mastery: Cloth Rank A"
            ],
            "branches": {
                "Bolster": "The Bolster branch gives options for improving the offensive capabilities of items and entities.",
                "Fortify": "The Fortify branch gives options for improve the defensive capabilities of items and entities.",
                "Supplement": "The Supplement branch gives options for providing additional utility options to items and entities."
            },
            "passive": {
                "Overclock": "At the end of a long rest, you may create the product of an Amplifier ability without needing the materials. An augmentation made this way has its Duration extended to 6 hours."
            },
            "abilities": [
                "Improved Aggression",
                "Enhanced Vigor",
                "Refined Agility"
            ]
        },
        {
            "type": "class",
            "name": "Aquamancer",
            "preview": "A mage that has begun to master the basics of water magic. At this entry level, this class mostly focuses on spells that inflict damage on enemies, with the added aspects and flavors that water spells tend to provide in terms of support magic and battlefield control.",
            "num_requirements": 2,
            "known_requirements": [
                "Armor Mastery: Cloth Rank A",
                "Element Mastery: Water Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "Water flows around obstacles, or wears them down to nothing. Water is flexible and conforms to the shape of its environment, yet dominates a space and fills it entirely. Water caresses and nourishes, but also drowns and destroys. Water is patient and powerful. As you must be.",
            "description": "Aquamancer is an entry level mage that has begun to master the element of water. Water, as an element, is focused on balance and flexibility, and the aquamancer spell list reflects this philosophy. An adept aquamancer will be able to deal moderate water magic damage to single and multiple targets effectively while also manipulating the battlefield and controlling enemy movement. Likewise, the aquamancer can turn inward towards the party and assist with a defensive suite of spells and some moderate healing. While other elemental mages are more focused on dealing damage, inflicting crowd control, or healing, none of them have the sheer number of options that the aquamancer has.",
            "requirements": [
                "Element Mastery: Water Rank A",
                "Magic: Destruction Rank A or Armor Mastery: Cloth Rank A"
            ],
            "branches": {
                "Geyser": "The Geyser branch provides options for dealing damage to single and multiple targets as well as minor forced movement.",
                "Harbor": "The Harbor branch provides options for defense as well as battlefield control.",
                "Confluence": "The Confluence branch provides options for healing, cleansing, and buffing."
            },
            "passive": {
                "Turning Tides": "At the beginning of your first turn of combat, choose Flood Tide or Ebb Tide. After your first turn, you swap between Flood Tide and Ebb Tide at the beginning of each new turn. During Flood Tide, your damaging water spells deal 50% increased damage and your forced movement water spells cause 20 additional feet of forced movement. During Ebb Tide, your healing water spells have 50% increased healing and your buffs grant an additional 20% general MR for their duration."
            },
            "abilities": [
                "Hydro Pump",
                "Tidal Wave",
                "Water Whip",
                "Whirlpool",
                "Water Pulse",
                "Washout",
                "Bubble Barrier",
                "Summon Water Weird",
                "Baptize",
                "Rain of Wellness",
                "Draught of Vigor",
                "Fountain of Purity"
            ]
        },
        {
            "type": "class",
            "name": "Arcane Archer",
            "preview": "An archer/mage that specializes in very advanced buffing spells. As a master of self-targeted buff spells with some skill in the bow, this class prepares with both offensive and defensive buffs, then brings death from afar.",
            "num_requirements": 2,
            "known_requirements": [
                "Weapon Mastery: Bows Rank A or Weapon Mastery: Crossbows Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Arcane Artist",
            "preview": "A mage that infuses magic into its drawings in order to summon them to the material realm. Invoking the liquid of their ink as a medium, their pictures fight alongside them as fragile yet powerful summoned minions.",
            "num_requirements": 3,
            "known_requirements": [
                "Element Mastery: Water Rank A",
                "Magic: Summoning Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Arcane Trickster",
            "preview": "A rogue/mage that uses a magical hand for various utilitarian purposes, including unlocking doors and chests from afar and picking pockets without needing to approach. Has a variety of useful utility spells along with magically enhanced rogue abilities.",
            "num_requirements": 3,
            "known_requirements": [
                "Stealth: Steal Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Arcanist",
            "preview": "A mage that specializes in the magical school of Destruction. As a mid-tier practitioner, this class has various spells for dealing damage to single or multiple targets, as well as a handful of utility spells.",
            "num_requirements": 2,
            "known_requirements": [
                "Armor Mastery: Cloth Rank A",
                "Magic: Destruction Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "\"Magic can regenerate lost limbs and necrotic organs. It can send messages across time and space, teleport us to unfathomably bizarre worlds, help us build entire cities in just a few days, and give us glimpses into both the future and the past. And yet here we are, killing each other with it. What a farce.\"",
            "description": "The Arcanist is the entry level destruction mage. For those mages who do not wish to pigeonhole themselves in one element, this class provides damaging spells which can utilize all 8, although it sacrifices some of the special strengths of those classes. The class's passive also grants the user some extra flexibility as far as targeting their spells is concerned, which works well with the class's overall emphasis on both single-target and multi-target/AOE damage. A third branch provides some extra utility, rounding the class out as an excellent first class for a new mage character. Functionally the class is designed to be simple and straightforward, acting as a segway to more complicated mage classes.",
            "requirements": [
                "Magic: Destruction Rank A",
                "Armor Mastery: Cloth Rank A"
            ],
            "branches": {
                "Zapping": "The Zapping branch provides options for dealing damage to single targets.",
                "Blasting": "The Blasting branch provides options for dealing damage to multiple targets.",
                "Arcane": "The Arcane branch provides options for additional utility, usually related to damage dealing."
            },
            "passive": {
                "Focus Fire": "When you cast a damaging spell attack that targets a single enemy, you may have the spell become a 15 ft square AOE instead, decreasing the spell's effectiveness by 25%. Alternatively, when you cast a damaging spell attack that is AOE, you may have the spell become single-target instead, increasing the spell's effectiveness by 25%."
            },
            "abilities": [
                "Magic Dart",
                "Magic Sear",
                "Magic Bomb",
                "Magic Ray",
                "Magic Primer",
                "Force Spike"
            ]
        },
        {
            "type": "class",
            "name": "Archaeomancer",
            "preview": "A mage that specializes in the magical school of Utilities. As a mid-tier practitioner, this class has the highest number of raw utility spells, and acts as a magical Swiss army knife of spell for any situation.",
            "num_requirements": 2,
            "known_requirements": [
                "Armor Mastery: Cloth Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Assassin",
            "preview": "A rogue that specializes in low profile assassinations. Using stealth and wielding daggers, the assassin closes on unsuspecting targets and attempts to execute them in a single blow under the silent cover of night.",
            "num_requirements": 2,
            "known_requirements": [
                "Stealth: Sneak Rank A",
                "Weapon Mastery: Shortblades Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "Leaping down from the rafters, he lands soundlessly behind the two guards and slips daggers between their ribs before they can react, then turns and sneaks into the King's quarters, his footsteps masked by the monarch's snores.",
            "description": "The Assassin has always been a career of necessity. When a sword is too direct and a fireball too flashy, the dagger has always served as an inconspicuous tool to end someone's life. The Assassin excels at its use, as well as finding its way on top of its prey without being detected. With an excess of frontloaded damage, and the necessary abilities to prepare for a kill, the Assassin always tries to end a fight with the first blow. This class has access to abilities to increase its damage and critical strike chance, as well as various tools to track and sneak up on prey, and close in quickly.",
            "requirements": [
                "Stealth: Sneak Rank A",
                "Weapon Mastery: Shortblades Rank A"
            ],
            "branches": {
                "Skulk": "The Skulk branch provides options for gap closing on targets and finding alternative angles of attack",
                "Preparation": "The Preparation branch provides options for temporarily increasing your offensive capabilities and augmenting your attacks.",
                "Execution": "The Execution branch provides options for delivering the killing blow."
            },
            "passive": {
                "Assassinate": "If you attack an uninjured enemy with a shortblade, double all damage for that attack."
            },
            "abilities": [
                "Vanish",
                "Maneuver",
                "Pursue",
                "Stalk",
                "Focus",
                "Sharpen",
                "Haste",
                "Bloodlust",
                "Backstab",
                "Pounce",
                "Skyfall",
                "Massacre"
            ]
        },
        {
            "type": "class",
            "name": "Assault Trooper",
            "preview": "An archer that uses a hand crossbow in one hand and a shield in the other. Mixing the defense of a shield with natural evasiveness and mobility, this class fights on the front line while maintaining a medium range in order to inflict damage.",
            "num_requirements": 3,
            "known_requirements": [
                "Armor Mastery: Shields Rank A",
                "Armor Mastery: Light Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Auramancer",
            "preview": "A mage that infuses their surroundings with magic, creating enchanted pockets of air that provide large groups with powerful boons or debuffs.",
            "num_requirements": 4,
            "known_requirements": [
                "Element Mastery: Air Rank A",
                "Magic: Enchantment Rank A",
                "Magic: Buffs Rank A",
                "Magic: Conditions Rank A"
            ],
            "all_reqs_known": true
        },
        {
            "type": "class",
            "name": "Axelord",
            "preview": "A fighter that has mastered the use of axes, preferring to dual wield them and throw them whenever possible. Aggressive, combo-oriented, and excellent at dealing with large crowds of enemies.",
            "num_requirements": 3,
            "known_requirements": [
                "Armor Mastery: Heavy Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Bard",
            "preview": "An artist who plays in a midline position, using music to attack enemies and buff allies. Many of the bard's songs are continuous buffs in the form of songs they play over the course of a battle.",
            "num_requirements": 2,
            "known_requirements": [
                "Armor Mastery: Light Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Barrager",
            "preview": "A fighter that specializes in throwing javelins, boulders, and other heavy artillery. The barrager uses different abilities for different types of ammunition, providing some flexibility to an otherwise straightforward fighting style.",
            "num_requirements": 3,
            "known_requirements": [
                "Armor Mastery: Light Rank A or Armor Mastery: Heavy Rank A",
                "Weapon Mastery: Heavy Thrown Weapons Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Battle Architect",
            "preview": "A tradesman who adapts guns or crossbows to turrets and walls, rapidly deploying these constructs in battle. Requires a knack for invention and building.",
            "num_requirements": 3,
            "known_requirements": [
                "Weapon Mastery: Bullets Rank A or Weapon Mastery: Crossbows Rank A",
                "Item Use: Tinkering Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Bioengineer",
            "preview": "An alchemist that has mastered organics alchemy. This class creates its own organic creatures to fight for it, defend it, and provide various utilities.",
            "num_requirements": 2,
            "known_requirements": [
                "Armor Mastery: Cloth Rank A",
                "Alchemy: Organics Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "He was a strange fellow really, and his owl that was not quite an owl was even stranger. \"She's a beauty, isn't she?\" he said, smiling up at the beast perched on his shoulder, even as its horrifically human eyes stared back. \"I made her myself.\"",
            "description": "The Bioengineer is a practitioner of Organics alchemy. Frequently, towns will have one or two of these, working on their own blueprints for sale. Organics alchemy is considered the darkest of the alchemical arts, and while some Bioengineers will stick to simple organisms like birds or dogs, others have been known to turn to darker experiments involving people. However, regardless of how they make their living, most Bioengineers aspire to the lost art of creating life in vitro. This class spends time outside of combat creating organisms to be used for a variety of purposes.",
            "requirements": [
                "Armor Mastery: Cloth Rank A",
                "Alchemy: Organics Rank A"
            ],
            "branches": {
                "Aggressive": "The Aggressive branch provides options for organisms that will fight by your side, specializing in dealing damage and harrying the opponent, or protecting you and your allies.",
                "Steadfast": "The Steadfast branch provides options for organisms with various types of defensive and utility functions.",
                "Research": "The Research branch provides options for interacting with your organisms that have already been deployed."
            },
            "passive": {
                "Gift of Life": "At the end of a long rest, you may create the product of a Bioengineer ability without needing the materials. An organism made this way has its Duration extended to 6 hours."
            },
            "abilities": [
                "Amalgam Hunter",
                "Amalgam Artillery",
                "Amalgam Trapper",
                "Amalgam Bomber",
                "Crafted Cleric",
                "Generate Guardian",
                "Absorbing Angel",
                "Child of Life",
                "Call to Heel",
                "Transfer Lifeforce",
                "Hibernate",
                "Adoption"
            ]
        },
        {
            "type": "class",
            "name": "Blade Lord",
            "preview": "A rogue that eschews stealth in favor of practicing a high profile, flashy fighting style while dual wielding knives. Moving quickly in light and flexible armor, this class dominates short range with dagger combo strikes and mid-range with some of the most impressive dagger throwing abilities available to players.",
            "num_requirements": 3,
            "known_requirements": [
                "Weapon Mastery: Shortblades Rank 5",
                "Armor Mastery: Light A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Bladerunner",
            "preview": "A fighter/mage that conjures blades of air to fight with. Highly mobile, this classes uses its dashes to stick to enemies and reposition around the map, and summons blades to deal more damage or control more zones.",
            "num_requirements": 3,
            "known_requirements": [
                "Weapon Mastery: Longblades Rank A or Weapon Mastery: Shortblades Rank A",
                "Element Mastery: Air Rank A",
                "Magic: Conjuration Rank A"
            ],
            "all_reqs_known": true
        },
        {
            "type": "class",
            "name": "Bladesinger",
            "preview": "An artist/fighter who combines the fine arts of music and dance with the martial art of the duelist's sword or whip. By using the power of song to amplify their speed and power and dance to evade and maneuver, this class turns combat into a performance.",
            "num_requirements": 3,
            "known_requirements": [
                "Weapon Mastery: Fine Rank A",
                "Artistry: Dancing Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Bodyguard",
            "preview": "A fighter that focuses on protecting his allies. Usually covered head to toe in plate mail and hefting a massive shield, this class is a fantastic defender, constantly by the side of their charge. It falters a bit in defending more than one person, but protecting one VIP is this class's specialty.",
            "num_requirements": 3,
            "known_requirements": [
                "Armor Mastery: Shields Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Bomber",
            "preview": "An inventor that creates bombs and mines. It tosses small grenades at enemies and plants hidden mines, all with self-made explosives",
            "num_requirements": 3,
            "known_requirements": [
                "Weapon Mastery: Heavy Thrown Weapons Rank A or Weapon Mastery: Light Thrown Weapons Rank A",
                "Item Use: Tinkering Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Brawler",
            "preview": "A monk that eschews the noble martial arts of its predecessors, preferring to fight without holding back. This class will use underhanded tactics like punching below the belt, using surrounding materials as weapons, and augmenting its attacks with terrible dark spells and blazing fire spells.",
            "num_requirements": 4,
            "known_requirements": [
                "Element Mastery: Dark Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Builder",
            "preview": "An inventor that combines small gadgets with large constructions and deploys them in combat, including mobile walls, turrets, and barriers.",
            "num_requirements": 2,
            "known_requirements": [
                "Item Use: Tinkering Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Captain",
            "preview": "A fighter who leads their fellow party members into battle. He stands on the front lines to inspire the troops, and gives party wide orders that manifest and buffs and enables party members to act out of turn.",
            "num_requirements": 3,
            "known_requirements": [
                "Any Melee Weapon (no Unarmed) Rank A",
                "Armor Mastery: Heavy Rank A",
                "Interaction: Leadership Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "\"The pessimist complains about the wind. The optimist expects it to change. The leader adjusts the sails.\"",
            "description": "The Captain is a class that transcends the typical playstyle of a character who's build is self-centered or even that of a playstyle that supports others. The goal of this class is to provide a small party with a focused, goal-oriented playstyle. Captain abilities feed into a passive that provides party-wide action economy, but the possible actions within this team action are fixed by orders given by the Captain. A good Captain will understand how to use their fellow party members well and enable them to do what they do best without putting them into difficult positions, and with time, party members will learn a specific Captain's style and put themselves in positions to be used effectively. If all goes well, and with some smart tactical decision making, the beginning of each round should be a surge in forward momentum for the Captain and his allies.",
            "requirements": [
                "Any Melee Weapon (no Unarmed) Rank A",
                "Armor Mastery: Heavy Rank A",
                "Interaction: Leadership Rank A"
            ],
            "branches": {
                "Tactics": "The Tactics branch gives options for aggressive actions and orders that enable attacks for allies.",
                "Strategy": "The Strategy branch gives options for defensive actions and orders that focus on retreat and bunkering down.",
                "Gambits": "The Gambits branch gives options for taking risks and preparing for unique opportunities."
            },
            "passive": {
                "Follow The Leader": "At the beginning of each round of combat, all allies take a free action based on Orders given by Captain abilities. You can only have one set of standing Orders at a time; casting an ability that sets standing Orders changes your standing Orders. If there are no standing Orders, all allies instead get +10 to Initiative, once per combat."
            },
            "abilities": [
                "Blitzkrieg",
                "Retreat",
                "Inspirational Speech"
            ]
        },
        {
            "type": "class",
            "name": "Card Master",
            "preview": "A rogue/mage that enchants a deck of playing cards with magical effects, randomly drawing these cards to throw at opponents at short range. Requires dexterity and luck.",
            "num_requirements": 3,
            "known_requirements": [
                "Magic: Enchantment Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Cavalier",
            "preview": "A fighter that specializes in warfare from horseback. Excellent as a front line, the class boasts high movespeed, excellent synergy with its mount, and various unique attacks with the mount's assistance.",
            "num_requirements": 2,
            "known_requirements": [
                "Armor Mastery: Heavy Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Chain Master",
            "preview": "A mage that summons chains of ice. After understanding the use of chains in combat and combining this with a mastery of ice magic, this class uses these chains to bind and damage enemies, and control the battlefield with pulls, roots, and other crowd control abilities.",
            "num_requirements": 3,
            "known_requirements": [
                "Element Mastery: Ice Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Champion",
            "preview": "A fighter that has mastered multiple weapons. Uses the additional flexibility to control a fight at any range, and can combine attacks from different weapons for devastating effects.",
            "num_requirements": 3,
            "known_requirements": [
                "Any 3 Weapons (no Unarmed) Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "\"This one's the Spear of the Frozen Throne! Papa got it after looting the lair of a lich up north! And this one's the Blade of Sunlight! It shoots beams when in the hands of a hero! And here's the Bow of True Death! I'm not allowed to touch it because Papa says it's cursed. Pretty cool, huh? C'mon, Papa's got even cooler stuff in the attic!\"",
            "description": "The Champion is a fighter that has devoted his life to the mastery of as many weapons as possible. Just like how a mage might study for years to master a wide variety of spells, the Champion trains for years to master a wide variety of both melee and ranged weapons. The Champion has high strength to swing around greatsword and halberds but also has high dexterity to deftly handle whips and rapiers. The class swaps weapons easily, adapting to the situation, and is especially good at showing off the specific strengths and flairs of each type of weapon. The Champion may only require 3 weapon types to unlock, but is further rewarded for mastering more weapons over the course of their adventuring career.",
            "requirements": [
                "Any 3 Weapon Masteries Rank A"
            ],
            "branches": {
                "Type A Weapons": "The Type A Weapons branch gives options for fighting with Strength scaling weapons: axes, blunts, longblades, polearms, shields, and heavy throwing weapons.",
                "Type B Weapons": "The Type B Weapons branch gives options for fighting with Dexterity scaling weapons: bows, bullets, crossbows, fine weapons, light throwing weapons, and unarmed/fist type weapons.",
                "Type C Weapons": "The Type C Weapons branch gives options for fighting with non-scaling weapons: shortblades and improvised weapons. It also provides the most utility of the three branches."
            },
            "passive": {
                "Master of Arms": "Once per turn, you may freely swap weapons in both hands. After you do, you may make a free autoattack with an extra damage die on the weapon and with the following additional effects, based on weapon type:<ul><li>Axe - Cleave reaches an additional space from your target</li><li>Blunt - The weapon's implicit condition cannot be resisted</li><li>Longblade - The weapon keeps its additional damage die for the rest of the round</li><li>Polearm - Reach is extended to 15 ft for the rest of the round</li><li>Shield - Blocking allows you to repeat this autoattack for the rest of the round as long as a shield remains equipped</li><li>Heavy Throwing Weapon - This attack creates a shockwave around the target, dealing its damage to enemies adjacent to your target as well</li><li>Bow - This attack pushes the target 20 ft away from you</li><li>Bullets - This attack causes a muzzle blast to deal damage to enemies adjacent to you as well</li><li>Crossbow - This attack penetrates enemies to travel its full length</li><li>Fine - This attack ignores AC and MR</li><li>Unarmed - This attack repeats twice more</li><li>Light Throwing Weapons - This attack cannot miss</li><li>Shortblade - This attack has +20% critical strike chance</li><li>Improvised - This attack has 2 more extra damage dice</li></ul>"
            },
            "abilities": [
                "Slice and Dice",
                "Skull Bash",
                "Piercing Blow",
                "Arsenal of Power",
                "Precision Strike",
                "Fan The Hammer",
                "Painful Blow",
                "Arsenal of Finesse",
                "Disarming Blow",
                "Throat Slitter",
                "Parry and Draw",
                "Weapon Juggling"
            ]
        },
        {
            "type": "class",
            "name": "Cleric",
            "preview": "A mage that has sworn to fight against the forces of evil. Using powerful lighting strikes and beams of light from the heavens, the cleric is effective at smiting enemies, but is also one of the best healing classes available.",
            "num_requirements": 4,
            "known_requirements": [
                "Element Mastery: Lightning Rank A",
                "Element Mastery: Light Rank A",
                "Magic: Destruction Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Conjurer",
            "preview": "A mage that specializes in the magical school of Conjurations. As a mid-tier practitioner, this class can summon various types of constructs and objects for offensive, defensive, and utilitarian purposes.",
            "num_requirements": 2,
            "known_requirements": [
                "Armor Mastery: Cloth Rank A",
                "Magic: Conjuration Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "\"Instead of worrying about what you cannot control, shift your energy to what you can create.\"",
            "description": "The Conjurer is an entry level mage that specializes in the magical school of Conjurations. This school contains spells that allow the conjurer to form objects out of thin air, using their mana to summon matter or even forming mana into a solid object temporarily. Requiring a fine control of mana and powerful creativity, the Conjurer is designed to have a variety of useful spells for exploration, and is well suited to the life of an adventurer. The branches of this class are loosely divided into short term and long term spells, allowing the Conjurer to make temporary portals for a few seconds, weapons and armor for a few minutes, or walls and bridges to use for hours. While the class lacks some of the more combat oriented spells of other mages, like a proper counterspell or damage spell, Conjurer makes up for it in utility and creative potential, and should be a welcome addition to any party looking to make day to day life easier.",
            "requirements": [
                "Magic: Conjuration A",
                "Armor Mastery: Cloth Rank A"
            ],
            "branches": {
                "Ephemeral": "The Ephemeral branch gives options for conjuration spells meant to last seconds, for immediate emergency use cases.",
                "Formed": "The Formed branch gives options for conjuration spells meant to last at least 1 minute, for use during brief encounters or to solve short problems.",
                "Lasting": "The Lasting branch gives options for conjuration spells meant to last at least 1 hour, for long term use by large groups."
            },
            "passive": {
                "Arcane Toolbox": "After you complete a long rest, select any number of conjuration spells whose mana costs add up to at most 30% of your maximum Mana. Until the beginning of your next long rest, you may cast each of those spells once without paying their mana costs."
            },
            "abilities": [
                "Web",
                "Fog",
                "Armament",
                "Self Defense Turret",
                "Force Wall",
                "Mansion"
            ]
        },
        {
            "type": "class",
            "name": "Controller",
            "preview": "A mage that specializes in the magical school of Control. As a mid-tier practitioner, this class has various spells that can hold enemies down or otherwise manipulate their actions.",
            "num_requirements": 2,
            "known_requirements": [
                "Armor Mastery: Cloth Rank A",
                "Magic: Control Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "\"Rebel, if you must. Resist, if you can. As you pathetically flail about, trying to take back your freedom, you will inevitably realize: you were never in control anyway.\"",
            "description": "The Controller is a mid-level practitioner of magic which specializes in the school of Control. These spells deal primarily with controlling the actions of other entities. The name of the game here is limiting the number of options your opponents have available to them, or outright determining their actions for yourself. Slows, stuns, and other crowd control spells fall under this category, inhibiting the actions that enemies can make in combat. Outside of combat, charms are available to this class, emulating full-blown mind control with some basic restrictions (typically, no self-harm). This class lacks any significant damaging spells, but makes up for this by having the most robust list of control spells in the system. A Controller is an excellent addition to a large army, a small adventuring group, or even in a solo-build. That being said, some view Control magic as the most evil kind of magic, taking away people's freedoms.",
            "requirements": [
                "Magic: Control Rank A",
                "Armor Mastery: Cloth Rank A"
            ],
            "branches": {
                "Subjugate": "The Subjugate branch gives options for controlling a single target crowd control and charms.",
                "Dominate": "The Dominate branch gives options for controlling a large group with crowd control and charms.",
                "Tyranny": "The Tyranny branch gives options for control-based utility spells."
            },
            "passive": {
                "Internalized Oppression": "When you target an entity with a control spell, apply a stack of the Oppression mark. Your spells against targets with Oppression have 30% increased effectiveness per stack of the mark."
            },
            "abilities": [
                "Hold Person",
                "Mass Slow",
                "Baneful Curse"
            ]
        },
        {
            "type": "class",
            "name": "Corpselight",
            "preview": "A mage that can conjure a special lantern that attracts evil aligned entities, in order to capture them for later summoning. Running a fine line between dark and light, good and evil, the class is alignment restricted to LN, TN, CN.",
            "num_requirements": 4,
            "known_requirements": [
                "Element Mastery: Dark Rank A",
                "Element Mastery: Light Rank A",
                "Magic: Conjuration Rank A",
                "Magic: Summoning Rank A"
            ],
            "all_reqs_known": true
        },
        {
            "type": "class",
            "name": "Corrupter",
            "preview": "A mage that specializes in the magical school of Conditions. As a mid-tier practitioner, this class can inflict buffs on single and multiple targets, primarily for offensive purposes, but with some utility mixed in as well.",
            "num_requirements": 2,
            "known_requirements": [
                "Armor Mastery: Cloth Rank A",
                "Magic: Conditions Rank A"
            ],
            "all_reqs_known": true
        },
        {
            "type": "class",
            "name": "Cryomancer",
            "preview": "A mage that has begun to master the basics of ice magic. At this entry level, this class mostly focuses on spells that inflict damage on enemies, with the added aspects and flavors that ice spells tend to provide in terms of controlling and debilitating enemies.",
            "num_requirements": 2,
            "known_requirements": [
                "Element Mastery: Ice Rank A",
                "Armor Mastery: Cloth Rank A or Magic: Destruction Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "Skating gracefully on the ice, she applies the finishing touches to the goblins, now tasteful frozen sculptures, and then continues deeper into their lair, followed by a cold tailwind.",
            "description": "The Cryomancer is one of 8 offensive elemental mages. Harnessing the merciless aspect of ice, the Cryomancer is a flexible class that deals both single target and AOE damage, but especially excels at controlling the battlefield with crowd control spells. She can create spears of ice to impale enemies or freeze dozens of enemies solid. The Cryomancer provides a powerful defense with the power of ice and cold, and has plenty of offensive options to finish a fight.",
            "requirements": [
                "Element Mastery: Ice Rank A",
                "Magic: Destruction Rank A or Armor Mastery: Cloth Rank A"
            ],
            "branches": {
                "Arctic": "The Arctic branch provides options for damage, both single target and multi-target.",
                "Chilling": "The Chilling branch provides options for crowd control, primarily in the form of slows and freezes.",
                "Snow": "The Snow branch provides options for utility and defense."
            },
            "passive": {
                "Frostbite": "For every round an enemy is affected by a condition applied by one of your spells, they gain a stack of Frostbite. When you inflict ice magic damage on a target, you may choose to consume all stacks of Frostbite on that target. Your ice magic damage is increased by 50% for every stack of Frostbite consumed in this manner for that instance of ice magic damage. Frostbite is not a condition, and does not require concentration"
            },
            "abilities": [
                "Ice Spear",
                "Glacial Crash",
                "Shatter",
                "Aurora Beam",
                "Flash Freeze",
                "Freezing Wind",
                "Hypothermia",
                "Heart of Ice",
                "Ice Crafting",
                "Extinguish",
                "Ice Block",
                "Frozen  Arena"
            ]
        },
        {
            "type": "class",
            "name": "Daggerspell",
            "preview": "A rogue/mage that relies on both the knife and the power of magic to fight. Highly flexible at short to medium ranges, this class has a variety of damaging spells and utility magics to augment the powers of their dagger.",
            "num_requirements": 3,
            "known_requirements": [
                "Weapon Mastery: Shortblades Rank A",
                "Magic: Destruction Rank A",
                "Magic: Utility Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "The difference between controlling magic and letting it control you is paper thin. By taking hold of this power, you accept that you shall spend the rest of your days walking a knife's edge, lest you fall prey to magic's perils.",
            "description": "The Daggerspell is a rogue that has adapted some minor magics into their kit. In combat, this class uses damaging spells to attack enemies from medium ranges while closing in for the kill with an empowered dagger. The interplay of magic attacks and knife attacks will encourage the player to constantly change their angle of attack, and the benefits to doing so will allow them to dominate short to medium ranges. If melee combat isn't immediately a viable option, the class's passive generates potential while the player casts spells, enabling a powerful singular hit with the knife once the player is ready to execute on a site. Outside of combat, a number of rogue-themed utility spells provide the Daggerspell with magically enhanced rogue abilities, assisting them in various stealth based skills as well as providing them with a powerful set of abilities to lock in a scout archetype when running dungeons. This makes the class an excellent choice for adventurers and less so for anyone working in a more organized function such as an army.",
            "requirements": [
                "Weapon Mastery: Shortblades Rank A",
                "Magic: Destruction Rank A",
                "Magic: Utility Rank A"
            ],
            "branches": {
                "Finesse": "The Finesse branch gives options for attacks with a shortblade that enable a mage to kite enemies and land spells safely.",
                "Acumen": "The Acumen branch gives options for spell attacks that enable a rogue to look for openings and close in on targets.",
                "Guile": "The Guile branch gives options for various roguish utility spells."
            },
            "passive": {
                "Ritual Dagger": "When you cast a spell, empower your next attack with a shortblade, granting it on-hit physical damage equal to half of the mana spent."
            },
            "abilities": [
                "Fadeaway Slice",
                "Rapid Jab",
                "Shieldbreaker",
                "Calling Card",
                "Witchbolt",
                "Exposing Tear",
                "Hidden Blade",
                "Invisibility",
                "Rogue's Anlace"
            ]
        },
        {
            "type": "class",
            "name": "Dancer",
            "preview": "An artist who uses dances to flit around the battlefield. With dances that provide powerful buffs and inspire allies, and very effective evasion abilities, the dancer provides a wealth of support and crowd control abilities.",
            "num_requirements": 2,
            "known_requirements": [
                "Armor Mastery: Light Rank A",
                "Artistry: Dancing Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "\"Dance, when you're broken open. Dance, if you've torn the bandage off. Dance in the middle of the fighting. Dance in your blood. Dance when you're perfectly free.\"",
            "description": "The Dancer is one of many classes that evolves from the simple non-combat art of dancing. Combining their love for dance with the natural rhythm and furor of combat, the Dancer is able to move between enemies and allies while maintaining the fluid movements of their many forms. Dancing while moving costs additional stamina, but the Dancer can save on stamina costs by being an intelligent choreographer and moving through their many dances in a specific order. Most dances either provide allies with vigor and strength or confuse allies with bewitching and undulating movement.",
            "requirements": [
                "Artistry: Dancing Rank A",
                "Armor Mastery: Light Rank A"
            ],
            "branches": {
                "Sway": "The Sway branch provides options for charming and confusing enemies.",
                "Strut": "The Strut branch provides options for utility and restoring your allies.",
                "Shimmy": "The Shimmy branch provides options for evasion and gaining resistances."
            },
            "passive": {
                "Dance The Night Away": "You may cast dance abilities alongside your regular Move Action if you expend twice as much stamina. If you do, your Move Action does not provoke opportunity attacks."
            },
            "abilities": [
                "Belly Dance",
                "Swing",
                "Jive",
                "Tango",
                "Waltz",
                "Boogie",
                "Foxtrot",
                "Moonwalk",
                "Ballet"
            ]
        },
        {
            "type": "class",
            "name": "Dark Duelist",
            "preview": "A fighter that primarily uses greatswords in combination with dark magic spells both damaging and buffing in nature, and performing brilliant magic/melee combos.",
            "num_requirements": 2,
            "known_requirements": [
                "Weapon Mastery: Longblades Rank A",
                "Element Mastery: Dark Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "The last remaining knight clutched at the locket hanging from his neck, drenched in blood both his and not. \"My love\u2026soon I will join you in Paradise\u2026\" Then, he infused the last of his energy into his sword, which glowed black as death, and traded his life for thousands.",
            "description": "The Dark Duelist is one of many spellblade variants that focuses on one element and one weapon. This class wields a two-handed greatsword, and channels terrible dark magic through his weapon. By seamlessly weaving together sword strikes with dark magic spells, the Dark Duelist has excellent action economy. His individual spells are weaker than a dedicated dark mage, but his weapon provides additional flexibility, and his offensive output can surpass a regular warrior's with efficient usage of both physical and magical arts. His spells are primarily offensive or buffing in nature, with some additional condition spells due to his dark aspect, and a manipulation of Curses for more damage.",
            "requirements": [
                "Weapon Mastery: Longblades Rank A",
                "Element Mastery: Dark Rank A"
            ],
            "branches": {
                "Dueling": "The Dueling branch gives options for attack with the greatsword, focusing on aggressive, heavy attacks.",
                "Casting": "The Casting branch gives options for various dark magic spells, with a focus on dealing damage and applying conditions.",
                "Buffing": "The Buffing branch gives options for dark aspected buff spells, which are largely offensive in nature."
            },
            "passive": {
                "Scars of Darkness": "When you deal physical damage to a target with a greatsword, you afflict them with a Scar. Dealing dark magic damage with a spell to a Scarred target consumes the Scar and refreshes your Major Action."
            },
            "abilities": [
                "Shadow Strike",
                "Void Slash",
                "Vampiric Slash",
                "Lifereaper",
                "Dark Pulse",
                "Shadow Missiles",
                "Shadow Grasp",
                "Shadow Puppet",
                "Accursed Blade",
                "Sword of Darkness",
                "Blade of Shadows",
                "Accursed Armor"
            ]
        },
        {
            "type": "class",
            "name": "Defiler",
            "preview": "A counterpart to the Auramancer, that creates patches of defiled ground to inflict conditions and CC over a wide area. With excellent area control and battlefield control, this class is one of the better offensive condition appliers.",
            "num_requirements": 3,
            "known_requirements": [
                "Magic: Conditions Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Demon Hunter",
            "preview": "An archer/mage that uses powerful light and lightning spells combined with the safe distance of a ranged weapon to hunt demons, fiends, and other creatures of the dark. They specialize in fighting in conditions where others would crumble, using magic to protect themselves and attack fiercely.",
            "num_requirements": 4,
            "known_requirements": [
                "Weapon Mastery: Bows Rank A",
                "Weapon Mastery: Crossbows Rank A",
                "or Weapon Mastery: Bullets Rank A",
                "Armor Mastery: Light Rank A",
                "Element Mastery: Lightning Rank A",
                "Element Mastery: Light Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "\"There will never be peace between humanity and Hell. We create these demons; they're born of our own twisted hearts and blackened souls. Folks ask me what's the worst I've seen while on the job; I don't have the heart to tell them that those memories have nothing to do with demons. It makes an old, melodramatic coot like me want to turn my guns on the ones I've sworn to protect, sometimes. But as long as there's still one good person left on this earth...Well, I can tolerate any number of demons for just one angel.\"",
            "description": "The Demon Hunter has a thankless job. A master of light and lightning magic, and armed with demon slaying weapons, he dives into the fray against the foulest creatures in the multiverse. Sometimes persisting for weeks amongst their kind, doling out holy death in an almost reckless manner; in reality, the Demon Hunter specializes in the simple act of survival against beings who have lived for centuries and mastered every dark art in the book. This class understands well the balance between maintaining a careful defensive manner and exploiting brilliant yet narrow offensive opportunities. The class's passive provides ample defensive options to allow the user to spend their action economy on attacking instead, which in turn grants them further use of their passive. With powerful light and lightning spells similar to the Cleric's, but with a focus on defense, and deadly ranged attacks, the Demon Hunter represents a pinnacle of efficiency, a maelstrom of human willpower, and a nightmare to every demon that crosses his path.",
            "requirements": [
                "Element Mastery: Light Rank A",
                "Element Mastery: Lightning Rank A",
                "Weapon Mastery: Bows Rank A, Weapon Mastery: Crossbows Rank A, or Weapon Mastery: Bullets Rank A",
                "Armor Mastery: Light Rank A"
            ],
            "branches": {
                "Slayer": "The Slayer branch provides options for dealing physical damage at range that can punch past demonic defenses.",
                "Exorcism": "The Exorcism branch provides options for light and lightning aspected spells to turn the tables on hordes of demons.",
                "Humanity": "The Humanity branch provides options for further defense and utility."
            },
            "passive": {
                "Evil's Bane": "At the beginning of each turn, gain a stack of Hunter. You also gain a Hunter stack when you successfully deal 100 damage in a single round, but only once per round (this effect refreshes at the beginning of your turn). Lose all stacks of Hunter after combat ends. You may expend a Hunter stack as a free reaction at any time to perform one of the following:<ul><li>Gain an additional reaction this round</li><li>Cleanse a condition of your choice on yourself</li><li>Heal for 5d10 health</li><li>Ignore all effects from enemy fields until the beginning of your next turn</li></ul>"
            },
            "abilities": [
                "Demonbane Blast",
                "Consecrated Carnage",
                "Sanctifying Skewer",
                "Banishing Bolt",
                "Lifesteal Elegy",
                "Soul Searing Light",
                "Hunter's Guile",
                "Essence Scatter",
                "Hunter's Instinct"
            ]
        },
        {
            "type": "class",
            "name": "Demonologist",
            "preview": "A mage that summons and binds demons to their will for nefarious purposes. This mage has carefully studied demonic influence through mortal worship and develops powerfully violent spells to copy the abilities of summoned demons. Restricted to Evil alignment characters",
            "num_requirements": 3,
            "known_requirements": [
                "Magic: Destruction Rank A",
                "Magic: Summoning Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Destroyer",
            "preview": "A fighter that specializes in the use of blunt weapons such as maces and clubs. Slow and immobile, but excellent damage and powerful destructive blows that destroy terrain, walls, buildings, and bones.",
            "num_requirements": 2,
            "known_requirements": [
                "Armor Mastery: Heavy Rank A",
                "Weapon Mastery: Blunt Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "\"I will fall upon the earth like a plague. I will sow the seeds of destruction in every hamlet and village. Rivers will run red with the blood of the innocent, and warriors will trade gold for death. The world will become one of violence and stagnation. Mankind will remember this day as the beginning of the end.\"",
            "description": "The Destroyer is the entry level fighter class for the use of blunt weapons. Blunt weapons usually have lower damage peaks than other weapons, but come with additional on-hit effects such as Cripple or Vulnerable, and crafted blunt weapons tend towards applying other types of on hit effects. Their compatibility overall with crafting materials is high, and the vast majority of these weapons are one handed so a shield can be used (dual wielding is out of the question though). The Destroyer maximizes the use of these weapons with expanding on the on hit effects available through its vicious, high damage attacks, and also adds some terrain destruction and powerful AOE attacks. The focus of this class is to keep enemies from moving too far while dealing increasing amounts of damage, and to be straightforward instead of bogging down the player with decisions. Any weapon in the Blunt Weapons category is fair game for this class, so whether its clubs or flails that mark your fancy, the Destroyer will function the same.",
            "requirements": [
                "Weapon Mastery: Blunt Rank A",
                "Armor Mastery: Heavy Rank A"
            ],
            "branches": {
                "Sunder": "The Sunder branch gives options for dealing physical damage with blunt weapons to single targets in melee range.",
                "Raze": "The Raze branch gives options for dealing physical damage with blunt weapons to multiple targets at short ranges.",
                "Teardown": "The Teardown branch gives options for destroying buildings and terrain, and other utility abilities."
            },
            "passive": {
                "Aggravated Assault": "Your attacks with melee weapons that inflict crowd control conditions ignore 20% of your targets' AC and CR."
            },
            "abilities": [
                "Slam",
                "Mortal Strike",
                "Execute",
                "Cleave",
                "Whirlwind",
                "Rampage",
                "Demolish",
                "Challenge",
                "Flatten"
            ]
        },
        {
            "type": "class",
            "name": "Diviner",
            "preview": "A mage that specializes in the magical school of Divinations. As a mid-tier practitioner, this class has various spells to learn about future events, foresee the immediate and the distant future, and gain knowledge magically.",
            "num_requirements": 2,
            "known_requirements": [
                "Armor Mastery: Cloth Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Dragoncaller",
            "preview": "A mage that calls upon and fights alongside dragons of varying size and species. This mage has carefully studied draconic biology and develops powerfully violent spells to copy the abilities of summoned dragons. Restricted to Good alignment characters",
            "num_requirements": 3,
            "known_requirements": [
                "Magic: Destruction Rank A",
                "Magic: Summoning Rank A",
                "Knowledge: Nature Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "\"If I were you, I wouldn't cross me. I've got friends in high places.\"",
            "description": "The Dragoncaller is a class whose identity is deeply entrenched with its lore. Dragons are known to be the only intelligent species with a lifespan over 200 years. Being that all fully matured dragons are natural forces of good, they have much wisdom to impart to the humanoid races, and great physical and magical power to contribute to causes of good and righteousness. The Dragoncaller is, first and foremost, a scholar whose focus is on the physical and magical nature of the draconic lineage and their influence on the natural world and its history. Many Dragoncallers set out on adventure, primarily to learn what they can of the many dragons that inhabit our world, and to create meaningful connections with the ones they manage to come across. Secondarily, Dragoncallers frequently act as middlemen between humanity and dragons who choose to integrate themselves with humanoid societies. It is typical that such relationships break down without a knowledgeable and level-headed individual to bridge the gap between a dragon's sometimes condescending magnanimousity and a humanoid society's sometimes shortsighted treatises. Finally, Dragoncallers provide those not yet matured dragons, whose chaotic natures have yet to give way to true intelligence, a safely directed output for their violence, by summoning them into combat against the forces of evil.",
            "requirements": [
                "Magic: Summoning A",
                "Magic: Destruction Rank A",
                "Knowledge: Nature A"
            ],
            "branches": {
                "Descent": "The Descent branch gives options for summoning dragons to assist in and out of combat.",
                "Derivation": "The Derivation branch gives options for destruction spells that emulate the power of a dragon.",
                "Dignify": "The Dignify branch gives options for spells that emulate the various biological advantages of a dragon."
            },
            "passive": {
                "Draconic Pact": "Each time you create a meaningful bond with an intelligent dragon (by swearing fealty, establishing yourself as an equal, dominating in intellectual debate, proving yourself in combat, indebting yourself or making them indebted to you, learning their history, etc), your summoned creatures permanently gain +100% increased damage."
            },
            "abilities": [
                "Summon Bronze Dragon",
                "Bronze Dragon Breath",
                "Dragonfear"
            ]
        },
        {
            "type": "class",
            "name": "Dragonslayer",
            "preview": "A fighter that specializes in the hunting of large mythical beasts. Armed with abilities to follow their trail and cut away means of escape, this class wields a longsword or greatsword and wears specialized suits of armor.",
            "num_requirements": 3,
            "known_requirements": [
                "Weapon Mastery: Longblades Rank A",
                "Armor Mastery: Heavy Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Duelist",
            "preview": "A fighter that wields the rapier, fighting in a swift, graceful manner. Focusing on dodging as its main defense, the duelist attacks relentlessly and moves seamlessly between targets, delivering a series of jabs, parries, and dash strikes.",
            "num_requirements": 3,
            "known_requirements": [
                "Armor Mastery: Light Rank A",
                "Weapon Mastery: Fine Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Dynamancer",
            "preview": "A mage that has begun to master the basics of lightning magic. At this entry level, this class mostly focuses on spells that inflict damage on enemies, with the added aspects and flavors that lightning spells tend to provide in terms of unpredictability and randomness.",
            "num_requirements": 2,
            "known_requirements": [
                "Armor Mastery: Cloth Rank A or Magic: Destruction Rank A",
                "Element Mastery: Lightning Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "\"Thunder roars but does not strike. Lightning strikes but does not roar. Choose to be lightning.\"",
            "description": "The Dynamancer is the entry level lightning mage. Specializing in the turbulent and wild aspect of lightning, the Dynamancer is a class focused mostly on dealing damage to one or multiple enemies, with some small capability to paralyze and stun as well. In exchange for increased offensive power compared to other elements and a heavy amount of flexibility with each spell, lightning mages must deal with the inherent randomness that comes with playing with lightning. Sometimes, the Dynamancer's spells strike true, but other times they fail to reach parity with other mages' spells. The passive provides a small amount of reprieve from the web of random chance, allowing the class to reroll spell damage and effects when their luck is not in their favor and improving average damage in a decently reliable manner.",
            "requirements": [
                "Element Mastery: Lightning Rank A",
                "Magic: Destruction Rank A or Armor Mastery: Cloth Rank A"
            ],
            "branches": {
                "Shock": "The Shock branch provides options for dealing damage to single targets.",
                "Electrify": "The Electrify branch provides options for dealing damage to multiple targets.",
                "Thunder": "The Thunder branch provides options for additional utility spells."
            },
            "passive": {
                "Volatile Energy": "When you deal damage with a lightning spell or when you roll lower than a spell's average damage, gain a stack of Energy (gain 2 stacks if both of these are fulfilled). You may spend 1 stack of Energy when you cast a spell to reroll any damage dice of your choice and/or reroll any random effects that spell has. You may only do this once per spell."
            },
            "abilities": [
                "Spark Bolt",
                "Live Wire",
                "Lightning Bolt",
                "Lightning Rod",
                "Energize",
                "Frazzle"
            ]
        },
        {
            "type": "class",
            "name": "Eldritch Knight",
            "preview": "A fighter/mage that wields a melee weapon of their choice in one hand and defensive magic in the other. Using water magic for its balanced offensive and defensive properties, this class fights on the front line and relies on a host of defensive spells to avoid damage.",
            "num_requirements": 3,
            "known_requirements": [
                "Any Melee Weapon (no Unarmed) Rank A",
                "Element Mastery: Water Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Elementalist",
            "preview": "A mage that has mastered all the elements. With this level of mastery, this class can combine elements to form new ones, with brand new powers rarely seen before. This class also has a vast degree of flexibility provided by all of the elements and their specialties, and can alter the rules of elemental magic at will.",
            "num_requirements": 8,
            "known_requirements": [
                "Element Mastery: Ice Rank A",
                "Element Mastery: Lightning Rank A",
                "Element Mastery: Dark Rank A",
                "Element Mastery: Water Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Enchanter",
            "preview": "A mage that specializes in the magical school of Enchantments. As a mid-tier practitioner, this class has various spells to augment the strengths and exploit the weaknesses of objects, structures, and equipment, as well as a handful of other utilities.",
            "num_requirements": 2,
            "known_requirements": [
                "Armor Mastery: Cloth Rank A",
                "Magic: Enchantment Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "I watched on as he carefully inscribed his runes upon animal bones, knit together leather with magical seals, brushed the eerie skin tone paints upon a wooden, lifeless face, all while deftly avoiding the ritual circle he had encased his work inside of, and I lamented. For this doll, this macabre mockery of the young master's image, might soon move with enchanted grace and intelligence. But it would never love him as the boy did, only imitate.",
            "description": "The Enchanter is an entry level mage that specializes in the magical school of Enchantment, using magical runes and inscriptions to apply effects to objects and equipment. Such mages are a mainstay of many armies, using their spells to augment the power of weapons and armor as well as reinforcing walls and defensive structures. They are also effective on a smaller scale, assisting party members by providing buff-like effects without taxing buff limit. This class provides a good number of entry level offensive, defensive, and utility effects for the aspiring party mage.",
            "requirements": [
                "Magic: Enchantment A",
                "Armor Mastery: Cloth Rank A"
            ],
            "branches": {
                "Personal": "The Personal branch gives options for enchanting effects onto weapons and armor, mostly useful for combat purposes.",
                "Structural": "The Structural branch gives options for enchanting large, immotile objects like walls and floors, mostly useful for exploration or defense.",
                "Minutiae": "The Minutiae branch gives options for enchanting smaller motile or handheld items, mostly useful for utility."
            },
            "passive": {
                "Perpetual Runology": "You may have enchantment spells you cast that require concentration continue without your concentration at half effectiveness when your concentration breaks or when you choose not to concentrate on the spell when you cast it."
            },
            "abilities": [
                "Modify Weapon",
                "Reforge Armor",
                "Alter Jewelry",
                "Reconstruct Barrier",
                "Rebuild Floor",
                "Secure Building",
                "Mint Coinage",
                "Enhance Vehicle",
                "Empower Ammo"
            ]
        },
        {
            "type": "class",
            "name": "Evangelist",
            "preview": "A mage that fights using darkness and pain, the opposite of a Cleric. Uses ice and dark magic for powerfully destructive AOE spells and has spells that can amplify one's body at the cost of one's humanity, or enchant enemies with powerful curses.",
            "num_requirements": 4,
            "known_requirements": [
                "Element Mastery: Ice Rank A",
                "Element Mastery: Dark Rank A",
                "Magic: Enchantment Rank A",
                "Magic: Destruction Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "\"To think that there would be somebody foolish enough to willingly choose darkness. You should realize that darkness is not such a simple thing. The shadow opposite light. The night opposite day. Right and wrong. Good and evil. Order and chaos. Reason and irrationality. Look at it. Savor it. Remember it well. This is the source of your power. Your initial impulses. Your first dive. Your original self. If you can't handle it, it's the end for you. Prepare yourself.\"",
            "description": "Evangelist brings together the most powerful parts of ice and dark magic, casting high powered AOE spells with ease and causing widespread destruction. It also applies the typical conditions that ice and dark are capable of, but goes a step further with some unique curse abilities, including some that work with ice spells. However, the most integral part of the class is the passive, allowing the Evangelist to turn any damaging spell into a powerful and dangerous steroid. Evangelist is designed to be the final step for an ice or dark mage, and thus has a lot of extra power and complexity in its spells, but the passive also grants some extra synergy with other mages, allowing you to recontextualize your spell list into a list of possible augmentations.",
            "requirements": [
                "Element Mastery: Ice Rank A",
                "Element Mastery: Dark Rank A",
                "Magic: Enchantment Rank A",
                "Magic: Destruction Rank A"
            ],
            "branches": {
                "Gelidus Ouranos": "The Gelidus Ouranos branch provides options for powerful AOE spells with both ice and dark magic",
                "Nivis Obscurans": "The Nivis Obscurans branch provides options for applying powerful and unique curses and conditions to your enemies",
                "Magia Ensis": "The Magia Ensis branch provides options for exploiting your passive."
            },
            "passive": {
                "Magia Erebea": "When you cast a damaging spell attack, instead of releasing the spell, you may absorb its energy to enchant your soul. You may only do so with one spell at a time; activating this passive with a new spell when you already have it active will end the previous effect to allow you to absorb the new spell and gain its effects. While enchanted this way, you lose 10 maximum health per turn. Maximum health lost this way is restored after a long rest and is not considered a condition. You may release Magia Erebea as a free reaction; otherwise, it continues until your maximum health reaches one. Magia Erebea is neither spell nor buff. While under the effects of Magia Erebea, you gain the following effects, based on the absorbed spell:<ul><li>Your spell attacks gain on hit damage die equal to the damage die of the absorbed spell (if the spell has multiple modes resulting in multiple possible damage die configurations, take the mode with the lowest potential maximum damage)</li><li>Your spell attacks inflict any conditions that the absorbed spell would inflict as an on hit effect</li><li>Your spell attacks have their range extended by an amount equal to the range of the absorbed spell</li><li>You may have your spell attacks have their damage type changed to any element that the absorbed spell has</li><li>You become elementally aspected to the elements of the absorbed spell</li></ul>"
            },
            "abilities": [
                "Krystalline Basileia",
                "Iaculatio Orcus",
                "Ensis Exsequens",
                "Frigerans Barathrum",
                "Anthos Pagetou Khilion Eton",
                "Aperantos Capulus",
                "Actus Noctis Erebeae",
                "Supplementum Pro Armationem",
                "Armis Cantamen"
            ]
        },
        {
            "type": "class",
            "name": "Evolutionist",
            "preview": "An alchemist that has mastered transformation alchemy. This class has its own transformations that can change objects and creatures into new things entirely, for various offensive, defensive, and utilitarian purposes.",
            "num_requirements": 2,
            "known_requirements": [
                "Armor Mastery: Cloth Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Fire Duelist",
            "preview": "A fighter that primarily uses longswords, using their free hand to cast fire magic spells both damaging and buffing in nature, and performing brilliant magic/melee combos.",
            "num_requirements": 2,
            "known_requirements": [
                "Weapon Mastery: Longblades Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Firewheeler",
            "preview": "A fighter/mage that wields a large circular weapon called a crescent blade, attacking swiftly with the large yet light weapon and augmenting long combos with fire attacks and boomerang tosses of the blade. The Firewheelers were originally a free spirited guild of dancers and warriors, and taking up the crescent blade means adopting their philosophy, so this class is restricted to Chaotic Good characters.",
            "num_requirements": 3,
            "known_requirements": [
                "Weapon Mastery: Fine Rank A",
                "Weapon Mastery: Heavy Thrown Weapons Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Gatekeeper",
            "preview": "A fighter hefting a trident and shield, this class excels at creating zones of defense, harrying enemies who try to move through their spheres of influence. To further augment their battlefield control, this class has access to water spells, to further control the tide of battle.",
            "num_requirements": 4,
            "known_requirements": [
                "Armor Mastery: Shields Rank A",
                "Element Mastery: Water Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Ghostspeaker",
            "preview": "A mage that digs through the annals of history to find and summon ghosts from the past. Can communicate with spirits and allies through telepathy and summon them to fight alongside him.",
            "num_requirements": 3,
            "known_requirements": [
                "Magic: Summoning Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Gladiator",
            "preview": "A fighter forged in the pits that uses a one handed weapon in one hand and nets/ropes in the other hand to fight tactically and impress spectators, thereby increasing his own power.",
            "num_requirements": 2,
            "known_requirements": [
                "Any Melee Weapon (no Unarmed) Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Golem Master",
            "preview": "An alchemist that has mastered organics and construct alchemy. This class creates special golems, a hybrid of the two schools of alchemy, that are more powerful and versatile and long lasting than regular constructs or organics. Some golems can even eerily resemble humans.",
            "num_requirements": 3,
            "known_requirements": [
                "Armor Mastery: Cloth Rank A",
                "Alchemy: Organics Rank A",
                "Alchemy: Constructs Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "Many forget that the creation of golems, conventionally thought to be creepy if not evil, is actually a type of alchemy invented by Aloys himself, a god of goodness and charity. One could even say that every golem is a disciple of the tenets of Aloys, and that their creation makes one a prophet.",
            "description": "Golem Master is an alchemist that has combined its knowledge of organics and construct alchemy to unlock the lost art of golem creation. Golems are the ultimate in alchemical created life, just falling short of the final goal of all alchemists: true humanoid in vitro development. Golems have many of the qualities of regular humanoids, including middling intelligence, the ability to use equipment and tools, specialized skill sets, and class abilities. They have longer durations and are more durable than regular organics or constructs products, designed to act as extra party members during a dungeon delve or extra guards during open battlefield combat. They even roll death saves when their Health is depleted, just like player characters. This class provides several types of golems one can develop, as well as various ways of assisting golems in their long-term survival.",
            "requirements": [
                "Alchemy: Constructs Rank A",
                "Alchemy: Organics Rank A",
                "Armor Mastery: Cloth Rank A"
            ],
            "branches": {
                "Knighthood": "The Knighthood branch gives options for golems adapted to the arts of physical warfare.",
                "Cadre": "The Cadre branch gives options for golems who've learned to cast spells and use magic.",
                "Retrain": "The Retrain branch gives options for manipulating existing golems for maximized efficiency and utility."
            },
            "passive": {
                "Gift of Intelligence": "At the end of a long rest, select a golem in your inventory. It has its Duration extended to 6 hours and its base Health, Stamina, and Mana are doubled. Only one golem may benefit from Gift of Intelligence at a time."
            },
            "abilities": [
                "Golem Soldier",
                "Golem Sapper",
                "Golem Mage",
                "Golem Scholar",
                "Temporary Shutdown",
                "Recycle"
            ]
        },
        {
            "type": "class",
            "name": "Groveguard",
            "preview": "A fighter that has become one with nature, and defends it with powerfully defensive earth magic and a magically augmented shield. This class combines shield techniques with earth magic to create a powerful defense, with limited offensive capabilities.",
            "num_requirements": 3,
            "known_requirements": [
                "Armor Mastery: Shields Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Harrier",
            "preview": "An archer/mage that enchants their bolts and arrows with crowd control magic. This class excels at pinning down enemies at a range so that melee allies can effectively close in, and the class overall packs a lot of utility at the expense of damage.",
            "num_requirements": 3,
            "known_requirements": [
                "Weapon Mastery: Bows Rank A",
                "Magic: Enchantment Rank A",
                "Magic: Control Rank A"
            ],
            "all_reqs_known": true
        },
        {
            "type": "class",
            "name": "Healer",
            "preview": "A mage that specializes in the magical school of Restoration. As a mid-tier practitioner, this class has many spells to heal himself, other allies, and entire groups, as well as cleanse conditions and cure diseases.",
            "num_requirements": 2,
            "known_requirements": [
                "Armor Mastery: Cloth Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Hemoplague",
            "preview": "A mage that has unlocked the forbidden arts of blood magic by combining dark evil magic with the liquid in their own body. This mage controls blood to attack enemies internally and externally, can conjure blood from thin air, and can restore blood in the living.",
            "num_requirements": 4,
            "known_requirements": [
                "Element Mastery: Dark Rank A",
                "Magic: Conjuration Rank A",
                "Element Mastery: Water Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Herald",
            "preview": "An artist/mage that uses the unique instrument of a horn to play music infused with air magic, providing buffs over a large area and creating sonic blasts.",
            "num_requirements": 3,
            "known_requirements": [
                "Element Mastery: Air Rank A",
                "Magic: Buffs Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Horizon Stalker",
            "preview": "An archer/mage that uses dark portals to kite or hunt enemies. The ranged version of the Voidwalker, this class sacrifices stealth for speed, and hammers enemies quickly before teleporting out of dicey situations to emphasize a guerilla warfare style of play.",
            "num_requirements": 3,
            "known_requirements": [
                "Element Mastery: Dark Rank A",
                "Weapon Mastery: Bows Rank A",
                "Magic: Conjuration Rank A"
            ],
            "all_reqs_known": true
        },
        {
            "type": "class",
            "name": "Ice Duelist",
            "preview": "A fighter that primarily uses onehanded spears, using their free hand to cast ice magic spells both damaging and buffing in nature, and performing brilliant magic/melee combos.",
            "num_requirements": 2,
            "known_requirements": [
                "Element Mastery: Ice Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Illusionist",
            "preview": "A mage that specializes in the magical school of Illusions. As a mid-tier practitioner, this class has a variety of types of illusions, for offensive and utilitarian purposes, and a handful of other manipulative buffs, conditions, and utilities.",
            "num_requirements": 2,
            "known_requirements": [
                "Armor Mastery: Cloth Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Infiltrator",
            "preview": "A rogue equipped with a unique weapon, the wrist crossbow, which requires a deft hand to use without being seen. Uses it for low profile assassinations at medium range. This class will usually use its abilities to stop targets in their tracks before closing in for a kill.",
            "num_requirements": 3,
            "known_requirements": [
                "Stealth: Sneak Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Inventor",
            "preview": "An alchemist that has mastered construct alchemy. This class creates its own mechanical constructs to fight for it, defend it, and provide various utilities.",
            "num_requirements": 2,
            "known_requirements": [
                "Armor Mastery: Cloth Rank A",
                "Alchemy: Constructs Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "\"There are no rules. That is how art is born, how breakthroughs happen. Go against the rules or ignore the rules. That is what invention is about.\"",
            "description": "Inventor is the entry level alchemist that specializes in construct alchemy. Construct alchemy allows one to bring pseudo-life to inanimate objects by first building a body that houses a mixture of chemical and electronic parts to imitate biological functions and intelligence. Constructs, when compared to the organic products of organics alchemy, tend to be more fragile but a little more modular and flexible. Some larger cities might have construct alchemists who build various quality of life constructs to help with day to day work, but this class specializes in constructs more apt at the rigors of an adventuring day. All of the constructs available from this class are made to be deployed in combat as a Minor Action, so they are designed to be compact and straightforward, but many constructs can be highly complex with a lot of moving parts. Finally, the class has abilities allowing you to quickly modify deployed constructs during combat.",
            "requirements": [
                "Alchemy: Construct A",
                "Armor Mastery: Cloth Rank A"
            ],
            "branches": {
                "Haywire": "The Haywire branch gives options for constructs that are aggressive in combat, dealing damage and inflicting conditions.",
                "Processor": "The Processor branch gives options for constructs that assist with defensive tactics and resource management.",
                "Maintenance": "The Maintenance branch gives options for adjusting constructs on the battlefield."
            },
            "passive": {
                "Gift of Knowledge": "At the end of a long rest, you may create the product of an Inventor ability without needing the materials. A construct made this way has its Duration extended to 6 hours."
            },
            "abilities": [
                "Burner Bot",
                "Potion Puppet",
                "Remodulate"
            ]
        },
        {
            "type": "class",
            "name": "Jouster",
            "preview": "A fighter that specializes in the use of polearms. It uses its reach to play defensively while setting up good positions for devastating charge attacks and piercing blows.",
            "num_requirements": 2,
            "known_requirements": [
                "Armor Mastery: Heavy Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Juggernaut",
            "preview": "A fighter that boasts a large life pool combined with heavy armor and a taste for pain in order to stand strong at the front lines with great axe or halberd in hand. Frequently sacrifices health in order to deal damage but has access to lifesteal and other self healing.",
            "num_requirements": 3,
            "known_requirements": [
                "Armor Mastery: Heavy Rank A",
                "Weapon Mastery: Axes Rank A or Weapon Mastery: Blunt Rank A",
                "Athletics: Pain Tolerance Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "\"He's got a funny reputation as a guardian. Always putting himself in the front lines and protecting the rest of the party. People think it's because he cares about us. Truth is, he's just a fucking psychopath.\"",
            "description": "The Juggernaut is a middle tier fighter that can very effectively front line for a party by acting as a health tank. Decent melee damage with either axes or blunt weapons is augmented by hefty amounts of high efficiency lifesteal, and a handful of other defensive abilities provide greater maximum health, passive healing in combat, or a variety of other health/healing based survivability options. Combine this with the ability to use health as stamina and the Juggernaut stands out as a particularly appealing option for any character with a high amount of Vitality, or a build that prioritizes maximum health. High Pain Tolerance allows a Juggernaut to maintain concentration without worrying about all the damage they're taking. The playstyle of Juggernaut rewards aggressive action, putting yourself in the middle of many enemies, and keeping your health as low as possible without putting yourself dangerously low. The class is purely focused on combat, providing no real out of combat utility, so it works excellently as a mercenary or soldier in an army.",
            "requirements": [
                "Armor Mastery: Heavy Rank A",
                "Weapon Mastery: Axes Rank A or Weapon Mastery: Blunt Rank A",
                "Athletics: Pain Tolerance Rank A"
            ],
            "branches": {
                "Butchery": "The Butchery branch gives options for dealing damage to single or multiple enemies.",
                "Bloodshed": "The Bloodshed branch gives options for surviving in the front lines against multiple enemies.",
                "Gore": "The Gore branch gives options to further make use of health as a resource."
            },
            "passive": {
                "What Doesn't Kill You": "Attack abilities that cost stamina can be paid for with an equal amount of health instead. Attacks cast this way have their physical damage increased by a percentage equal to the percentage of your missing health."
            },
            "abilities": [
                "Wild Swing",
                "Violent Riot",
                "Draining Blow",
                "All Out Attack",
                "Hypertension",
                "Blood Boil",
                "Purge",
                "Critical Condition",
                "Hostility",
                "Blood For Power",
                "Tachycardia",
                "Blood For Vigor"
            ]
        },
        {
            "type": "class",
            "name": "Ki Monk",
            "preview": "A monk that fights both with its fists and its mind. This class uses its psionic powers to generate Ki, and then expends Ki in order to perform specialized psionic attacks at a range. Ki is primarily offensive, and can be used for buffs as well.",
            "num_requirements": 3,
            "known_requirements": [
                "Armor Mastery: Cloth Rank A or Armor Mastery: Light Rank A",
                "Psionics: Offensive Rank A",
                "Weapon Mastery: Unarmed Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "Ki is more than just the stamina you use to punch or kick, more than the vitality that sustains you. Ki is a vital force that drives each and every cell in your body to achieve feats beyond their physical limitations.",
            "description": "The Ki Monk is a monk that has managed to unlock the secrets of ki through rigorous physical training and deep meditation. Ki utilizes offensive psionics and allows the Ki Monk to generate ki through their attacks to later use to improve individual attacks in combos as well as improve their combo rate overall. Ki Monks can briefly meditate before combat begins, generating ki for use that combat. Players using this class will be expected to track their ki and learn how to use it wisely; many Ki Monk abilities provide modes that allow for extra effects with the expenditure of ki, but a player might instead choose to hoard ki for the use of extending combos. Ki can convert physical attacks into psionic attacks, add additional psionic damage to physical attacks, provide innate physical and psionic defenses, and provide a variety of other offensively oriented benefits. Perhaps the most useful of these are the abilities involving the use of ki at range, firing powerful blasts of ki at enemies and providing a monk with much needed ranged DPS capabilities.",
            "requirements": [
                "Armor Mastery: Cloth Rank A or Armor Mastery: Light Rank A",
                "Psionics: Offensive Rank A",
                "Weapon Mastery: Unarmed Rank A"
            ],
            "branches": {
                "Discipline": "The Discipline branch gives options for dealing physical damage to gain or spend Ki.",
                "Spirit": "The Spirit branch gives options for dealing psionic damage via ranged Ki attacks.",
                "Meditation": "The Meditation branch gives options for Ki related utilities."
            },
            "passive": {
                "Kijong": "Your monk mastery increases. Additionally, when you roll initiative, you may subtract any amount from your rolled value to gain an equal amount of ki. After rolling for combo and failing, you may spend ki to add +1 to the rolled result per ki spent in order to change the result to a success instead."
            },
            "abilities": [
                "Spirit Punch",
                "Drain Punch",
                "Stunning Strike",
                "Spirit Gun",
                "Spirit Shotgun",
                "Spirit Wave",
                "Find Center",
                "Find Stability",
                "Find Solace"
            ]
        },
        {
            "type": "class",
            "name": "Kickboxer",
            "preview": "A monk that fights with punches and kicks, and uses both blocks and dodges. With a wealth of defensive options, the kickboxer is an effective front liner, using jabs for chip damage and haymakers as finishers.",
            "num_requirements": 4,
            "known_requirements": [
                "Armor Mastery: Light Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Lasher",
            "preview": "A fighter who uses whips and chains to control enemies at medium range, while dealing damage with lashes and whip strikes. The lasher fights on a unique axis because of the various types of techniques possible with an undulating weapon such as the whip.",
            "num_requirements": 2,
            "known_requirements": [
                "Weapon Mastery: Fine Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Lifedrinker",
            "preview": "A mage/alchemist that combines his natural healing magic with corrupted organic chemistry to manipulate the lives of enemies and allies. This class drains health, can transfer health/stamina/mana between party members, and can destroy organic creatures to regain resources.",
            "num_requirements": 3,
            "known_requirements": [
                "Armor Mastery: Cloth Rank A",
                "Alchemy: Organics Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Lightning Duelist",
            "preview": "A fighter that primarily uses rapiers, using their free hand to cast lightning magic spells both damaging and buffing in nature, and performing brilliant magic/melee combos.",
            "num_requirements": 2,
            "known_requirements": [
                "Element Mastery: Lightning Rank A",
                "Weapon Mastery: Fine Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "One second, the two strangers were calmly watching each other from opposite sides of the raucous tavern; the next second, we heard a clap of thunder, and the smaller one had closed the gap in the blink of an eye. Everything was suddenly quiet, but for the slightest hum of energy and tension. We all held our breath even as the hair on the backs of our necks stood on end, and we prayed that the stranger's sword would stay in its scabbard.",
            "description": "The Lightning Duelist is one of many spellblade variants that focuses on one element and one weapon. This class wields a rapier in one hand and volatile lightning magic in the other. By seamlessly weaving together rapier lunges and jabs with lightning magic spells, the Lightning Duelist has excellent action economy. His individual spells are weaker than a dedicated lightning mage's, but his weapon provides increased flexibility and effectiveness at shorter ranges, and his offensive output can surpass a regular duelist's with efficient usage of physical and magical arts. His spells are primary buffing and damaging in nature, with all of the random, violent flavor that lightning spells tend to have, and there is a heavy emphasis on mobility and flexibility of aggressive attack patterns.",
            "requirements": [
                "Element Mastery: Lightning Rank A",
                "Weapon Mastery: Fine Rank A"
            ],
            "branches": {
                "Dueling": "The Dueling branch gives options for attacks with the rapier, focusing on quick lunges, parries, and strikes.",
                "Casting": "The Casting branch gives options for various lightning magic spells, with a focus on dealing damage to single and multiple targets.",
                "Buffing": "The Buffing branch gives options for lightning aspected buff spells, which are largely offensive in nature."
            },
            "passive": {
                "Battle Current": "Whenever you deal lightning magic damage to a target with a spell, you become empowered, and you may have the next attack you make with a rapier occur a second time at no cost. You may choose new targets for the second rapier attack. Battle Current does not stack with itself, but can occur multiple times per turn, and it does not count as a buff or require concentration."
            },
            "abilities": [
                "Lightning Lunge",
                "Blade Storm",
                "Shocking Parry",
                "Flash of Swords",
                "Shock Tendrils",
                "Ball Lightning",
                "Thunder Blast",
                "Arc Lightning",
                "Taser Blade",
                "Sword of Lightning",
                "Plasma Saber",
                "Lightning Coil Cuirass"
            ]
        },
        {
            "type": "class",
            "name": "Lorekeeper",
            "preview": "A fighter that collects stories to pass onto future generations. Armed with a handaxe to cleave through falsehoods, this class records the history they observe, with an uncanny magical ability to foresee where and when history will unfold in a dramatic way.",
            "num_requirements": 3,
            "known_requirements": [
                "Weapon Mastery: Axes Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Luxomancer",
            "preview": "A mage that has begun to master the basics of light magic. At this entry level, this class mostly focuses on spells that inflict damage on enemies, with the added aspects and flavors that light spells tend to provide in terms of healing and buffs.",
            "num_requirements": 2,
            "known_requirements": [
                "Armor Mastery: Cloth Rank A or Magic: Destruction Rank A",
                "Element Mastery: Light Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "\"It is during our darkest moments that we must focus to see the light.\"",
            "description": "The Luxomancer is a mage who has begun to specialize in the use of light as a magical element. Light is a powerfully supportive element with some high powered damage spells to round out the suite. Light can provide a number of useful buffs such as additional damage, accuracy, and penetration, or defense spells in the form of shielding yourself or blinding enemies. Healing and cleansing spells are also the purview of light; the element has access to the highest value healing spells amongst all eight elements. The damaging spells in the light element tend to have good ratios; AOE damage spells tend to prefer lines instead of squares. A Luxomancer will find that they have a solid suite of spells to play a backline mage within a party, healing and supporting the frontline when necessary, and providing DPS whenever possible. The passive provides the opportunity to convert some of the actions you spend dealing damage into increased healing to be spent on later turns or even at the end of a combat encounter. Luxomancer is an excellent first choice for elemental mages.",
            "requirements": [
                "Armor Mastery: Cloth Rank A or Magic: Destruction Rank A",
                "Element Mastery: Light Rank A"
            ],
            "branches": {
                "Luminosity": "The Luminosity branch gives options for dealing damage to one or multiple enemies.",
                "Radiance": "The Radiance branch gives options for healing spells.",
                "Gleam": "The Gleam branch gives options for buff, defense, and utility spells."
            },
            "passive": {
                "Guiding Light": "When you spend mana on an attack spell, bank half that amount in a special pool of Healing Mana. You can spend Healing Mana only on Restoration spells. Your Healing Mana pool dumps at the end of a combat encounter if you don't spend it beforehand."
            },
            "abilities": [
                "Lightbolt",
                "Light Touch",
                "Dancing Lights"
            ]
        },
        {
            "type": "class",
            "name": "Magic Gunner",
            "preview": "A gunner who augments his bullet clips with powerful destructive magic, allowing bullets to transform midflight for increased damage, area of effect, and utility",
            "num_requirements": 3,
            "known_requirements": [
                "Weapon Mastery: Bullets Rank A",
                "Magic: Destruction Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Marksman",
            "preview": "An archer that specializes in the use of the crossbow. Eschewing the superior range and damage of the bow, the marksman gains additional versatility and ease of use with their weapon of choice.",
            "num_requirements": 2,
            "known_requirements": [
                "Armor Mastery: Light Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Martial Artist",
            "preview": "A monk that uses punches and kicks to devastating effect. By chaining a number of techniques together, this class ramps up in damage before eventually ending fights with powerful finishers.",
            "num_requirements": 2,
            "known_requirements": [
                "Armor Mastery: Cloth or Armor Mastery: Light Rank A",
                "Weapon Mastery: Unarmed"
            ],
            "all_reqs_known": true,
            "flavor_text": "The essence of martial arts is not strength, not the art itself, but that which is hidden deep within yourself.",
            "description": "The Martial Artist is an entry level monk for a character beginning their journey through the long and arduous path of becoming a master of hand to hand combat. This class provides the initial tools for fighting in close quarters with punches, kicks, grapples, and throws. Additionally, it acts as an introduction to the unique mechanics of monk classes as a whole: dU and combo chance. All monk passives, along with whatever the class's specific passive is, also provide a level of monk mastery. Each level of monk mastery augments a character's dU and their base combo chance. The designation dU refers to the damage dice of an unarmed strike; for a non-monk character, this is a d4, but every additional monk mastery passive increases dU by one dice level, to d6, d8, d10, d12, and finally d20. Additionally, each level of monk mastery augments a character's base combo chance. Combo chance is the percentage chance that after casting a major action ability that has the combo tag that you will be able to follow up with another combo ability that has yet to be used that turn. Base combo chance for a non-monk is 0%, and increases with each monk mastery passive to 10%, 20%, 30%, 35%, and finally 40%. Abilities themselves can temporarily improve one's combo chance; the Martial Artist class provides a branch dedicated to monk related utilities such as this; on top of its single and multi target physical attacks with unarmed strikes, which scale off dU rather than having set damage. With some luck to combo frequently and a dedication to the monk archetype, a character will find that their damage scales rapidly, and a monk can be a powerful physical DPS for a team.",
            "requirements": [
                "Armor Mastery: Light or Armor Mastery: Cloth Rank A",
                "Weapon Mastery: Unarmed Rank A"
            ],
            "branches": {
                "Pummel": "The Pummel branch gives options for single-target physical damage on enemies in melee range.",
                "Thrash": "The Thrash branch gives options for multi-target physical damage on enemies at close ranges.",
                "Balance": "The Balance branch gives options for monk related utility and defensive abilities."
            },
            "passive": {
                "Flurry Of Blows": "Your monk mastery increases. Additionally, you can make an unarmed autoattack as a Minor Action, or as a free action after succeeding or failing a combo roll."
            },
            "abilities": [
                "Straight Punch",
                "Roundhouse Kick",
                "Focus Energy",
                "Choke Hold",
                "Flying Kick",
                "Axe Kick",
                "Open Palm Strike",
                "Backstep",
                "Arrow Catch"
            ]
        },
        {
            "type": "class",
            "name": "Master Alchemist",
            "preview": "An alchemist that has mastered organics, construct, transformation, and augmentation alchemy. This class can create brand new blueprints that non-alchemists can use, combine blueprints for new effects, and break the fundamental rules of alchemy to get more than they give.",
            "num_requirements": 5,
            "known_requirements": [
                "Alchemy: Organics Rank A",
                "Armor Mastery: Cloth Rank A",
                "Alchemy: Augmentation Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Mentalist",
            "preview": "A user of psionic arts, using their mind for various utilitarian purposes such as telekinesis and mind reading. This class also protects its allies from psionic and magic invasion.",
            "num_requirements": 2,
            "known_requirements": [
                "Psionics: Defensive Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Mirror Mage",
            "preview": "A mage that uses mirrors made of light and ice to manipulate line AOE spells, reflecting their own attacks to strike at unique angles with greater power, or reflecting enemy attacks back. With an overall emphasis on defense, this class provides some much needed shielding for large groups.",
            "num_requirements": 3,
            "known_requirements": [
                "Magic: Defensive A",
                "Element Mastery: Ice Magic Rank A",
                "Element Mastery: Light Magic Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "Mirrors don't lie; they only show a part of the truth. A broken mirror can distort the proportions of the reflected image such that it's no longer an accurate representation of reality. Or, perhaps more accurately put, it has the potential to show a nearly infinite number of new points of view. Thus, what you see is just a fraction of what could be.",
            "description": "The Mirror Mage is an advanced mage that uses mirrors made of a combination of ice and light magic to reflect attacks and spells. This class is a natural step for the ice or light mage that sees the potential of line AOE spells or projectiles that are fired in a straight line to be improved upon. Mirrors provide the caster with new angles of attack, helping their spells avoid obstacles and helping the caster achieve line of sight of a target that might be hiding behind cover. As a class that utilizes defensive magic, there's also a host of use cases for these mirrors to protect the caster and their allies by providing reflective barriers, breaking line of sight, and sending enemy attacks right back. Playing this class requires some setup; the Mirror Mage will likely find themselves drawing lines and angles to set up mirrors so that they can fire off projectiles and line AOE spells without having to put themselves in harm's way. With good geometrical sense, the Mirror Mage can hammer enemies from anywhere on the battlefield, regardless of the barriers between.",
            "requirements": [
                "Magic: Defensive A",
                "Element Mastery: Ice Magic Rank A",
                "Element Mastery: Light Magic Rank A"
            ],
            "branches": {
                "Ray": "The Ray branch gives options for single-target and line AOE spells that deal light and ice magic damage to one or multiple targets.",
                "Refraction": "The Refraction branch gives options for creating mirrors to allow the caster to bend shots around barriers.",
                "Reflection": "The Reflection branch gives options for defensive spells themed around the use of mirrors."
            },
            "passive": {
                "Alter Course": "Attacks that are redirected by you have their damage increased by 50%."
            },
            "abilities": [
                "Glass Shot",
                "Plane Mirror",
                "Reflective Barrier"
            ]
        },
        {
            "type": "class",
            "name": "Mistguard",
            "preview": "A mage that dons heavy armor and fights on the front line as a main tank, using ice magic to cast a wide array of defensive spells. One of the few mages that can be considered a true tank.",
            "num_requirements": 3,
            "known_requirements": [
                "Element Mastery: Ice Magic Rank A",
                "Armor Mastery: Heavy Rank A"
            ],
            "all_reqs_known": true
        },
        {
            "type": "class",
            "name": "Modifier",
            "preview": "An alchemist that has mastered construct and augmentation alchemy. This class focuses on constantly improving one specialized construct, adapting it to any situation as needed.",
            "num_requirements": 3,
            "known_requirements": [
                "Armor Mastery: Cloth Rank A",
                "Alchemy: Augmentation Rank A",
                "Alchemy: Constructs Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "\"Twin manasurge engines, a silicon-omensteel processor, a chassis of 60% adamantium and 40% mythril, and coils of true ice for cooling. Yeah, this thing's a monster, and that's not even getting into all the modular weapons systems. We're gonna revolutionize the war with this one.\"",
            "description": "The Modifier is an advanced alchemist that has combined construct alchemy and augmentation alchemy and taken their study into a new direction. By focusing on constantly improving a single construct instead of diverting attention to many, the Modifier manages to build a truly powerful construct designed to survive many combats and be useful in many types of situations. The class has abilities to create specialized constructs with endless durations, which initially start out very weak but over time can be crafted by the alchemist into a true war machine, a perfect partner for investigations, or a sleepless bodyguard for many nights to come. Effectively using this class requires taking one of the abilities to develop a base form for the specialized construct, then adding to it with the other abilities from this class or other augmentation alchemy classes.",
            "requirements": [
                "Alchemy: Constructs Rank A",
                "Alchemy: Augmentation Rank A",
                "Armor Mastery: Cloth Rank A"
            ],
            "branches": {
                "Generate": "The Generate branch gives options for developing the base form of the specialized endless construct.",
                "Attachment": "The Attachment branch gives options for powerful augmentations designed to jumpstart the construct's development",
                "Extension": "The Extension branch gives options for helping maintain the general health and longevity of the specialized construct."
            },
            "passive": {
                "Pet Project": "At the end of each of your turns, gain a special Major Action which can only be used for a Command Action directed to a construct. Command Actions given this way gain an additional Command."
            },
            "abilities": [
                "Basic Voltron Chassis",
                "Modular Weapons and Armor Set",
                "Voltron Heart"
            ]
        },
        {
            "type": "class",
            "name": "Morphologist",
            "preview": "An alchemist that has mastered organics and transformation alchemy. This class creates organic creatures that have the ability to morph freely to other organic creatures, in order to be highly adaptable to any situation and conserve alchemy resources.",
            "num_requirements": 3,
            "known_requirements": [
                "Armor Mastery: Cloth Rank A",
                "Alchemy: Organics Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Necromancer",
            "preview": "A mage/alchemist that raises corpses as mindless zombies or skeletons to do their bidding, using either the power of dark and horrible magics or forbidden alchemy on humans. Uses their undead slaves to fight with numbers, as well as perform other spells manipulating the forces of undeath.",
            "num_requirements": 2,
            "known_requirements": [
                "Any 2 of Alchemy: Organics Rank A",
                "Element Mastery: Dark Rank A",
                "Magic: Summoning Rank A"
            ],
            "all_reqs_known": true
        },
        {
            "type": "class",
            "name": "Night Lord",
            "preview": "A rogue that has mastered the repertoire of the average thief. This class further amplifies its ability of thievery, stealthy movement, dexterity, and unlocking the secrets of its foes to perform criminal feats beyond those of any other rogue class.",
            "num_requirements": 4,
            "known_requirements": [
                "Stealth: Sneak Rank A",
                "Steal Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Ninja",
            "preview": "A rogue that has learned the lost of ninja magic, called ninjutsu. They wield short bladed weapons or shuriken and attack at night, employing damaging spells or stealth spells for a distinct edge both in and out of combat.",
            "num_requirements": 4,
            "known_requirements": [
                "Stealth: Sneak Rank A",
                "Shortblade Mastery Rank A",
                "Conjuration or Magic: Destruction Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Noxomancer",
            "preview": "A mage that has begun to master the basics of dark magic. At this entry level, this class mostly focuses on spells that inflict damage on enemies, with the added aspects and flavors that dark spells tend to provide in terms of applying damage over time and negative conditions.",
            "num_requirements": 2,
            "known_requirements": [
                "Cloth Armor Mastery Rank A or Magic: Destruction Rank A",
                "Dark Magic Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "Why is it that children are always afraid of the dark? It's not something their parents teach them, after all. Is it a natural human fear of the unknown and the unseen? Or is there something about darkness itself that should be feared?",
            "description": "The Noxomancer is one of 8 offensive elemental mages. Harnessing the sinister aspect of dark, the Noxomancer is an aggressive class that deals both single target and AOE damage, but especially excels at stacking conditions on enemies, especially curses. He can inflict a variety of debilitating effects from blindness to fear, all while piling on damage. A small suite of utility spells allows the Noxomancer to take advantage of a variety of situations. Overall, the Noxomancer's slow and steady damage output is a force to be reckoned with.",
            "requirements": [
                "Dark Magic A",
                "Magic: Destruction Rank A or Cloth Armor Mastery A"
            ],
            "branches": {
                "Devastation": "The Devastation branch provides options for inflicting direct dark magic damage to one or multiple targets.",
                "Affliction": "The Affliction branch provides options for inflicting various conditions to hinder enemies.",
                "Obfuscation": "The Obfuscation branch provides options for utility spells."
            },
            "passive": {
                "Neverending Nightmare": "Whenever a non-curse condition that was inflicted by you ends (in any manner, including cleanse) on an enemy in sight, they gain a curse."
            },
            "abilities": [
                "Shadow Bolt",
                "Darkbomb",
                "Corruption",
                "Defile",
                "Shriek",
                "Spreading Madness",
                "Siphon Soul",
                "Treachery",
                "Fiendish Circle"
            ]
        },
        {
            "type": "class",
            "name": "Paladin",
            "preview": "A holy fighter sworn in the service of Aloys or Nox. Uses powerful light magic and stands on the front lines to heal and protect his allies, while tanking damage and blasting evil with divine smites.",
            "num_requirements": 4,
            "known_requirements": [
                "Any Melee Weapon (no Unarmed) Rank A",
                "Light Magic Rank A",
                "Heavy Armor Mastery Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Pegasus Knight",
            "preview": "A fighter that rides a pegasus. Flying through the air on their trusty steed, wielding lithe spears in hand, the pegasus knight has improved mobility but lower damage than the cavalier, and is especially effective against mages.",
            "num_requirements": 3,
            "known_requirements": [
                "Light Armor Mastery Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Pinpoint Monk",
            "preview": "A monk that uses precision strikes augmented with electricity to strike at a target's pressure points in order to paralyze and disable enemies. Their damage is low, but they make up for this in mobility, speed, crowd control, and amplified critical strikes.",
            "num_requirements": 3,
            "known_requirements": [
                "Cloth Armor Mastery Rank A",
                "Lightning Magic Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Psion",
            "preview": "A user of psionic arts, able to attack the minds of others using any of their resources as well as defend the minds of allies from psionic and magic invasion.",
            "num_requirements": 2,
            "known_requirements": [
                "Offensive Psionics Rank A",
                "Defensive Psionics Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "\"I wish I could tell you that the mind is like an open book, but it rarely is. Even the dullard who spends every day shoveling cow shit at his farm has a mind like a fortress, whose hallways twist like a labyrinth, whose deepest treasure rooms are guarded by iron wrought portcullises and inscrutable guardians. Diving into someone else's psyche is an incredible risk. Take care whose mind you go idly waltzing through.\"",
            "description": "The Psion is one of two entry level classes that use psionics as their primary way of engaging in combat. Psionics are unique in a number of ways from other combat styles. Psionic attacks deal psychic damage, a type of physical damage that cannot be dodged and ignores AC, but checks against defensive psionics and works in an all or nothing fashion. When you make a psionic attack, you roll Offensive Psionics to determine the DC that the target needs to beat with Defensive Psionics in order to negate all damage and effects. Additionally, you can pay for psionic abilities with health, stamina, or mana, meaning you have a lot of flexibility and can maintain psionic combat for quite a bit longer than other combat styles. You are still restricted to targets you have line of sight on, and psionic builds are difficult to support with gear. Psion provides ways to deal psionic damage to one or multiple targets, as well as a number of offensive psychic conditions and displacements as well as defense for both you and your party.",
            "requirements": [
                "Offensive Psionics Rank A",
                "Defensive Psionics Rank A"
            ],
            "branches": {
                "Migraine": "The Migraine branch provides options for dealing psychic damage to one or multiple targets.",
                "Mentalism": "The Mentalism branch provides options for offensive psychic attacks that do not focus on damage.",
                "Memory": "The Memory branch provides options for defensive psionics."
            },
            "passive": {
                "Stress Headache": "You may make a psionic autoattack as a Major Action, which deals 2d10 psychic damage to any target you can see within 100 ft. Additionally, all psychic damage you deal is increased by X%, where X is three times the percentage of total health, stamina, and mana added up that you are missing."
            },
            "abilities": [
                "Psyshock",
                "Psywave",
                "Befuddle",
                "Insinuate",
                "Focal Point",
                "Brain Barrier"
            ]
        },
        {
            "type": "class",
            "name": "Pyromancer",
            "preview": "A mage that has begun to master the basics of fire magic. At this entry level, this class mostly focuses on spells that inflict damage on enemies, with the added aspects and flavors that fire spells tend to provide in terms of damaging single targets and multiple targets.",
            "num_requirements": 2,
            "known_requirements": [
                "Cloth Armor Mastery Rank A or Magic: Destruction Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "\"There may be a great fire in our hearts, yet no one ever comes to warm himself at it, and the passers-by see only a wisp of smoke\"",
            "description": "The Pyromancer is the entry level mage that specializes in the use of spells aspected to the aggressive element of Fire. Fire magic sees heavy use in mage cadres of armies as well as heavy personal use for mage adventurers. As the premiere damage dealing element, Pyromancers enjoy a variety of high damage spells to target single or multiple enemies. Additional damage over time in the form of the Burn condition helps maintain a high level of DPS for a Pyromancer even when they find themselves forced to reposition or focus on other objectives in combat. The passive of the class helps make sure that this class's damage spells are relevant even in fights against magic damage tanks. The class has access to some minor area control, creating fields of flames that deter enemies from staying in one spot too long, and as all the other elemental mages do, the Pyromancer has access to a counterspell, but the vast majority of spells in the class's repertoire involve dealing damage in a straightforward manner, making the class an excellent choice for players looking to play a less complex style that still utilizes the system's flexible and powerful magic system.",
            "requirements": [
                "Element: Fire A",
                "Cloth Armor A"
            ],
            "branches": {
                "Incineration": "The Incineration branch gives options for dealing fire magic damage to single targets.",
                "Conflagration": "The Conflagration branch gives options for dealing fire magic damage to multiple targets.",
                "Wildfire": "The Wildfire branch gives options for additional fire magic based utility spells."
            },
            "passive": {
                "Reduce To Ashes": "Your damage-dealing fire spell attacks and your Burn damage triggers inflict targets with -5% Fire MR and +5% Fire Vulnerability, stacking."
            },
            "abilities": [
                "Firebolt",
                "Searing Blaze",
                "Banefire",
                "Magma Spray",
                "Fireball",
                "Heat Ray",
                "Burn Trail",
                "Pyroblast",
                "Inflame"
            ]
        },
        {
            "type": "class",
            "name": "Raider",
            "preview": "An archer/gunman that dual wields crossbows or pistols. They fight up close and personal and are experts at dodging melee and ranged attacks, while maintaining a furious offense at impossible to miss ranges with an impressive array of trick shots and specialized gunkata abilities.",
            "num_requirements": 4,
            "known_requirements": [
                "Light Armor Mastery Rank A",
                "Weapon Mastery: Bullets Rank A or Crossbow Mastery A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Ranger",
            "preview": "An archer that excels in the wilderness. Combining their impressive ability with ranged weapons with their superior ability to follow prey, this class can mark a target for death and follow it to the ends of the earth, before finishing it with arrows.",
            "num_requirements": 3,
            "known_requirements": [
                "Bow or Crossbow Mastery Rank A",
                "Light Armor Mastery Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Ravager",
            "preview": "A monk/mage that fights with the violent, destructive elements. This melee combatant uses flaming punches, thunderous kicks, and shadow strikes to deliver a relentless barrage of constantly increasing punishment.",
            "num_requirements": 4,
            "known_requirements": [
                "Lightning Magic Rank A",
                "Dark Magic Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Reaper",
            "preview": "A fighter/mage that wields a scythe, draining life and stealing souls with dark and terrible magic and inflicting a unique condition called Doomsday to sentence foes to death.",
            "num_requirements": 3,
            "known_requirements": [
                "Axe Mastery Rank A",
                "Condition Magic Rank A",
                "Dark Magic Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "Nothing's quite as pointless as the last words of a man who's yet to realize he's already dead. Yet, those words must be uttered. Because beyond the gate lies an otherworldly quietness.",
            "description": "A Reaper is more than just a mage or fighter; they are an omen of finality. Reaping the spirits of those cursed for death, a reaper cuts short lives with a gruesome mastery of the wicked scythe, or snuffs out souls with a unique curse signaling doomsday. The reaper's melee with scythe and spell leave behind harvestable souls which provide the reaper with the vigor to continue their solemn duty. Curses both mundane and unique make escaping the reaper's toll extremely difficult. With this combination of deadly conditions and scythe attacks, the reaper gives men a good reason to fear their deaths.",
            "requirements": [
                "Dark Mastery A",
                "Axe Mastery A",
                "Condition Magic A"
            ],
            "branches": {
                "Decapitate": "The Decapitate branch gives options for melee attacks with your scythe, powered by mana.",
                "Dread": "The Dread branch gives options for dark spells to deal damage and prevent enemy escape.",
                "Doomsday": "The Doomsday branch gives options for applying powerful unique curses and conditions."
            },
            "passive": {
                "Ferryman of the Dead": "When you kill an enemy with an attack from a scythe, or when an enemy dies while affected by one of your condition spells, they leave behind a soul that occupies the space they died in. Walking through a space occupied by a soul allows you or an ally to pick up the soul freely, healing for 20% of maximum health."
            },
            "abilities": [
                "Soul Rend",
                "Tornado of Souls",
                "Deathstroke",
                "Inevitable End",
                "Call of the Void",
                "Harvester of Life",
                "Drag To Hell",
                "Enslaved Soul",
                "The End Is Coming",
                "Death Throes",
                "Frailty of Man",
                "Final Fate"
            ]
        },
        {
            "type": "class",
            "name": "Reconstructionist",
            "preview": "An alchemist that has mastered transformation and construct alchemy. This class creates transforming tools, weapons, and constructs with various autonomous functions and transformative abilities.",
            "num_requirements": 3,
            "known_requirements": [
                "Cloth Armor Mastery Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Rifleman",
            "preview": "A gunman of the simplest type. The rifleman can be seen as the bullet using counterpart to the sniper or the marksman, but electing to use complicated firearms instead, favoring their higher damage and mitigating their weaknesses in firing rate and risk.",
            "num_requirements": 2,
            "known_requirements": [
                "Light Armor Mastery Rank A",
                "Weapon Mastery: Bullets Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "\"DANGER! MISHANDLING OF FIREARM CAN RESULT IN SERIOUS INJURY OR DEATH. You are now the proud owner of an Achak Industries firearm, which comes with certain responsibilities which the Sultanate of Kraithan requires our company to inform you of. Do not point a firearm at anyone or anything you do not intend to fire at. Always assume a firearm is loaded. Achak Industries is not liable for any harm that comes to any law-abiding citizens as a result of improper or reckless use of our equipment. Do not even think of suing us; our lawyers are better than yours and also have guns. Thank you for your patronage.\"",
            "description": "The Rifleman is the entry level bullet weapon class. The use of firearms is difficult for multiple reasons, which the Rifleman helps remedy: firearms require a special action called a Reload Action, which takes two Major Actions, to reload their ammunition, and firearms have an inherent misfire rate that forces a player to roll everytime they attack to see if their gun doesn't just fall apart. To make up for these weaknesses, the average firearm has improved damage capabilities thanks to the secondary fire, an alternative to regular autoattacks. The Rifleman has abilities to minimize misfire, improve damage and speed, and abuse secondary fire and ammunition types to great effect, and acts as an excellent first step to any character who wishes to use firearms for the long term. Damage is high and range is medium compared to other ranged options, and firearms combine many of the unique strengths of both crossbows and bows, often piercing and pushing enemies back.",
            "requirements": [
                "Weapon Mastery: Bullets Rank A",
                "Armor Mastery: Light Rank A"
            ],
            "branches": {
                "Operation": "The Operation branch provides options for dealing damage, with each ability providing both a primary and secondary fire option.",
                "Assembly": "The Assembly branch provides options for aiming and setting up for later turns, to maximize action economy and damage.",
                "Maintenance": "The Maintenance branch provides options for reloading and managing misfire chance, as well as other utilities."
            },
            "passive": {
                "Silver Bullet": "At the beginning of your turn, select a bullet currently chambered in a firearm in your inventory. It becomes a silver bullet, this class's unique special ammunition (if the bullet chosen is already special ammunition, it retains its other properties). When you create a silver bullet, you may choose an additional effect for the ammunition from the list below:<ul><li>An attack with this ammunition ignores AC</li><li>An attack with this ammunition ignores MR</li><li>An attack with this ammunition cannot miss</li><li>An attack with this ammunition gains an extra damage die</li></ul>"
            },
            "abilities": [
                "Bodyshot",
                "Burst Fire",
                "Iron Sights",
                "Bleeding Bullet",
                "Quick Reload",
                "Steady Shooting"
            ]
        },
        {
            "type": "class",
            "name": "Samurai",
            "preview": "A fighter who never backs down from a fight, defying pain and death to continue attacking fiercely. Uses katanas and special blade drawing strikes for swift and powerful attacks.",
            "num_requirements": 2,
            "known_requirements": [
                "Longblade Mastery Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Sentinel",
            "preview": "A fighter that dual wields shields. This class uses special bladed shields that taper off at the end like a sword, and have chains installed in their grips so that they can be retracted after being thrown. Primarily defensive, this class also bring some damage and control to the table.",
            "num_requirements": 2,
            "known_requirements": [
                "Shield Armor Mastery Rank A",
                "Shield Weapon Mastery Rank 5"
            ],
            "all_reqs_known": true,
            "flavor_text": "\"There is a place where civilization gives way to twisting undergrowth and unknown shores. Where good and evil just barely begin to blur together. A place where brave heroics fail and terror dominates the heart. This is the place where he stands guard. Waiting for the end.\"",
            "description": "The Sentinel is a fighter class that has mastered the use of shields as weapons. Dual wielding bladed shields with specialized chain systems attached to their wristguards, the Sentinel has redefined the art of shield combat with innovative new techniques. Being able to double down on the defensive aspects of shields, the Sentinel also brings vicious new attacking opportunities and a wealth of utility and mobility. This class bides its time playing defensively in order to release energy in a burst of explosive movements and attacks in later rounds. The chains on his shields allow for easy shield tossing and dragging himself and opponents where he pleases, and opens up his effective range and target selection. While dual wielding is technically optional with this class, choosing to hold two shields maximizes the abilities this class provides. In order to help these specialized shields mesh with other classes, the Sentinel treats all shields that have implicit damage as axes, longblades, blunt weapons, and heavy throwing weapons as well. The default range for a Sentinel's shield chain is 30 ft, and can be picked up from range using the chains as a free action.",
            "requirements": [
                "Armor: Shields A",
                "Weapons: Shields 5"
            ],
            "branches": {
                "Dauntless": "The Dauntless branch provides options for dealing damage with your bladed shields to single or multiple targets in melee range or at a distance.",
                "Stalwart": "The Stalwart branch provides options for defending yourself and others in ways that covers up weaknesses that the typical defensive suite might be used to.",
                "Tenacious": "The Tenacious branch provides options for mobility, utility, and crowd control, using the chains affixed to your shields."
            },
            "passive": {
                "Perfect Shield": "While you are not in Shield stance, when you block an attack, gain a Shield stack. At the end of your turn, you may expend all Shield stacks to gain that many special reactions and enter Shield stance until the beginning of your next turn. You may use special reactions gained this way as normal reactions or to cast any Sentinel ability. Sentinel abilities you cast this way have their stamina cost halved."
            },
            "abilities": [
                "Crossguard Guillotine",
                "Bladeshield Arc",
                "Parallel Shields",
                "Rapid Shields",
                "Chain Rush",
                "Chain Drag"
            ]
        },
        {
            "type": "class",
            "name": "Shadowdancer",
            "preview": "An artist that combines mystical dancing with shadowy black magics. This class can move through shadows and manipulate them at will. It also can move into a special dance, becoming a mass of shadows.",
            "num_requirements": 3,
            "known_requirements": [
                "Dark Magic Rank A",
                "Cloth Armor Mastery Rank A",
                "Dancing Rank A"
            ],
            "all_reqs_known": true
        },
        {
            "type": "class",
            "name": "Skald",
            "preview": "A fighter/mage that specializes in very advanced buffing spells. As a master of self-targeted buff spells with some skill in the sword, this class prepares with both offensive and defensive buffs, then fights on the front lines.",
            "num_requirements": 2,
            "known_requirements": [
                "Any Melee Weapon (no Unarmed) Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Sniper",
            "preview": "An archer that uses longbows. Taking advantage of their superior range, the sniper is more effective the father their target is, focusing to deliver slow but powerful attacks from incredible distances.",
            "num_requirements": 2,
            "known_requirements": [
                "Bow Mastery Rank A",
                "Light Armor Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "At 30 seconds to midnight, I reconfirmed my target, still sipping wine on the veranda. At 26 seconds, I drew my longbow, custom crafted for this single shot. I planned to shatter it and toss the remains in the nearby river afterwards. At 18 seconds, I finished applying the oils to the ammo I'd use. And at 7 seconds, I finally lined up the shot, and synced the rhythm of breath and heart to my countdown. 5\u20264\u20263\u20262\u2026",
            "description": "The Sniper delivers death from afar. Unlike archers who use shortbows and crossbows for medium range engagements, firing dozens of arrows to slay their target, the Sniper relies on single, extremely powerful and accurate shots from extreme ranges. The firing rate of the average longbow tends to be lower, but the range and damage output easily make up for it. The Sniper expands upon the longbow's strengths by preparing carefully for each shot. He spots his target, tracks their movement, the way they dodge, the weak points in their armor. And finally, when he is ready to take the shot, he has already stacked all the cards in his favor.",
            "requirements": [
                "Weapon Mastery: Bows Rank A",
                "Light Armor Mastery A"
            ],
            "branches": {
                "Shooting": "The Shooting branch provides options for dealing damage at far ranges, both single and multi-target.",
                "Aiming": "The Aiming branch provides options for preparing for an attack, with several self-buffs and attack empowering abilities.",
                "Improvising": "The Improvising branch provides options for utility, such as dodges, mobility, and crowd control."
            },
            "passive": {
                "Spotter": "At any time, you may mark an enemy target you can see as Spotted. While you have a Spotted target, you gain 1 stack of Spotting whenever you take a Major action that does not involve dealing damage or moving. You can also use your Major action to track your target, gaining 2 stacks of Spotting. You have a maximum limit of 8 stacks of Spotting. You lose all stacks of Spotting when a Spotted target dies, or when you switch the mark to a new target. When you attack a Spotted target with a ranged attack from a longbow, you expend all stacks of Spotting, and deal 25% increased damage per stack expended this way."
            },
            "abilities": [
                "Piercing Shot",
                "Kill Shot",
                "Shrapnel Shot",
                "Rapid Shot",
                "Distance Shooter",
                "Precision Shooter",
                "Analytical Shooter",
                "Professional Shooter",
                "Swift Sprint",
                "Swift Shot",
                "Bola Shot",
                "Evasive Maneuvers"
            ]
        },
        {
            "type": "class",
            "name": "Soldier",
            "preview": "A fighter that uses longblades and shields. The paragon of sword and board combat, this class naturally combines offense and defense into one graceful dance, stringing together abilities with dashes and rolls and defending the front line.",
            "num_requirements": 2,
            "known_requirements": [
                "Shield Armor Mastery Rank A",
                "Longblade Mastery Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "They teach you a whole lot about keeping yourself together in Basic. How to swing your sword so you don't injure your wrist or shoulder. How to brace yourself for an impact against your shield. How to keep moving so a random archer doesn't end your career early. And most importantly, how to strike first, so they die before you do. They don't really talk about what to do after you've killed a man, though. And you've got to kill a lot of men before you learn the meaning of being a soldier.",
            "description": "The Soldier is a fighter who wields sword and shield, but boasts an impressive level of mobility as well. Trained with more modern techniques of striking quickly and focusing on survival, this class provides a multitude of options for blocking or dodging incoming attacks, and fighting in a responsive, calculated style that wouldn't normally be expected of a fighter. The Soldier fights on the front lines like other fighters, but isn't restricted to heavy armor, and utilizes strategy over raw power to whittle down opponents.",
            "requirements": [
                "Longblades Mastery A",
                "Shield Armor Mastery A"
            ],
            "branches": {
                "Skirmish": "The Skirmish branch gives options for going on the offensive without over-committing and exploiting new tactical opportunities.",
                "Safeguard": "The Safeguard branch gives options for reliably blocking incoming attacks and protecting allies.",
                "Sprint": "The Sprint branch gives options for dodging attacks and staying mobile while on the front lines."
            },
            "passive": {
                "Defensive Footwork": "When you use your reaction to use a block ability and successfully avoid/reduce damage from an incoming attack, gain a special reaction until the beginning of your next turn which can only be used for a dash reaction ability. When you use your reaction to use a dash reaction ability and successfully avoid/reduce damage from an incoming attack, gain a special reaction until the beginning of your next turn which can only be used for a block reaction ability. Special reactions provided by Defensive Footwork have their mana and stamina costs halved. Defensive Footwork can activate at most once per round, and refreshes at the beginning of each of your turns."
            },
            "abilities": [
                "Fleetfoot Blade",
                "Steadfast Strikes",
                "Biding Blade",
                "Sever The Head",
                "Intercept",
                "Shield Bash",
                "Protective Sweep",
                "Long Live The King",
                "Dodge Roll",
                "Double Time",
                "Tactical Withdrawal",
                "Vigor of Battle"
            ]
        },
        {
            "type": "class",
            "name": "Soulbinder",
            "preview": "A mage that performs rituals to summon lost souls from beyond the veil of death, binding the souls to clay or dirt dolls to fight alongside them.",
            "num_requirements": 3,
            "known_requirements": [
                "Enchantment Magic Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Steam Mage",
            "preview": "A mage that combines the powers of ice and fire in order to create powerful clouds of steam that scald enemies. With a unique mix of damage types and a powerful vector for damage delivery, the steam mage is excellent at both damage and obscuring battlefield clarity.",
            "num_requirements": 3,
            "known_requirements": [
                "Ice Magic Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Summoner",
            "preview": "A mage that specializes in the magical school of Summoning. As a mid-tier practitioner, this class has many different creatures that it can summon for various offensive, defensive, and utilitarian purposes.",
            "num_requirements": 2,
            "known_requirements": [
                "Cloth Armor Mastery Rank A",
                "Summoning Magic Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "\"The world is full of beautiful and intelligent creatures, just as it is filled to the brim with horrific, malevolent monsters. Which would you prefer?\"",
            "description": "The Summoner is an entry level mage that has begun to master the school of summoning magic, a school that calls forth entities from distant lands and even other planes to fight by the caster's side. There is usually at least one summoner in every mage cadre, as the style lends itself well to fighting in the backline. As a mid-level practitioner of the art, the Summoner focuses on having a wide variety of options for summoning targets, including combat ready companions to attack and defend and utility based partners for problem solving, scouting, and skill usage. Each of the Summoner's spells creates an entity that has its own actions but also has a passive effect to help support other summons, which makes an army of summons increasingly powerful. Efficiency is all about picking the right summons for the right situations and finding a way to deal with the setup time required to build up a small army.",
            "requirements": [
                "Summoning Magic A",
                "Cloth Armor Mastery A"
            ],
            "branches": {
                "Pack": "The Pack branch gives options for summons that can deal damage and inflict conditions.",
                "Herd": "The Herd branch gives options for summons that defend the caster and provide additional support in combat.",
                "Flock": "The Flock branch gives options for summons that provide additional utility, including to your other summons."
            },
            "passive": {
                "Return to Aether": "While not in combat, you may dispel any of your summons freely. If you dispel a summon this way, you gain mana equal to half the mana spent to summon it."
            },
            "abilities": [
                "Summon Ascarion Beast",
                "Summon Asiok Dracolord",
                "Summon Throatslitter Demon",
                "Summon Siretsu Leviathan",
                "Summon Batusan Golem",
                "Summon Noxian Seraph",
                "Summon Vilyrian Spellmaster",
                "Summon Warpwurm",
                "Summon Unseen Servant",
                "Summon Estian Wayfinder",
                "Summon Xat'hul Charmspirit",
                "Summon Watcher"
            ]
        },
        {
            "type": "class",
            "name": "Symbiote",
            "preview": "A mage that specializes in the magical school of Buffs. As a mid-tier practitioner, this class can provide buffs for himself, other party members, and entire groups, for various offensive, defensive, and utilitarian purposes.",
            "num_requirements": 2,
            "known_requirements": [
                "Cloth Armor Mastery Rank A",
                "Buff Magic Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "\"He's far too humble for his own good. Always in the background, trying his best to avoid the spotlight. Doesn't speak a word, except when he's casting one of his spells. But without those spells, this team would be nothing. Hell, we probably would have died on our first mission. Kid won't admit it, but he's the backbone of the squad. Everyone might look to me for leadership, but not before I look to him for assurance.\"",
            "description": "The Symbiote is a standard part of many mage cadres, as an intermediate level mage with a mastery of buff magic. Buff spells allow this class to assist their allies without having to attack their enemies and put themselves in harms way. As long as allies have enough composure to handle the strain of multiple buff spells, this class can turn the party into ruthless killing machines or steadfast and unbreakable defenders. As the entry level class for buff magic, this class contains a wide variety of buffing effects and the ability to maintain those effects for an extended period of time.",
            "requirements": [
                "Buff Magic Rank A",
                "Cloth Armor Rank A"
            ],
            "branches": {
                "Fiery Soul": "The Fiery Soul branch gives options for offensive buffs.",
                "Stone Body": "The Stone Body branch gives options for defensive buffs.",
                "Fluid Mind": "The Fluid Mind branch gives options for utility buffs and utility spells to exploit and manipulate buffs."
            },
            "passive": {
                "Eternal Bond": "When an ally you can see has a buff's duration expire on them for a buff spell that you originally casted, you may recast the spell if they are in range as a free reaction. Mana costs are halved for spells cast this way."
            },
            "abilities": [
                "Strengthen Soul",
                "Empower Soul",
                "Bolster Soul",
                "Embolden Soul",
                "Strengthen Body",
                "Empower Body",
                "Bolster Body",
                "Embolden Body",
                "Strengthen Mind",
                "Power Spike",
                "Bolster Speed",
                "Power Surge"
            ]
        },
        {
            "type": "class",
            "name": "Synergist",
            "preview": "A mage that has mastered the art of buffing and healing. With access to the powers of both water and light combined, this class is one of the best classical support mages available to players.",
            "num_requirements": 4,
            "known_requirements": [
                "Magic: Buffs Rank A",
                "Element Mastery: Light Rank A",
                "Element Mastery: Water Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Techno Knight",
            "preview": "A fighter that wields a massive wrench in one hand, using the other to deploy a variety of tinkered inventions that assist in melee combat",
            "num_requirements": 2,
            "known_requirements": [
                "Tinkering Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Tempest",
            "preview": "A mage that has mastered all elemental magic involving the forces of storms. This class summons devastating blizzards, floods, hurricanes, and thunderstorms to create massive, battlefield scarring spells that intensify over time.",
            "num_requirements": 4,
            "known_requirements": [
                "Element Mastery: Ice Rank A",
                "Element Mastery: Lightning Rank A",
                "Element Mastery: Air Rank A",
                "Element Mastery: Water Rank A"
            ],
            "all_reqs_known": true
        },
        {
            "type": "class",
            "name": "Terramancer",
            "preview": "A mage that has begun to master the basics of earth magic. At this entry level, this class mostly focuses on spells that inflict damage on enemies, with the added aspects and flavors that earth spells tend to provide in terms of defense and terrain manipulation.",
            "num_requirements": 2,
            "known_requirements": [
                "Cloth Armor Mastery Rank A or Magic: Destruction Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Thief",
            "preview": "A rogue less suited to combat than some other classes, but excels in the classic rogue skills of stealthy movement, pilfering treasure, and slitting throats. He finds a way to use these skills in combat more uniquely, and can break into guarded mansions with ease.",
            "num_requirements": 3,
            "known_requirements": [
                "Stealth: Sneak Rank A",
                "Shortblade Mastery Rank A",
                "Steal Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "WANTED: The craven criminal who continues to harry our humble hamlet! The unnamed, unknown, unscrupulous usurper of the rightfully received revenues of our most righteous regime! This wanton mobster, whether man or woman or what have you, will with certainty maintain a masterful circumvention of our most muddled constabulary! The government guarantees a generous guerdon, gifted to the group who swiftly seizes this serpentine scofflaw!",
            "description": "The Thief is a career of daring exploits and mischief. Stealing from the rich and poor, the strong and weak, the Thief preys upon the riches of others for their own personal gain. With excellent abilities to sneak past watchful eyes and a knack for knifeplay, the Thief augments its meager combat ability with excellent stealing and sneaking abilities. This class switches between focusing on stealing and focusing on sneaking and adapts to the situation at hand, fluidly sifting through a bag of both offensive and defensive tricks, and is effective at critical strikes when stealth fails and combat breaks out.",
            "requirements": [
                "Steal A",
                "Stealth: Sneak Rank A",
                "Shortblade Mastery A"
            ],
            "branches": {
                "Predator": "The Predator branch gives options for attacks with daggers.",
                "Pilfer": "The Pilfer branch gives options for stealing objects and magical effects during combat.",
                "Prowl": "The Prowl branch gives options for stealth and mobility."
            },
            "passive": {
                "Hit and Run": "At the beginning of combat, enter either Hit Stance or Run Stance, and you may switch at the beginning of each of your turns. When you enter Hit Stance, drain 20 stamina from a target in melee range. During Hit Stance, your attacks have \"On Hit: Drain 10 health.\" When you enter Run Stance, become Hidden and dash up to 15 ft in any direction. During Run Stance, your movement does not provoke opportunity attacks or trigger traps, and you gain +20 move speed."
            },
            "abilities": [
                "Cloak and Dagger",
                "Blade in the Dark",
                "Frenetic Assault",
                "Unavoidable Casualties",
                "Snatch and Grab",
                "Charm and Disarm",
                "Purloin Powers",
                "Grand Thievery",
                "Infiltrate",
                "Dodge the Law",
                "Smokescreen",
                "Phantom Thief"
            ]
        },
        {
            "type": "class",
            "name": "Tinkerer",
            "preview": "An inventor that uses a quick hand and experience with small gadgets to quickly create and deftly deploy a variety of tinkering products, such as turrets, traps, and containers",
            "num_requirements": 2,
            "known_requirements": [
                "Tinkering Rank A",
                "Lightning Magic Rank A"
            ],
            "all_reqs_known": true
        },
        {
            "type": "class",
            "name": "Transfusionist",
            "preview": "An alchemist that has mastered organics and augmentation alchemy. This class horrifically mutates organisms by grafting the parts of other organisms, creating horrible organic creatures with an amalgam of different abilities.",
            "num_requirements": 3,
            "known_requirements": [
                "Armor Mastery: Cloth Rank A",
                "Alchemy: Organics Rank A",
                "Alchemy: Augmentation Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "Subject 12-C is a bipedal, endothermic amniote seeming to be created from an arachnid and a feliform carnivore. Subject is highly dangerous and has an unusually powerful sense of smell, and company personnel with any sort of uncovered wounds are advised to avoid assisting in containment procedures. If assistance from wounded personnel becomes necessary, it is advised that auditory impedance equipment be used, as Subject 12-C will speak the following hypnotic suggestion to its prey before attacking: \"Daddy will make it all better, sweetheart\u2026\"",
            "description": "The Transfusionist is an alchemist that has taken the next step in the development of organics alchemy. With a dangerous blend of fine tuned chemistry and unethical augmentation alchemy, the Transfusionist evolves their organisms haphazardly by fusing them together to create volatile but superior creatures. Most of this alchemist's speciality is in taking the common products of organics alchemy and augmenting them with the powers of other creatures. Sometimes this involves roughly and messily stitching creatures together; other times, it involves forcing parasitism between species that would never normally associate. This class works best when the character has amassed a good number of organics products through other class abilities and organics blueprints.",
            "requirements": [
                "Alchemy: Organics Rank A",
                "Alchemy: Augmentation Rank A",
                "Armor Mastery: Cloth Rank A"
            ],
            "branches": {
                "Mutualism": "The Mutualism branch gives options for combining your crafted creatures in order to augment each other both in and out of combat.",
                "Parasitism": "The Parasitism branch gives options for augmenting or attacking other entities with small parasitic organisms that apply special effects.",
                "Experimentation": "The Experimentation branch gives options for additional utility to manipulate your Augmentation and Organics alchemy products."
            },
            "passive": {
                "Last Minute Fix": "Once per round, when you deploy an organism you've crafted, you may cast an Augmentation alchemy ability or use an Augmentation alchemy blueprint on that organism as a free action."
            },
            "abilities": [
                "Abhorrent Chimera",
                "Organ Donor",
                "Brain Worm",
                "Perfect Fusion",
                "Restoring Parasite",
                "Corrupting Parasite",
                "Enhancing Parasite",
                "Parasitic Plague",
                "Augment Transfer",
                "Product Recall",
                "Swap Parts",
                "Adrenaline Rush"
            ]
        },
        {
            "type": "class",
            "name": "Transmuter",
            "preview": "A mage that specializes in the magical school of Transmutation. As a mid-tier practitioner, this class has various spells to transform himself and his allies as well as entire groups, and a handful of utility spells too.",
            "num_requirements": 2,
            "known_requirements": [
                "Cloth Armor Mastery Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Upgrade Alchemist",
            "preview": "An alchemist that has mastered augmentation and transformation alchemy. This class combines the two disciples to create hybrid upgrades, with various modal functions and tiers of strength that can be built on top of one another, at the risk of harming its subject.",
            "num_requirements": 3,
            "known_requirements": [
                "Cloth Armor Mastery Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Venomist",
            "preview": "A mage that has learned to integrate a lifestyle of crafting toxins with their study of water spells, inflicting poisonous conditions with magic.",
            "num_requirements": 3,
            "known_requirements": [
                "Crafting: Poisons Rank A",
                "Magic: Conditions Rank A",
                "Element Mastery: Water Rank A"
            ],
            "all_reqs_known": true
        },
        {
            "type": "class",
            "name": "Viking",
            "preview": "A fighter that wields an axe in one hand and a shield in the other. Using their shield to push enemies off balance, they follow up with axe strikes for critical strikes and powerful cleaves.",
            "num_requirements": 2,
            "known_requirements": [
                "Shield Armor Mastery Rank A",
                "Axe Mastery Rank A"
            ],
            "all_reqs_known": true
        },
        {
            "type": "class",
            "name": "Viper Knight",
            "preview": "A fighter that uses a poison tipped whip and an evasive fighting style to aggressively apply toxins to enemies with multiple strikes.",
            "num_requirements": 3,
            "known_requirements": [
                "Crafting: Poisons Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Visionary",
            "preview": "A fighter/mage that uses magic to see briefly into the future to divine the best possible outcomes of their attacks, covering close and long ranges with spears and javelins and using planning and foresight to win",
            "num_requirements": 3,
            "known_requirements": [
                "Heavy Throwing Weapons Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Voidwalker",
            "preview": "A rogue/mage specializing in magic to move short or great distances. He knows additional spells to protect himself and his party and move through the ethereal, and his spells are greatly beneficial to allies despite being powered by dark magic.",
            "num_requirements": 4,
            "known_requirements": [
                "Stealth: Sneak Rank A",
                "Dark Magic Rank A",
                "Conjuration Magic Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Warlock",
            "preview": "A mage that gains chaotic divine powers from Aloys, Phaxet, or Dren. They perform rituals in their god's name and are granted visions and tasks from their deity. They must swear a binding oath to their god of choice and be of matching alignment. Ability branches have varying power based on which god is followed.",
            "num_requirements": 3,
            "known_requirements": [
                "Enchantment Magic Rank A"
            ],
            "all_reqs_known": false
        },
        {
            "type": "class",
            "name": "Warlord",
            "preview": "A fighter/ranger that fights at both short range and long range. Switching between weapons allows them to continue inflicting damage at any range, and the class has a heavy emphasis on switching weapons often.",
            "num_requirements": 2,
            "known_requirements": [
                "Any Melee Weapon (no Unarmed) Rank A",
                "Any Ranged Weapon Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "I could feel the scream trapped in my throat and could not tear my eyes away from the grisly spectacle before me. Blood dripped from the corpses pinned to the walls, and the sound of each drop threatened madness. The guilty and innocent lay here; eviscerated, torn to shreds, filled with holes. In a brief moment of poignant horror, I wondered how I would explain to the children. And I questioned what kind of man would lust for such senseless violence.",
            "description": "The Warlord is a fighter that understands the value of flexibility. Adept at fighting at close range with a variety of melee abilities and controlling longer ranges with a ranged weapon of their choice, the Warlord dominates the battlefield by abusing range advantages against less prepared foes. Diving in close against archers and mages, kiting other fighters, harrying enemies as they approach, this class can reliably put down a constant stream of damage and never wastes turns getting into position due to good mobility. The Warlord is rewarded, however, for switching between ranged and melee attacks frequently, forcing enemies to keep up with constantly changing tactics.",
            "requirements": [
                "Any Melee Weapon A (but not Unarmed Mastery)",
                "Any Ranged Weapon A"
            ],
            "branches": {
                "Close Range": "The Close Range branch gives options for attacking with a melee weapon of your choice.",
                "Long Range": "The Long Range branch gives options for attacking with a ranged weapon of your choice.",
                "Weapon Swap": "The Weapon Swap branch gives options for improved versions of the Weapon Swap Minor Action, granting additional bonuses and flexibility."
            },
            "passive": {
                "Calculated Aggression": "When you successfully deal physical damage with a melee weapon to a target, your next ranged attack becomes empowered for 50% increased physical damage. When you successfully deal physical damage with a ranged weapon to a target, your next melee attack becomes empowered for 50% increased physical damage. Calculated Aggression can trigger at most once per turn and the empowered effect does not stack."
            },
            "abilities": [
                "Pivot and Slash",
                "Knock Aside",
                "Crippling Blow",
                "Advancing Fire",
                "Hookshot",
                "Stopping Shot",
                "Weapon Swap: Roll",
                "Weapon Swap: Quaff",
                "Weapon Swap: Attack"
            ]
        },
        {
            "type": "class",
            "name": "Warper",
            "preview": "A rogue/mage that sets up for kills by using debilitating crowd control spells to paralyze or put its target to sleep, then uses teleportation magic to gap close and stab the target while it can't defend itself.",
            "num_requirements": 3,
            "known_requirements": [
                "Shortblade Mastery Rank A",
                "Conjuration Magic A",
                "Control Magic A"
            ],
            "all_reqs_known": true,
            "flavor_text": "Blink. An unsuspecting guard, a gate left ajar. Blink. A startled scullery maid, a kitchen cleaning supper. Blink. A resplendent armored door, a hall lined with busts and paintings. Blink. A rich tyrant, a place to die.",
            "description": "The Warper is an assassin that has augmented all of his techniques with magic. Instead of standard infiltration with lockpick and stealth, the Warper uses short range teleports to close gaps and move from shadow to shadow. Instead of the usual process of slitting throats and poisoning dinners, the Warper uses control magic to make their targets helpless. The Warper is all about the process of getting to your target and locking it down. It is an enabling class that allows you to execute on the fantasy of an assassin mage.",
            "requirements": [
                "Conjuration Magic Rank A",
                "Control Magic Rank A",
                "Shortblades Mastery Rank A"
            ],
            "branches": {
                "Stabbing": "The Stabbing branch gives options for executing enemies who have been debilitated by crowd control spells.",
                "Translocations": "The Translocations branch gives options for short range, silent teleports in order to gap close on enemies.",
                "Hexes": "The Hexes branch gives options for applying crowd control to enemies to set them up for the kill."
            },
            "passive": {
                "Opportunistic Predator": "When you make an attack against an enemy that is crowd controlled, gain 50% increased critical strike chance on that attack. This triggers at most only once per round."
            },
            "abilities": [
                "Quicksilver Dagger",
                "Sever Tendons",
                "Hunter's Knife",
                "From Nowhere",
                "Controlled Blink",
                "Dispersal",
                "Teleport Other",
                "Malign Gateway",
                "Stunbolt",
                "Ensorcelled Hibernation",
                "Dazzling Spray",
                "Fulminant Prism"
            ]
        },
        {
            "type": "class",
            "name": "Warrior",
            "preview": "A fighter that uses any weapon or armor. They are the most basic type of fighter, with a straightforward, aggressive fighting style, but are unique in their War Cries to buff themselves and nearby allies.",
            "num_requirements": 2,
            "known_requirements": [
                "Any Melee Weapon Mastery (no Unarmed) Rank A",
                "Any Armor Mastery Rank A"
            ],
            "all_reqs_known": true,
            "flavor_text": "We were lost in the heat of battle, our once advantageous position shattered like glass. Acrid, fetid smoke, tinged with the flavors of blood and bile, filled our lungs and threatened to steal our lives even as we were cut down by the dozens. We were green recruits in a war far too brutal for the most hardened of veterans. And it was his cry, that glorious call to arms, which saved us.",
            "description": "The Warrior is by nature a specialist. On the outside, he appears to be a run of the mill fighter that you might expect to see as a city guardsman or a caravanserai. However, the Warrior has made the simple act of waging war into a carefully measured process. The Warrior efficiently slays masses of foes while protecting his squad; he fells giant beasts while holding a defensive line; he is a centerpiece of calm when the rest of the team panics during an ambush. The warrior has simple and effective options for single and multi-target attacks, straightforward defensive techniques, and special warcries that provide buffs or apply conditions to large groups.",
            "requirements": [
                "Any melee weapon mastery skill at Rank A",
                "Any armor mastery skill at Rank A (but not Cloth Armor Mastery)"
            ],
            "branches": {
                "Assault": "The Assault branch provides options for single and multi-target damage dealing at melee ranges.",
                "Protect": "The Protect branch provides options for increasing one's defensive stats and blocking attacks.",
                "Warcry": "The Warcry branch provides options for buffs and conditions to be applied to allies and enemies that can hear you."
            },
            "passive": {
                "Warleader": "You gain 25% increased physical damage for each buff active on you. On your turn, you may end any buff on you of your choice as a free action to empower an ally who can hear you, increasing their next attack's damage by 25%."
            },
            "abilities": [
                "Spill Blood",
                "Cut Down",
                "Hack and Slash",
                "Summary Execution",
                "Shields Up",
                "Reinforce Armor",
                "Take Cover",
                "Paragon of Victory",
                "\"Charge!\"",
                "\"Fight me!\"",
                "\"Overcome!\"",
                "\"Kill them all!\""
            ]
        },
        {
            "type": "class",
            "name": "Water Duelist",
            "preview": "A fighter/mage that wields a whip in one hand and water magic in the other. Boasting the balanced, jack-of-all-trades style of water magic with the flexibility and speed of a whip, the class plays to a careful, combo focused style.",
            "num_requirements": 2,
            "known_requirements": [
                "Element Mastery: Water Rank A",
                "Weapon Mastery: Fine Rank A"
            ],
            "all_reqs_known": true
        },
        {
            "type": "class",
            "name": "Woodsman",
            "preview": "A fighter/archer who uses their trusty axe and shortbow to hunt game, assisted by all manner of game hunting traps. Right at home in the wild, this class carefully plans hunts with a variety of melee and ranged options augmented by carefully deployed traps.",
            "num_requirements": 3,
            "known_requirements": [
                "Weapon Mastery: Bows Rank A",
                "Axe Mastery Rank A"
            ],
            "all_reqs_known": false
        }
    ];

    // organize some of the things into smaller lists
    let abilities = {};
    for (let i = 0; i < all_abilities.length; i++) {
        abilities[all_abilities[i].name] = all_abilities[i];
    }

    let classes = {};
    for (let i = 0; i < all_classes.length; i++) {
        classes[all_classes[i].name] = all_classes[i];
    }


    // ################################################################################################################
    // Roll


    const Damage = {
        PHYSICAL: 'physical',
        PSYCHIC: 'psychic',
        FIRE: 'fire',
        WATER: 'water',
        EARTH: 'earth',
        AIR: 'air',
        ICE: 'ice',
        LIGHTNING: 'lightning',
        LIGHT: 'light',
        DARK: 'dark',
        HEALING: 'healing',
        ALL_MAGIC: 'all_magic',
        ALL: 'all',
    };


    // Type of a roll can vary. For example, an attack made with a melee weapon will result in a "physical" roll.
    // An spell attack results in a "magic" roll. Certain effects should only be applied to certain rolls. For example,
    // bonus damage on a melee weapon should not be applied to magic-type rolls.
    //
    const RollType = {
        PHYSICAL: 'roll_type_physical',
        PSYCHIC: 'roll_type_psychic',
        MAGIC: 'roll_type_magic',
        HEALING: 'roll_type_healing',
        ALL: 'roll_type_all',
    };


    // Roll time as a concept exists because of crits. Some effects only apply if a roll is a crit, but we need to
    // actually do the crit roll first to figure that out. Some effects modify the crit chance, so they need to be
    // applied before we do the crit roll.
    //
    const RollTime = {
        // Indicates that the effect can be applied before we roll for crit. This is the case for most effects.
        DEFAULT: 'roll_time_default',
        // Indicates that the effect should only be applied after we know whether or not a roll was a crit
        POST_CRIT: 'roll_time_post_crit',
    };


    class Roll {
        constructor(character, roll_type) {
            this.character = character;
            this.roll_type = roll_type;
            this.damages = {};
            this.multipliers = {};
            this.effects = [];

            this.stats = {};
            this.stat_multipliers = {};

            this.hidden_stats = {};
            this.skills = {};
            this.concentration_bonus = 0;
            this.initiative_bonus = 0;

            this.crit = false;
            this.crit_chance = 0;
            this.crit_damage_mod = 2;

            this.max_damage = false;
        }

        add_damage(value, type) {
            if (type in this.damages) {
                this.damages[type] = this.damages[type] + '+' + value;
            } else {
                this.damages[type] = value;
            }
        }

        add_multiplier(value, type, source) {
            if (!(type in this.multipliers)) {
                this.multipliers[type] = {};
            }

            if (!(source in this.multipliers[type])) {
                this.multipliers[type][source] = '%s'.format(value);
            } else {
                this.multipliers[type][source] = '%s+%s'.format(this.multipliers[type][source], value);
            }
        }

        add_effect(effect) {
            this.effects.push('<li>%s</li>'.format(effect));
        }

        add_stat_bonus(stat, bonus) {
            assert_not_null(stat, 'add_stat_bonus() stat');
            assert_not_null(bonus, 'add_stat_bonus() bonus');

            if (!(stat.name in this.stats)) {
                this.stats[stat.name] = '%s'.format(bonus);
            } else {
                this.stats[stat.name] = this.stats[stat.name] + '+%s'.format(bonus);
            }
        }

        add_stat_multiplier(stat, multiplier) {
            assert_not_null(stat, 'add_stat_multiplier() stat');
            assert_not_null(multiplier, 'add_stat_multiplier() multiplier');

            if (!(stat.name in this.stat_multipliers)) {
                this.stat_multipliers[stat.name] = '%s'.format(multiplier);
            } else {
                this.stat_multipliers[stat.name] = '%s+%s'.format(this.stat_multipliers[stat.name], multiplier);
            }
        }

        add_hidden_stat(hidden_stat, value) {
            if (!(hidden_stat in this.hidden_stats)) {
                this.hidden_stats[hidden_stat] = value;
            } else {
                this.hidden_stats[hidden_stat] += value;
            }
        }

        add_skill_bonus(skill, bonus) {
            if (!(skill.name in this.skills)) {
                this.skills[skill.name] = '%s'.format(bonus);
            } else {
                this.skills[skill.name] = this.skills[skill.name] + '+%s'.format(bonus);
            }
        }

        add_concentration_bonus(bonus) {
            this.concentration_bonus += bonus;
        }

        add_initiative_bonus(bonus) {
            this.initiative_bonus += bonus;
        }

        dump_multipliers() {
            const keys = Object.keys(this.multipliers);
            for (let i = 0; i < keys.length; i++) {
                const type = keys[i];
                const keys_2 = Object.keys(this.multipliers[type]);
                for (let j = 0; j < keys_2.length; j++) {
                    const source = keys_2[j];
                    log('Multiplier[type=' + type + ', source=' + source + ', string=' + this.multipliers[type][source] + ']');
                }
            }
        }

        copy_damages(other_roll) {
            const types = Object.keys(other_roll.damages);
            for (let i = 0; i < types.length; i++) {
                const type = types[i];
                const value = other_roll.damages[type];
                this.add_damage(value, type);
            }
        }

        copy_multipliers(other_roll) {
            const types = Object.keys(other_roll.multipliers);
            for (let i = 0; i < types.length; i++) {
                const type = types[i];
                const sources = Object.keys(other_roll.multipliers[type]);
                for (let j = 0; j < sources.length; j++) {
                    const source = sources[j];
                    const value = other_roll.multipliers[type][source];
                    this.add_multiplier(value, type, source);
                }
            }

            this.crit = other_roll.crit;
            this.crit_damage_mod = other_roll.crit_damage_mod;
        }

        get_multiplier_string(type) {
            const self = this;
            let multiplier_string = '1';

            let per_source_multipliers = {};
            if (type in self.multipliers) {
                Object.keys(self.multipliers[type]).forEach(function (source) {
                    if (!(source in per_source_multipliers)) {
                        per_source_multipliers[source] = [];
                    }

                    per_source_multipliers[source].push(self.multipliers[type][source]);
                });
            }

            if (type !== Damage.PHYSICAL && type !== Damage.PSYCHIC) {
                if (Damage.ALL_MAGIC in self.multipliers) {
                    Object.keys(self.multipliers[Damage.ALL_MAGIC]).forEach(function (source) {
                        if (!(source in per_source_multipliers)) {
                            per_source_multipliers[source] = [];
                        }

                        per_source_multipliers[source].push(self.multipliers[Damage.ALL_MAGIC][source]);
                    });
                }
            }

            if (Damage.ALL in self.multipliers) {
                Object.keys(self.multipliers[Damage.ALL]).forEach(function (source) {
                    if (!(source in per_source_multipliers)) {
                        per_source_multipliers[source] = [];
                    }

                    per_source_multipliers[source].push(self.multipliers[Damage.ALL][source]);
                });
            }

            Object.keys(per_source_multipliers).forEach(function (source) {
                const source_multipliers = '1+' + per_source_multipliers[source].join('+');
                multiplier_string = multiplier_string + '*(%s)'.format(source_multipliers);
            });

            return multiplier_string;
        }

        convert_to_max_damages() {
            const types = Object.keys(this.damages);
            for (let i = 0; i < types.length; i++) {
                const type = types[i];
                const original_value = this.damages[type];

                const dmg_pieces = original_value.split('+');
                let max_dmg = '';
                for (let j = 0; j < dmg_pieces.length; j++) {
                    const dmg_piece = dmg_pieces[j];
                    if (!dmg_piece.includes('d')) {
                        if (max_dmg === '') {
                            max_dmg = dmg_piece;
                        } else {
                            max_dmg = max_dmg + '+' + dmg_piece;
                        }

                    } else {
                        const count = parseInt(dmg_piece.split('d')[0]);
                        const die = dmg_piece.split('d')[1];

                        for (let k = 0; k < count; k++) {
                            if (max_dmg === '') {
                                max_dmg = die;
                            } else {
                                max_dmg = max_dmg + '+' + die;
                            }
                        }
                    }
                }

                this.damages[type] = max_dmg;
            }
        }

        roll() {
            const self = this;
            const rolls = {};

            if (self.max_damage) {
                self.convert_to_max_damages();
            }

            Object.keys(self.damages).forEach(function (type) {
                let dmg_str = '(%s)'.format(self.damages[type]);

                dmg_str = '%s*(%s)'.format(dmg_str, self.get_multiplier_string(type));

                if (self.crit) {
                    dmg_str = '(%s)*%s'.format(dmg_str, self.crit_damage_mod);
                }

                rolls[type] = 'round(%s)'.format(dmg_str);
            });

            return rolls;
        }

        // "amount" should be passed in as a regular number, e.g. pass "10" for a 10% increase
        add_crit_chance(amount) {
            this.crit_chance += amount;
        }

        // "amount" should be passed in as a regular number, e.g. pass "10" for a 10% increase
        add_crit_damage_mod(amount) {
            this.crit_damage_mod += amount / 100;
        }

        get_crit_chance() {
            const self = this;

            let final_crit_chance = self.character.get_stat(Stat.CRITICAL_HIT_CHANCE);

            // Crit chance may be upped by abilities. Add in that amount.
            final_crit_chance += self.crit_chance;

            // Crit chance may be upped by items. Add in that amount.
            if (Stat.CRITICAL_HIT_CHANCE.name in self.stats) {
                final_crit_chance += eval(self.stats[Stat.CRITICAL_HIT_CHANCE.name]);
            }

            // Crit chance can't go over 100%, which we'll interpret as 101 because of the crit chance math.
            return Math.min(101, final_crit_chance);
        }
    }


    // ################################################################################################################
    // Items


    const ItemType = {
        ACCESSORY: 'accessory',
        AXE: 'axe',
        ARMOR: 'armor',
        BLUNT: 'blunt',
        BULLETS: 'bullets',
        CROSSBOW: 'crossbow',
        HEAVY_THRoWING: 'heavy throwing',
        JAVELIN: 'javelin',
        LIGHT_THROWING: 'light throwing',
        LONGBLADE: 'longblade',
        LONGBOW: 'longbow',
        ORB: 'orb',
        POLEARM: 'polearm',
        SHIELD: 'shield',
        SHORTBLADE: 'shortblade',
        WAND: 'wand',
    };


    const ItemSlot = {
        MAIN_HAND: 'main_hand',
        OFFHAND: 'offhand',
        TWO_HAND: '2hand',
        HEAD: 'head',
        BODY: 'body',
        HANDS: 'hands',
        FEET: 'feet',
        NECK: 'neck',
        RING: 'ring',
        BELT: 'belt',
    };


    const ItemRarity = {
        MAGIC: 'magic',
        RARE: 'rare',
    };


    const ItemScaler = {
        MELEE: function (character, roll) {
            roll.add_damage(character.get_stat(Stat.MELEE_DAMAGE), Damage.PHYSICAL);
        },
        RANGED_FINE: function (character, roll) {
            roll.add_damage(character.get_stat(Stat.RANGED_FINE_DAMAGE), Damage.PHYSICAL);
        },
        // This one has to be called with a parameter to create the function
        OTHER: function (stat) {
            return function (character, roll) {
                roll.add_damage(character.get_stat(stat), Damage.PHYSICAL);
            }
        },
        NONE: function () {},
    };


    class Item {
        constructor(name, type, rarity, slot, equip_conditions, base_damage, damage_scaling, range, cantrips, notes, effects) {
            this.name = name;
            this.type = type;
            this.rarity = rarity;
            this.slot = slot;
            this.equip_conditions = equip_conditions;
            this.base_damage = base_damage;
            this.damage_scaling = damage_scaling;
            this.range = range;
            this.cantrips = cantrips;
            this.notes = notes;
            this.effects = effects;
        }
    }


    class Effect {
        constructor(roll_time, roll_type, effect) {
            this.roll_time = roll_time;
            this.roll_type = roll_type;
            this.apply = effect;
        }

        static no_op_roll_effect() {
            return new Effect(RollTime.DEFAULT, RollType.ALL, function () {});
        }

        static stat_effect(stat, mod) {
            assert_not_null(stat, 'stat_effect() stat');
            assert_not_null(mod, 'stat_effect() mod');

            return new Effect(RollTime.DEFAULT, RollType.ALL, function (roll) {
                roll.add_stat_bonus(stat, mod);
            });
        }

        static skill_effect(skill, mod) {
            assert_not_null(skill, 'skill_effect() skill');
            assert_not_null(mod, 'skill_effect() mod');

            return new Effect(RollTime.DEFAULT, RollType.ALL, function (roll) {
                roll.add_skill_bonus(skill, mod);
            });
        }

        static concentration_bonus(bonus) {
            assert_not_null(bonus, 'concentration_bonus() bonus');

            return new Effect(RollTime.DEFAULT, RollType.ALL, function (roll) {
                roll.add_concentration_bonus(bonus);
            });
        }

        static initiative_bonus(bonus) {
            assert_not_null(bonus, 'initiative_bonus() bonus');

            return new Effect(RollTime.DEFAULT, RollType.ALL, function (roll) {
                roll.add_initiative_bonus(bonus);
            });
        }

        static roll_damage(dmg, dmg_type, applicable_roll_type) {
            assert_not_null(dmg, 'roll_damage(), dmg');
            assert_not_null(dmg_type, 'roll_damage(), dmg_type');
            assert_not_null(applicable_roll_type, 'roll_damage(), applicable_roll_type');

            return new Effect(RollTime.DEFAULT, applicable_roll_type, function (roll) {
                if (applicable_roll_type === RollType.ALL || applicable_roll_type === roll.roll_type) {
                    roll.add_damage(dmg, dmg_type);
                }
            });
        }

        static roll_multiplier(value, dmg_type, applicable_roll_type) {
            assert_not_null(value, 'roll_multiplier() value');
            assert_not_null(dmg_type, 'roll_multiplier() dmg_type');
            assert_not_null(applicable_roll_type, 'roll_multiplier() applicable_roll_type');

            return new Effect(RollTime.DEFAULT, applicable_roll_type, function (roll) {
                if (applicable_roll_type === RollType.ALL || applicable_roll_type === roll.roll_type) {
                    roll.add_multiplier(value, dmg_type, 'self');
                }
            });
        }

        static roll_effect(effect, applicable_roll_type) {
            assert_not_null(effect, 'roll_effect() effect');
            assert_not_null(applicable_roll_type, 'roll_effect() applicable_roll_type');

            return new Effect(RollTime.DEFAULT, applicable_roll_type, function (roll) {
                if (applicable_roll_type === RollType.ALL || applicable_roll_type === roll.roll_type) {
                    roll.add_effect(effect);
                }
            });
        }

        static crit_effect(effect, applicable_roll_type) {
            assert_not_null(effect, 'crit_effect() effect');
            assert_not_null(applicable_roll_type, 'crit_effect() applicable_roll_type');

            return new Effect(RollTime.POST_CRIT, applicable_roll_type, function (roll) {
                if (applicable_roll_type === RollType.ALL || applicable_roll_type === roll.roll_type) {
                    if (roll.crit) {
                        roll.add_effect(effect);
                    }
                }
            });
        }

        static crit_damage(dmg, dmg_type, applicable_roll_type) {
            assert_not_null(dmg, 'crit_damage() dmg');
            assert_not_null(dmg_type, 'crit_damage() dmg_type');
            assert_not_null(applicable_roll_type, 'crit_damage() applicable_roll_type');

            return new Effect(RollTime.POST_CRIT, applicable_roll_type, function (roll) {
                if (applicable_roll_type === RollType.ALL || applicable_roll_type === roll.roll_type) {
                    if (roll.crit) {
                        roll.add_damage(dmg, dmg_type);
                    }
                }
            });
        }

        static crit_damage_mod(amount) {
            assert_not_null(amount, 'crit_damage_mod() amount');

            return new Effect(RollTime.DEFAULT, RollType.PHYSICAL, function (roll) {
                if (roll.roll_type === RollType.PHYSICAL) {
                    roll.add_crit_damage_mod(amount);
                }
            });
        }

        static hidden_stat(hidden_stat, value, applicable_roll_type) {
            assert_not_null(value, 'hidden_stat() value');
            assert_not_null(hidden_stat, 'hidden_stat() stat');
            assert_not_null(applicable_roll_type, 'hidden_stat() applicable_roll_type');

            return new Effect(RollTime.DEFAULT, applicable_roll_type, function (roll) {
                if (applicable_roll_type === RollType.ALL || applicable_roll_type === roll.roll_type) {
                    roll.add_hidden_stat(hidden_stat, value);
                }
            });
        }

        static crit_hidden_stat(hidden_stat, value, applicable_roll_type) {
            assert_not_null(value, 'crit_hidden_stat() value');
            assert_not_null(hidden_stat, 'crit_hidden_stat() stat');
            assert_not_null(applicable_roll_type, 'crit_hidden_stat() applicable_roll_type');

            return new Effect(RollTime.POST_CRIT, applicable_roll_type, function (roll) {
                if (applicable_roll_type === RollType.ALL || applicable_roll_type === roll.roll_type) {
                    if (roll.crit) {
                        roll.add_hidden_stat(hidden_stat, value);
                    }
                }
            });
        }
    }


    function skill_condition(skill, rank) {
        return function (character) {
            return character.has_skill_req(skill, rank);
        };
    }


    const ITEMS = [
        new Item(
            'Longbow of Stunning',
            ItemType.LONGBOW,
            ItemRarity.MAGIC,
            ItemSlot.TWO_HAND,
            [
                skill_condition('Weapons: Bows', 'F'),
            ],
            Effect.roll_damage('d8', Damage.PHYSICAL, RollType.PHYSICAL),
            ItemScaler.RANGED_FINE,
            0, [], '',
            [
                Effect.crit_effect('Stun', RollType.PHYSICAL),
            ]
        ),

        new Item(
            'Longbow of Flames',
            ItemType.LONGBOW,
            ItemRarity.MAGIC,
            ItemSlot.TWO_HAND,
            [
                skill_condition('Weapons: Bows', 'F'),
            ],
            Effect.roll_damage('d6', Damage.PHYSICAL, RollType.PHYSICAL),
            ItemScaler.RANGED_FINE,
            0, [], '',
            [
                Effect.roll_damage('3d10', Damage.FIRE, RollType.PHYSICAL),
            ]
        ),

        new Item(
            'Leather Cap of Serenity',
            ItemType.ARMOR,
            ItemRarity.MAGIC,
            ItemSlot.HEAD,
            [
                skill_condition('Armor: Light', 'F'),
            ],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.EVASION, 5),
                Effect.stat_effect(Stat.HEALTH_REGENERATION, 10),
            ]
        ),

        new Item(
            "Hunter's Longcoat of Resistance",
            ItemType.ARMOR,
            ItemRarity.MAGIC,
            ItemSlot.BODY,
            [
                skill_condition('Armor: Light', 'F'),
            ],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.EVASION, 20),
                Effect.stat_effect(Stat.MAGIC_RESIST, 10),
            ]
        ),

        new Item(
            "Viper's Gloves of Dodging",
            ItemType.ARMOR,
            ItemRarity.MAGIC,
            ItemSlot.FEET,
            [
                skill_condition('Armor: Light', 'F'),
            ],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.EVASION, 15),
                Effect.stat_effect(Stat.CONDITION_RESIST, 10),
            ]
        ),

        new Item(
            'Leather Sandals of Slickness',
            ItemType.ARMOR,
            ItemRarity.MAGIC,
            ItemSlot.FEET,
            [
                skill_condition('Armor: Light', 'F'),
            ],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.EVASION, 15),
                Effect.stat_effect(Stat.STAMINA_REGENERATION, 10),
                Effect.stat_effect(Stat.AC, -10),
            ]
        ),

        new Item(
            'Cleansing Brooch of Mana Storage',
            ItemType.ACCESSORY,
            ItemRarity.MAGIC,
            ItemSlot.NECK,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0,
            ['Expend 30 mana as Major action to cleanse 1 condition on yourself. 30 excess mana releases when you use the cantrip.'],
            '',
            []
        ),

        new Item(
            'Ring of Archery',
            ItemType.ACCESSORY,
            ItemRarity.MAGIC,
            ItemSlot.RING,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                new Effect(RollTime.DEFAULT, RollType.PHYSICAL, function (roll) {
                    if (roll.character.is_using('longbow') || roll.character.is_using('crossbow')) {
                        roll.add_multiplier(0.5, Damage.PHYSICAL, 'self');
                    }
                })
            ]
        ),

        new Item(
            'Energetic Ring of the Mind',
            ItemType.ACCESSORY,
            ItemRarity.MAGIC,
            ItemSlot.RING,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.STAMINA, 30),
                Effect.stat_effect(Stat.MANA, 40),
            ]
        ),

        new Item(
            'Invigorated Belt of Greater Stamina',
            ItemType.ACCESSORY,
            ItemRarity.MAGIC,
            ItemSlot.BELT,
            [
                skill_condition('Armor: Light', 'F'),
            ],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.STAMINA, 60),
                Effect.stat_effect(Stat.STAMINA_REGENERATION, 15),
            ]
        ),

        new Item(
            'Resistant Hat of Dodging',
            ItemType.ARMOR,
            ItemRarity.MAGIC,
            ItemSlot.HEAD,
            [
                skill_condition('Armor: Light', 'F'),
            ],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.EVASION, 20),
                Effect.stat_effect(Stat.MAGIC_RESIST, 10),
                Effect.stat_effect(Stat.AC, -10),
            ]
        ),

        new Item(
            "Viper's Vest of Dodging",
            ItemType.ARMOR,
            ItemRarity.MAGIC,
            ItemSlot.BODY,
            [
                skill_condition('Armor: Light', 'F'),
            ],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.EVASION, 20),
                Effect.stat_effect(Stat.CONDITION_RESIST, 10),
                Effect.stat_effect(Stat.AC, -10),
            ]
        ),

        new Item(
            "Viper's Gloves of Evasion",
            ItemType.ARMOR,
            ItemRarity.MAGIC,
            ItemSlot.HANDS,
            [
                skill_condition('Armor: Light', 'F'),
            ],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.EVASION, 20),
                Effect.stat_effect(Stat.CONDITION_RESIST, 10),
                Effect.stat_effect(Stat.AC, -10),
            ]
        ),

        new Item(
            "Mage’s Amulet of Cleansing",
            ItemType.ACCESSORY,
            ItemRarity.MAGIC,
            ItemSlot.NECK,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0,
            ['Expend 30 mana as a Major Action to clease 1 condition on yourself'],
            '',
            [
                Effect.stat_effect(Stat.MANA, 40),
            ]
        ),

        new Item(
            'Ring of Slaying',
            ItemType.ACCESSORY,
            ItemRarity.MAGIC,
            ItemSlot.RING,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.roll_multiplier(0.3, Damage.PHYSICAL, RollType.ALL)
            ]
        ),

        new Item(
            "Beast’s Belt of the Worker",
            ItemType.ACCESSORY,
            ItemRarity.MAGIC,
            ItemSlot.BELT,
            [
                skill_condition('Armor: Light', 'F'),
            ],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.HEALTH, 40),
                Effect.stat_effect(Stat.STAMINA, 40),
            ]
        ),

        new Item(
            "Angel’s Longbow of Accuracy",
            ItemType.LONGBOW,
            ItemRarity.MAGIC,
            ItemSlot.MAIN_HAND,
            [
                skill_condition('Weapons: Bows', 'F'),
            ],
            Effect.roll_damage('d10', Damage.PHYSICAL, RollType.PHYSICAL),
            ItemScaler.RANGED_FINE,
            0, [], '',
            [
                Effect.roll_damage('4d10', Damage.LIGHT, RollType.PHYSICAL),
                Effect.hidden_stat(HiddenStat.ACCURACY, 20, RollType.PHYSICAL),
            ]
        ),

        new Item(
            "Slaying Featherfall Sneakers of Speedy Evasion",
            ItemType.ARMOR,
            ItemRarity.RARE,
            ItemSlot.FEET,
            [
                skill_condition('Armor: Light', 'F'),
            ],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [],
            'You take no fall damage',
            [
                Effect.stat_effect(Stat.EVASION, 20),
                Effect.stat_effect(Stat.MOVEMENT_SPEED, 20),
                Effect.stat_effect(Stat.AC, -10),
                Effect.roll_multiplier(0.3, Damage.PHYSICAL, RollType.ALL),
            ]
        ),

        new Item(
            "Earthen Bladeshield of Hacking",
            ItemType.SHIELD,
            ItemRarity.MAGIC,
            ItemSlot.MAIN_HAND,
            [
                skill_condition('Weapons: Shields', 'F'),
            ],
            Effect.roll_damage('d8', Damage.PHYSICAL, RollType.PHYSICAL),
            ItemScaler.MELEE,
            0, [], '',
            [
                Effect.roll_damage('2d8', Damage.PHYSICAL, RollType.PHYSICAL),
                Effect.roll_damage('2d10', Damage.EARTH, RollType.PHYSICAL),
            ]
        ),

        new Item(
            "Paralyzing Shield of Accuracy",
            ItemType.SHIELD,
            ItemRarity.MAGIC,
            ItemSlot.OFFHAND,
            [
                skill_condition('Weapons: Shields', 'F'),
            ],
            Effect.roll_damage('d10', Damage.PHYSICAL, RollType.PHYSICAL),
            ItemScaler.MELEE,
            0, [], '',
            [
                Effect.hidden_stat(HiddenStat.ACCURACY, 20, RollType.PHYSICAL),
                Effect.hidden_stat(HiddenStat.PARALYZE, 30, RollType.PHYSICAL),
            ]
        ),

        new Item(
            'Shocking Band of Critical Strikes',
            ItemType.ACCESSORY,
            ItemRarity.MAGIC,
            ItemSlot.RING,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.roll_damage('2d8', Damage.LIGHTNING, RollType.ALL),
                Effect.stat_effect(Stat.CRITICAL_HIT_CHANCE, 5),
            ]
        ),

        new Item(
            'Impeding Quickblade of Normalizing',
            ItemType.SHORTBLADE,
            ItemRarity.MAGIC,
            ItemSlot.MAIN_HAND,
            [],
            Effect.roll_damage('d4', Damage.PHYSICAL, RollType.PHYSICAL),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.CRITICAL_HIT_CHANCE, 20),
                Effect.crit_hidden_stat(HiddenStat.BUFF_STRIP, 1, RollType.PHYSICAL),
                Effect.crit_hidden_stat(HiddenStat.REDUCE_EVASION, 10, RollType.PHYSICAL),
            ]
        ),

        new Item(
            'Sharpened Penetrating Moonblade of Waves',
            ItemType.SHORTBLADE,
            ItemRarity.MAGIC,
            ItemSlot.MAIN_HAND,
            [],
            Effect.roll_damage('2d4', Damage.PHYSICAL, RollType.PHYSICAL),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.CRITICAL_HIT_CHANCE, 10),
                Effect.crit_damage_mod(100),
                Effect.crit_effect('Ignore blocks and shielding', RollType.PHYSICAL),
                Effect.crit_damage('3d6', Damage.WATER, RollType.PHYSICAL),
            ]
        ),

        new Item(
            'Seeking Dagger of Paralysis',
            ItemType.SHORTBLADE,
            ItemRarity.MAGIC,
            ItemSlot.MAIN_HAND,
            [],
            Effect.roll_damage('d4', Damage.PHYSICAL, RollType.PHYSICAL),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.roll_effect('When thrown, this dagger cannot miss', RollType.PHYSICAL),
                Effect.roll_effect('Inflict Paralysis', RollType.PHYSICAL),
            ]
        ),

        new Item(
            "Battlemage's Wand of Glacial Rage",
            ItemType.WAND,
            ItemRarity.RARE,
            ItemSlot.MAIN_HAND,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.roll_multiplier(0.1, Damage.ALL_MAGIC, RollType.MAGIC),
                Effect.hidden_stat(HiddenStat.ICE_MAGIC_PENETRATION, 50, RollType.MAGIC),
                Effect.roll_multiplier(0.25, Damage.ICE, RollType.MAGIC),
            ]
        ),

        new Item(
            "Phasing Blizzard's Glimmering Orb of Debilitating Sorcery",
            ItemType.ORB,
            ItemRarity.RARE,
            ItemSlot.OFFHAND,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.hidden_stat(HiddenStat.GENERAL_MAGIC_PENETRATION, 20, RollType.MAGIC),
                Effect.hidden_stat(HiddenStat.REDUCE_CR, 5, RollType.MAGIC),
                Effect.roll_multiplier(0.3, Damage.ICE, RollType.MAGIC),
                Effect.roll_multiplier(0.2, Damage.ICE, RollType.MAGIC),
            ]
        ),

        new Item(
            "Mage’s Resilient Hood of Accurate Concentration",
            ItemType.ARMOR,
            ItemRarity.RARE,
            ItemSlot.HEAD,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.MAGIC_RESIST, 20),
                Effect.stat_effect(Stat.AC, -20),
                Effect.stat_effect(Stat.MANA, 40),
                Effect.hidden_stat(HiddenStat.ACCURACY, 20, RollType.ALL),
                Effect.concentration_bonus(30),
            ]
        ),

        new Item(
            "Mage’s Meditating Resilient Vest of the Healing Beast",
            ItemType.ARMOR,
            ItemRarity.RARE,
            ItemSlot.BODY,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.MAGIC_RESIST, 20),
                Effect.stat_effect(Stat.AC, -20),
                Effect.stat_effect(Stat.MANA, 60),
                Effect.stat_effect(Stat.MANA_REGENERATION, 20),
                Effect.stat_effect(Stat.HEALTH, 60),
                Effect.roll_multiplier(0.3, Damage.HEALING, RollType.HEALING),
            ]
        ),

        new Item(
            "Unblockable Accurate Resilient Gloves of Phasing Chills",
            ItemType.ARMOR,
            ItemRarity.RARE,
            ItemSlot.HANDS,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.MAGIC_RESIST, 20),
                Effect.stat_effect(Stat.AC, -20),
                Effect.hidden_stat(HiddenStat.UNBLOCKABLE_CHANCE, 20, RollType.ALL),
                Effect.hidden_stat(HiddenStat.ACCURACY, 20, RollType.ALL),
                Effect.hidden_stat(HiddenStat.GENERAL_MAGIC_PENETRATION, 10, RollType.ALL),
                Effect.hidden_stat(HiddenStat.ICE_MAGIC_PENETRATION, 25, RollType.ALL),
            ]
        ),

        new Item(
            "Mage’s Meditating Resilient Shoes of Speed",
            ItemType.ARMOR,
            ItemRarity.RARE,
            ItemSlot.FEET,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.MAGIC_RESIST, 20),
                Effect.stat_effect(Stat.AC, -20),
                Effect.stat_effect(Stat.MANA, 40),
                Effect.stat_effect(Stat.MANA_REGENERATION, 15),
                Effect.stat_effect(Stat.MOVEMENT_SPEED, 20),
            ]
        ),

        new Item(
            "Mage’s Concentrating Skillful Amulet of Healing",
            ItemType.ARMOR,
            ItemRarity.RARE,
            ItemSlot.NECK,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.MANA, 40),
                Effect.concentration_bonus(20),
                Effect.roll_multiplier(0.3, Damage.HEALING, RollType.HEALING),
            ]
        ),

        new Item(
            "Unblockable Phasing Skillful Ring of Sorcerous Blizzards",
            ItemType.ARMOR,
            ItemRarity.RARE,
            ItemSlot.RING,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.roll_multiplier(0.2, Damage.ALL_MAGIC, RollType.MAGIC),
                Effect.roll_multiplier(0.3, Damage.ICE, RollType.MAGIC),
                Effect.hidden_stat(HiddenStat.GENERAL_MAGIC_PENETRATION, 15, RollType.ALL),
                Effect.hidden_stat(HiddenStat.UNBLOCKABLE_CHANCE, 10, RollType.ALL),
            ]
        ),

        new Item(
            "Mage’s Skillful Belt of the Bestial Antidote",
            ItemType.ARMOR,
            ItemRarity.RARE,
            ItemSlot.RING,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.MANA, 40),
                Effect.stat_effect(Stat.HEALTH, 50),
                // TODO poison specifically: Effect.stat_effect('condition resist', 50),
            ]
        ),

        new Item(
            "Ring of Critical Damage",
            ItemType.ACCESSORY,
            ItemRarity.MAGIC,
            ItemSlot.RING,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.crit_damage_mod(100),
            ]
        ),

        new Item(
            "Bestial Skillful Belt of the Working Mage",
            ItemType.ACCESSORY,
            ItemRarity.RARE,
            ItemSlot.BELT,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.HEALTH, 40),
                Effect.stat_effect(Stat.STAMINA, 40),
                Effect.stat_effect(Stat.MANA, 40),
                Effect.skill_effect(Skill.ATHLETICS_BALANCE, 30),
            ]
        ),

        new Item(
            "Energetic Enchanted Band of Lucky Blows",
            ItemType.ACCESSORY,
            ItemRarity.MAGIC,
            ItemSlot.RING,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.STAMINA, 30),
                Effect.stat_effect(Stat.CRITICAL_HIT_CHANCE, 5),
            ]
        ),

        new Item(
            "Bestial Worker’s Skillful Amulet of the Counterspelling Mage",
            ItemType.ACCESSORY,
            ItemRarity.RARE,
            ItemSlot.NECK,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0,
            [
                'Spend 40 mana as a reaction to counter a spell within 30 ft',
            ],
            '',
            [
                Effect.skill_effect(Skill.MAGIC_CONJURATION, 30),
                Effect.stat_effect(Stat.HEALTH, 30),
                Effect.stat_effect(Stat.STAMINA, 30),
                Effect.stat_effect(Stat.MANA, 30),
            ]
        ),

        new Item(
            "Steadfast Resilient Slippers of Quickness",
            ItemType.ARMOR,
            ItemRarity.RARE,
            ItemSlot.FEET,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.CONDITION_RESIST, 20),
                Effect.stat_effect(Stat.AC, -20),
                Effect.stat_effect(Stat.MAGIC_RESIST, 15),
                // TODO 50% stun resist
                // TODO 50% slow resist
            ]
        ),

        new Item(
            "Worker’s Resistant Resilient Gloves of the Evasive Viper",
            ItemType.ARMOR,
            ItemRarity.RARE,
            ItemSlot.HANDS,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.AC, -20),
                Effect.stat_effect(Stat.MAGIC_RESIST, 20),
                Effect.stat_effect(Stat.STAMINA, 40),
                Effect.stat_effect(Stat.CONDITION_RESIST, 10),
                Effect.stat_effect(Stat.MAGIC_RESIST, 10),
                Effect.stat_effect(Stat.EVASION, 10),
            ]
        ),

        new Item(
            "Raptor's Resilient Shawl of the Championed Wizard",
            ItemType.ARMOR,
            ItemRarity.RARE,
            ItemSlot.HANDS,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.AC, -20),
                Effect.stat_effect(Stat.MAGIC_RESIST, 20),
                Effect.stat_effect(Stat.CONDITION_RESIST, 15),
                Effect.stat_effect(Stat.MAGIC_RESIST, 15),
                Effect.stat_effect(Stat.HEALTH, 55),
            ]
        ),

        new Item(
            "Phasing Powerful Sharpened Knife of Stripping Penetration",
            ItemType.SHORTBLADE,
            ItemRarity.RARE,
            ItemSlot.MAIN_HAND,
            [],
            Effect.roll_damage('2d4', Damage.PHYSICAL, RollType.PHYSICAL),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.CRITICAL_HIT_CHANCE, 10),
                Effect.crit_damage_mod(100),
                Effect.crit_effect('Ignore 100% of target AC', RollType.PHYSICAL),
                Effect.crit_effect('Strip 2 buffs from target', RollType.PHYSICAL),
                Effect.crit_damage('7d10', Damage.PHYSICAL, RollType.PHYSICAL),
            ]
        ),

        new Item(
            "Insulated Resilient Parrying Dagger of Shaded Work",
            ItemType.SHORTBLADE,
            ItemRarity.RARE,
            ItemSlot.OFFHAND,
            [],
            Effect.roll_damage('d4', Damage.PHYSICAL, RollType.PHYSICAL),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.EVASION, 20),
                Effect.stat_effect(Stat.AC, -20),
                Effect.stat_effect(Stat.STAMINA, 30),
                // TODO: 20% Lightning MR
                // TODO: 20% Light MR
            ]
        ),

        new Item(
            "Evasive Pristine Robes of Resistance",
            ItemType.ARMOR,
            ItemRarity.RARE,
            ItemSlot.BODY,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.MAGIC_RESIST, 10),
                Effect.stat_effect(Stat.AC, -10),
                Effect.stat_effect(Stat.EVASION, 10),
                Effect.stat_effect(Stat.CONDITION_RESIST, 10),
                Effect.stat_effect(Stat.MAGIC_RESIST, 30),
            ]
        ),

        new Item(
            "Resistant Viper's Enchanted Helm of Accurate Solidarity",
            ItemType.ARMOR,
            ItemRarity.RARE,
            ItemSlot.HEAD,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.MAGIC_RESIST, 10),
                Effect.stat_effect(Stat.AC, 10),
                Effect.stat_effect(Stat.EVASION, -10),
                Effect.stat_effect(Stat.CONDITION_RESIST, 10),
                Effect.hidden_stat(HiddenStat.ACCURACY, 20, RollType.ALL),
                // TODO: 50% Stun CR
            ]
        ),

        new Item(
            "Resistant Viper's Enchanted Chestplate of the Working Beast",
            ItemType.ARMOR,
            ItemRarity.RARE,
            ItemSlot.BODY,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.MAGIC_RESIST, 10),
                Effect.stat_effect(Stat.AC, 10),
                Effect.stat_effect(Stat.EVASION, -10),
                Effect.stat_effect(Stat.CONDITION_RESIST, 10),
                Effect.stat_effect(Stat.HEALTH, 50),
                Effect.stat_effect(Stat.STAMINA, 50),
            ]
        ),

        new Item(
            "Resistant Viper's Enchanted Gauntlets of the Working Beast",
            ItemType.ARMOR,
            ItemRarity.RARE,
            ItemSlot.HANDS,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.MAGIC_RESIST, 10),
                Effect.stat_effect(Stat.AC, 10),
                Effect.stat_effect(Stat.EVASION, -10),
                Effect.stat_effect(Stat.CONDITION_RESIST, 10),
                Effect.stat_effect(Stat.HEALTH, 50),
                Effect.stat_effect(Stat.STAMINA, 50),
            ]
        ),

        new Item(
            "Resistant Viper's Enchanted Greaves of Solid Adamantium",
            ItemType.ARMOR,
            ItemRarity.RARE,
            ItemSlot.FEET,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.MAGIC_RESIST, 10),
                Effect.stat_effect(Stat.AC, 10),
                Effect.stat_effect(Stat.EVASION, -10),
                Effect.stat_effect(Stat.CONDITION_RESIST, 10),
                // TODO: 50% Stun Resist
                // TODO: 15% Crit Strike Resist
            ]
        ),

        new Item(
            "Resistant Viper's Enchanted Amulet of the Working Beast",
            ItemType.ARMOR,
            ItemRarity.RARE,
            ItemSlot.NECK,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.MAGIC_RESIST, 10),
                Effect.stat_effect(Stat.CONDITION_RESIST, 10),
                Effect.stat_effect(Stat.HEALTH, 50),
                Effect.stat_effect(Stat.STAMINA, 50),
            ]
        ),

        new Item(
            "Powerful Slaying Skillful Ring of Accurate Minion Slaying",
            ItemType.ARMOR,
            ItemRarity.RARE,
            ItemSlot.RING,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.hidden_stat(HiddenStat.ACCURACY, 20, RollType.ALL),
                Effect.roll_damage('3d10', Damage.PHYSICAL, RollType.ALL),
                Effect.roll_multiplier(0.2, Damage.PHYSICAL, RollType.ALL),
                //TODO: 20% Minion Lethality
            ]
        ),

        new Item(
            "Powerful Slaying Enchanted Ring of Accuracy",
            ItemType.ARMOR,
            ItemRarity.RARE,
            ItemSlot.RING,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.hidden_stat(HiddenStat.ACCURACY, 25, RollType.ALL),
                Effect.roll_damage('4d10', Damage.PHYSICAL, RollType.ALL),
                Effect.roll_multiplier(0.3, Damage.PHYSICAL, RollType.ALL),
                // TODO: 20% Minion Lethality
            ]
        ),

        new Item(
            "Resistant Viper's Enchanted Buckle of the Working Beast",
            ItemType.ARMOR,
            ItemRarity.RARE,
            ItemSlot.BELT,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.NONE,
            0, [], '',
            [
                Effect.stat_effect(Stat.MAGIC_RESIST, 10),
                Effect.stat_effect(Stat.CONDITION_RESIST, 10),
                Effect.stat_effect(Stat.HEALTH, 40),
                Effect.stat_effect(Stat.STAMINA, 40),
            ]
        ),

        new Item(
            "Slayer",
            ItemType.SHIELD,
            ItemRarity.RARE,
            ItemSlot.MAIN_HAND,
            [
                skill_condition('Weapons: Shields', '5'),
            ],
            Effect.roll_damage('d10', Damage.PHYSICAL, RollType.PHYSICAL),
            ItemScaler.MELEE,
            0, [], '',
            [
                Effect.roll_damage('4d10', Damage.PHYSICAL, RollType.PHYSICAL),
                Effect.roll_multiplier(0.2, Damage.PHYSICAL, RollType.ALL),
                Effect.hidden_stat(HiddenStat.ACCURACY, 20, RollType.ALL),
                // TODO: 50% Minion Lethality
            ]
        ),

        new Item(
            "Vladsbane",
            ItemType.SHIELD,
            ItemRarity.RARE,
            ItemSlot.OFFHAND,
            [
                skill_condition('Weapons: Shields', '5'),
            ],
            Effect.roll_damage('d10', Damage.PHYSICAL, RollType.PHYSICAL),
            ItemScaler.MELEE,
            0, [], '',
            [
                Effect.roll_multiplier(0.4, Damage.PHYSICAL, RollType.ALL),
                Effect.stat_effect(Stat.CONDITION_RESIST, 10),
                // TODO: 70% Minion Lethality
                // TODO: 15% Critical Strike Resist
            ]
        ),

        new Item(
            "Powerful Slaying Sharpened Warhammer of Penetrating Cripples",
            ItemType.BLUNT,
            ItemRarity.RARE,
            ItemSlot.MAIN_HAND,
            [],
            Effect.roll_damage('2d12', Damage.PHYSICAL, RollType.PHYSICAL),
            ItemScaler.MELEE,
            0, [], '',
            [
                Effect.hidden_stat(HiddenStat.CRIPPLE_CHANCE, 20, RollType.PHYSICAL),
                Effect.roll_damage('6d10', Damage.PHYSICAL, RollType.PHYSICAL),
                Effect.roll_multiplier(0.3, Damage.PHYSICAL, RollType.PHYSICAL),
                Effect.hidden_stat(HiddenStat.AC_PENETRATION, 30, RollType.PHYSICAL),
                Effect.hidden_stat(HiddenStat.CRIPPLE_CHANCE, 20, RollType.PHYSICAL),
            ]
        ),

        new Item(
            "Resistant Worker's Greathelm of Bestial Stun Resist",
            ItemType.ARMOR,
            ItemRarity.RARE,
            ItemSlot.HEAD,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.MELEE,
            0, [], '',
            [
                Effect.stat_effect(Stat.AC, 10),
                Effect.stat_effect(Stat.EVASION, -10),
                Effect.stat_effect(Stat.MAGIC_RESIST, 10),
                Effect.stat_effect(Stat.STAMINA, 40),
                Effect.stat_effect(Stat.HEALTH, 40),
                // TODO: 50% stun resist
            ]
        ),

        new Item(
            "Resistant Worker's Chestplate of Bestial Slow Resist",
            ItemType.ARMOR,
            ItemRarity.RARE,
            ItemSlot.HEAD,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.MELEE,
            0, [], '',
            [
                Effect.stat_effect(Stat.AC, 10),
                Effect.stat_effect(Stat.EVASION, -10),
                Effect.stat_effect(Stat.MAGIC_RESIST, 10),
                Effect.stat_effect(Stat.STAMINA, 50),
                Effect.stat_effect(Stat.HEALTH, 50),
                // TODO: 50% slow resist
            ]
        ),

        new Item(
            "Resistant Accurate Gauntlets of Penetrating Cripple Resist",
            ItemType.ARMOR,
            ItemRarity.RARE,
            ItemSlot.HEAD,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.MELEE,
            0, [], '',
            [
                Effect.stat_effect(Stat.AC, 10),
                Effect.stat_effect(Stat.EVASION, -10),
                Effect.stat_effect(Stat.MAGIC_RESIST, 10),
                Effect.hidden_stat(HiddenStat.AC_PENETRATION, 20, RollType.PHYSICAL),
                Effect.hidden_stat(HiddenStat.ACCURACY, 20, RollType.PHYSICAL),
                // TODO: 50% cripple resist
            ]
        ),

        new Item(
            "Resistant Speedy Greaves of Bestial Immobilize",
            ItemType.ARMOR,
            ItemRarity.RARE,
            ItemSlot.HEAD,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.MELEE,
            0, [], '',
            [
                Effect.stat_effect(Stat.AC, 10),
                Effect.stat_effect(Stat.EVASION, -10),
                Effect.stat_effect(Stat.MAGIC_RESIST, 10),
                Effect.stat_effect(Stat.MOVEMENT_SPEED, 20),
                Effect.stat_effect(Stat.HEALTH, 40),
                // TODO: 50% immobilize resist
            ]
        ),

        new Item(
            "Lifestealing Leader's Amulet of Swift Fear Resist",
            ItemType.ACCESSORY,
            ItemRarity.RARE,
            ItemSlot.HEAD,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.MELEE,
            0, [], '',
            [
                Effect.hidden_stat(HiddenStat.LIFESTEAL, 5, RollType.ALL),
                Effect.skill_effect(Skill.INTERACTION_LEADERSHIP, 20),
                Effect.initiative_bonus(20),
                // TODO: 50% fear resist
            ]
        ),

        new Item(
            "Slayer's Penetrating Ring of Critical Power",
            ItemType.ACCESSORY,
            ItemRarity.RARE,
            ItemSlot.HEAD,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.MELEE,
            0, [], '',
            [
                Effect.roll_multiplier(0.2, Damage.PHYSICAL, RollType.ALL),
                Effect.hidden_stat(HiddenStat.AC_PENETRATION, 10, RollType.PHYSICAL),
                Effect.stat_effect(Stat.CRITICAL_HIT_CHANCE, 5),
                Effect.roll_damage('3d10', Damage.PHYSICAL, RollType.PHYSICAL),
            ]
        ),

        new Item(
            "Armored Resistant Buckle of Healing Paralysis Resist",
            ItemType.ACCESSORY,
            ItemRarity.RARE,
            ItemSlot.HEAD,
            [],
            Effect.no_op_roll_effect(),
            ItemScaler.MELEE,
            0, [], '',
            [
                Effect.stat_effect(Stat.AC, 5),
                Effect.stat_effect(Stat.MAGIC_RESIST, 5),
                Effect.stat_effect(Stat.HEALTH_REGENERATION, 10),
                // TODO: 50% paralysis resist
            ]
        ),

    ];


    // ################################################################################################################
    // Character


    const character_sheet_item_slots = [
        ItemSlot.MAIN_HAND,
        ItemSlot.OFFHAND,
        ItemSlot.HEAD,
        ItemSlot.BODY,
        ItemSlot.HANDS,
        ItemSlot.FEET,
        ItemSlot.NECK,
        'left_ring',
        'right_ring',
        ItemSlot.BELT,
    ];


    class Character {
        constructor(game_object, who) {
            this.id = game_object.id;  // roll20 id for the character
            this.who = who;            // who an API call originated from, used to respond under their name

            this.name = getAttrByName(this.id, 'character_name');
            this.owner = getAttrByName(this.id, 'owner');
            this.gender = getAttrByName(this.id, 'gender');
            this.age = getAttrByName(this.id, 'age');
            this.height = getAttrByName(this.id, 'height');
            this.weight = getAttrByName(this.id, 'weight');
            this.eye_color = getAttrByName(this.id, 'eyes');
            this.hair_color = getAttrByName(this.id, 'hair');
            this.alignment = getAttrByName(this.id, 'alignment');
            this.race = getAttrByName(this.id, 'race');
            this.languages = this.csv_to_array(getAttrByName(this.id, 'languages'));
            this.items = this.get_items();

            // Fetched lazily, aka when requested
            this.attributes = {};
            this.stats = {};
        }

        csv_to_array(list) {
            const items = [];
            list.split(',').forEach(i => items.push(i.trim()));
            return items;
        }

        get_item_names() {
            const item_names = [];

            for (let i = 0; i < character_sheet_item_slots.length; i++) {
                const slot = character_sheet_item_slots[i];
                const item_name = getAttrByName(this.id, slot);
                if (item_name !== '') {
                    item_names.push(item_name);
                }
            }

            return item_names;
        }

        get_items() {
            const item_names = this.get_item_names();

            // find the actual item for each given name
            const character_items = [];

            _.each(item_names, function (item_name) {
                for (let i = 0; i < ITEMS.length; i++) {
                    if (ITEMS[i].name === item_name) {
                        character_items.push(ITEMS[i]);
                        return;
                    }
                }

                log('Error, could not find item with name ' + item_name);
            });

            return character_items;
        }

        get_attribute(attr_tla) {
            if (attr_tla in this.attributes) {
                return this.attributes[attr_tla];
            }

            const attr_value = parseInt(getAttrByName(this.id, attr_tla));
            this.stats[attr_tla] = attr_value;
            return attr_value;
        }

        get_stat(stat) {
            // lazy loaded
            if (stat.name in this.stats) {
                return this.stats[stat.name];
            }

            const attr_value = this.get_attribute(stat.attr_tla);
            const stat_value = stat.value(attr_value);
            this.stats[stat.name] = stat_value;
            return stat_value;
        }

        has_skill_req(skill, rank) {
            return true;
        }

        is_using(weapon_type) {
            for (let i = 0; i < this.items.length; i++) {
                const item = this.items[i];
                if ((item.slot === ItemSlot.MAIN_HAND || item.slot === ItemSlot.TWO_HAND) && item.type === weapon_type) {
                    return true;
                }
            }

            return false;
        }

        get_main_weapon() {
            for (let i = 0; i < this.items.length; i++) {
                const item = this.items[i];
                if (item.slot === ItemSlot.MAIN_HAND || item.slot === ItemSlot.TWO_HAND) {
                    return item;
                }
            }

            return null;
        }
    }


    return {
        characters_by_owner,
        Stat,
        HiddenStat,
        Skill,
        abilities,
        classes,
        Damage,
        RollType,
        RollTime,
        Roll,
        ITEMS,
        Character,
    };

})();
