var BarbsComponents = BarbsComponents || (function () {
    'use_strict';


    // Basic python-like string formatting
    String.prototype.format = function () {
        let a = this;
        for (let i = 0; i < arguments.length; i++) {
            a = a.replace('%s', arguments[i]);
        }
        return a;
    };


    // ################################################################################################################
    // Assertions


    function assert(condition, message, ...rest) {
        if (condition === undefined || condition === null) {
            throw 'assert() missing condition';
        }
        if (message === undefined || message === null) {
            throw 'assert() missing message';
        }

        if (!condition) {
            throw message.format(...rest);
        }
    }


    function assert_not_null(parameter, message) {
        if (message === undefined || message === null) {
            throw 'assert_not_null() missing message';
        }

        assert(parameter !== undefined, 'AssertionError: ' + message);
        assert(parameter !== null, 'AssertionError: ' + message);
    }


    function assert_type(object, type, message) {
        assert_not_null(message, 'assert_type() message');
        assert_not_null(object, 'assert_type() object, ' + message);
        assert_not_null(type, 'assert_type() type, ' + message);

        assert('_type' in object, 'AssertionError: %s, no _type member in object %s', message, JSON.stringify(object));
        assert(type === object._type, 'AssertionError: %s, wrong object type, expected=%s, actual=%s', message, type,
               object._type);
    }


    function assert_starts_with(string, prefix, message) {
        assert_not_null(string, 'assert_starts_with() string');
        assert_not_null(prefix, 'assert_starts_with() prefix');
        assert_not_null(message, 'assert_starts_with() message');

        assert(string.startsWith(prefix), 'AssertionError: %s, expected string "%s" to start with "%s"', message,
               string, prefix);
    }


    function assert_numeric(string, message, ...rest) {
        assert_not_null(string, 'assert_numeric() string');
        assert_not_null(message, 'assert_numeric() message');

        let val;
        try {
            val = eval(string);
        } catch (err) {
            throw message.format(...rest);
        }

        if (Number.isNaN(val)) {
            throw message.format(...rest);
        }
    }


    // ################################################################################################################
    // Functional


    // Always specifying a radix is safest, and we always want radix 10.
    function parse_int(string) {
        assert_not_null(string, 'parse_int() string');

        return parseInt(string, 10);
    }


    function trim_percent(string) {
        assert_not_null(string, 'trim_percent() string');

        string = string.trim();
        if (string.endsWith('%')) {
            return string.substring(0, string.length - 1);
        } else {
            return string;
        }
    }


    function trim_all(array) {
        assert_not_null(array, 'trim_all() array');

        const trimmed = [];
        for (let i = 0; i < array.length; i++) {
            trimmed.push(array[i].trim());
        }
        return trimmed;
    }


    function remove_empty(array) {
        assert_not_null(array, 'remove_empty() array');

        const cleaned = [];
        for (let i = 0; i < array.length; i++) {
            if (array[i] !== '') {
                cleaned.push(array[i].trim());
            }
        }
        return cleaned;
    }


    const LogLevel = {
        TRACE: 0,
        DEBUG: 1,
        INFO: 2,
        WARN: 3,
        ERROR: 4,
    };


    class LOG {
        static _log(log_level, string) {
            assert_not_null(log_level, '_log() log_level');
            assert_not_null(string, '_log() string');

            if (log_level >= this.level) {
                log(string);
            }
        }

        static trace(string) {
            this._log(LogLevel.TRACE, string);
        }

        static debug(string) {
            this._log(LogLevel.DEBUG, string);
        }

        static info(string) {
            this._log(LogLevel.INFO, string);
        }

        static warn(string) {
            this._log(LogLevel.WARN, string);
        }

        static error(string) {
            this._log(LogLevel.ERROR, string);
            sendChat('API', string);
        }
    }
    LOG.level = LogLevel.INFO;


    // ################################################################################################################
    // Character -> potential names mapping


    // This is how we identify what character should be used for a given caller.
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
        'Rossa Algomar': [
            'Rossa Algomar',
            'Rossa',
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
            'Jorgen Espensen',
            'Jørgen',
            'Jorgen',
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
    // Damage types


    const ElementalDamage = {
        FIRE: 'fire',
        WATER: 'water',
        EARTH: 'earth',
        AIR: 'air',
        ICE: 'ice',
        LIGHTNING: 'lightning',
        LIGHT: 'light',
        DARK: 'dark',
    };


    const Damage = {
        PHYSICAL: 'physical',
        PSYCHIC: 'psychic',
        HEALING: 'healing',
        ALL_MAGIC: 'all_magic',
        ALL: 'all',
    };


    const ekeys = Object.keys(ElementalDamage);
    for (let i = 0; i < ekeys.length; i++) {
        const key = ekeys[i];
        Damage[key] = ElementalDamage[key];
    }


    function is_magic_damage_type(type) {
        const keys = Object.keys(ElementalDamage);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (type === ElementalDamage[key]) {
                return true;
            }
        }

        return false;
    }


    function get_damage_from_type(type) {
        const damage_types = Object.keys(Damage);
        for (let i = 0; i < damage_types.length; i++) {
            const damage_type = damage_types[i];
            const damage_type_string = Damage[damage_type];
            if (type === damage_type_string) {
                return damage_type_string;
            }
        }

        return null;
    }


    // ################################################################################################################
    // Stats


    class StatObject {
        constructor(name, attr_tla, formula) {
            assert_not_null(name, 'StatObject::new() name');
            assert_not_null(attr_tla, 'StatObject::new() attr_tla');
            assert_not_null(formula, 'StatObject::new() formula');

            this._type = 'stat';
            this.name = name;
            this.attr_tla = attr_tla;
            this.formula = formula;
        }

        value(v) {
            return this.formula(v);
        }
    }


    const Stat = {
        HEALTH: new StatObject('HEALTH', 'VIT', function (v) {
            return 100 + 10 * v;
        }),
        STAMINA: new StatObject('STAMINA', 'END', function (v) {
            return 100 + 10 * v;
        }),
        MANA: new StatObject('MANA', 'SPT', function (v) {
            return 100 + 10 * v;
        }),
        HEALTH_REGENERATION: new StatObject('HEALTH_REGENERATION', 'RCV', function (v) {
            return 10 + v;
        }),
        STAMINA_REGENERATION: new StatObject('STAMINA_REGENERATION', 'PER', function (v) {
            return 10 + v;
        }),
        MANA_REGENERATION: new StatObject('MANA_REGENERATION', 'SAN', function (v) {
            return 10 + v;
        }),
        MOVEMENT_SPEED: new StatObject('MOVEMENT_SPEED', 'AGI', function (v) {
            return 30 + 5 * Math.floor(v / 2);
        }),
        AC: new StatObject('AC', 'TGH', function (v) {
            return 10 + v;
        }),
        EVASION: new StatObject('EVASION', 'REF', function (v) {
            return 10 + v;
        }),
        MAGIC_RESIST: new StatObject('MAGIC_RESIST', 'RES', function (v) {
            return 10 + v;
        }),
        CONDITION_RESIST: new StatObject('CONDITION_RESIST', 'FRT', function (v) {
            return 10 + v;
        }),
        MELEE_DAMAGE: new StatObject('MELEE_DAMAGE', 'STR', function (v) {
            return v;
        }),
        RANGED_FINE_DAMAGE: new StatObject('RANGED_FINE_DAMAGE', 'DEX', function (v) {
            return v;
        }),
        MAGIC_DAMAGE: new StatObject('MAGIC_DAMAGE', 'ATN', function (v) {
            return v;
        }),
        CRITICAL_HIT_CHANCE: new StatObject('CRITICAL_HIT_CHANCE', 'PRE', function (v) {
            return 10 + v;
        }),
        COMMANDS: new StatObject('COMMANDS', 'APL', function (v) {
            return Math.floor((v + 10) / 10) + 1;
        }),
        LANGUAGES: new StatObject('LANGUAGES', 'INT', function (v) {
            return Math.floor((v + 10) / 3) + 1;
        }),
        ITEM_EFFICIENCY: new StatObject('ITEM_EFFICIENCY', 'WIS', function (v) {
            return (v + 10) * 5;
        }),
        BUFF_LIMIT: new StatObject('BUFF_LIMIT', 'COM', function (v) {
            return Math.floor((v + 10) / 2);
        }),
        CONCENTRATION_LIMIT: new StatObject('CONCENTRATION_LIMIT', 'FCS', function (v) {
            return Math.floor((v + 10) / 2);
        }),
    };


    // Used when constructing items
    const STAT_ACROS = {
        'cr:': Stat.CONDITION_RESIST,
        'mr:': Stat.MAGIC_RESIST,
        'ev:': Stat.EVASION,
        'mv:': Stat.MOVEMENT_SPEED,
    };


    function get_stat_for_attribute(attr_tla) {
        assert_not_null(attr_tla, 'get_stat_for_attribute() attr_tla');

        const keys = Object.keys(Stat);
        for (let i = 0; i < keys.length; i++) {
            const stat = keys[i];
            const stat_object = Stat[stat];
            if (stat_object.attr_tla.toLowerCase() === attr_tla.toLowerCase()) {
                return stat_object;
            }
        }

        return null;
    }


    const HiddenStat = {
        ACCURACY: '%s% accuracy',
        BUFF_STRIP: 'Strip %s buff(s) from the target',
        FORCED_MOVEMENT: 'Forcibly move target %s ft',
        LETHALITY: '%s% lethality chance, chance: [[d100cs>%s]]',
        LIFESTEAL: '%s% lifesteal',
        MINION_LETHALITY: '%s% minion lethality chance, chance: [[d100cs>%s]]',
        REACH: '+%s ft reach',
        UNBLOCKABLE_CHANCE: '%s% chance to be unblockable, chance: [[d100cs>%s]]',

        BLINDED_CHANCE: '%s% chance to Blind, chance: [[d100cs>%s]], CR: [[1d100]]',
        BURN_CHANCE: '%s% chance to inflict Burn 20, chance: [[d100cs>%s]], CR: [[1d100]]',
        CONFUSED_CHANCE: '%s% chance to Confuse, chance: [[d100cs>%s]], CR: [[1d100]]',
        CRIPPLED_CHANCE: '%s% chance to Crippled, chance: [[d100cs>%s]], CR: [[1d100]]',
        FEAR_CHANCE: '%s% chance to Fear, chance: [[d100cs>%s]], CR: [[1d100]]',
        FROZEN_CHANCE: '%s% chance to Freeze, chance: [[d100cs>%s]], CR: [[1d100]]',
        IMMOBILIZE_CHANCE: '%s% chance to Immobilize, chance: [[d100cs>%s]], CR: [[1d100]]',
        PARALYZED_CHANCE: '%s% chance to Paralyze, chance: [[d100cs>%s]], CR: [[1d100]]',
        PETRIFIED_CHANCE: '%s% chance to Petrify, chance: [[d100cs>%s]], CR: [[1d100]]',
        REDUCE_EVASION: 'Target loses %s% evasion for 1 minute, chance: [[d100cs>%s]], CR: [[1d100]]',
        REDUCE_CR: 'Target loses %s% CR, CR: [[1d100]]',
        REDUCE_AC: 'Target loses %s AC, CR: [[1d100]]',
        SILENCED_CHANCE: '%s% chance to Silence, chance: [[d100cs>%s]], CR: [[1d100]]',
        SLOWED_CHANCE: '%s% chance to Slow, chance: [[d100cs>%s]], CR: [[1d100]]',
        STUNNED_CHANCE: '%s% chance to Stun, chance: [[d100cs>%s]], CR: [[1d100]]',

        AC_PENETRATION: '%s% armor penetration',
        // TODO: psychic pen?
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


    // Used when constructing items
    const HIDDEN_STAT_ACROS = {
        'accuracy:': HiddenStat.ACCURACY,
        'buff strip:': HiddenStat.BUFF_STRIP,
        'forced movement:': HiddenStat.FORCED_MOVEMENT,
        'lethality:': HiddenStat.LETHALITY,
        'lifesteal:': HiddenStat.LIFESTEAL,
        'minion lethality': HiddenStat.MINION_LETHALITY,
        'reach:': HiddenStat.REACH,
        'unblockable chance:': HiddenStat.UNBLOCKABLE_CHANCE,

        'blinded chance': HiddenStat.BLINDED_CHANCE,
        'burn chance:': HiddenStat.BURN_CHANCE,
        'confused chance': HiddenStat.CONFUSED_CHANCE,
        'crippled chance:': HiddenStat.CRIPPLED_CHANCE,
        'fear chance': HiddenStat.FEAR_CHANCE,
        'frozen chance': HiddenStat.FROZEN_CHANCE,
        'immobilized chance': HiddenStat.IMMOBILIZE_CHANCE,
        'paralyzed chance:': HiddenStat.PARALYZED_CHANCE,
        'petrified chance': HiddenStat.PETRIFIED_CHANCE,
        'reduce evasion:': HiddenStat.REDUCE_EVASION,
        'reduce cr:': HiddenStat.REDUCE_CR,
        'reduce ac:': HiddenStat.REDUCE_AC,
        'silenced chance': HiddenStat.SILENCED_CHANCE,
        'slowed chance': HiddenStat.SLOWED_CHANCE,
        'stunned chance': HiddenStat.STUNNED_CHANCE,

        'ac pen:': HiddenStat.AC_PENETRATION,
        'general magic pen:': HiddenStat.GENERAL_MAGIC_PENETRATION,
        'fire magic pen:': HiddenStat.FIRE_MAGIC_PENETRATION,
        'water magic pen:': HiddenStat.WATER_MAGIC_PENETRATION,
        'earth magic pen:': HiddenStat.EARTH_MAGIC_PENETRATION,
        'air magic pen:': HiddenStat.AIR_MAGIC_PENETRATION,
        'ice magic pen:': HiddenStat.ICE_MAGIC_PENETRATION,
        'lightning magic pen:': HiddenStat.LIGHTNING_MAGIC_PENETRATION,
        'light magic pen:': HiddenStat.LIGHT_MAGIC_PENETRATION,
        'dark magic pen:': HiddenStat.DARK_MAGIC_PENETRATION,
    };


    // ################################################################################################################
    // Skills


    class SkillObject {
        constructor(name, scaling_attr_tla) {
            this._type = 'SkillObject';
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
    // Conditions and classes from the rulebook files


    const conditions = [
        "Bleeding",
        "Blinded",
        "Burned",
        "Charmed",
        "Confused",
        "Crippled",
        "Cursed",
        "Decreased Stats",
        "Fear",
        "Frozen",
        "Helpless",
        "Immobilized",
        "Knocked Down (Prone)",
        "Knocked Up (Airborne)",
        "Paralyzed",
        "Petrified",
        "Poisoned",
        "Silenced",
        "Sleeping",
        "Slowed",
        "Stunned",
        "Taunted",
        "Weakened"
    ];


    const classes = {
        "Abjurer": {
            "type": "class",
            "name": "Abjurer",
            "description": "The Abjurer is a mid-level magical practitioner who has specialized in the magical school of Defense. As the name suggests, Defense magic protects the caster and their allies from enemy attacks. The school contains spells such as shields, temporary health, counterspells, buffs that boost defensive stats, and a variety of other methods to defend a person or group. The class contains no offensive abilities whatsoever, so such a mage is usually included as part of a party or regularly seen with other defensive mages within a section of an army. The class plays especially well with other members of the party who play the tank role, further augmenting their ability to protect the backline. Being an effective Abjurer requires excellent concentration.",
            "passive": {
                "Positive Feedback": "When a Defense spell you control prevents damage, 10% of the damage prevented is converted to recover your mana, up to a limit of the cost of the Defense spell that prevented that damage."
            },
            "abilities": {
                "Shield": {
                    "name": "Shield",
                    "class": "Abjurer",
                    "description": [
                        "You protect an ally with a brief yet powerful shield. Block one attack on yourself or an ally in range. Until the beginning of the target's next turn, they have +10 AC and +10% MR"
                    ],
                    "tags": [
                        "spell",
                        "defensive",
                        "gain ac",
                        "gain mr"
                    ]
                },
                "Weak": {
                    "name": "Weak",
                    "class": "Abjurer",
                    "description": [
                        "You dampen an enemy's aggression with magic. A target in range gains a 20% Weaken if they aren't already weakened; otherwise, they gain a 10% Weaken."
                    ],
                    "tags": [
                        "spell",
                        "defensive",
                        "condition",
                        "weaken",
                        "single-target"
                    ]
                },
                "Stoneskin": {
                    "name": "Stoneskin",
                    "class": "Abjurer",
                    "description": [
                        "You boost the natural armor of your allies. Up to 5 targets in range have their AC and MR increased by 30%. You may spend 1 minute to cast this spell as a minor ritual; if you do, its duration is extended to 1 hour. You may spend 10 minutes to cast this spell as a major ritual; if you do, its duration is extended to 6 hours."
                    ],
                    "tags": [
                        "spell",
                        "defensive",
                        "buff",
                        "gain ac",
                        "gain mr",
                        "modal",
                        "minor ritual",
                        "major ritual"
                    ]
                }
            }
        },
        "Aeromancer": {
            "type": "class",
            "name": "Aeromancer",
            "description": "The Aeromancer is one of 8 offensive elemental mages. Harnessing the whimsical aspect of air, the Aeromancer values speed, creativity, and taking the initiative. Unlike other mages who plant themselves in the backlines, the Aeromancer uses its high mobility to literally fly across the battlefield, controlling wind to speed allies and slow enemies while inflicting damage through wind blasts and tornados. An adept Aeromancer never stays in one spot, abusing its speed and range to maximum effect to kite and whittle down even the staunchest foes.",
            "passive": {
                "Winds of War": "For every 5 feet you move using a Move Action or dash ability, gain a stack of Winds of War. When you inflict air magic damage on a target, you may choose to consume all stacks of Winds of War. Your air magic damage is increased by 5% for every stack of Winds of War consumed in this manner for that instance of air magic damage."
            },
            "abilities": {
                "Wind Slash": {
                    "name": "Wind Slash",
                    "class": "Aeromancer",
                    "description": [
                        "You fire a fast moving blade of air. Deal 6d8 air magic damage to a target in range and up to 2 enemies adjacent to your target. This attack cannot miss, cannot be blocked, and bypasses barriers and walls."
                    ],
                    "tags": [
                        "spell",
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
                "Sky Uppercut": {
                    "name": "Sky Uppercut",
                    "class": "Aeromancer",
                    "description": [
                        "You release an upwards draft of air. Deal 8d8 air magic damage to a target in range. The target is then Knocked Up and inflicted with 50% air vulnerability until this condition ends."
                    ],
                    "tags": [
                        "spell",
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
                "Vicious Cyclone": {
                    "name": "Vicious Cyclone",
                    "class": "Aeromancer",
                    "description": [
                        "You conjure a violent twister that buffets your foes with slashing winds. Create a 15 foot square Cyclone centered on a space in range. It reaches up 100 ft as well. When it initially appears it deals 6d8 air magic damage to all enemies in its AOE. If an enemy begins its turn in the AOE, they take 4d8 air magic damage, and if they are Knocked Up, they remain Airborne. When you cast this spell, you may increase the AOE size by 5 ft for every additional 20 mana you expend."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "air",
                        "destruction",
                        "conjuration",
                        "aoe",
                        "square",
                        "conditional",
                        "knock up",
                        "modal",
                        "concentration"
                    ]
                },
                "Vicious Hurricane": {
                    "name": "Vicious Hurricane",
                    "class": "Aeromancer",
                    "description": [
                        "You conjure a violent hurricane that persistently damages and knocks up enemies. At the end of each of your turns, deal 10d8 air magic damage to all enemies in range and they are all Knocked Up. While you concentrate on this spell, your air spells ignore all MR and you can cast any air spell you know as a reaction."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "air",
                        "destruction",
                        "conjuration",
                        "aoe",
                        "square",
                        "knock up",
                        "ignore mr",
                        "concentration"
                    ]
                },
                "Aeroblast": {
                    "name": "Aeroblast",
                    "class": "Aeromancer",
                    "description": [
                        "You release a powerful blast of air that sends people flying. Push a target in range 20 ft in a direction of your choice. When you cast this spell, you may choose to expend 4 stacks of Winds of War to additionally knock the target prone."
                    ],
                    "tags": [
                        "spell",
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
                "Whisk Away": {
                    "name": "Whisk Away",
                    "class": "Aeromancer",
                    "description": [
                        "You fire a gust of air behind you to quickly reposition yourself. Dash up to 50 ft in any direction including upwards and downwards"
                    ],
                    "tags": [
                        "spell",
                        "air",
                        "utility",
                        "conjuration",
                        "dash"
                    ]
                },
                "Buffeting Storm": {
                    "name": "Buffeting Storm",
                    "class": "Aeromancer",
                    "description": [
                        "You maintain powerful winds to impede foes and assist allies. While you concentrate on this spell, powerful winds decrease enemy movement speed by 20 and increase ally movement speed by 20. Additionally, while you concentrate on this spell, you may spend 5 mana to push any target 10 ft in any direction as a Minor Action."
                    ],
                    "tags": [
                        "spell",
                        "air",
                        "control",
                        "conjuration",
                        "modal",
                        "concentration"
                    ]
                },
                "Take Flight": {
                    "name": "Take Flight",
                    "class": "Aeromancer",
                    "description": [
                        "You provide yourself or an ally the ability to fly without restrictions. Target willing entity in range gains a buff that converts all of their movement speed into flying speed, grants 20% evasion, and increases the range of their attacks by 50%."
                    ],
                    "tags": [
                        "spell",
                        "air",
                        "buff",
                        "gain evasion",
                        "gain range",
                        "concentration"
                    ]
                },
                "Tailwind": {
                    "name": "Tailwind",
                    "class": "Aeromancer",
                    "description": [
                        "You provide an aiding tailwind to increase an ally's speed. Target willing entity in range gains the following buff: Gain +20 movement speed; can end this buff as a reaction to dash 20 ft in any direction."
                    ],
                    "tags": [
                        "spell",
                        "air",
                        "utility",
                        "conjuration",
                        "buff",
                        "modal"
                    ]
                },
                "Blowback": {
                    "name": "Blowback",
                    "class": "Aeromancer",
                    "description": [
                        "You counter a spell and muddle the caster's senses. As a reaction to a target in range casting a spell, you may counter that spell. Until the end of the target's next turn, their non-melee abilities have their range halved."
                    ],
                    "tags": [
                        "spell",
                        "air",
                        "defensive",
                        "counterspell",
                        "conditional",
                        "single-target",
                        "condition",
                        "range decrease"
                    ]
                },
                "Rotation Barrier": {
                    "name": "Rotation Barrier",
                    "class": "Aeromancer",
                    "description": [
                        "You rotate the air surrounding you quickly, knocking down incoming projectiles. All non-melee, non-AOE attacks that target or affect a space within range are blocked."
                    ],
                    "tags": [
                        "spell",
                        "air",
                        "defensive",
                        "conditional",
                        "aoe",
                        "block"
                    ]
                },
                "Summon Wyvern": {
                    "name": "Summon Wyvern",
                    "class": "Aeromancer",
                    "description": [
                        "You summon a wyvern borne of the skies. Summon a Wyvern with 100 HP, 50 flying speed, 20 AC, 50% evasion, 50% general MR, and an innate 100% vulnerability to attacks from bows and crossbows. It obeys your Commands; otherwise, it uses its Move Action to fly towards enemies and its Major Action to do a melee claw attack for 5d10 physical damage or a 30 ft cone breath attack for 10d8 air magic damage (33% recharge rate)."
                    ],
                    "tags": [
                        "spell",
                        "air",
                        "summoning",
                        "minion"
                    ]
                }
            }
        },
        "Air Duelist": {
            "type": "class",
            "name": "Air Duelist",
            "description": "The Air Duelist is one of many spellblade variants that focuses on one element and one weapon. This class wields a bow as well as powerful air magic. By interlacing shots from her bow with precise wind strikes, the Air Duelist maximizes its action economy. Her individual spells are weaker than a dedicated air mage's, but her weapon provides increased flexibility and effectiveness at longer ranges, and his offensive output can surpass a regular duelist's with efficient usage of physical and magical arts. Her spells are primarily buffing and damaging in nature, with all the additional support and utility that air magic tends to provide, and there is a heavy emphasis on forced movement and mobility.",
            "passive": {
                "Whirlwind Quiver": "Once per turn, when you deal air magic damage to a target with a spell, gain one Whirlwind Arrow special ammunition. You may have up to 2 Whirlwind Arrows at a time, this special ammunition can not be recovered, and they expire at the end of combat. When you use a Whirlwind Arrow to make an attack with a bow, you may do so as a free action (you still pay any other costs)."
            },
            "abilities": {
                "Gale Shot": {
                    "name": "Gale Shot",
                    "class": "Air Duelist",
                    "description": [
                        "You fire at an enemy while making evasive maneuvers. Deal 4d8 physical damage to a target in range, then dash 10 ft in any direction"
                    ],
                    "tags": [
                        "attack",
                        "ranged",
                        "physical",
                        "bow",
                        "dash",
                        "single-target"
                    ]
                },
                "Zephyr Shot": {
                    "name": "Zephyr Shot",
                    "class": "Air Duelist",
                    "description": [
                        "You fire a series of several arrows at the enemy. Deal d8 physical damage to a target in range. This attack repeats 5 times, and you may change targets with each hit."
                    ],
                    "tags": [
                        "attack",
                        "ranged",
                        "physical",
                        "bow",
                        "single-target",
                        "multi-target",
                        "multi-hit"
                    ]
                },
                "Storm Shot": {
                    "name": "Storm Shot",
                    "class": "Air Duelist",
                    "description": [
                        "You fire a rain of arrows from the skies. Deal 6d8 physical damage to all enemies in a 25 ft square centered on a space in range, Crippling them for 1 minute. Flying enemies take 100% increased damage from this ability, cannot evade this attack, and are additionally Knocked Prone."
                    ],
                    "tags": [
                        "attack",
                        "ranged",
                        "physical",
                        "bow",
                        "aoe",
                        "square",
                        "condition",
                        "cripple",
                        "conditional",
                        "no-miss",
                        "knock prone"
                    ]
                },
                "Wind Strike": {
                    "name": "Wind Strike",
                    "class": "Air Duelist",
                    "description": [
                        "You fire a powerful gust of air to blow enemies away. Deal 5d8 air magic damage to a target in range, pushing them 10 ft away from you."
                    ],
                    "tags": [
                        "spell",
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
                "Cutting Winds": {
                    "name": "Cutting Winds",
                    "class": "Air Duelist",
                    "description": [
                        "You conjure winds as sharp as blades to damage and knock down enemies. Deal 6d8 air magic damage to all entities in a 25 ft square centered on a space in range, knocking them all Prone."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "ranged",
                        "air",
                        "destruction",
                        "aoe",
                        "square",
                        "conjuration",
                        "knock prone"
                    ]
                },
                "Harassing Whirlwind": {
                    "name": "Harassing Whirlwind",
                    "class": "Air Duelist",
                    "description": [
                        "You create a whirlwind around a target that constantly damages and pushes them. Deal 4d8 air magic damage to a target in range. While concentrating on this spell, for the spell's duration, the target takes 4d8 air magic damage and is pushed 20 ft in a direction of your choice at the beginning of each turn."
                    ],
                    "tags": [
                        "spell",
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
                "Mistral Bow": {
                    "name": "Mistral Bow",
                    "class": "Air Duelist",
                    "description": [
                        "You use air magic to provide your bow with extra stopping power. For the spell's duration, when you hit a target with a bow attack, push the target 5 ft away from you as an on-hit effect."
                    ],
                    "tags": [
                        "spell",
                        "air",
                        "buff",
                        "self-target",
                        "on-hit",
                        "bow",
                        "push"
                    ]
                },
                "Arc of Air": {
                    "name": "Arc of Air",
                    "class": "Air Duelist",
                    "description": [
                        "You envelop your bow in air magic energy. For the spell's duration, when you hit a target with a bow attack, deal an additional 2d8 air magic damage on hit."
                    ],
                    "tags": [
                        "spell",
                        "air",
                        "buff",
                        "self-target",
                        "on-hit",
                        "bow"
                    ]
                },
                "Bow of Hurricanes": {
                    "name": "Bow of Hurricanes",
                    "class": "Air Duelist",
                    "description": [
                        "Your bow becomes a thick arc of air magic. For the spell's duration, all damage that you would deal with bow attacks have their damage converted to air magic damage. While this buff is active, your bow attacks using special ammunition have 50% increased range."
                    ],
                    "tags": [
                        "spell",
                        "air",
                        "buff",
                        "self-target",
                        "on-hit",
                        "bow",
                        "damage convert",
                        "increase range",
                        "conditional"
                    ]
                }
            }
        },
        "Amplifier": {
            "type": "class",
            "name": "Amplifier",
            "description": "The Amplifier is a practitioner of Augmentation alchemy. As one of the most common types of alchemy, many towns will have an amplifier, selling blueprints for strengthening tools and weapons. The Amplifier provides an avenue for buffing allies and their equipment without requiring concentration, buff limit, or even mana or stamina. Instead, the Amplifier takes time outside of combat to complete the products of their abilities and blueprints, in order to provide bonuses in combat.",
            "passive": {
                "Overclock": "At the end of a long rest, you may create the product of an Amplifier ability without needing the materials. An augmentation made this way has its Duration extended to 6 hours."
            },
            "abilities": {
                "Improved Aggression": {
                    "name": "Improved Aggression",
                    "class": "Amplifier",
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
                "Enhanced Vigor": {
                    "name": "Enhanced Vigor",
                    "class": "Amplifier",
                    "description": [
                        "You amplify an entity's heartiness. Target entity's maximum HP increases by 25% (its current HP increases by the same amount, and also decreases by the same amount when this effect expires). That entity may convert any amount of its current stamina and/or mana in order to heal HP equal to that amount as a free action."
                    ],
                    "tags": [
                        "alchemy",
                        "augmentation",
                        "increase max hp",
                        "gain action"
                    ]
                },
                "Refined Agility": {
                    "name": "Refined Agility",
                    "class": "Amplifier",
                    "description": [
                        "You amplify an entity's natural reflexes. Target entity's gains an additional 20 ft of speed. That entity may use a second Reaction in a round, but if they do so, they lose their next turn's Minor action."
                    ],
                    "tags": [
                        "alchemy",
                        "augmentation",
                        "add speed",
                        "action conversion"
                    ]
                }
            }
        },
        "Aquamancer": {
            "type": "class",
            "name": "Aquamancer",
            "description": "Aquamancer is an entry level mage that has begun to master the element of water. Water, as an element, is focused on balance and flexibility, and the aquamancer spell list reflects this philosophy. An adept aquamancer will be able to deal moderate water magic damage to single and multiple targets effectively while also manipulating the battlefield and controlling enemy movement. Likewise, the aquamancer can turn inward towards the party and assist with a defensive suite of spells and some moderate healing. While other elemental mages are more focused on dealing damage, inflicting crowd control, or healing, none of them have the sheer number of options that the aquamancer has.",
            "passive": {
                "Turning Tides": "At the beginning of your first turn of combat, choose Flood Tide or Ebb Tide. After your first turn, you swap between Flood Tide and Ebb Tide at the beginning of each new turn. During Flood Tide, your damaging water spells deal 50% increased damage and your forced movement water spells cause 20 additional feet of forced movement. During Ebb Tide, your healing water spells have 50% increased healing and your buffs grant an additional 20% general MR for their duration."
            },
            "abilities": {
                "Hydro Pump": {
                    "name": "Hydro Pump",
                    "class": "Aquamancer",
                    "description": [
                        "You fire a stream of powerfully moving water. Deal 6d6 water magic damage to all enemies in a 60 foot line starting from your position in any direction. The last enemy in the line is pushed 10 ft away from you."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "water",
                        "destruction",
                        "damage",
                        "aoe",
                        "line",
                        "forced movement"
                    ]
                },
                "Tidal Wave": {
                    "name": "Tidal Wave",
                    "class": "Aquamancer",
                    "description": [
                        "You conjure a large wave of water that crashes into your foes. Deal 8d6 water magic damage to all enemies in a 30 ft cube, centered on a space in range, leaving behind a field of shallow water in the spaces affected that act as difficult terrain for 1 hour."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "water",
                        "destruction",
                        "control",
                        "conjuration",
                        "aoe",
                        "cube",
                        "field"
                    ]
                },
                "Water Whip": {
                    "name": "Water Whip",
                    "class": "Aquamancer",
                    "description": [
                        "You create a thin whip of liquid that lacerates enemies. Deal 9d6 water magic damage to a target in range. This attack cannot be blocked and cannot miss, and it is affected by your critical strike chance and critical damage modifier. If this attack does not fail, you may pull the target towards you by 10 ft."
                    ],
                    "tags": [
                        "spell",
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
                "Whirlpool": {
                    "name": "Whirlpool",
                    "class": "Aquamancer",
                    "description": [
                        "You create a swirling pool of dangerous waters. Create a 35 ft square whirlpool centered on a space in range. At the beginning of each enemy's turn that is within the whirlpool, they become Immobilized, take 10d6 water magic damage, and are pulled to the center of the whirlpool (or as far as available space will allow), skirting around any other entities or blockages during their forced movement (but not blockages that completely encircle the center of the whirlpool). If they are within the center 15 ft square of the whirlpool when their turn begins, they instead take 15d6 water magic damage, are Immobilized, and begin drowning. Drowning entities have a 25% chance of instantly dying at the end of their turn. You may use a Major Action to move the whirlpool up to 20 ft in any direction at no mana cost."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "ranged",
                        "water",
                        "destruction",
                        "conjuration",
                        "condition",
                        "immobilize",
                        "conditional",
                        "modal",
                        "forced movement",
                        "instant death",
                        "concentration"
                    ]
                },
                "Water Pulse": {
                    "name": "Water Pulse",
                    "class": "Aquamancer",
                    "description": [
                        "You push and pull water to adjust the position of others. For all targets in range, choose one or neither:",
                        "<ul>",
                        "<li>Push the target 10 feet away from you</li>",
                        "<li>Pull the target 10 feet towards you</li>",
                        "</ul>",
                        "Targets cannot occupy the same space, and so they will bump into each other and stop their forced movement as needed to accommodate. All forced movement occurs simultaneously."
                    ],
                    "tags": [
                        "spell",
                        "water",
                        "control",
                        "multi-target",
                        "modal",
                        "forced movement"
                    ]
                },
                "Washout": {
                    "name": "Washout",
                    "class": "Aquamancer",
                    "description": [
                        "You turn a mage's mana into nourishing water. As a reaction to a target in range casting a spell, you may counter that spell. You heal equal to the amount of mana spent on the countered spell."
                    ],
                    "tags": [
                        "spell",
                        "water",
                        "defensive",
                        "counterspell",
                        "conditional",
                        "single-target",
                        "heal"
                    ]
                },
                "Bubble Barrier": {
                    "name": "Bubble Barrier",
                    "class": "Aquamancer",
                    "description": [
                        "You create orbs of water to protect allies. Create 3 orbs of water which surround yourself or a target ally in range (you may divide the 3 orbs amongst multiple targets). The first orb grants a +20 AC buff. The second orb grants a +30% MR buff. The third orb grants a +25% Evasion buff. An orb will automatically block 1 attack targeting the entity it is surrounding before dissipating if the entity would otherwise take damage."
                    ],
                    "tags": [
                        "spell",
                        "water",
                        "defensive",
                        "conjuration",
                        "modal",
                        "conditional",
                        "buff",
                        "block"
                    ]
                },
                "Summon Water Weird": {
                    "name": "Summon Water Weird",
                    "class": "Aquamancer",
                    "description": [
                        "You summon a creature made of magically enhanced water. Summon a Weird with large size, 100 health, 50% evasion, 50% MR, 100% CR, water element affinity, and immunity to physical damage. It follows your Commands; otherwise, it uses its Move Action to approach nearby enemies, its Major Action to either swipe at all adjacent enemies for 10d6 physical damage, pushing them back 20 ft, or fire a blast of water that deals 12d6 water magic damage in a 15 ft square centered on a space within 60 ft, inflicting 20% water vulnerability which stacks, and its reaction to block an attack targeting an adjacent ally."
                    ],
                    "tags": [
                        "spell",
                        "water",
                        "summoning",
                        "minion",
                        "forced movement",
                        "water vulnerability",
                        "block"
                    ]
                },
                "Baptize": {
                    "name": "Baptize",
                    "class": "Aquamancer",
                    "description": [
                        "You spray an ally with a soothing mist. Heal 6d6 to a target in range. For every 6 you roll, cleanse a random condition on the target."
                    ],
                    "tags": [
                        "spell",
                        "water",
                        "restoration",
                        "heal",
                        "conditional",
                        "random",
                        "cleanse",
                        "single-target"
                    ]
                },
                "Rain of Wellness": {
                    "name": "Rain of Wellness",
                    "class": "Aquamancer",
                    "description": [
                        "You conjure a healing rain to restore multiple allies. All allies in a 30 ft cube centered on a space in range are cleansed of a condition of their choice. This rain persists, granting allies inside of it +20% general condition resist until the beginning of your next turn, at which point it cleanses all allies of a condition of their choice before dissipating."
                    ],
                    "tags": [
                        "spell",
                        "water",
                        "restoration",
                        "buff field",
                        "cleanse",
                        "aoe",
                        "cube"
                    ]
                },
                "Draught of Vigor": {
                    "name": "Draught of Vigor",
                    "class": "Aquamancer",
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
                        "spell",
                        "water",
                        "restoration",
                        "buffing",
                        "divination",
                        "buff",
                        "modal"
                    ]
                },
                "Fountain of Purity": {
                    "name": "Fountain of Purity",
                    "class": "Aquamancer",
                    "description": [
                        "You create nourishing fountains. Create 2 large fountains in empty spaces within range. When the fountains initially appear, allies within 10 ft heal for 30 health and cleanse 1 condition of their choice. Allies standing next to a fountain gain 30% CR and 30% evasion. While the fountains persist, allies may use a minor action to drink from an adjacent fountain, healing for 30 health and cleansing for 1 condition of their choice. When you cast this spell, you may create additional fountains for 30 additional mana each."
                    ],
                    "tags": [
                        "spell",
                        "water",
                        "restoration",
                        "conjuration",
                        "cleanse",
                        "heal",
                        "buff field",
                        "modal",
                        "concentration"
                    ]
                }
            }
        },
        "Arcane Archer": {
            "type": "class",
            "name": "Arcane Archer",
            "description": "Arcane Archer is an archery class that uses buff magic to greatly increase their offensive and defensive power. The offensive buffs in this class provide straightforward raw power for the already adept archer, and the defensive buffs focus on improving evasion and kiting ability for fights that are too close for comfort. The class's passive provides extra action economy so that the shooting can start sooner rather than later. The goal of the class is to either repeatedly cast buffs and maintain a heavy rate of fire or to keep buff uptime high for more simple yet effective play. Overall, an Arcane Archer has more mechanics to worry about, in using and sacrificing buffs, but there are great rewards to reap and relatively easy decisions to make within the class.",
            "passive": {
                "Battle Ready": "At the beginning of each of your turns, if you attacked an enemy with a bow or crossbow last turn, gain a special Major Action, which can only be used to cast a buff ability. Buff abilities cast this way cost half stamina/mana."
            },
            "abilities": {
                "Surefire Shot": {
                    "name": "Surefire Shot",
                    "class": "Arcane Archer",
                    "description": [
                        "You focus to fire a shot that won't miss. Deal 7d8 physical damage to a target in range. This attack has +20% Accuracy and +40 ft range for every buff you have. If you sacrificed a buff this turn, this attack gains +50% increased physical damage and cannot be blocked."
                    ],
                    "tags": [
                        "attack",
                        "ranged",
                        "single-target",
                        "physical",
                        "bow",
                        "crossbow",
                        "conditional"
                    ]
                },
                "Broadhead Arrow": {
                    "name": "Broadhead Arrow",
                    "class": "Arcane Archer",
                    "description": [
                        "You augment your attacks to hit hard and strike wide. Gain +100% increased physical damage with bows and crossbows for the duration. Also, your attacks with bows and crossbows on single targets also hit adjacent targets while this buff is active. You may sacrifice this buff as a free action; if you do, your next bow/crossbow attack has +200% increased physical damage and ignores 100% of the target's AC."
                    ],
                    "tags": [
                        "buff",
                        "self-target",
                        "modal"
                    ]
                },
                "Elusive Hunter": {
                    "name": "Elusive Hunter",
                    "class": "Arcane Archer",
                    "description": [
                        "You improve your speed and evasiveness. Gain +15 Move Speed and 50% increased Evasion for the duration. This bonus Move Speed temporarily increases to +30 if you begin your turn adjacent to an enemy, for that turn. You may sacrifice this buff as a free reaction; if you do, dash up to your Move Speed in any direction."
                    ],
                    "tags": [
                        "buff",
                        "self-target",
                        "modal",
                        "dash"
                    ]
                },
                "Swelling Shot": {
                    "name": "Swelling Shot",
                    "class": "Arcane Archer",
                    "description": [
                        "You fire an arrow that bursts into many. Deal 9d8 physical damage to all enemies in a 25 ft square AOE centered on a space in range. The size of this square AOE increases by 10 ft for every buff you have when you cast this ability. If you sacrificed a buff this turn, this attack gains +50% increased physical damage and inflicts Crippled to all enemies hit."
                    ],
                    "tags": [
                        "attack",
                        "ranged",
                        "aoe",
                        "square",
                        "physical",
                        "bow",
                        "crossbow",
                        "conditional",
                        "condition",
                        "cripple"
                    ]
                },
                "Serrated Arrow": {
                    "name": "Serrated Arrow",
                    "class": "Arcane Archer",
                    "description": [
                        "You augment your attacks to tear at flesh and armor. While this buff is active, convert 20% of your physical damage that you deal with bows and crossbows to an equal amount of Bleed inflicted on hit. Also, your attacks with bows and crossbows shred 20 AC from targets that are hit. You may sacrifice this buff as a free action; if you do, your next bow/crossbow attack has 50% of its physical damage converted to an equal amount of Bleed inflicted on hit, and this Bleed ignores the target's CR."
                    ],
                    "tags": [
                        "buff",
                        "self-target",
                        "modal",
                        "condition",
                        "bleed"
                    ]
                },
                "Persistent Hunter": {
                    "name": "Persistent Hunter",
                    "class": "Arcane Archer",
                    "description": [
                        "You push onwards through adversity. Cleanse a condition of your choice on yourself, then gain +30% CR for the duration. Gain an additional +30% CR against crowd control conditions for the duration as part of this buff. You may sacrifice this buff as a free reaction; if you do, cleanse a condition of your choice on yourself."
                    ],
                    "tags": [
                        "buff",
                        "self-target",
                        "conditional",
                        "modal",
                        "cleanse"
                    ]
                }
            }
        },
        "Arcanist": {
            "type": "class",
            "name": "Arcanist",
            "description": "The Arcanist is the entry level destruction mage. For those mages who do not wish to pigeonhole themselves in one element, this class provides damaging spells which can utilize all 8, although it sacrifices some of the special strengths of those classes. The class's passive also grants the user some extra flexibility as far as targeting their spells is concerned, which works well with the class's overall emphasis on both single-target and multi-target/AOE damage. A third branch provides some extra utility, rounding the class out as an excellent first class for a new mage character. Functionally the class is designed to be simple and straightforward, acting as a segway to more complicated mage classes.",
            "passive": {
                "Focus Fire": "When you cast a damaging spell attack that targets a single enemy, you may have the spell become a 15 ft square AOE instead, decreasing the spell's effectiveness by 25%. Alternatively, when you cast a damaging spell attack that is AOE, you may have the spell become single-target instead, increasing the spell's effectiveness by 25%."
            },
            "abilities": {
                "Magic Dart": {
                    "name": "Magic Dart",
                    "class": "Arcanist",
                    "description": [
                        "You fire bolts of pure magic at one or more enemies. Create 3 magic darts of any elements and divide them as you choose amongst 1, 2, or 3 enemies. Each dart deals d12 magic damage of its chosen element."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "destruction",
                        "single-target",
                        "multi-target",
                        "modal"
                    ]
                },
                "Magic Sear": {
                    "name": "Magic Sear",
                    "class": "Arcanist",
                    "description": [
                        "You douse an enemy in destructive mana. Deal 3d12 magic damage of a chosen element to a target in range. The target takes d12 magic damage of the same type at the beginning of each of its turns."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "destruction",
                        "single-target",
                        "condition"
                    ]
                },
                "Magic Bomb": {
                    "name": "Magic Bomb",
                    "class": "Arcanist",
                    "description": [
                        "You create a small explosive ball of mana. Deal 4d12 magic damage of a chosen element type in one of the following AOE shapes of your choice:",
                        "<ul>",
                        "<li>A 25 ft cube</li>",
                        "<li>A 45 ft cross</li>",
                        "</ul>"
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "destruction",
                        "aoe",
                        "square",
                        "cross",
                        "modal"
                    ]
                },
                "Magic Ray": {
                    "name": "Magic Ray",
                    "class": "Arcanist",
                    "description": [
                        "You fire rays of destructive mana. Deal 4d12 magic damage of a chosen element type to all enemies in a 70 ft cone, inflicting a 10% Magic Vulnerability to all targets."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "destruction",
                        "aoe",
                        "cone",
                        "condition",
                        "vulnerability"
                    ]
                },
                "Magic Primer": {
                    "name": "Magic Primer",
                    "class": "Arcanist",
                    "description": [
                        "You charge mana to augment your next spell with raw power. Your next spell attack's damage increases by 30% and will be affected by your critical strike chance and critical damage modifier."
                    ],
                    "tags": [
                        "spell",
                        "empower",
                        "destruction",
                        "self-target",
                        "damage increase"
                    ]
                },
                "Force Spike": {
                    "name": "Force Spike",
                    "class": "Arcanist",
                    "description": [
                        "You turn a mage's mana against them. As a reaction to a spell being cast within range, counter that spell. The caster of the countered spell loses health equal to the amount of mana spent on the countered spell."
                    ],
                    "tags": [
                        "spell",
                        "destruction",
                        "defensive",
                        "counterspell"
                    ]
                }
            }
        },
        "Assassin": {
            "type": "class",
            "name": "Assassin",
            "description": "The Assassin has always been a career of necessity. When a sword is too direct and a fireball too flashy, the dagger has always served as an inconspicuous tool to end someone's life. The Assassin excels at its use, as well as finding its way on top of its prey without being detected. With an excess of frontloaded damage, and the necessary abilities to prepare for a kill, the Assassin always tries to end a fight with the first blow. This class has access to abilities to increase its damage and critical strike chance, as well as various tools to track and sneak up on prey, and close in quickly.",
            "passive": {
                "Assassinate": "If you attack an uninjured enemy with a shortblade, double all damage for that attack."
            },
            "abilities": {
                "Vanish": {
                    "name": "Vanish",
                    "class": "Assassin",
                    "description": [
                        "You move quickly to avoid detection. You immediately become Hidden, and you may dash up to 10 ft in any direction. You may cast this ability as a reaction for 30 stamina."
                    ],
                    "tags": [
                        "self-target",
                        "hidden",
                        "buff",
                        "dash",
                        "modal"
                    ]
                },
                "Maneuver": {
                    "name": "Maneuver",
                    "class": "Assassin",
                    "description": [
                        "You move quickly and can ascend sheer walls. Dash up to 40 ft. During your dash, you can also scale walls up to 40 ft."
                    ],
                    "tags": [
                        "dash",
                        "modal"
                    ]
                },
                "Pursue": {
                    "name": "Pursue",
                    "class": "Assassin",
                    "description": [
                        "You follow quickly after a fleeing enemy. As a reaction to a target in range moving, you may move an equal distance towards the target. You then mark the target, increasing your critical damage modifier by 50% on the marked target. This mark can stack multiple times."
                    ],
                    "tags": [
                        "dash",
                        "conditional",
                        "reaction",
                        "condition",
                        "stackable"
                    ]
                },
                "Stalk": {
                    "name": "Stalk",
                    "class": "Assassin",
                    "description": [
                        "You move quickly from shadow to shadow. Become Hidden. Then, while hidden, you may use this ability to dash up to 60 ft. At the end of your dash, if you make a successful Sneak check, you may repeat this ability at no cost."
                    ],
                    "tags": [
                        "dash",
                        "conditional",
                        "sneak",
                        "continuous"
                    ]
                },
                "Focus": {
                    "name": "Focus",
                    "class": "Assassin",
                    "description": [
                        "You ready yourself for the kill. Your next attack gains an additional 30% critical strike chance. This buff is consumed even if you miss or all of your damage is blocked, and it does not stack with itself."
                    ],
                    "tags": [
                        "self-target",
                        "buff",
                        "improve critical strike chance"
                    ]
                },
                "Sharpen": {
                    "name": "Sharpen",
                    "class": "Assassin",
                    "description": [
                        "You prepare your blades for the kill. For this ability's duration, all of your d4 damage dice become d6 damage dice instead."
                    ],
                    "tags": [
                        "self-target",
                        "buff",
                        "improve damage dice"
                    ]
                },
                "Haste": {
                    "name": "Haste",
                    "class": "Assassin",
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
                "Bloodlust": {
                    "name": "Bloodlust",
                    "class": "Assassin",
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
                "Backstab": {
                    "name": "Backstab",
                    "class": "Assassin",
                    "description": [
                        "You attack from your enemy's blind spot. Deal 3d4 physical damage to a target in range. If you are Hidden, you roll max damage on all damage dice automatically."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "conditional",
                        "melee",
                        "hidden"
                    ]
                },
                "Pounce": {
                    "name": "Pounce",
                    "class": "Assassin",
                    "description": [
                        "You quickly close in on your target before dealing the killing blow. Dash up to 15 ft towards a target, then deal 4d4 physical damage to a target in range."
                    ],
                    "tags": [
                        "attack",
                        "melee",
                        "physical",
                        "dash"
                    ]
                },
                "Skyfall": {
                    "name": "Skyfall",
                    "class": "Assassin",
                    "description": [
                        "You bring death from above. You may cast this ability while falling on a target from at least 10 ft above it. Deal 8d4 physical damage to the target, with a 100% increased critical damage modifier."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "conditional",
                        "melee",
                        "aerial",
                        "empowered"
                    ]
                },
                "Massacre": {
                    "name": "Massacre",
                    "class": "Assassin",
                    "description": [
                        "You strike as a blur, killing many. Deal 16d4 physical damage, dividing your damage dice amongst any number of adjacent targets as you choose. For every damage die a target is hit by, that attack gains 5% Lethality. You roll for critical strike chance only once, for all dice."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "melee",
                        "single-target",
                        "multi-target",
                        "modal",
                        "lethal"
                    ]
                }
            }
        },
        "Bioengineer": {
            "type": "class",
            "name": "Bioengineer",
            "description": "The Bioengineer is a practitioner of Organics alchemy. Frequently, towns will have one or two of these, working on their own blueprints for sale. Organics alchemy is considered the darkest of the alchemical arts, and while some Bioengineers will stick to simple organisms like birds or dogs, others have been known to turn to darker experiments involving people. However, regardless of how they make their living, most Bioengineers aspire to the lost art of creating life in vitro. This class spends time outside of combat creating organisms to be used for a variety of purposes.",
            "passive": {
                "Gift of Life": "At the end of a long rest, you may create the product of a Bioengineer ability without needing the materials. An organism made this way has its Duration extended to 6 hours."
            },
            "abilities": {
                "Amalgam Hunter": {
                    "name": "Amalgam Hunter",
                    "class": "Bioengineer",
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
                "Amalgam Artillery": {
                    "name": "Amalgam Artillery",
                    "class": "Bioengineer",
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
                "Amalgam Trapper": {
                    "name": "Amalgam Trapper",
                    "class": "Bioengineer",
                    "description": [
                        "You create a melee trapper organism. Create an Trapper organism with 40 HP to fight in combat. The Trapper acts on your turn, and has a Move, Major, and Minor action. You can use Command Actions to give it various orders; otherwise, it attacks the closest enemy. It can use its Move action to move up to 70 ft. It can use its Major action to grapple an adjacent target, Immobilizing it. It can use its Minor action to decrease a grappled target's AC or MR by half (if you don't specify, it will choose one randomly)."
                    ],
                    "tags": [
                        "alchemy",
                        "organics",
                        "minion",
                        "single-target",
                        "ac loss",
                        "mr loss",
                        "condition",
                        "immobilize"
                    ]
                },
                "Amalgam Bomber": {
                    "name": "Amalgam Bomber",
                    "class": "Bioengineer",
                    "description": [
                        "You create a bloated creature rigged to explode. Create a Bomber organism with 20 HP to fight in combat. The Bomber acts on your turn, and has a Move, Major, and Minor action. You can use Command Actions to give it various orders; otherwise, it walks towards the closest enemy. It can use its Move action to move up to 15 ft. It can use its Major action to self destruct, dealing 8d12 magic damage of its aspected element in a 25 ft cube (it deals physical damage if non-aspected instead). It can use its Minor action to change its aspected element (if you don't specify, it will choose one randomly; it begins as non-elemental)."
                    ],
                    "tags": [
                        "alchemy",
                        "organics",
                        "minion",
                        "aoe",
                        "physical",
                        "magic"
                    ]
                },
                "Crafted Cleric": {
                    "name": "Crafted Cleric",
                    "class": "Bioengineer",
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
                "Generate Guardian": {
                    "name": "Generate Guardian",
                    "class": "Bioengineer",
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
                "Absorbing Angel": {
                    "name": "Absorbing Angel",
                    "class": "Bioengineer",
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
                "Child of Life": {
                    "name": "Child of Life",
                    "class": "Bioengineer",
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
                "Call to Heel": {
                    "name": "Call to Heel",
                    "class": "Bioengineer",
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
                "Transfer Lifeforce": {
                    "name": "Transfer Lifeforce",
                    "class": "Bioengineer",
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
                "Hibernate": {
                    "name": "Hibernate",
                    "class": "Bioengineer",
                    "description": [
                        "You command an organism to freeze its metabolism. A target organism you created becomes Incapacitated. While Incapacitated in this way, an organism does not deplete its duration. If you cast this ability on an organism that is already Incapacitated in this manner, it cleanses the condition"
                    ],
                    "tags": [
                        "alchemy",
                        "organics",
                        "command",
                        "minion",
                        "condition",
                        "incapacitate"
                    ]
                },
                "Adoption": {
                    "name": "Adoption",
                    "class": "Bioengineer",
                    "description": [
                        "You command an organism to obey a new master. Choose an ally you can see. A target organism you created in range has control if it given to that ally. If you cast this ability on an organism you created in range that is under someone else's control, you may either take control of the organism or give control of it to a new ally."
                    ],
                    "tags": [
                        "alchemy",
                        "organics",
                        "command",
                        "minion",
                        "condition",
                        "incapacitate"
                    ]
                }
            }
        },
        "Captain": {
            "type": "class",
            "name": "Captain",
            "description": "The Captain is a class that transcends the typical playstyle of a character who's build is self-centered or even that of a playstyle that supports others. The goal of this class is to provide a small party with a focused, goal-oriented playstyle. Captain abilities feed into a passive that provides party-wide action economy, but the possible actions within this team action are fixed by orders given by the Captain. A good Captain will understand how to use their fellow party members well and enable them to do what they do best without putting them into difficult positions, and with time, party members will learn a specific Captain's style and put themselves in positions to be used effectively. If all goes well, and with some smart tactical decision making, the beginning of each round should be a surge in forward momentum for the Captain and his allies.",
            "passive": {
                "Follow The Leader": "When initiative is rolled, all allies choose to opt-in to your Orders. At the beginning of each round of combat, all allies who have done so take a free action based on Orders given by Captain abilities. You can only have one set of standing Orders at a time; casting an ability that sets standing Orders changes your standing Orders. If there are no standing Orders, all allies (including those who haven't opted in to Orders) instead get +10 to Initiative, once per combat."
            },
            "abilities": {
                "Blitzkrieg": {
                    "name": "Blitzkrieg",
                    "class": "Captain",
                    "description": [
                        "You lead your forces into swift battle. Deal 5d10 physical damage to a target in range. Then, an ally within 50 ft gains a free reaction to dash to a space adjacent to you. They may then use their normal reaction to cast a physical, melee, attack ability. Then, set standing Orders for your Follow The Leader passive as follows: allies cast a physical, melee, attack ability."
                    ],
                    "tags": [
                        "attack",
                        "single-target",
                        "melee",
                        "physical",
                        "modal"
                    ]
                },
                "Retreat": {
                    "name": "Retreat",
                    "class": "Captain",
                    "description": [
                        "You call for a tactical retreat to regroup. All allies in range gain a free reaction to dash up to their Move Speed away from enemies, then any number of allies may use their normal reaction to cast any heal ability. This ability and the heal abilities cast by allies due to this ability cannot be reacted to. Then, set standing Orders for your Follow The Leader passive as follows: allies cast a heal ability."
                    ],
                    "tags": [
                        "dash",
                        "no-react"
                    ]
                },
                "Inspirational Speech": {
                    "name": "Inspirational Speech",
                    "class": "Captain",
                    "description": [
                        "You give a rousing speech to the troops. All allies in range gain +100% increased damage until the beginning of your next turn. Then, set standing Orders for your Follow The Leader passive as follows: allies cast a buff ability."
                    ],
                    "tags": [
                        "buff"
                    ]
                },
                "Fire At Will": {
                    "name": "Fire At Will",
                    "class": "Captain",
                    "description": [
                        "You concentrate attacks on a single point. Deal 6d10 physical damage to a target in range; you may dash up to 25 ft before or after this attack. Then, an ally anywhere on the battlefield gains a free reaction to Weapon Swap. They may then use their normal reaction to cast a physical, ranged, attack ability. Then set standing Orders for your Follow The Leader passive as follows: allies cast a physical, ranged, attack ability."
                    ],
                    "tags": [
                        "attack",
                        "single-target",
                        "melee",
                        "physical",
                        "modal",
                        "dash"
                    ]
                },
                "Bunker Down": {
                    "name": "Bunker Down",
                    "class": "Captain",
                    "description": [
                        "You order your forces to hold position. All allies in range have their next Move Action automatically converted to a Major Action and each ally becomes invulnerable to damage until the end of each of their turns, or until your concentration breaks (whichever happens first). Each time you cast this ability, it gains a +25% chance to fail. Then, set standing Orders for your Follow The Leader passive as follows: allies quaff a potion or apply a poison to their weapons."
                    ],
                    "tags": [
                        "buff",
                        "concentration"
                    ]
                },
                "Scramble": {
                    "name": "Scramble",
                    "class": "Captain",
                    "description": [
                        "You order everyone to make a break for it. All allies in range dash up to half their Move Speed if moving away from enemies, or twice their Move Speed if moving towards enemies. Then, set standing Orders for your Follow The Leader passive as follows: allies cast a dash ability or teleport spell."
                    ],
                    "tags": [
                        "dash",
                        "modal",
                        "conditional"
                    ]
                }
            }
        },
        "Champion": {
            "type": "class",
            "name": "Champion",
            "description": "The Champion is a fighter that has devoted his life to the mastery of as many weapons as possible. Just like how a mage might study for years to master a wide variety of spells, the Champion trains for years to master a wide variety of both melee and ranged weapons. The Champion has high strength to swing around greatsword and halberds but also has high dexterity to deftly handle whips and rapiers. The class swaps weapons easily, adapting to the situation, and is especially good at showing off the specific strengths and flairs of each type of weapon. The Champion may only require 3 weapon types to unlock, but is further rewarded for mastering more weapons over the course of their adventuring career.",
            "passive": {
                "Master of Arms": "Once per turn, you may freely swap weapons in both hands. After you do, you may make a free autoattack with an extra damage die on the weapon and with the following additional effects, based on weapon type:<ul><li>Axe - Cleave reaches an additional space from your target</li><li>Blunt - The weapon's implicit condition cannot be resisted</li><li>Longblade - The weapon keeps its additional damage die for the rest of the round</li><li>Polearm - Reach is extended to 15 ft for the rest of the round</li><li>Shield - Blocking allows you to repeat this autoattack for the rest of the round as long as a shield remains equipped</li><li>Heavy Throwing Weapon - This attack creates a shockwave around the target, dealing its damage to enemies adjacent to your target as well</li><li>Bow - This attack pushes the target 20 ft away from you</li><li>Bullets - This attack causes a muzzle blast to deal damage to enemies adjacent to you as well</li><li>Crossbow - This attack penetrates enemies to travel its full length</li><li>Fine - This attack ignores AC and MR</li><li>Unarmed - This attack repeats twice more</li><li>Light Throwing Weapons - This attack cannot miss</li><li>Shortblade - This attack has +20% critical strike chance</li><li>Improvised - This attack has 2 more extra damage dice</li></ul>"
            },
            "abilities": {
                "Slice and Dice": {
                    "name": "Slice and Dice",
                    "class": "Champion",
                    "description": [
                        "You hack at an enemy with your weapon. Deal 5d10 physical damage to a target in range. You may reroll any damage dice rolled with this attack, taking the second result. If this attack is made with an axe or sword, take the higher result instead."
                    ],
                    "tags": [
                        "attack",
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
                "Skull Bash": {
                    "name": "Skull Bash",
                    "class": "Champion",
                    "description": [
                        "You bash an enemy's head in with your weapon. Deal 6d10 physical damage to a target in range and Stun them until the end of their next turn. If this attack is made with a blunt weapon or shield, it also hits enemies adjacent to your target."
                    ],
                    "tags": [
                        "attack",
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
                        "stun",
                        "conditional",
                        "multi-target"
                    ]
                },
                "Piercing Blow": {
                    "name": "Piercing Blow",
                    "class": "Champion",
                    "description": [
                        "You skewer your enemy. Deal 7d10 physical damage to a target in range. This attack pierces your target to hit an enemy behind them that is within 15 ft of the initial target for half damage. If this attack is made with a polearm or heavy throwing weapon, the second hit deals full damage instead."
                    ],
                    "tags": [
                        "attack",
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
                "Arsenal of Power": {
                    "name": "Arsenal of Power",
                    "class": "Champion",
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
                        "attack",
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
                        "bleed",
                        "vulnerability"
                    ]
                },
                "Precision Strike": {
                    "name": "Precision Strike",
                    "class": "Champion",
                    "description": [
                        "You carefully strike for a precise point to pass through an enemy's armor. Deal 5d8 physical damage to a target in range. This attack cannot miss, cannot be blocked, ignores AC, and ignores magical defenses. If this attack is made with a fine weapon or unarmed combat, you may dash up to 20 ft before or after the attack."
                    ],
                    "tags": [
                        "attack",
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
                "Fan The Hammer": {
                    "name": "Fan The Hammer",
                    "class": "Champion",
                    "description": [
                        "You fire multiple attacks quickly at a single target. Deal 2d8 physical damage to a target in range, then repeat this for 3 more hits against the same target. This attack cannot be reacted to. If this attack is made with a crossbow or bullet weapon, this ability gains, \"On Hit: Push target 10 ft.\""
                    ],
                    "tags": [
                        "attack",
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
                "Painful Blow": {
                    "name": "Painful Blow",
                    "class": "Champion",
                    "description": [
                        "You attack an enemy's weak points, dealing immense pain. Deal 6d8 physical damage to a target in range and inflict them with a 2d8 Bleed. If this attack is made with a bow or light throwing weapon, inflict the target with 50% physical vulnerability as well."
                    ],
                    "tags": [
                        "attack",
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
                        "bleed",
                        "vulnerability",
                        "condition"
                    ]
                },
                "Arsenal of Finesse": {
                    "name": "Arsenal of Finesse",
                    "class": "Champion",
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
                        "attack",
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
                        "stun",
                        "forced movement",
                        "concentration"
                    ]
                },
                "Disarming Blow": {
                    "name": "Disarming Blow",
                    "class": "Champion",
                    "description": [
                        "You slam your weapon home while also disarming your opponent. Deal 5d6 physical damage to a target in range. That target is disarmed and you may choose to kick the dropped item 30 ft in any direction. If this attack is made with an improvised weapon, you may pick up whatever the target dropped instead and make an autoattack with it if it is a weapon."
                    ],
                    "tags": [
                        "attack",
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
                "Throat Slitter": {
                    "name": "Throat Slitter",
                    "class": "Champion",
                    "description": [
                        "You aim for an enemy's weak points. Deal 6d6 physical damage to a target in range. This attack has your choice of either 15% critical strike chance or 150% critical damage modifier. If this attack is made with a shortblade, you may choose both."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "single-target",
                        "melee",
                        "shortblade",
                        "improvised weapon",
                        "conditional",
                        "modal"
                    ]
                },
                "Parry and Draw": {
                    "name": "Parry and Draw",
                    "class": "Champion",
                    "description": [
                        "You ward off attacks as you switch weapons. As a reaction to an attack, block the attack fully with your currently equipped weapon or shield. Then, you may swap weapons in both hands."
                    ],
                    "tags": [
                        "block",
                        "modal"
                    ]
                },
                "Weapon Juggling": {
                    "name": "Weapon Juggling",
                    "class": "Champion",
                    "description": [
                        "You've mastered the art of swapping weapons seamlessly while attacking with them. Concentrate on this ability; while you do, the weapon swap action is a free action, and Master of Arms can trigger up to twice per turn instead of once per turn. If you would swap to a weapon which would trigger a \"draw weapon\" trigger, ignore the trigger while concentrating on this ability."
                    ],
                    "tags": [
                        "concentration"
                    ]
                }
            }
        },
        "Conjurer": {
            "type": "class",
            "name": "Conjurer",
            "description": "The Conjurer is an entry level mage that specializes in the magical school of Conjurations. This school contains spells that allow the conjurer to form objects out of thin air, using their mana to summon matter or even forming mana into a solid object temporarily. Requiring a fine control of mana and powerful creativity, the Conjurer is designed to have a variety of useful spells for exploration, and is well suited to the life of an adventurer. The branches of this class are loosely divided into short term and long term spells, allowing the Conjurer to make temporary portals for a few seconds, weapons and armor for a few minutes, or walls and bridges to use for hours. While the class lacks some of the more combat oriented spells of other mages, like a proper counterspell or damage spell, Conjurer makes up for it in utility and creative potential, and should be a welcome addition to any party looking to make day to day life easier.",
            "passive": {
                "Arcane Toolbox": "After you complete a long rest, select any number of conjuration spells whose mana costs add up to at most 30% of your maximum Mana. Until the beginning of your next long rest, you may cast each of those spells once without paying their mana costs."
            },
            "abilities": {
                "Web": {
                    "name": "Web",
                    "class": "Conjurer",
                    "description": [
                        "You spew out skeins of sticky mana. Choose one:",
                        "<ul>",
                        "<li>Attach yourself or another target in range to a surface within range, preventing them from falling or being pushed further from that surface until the beginning of your next turn</li>",
                        "<li>Target in range becomes Immobilized until the end of their next turn</li>",
                        "</ul>"
                    ],
                    "tags": [
                        "spell",
                        "conjuration",
                        "modal",
                        "attack",
                        "condition",
                        "immobilize"
                    ]
                },
                "Fog": {
                    "name": "Fog",
                    "class": "Conjurer",
                    "description": [
                        "You cast out mana as a cloud. Create a Fog field in a 35 ft square centered on a point in range. You and your allies can see through the Fog; other entities have obscured vision (Blinded) within the field. The field lasts until the end of your next turn. If this spell would end, you may recast this spell as a free reaction instead."
                    ],
                    "tags": [
                        "spell",
                        "conjuration",
                        "field",
                        "condition",
                        "blind",
                        "aoe",
                        "square"
                    ]
                },
                "Armament": {
                    "name": "Armament",
                    "class": "Conjurer",
                    "description": [
                        "You create a weapon or piece of armor for temporary use. Create a mundane weapon or piece of armor of your choosing and equip it to a target in range. This spell fails if the equipment slot being affected is already filled."
                    ],
                    "tags": [
                        "spell",
                        "conjuration",
                        "modal",
                        "conditional"
                    ]
                },
                "Self Defense Turret": {
                    "name": "Self Defense Turret",
                    "class": "Conjurer",
                    "description": [
                        "You create a specialized defense totem. Create an SDF totem in an empty space within range, with 100 HP. When the totem takes damage, it deals twice as much damage of the same type back at the attacker. While the SDF totem is active and within 50 ft of you, you may use your reaction to redirect an attack targeting you or an ally to the totem."
                    ],
                    "tags": [
                        "spell",
                        "conjuration",
                        "modal",
                        "conditional",
                        "totem"
                    ]
                },
                "Force Wall": {
                    "name": "Force Wall",
                    "class": "Conjurer",
                    "description": [
                        "You form a surface of solidified mana. Choose one:",
                        "<ul>",
                        "<li>Create a 10 ft wide, 100 ft long bridge starting in an empty space in range. Allies cannot be pushed off the bridge.</li>",
                        "<li>Create a 20 ft high, 20 ft wide wall centered on an empty space in range. Allies can freely see through, walk through, and fire projectiles through the wall.</li>",
                        "</ul>"
                    ],
                    "tags": [
                        "spell",
                        "conjuration",
                        "modal"
                    ]
                },
                "Mansion": {
                    "name": "Mansion",
                    "class": "Conjurer",
                    "description": [
                        "You create a large building for a group to rest in. Create a Mansion that occupies an empty 105 ft square centered on a point in range (you may optionally decrease the size of the Mansion to fit smaller spaces, down to a lower limit of 35 ft square). You freely control who can enter the Mansion, and occupants of the Mansion can freely control the interior's furnishings. The Mansion protects occupants from the elements as well as from intruders."
                    ],
                    "tags": [
                        "spell",
                        "conjuration",
                        "modal",
                        "aoe",
                        "square"
                    ]
                }
            }
        },
        "Controller": {
            "type": "class",
            "name": "Controller",
            "description": "The Controller is a mid-level practitioner of magic which specializes in the school of Control. These spells deal primarily with controlling the actions of other entities. The name of the game here is limiting the number of options your opponents have available to them, or outright determining their actions for yourself. Slows, stuns, and other crowd control spells fall under this category, inhibiting the actions that enemies can make in combat. Outside of combat, charms are available to this class, emulating full-blown mind control with some basic restrictions (typically, no self-harm). This class lacks any significant damaging spells, but makes up for this by having the most robust list of control spells in the system. A Controller is an excellent addition to a large army, a small adventuring group, or even in a solo-build. That being said, some view Control magic as the most evil kind of magic, taking away people's freedoms.",
            "passive": {
                "Internalized Oppression": "When you target an entity with a control spell, apply a stack of the Oppression mark. Your spells against targets with Oppression have 30% increased effectiveness per stack of the mark."
            },
            "abilities": {
                "Hold Person": {
                    "name": "Hold Person",
                    "class": "Controller",
                    "description": [
                        "You bind an enemy with magic. A target in range becomes Stunned until the end of your next turn. You may recast this spell while concentrating on it for 10 mana; if you do, the duration is extended for an additional round."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "single-target",
                        "control",
                        "condition",
                        "stun",
                        "conditional",
                        "modal",
                        "concentration"
                    ]
                },
                "Mass Slow": {
                    "name": "Mass Slow",
                    "class": "Controller",
                    "description": [
                        "You cast out many skeins of mana to impede opponents. Up to 4 targets in range become Slowed for the duration. For every additional 15 mana you spend when you cast this spell, you may choose 4 additional targets."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "multi-target",
                        "control",
                        "condition",
                        "slow",
                        "modal",
                        "concentration"
                    ]
                },
                "Baneful Curse": {
                    "name": "Baneful Curse",
                    "class": "Controller",
                    "description": [
                        "You curse an enemy with bad luck. A target in range gains a mark which gives -20 to all skill checks for the duration. You may spend 1 minute casting this spell as a minor ritual; if you do, its duration is 6 hours. You may spend 10 minutes casting this spell as a major ritual; if you do, its duration is 24 hours."
                    ],
                    "tags": [
                        "spell",
                        "control",
                        "modal",
                        "minor ritual",
                        "major ritual"
                    ]
                }
            }
        },
        "Cryomancer": {
            "type": "class",
            "name": "Cryomancer",
            "description": "The Cryomancer is one of 8 offensive elemental mages. Harnessing the merciless aspect of ice, the Cryomancer is a flexible class that deals both single target and AOE damage, but especially excels at controlling the battlefield with crowd control spells. She can create spears of ice to impale enemies or freeze dozens of enemies solid. The Cryomancer provides a powerful defense with the power of ice and cold, and has plenty of offensive options to finish a fight.",
            "passive": {
                "Frostbite": "For every round an enemy is affected by a condition applied by one of your spells, they gain a stack of Frostbite. When you inflict ice magic damage on a target, you may choose to consume all stacks of Frostbite on that target. Your ice magic damage is increased by 50% for every stack of Frostbite consumed in this manner for that instance of ice magic damage. Frostbite is not a condition, and does not require concentration"
            },
            "abilities": {
                "Ice Spear": {
                    "name": "Ice Spear",
                    "class": "Cryomancer",
                    "description": [
                        "You form a spear of ice and fire it at a nearby target. Deal 6d8 ice magic damage to a target in range. The ice spear passes through any enemies along its path, dealing half damage."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "ranged",
                        "ice",
                        "destruction",
                        "damage",
                        "single-target",
                        "multi-target"
                    ]
                },
                "Glacial Crash": {
                    "name": "Glacial Crash",
                    "class": "Cryomancer",
                    "description": [
                        "You cause spears of ice to erupt around you. Enemies within 5 ft of you take 8d8 ice magic damage and are Frozen. Enemies within 10 ft of you take 6d8 ice magic damage and are Slowed. Enemies within 15 ft of you take 4d8 damage."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "ice",
                        "destruction",
                        "damage",
                        "self-target",
                        "condition",
                        "control",
                        "slow",
                        "frozen",
                        "aoe"
                    ]
                },
                "Shatter": {
                    "name": "Shatter",
                    "class": "Cryomancer",
                    "description": [
                        "You shatter an enemy encased in ice. Deal 10d8 ice magic damage to a target within range who is Frozen. Their Frozen condition ends, and they are Slowed. Then, this spell's effect repeat for an adjacent Frozen target. A target cannot be damaged by this spell more than once per cast."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "ice",
                        "destruction",
                        "damage",
                        "single-target",
                        "conditional",
                        "frozen",
                        "slow",
                        "repeatable"
                    ]
                },
                "Aurora Beam": {
                    "name": "Aurora Beam",
                    "class": "Cryomancer",
                    "description": [
                        "You emit a powerful beam of ice. Deal Xd8 ice magic damage to all targets in a line, where X is the amount of mana expended on this spell divided by 5. You may choose to concentrate on this spell further, and if you do, you may use a major action to repeat this spell for no mana cost, at half its previous damage. If this spell consumes at least 5 stacks of Frostbite, refund half of the mana cost. If this attack consumes at least 10 stacks of Frostbite, refund the full mana cost."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "ice",
                        "destruction",
                        "damage",
                        "aoe",
                        "line",
                        "modal",
                        "continuous",
                        "concentration",
                        "gain mana"
                    ]
                },
                "Flash Freeze": {
                    "name": "Flash Freeze",
                    "class": "Cryomancer",
                    "description": [
                        "You freeze a target solid. Apply Frozen to a target in range, and apply Slow to any enemies adjacent to your target. Applies a stack of your passive on cast, even if resisted."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "ice",
                        "condition",
                        "control",
                        "frozen",
                        "slow",
                        "single target"
                    ]
                },
                "Freezing Wind": {
                    "name": "Freezing Wind",
                    "class": "Cryomancer",
                    "description": [
                        "You conjure a cone of icy wind. Enemies in a 60 ft cone in front of you are Slowed. If an enemy is hit by this spell, and already is Slowed or has a stack of your passive on them, they are Frozen instead."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "ice",
                        "conjuration",
                        "control",
                        "frozen",
                        "slow",
                        "aoe",
                        "cone"
                    ]
                },
                "Hypothermia": {
                    "name": "Hypothermia",
                    "class": "Cryomancer",
                    "description": [
                        "You drop a target's body temperature, slowing their metabolism. A target within range becomes Slowed, loses its Major action, Minor action, and reaction, and loses all Evasion. This spell requires concentration."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "ice",
                        "condition",
                        "control",
                        "slow",
                        "action loss",
                        "evasion loss",
                        "single-target",
                        "concentration"
                    ]
                },
                "Heart of Ice": {
                    "name": "Heart of Ice",
                    "class": "Cryomancer",
                    "description": [
                        "You drape yourself in an icy aura. For the duration of this spell, enemies who move into a space within 30 feet of you become Slowed. Adjacent enemies who attack you become Frozen. Attacks from enemies more than 30 ft away grant you 40% evasion for that attack. Allies who are adjacent to you have all types of damage they deal converted to ice magic damage, and inflict Frostbite on-hit (limited to once per turn). You may use your reaction to cast any ice spell while this buff is active."
                    ],
                    "tags": [
                        "spell",
                        "ice",
                        "buff",
                        "condition",
                        "slow",
                        "frozen",
                        "self-target",
                        "on-hit",
                        "add evasion",
                        "ally buff",
                        "concentration"
                    ]
                },
                "Ice Crafting": {
                    "name": "Ice Crafting",
                    "class": "Cryomancer",
                    "description": [
                        "You create sheets of ice and snow. Cover the ground in a target space in your choice of either ice or snow. Ice spaces force creatures to make Balance checks or fall prone. Snow spaces count as difficult terrain. When you cast this spell, you can repeat it for as many spaces within range as desired, expending 5 more mana for every additional space. You can also create a pillar of ice or snow, with a height of up to 10 ft, in any space for an additional 5 mana."
                    ],
                    "tags": [
                        "spell",
                        "smite-target",
                        "conjuration",
                        "ice",
                        "modal",
                        "repeatable"
                    ]
                },
                "Extinguish": {
                    "name": "Extinguish",
                    "class": "Cryomancer",
                    "description": [
                        "You take advantage of a mage casting a spell, freezing his mana. As a reaction to a target in range casting a spell, you may counter that spell. That target becomes Silenced until the end of their next turn."
                    ],
                    "tags": [
                        "spell",
                        "counterspell",
                        "condition",
                        "defensive",
                        "silence",
                        "control",
                        "ice",
                        "single-target"
                    ]
                },
                "Ice Block": {
                    "name": "Ice Block",
                    "class": "Cryomancer",
                    "description": [
                        "You surround yourself in an icy armor, and manipulate a shield of ice. Increase your AC by 20, and increase your general MR by 30% until the beginning of your next turn. While you have this buff, you may use your reaction to completely block one attack on you or an ally within 30 ft, for no additional mana."
                    ],
                    "tags": [
                        "spell",
                        "defensive",
                        "buff",
                        "ac increase",
                        "mr increase",
                        "block",
                        "self-target",
                        "single-target"
                    ]
                },
                "Frozen  Arena": {
                    "name": "Frozen  Arena",
                    "class": "Cryomancer",
                    "description": [
                        "You create an arena surrounded in ice. Create a 200 ft cube zone centered on a point within range. Within this zone, all enemies have the following: they are revealed; they cannot leave the zone unless you allow them as a free reaction; if they have at least 1 stack of Frostbite, they have their Frostbite doubled at the beginning of each turn. Any entity that dies with at least 1 stack of Frostbite has its Frostbite stacks transferred to another entity of your choice within the zone."
                    ],
                    "tags": [
                        "spell",
                        "ice",
                        "aoe",
                        "zone",
                        "cube",
                        "on-death",
                        "concentration"
                    ]
                }
            }
        },
        "Daggerspell": {
            "type": "class",
            "name": "Daggerspell",
            "description": "The Daggerspell is a rogue that has adapted some minor magics into their kit. In combat, this class uses damaging spells to attack enemies from medium ranges while closing in for the kill with an empowered dagger. The interplay of magic attacks and knife attacks will encourage the player to constantly change their angle of attack, and the benefits to doing so will allow them to dominate short to medium ranges. If melee combat isn't immediately a viable option, the class's passive generates potential while the player casts spells, enabling a powerful singular hit with the knife once the player is ready to execute on a site. Outside of combat, a number of rogue-themed utility spells provide the Daggerspell with magically enhanced rogue abilities, assisting them in various stealth based skills as well as providing them with a powerful set of abilities to lock in a scout archetype when running dungeons. This makes the class an excellent choice for adventurers and less so for anyone working in a more organized function such as an army.",
            "passive": {
                "Ritual Dagger": "When you cast a spell, empower your next attack with a shortblade, granting it on-hit physical damage equal to half of the mana spent."
            },
            "abilities": {
                "Fadeaway Slice": {
                    "name": "Fadeaway Slice",
                    "class": "Daggerspell",
                    "description": [
                        "You slash at an enemy while retreating. Deal 4d4 physical damage to a target in range, then dash up 10 ft in any direction. If this attack was made with an empowered shortblade, dash up to 20 ft instead."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "conditional",
                        "melee",
                        "single-target",
                        "dash",
                        "shortblade"
                    ]
                },
                "Rapid Jab": {
                    "name": "Rapid Jab",
                    "class": "Daggerspell",
                    "description": [
                        "You stab repeatedly with your favored knife. Deal d4 physical damage to a target in range, repeating this attack twice more. If the initial hit was made with an empowered shortblade, the subsequent two hits are empowered in the same manner."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "conditional",
                        "melee",
                        "single-target",
                        "multi-target",
                        "shortblade"
                    ]
                },
                "Shieldbreaker": {
                    "name": "Shieldbreaker",
                    "class": "Daggerspell",
                    "description": [
                        "You slash at magical weavings. Deal 6d4 physical damage to a target in range. This attack cannot be blocked by spells or magical effects and inflicts the target with -20% MR, non-stacking. If this attack was made with an empowered shortblade, inflict -40% MR instead."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "melee",
                        "shortblade",
                        "single-target",
                        "condition",
                        "lose mr",
                        "no block",
                        "conditional"
                    ]
                },
                "Calling Card": {
                    "name": "Calling Card",
                    "class": "Daggerspell",
                    "description": [
                        "You fire an opening salvo of magic before approaching. Deal 5d8 magic damage of a chosen type to a target in range, then dash up to 20 ft towards the target. This spell triggers your Ritual Dagger passive for twice as much empowerment damage."
                    ],
                    "tags": [
                        "spell",
                        "destruction",
                        "attack",
                        "single-target",
                        "dash"
                    ]
                },
                "Witchbolt": {
                    "name": "Witchbolt",
                    "class": "Daggerspell",
                    "description": [
                        "You fire a repeating chain of spells. Deal 6d8 magic damage of a chosen type to a target in range, then concentrate on this spell. While you are concentrating on this spell, you may cast it as a major action for no mana cost (treat this as having spent 30 mana for the purposes of your Ritual Dagger passive)."
                    ],
                    "tags": [
                        "spell",
                        "destruction",
                        "attack",
                        "single-target",
                        "concentration"
                    ]
                },
                "Exposing Tear": {
                    "name": "Exposing Tear",
                    "class": "Daggerspell",
                    "description": [
                        "You slash at an enemy with blades of mana. Deal 8d8 magic damage of a chosen type to a target in range and mark the target. A target marked this way grants attacks against the marked target +10% Critical Strike Chance, and additionally grants attacks with an empowered weapon +100% Critical Damage Modifier."
                    ],
                    "tags": [
                        "spell",
                        "destruction",
                        "attack",
                        "single-target",
                        "mark",
                        "conditional"
                    ]
                },
                "Hidden Blade": {
                    "name": "Hidden Blade",
                    "class": "Daggerspell",
                    "description": [
                        "You prepare yourself to engage with your knife. You gain +15% Critical Strike Chance, and your attacks with empowered shortblades grant you Hidden."
                    ],
                    "tags": [
                        "spell",
                        "utility",
                        "buff",
                        "conditional",
                        "hidden"
                    ]
                },
                "Invisibility": {
                    "name": "Invisibility",
                    "class": "Daggerspell",
                    "description": [
                        "You mask your approach with concealing magic. Choose one:",
                        "<ul>",
                        "<li>Target in range becomes invisible for 1 minute.</li>",
                        "<li>Target in range becomes invisible for 1 hour, which ends when the target casts a spell or makes an attack.</li>",
                        "</ul>",
                        "When you cast this spell, you may spend an additional 20 mana to recast it on a new target, and you may do this any number of times."
                    ],
                    "tags": [
                        "spell",
                        "utility",
                        "buff",
                        "modal",
                        "hidden"
                    ]
                },
                "Rogue's Anlace": {
                    "name": "Rogue's Anlace",
                    "class": "Daggerspell",
                    "description": [
                        "You enchant your dagger with a variety of utility effects. Enchant a target shortblade in range with the following effects: this weapon acts as a magical key, able to unlock mundanely locked doors and chests with ease; this weapon dowses for mundane traps and can disarm them with ease; this weapon warns of enemies within 30 ft, but doesn't provide any other info; when balanced by its hilt on a finger, this weapon falls in the direction of a safe exit path to a building or dungeon one is currently in."
                    ],
                    "tags": [
                        "spell",
                        "destruction",
                        "attack",
                        "single-target",
                        "dash"
                    ]
                }
            }
        },
        "Dancer": {
            "type": "class",
            "name": "Dancer",
            "description": "The Dancer is one of many classes that evolves from the simple non-combat art of dancing. Combining their love for dance with the natural rhythm and furor of combat, the Dancer is able to move between enemies and allies while maintaining the fluid movements of their many forms. Dancing while moving costs additional stamina, but the Dancer can save on stamina costs by being an intelligent choreographer and moving through their many dances in a specific order. Most dances either provide allies with vigor and strength or confuse allies with bewitching and undulating movement.",
            "passive": {
                "Dance The Night Away": "You may cast dance abilities alongside your regular Move Action if you expend twice as much stamina. If you do, your Move Action does not provoke opportunity attacks."
            },
            "abilities": {
                "Belly Dance": {
                    "name": "Belly Dance",
                    "class": "Dancer",
                    "description": [
                        "You charm attackers with your sensual touch and dull their strikes. Inflict a 10% Weaken to a target in range for the duration. This Weaken can stack up to 4 times. This ability costs 10 less stamina if your last Move Action included a Step 3 dance ability."
                    ],
                    "tags": [
                        "attack",
                        "condition",
                        "weaken",
                        "stacking",
                        "conditional",
                        "dance",
                        "step 1"
                    ]
                },
                "Swing": {
                    "name": "Swing",
                    "class": "Dancer",
                    "description": [
                        "You force enemies to join you in dance. Push a target in range 20 ft in any direction. If the target hits other entities during its forced movement, it pushes them as well. This ability costs 15 less stamina if your last Move Action included a Step 1 dance ability."
                    ],
                    "tags": [
                        "attack",
                        "push",
                        "conditional",
                        "dance",
                        "step 2"
                    ]
                },
                "Jive": {
                    "name": "Jive",
                    "class": "Dancer",
                    "description": [
                        "You confound enemies with swirling limb and step. Inflict Confusion on an enemy in range. While an enemy is Confused in this manner, you may choose a specific direction when they move or attack, and the chosen direction becomes 3 times as likely to be selected when they roll. This ability costs 20 less stamina if your last Move Action included a Step 2 dance ability."
                    ],
                    "tags": [
                        "attack",
                        "condition",
                        "confuse",
                        "modal",
                        "dance",
                        "step 3"
                    ]
                },
                "Tango": {
                    "name": "Tango",
                    "class": "Dancer",
                    "description": [
                        "You join up with a partner, giving them time to recover while you guide their step. Cleanse 1 condition on yourself or cleanse 1 condition on an ally in range and push them 5 ft in any direction. This ability costs 10 less stamina if your last Move Action included a Step 1 dance ability."
                    ],
                    "tags": [
                        "cleanse",
                        "push",
                        "conditional",
                        "dance",
                        "step 2"
                    ]
                },
                "Waltz": {
                    "name": "Waltz",
                    "class": "Dancer",
                    "description": [
                        "You reinvigorate an ally with your beautiful dance moves. Heal 3d10 for a target in range and cleanse Poison, Bleed, and Burn. This ability costs 15 less stamina if your last Move Action included a Step 2 ability."
                    ],
                    "tags": [
                        "cleanse",
                        "heal",
                        "conditional",
                        "dance",
                        "step 3"
                    ]
                },
                "Boogie": {
                    "name": "Boogie",
                    "class": "Dancer",
                    "description": [
                        "You dance with an ally, energizing them. Dash up to your move speed, moving an ally in range with you (if you cast this ability as a Move Action, your movement becomes a dash instead). That ally gains an additional Major Action during their next turn. This ability costs 20 less stamina if your last Move Action included a Step 3 ability."
                    ],
                    "tags": [
                        "dash",
                        "conditional",
                        "dance",
                        "step 1"
                    ]
                },
                "Foxtrot": {
                    "name": "Foxtrot",
                    "class": "Dancer",
                    "description": [
                        "You quickly step and weave across the dance hall. Gain 10% evasion and 10% general MR for the duration. This buff can stack up to 4 times. This ability costs 10 less stamina if your last Move Action included a Step 2 dance ability."
                    ],
                    "tags": [
                        "buff",
                        "gain evasion",
                        "gain mr",
                        "dance",
                        "step 3"
                    ]
                },
                "Moonwalk": {
                    "name": "Moonwalk",
                    "class": "Dancer",
                    "description": [
                        "You slide across the dance hall. Gain 10 movement speed. This buff can stack up to 4 times. This ability costs 15 less stamina if your last Move Action included a Step 3 dance ability."
                    ],
                    "tags": [
                        "buff",
                        "gain move speed",
                        "conditional",
                        "dance",
                        "step 1"
                    ]
                },
                "Ballet": {
                    "name": "Ballet",
                    "class": "Dancer",
                    "description": [
                        "Your mystical dance seems graceful on the outside, yet requires incredible athletics. Gain +10% general CR and +10% CR of a type of your choice. This buff can stack up to 2 times. This ability costs 20 less stamina if your last Move Action included a Step 1 dance ability."
                    ],
                    "tags": [
                        "buff",
                        "gain cr",
                        "conditional",
                        "dance",
                        "step 2"
                    ]
                }
            }
        },
        "Dark Duelist": {
            "type": "class",
            "name": "Dark Duelist",
            "description": "The Dark Duelist is one of many spellblade variants that focuses on one element and one weapon. This class wields a two-handed greatsword, and channels terrible dark magic through his weapon. By seamlessly weaving together sword strikes with dark magic spells, the Dark Duelist has excellent action economy. His individual spells are weaker than a dedicated dark mage, but his weapon provides additional flexibility, and his offensive output can surpass a regular warrior's with efficient usage of both physical and magical arts. His spells are primarily offensive or buffing in nature, with some additional condition spells due to his dark aspect, and a manipulation of Curses for more damage.",
            "passive": {
                "Scars of Darkness": "When you deal physical damage to a target with a greatsword, you afflict them with a Scar. Dealing dark magic damage with a spell to a Scarred target consumes the Scar and refreshes your Major Action."
            },
            "abilities": {
                "Shadow Strike": {
                    "name": "Shadow Strike",
                    "class": "Dark Duelist",
                    "description": [
                        "You slash with your blade, which thirsts for cursed flesh. Deal 3d12 + Xd12 physical damage to a target in range, where X is the number of Curses on the target."
                    ],
                    "tags": [
                        "attack",
                        "melee",
                        "physical",
                        "greatsword",
                        "conditional",
                        "curse"
                    ]
                },
                "Void Slash": {
                    "name": "Void Slash",
                    "class": "Dark Duelist",
                    "description": [
                        "You strike from afar as your blade seeks cursed flesh. Deal 4d12 physical damage to a target you can see within range. If your target is Cursed, this attack can hit through barriers and walls, ignores shields and blocks, and bypasses AC."
                    ],
                    "tags": [
                        "attack",
                        "ranged",
                        "physical",
                        "greatsword",
                        "conditional",
                        "curse",
                        "armor penetration",
                        "phase wall",
                        "phase block"
                    ]
                },
                "Vampiric Slash": {
                    "name": "Vampiric Slash",
                    "class": "Dark Duelist",
                    "description": [
                        "You reap life energy from cursed flesh. Deal 5d12 physical damage to a target in range. If the target has any Curses, expunge those Curses immediately, then select one of the following effects for each Curse expunged this way:",
                        "<ul>",
                        "<li>Heal for 2d12</li>",
                        "<li>Empower your next attack with a greatsword or dark spell, increasing damage by 50%</li>",
                        "</ul>"
                    ],
                    "tags": [
                        "attack",
                        "melee",
                        "physical",
                        "greatsword",
                        "conditional",
                        "curse",
                        "modal",
                        "heal",
                        "empower"
                    ]
                },
                "Lifereaper": {
                    "name": "Lifereaper",
                    "class": "Dark Duelist",
                    "description": [
                        "Your blade expands, empowered by dark magic, and you raze entire groups in one swing. Deal 8d12 physical damage to all targets in range. During the turn you use this ability, Scars of Darkness is changed such that consumed Scars grant you a bonus Major Action rather than refreshing your Major Action."
                    ],
                    "tags": [
                        "attack",
                        "melee",
                        "physical",
                        "greatsword",
                        "passive alter",
                        "aoe"
                    ]
                },
                "Dark Pulse": {
                    "name": "Dark Pulse",
                    "class": "Dark Duelist",
                    "description": [
                        "You fire a wave of dark, cursed energy. Deal 3d12 dark magic damage and apply a stack of Curse to all enemies in a 20 ft cone in front of you."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "dark",
                        "aoe",
                        "cone",
                        "condition",
                        "curse"
                    ]
                },
                "Shadow Missiles": {
                    "name": "Shadow Missiles",
                    "class": "Dark Duelist",
                    "description": [
                        "You fire a series of dark missiles. Deal 3d12 dark magic damage and apply a stack of Curse to up to 3 targets in range. If the target is Cursed, this spell cannot miss and ignores MR."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "dark",
                        "multi-target",
                        "condition",
                        "curse",
                        "conditional",
                        "no-miss",
                        "mr penetration"
                    ]
                },
                "Shadow Grasp": {
                    "name": "Shadow Grasp",
                    "class": "Dark Duelist",
                    "description": [
                        "You wrap a target in dark energy. Deal 3d12 dark magic damage to a target in range and inflict Immobilize. While a target is Immobilized by this ability, it takes d12 dark magic damage at the beginning of each of its turns, gains a stack of Curse, and cannot have its Curse stacks expunged, except by your abilities or by a free action you can take at any time."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "dark",
                        "single-target",
                        "condition",
                        "immobilize",
                        "curse",
                        "conditional"
                    ]
                },
                "Shadow Puppet": {
                    "name": "Shadow Puppet",
                    "class": "Dark Duelist",
                    "description": [
                        "You summon your shadow to fight by your side. Create a Shadow in range. The shadow has 1 HP and is Immune to physical damage, magic damage, and all conditions. At the beginning of your turn, the Shadow teleports to and attacks an enemy of your choice within 80 ft, dealing damage as if you had autoattacked that enemy, and inflicting any on-hit effects, including a Scar. Instead of using an autoattack, you may have the Shadow use one of your greatsword abilities or one of your dark spells instead, but you must make any stamina or mana expenditures if you do so."
                    ],
                    "tags": [
                        "spell",
                        "summoning",
                        "dark",
                        "concentration",
                        "modal"
                    ]
                },
                "Accursed Blade": {
                    "name": "Accursed Blade",
                    "class": "Dark Duelist",
                    "description": [
                        "You infuse your sword with a terrible curse. For the spell's duration, when you hit a target with a greatsword attack, inflict a Curse on the target."
                    ],
                    "tags": [
                        "spell",
                        "dark",
                        "buff",
                        "self-target",
                        "condition",
                        "curse",
                        "on-hit",
                        "greatsword"
                    ]
                },
                "Sword of Darkness": {
                    "name": "Sword of Darkness",
                    "class": "Dark Duelist",
                    "description": [
                        "You infuse your sword with dark magic energy. For the spell's duration, when you hit a target with a greatsword attack, deal an additional 2d12 dark magic damage on hit."
                    ],
                    "tags": [
                        "spell",
                        "dark",
                        "buff",
                        "self-target",
                        "on-hit",
                        "greatsword"
                    ]
                },
                "Blade of Shadows": {
                    "name": "Blade of Shadows",
                    "class": "Dark Duelist",
                    "description": [
                        "Your blade becomes a thin sheet of dark magic. All damage that you would deal with greatsword attacks have their damage converted to dark magic damage. While this buff is active, dark magic damage you deal with melee sword attacks creates Scars, and consuming Scars additionally refreshes your Minor Action and regenerates 10 stamina."
                    ],
                    "tags": [
                        "spell",
                        "dark",
                        "buff",
                        "self-target",
                        "damage convert",
                        "greatsword",
                        "gain stamina"
                    ]
                },
                "Accursed Armor": {
                    "name": "Accursed Armor",
                    "class": "Dark Duelist",
                    "description": [
                        "You don magically conjured dark armor. Whenever a cursed enemy targets you with an attack, they take 2d12 dark magic damage for each curse on them, gain a 25% chance to miss with their attack (even for attacks that cannot be evaded) for each curse on them, and are dragged 10 ft towards you for each curse on them. For each curse you inflict that is expunged while this ability is active, you gain a stack of Darkness. Each stack of darkness increases your physical and dark magic damage by 25%, up to a limit of 20 stacks."
                    ],
                    "tags": [
                        "spell",
                        "dark",
                        "buff",
                        "conjuration",
                        "self-target",
                        "condition",
                        "curse",
                        "stacking buff",
                        "concentration",
                        "pull"
                    ]
                }
            }
        },
        "Demon Hunter": {
            "type": "class",
            "name": "Demon Hunter",
            "description": "The Demon Hunter has a thankless job. A master of light and lightning magic, and armed with demon slaying weapons, he dives into the fray against the foulest creatures in the multiverse. Sometimes persisting for weeks amongst their kind, doling out holy death in an almost reckless manner; in reality, the Demon Hunter specializes in the simple act of survival against beings who have lived for centuries and mastered every dark art in the book. This class understands well the balance between maintaining a careful defensive manner and exploiting brilliant yet narrow offensive opportunities. The class's passive provides ample defensive options to allow the user to spend their action economy on attacking instead, which in turn grants them further use of their passive. With powerful light and lightning spells similar to the Cleric's, but with a focus on defense, and deadly ranged attacks, the Demon Hunter represents a pinnacle of efficiency, a maelstrom of human willpower, and a nightmare to every demon that crosses his path.",
            "passive": {
                "Evil's Bane": "At the beginning of each turn, gain a stack of Hunter. You also gain a Hunter stack when you successfully deal 100 damage in a single round, but only once per round (this effect refreshes at the beginning of your turn). Lose all stacks of Hunter after combat ends. You may expend a Hunter stack as a free reaction at any time to perform one of the following:<ul><li>Gain an additional reaction this round</li><li>Cleanse a condition of your choice on yourself</li><li>Heal for 5d10 health</li><li>Ignore all effects from enemy fields until the beginning of your next turn</li></ul>"
            },
            "abilities": {
                "Demonbane Blast": {
                    "name": "Demonbane Blast",
                    "class": "Demon Hunter",
                    "description": [
                        "You fire projectiles primed with a blessing to exploit a demon's magical circuit and otherworldly energy. Deal 10d8 physical damage to a target in range; that target then loses 10% of their mana and stamina and loses health equal to the amount of mana and stamina they lost (or would lose if they do not have the stamina or mana to lose). If this attack is made against an entity of demonic origin, it deals double damage and the target loses twice as much health after their mana and stamina loss. You may cast this ability as a free action if you expend 2 Hunter stacks; if you do, this attack ignores AC, cannot be blocked, and bypasses magical barriers."
                    ],
                    "tags": [
                        "attack",
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
                "Consecrated Carnage": {
                    "name": "Consecrated Carnage",
                    "class": "Demon Hunter",
                    "description": [
                        "You dive into danger and fire wildly in a circle, forcing hordes of demons back and to their knees. Dash up to 40 ft in any direction, then deal 8d8 physical damage to all targets in range, pushing them back until they are outside the range, then inflicting Crippled and a 30% Weaken. This attack has 20% increased damage for every enemy within range. Each enemy of demonic origin adds 40% increased damage instead, and is inflicted with a 50% Weaken instead. You may cast this ability as a free action if you expend 2 Hunter stacks; if you do, this attack ignores AC, cannot be blocked, and bypasses magical barriers."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "multi-target",
                        "condition",
                        "cripple",
                        "weaken",
                        "conditional",
                        "modal",
                        "no-block",
                        "bow",
                        "crossbow",
                        "firearm"
                    ]
                },
                "Sanctifying Skewer": {
                    "name": "Sanctifying Skewer",
                    "class": "Demon Hunter",
                    "description": [
                        "You fire penetrating bullets into ranks of demons. Deal 12d8 physical damage to all enemies in a 30 ft line. For every entity of demonic origin this attack targets, its range is increased by 10 ft, and its damage increases by 50%. Enemies damaged by this ability are afflicted with a 20% Light and Lightning Vulnerability, increased to 40% for entities of demonic origin. You may cast this ability as a free action if you expend 2 Hunter stacks; if you do, this attack ignores AC, cannot be blocked, and bypasses magical barriers."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "multi-target",
                        "condition",
                        "vulnerability",
                        "conditional",
                        "modal",
                        "no-block",
                        "bow",
                        "crossbow",
                        "firearm"
                    ]
                },
                "Banishing Bolt": {
                    "name": "Banishing Bolt",
                    "class": "Demon Hunter",
                    "description": [
                        "You fire a bolt of magical energy that tears away a demon's hold on the physical realm. Deal 6d8 lightning magic damage and 5d10 light magic damage to all enemies in a 35 ft square, centered on a space in range; this attack deals double damage and has 30% Lethality against entities of demonic origin. Allies, including yourself, that are caught in the blast will gain the lightning damage rolled as on-hit damage for their next attack and heal for the light damage rolled. This attack leaves behind a field of banishment; within this field, attacks against entities of demonic origin have 30% Lethality and all enemies have -20% MR and CR. The field lasts for 1 minute, but you may expend it as a free action, cleansing 1 condition on every ally, including yourself, that was within the field. You may cast this ability as a free action if you expend 2 Hunter stacks; if you do, this attack ignores MR, cannot be blocked, and bypasses magical barriers."
                    ],
                    "tags": [
                        "spell",
                        "light",
                        "lightning",
                        "attack",
                        "heal",
                        "on-hit",
                        "cleanse",
                        "decrease mr",
                        "decrease cr",
                        "field",
                        "lethality",
                        "destruction",
                        "restoration",
                        "conditional",
                        "modal",
                        "no block",
                        "empower"
                    ]
                },
                "Lifesteal Elegy": {
                    "name": "Lifesteal Elegy",
                    "class": "Demon Hunter",
                    "description": [
                        "You fire waves of magical energy to sap strength from demons. Choose one:",
                        "<ul>",
                        "<li>Deal 10d8 lightning magic damage to all enemies in range. Your next attack is empowered to deal additional light magic damage equal to half the damage dealt by this spell. If this attack hits at least 5 enemies, it also inflicts 2 stacks of Paralysis.</li>",
                        "<li>Deal 9d10 light magic damage to all enemies in range. Heal for half the damage dealt. If this attack hits at least 5 enemies, it also cleanses 3 conditions on any targets within range of your choosing.</li>",
                        "</ul>",
                        "Entities of demonic origin take double damage from this spell and count as 3 enemies each. You may cast this ability as a free action if you expend 2 Hunter stacks; if you do, this attack ignores MR, cannot be blocked, and bypasses magical barriers."
                    ],
                    "tags": [
                        "spell",
                        "light",
                        "lightning",
                        "attack",
                        "aoe",
                        "square",
                        "heal",
                        "condition",
                        "paralysis",
                        "destruction",
                        "restoration",
                        "cleanse",
                        "conditional",
                        "modal"
                    ]
                },
                "Soul Searing Light": {
                    "name": "Soul Searing Light",
                    "class": "Demon Hunter",
                    "description": [
                        "You burn away demonic ichor with your light. Target in range is afflicted with a condition with the following effects: they take 4d8 light magic damage and 4d8 lightning magic damage at the beginning of each of their turns, which is doubled for entities of demonic origin; they are afflicted with a 20% physical damage vulnerability, increased to 40% for entities of demonic origin. You may cast this ability as a free action if you expend 2 Hunter stacks; if you do, this attack cannot be blocked and bypasses magical barriers."
                    ],
                    "tags": [
                        "spell",
                        "light",
                        "lightning",
                        "attack",
                        "condition",
                        "vulnerability",
                        "modal",
                        "conditional",
                        "no-block"
                    ]
                },
                "Hunter's Guile": {
                    "name": "Hunter's Guile",
                    "class": "Demon Hunter",
                    "description": [
                        "You work tirelessly to defend others. As a reaction to an attack on you or an ally, dash up to 30 ft in any direction, blocking all incoming damage and effects in the spaces you travel through (including your original position and your destination) until the end of the turn. If this ability is used to block an attack from an entity of demonic origin, it redirects attacks with doubled damage back at the attacker instead of blocking. After casting this ability, your next attack gains 20% increased damage, which can stack up to 5 times. When you cast this ability, you may expend 1 Hunter stack; if you do, extend the range of the dash to 50 ft."
                    ],
                    "tags": [
                        "dash",
                        "aoe block",
                        "conditional",
                        "modal",
                        "redirect",
                        "empower"
                    ]
                },
                "Essence Scatter": {
                    "name": "Essence Scatter",
                    "class": "Demon Hunter",
                    "description": [
                        "You counter a demonic spell. As a reaction to a target in range casting a spell, you may counter that spell and mark that target until the end of your next turn. A target marked this way takes 50% increased damage from your damaging spells and has -20% CR against your condition-inflicting spells. If this spell is used to counter a spell that would summon a demon, your reaction refreshes. If this spell is used to counter a spell cast by an entity of demonic origin, you are refunded half this spell's mana cost."
                    ],
                    "tags": [
                        "spell",
                        "light",
                        "lightning",
                        "counterspell",
                        "defensive",
                        "mark",
                        "conditional"
                    ]
                },
                "Hunter's Instinct": {
                    "name": "Hunter's Instinct",
                    "class": "Demon Hunter",
                    "description": [
                        "You rely on your finely honed senses to track down demons. You gain information about the position, levels, affinities, and numbers of groups of demons within range. After you detect a demon this way, you can track it regardless of distance for the next 24 hours if you concentrate, even across planes. Demons that are being tracked this way cannot surprise you or hide from you even if invisible, and you see through any illusions they cast. You may track multiple demons this way, but each individual demon requires separate concentration."
                    ],
                    "tags": [
                        "spell",
                        "divination",
                        "utility",
                        "defense",
                        "modal",
                        "concentration"
                    ]
                }
            }
        },
        "Destroyer": {
            "type": "class",
            "name": "Destroyer",
            "description": "The Destroyer is the entry level fighter class for the use of blunt weapons. Blunt weapons usually have lower damage peaks than other weapons, but come with additional on-hit effects such as Cripple or Vulnerable, and crafted blunt weapons tend towards applying other types of on hit effects. Their compatibility overall with crafting materials is high, and the vast majority of these weapons are one handed so a shield can be used (dual wielding is out of the question though). The Destroyer maximizes the use of these weapons with expanding on the on hit effects available through its vicious, high damage attacks, and also adds some terrain destruction and powerful AOE attacks. The focus of this class is to keep enemies from moving too far while dealing increasing amounts of damage, and to be straightforward instead of bogging down the player with decisions. Any weapon in the Blunt Weapons category is fair game for this class, so whether its clubs or flails that mark your fancy, the Destroyer will function the same.",
            "passive": {
                "Aggravated Assault": "Your attacks with melee weapons that inflict crowd control conditions ignore 20% of your targets' AC and CR."
            },
            "abilities": {
                "Slam": {
                    "name": "Slam",
                    "class": "Destroyer",
                    "description": [
                        "You hit an enemy hard and expose their weakness. Deal 4d10 physical damage to a target in range, and inflict Physical Vulnerability equal to 10% + X%, where X is the target's current Physical Vulnerability."
                    ],
                    "tags": [
                        "attack",
                        "melee",
                        "physical",
                        "single-target",
                        "blunt weapon",
                        "on hit",
                        "condition",
                        "vulnerability"
                    ]
                },
                "Mortal Strike": {
                    "name": "Mortal Strike",
                    "class": "Destroyer",
                    "description": [
                        "You crush an enemy's armor. Deal 5d10 physical damage to a target in range. This attack destroys armor before damage calculation, reducing the target's armor by 25% on hit."
                    ],
                    "tags": [
                        "attack",
                        "melee",
                        "physical",
                        "single-target",
                        "blunt weapon",
                        "on hit",
                        "armor shred"
                    ]
                },
                "Execute": {
                    "name": "Execute",
                    "class": "Destroyer",
                    "description": [
                        "You finish off a weakened foe. Deal 6d10 physical damage to a target in range, with lethality equal to the target's missing health after damage calculation."
                    ],
                    "tags": [
                        "attack",
                        "melee",
                        "physical",
                        "single-target",
                        "blunt weapon",
                        "lethality"
                    ]
                },
                "Cleave": {
                    "name": "Cleave",
                    "class": "Destroyer",
                    "description": [
                        "You swing at two enemies. Deal 4d10 physical damage to up to 2 different targets in range. If either target dies, deal 8d10 physical damage to the other target."
                    ],
                    "tags": [
                        "attack",
                        "melee",
                        "physical",
                        "single-target",
                        "multi-target",
                        "blunt weapon",
                        "modal",
                        "conditional"
                    ]
                },
                "Whirlwind": {
                    "name": "Whirlwind",
                    "class": "Destroyer",
                    "description": [
                        "You swing in a wide arc. Deal 5d10 physical damage to all targets in range. Targets with full health take double damage."
                    ],
                    "tags": [
                        "attack",
                        "melee",
                        "physical",
                        "multi-target",
                        "blunt weapon",
                        "conditional"
                    ]
                },
                "Rampage": {
                    "name": "Rampage",
                    "class": "Destroyer",
                    "description": [
                        "You slam your weapon down on a large group. Deal 6d10 physical damage to all targets in a 15 ft cone starting in range, knocking targets prone."
                    ],
                    "tags": [
                        "attack",
                        "melee",
                        "physical",
                        "multi-target",
                        "blunt weapon"
                    ]
                },
                "Demolish": {
                    "name": "Demolish",
                    "class": "Destroyer",
                    "description": [
                        "You destroy buildings and constructs. Attack a construct, building, vehicle, or terrain object that is destructible, and destroy it. You may need to make a Blunt Weapons check for larger or armored targets, and some objects aren't destructible at all (such as hills or mountains)."
                    ],
                    "tags": [
                        "terrain destruction"
                    ]
                },
                "Challenge": {
                    "name": "Challenge",
                    "class": "Destroyer",
                    "description": [
                        "You force enemies to turn their attention to you. Taunt all enemies within range for the duration. Gain 10% increased AC and MR for every enemy taunted this way for the duration"
                    ],
                    "tags": [
                        "condition",
                        "taunt",
                        "gain ac",
                        "gain mr"
                    ]
                },
                "Flatten": {
                    "name": "Flatten",
                    "class": "Destroyer",
                    "description": [
                        "You reduce parts of the ground to flat earth, or create a ditch. Create a shockwave centered on you that causes all spaces within range to be depressed downwards by 20 ft."
                    ],
                    "tags": [
                        "terrain destruction"
                    ]
                }
            }
        },
        "Dragoncaller": {
            "type": "class",
            "name": "Dragoncaller",
            "description": "The Dragoncaller is a class whose identity is deeply entrenched with its lore. Dragons are known to be the only intelligent species with a lifespan over 200 years. Being that all fully matured dragons are natural forces of good, they have much wisdom to impart to the humanoid races, and great physical and magical power to contribute to causes of good and righteousness. The Dragoncaller is, first and foremost, a scholar whose focus is on the physical and magical nature of the draconic lineage and their influence on the natural world and its history. Many Dragoncallers set out on adventure, primarily to learn what they can of the many dragons that inhabit our world, and to create meaningful connections with the ones they manage to come across. Secondarily, Dragoncallers frequently act as middlemen between humanity and dragons who choose to integrate themselves with humanoid societies. It is typical that such relationships break down without a knowledgeable and level-headed individual to bridge the gap between a dragon's sometimes condescending magnanimousity and a humanoid society's sometimes shortsighted treatises. Finally, Dragoncallers provide those not yet matured dragons, whose chaotic natures have yet to give way to true intelligence, a safely directed output for their violence, by summoning them into combat against the forces of evil.",
            "passive": {
                "Draconic Pact": "Each time you create a meaningful bond with an intelligent dragon (by swearing fealty, establishing yourself as an equal, dominating in intellectual debate, proving yourself in combat, indebting yourself or making them indebted to you, learning their history, etc), your summoned creatures permanently gain +100% increased damage."
            },
            "abilities": {
                "Summon Bronze Dragon": {
                    "name": "Summon Bronze Dragon",
                    "class": "Dragoncaller",
                    "description": [
                        "You summon a juvenile bronze dragon, bringer of lightning. Summon a Bronze Dragon with 200 health, large size, 20 AC, 80% EV, 20% MR, 30% CR, and 80 ft flying Move Speed. The Dragon obeys your Commands; otherwise, it uses its Move Action to fly to positions above enemies, its Major Action to either swipe with its claws for 10d10 physical damage on a single target in melee range or use its breath attack for 10d12 lightning magic damage in a 200 ft line AOE, and its Minor Action to either buff all other allies with +10 Move Speed and +10% Armor Penetration for 1 minute, stacking and refreshing, or inflict all enemies with -10 Move Speed and +10% Physical Vulnerability for 1 minute, stacking and refreshing. The Bronze Dragon is a superior predator and hunter; if supplied with a magical signature, it can hunt down any individual anywhere on a plane regardless of distance, unless they are magically hidden."
                    ],
                    "tags": [
                        "spell",
                        "summoning",
                        "minion",
                        "physical",
                        "lightning",
                        "buff",
                        "condition"
                    ]
                },
                "Bronze Dragon Breath": {
                    "name": "Bronze Dragon Breath",
                    "class": "Dragoncaller",
                    "description": [
                        "You release the swift death of a bronze dragon's breath attack. Deal 6d12 lightning magic damage to all enemies in a 200 ft line AOE. All Bronze Dragons you control then use their reactions to use their breath attacks in directions of your choosing."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "destruction",
                        "lightning",
                        "aoe",
                        "line",
                        "conditional"
                    ]
                },
                "Dragonfear": {
                    "name": "Dragonfear",
                    "class": "Dragoncaller",
                    "description": [
                        "You invoke the terrifying aspect of the dragon. Inflict all enemies in the battlefield with Fear and a +20% Weaken. Increase the Weaken by an additional +20% for every Dragon you control."
                    ],
                    "tags": [
                        "spell",
                        "control",
                        "condition",
                        "conditional",
                        "fear",
                        "weaken"
                    ]
                },
                "Summon Silver Dragon": {
                    "name": "Summon Silver Dragon",
                    "class": "Dragoncaller",
                    "description": [
                        "You summon a juvenile silver dragon, bringer of ice. Summon a Silver Dragon with 250 health, large size, 30 AC, 30% EV, 70% MR, 40% CR, and 70 ft flying Move Speed. The Dragon obeys your commands; otherwise, it uses its Move Action to fly to positions above enemies, its Major Action to either swipe with its tail for 8d10 physical damage on all enemy targets in melee range or use its breath attack for 12d8 ice magic damage in an 80 ft cone AOE, and its Minor Action to either buff all other allies with +10% CR and +10% Magic Penetration for 1 minute, stacking and refreshing, or inflict all enemies with -10% CR and +10% Magic Vulnerability for 1 minute, stacking and refreshing. The Silver Dragon is a master of ancient arcane practices; if given a moment to study anything associated with magic, it can provide detailed information about the object of study, and can assist in tampering with or destroying any magic spell or object studied in this manner."
                    ],
                    "tags": [
                        "spell",
                        "summoning",
                        "minion",
                        "physical",
                        "ice",
                        "buff",
                        "condition"
                    ]
                },
                "Silver Dragon Breath": {
                    "name": "Silver Dragon Breath",
                    "class": "Dragoncaller",
                    "description": [
                        "You release the overpowering violence of a silver dragon's breath attack. Deal 10d8 ice magic damage to all enemies in an 80 ft cone AOE. All Silver Dragons you control then use their reactions to use their breath attacks in directions of your choosing."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "destruction",
                        "ice",
                        "aoe",
                        "cone",
                        "conditional"
                    ]
                },
                "Dragonflight": {
                    "name": "Dragonflight",
                    "class": "Dragoncaller",
                    "description": [
                        "You invoke the free spirit of the dragon. An ally in range gains a buff that converts all of their Move Speed into flying Move Speed for the duration, and they cleanse a condition of their choice. When you cast this spell, you may target an additional ally for each Dragon you control."
                    ],
                    "tags": [
                        "spell",
                        "utility",
                        "restoration",
                        "buff",
                        "cleanse",
                        "conditional"
                    ]
                },
                "Summon Gold Dragon": {
                    "name": "Summon Gold Dragon",
                    "class": "Dragoncaller",
                    "description": [
                        "You summon a juvenile gold dragon, bringer of fire. Summon a Gold Dragon with 300 health, large size, 80 AC, 30% EV, 50% MR, 50% CR, and 75 ft flying Move Speed. The Dragon obeys your commands; otherwise, it uses its Move Action to fly to positions above enemies, its Major Action to use its breath attack for 10d12 fire magic damage in a 45 ft square AOE centered on a space within 120 ft (leaving behind a field of fire for 1 minute that deals 60 fire magic damage to entities that start/end their turn within, or enter/leave the field during their turn), and its Minor Action to either buff all other allies with +20% increased damage for 1 minute, stacking and refreshing, or inflict all enemies with +20% Vulnerability, stacking and refreshing. All fire magic damage that the Gold Dragon or its fields inflict ignores 100% of the targets' MR. The Gold Dragon is a shining leader of man and beast; with its assistance, you and your allies cannot fail Beast Mastery or Interaction skill checks, and while you control a Gold Dragon, your maximum number of Commands within a Command Action becomes 5."
                    ],
                    "tags": [
                        "spell",
                        "summoning",
                        "minion",
                        "fire",
                        "buff",
                        "condition",
                        "vulnerability",
                        "field"
                    ]
                },
                "Gold Dragon Breath": {
                    "name": "Gold Dragon Breath",
                    "class": "Dragoncaller",
                    "description": [
                        "You release the devastating destruction of a gold dragon's breath attack. Deal 8d12 fire magic damage to all enemies in a 45 ft square centered on a space in range. All Gold Dragons you control then use their reactions to use their breath attacks on locations of your choosing."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "destruction",
                        "fire",
                        "aoe",
                        "square",
                        "conditional"
                    ]
                },
                "Dragonsight": {
                    "name": "Dragonsight",
                    "class": "Dragoncaller",
                    "description": [
                        "You invoke the supernatural vision of the dragon. An ally in range gains a buff that grants them true sight and your choice of +50% Accuracy, +50% Armor Penetration, or +50% Magic Penetration for the duration. When you cast this spell, you may target an additional ally for each Dragon you control."
                    ],
                    "tags": [
                        "spell",
                        "utility",
                        "buff",
                        "conditional"
                    ]
                }
            }
        },
        "Dynamancer": {
            "type": "class",
            "name": "Dynamancer",
            "description": "The Dynamancer is the entry level lightning mage. Specializing in the turbulent and wild aspect of lightning, the Dynamancer is a class focused mostly on dealing damage to one or multiple enemies, with some small capability to paralyze and stun as well. In exchange for increased offensive power compared to other elements and a heavy amount of flexibility with each spell, lightning mages must deal with the inherent randomness that comes with playing with lightning. Sometimes, the Dynamancer's spells strike true, but other times they fail to reach parity with other mages' spells. The passive provides a small amount of reprieve from the web of random chance, allowing the class to reroll spell damage and effects when their luck is not in their favor and improving average damage in a decently reliable manner.",
            "passive": {
                "Volatile Energy": "When you deal damage with a lightning spell or when you roll lower than a spell's average damage, gain a stack of Energy (gain 2 stacks if both of these are fulfilled). You may spend 1 stack of Energy when you cast a spell to reroll any damage dice of your choice and/or reroll any random effects that spell has. You may only do this once per spell."
            },
            "abilities": {
                "Spark Bolt": {
                    "name": "Spark Bolt",
                    "class": "Dynamancer",
                    "description": [
                        "You fire a small bolt of lightning at an enemy. Deal 4d12 lightning magic damage to a target in range, then randomly choose one of the following:",
                        "<ul>",
                        "<li>50% chance: Deal an additional d12 lightning magic damage</li>",
                        "<li>30% chance: Inflict Paralyzed for 1 minute</li>",
                        "<li>20% chance: Inflict Stunned until the beginning of your next turn</li>",
                        "</ul>"
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "lightning",
                        "destruction",
                        "modal",
                        "random",
                        "condition",
                        "paralysis",
                        "stun",
                        "single-target"
                    ]
                },
                "Live Wire": {
                    "name": "Live Wire",
                    "class": "Dynamancer",
                    "description": [
                        "You charge an enemy with electricity. Deal 2d12 lightning magic damage to a target in range. For the duration, one of the following effects randomly occurs at the beginning of each of the target's turns:",
                        "<ul>",
                        "<li>50% chance: The target takes 2d12 lightning magic damage</li>",
                        "<li>30% chance: The target and all adjacent enemies take 2d12 lightning magic damage</li>",
                        "<li>20% chance: The target and all adjacent enemies take 2d12 lightning magic damage and are inflicted with 20% Lightning Vulnerability</li>",
                        "</ul>"
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "lightning",
                        "destruction",
                        "modal",
                        "random",
                        "condition",
                        "vulnerability",
                        "single-target",
                        "multi-target"
                    ]
                },
                "Lightning Bolt": {
                    "name": "Lightning Bolt",
                    "class": "Dynamancer",
                    "description": [
                        "You fire a large bolt of lightning at multiple enemies. Deal 4d12 lightning magic damage and inflict Paralyzed to all enemies in a 150 ft line starting from your position in any direction. This spell randomly has the following additional properties:",
                        "<ul>",
                        "<li>50% chance: Deal an additional d12 lightning magic damage</li>",
                        "<li>30% chance: This attack ignores MR</li>",
                        "<li>20% chance: This spell cannot be counterspelled</li>",
                        "</ul>"
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "lightning",
                        "destruction",
                        "modal",
                        "random",
                        "aoe",
                        "line",
                        "condition",
                        "paralysis",
                        "ignore mr"
                    ]
                },
                "Lightning Rod": {
                    "name": "Lightning Rod",
                    "class": "Dynamancer",
                    "description": [
                        "You erect a rod that attracts lightning. Deal 3d12 lightning magic damage to all enemies in a 25 ft square centered on a space in range, leaving behind a Lightning Rod totem. The totem activates and deals a random amount of lightning magic damage to all enemies within 25 ft whenever a lightning spell is cast within 100 ft, with the random damage varying between d12 and 3d12."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "lightning",
                        "destruction",
                        "random",
                        "aoe",
                        "square",
                        "conditional",
                        "totem"
                    ]
                },
                "Energize": {
                    "name": "Energize",
                    "class": "Dynamancer",
                    "description": [
                        "You take advantage of random energy to power your spells. The next damaging spell you cast is affected by your critical strike chance and critical damage modifier. That spell also randomly gains one of the following effects:",
                        "<ul>",
                        "<li>50% chance: The spell deals an additional d12 lightning magic damage</li>",
                        "<li>30% chance: The spell's range increases by 20 or 20%, whichever is higher</li>",
                        "<li>20% chance: The spell's mana cost is decreased by 20 or 20%, whichever is lower.</li>",
                        "</ul>"
                    ],
                    "tags": [
                        "empower",
                        "modal",
                        "random",
                        "range increase",
                        "spell",
                        "lightning",
                        "transmutation",
                        "utility"
                    ]
                },
                "Frazzle": {
                    "name": "Frazzle",
                    "class": "Dynamancer",
                    "description": [
                        "You ignite enemy mana with random energy. As a reaction to a target in range casting a spell, counter that spell, then randomly choose one:",
                        "<ul>",
                        "<li>50% chance: The target takes 2d12 lightning magic damage</li>",
                        "<li>30% chance: The target is inflicted with Paralysis</li>",
                        "<li>20% chance: The target is Stunned until the end of its turn</li>",
                        "</ul>"
                    ],
                    "tags": [
                        "spell",
                        "counterspell",
                        "lightning",
                        "defensive",
                        "condition",
                        "paralysis",
                        "stun",
                        "random",
                        "modal"
                    ]
                }
            }
        },
        "Enchanter": {
            "type": "class",
            "name": "Enchanter",
            "description": "The Enchanter is an entry level mage that specializes in the magical school of Enchantment, using magical runes and inscriptions to apply effects to objects and equipment. Such mages are a mainstay of many armies, using their spells to augment the power of weapons and armor as well as reinforcing walls and defensive structures. They are also effective on a smaller scale, assisting party members by providing buff-like effects without taxing buff limit. This class provides a good number of entry level offensive, defensive, and utility effects for the aspiring party mage.",
            "passive": {
                "Perpetual Runology": "You may have enchantment spells you cast that require concentration continue without your concentration at half effectiveness when your concentration breaks or when you choose not to concentrate on the spell when you cast it."
            },
            "abilities": {
                "Modify Weapon": {
                    "name": "Modify Weapon",
                    "class": "Enchanter",
                    "description": [
                        "You temper a weapon with runes of strengthening or weakening. Choose one:",
                        "<ul>",
                        "<li>Target weapon in range gains, \"On Hit: Deal 4d10 physical damage.\"</li>",
                        "<li>Target weapon in range gains, \"While equipped, deal 50% decreased physical damage.\"</li>",
                        "</ul>"
                    ],
                    "tags": [
                        "spell",
                        "enchantment",
                        "modal",
                        "concentration"
                    ]
                },
                "Reforge Armor": {
                    "name": "Reforge Armor",
                    "class": "Enchanter",
                    "description": [
                        "You temper armor with runes of strengthening or weakening. Choose one:",
                        "<ul>",
                        "<li>Target armor in range has its implicit AC, Evasion, MR, and CR increased by 50%.</li>",
                        "<li>Target armor in range loses all AC, Evasion, MR, and CR.</li>",
                        "</ul>"
                    ],
                    "tags": [
                        "spell",
                        "enchantment",
                        "modal",
                        "concentration"
                    ]
                },
                "Alter Jewelry": {
                    "name": "Alter Jewelry",
                    "class": "Enchanter",
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
                        "spell",
                        "enchantment",
                        "modal",
                        "concentration"
                    ]
                },
                "Reconstruct Barrier": {
                    "name": "Reconstruct Barrier",
                    "class": "Enchanter",
                    "description": [
                        "You rebuild a wall or door with runes of locking or breaking. Choose one:",
                        "Target wall in range becomes unbreakable, and all windows and doors in that wall become magically locked.",
                        "Target wall in range crumbles and weakens to become easily breakable, and all windows and doors in that wall become unlocked.",
                        "After choosing an effect, you may choose to spend 1 minute to cast this spell as a minor ritual, extending the duration to 1 hour, or you may spend 10 minutes to cast this spell as a major ritual, extending the duration to 24 hours."
                    ],
                    "tags": [
                        "spell",
                        "enchantment",
                        "utility",
                        "minor ritual",
                        "major ritual",
                        "modal",
                        "concentration"
                    ]
                },
                "Rebuild Floor": {
                    "name": "Rebuild Floor",
                    "class": "Enchanter",
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
                        "spell",
                        "enchantment",
                        "utility",
                        "minor ritual",
                        "major ritual",
                        "modal",
                        "concentration"
                    ]
                },
                "Secure Building": {
                    "name": "Secure Building",
                    "class": "Enchanter",
                    "description": [
                        "You magically ward a building or some number of rooms in a building against enemy magic. Target building in range has any number of its rooms or the entire building gain the following effects: scrying and teleportation magic in or out of the warded area fails; you know if anyone casts a spell inside the warded area and what spell was cast; you know the positions and true magic signatures of all entities within the warded area. You may choose to spend 1 minute to cast this spell as a minor ritual, extending the duration to 1 hour, or you may spend 10 minutes to cast this spell as a major ritual, extending the duration to 24 hours."
                    ],
                    "tags": [
                        "spell",
                        "enchantment",
                        "utility",
                        "defense",
                        "minor ritual",
                        "major ritual",
                        "modal",
                        "concentration"
                    ]
                },
                "Mint Coinage": {
                    "name": "Mint Coinage",
                    "class": "Enchanter",
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
                        "spell",
                        "enchantment",
                        "modal"
                    ]
                },
                "Enhance Vehicle": {
                    "name": "Enhance Vehicle",
                    "class": "Enchanter",
                    "description": [
                        "You power up or power down a vehicle. Choose one:",
                        "<ul>",
                        "<li>Target vehicle in range has its move speed doubled and no longer requires a system to propel it forward (horses, engines) for the duration.</li>",
                        "<li>Target vehicle becomes immobile through its regular means (wheels lock, sails fail, etc) for the duration.</li>",
                        "</ul>",
                        "When you cast this spell, you may choose to expend an additional 10 mana to affect another target Vehicle with a new choice, and you may do this any number of times. Concentration is held once for all instances of this spell within one cast."
                    ],
                    "tags": [
                        "spell",
                        "enchantment",
                        "utility",
                        "modal",
                        "concentration"
                    ]
                },
                "Empower Ammo": {
                    "name": "Empower Ammo",
                    "class": "Enchanter",
                    "description": [
                        "You bless any type of ammo with empowering runes. Target set of up to 10 pieces of ammunition becomes special ammo for the duration, gaining, \"Attacks with this ammo have 50% increased damage and inflict a random condition chosen from the following list: Slow, Immobilize, Cripple, Stun, Blind, Confuse, Sleep, Silence.\""
                    ],
                    "tags": [
                        "spell",
                        "enchantment",
                        "utility",
                        "modal",
                        "concentration"
                    ]
                },
                "Inscribe Book": {
                    "name": "Inscribe Book",
                    "class": "Enchanter",
                    "description": [
                        "You inscribe magic into a book. Target empty book becomes a magical item as you write spell instructions for a spell you know within it. You may enchant multiple spells within a book in this manner. A book with spells inscribed in it in this manner may have up to 10 tiers of spells within it before becoming too full of magic for further enchantment. A player with such a book in their inventory can cast spells written in the book as if they were casting a spell scroll, but the book is never consumed. Instead, each spell within the book can be cast once per day; the book recharges its spells at dawn. An entity may only have one such book in their inventory at any given time; the more full book will automatically destroy the lesser book (if they are equal, one will randomly be destroyed). The mana cost of this spell is X mana, where X is 50 plus the mana cost of the spell being enchanted into the book."
                    ],
                    "tags": [
                        "spell",
                        "enchantment",
                        "utility"
                    ]
                },
                "Bless Equipment": {
                    "name": "Bless Equipment",
                    "class": "Enchanter",
                    "description": [
                        "You enchant a piece of equipment with an assortment of useful blessings. Target equipment in range gains the following properties: the item is indestructible; the item cannot be cursed; the item cannot be lost, stolen, removed by others, or disarmed; the item can only be equipped by the entity who has it equipped at the time of casting this spell (or the first person who equips it after it's been enchanted); the item can be telepathically moved by the owner within 30 ft; the item stores strong memories of the owner made after this enchantment."
                    ],
                    "tags": [
                        "spell",
                        "enchantment",
                        "utility"
                    ]
                },
                "Sphere of Safety": {
                    "name": "Sphere of Safety",
                    "class": "Enchanter",
                    "description": [
                        "You enchant an area to protect others. You enchant a 55 ft AOE centered on a space in range, leaving behind a field of safety. This field cannot be forcibly dispelled or destroyed, and this spell cannot be reacted to. Within this field, no entities can take damage, be inflicted by conditions, die, cast spells, or attack. You may cast this spell as a minor ritual by spending 10 minutes; if you do, its duration becomes 6 hours. You may cast this spell as a major ritual by spending 1 hour; if you do, its duration becomes 24 hours. If you cast this spell as a major ritual, you may attune the spell to a gold, key-like object of approximately 1 ft size; if you do, the spell's duration becomes endless, and it is dispelled if its key is destroyed."
                    ],
                    "tags": [
                        "spell",
                        "enchantment",
                        "defensive"
                    ]
                }
            }
        },
        "Evangelist": {
            "type": "class",
            "name": "Evangelist",
            "description": "Evangelist brings together the most powerful parts of ice and dark magic, casting high powered AOE spells with ease and causing widespread destruction. It also applies the typical conditions that ice and dark are capable of, but goes a step further with some unique curse abilities, including some that work with ice spells. However, the most integral part of the class is the passive, allowing the Evangelist to turn any damaging spell into a powerful and dangerous steroid. Evangelist is designed to be the final step for an ice or dark mage, and thus has a lot of extra power and complexity in its spells, but the passive also grants some extra synergy with other mages, allowing you to recontextualize your spell list into a list of possible augmentations.",
            "passive": {
                "Magia Erebea": "When you cast a damaging spell attack, instead of releasing the spell, you may absorb its energy to enchant your soul. You may only do so with one spell at a time; activating this passive with a new spell when you already have it active will end the previous effect to allow you to absorb the new spell and gain its effects. While enchanted this way, you lose 10 maximum health per turn. Maximum health lost this way is restored after a long rest and is not considered a condition. You may release Magia Erebea as a free reaction; otherwise, it continues until your maximum health reaches one. Magia Erebea is neither spell nor buff. While under the effects of Magia Erebea, you gain the following effects, based on the absorbed spell:<ul><li>Your spell attacks gain on hit damage die equal to the damage die of the absorbed spell (if the spell has multiple modes resulting in multiple possible damage die configurations, take the mode with the lowest potential maximum damage)</li><li>Your spell attacks inflict any conditions that the absorbed spell would inflict as an on hit effect</li><li>Your spell attacks have their range extended by an amount equal to the range of the absorbed spell</li><li>You may have your spell attacks have their damage type changed to any element that the absorbed spell has</li><li>You become elementally aspected to the elements of the absorbed spell</li></ul>"
            },
            "abilities": {
                "Krystalline Basileia": {
                    "name": "Krystalline Basileia",
                    "class": "Evangelist",
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
                        "spell",
                        "attack",
                        "destruction",
                        "aoe",
                        "square",
                        "condition",
                        "frozen",
                        "slowed",
                        "blinded",
                        "curse",
                        "modal",
                        "conditional",
                        "dark",
                        "ice"
                    ]
                },
                "Iaculatio Orcus": {
                    "name": "Iaculatio Orcus",
                    "class": "Evangelist",
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
                        "spell",
                        "attack",
                        "destruction",
                        "dark",
                        "ice",
                        "aoe",
                        "cone",
                        "conditional",
                        "condition",
                        "lethality",
                        "weaken",
                        "slow",
                        "frozen",
                        "modal"
                    ]
                },
                "Ensis Exsequens": {
                    "name": "Ensis Exsequens",
                    "class": "Evangelist",
                    "description": [
                        "You conjure a sword of ice and darkness to cut down enemies. When you cast this spell, create and equip a Sword of Conviction in your main hand. The Sword deals 6d8 ice magic damage and 6d8 dark magic damage to all enemies within 20 ft whenever you make an attack with it. Additionally, it has 50% Lethality against minions and ignores magical barriers. This spell can be absorbed via Magia Erebea as a free Major Action even after the Sword has been deployed as long as it still has at least 20 seconds of its Duration left. If you are under the effects of Magia Erebea, the sword gains your passive's on-hit effects. You may have up to 2 Swords active at a time, with the second Sword occupying your off hand, allowing you to make standard off hand weapon attacks with the same effects as the main hand Sword."
                    ],
                    "tags": [
                        "spell",
                        "conjuration",
                        "destruction",
                        "dark",
                        "ice",
                        "conditional",
                        "modal"
                    ]
                },
                "Frigerans Barathrum": {
                    "name": "Frigerans Barathrum",
                    "class": "Evangelist",
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
                        "spell",
                        "dark",
                        "ice",
                        "condition",
                        "control",
                        "curse",
                        "aoe",
                        "square",
                        "modal",
                        "conditional"
                    ]
                },
                "Anthos Pagetou Khilion Eton": {
                    "name": "Anthos Pagetou Khilion Eton",
                    "class": "Evangelist",
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
                        "spell",
                        "dark",
                        "ice",
                        "condition",
                        "control",
                        "curse",
                        "aoe",
                        "field",
                        "totem",
                        "conditional",
                        "confused"
                    ]
                },
                "Aperantos Capulus": {
                    "name": "Aperantos Capulus",
                    "class": "Evangelist",
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
                        "spell",
                        "field",
                        "concentration",
                        "conditional",
                        "condition",
                        "weaken",
                        "vulnerability",
                        "curse"
                    ]
                },
                "Actus Noctis Erebeae": {
                    "name": "Actus Noctis Erebeae",
                    "class": "Evangelist",
                    "description": [
                        "You exploit your enhanced body's new affinity for magic to store spells for quicker casting. You may only cast this ability while under the effects of Magia Erebea. When you cast a spell, you may pay an additional X mana, where X is the spell's mana cost. If you do, you absorb the spell being cast instead of releasing it. While a spell is absorbed in this manner, you may cast it as a Minor Action or reaction at half its mana cost. You may have multiple spells absorbed simultaneously in this manner. When Magia Erebea is released, all absorbed spells are dispelled."
                    ],
                    "tags": [
                        "conditional",
                        "modal"
                    ]
                },
                "Supplementum Pro Armationem": {
                    "name": "Supplementum Pro Armationem",
                    "class": "Evangelist",
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
                        "conditional"
                    ]
                },
                "Armis Cantamen": {
                    "name": "Armis Cantamen",
                    "class": "Evangelist",
                    "description": [
                        "You convert mana into physical shielding. You may only cast this ability while under the effects of Magia Erebea. When you cast a damaging spell, you may pay an additional 20 mana. If you do, you absorb the spell being cast instead of releasing it. While a spell is absorbed in this manner, the next instance of damage you would take is negated (along with any negative effects associated with that damage), activating the absorbed spell in response and casting it on the damage's source, regardless of distance. When an absorbed spell is cast this way, it cannot be counterspelled. You may have multiple spells absorbed simultaneously in this manner; if you do, they activate one at a time per incoming damage instance, in an order of your choosing. When Magia Erebea is released, all absorbed spells are dispelled."
                    ],
                    "tags": [
                        "conditional",
                        "modal",
                        "negate damage"
                    ]
                }
            }
        },
        "Golem Master": {
            "type": "class",
            "name": "Golem Master",
            "description": "Golem Master is an alchemist that has combined its knowledge of organics and construct alchemy to unlock the lost art of golem creation. Golems are the ultimate in alchemical created life, just falling short of the final goal of all alchemists: true humanoid in vitro development. Golems have many of the qualities of regular humanoids, including middling intelligence, the ability to use equipment and tools, specialized skill sets, and class abilities. They have longer durations and are more durable than regular organics or constructs products, designed to act as extra party members during a dungeon delve or extra guards during open battlefield combat. They even roll death saves when their Health is depleted, just like player characters. This class provides several types of golems one can develop, as well as various ways of assisting golems in their long-term survival.",
            "passive": {
                "Gift of Intelligence": "At the end of a long rest, select a golem in your inventory. It has its Duration extended to 6 hours and its base Health, Stamina, and Mana are doubled. Only one golem may benefit from Gift of Intelligence at a time."
            },
            "abilities": {
                "Golem Soldier": {
                    "name": "Golem Soldier",
                    "class": "Golem Master",
                    "description": [
                        "You develop a golem suited to warfare. Create a Golem Soldier with 100 Health, 50 Stamina, and 30 ft Move Speed. The Soldier obeys all your commands; otherwise, it acts according to its basic level of intelligence to fight with you in combat encounters. The Soldier can equip at most 1 piece of armor, 1 accessory, and 1 weapon. The Soldier can learn physical arts and abilities from other entities by spending 1 minute per ability concentrating with the teaching entity."
                    ],
                    "tags": [
                        "alchemy",
                        "golem",
                        "minion"
                    ]
                },
                "Golem Sapper": {
                    "name": "Golem Sapper",
                    "class": "Golem Master",
                    "description": [
                        "You develop a golem suited to physical effort. Create a Golem Sapper with 50 Health, 100 Stamina, and 30 ft Move Speed. The Sapper obeys all your commands; otherwise, it acts according to its basic level of intelligence to fight with you in combat encounters. The Sapper can equip at most 1 piece of armor, 1 accessory, and 1 weapon. The Sapper is trained in physical skills, and can make any Armor, Athletics, Beast Mastery, Combat, Item Use, or Weapons skill check with a +25 bonus."
                    ],
                    "tags": [
                        "alchemy",
                        "golem",
                        "minion"
                    ]
                },
                "Golem Mage": {
                    "name": "Golem Mage",
                    "class": "Golem Master",
                    "description": [
                        "You develop a golem suited to sorcery. Create a Golem Mage with 100 Health, 50 Mana, and 30 ft Move Speed. The Mage obeys all your commands; otherwise, it acts according to its basic level of intelligence to fight with you in combat encounters. The Mage can equip at most 1 piece of armor, 1 accessory, and 1 magic focus. The Mage can learn magical arts and abilities from other entities by spending 1 minute per ability concentrating with the teaching entity."
                    ],
                    "tags": [
                        "alchemy",
                        "golem",
                        "minion"
                    ]
                },
                "Golem Scholar": {
                    "name": "Golem Scholar",
                    "class": "Golem Master",
                    "description": [
                        "You develop a golem suited to magical knowledge. Create a Golem Scholar with 50 Health, 100 Mana, and 30 ft Move Speed. The Scholar obeys all your commands; otherwise, it acts according to its basic level of intelligence to fight with you in combat encounters. The Scholar can equip at most 1 piece of armor, 1 accessory, and 1 magic focus. The Scholar is trained in studious skills and can make any Alchemy, Artistry, Elements, Knowledge, Magic, or Psionics skill check with a +25 bonus."
                    ],
                    "tags": [
                        "alchemy",
                        "golem",
                        "minion"
                    ]
                },
                "Temporary Shutdown": {
                    "name": "Temporary Shutdown",
                    "class": "Golem Master",
                    "description": [
                        "You disable a golem to save up its life span. Target golem in range returns to your inventory, retaining its current Duration, Health, Stamina, Mana, and any equipment or abilities it has."
                    ],
                    "tags": [
                        "alchemy",
                        "constructs",
                        "organics"
                    ]
                },
                "Recycle": {
                    "name": "Recycle",
                    "class": "Golem Master",
                    "description": [
                        "You store away a dead golem's brain for later use. Target golem corpse in range is broken down, and its brain is added to your inventory. The brain can be used in crafting any golem to impart the owner's knowledge, skills, and abilities to the newly crafted golem."
                    ],
                    "tags": [
                        "alchemy",
                        "constructs",
                        "organics"
                    ]
                }
            }
        },
        "Inventor": {
            "type": "class",
            "name": "Inventor",
            "description": "Inventor is the entry level alchemist that specializes in construct alchemy. Construct alchemy allows one to bring pseudo-life to inanimate objects by first building a body that houses a mixture of chemical and electronic parts to imitate biological functions and intelligence. Constructs, when compared to the organic products of organics alchemy, tend to be more fragile but a little more modular and flexible. Some larger cities might have construct alchemists who build various quality of life constructs to help with day to day work, but this class specializes in constructs more apt at the rigors of an adventuring day. All of the constructs available from this class are made to be deployed in combat as a Minor Action, so they are designed to be compact and straightforward, but many constructs can be highly complex with a lot of moving parts. Finally, the class has abilities allowing you to quickly modify deployed constructs during combat.",
            "passive": {
                "Gift of Knowledge": "At the end of a long rest, you may create the product of an Inventor ability without needing the materials. A construct made this way has its Duration extended to 6 hours."
            },
            "abilities": {
                "Burner Bot": {
                    "name": "Burner Bot",
                    "class": "Inventor",
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
                "Potion Puppet": {
                    "name": "Potion Puppet",
                    "class": "Inventor",
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
                        "modular component"
                    ]
                },
                "Remodulate": {
                    "name": "Remodulate",
                    "class": "Inventor",
                    "description": [
                        "You make adjustments to a currently existing construct. Change the Modular Component of a target allied construct in range to another installed Modular Component."
                    ],
                    "tags": [
                        "alchemy",
                        "constructs"
                    ]
                }
            }
        },
        "Juggernaut": {
            "type": "class",
            "name": "Juggernaut",
            "description": "The Juggernaut is a middle tier fighter that can very effectively front line for a party by acting as a health tank. Decent melee damage with either axes or blunt weapons is augmented by hefty amounts of high efficiency lifesteal, and a handful of other defensive abilities provide greater maximum health, passive healing in combat, or a variety of other health/healing based survivability options. Combine this with the ability to use health as stamina and the Juggernaut stands out as a particularly appealing option for any character with a high amount of Vitality, or a build that prioritizes maximum health. High Pain Tolerance allows a Juggernaut to maintain concentration without worrying about all the damage they're taking. The playstyle of Juggernaut rewards aggressive action, putting yourself in the middle of many enemies, and keeping your health as low as possible without putting yourself dangerously low. The class is purely focused on combat, providing no real out of combat utility, so it works excellently as a mercenary or soldier in an army.",
            "passive": {
                "What Doesn't Kill You": "Attack abilities that cost stamina can be paid for with an equal amount of health instead. Attacks cast this way have their physical damage increased by a percentage equal to the percentage of your missing health."
            },
            "abilities": {
                "Wild Swing": {
                    "name": "Wild Swing",
                    "class": "Juggernaut",
                    "description": [
                        "You swing at an enemy and steal their ardor. Deal 5d10 physical damage to a target in range, and lifesteal for 30% of the damage dealt, increasing to 60% instead if your health is below 30%."
                    ],
                    "tags": [
                        "attack",
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
                "Violent Riot": {
                    "name": "Violent Riot",
                    "class": "Juggernaut",
                    "description": [
                        "You hit multiple enemies to steal their health. Deal 6d10 physical damage to any number of targets in range. Heal 10 health for every enemy who takes damage from this ability."
                    ],
                    "tags": [
                        "attack",
                        "melee",
                        "physical",
                        "multi-target",
                        "blunt weapon",
                        "axe",
                        "heal",
                        "conditional"
                    ]
                },
                "Draining Blow": {
                    "name": "Draining Blow",
                    "class": "Juggernaut",
                    "description": [
                        "You focus on a single enemy to constantly drain their health. Deal 7d10 physical damage to a target in range, healing for the amount of damage rolled. Then you may begin concentrating on this ability. For as long as you maintain concentration, you may repeat this ability at half its cost as long as you continue attacking the same target."
                    ],
                    "tags": [
                        "attack",
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
                "All Out Attack": {
                    "name": "All Out Attack",
                    "class": "Juggernaut",
                    "description": [
                        "You convert missing health into pure power. Deal X physical damage to a target in range, where X is your missing health. Until your next long rest, your current health becomes your new maximum health. If your maximum health is reduced by this effect, you are immune to other effects that reduce your maximum health (except casting this ability again)."
                    ],
                    "tags": [
                        "attack",
                        "melee",
                        "physical",
                        "single-target",
                        "blunt weapon",
                        "axes"
                    ]
                },
                "Hypertension": {
                    "name": "Hypertension",
                    "class": "Juggernaut",
                    "description": [
                        "You increase your blood pressure and maximize your heartiness. Increase your maximum health by 100%; your current health changes by the same ratio. When this buff ends, your current health reverts using the same ratio."
                    ],
                    "tags": [
                        "buff",
                        "health increase",
                        "concentration"
                    ]
                },
                "Blood Boil": {
                    "name": "Blood Boil",
                    "class": "Juggernaut",
                    "description": [
                        "You stand at the front lines and dare enemies to come close. All enemies in range are Taunted for the duration. For every enemy Taunted this way, heal for 10% of your maximum health at the beginning of each of your turns for the duration."
                    ],
                    "tags": [
                        "buff",
                        "heal",
                        "condition",
                        "taunt",
                        "multi-target"
                    ]
                },
                "Purge": {
                    "name": "Purge",
                    "class": "Juggernaut",
                    "description": [
                        "You shed off some health or stamina to shrug off conditions. Cleanse yourself of a condition of your choice; if you spend health for this ability, cleanse 2 conditions instead. Then gain a percentage general CR equal to your percentage missing health for the duration."
                    ],
                    "tags": [
                        "cleanse",
                        "conditional",
                        "gain cr",
                        "buff",
                        "concentration"
                    ]
                },
                "Critical Condition": {
                    "name": "Critical Condition",
                    "class": "Juggernaut",
                    "description": [
                        "You make a final stand before falling. If you would take damage or would pay Health that would deplete your Health to 0, your Health becomes 1 instead. Until the end of your next turn, you gain 100% increased physical damage, 100% Accuracy, 100% Armor Penetration, and your attacks cannot be blocked. At the end of your next turn your health drops to 0 and you become Downed with 70 Downed Health."
                    ],
                    "tags": [
                        "---"
                    ]
                },
                "Hostility": {
                    "name": "Hostility",
                    "class": "Juggernaut",
                    "description": [
                        "You fuel your attacks with health draining power. Your weapon attacks gain, \"On Hit: 15% Lifesteal\" for the duration. If you choose to concentrate on this ability when you cast it, instead your weapon attacks gain, \"On Hit: 25% Lifesteal\"."
                    ],
                    "tags": [
                        "buff",
                        "modal",
                        "concentration",
                        "on hit",
                        "lifesteal"
                    ]
                },
                "Blood For Power": {
                    "name": "Blood For Power",
                    "class": "Juggernaut",
                    "description": [
                        "You exchange health for stamina or mana. Choose one:",
                        "<ul>",
                        "<li>Recover 6d10 stamina</li>",
                        "<li>Recover 6d10 mana</li>",
                        "<li>Recover 3d10 stamina and 3d10 mana</li>",
                        "</ul>"
                    ],
                    "tags": [
                        "recover mana",
                        "recover stamina"
                    ]
                },
                "Tachycardia": {
                    "name": "Tachycardia",
                    "class": "Juggernaut",
                    "description": [
                        "You increase your heart rate and natural speed and power. Gain +30 Move Speed, +5 reach on melee weapons, and +50% Armor Penetration for the duration. Additionally, if you are under 30% health while this buff is active, you have 100% increased physical damage."
                    ],
                    "tags": [
                        "buff",
                        "concentration",
                        "conditional"
                    ]
                },
                "Blood For Vigor": {
                    "name": "Blood For Vigor",
                    "class": "Juggernaut",
                    "description": [
                        "You exchange health for actions. Gain a Major Action this turn. You cannot cast this ability more than once per turn. This ability cannot be reacted to or prevented. Nothing can reduce or prevent the loss of life caused by paying for this ability's cost."
                    ],
                    "tags": [
                        "---"
                    ]
                }
            }
        },
        "Ki Monk": {
            "type": "class",
            "name": "Ki Monk",
            "description": "The Ki Monk is a monk that has managed to unlock the secrets of ki through rigorous physical training and deep meditation. Ki utilizes offensive psionics and allows the Ki Monk to generate ki through their attacks to later use to improve individual attacks in combos as well as improve their combo rate overall. Ki Monks can briefly meditate before combat begins, generating ki for use that combat. Players using this class will be expected to track their ki and learn how to use it wisely; many Ki Monk abilities provide modes that allow for extra effects with the expenditure of ki, but a player might instead choose to hoard ki for the use of extending combos. Ki can convert physical attacks into psionic attacks, add additional psionic damage to physical attacks, provide innate physical and psionic defenses, and provide a variety of other offensively oriented benefits. Perhaps the most useful of these are the abilities involving the use of ki at range, firing powerful blasts of ki at enemies and providing a monk with much needed ranged DPS capabilities.",
            "passive": {
                "Kijong": "Your monk mastery increases. Additionally, when you roll initiative, you may subtract any amount from your rolled value to gain an equal amount of ki. After rolling for combo and failing, you may spend ki to add +1 to the rolled result per ki spent in order to change the result to a success instead."
            },
            "abilities": {
                "Spirit Punch": {
                    "name": "Spirit Punch",
                    "class": "Ki Monk",
                    "description": [
                        "You fire a quick punch to energize your body. Deal 4dU physical damage to a target in range and gain Ki equal to the rolled value. When you cast this ability, you may spend 15 Ki to additionally inflict 4dU psychic damage to the target."
                    ],
                    "tags": [
                        "attack",
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
                "Drain Punch": {
                    "name": "Drain Punch",
                    "class": "Ki Monk",
                    "description": [
                        "You drain the vital force of an enemy with a punch. Deal 5dU physical damage to a target in range and gain Ki equal to half the rolled value. When you cast this ability, you may spend 25 Ki to additionally inflict 5dU psychic damage to the target; if you do, you heal for an amount equal to the psychic damage rolled."
                    ],
                    "tags": [
                        "attack",
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
                "Stunning Strike": {
                    "name": "Stunning Strike",
                    "class": "Ki Monk",
                    "description": [
                        "You use ki to addle an enemy's senses. Deal 6dU physical damage to a target in range and gain dU ki. When you cast this ability, you may spend 40 Ki to additionally inflict 6dU psychic damage to the target; if you do, the target is Stunned until the end of their next turn."
                    ],
                    "tags": [
                        "attack",
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
                        "stun"
                    ]
                },
                "Soul Stealing Strike": {
                    "name": "Soul Stealing Strike",
                    "class": "Ki Monk",
                    "description": [
                        "You deliver a blow that shocks to the core. Deal 8dU physical damage to a target in range. When you cast this ability, you may spend 60 ki to additionally inflict 8dU psychic damage to the target; if you do, this attack has Lethality equal to the target's percentage missing health. If this attack kills a target, you gain 50 ki, increased to 100 ki if you spent ki when casting this ability."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "melee",
                        "single-target",
                        "combo",
                        "psionic",
                        "offensive",
                        "psychic",
                        "modal",
                        "conditional",
                        "lethality"
                    ]
                },
                "Spirit Gun": {
                    "name": "Spirit Gun",
                    "class": "Ki Monk",
                    "description": [
                        "You fire a bullet of concentrated ki. Deal 4dU psychic damage to a target in range. If ki is spent to cast this ability, it has +50% increased damage and the target's Psionics: Defense roll has -20."
                    ],
                    "tags": [
                        "attack",
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
                "Spirit Shotgun": {
                    "name": "Spirit Shotgun",
                    "class": "Ki Monk",
                    "description": [
                        "You fire a spray of ki bullets at many enemies. Deal 5dU psychic damage to all enemies in a 60 ft cone. If ki is spent to cast this ability, it has +50% increased damage and all targets that are hit are knocked back 20 ft."
                    ],
                    "tags": [
                        "attack",
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
                "Spirit Wave": {
                    "name": "Spirit Wave",
                    "class": "Ki Monk",
                    "description": [
                        "You fire a wave of ki. Deal 6dU psychic damage to all enemies in a 120 ft line. If ki is spent to cast this ability, it has +50% increased damage and inflicts 30% Psychic Vulnerability to all targets."
                    ],
                    "tags": [
                        "attack",
                        "ranged",
                        "multi-target",
                        "combo",
                        "psionic",
                        "offensive",
                        "psychic",
                        "modal",
                        "conditional",
                        "condition",
                        "vulnerability"
                    ]
                },
                "Spirit Bomb": {
                    "name": "Spirit Bomb",
                    "class": "Ki Monk",
                    "description": [
                        "You drop concentrated ki on enemies. Deal 8dU psychic damage to all enemies in a 25 ft square centered on a point in range. If ki is spent to cast this ability, it has +50% increased damage and you may recast this ability as a free action."
                    ],
                    "tags": [
                        "attack",
                        "ranged",
                        "multi-target",
                        "combo",
                        "psionic",
                        "offensive",
                        "psychic",
                        "modal",
                        "conditional"
                    ]
                },
                "Find Center": {
                    "name": "Find Center",
                    "class": "Ki Monk",
                    "description": [
                        "You take a moment to center yourself and find stability. Gain 3dU ki. This ability cannot be reacted to by enemies."
                    ],
                    "tags": [
                        "no-react"
                    ]
                },
                "Find Stability": {
                    "name": "Find Stability",
                    "class": "Ki Monk",
                    "description": [
                        "You find stability while under fire. As a reaction to taking damage, gain ki equal to half the percentage of your maximum health that is lost. If your health is below 40%, gain twice as much ki."
                    ],
                    "tags": [
                        "conditional"
                    ]
                },
                "Find Solace": {
                    "name": "Find Solace",
                    "class": "Ki Monk",
                    "description": [
                        "You use ki to cleanse your body of impurities. Cleanse up to 2 conditions on yourself. If your health is below 40%, cleanse up to 4 conditions on yourself instead."
                    ],
                    "tags": [
                        "cleanse",
                        "conditional"
                    ]
                },
                "Find Strength": {
                    "name": "Find Strength",
                    "class": "Ki Monk",
                    "description": [
                        "You use ki to reach for new reserves of power. Recover you choice of either X health or X stamina, where X is the amount of ki you choose to spend to cast this ability."
                    ],
                    "tags": [
                        "modal",
                        "heal"
                    ]
                }
            }
        },
        "Lightning Duelist": {
            "type": "class",
            "name": "Lightning Duelist",
            "description": "The Lightning Duelist is one of many spellblade variants that focuses on one element and one weapon. This class wields a rapier in one hand and volatile lightning magic in the other. By seamlessly weaving together rapier lunges and jabs with lightning magic spells, the Lightning Duelist has excellent action economy. His individual spells are weaker than a dedicated lightning mage's, but his weapon provides increased flexibility and effectiveness at shorter ranges, and his offensive output can surpass a regular duelist's with efficient usage of physical and magical arts. His spells are primary buffing and damaging in nature, with all of the random, violent flavor that lightning spells tend to have, and there is a heavy emphasis on mobility and flexibility of aggressive attack patterns.",
            "passive": {
                "Battle Current": "Whenever you deal lightning magic damage to a target with a spell, you become empowered, and you may have the next attack you make with a rapier occur a second time at no cost. You may choose new targets for the second rapier attack. Battle Current does not stack with itself, but can occur multiple times per turn, and it does not count as a buff or require concentration."
            },
            "abilities": {
                "Lightning Lunge": {
                    "name": "Lightning Lunge",
                    "class": "Lightning Duelist",
                    "description": [
                        "You make a lunging strike at an enemy with your rapier. Dash up to 10 ft, then deal 4d8 physical damage to a target in range."
                    ],
                    "tags": [
                        "attack",
                        "melee",
                        "physical",
                        "rapier",
                        "dash",
                        "single-target"
                    ]
                },
                "Blade Storm": {
                    "name": "Blade Storm",
                    "class": "Lightning Duelist",
                    "description": [
                        "You stab rapidly and repeatedly at an enemy with your rapier. Deal d8 physical damage to a target in range. This attack repeats 2-6 times."
                    ],
                    "tags": [
                        "attack",
                        "melee",
                        "physical",
                        "rapier",
                        "multi-hit",
                        "single-target."
                    ]
                },
                "Shocking Parry": {
                    "name": "Shocking Parry",
                    "class": "Lightning Duelist",
                    "description": [
                        "You parry an enemy's strike and counter. As a reaction to an enemy in range attacking you with a weapon, fully block the attack with your rapier and counterattack, dealing 5d8 physical damage to that enemy. When you hit an enemy with this ability, you have a 50% chance of recovering half the stamina cost."
                    ],
                    "tags": [
                        "attack",
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
                "Flash of Swords": {
                    "name": "Flash of Swords",
                    "class": "Lightning Duelist",
                    "description": [
                        "You move and strike in a blur of deadly speed. Deal 8d8 physical damage to all enemies adjacent to you. Then, dash up to 25 ft to an empty space in range, dealing 4d8 physical damage to all enemies in spaces you pass through. Finally, deal 8d8 physical damage to all enemies adjacent to your dash's final destination. An enemy cannot be hit more than once with this ability per cast (Battle Current's activation counts as a separate cast)."
                    ],
                    "tags": [
                        "attack",
                        "melee",
                        "multi-target",
                        "physical",
                        "rapier",
                        "dash"
                    ]
                },
                "Shock Tendrils": {
                    "name": "Shock Tendrils",
                    "class": "Lightning Duelist",
                    "description": [
                        "You release tendril of energy in front of you. Deal 3d8 lightning magic damage to all enemy targets in a 20 ft line. Then at the end of your turn, this spell deals 3d8 damage to all targets in a 20 ft line with random direction."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "lightning",
                        "aoe",
                        "line",
                        "random"
                    ]
                },
                "Ball Lightning": {
                    "name": "Ball Lightning",
                    "class": "Lightning Duelist",
                    "description": [
                        "You summon a ball of energy that erratically flies around attacking enemies. Summon a Ball Lightning object in an empty space in range. When summoned, it deals 4d8 lightning magic damage to all adjacent enemies. At the beginning of each of your turns, it travels 20 ft in a random direction (stopping when it hits a space it can't enter), then discharges, dealing 2d8 lightning magic damage to all adjacent targets."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "lightning",
                        "aoe",
                        "summoning",
                        "destruction",
                        "random",
                        "concentration"
                    ]
                },
                "Thunder Blast": {
                    "name": "Thunder Blast",
                    "class": "Lightning Duelist",
                    "description": [
                        "You call down a mighty bolt of thunder. Deal 8d8 lightning magic damage to all entities in a 20 ft square. Until the beginning of your next turn, random lightning strikes occur every turn in the target square, dealing 4d8 lightning magic damage to entities struck."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "lightning",
                        "aoe",
                        "ground-target",
                        "random"
                    ]
                },
                "Arc Lightning": {
                    "name": "Arc Lightning",
                    "class": "Lightning Duelist",
                    "description": [
                        "You release a powerful bolt of lightning that bounces between targets. Deal 6d8 lightning magic damage to a target in range, marking them until the end of your next turn. Dealing physical damage to the marked target with a rapier causes a lightning bolt to fire from their bodies, dealing 6d8 lightning magic damage to them and cleansing their mark, as well as dealing 6d8 lightning magic damage to another random enemy within 40 ft and marking them until the end of your next turn."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "ranged",
                        "lightning",
                        "single-target",
                        "mark",
                        "random"
                    ]
                },
                "Taser Blade": {
                    "name": "Taser Blade",
                    "class": "Lightning Duelist",
                    "description": [
                        "You envelop your blade in an electric current. For the spell's duration, when you hit a target with a rapier attack, inflict a stack of Paralysis on the target."
                    ],
                    "tags": [
                        "spell",
                        "lightning",
                        "buff",
                        "self-target",
                        "on-hit",
                        "condition",
                        "paralysis",
                        "rapier"
                    ]
                },
                "Sword of Lightning": {
                    "name": "Sword of Lightning",
                    "class": "Lightning Duelist",
                    "description": [
                        "You envelop your blade in lightning magic energy. For the spell's duration, when you hit a target with a rapier attack, deal an additional 2d8 lightning magic damage on hit."
                    ],
                    "tags": [
                        "spell",
                        "lightning",
                        "buff",
                        "self-target",
                        "on-hit",
                        "rapier"
                    ]
                },
                "Plasma Saber": {
                    "name": "Plasma Saber",
                    "class": "Lightning Duelist",
                    "description": [
                        "Your blade becomes a thin sheet of lightning magic. All damage that you would deal with rapier attacks have their damage converted to lightning magic damage. While this buff is active, Battle Current empowered attacks recover 5, 10, or 15 stamina randomly."
                    ],
                    "tags": [
                        "spell",
                        "lightning",
                        "buff",
                        "self-target",
                        "damage convert",
                        "rapier",
                        "gain stamina"
                    ]
                },
                "Lightning Coil Cuirass": {
                    "name": "Lightning Coil Cuirass",
                    "class": "Lightning Duelist",
                    "description": [
                        "You don magically conjured lightning armor. Whenever an adjacent enemy targets you with an attack, they are inflicted with a stack of Paralysis and take 2d8 lightning magic damage. Whenever you take damage, you may freely dash up to your speed in any direction. While this ability is active, you gain a stack of Lightning on every physical damage hit. You expend all stacks of Lightning when you cast a lightning spell attack, increasing lightning magic damage by 10% for each stack of Lightning expended this way, up to a limit of 20 stacks."
                    ],
                    "tags": [
                        "spell",
                        "lightning",
                        "buff",
                        "self-target",
                        "condition",
                        "paralysis",
                        "stacking buff",
                        "concentration",
                        "dash"
                    ]
                }
            }
        },
        "Luxomancer": {
            "type": "class",
            "name": "Luxomancer",
            "description": "The Luxomancer is a mage who has begun to specialize in the use of light as a magical element. Light is a powerfully supportive element with some high powered damage spells to round out the suite. Light can provide a number of useful buffs such as additional damage, accuracy, and penetration, or defense spells in the form of shielding yourself or blinding enemies. Healing and cleansing spells are also the purview of light; the element has access to the highest value healing spells amongst all eight elements. The damaging spells in the light element tend to have good ratios; AOE damage spells tend to prefer lines instead of squares. A Luxomancer will find that they have a solid suite of spells to play a backline mage within a party, healing and supporting the frontline when necessary, and providing DPS whenever possible. The passive provides the opportunity to convert some of the actions you spend dealing damage into increased healing to be spent on later turns or even at the end of a combat encounter. Luxomancer is an excellent first choice for elemental mages.",
            "passive": {
                "Guiding Light": "When you spend mana on an attack spell, bank half that amount in a special pool of Healing Mana. You can spend Healing Mana only on Restoration spells. Your Healing Mana pool dumps at the end of a combat encounter if you don't spend it beforehand."
            },
            "abilities": {
                "Lightbolt": {
                    "name": "Lightbolt",
                    "class": "Luxomancer",
                    "description": [
                        "You fire photons at an enemy. Deal 4d10 light magic damage to a target in range. This spell banks 100% of its mana cost for your Guiding Light passive."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "light",
                        "destruction",
                        "single-target"
                    ]
                },
                "Light Touch": {
                    "name": "Light Touch",
                    "class": "Luxomancer",
                    "description": [
                        "You pass light into an ally's wounds. Heal a target for 4d10 health. If you cast this spell at touch range, heal the target for 6d10 health instead."
                    ],
                    "tags": [
                        "spell",
                        "light",
                        "restoration",
                        "conditional"
                    ]
                },
                "Dancing Lights": {
                    "name": "Dancing Lights",
                    "class": "Luxomancer",
                    "description": [
                        "You create motes of floating light to see in the dark. Create up to 5 motes of light in spaces within range; they can be attached to visible surfaces or entities. They each cast light in a 50 ft radius. You may spend 1 minute to cast this spell as a minor ritual; if you do, its duration is extended to 1 hour. You may spend 10 minutes to cast this spell as a major ritual; if you do, its duration is extended to 6 hours."
                    ],
                    "tags": [
                        "spell",
                        "light",
                        "conjuration",
                        "utility",
                        "modal",
                        "minor ritual",
                        "major ritual"
                    ]
                }
            }
        },
        "Martial Artist": {
            "type": "class",
            "name": "Martial Artist",
            "description": "The Martial Artist is an entry level monk for a character beginning their journey through the long and arduous path of becoming a master of hand to hand combat. This class provides the initial tools for fighting in close quarters with punches, kicks, grapples, and throws. Additionally, it acts as an introduction to the unique mechanics of monk classes as a whole: dU and combo chance. All monk passives, along with whatever the class's specific passive is, also provide a level of monk mastery. Each level of monk mastery augments a character's dU and their base combo chance. The designation dU refers to the damage dice of an unarmed strike; for a non-monk character, this is a d4, but every additional monk mastery passive increases dU by one dice level, to d6, d8, d10, d12, and finally d20. Additionally, each level of monk mastery augments a character's base combo chance. Combo chance is the percentage chance that after casting a major action ability that has the combo tag that you will be able to follow up with another combo ability that has yet to be used that turn. Base combo chance for a non-monk is 0%, and increases with each monk mastery passive to 10%, 20%, 30%, 35%, and finally 40%. Abilities themselves can temporarily improve one's combo chance; the Martial Artist class provides a branch dedicated to monk related utilities such as this; on top of its single and multi target physical attacks with unarmed strikes, which scale off dU rather than having set damage. With some luck to combo frequently and a dedication to the monk archetype, a character will find that their damage scales rapidly, and a monk can be a powerful physical DPS for a team.",
            "passive": {
                "Flurry Of Blows": "Your monk mastery increases. Additionally, you can make an unarmed autoattack as a Minor Action, or as a free action after succeeding or failing a combo roll."
            },
            "abilities": {
                "Straight Punch": {
                    "name": "Straight Punch",
                    "class": "Martial Artist",
                    "description": [
                        "You strike at an enemy with your fists. Deal 4dU physical damage to a target in range. Your next combo roll has +20% if this is the first move in the combo."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "melee",
                        "single-target",
                        "unarmed",
                        "conditional",
                        "combo"
                    ]
                },
                "Roundhouse Kick": {
                    "name": "Roundhouse Kick",
                    "class": "Martial Artist",
                    "description": [
                        "You kick with a wide stance at nearby enemies. Deal 4dU physical damage to all targets in range. Your next combo roll has +5% for every enemy this attack hits."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "melee",
                        "multi-target",
                        "unarmed",
                        "conditional",
                        "combo"
                    ]
                },
                "Focus Energy": {
                    "name": "Focus Energy",
                    "class": "Martial Artist",
                    "description": [
                        "You focus your energy into your attacks. Your next attack gains an additional +30% combo chance. This buff is consumed even if you fail to combo, if you miss, or your damage is blocked, and it does not stack with itself."
                    ],
                    "tags": [
                        "self-target",
                        "buff",
                        "combo"
                    ]
                },
                "Choke Hold": {
                    "name": "Choke Hold",
                    "class": "Martial Artist",
                    "description": [
                        "You hold an enemy in place with a skilled hold. Deal 5dU physical damage to a target in range and grapple them. You have +15% combo chance for any ability targetting an enemy grappled in this manner. At the end of your combo, you may choose to throw the grappled target 20 ft in any direction."
                    ],
                    "tags": [
                        "attack",
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
                "Flying Kick": {
                    "name": "Flying Kick",
                    "class": "Martial Artist",
                    "description": [
                        "You fly at an enemy with a strong kick. Dash up to 20 ft, then deal 6dU physical damage to a target in range. This ability has +20% combo chance if your dash's total displacement is 20 ft."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "melee",
                        "single-target",
                        "unarmed",
                        "conditional",
                        "combo",
                        "dash"
                    ]
                },
                "Axe Kick": {
                    "name": "Axe Kick",
                    "class": "Martial Artist",
                    "description": [
                        "You drop your heel on a group of enemies. Deal 5dU physical damage to all targets in a 10 ft cone; adjacent targets are stunned until the beginning of their next turn, and non-adjacent targets are pushed 15 ft from you. If you fail to deal damage to, stun, or push any targets, your next combo roll has +20%."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "melee",
                        "multi-target",
                        "unarmed",
                        "conditional",
                        "combo",
                        "condition",
                        "stun",
                        "forced movement"
                    ]
                },
                "Open Palm Strike": {
                    "name": "Open Palm Strike",
                    "class": "Martial Artist",
                    "description": [
                        "You dash forward, striking enemies with an open palm. Dash up to 20 ft in any direction, dealing 6dU physical damage to all enemies you dash through. If you dash through at least 3 enemies, or if you dash through an ally, your next combo roll has +20%"
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "melee",
                        "multi-target",
                        "unarmed",
                        "conditional",
                        "combo",
                        "dash"
                    ]
                },
                "Backstep": {
                    "name": "Backstep",
                    "class": "Martial Artist",
                    "description": [
                        "You quickly evade enemy attacks before preparing for a counterattack. Dash up to 20 ft in any direction. If this dash is used to avoid damage, your next combo roll has +20%."
                    ],
                    "tags": [
                        "self-target",
                        "dash",
                        "conditional",
                        "combo"
                    ]
                },
                "Arrow Catch": {
                    "name": "Arrow Catch",
                    "class": "Martial Artist",
                    "description": [
                        "You catch arrows and send them back at archers. Block a ranged attack on you or an adjacent ally, then you may have your next combo roll have +15% or redirect the attack back at the attacker."
                    ],
                    "tags": [
                        "self-target",
                        "block",
                        "modal",
                        "combo",
                        "conditional",
                        "attack"
                    ]
                },
                "Adaptive Brawling": {
                    "name": "Adaptive Brawling",
                    "class": "Martial Artist",
                    "description": [
                        "You focus your mind and quickly adapt. For the duration, you may reroll a failed combo roll once per turn. If you do, you have -10% combo chance for that roll. This buff's duration resets when you kill an enemy."
                    ],
                    "tags": [
                        "buff",
                        "self-target"
                    ]
                },
                "Dragonfall Kick": {
                    "name": "Dragonfall Kick",
                    "class": "Martial Artist",
                    "description": [
                        "You fly through the air before dropping an earth shattering kick. Dash to an empty space in range, then deal 8dU physical damage to all enemies within 20 ft, knocking them prone and inflicting Crippled. The damage of this ability increases by 20% for every enemy hit. If you choose not to dash with this ability, your next combo roll has +20%."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "melee",
                        "multi-target",
                        "unarmed",
                        "conditional",
                        "combo",
                        "dash",
                        "modal",
                        "condition",
                        "crippled",
                        "knock prone"
                    ]
                }
            }
        },
        "Mirror Mage": {
            "type": "class",
            "name": "Mirror Mage",
            "description": "The Mirror Mage is an advanced mage that uses mirrors made of a combination of ice and light magic to reflect attacks and spells. This class is a natural step for the ice or light mage that sees the potential of line AOE spells or projectiles that are fired in a straight line to be improved upon. Mirrors provide the caster with new angles of attack, helping their spells avoid obstacles and helping the caster achieve line of sight of a target that might be hiding behind cover. As a class that utilizes defensive magic, there's also a host of use cases for these mirrors to protect the caster and their allies by providing reflective barriers, breaking line of sight, and sending enemy attacks right back. Playing this class requires some setup; the Mirror Mage will likely find themselves drawing lines and angles to set up mirrors so that they can fire off projectiles and line AOE spells without having to put themselves in harm's way. With good geometrical sense, the Mirror Mage can hammer enemies from anywhere on the battlefield, regardless of the barriers between.",
            "passive": {
                "Alter Course": "Attacks that are redirected by you have their damage increased by 50%."
            },
            "abilities": {
                "Glass Shot": {
                    "name": "Glass Shot",
                    "class": "Mirror Mage",
                    "description": [
                        "You fire a bolt of mana that vacillates between light and ice. Deal 7d8 magic damage to a target in range; if this attack travels over an odd number of spaces, its magic damage type is ice and it inflicts Slow; if this attack travels over an even number of spaces its magic damage type is light and it inflicts -10% EV."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "single-target",
                        "destruction",
                        "ice",
                        "light",
                        "conditional",
                        "condition",
                        "slow",
                        "lose ev"
                    ]
                },
                "Plane Mirror": {
                    "name": "Plane Mirror",
                    "class": "Mirror Mage",
                    "description": [
                        "You create a mirror of ice and light. Create a Plane Mirror in an empty space in range for the duration, choosing its orientation; it is immune to damage and conditions, cannot be forcibly moved or teleported, but can be dispelled. The Mirror reflects what it sees, providing an additional line of sight for you and allies alone; it acts as an opaque barrier otherwise. When you hit the mirror with a line AOE or straight moving projectile spell, it redirects the attack based on the angle, resetting the attack's range and granting the attack +20% Accuracy. If the mirror is hit by a spell that has been redirected twice already, it is dispelled."
                    ],
                    "tags": [
                        "spell",
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
                "Reflective Barrier": {
                    "name": "Reflective Barrier",
                    "class": "Mirror Mage",
                    "description": [
                        "You protect an area with a mirror. As a reaction to a targeted projectile attack or line AOE attack that would hit you or an ally, create a 15 ft long barrier in empty spaces within range that lasts for the duration. This barrier redirects projectile attacks and line AOEs back at the attacker and also acts as an opaque barrier that blocks line of sight until the end of the turn."
                    ],
                    "tags": [
                        "spell",
                        "defensive",
                        "conjuration",
                        "ice",
                        "light",
                        "conditional"
                    ]
                },
                "Helix Beam": {
                    "name": "Helix Beam",
                    "class": "Mirror Mage",
                    "description": [
                        "You fire a beam of mana that vacillates between light and ice. Deal 9d8 ice or light magic damage to all enemies in a 60 ft line AOE. When this spell is redirected, it converts its damage to the other choice between ice and light magic damage. Ice magic damage dealt by this spell has a 20% chance to inflict Frozen, and light magic damage dealt by this spell has a 20% chance to inflict Stun until the end of the target's turn; the chance of either of these occuring increases by 20% for each time this spell has been redirected."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "destruction",
                        "aoe",
                        "line",
                        "ice",
                        "light",
                        "conditional",
                        "condition",
                        "frozen",
                        "stun",
                        "modal"
                    ]
                },
                "Scatter Shards": {
                    "name": "Scatter Shards",
                    "class": "Mirror Mage",
                    "description": [
                        "You spray out multiple shots of ice and light. Deal 5d8 ice or light magic damage to a target in range, and repeat this attack twice (you may choose new targets). These attacks reflect upon hitting an enemy, being redirected in directions of your choosing, but can only be redirected in this manner once per attack."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "multi-target",
                        "destruction",
                        "ice",
                        "light",
                        "conditional",
                        "modal"
                    ]
                },
                "Beam of Brilliance": {
                    "name": "Beam of Brilliance",
                    "class": "Mirror Mage",
                    "description": [
                        "You launch streams of magic at enemies. Deal 15d8 magic damage to all enemies in a 15 ft wide 60 ft long line AOE; the center line is your choice of either ice or light, and the edge lines are the opposite choice. Ice magic dealt by this spell inflicts Slow and Frozen and light magic dealt by this spell inflicts -20% EV and Stun until the end of the target's turn. When this spell is redirected, it gains 10 ft of width, alternating the element of the newly added lines to maintain the spells element pattern. Enemies whose size is larger than normal are damaged separately by each line that hits them."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "aoe",
                        "line",
                        "destruction",
                        "ice",
                        "light",
                        "modal",
                        "conditional",
                        "condition",
                        "slow",
                        "lose ev",
                        "frozen",
                        "stun"
                    ]
                },
                "Remand": {
                    "name": "Remand",
                    "class": "Mirror Mage",
                    "description": [
                        "You glassify an enemy's mana while it's vulnerable. As a reaction to a target in range casting a spell, you may counter that spell. The mana spent on the enemy spell becomes your mana and you can either release it or use it to cast any spell from the Refraction branch of Mirror Mage as a free reaction."
                    ],
                    "tags": [
                        "spell",
                        "defensive",
                        "counterspell",
                        "modal"
                    ]
                },
                "Mirror's Curse": {
                    "name": "Mirror's Curse",
                    "class": "Mirror Mage",
                    "description": [
                        "You curse an enemy's magical circuits. A target in range gains the following condition: when they cast spells, there is a 50% chance that the spell's target is redirected to the caster (if the spell is an AOE, it is centered on the caster instead)."
                    ],
                    "tags": [
                        "spell",
                        "defensive",
                        "single-target",
                        "condition"
                    ]
                },
                "Glass Armor": {
                    "name": "Glass Armor",
                    "class": "Mirror Mage",
                    "description": [
                        "You cover an ally in plates of mirrored scales. A target in range gains the following buff: All ranged projectile attacks and line AOEs they are hit by are instead redirected at attackers; melee attackers that hit them are pushed back 30 ft; +50% MR; +50% Light MR; +50% Ice MR. This buff has a 50% chance to resist being stripped; if it does so successfully, it instead loses 10 seconds of its duration."
                    ],
                    "tags": [
                        "spell",
                        "defensive",
                        "buff",
                        "gain mr"
                    ]
                },
                "Move Mirrors": {
                    "name": "Move Mirrors",
                    "class": "Mirror Mage",
                    "description": [
                        "You reposition all mirrors. Any number of mirror totems you have created in range move to new positions of your choosing within 30 ft of their previous positions, and you may change their orientations as well. Also, all mirrors have their durations refreshed."
                    ],
                    "tags": [
                        "spell",
                        "utility",
                        "modal"
                    ]
                },
                "Concave Mirror": {
                    "name": "Concave Mirror",
                    "class": "Mirror Mage",
                    "description": [
                        "You create a mirror of ice and light, curved inwards. Create a Concave Mirror in an empty space in range for the duration, choosing its orientation; it is immune to damage and conditions, cannot be forcibly moved or teleported, but can be dispelled. The Mirror reflects what it sees, providing an additional line of sight for you an allies alone; it acts as an opaque barrier otherwise. When the back of the mirror is hit with a line AOE or straight moving projectile spell, it briefly stores the spell until the end of the turn before redirecting all stored spells in an orthagonal direction out the front of the mirror. The damage and effects of all spells stored this way are combined into a single attack, preferring the largest AOE type amongst stored spells, and the new attack has its damage dice maximized, +50% Accuracy, and +50% Magic Penetration. If the mirror is hit by a spell that has been redirected twice already, or if it combines more than 2 spells in one turn, it is dispelled."
                    ],
                    "tags": [
                        "spell",
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
                "Convex Mirror": {
                    "name": "Convex Mirror",
                    "class": "Mirror Mage",
                    "description": [
                        "You create a mirror of ice and light, curved outwards. Create a Convex Mirror in an empty space in range for the duration, choosing its orientation; it is immune to damage and conditions, cannot be forcibly moved or teleported, but can be dispelled. The Mirror reflects what it sees, providing an additional line of sight for you an allies alone; it acts as an opaque barrier otherwise. When the back of the mirror is hit with a line AOE or straight moving projectile spell, it redirects and duplicates the attack out the front side of the mirror at approximately 45 degree angles, resetting the attack's range and granting the attack +20% Accuracy. If the mirror is hit by a spell that has been redirected twice already, it is dispelled."
                    ],
                    "tags": [
                        "spell",
                        "ice",
                        "light",
                        "defensive",
                        "conjuration",
                        "utility",
                        "conditional",
                        "modal",
                        "totem"
                    ]
                }
            }
        },
        "Mistguard": {
            "type": "class",
            "name": "Mistguard",
            "description": "The Mistguard is one of the only classes that uses both heavy armor and spells to act as a magic tank. Ice is one of the most defensive elements available to mages; unlike the more direct defenses provided by earth, ice mages prefer to impede the offensive capabilities of enemies through the use of slows, freezes, and other conditions. All of the attacks provided by this class additionally inflict conditions, and these conditions stack up Weaken effects via the class's passive. The rest of the class is focused on personal tanking as well as protecting allies via physical and magical means. The class has access to the typical tank suite of taunts, defensive stat boosts, and blocks, and additionally has access to magical defenses like counterspells and magical surpression fields. The class somewhat uniquely is useful in fights with multiple enemies rather than one, expending large amounts of resources to be able to tank against large groups, whereas other classes might be more mana and stamina efficient to deal with smaller groups. Overall, this class should provide mages with easy access to the front line of their party.",
            "passive": {
                "Eerie Mists": "Conditions you apply also apply an irresistable, non-stacking Weaken equal to 10% times the number of conditions on the target."
            },
            "abilities": {
                "Deep Snow": {
                    "name": "Deep Snow",
                    "class": "Mistguard",
                    "description": [
                        "You slam enemies with snow. Deal 7d8 ice magic damage to all enemies in range; the affected spaces are then covered in deep snow, a field which acts as difficult terrain and prevents dashing through the field's spaces."
                    ],
                    "tags": [
                        "spell",
                        "ice",
                        "destruction",
                        "defensive",
                        "attack",
                        "multi-target",
                        "field"
                    ]
                },
                "Silver Armor": {
                    "name": "Silver Armor",
                    "class": "Mistguard",
                    "description": [
                        "You harden your armor by freezing it. Buff yourself for +40 AC and +40% MR which cannot be penetrated. Also, gain +60% critical strike resistance if you have none."
                    ],
                    "tags": [
                        "spell",
                        "ice",
                        "defensive",
                        "buff",
                        "gain ac",
                        "gain mr",
                        "conditional"
                    ]
                },
                "Morning Frost": {
                    "name": "Morning Frost",
                    "class": "Mistguard",
                    "description": [
                        "You shield everyone in protective frost. All allies in range gain 30 shielding. You may spend an additional 10 mana to cast this ability when Initiative is rolled."
                    ],
                    "tags": [
                        "spell",
                        "ice",
                        "defensive",
                        "modal"
                    ]
                },
                "Cold Shoulder": {
                    "name": "Cold Shoulder",
                    "class": "Mistguard",
                    "description": [
                        "You shield everyone in a protective aura. All allies in range gain a 5 ft aura; within this aura, enemies have a 50% chance of being Frozen when they enter or leave the aura (or if the aura enters or leaves their space when the ally moves). You may spend an additional 10 mana to cast this ability when Initiative is rolled."
                    ],
                    "tags": [
                        "spell",
                        "ice",
                        "defensive",
                        "modal",
                        "condition",
                        "frozen"
                    ]
                },
                "Annul": {
                    "name": "Annul",
                    "class": "Mistguard",
                    "description": [
                        "You steal an enemy mage's mana to use for your defenses. As a reaction to a target in range casting a spell, you may counter that spell. Then, you gain shielding equal to twice the amount of mana spent on the countered spell."
                    ],
                    "tags": [
                        "spell",
                        "ice",
                        "defensive",
                        "counterspell"
                    ]
                },
                "Glacial Gust": {
                    "name": "Glacial Gust",
                    "class": "Mistguard",
                    "description": [
                        "You push enemies back with an icy wind. Deal 9d8 ice magic damage to all enemies in a 60 ft cone, pushing all targets back to the edge of the cone. Targets cannot dash to avoid this AOE attack."
                    ],
                    "tags": [
                        "spell",
                        "ice",
                        "destruction",
                        "defensive",
                        "attack",
                        "aoe",
                        "cone",
                        "forced movement"
                    ]
                }
            }
        },
        "Modifier": {
            "type": "class",
            "name": "Modifier",
            "description": "The Modifier is an advanced alchemist that has combined construct alchemy and augmentation alchemy and taken their study into a new direction. By focusing on constantly improving a single construct instead of diverting attention to many, the Modifier manages to build a truly powerful construct designed to survive many combats and be useful in many types of situations. The class has abilities to create specialized constructs with endless durations, which initially start out very weak but over time can be crafted by the alchemist into a true war machine, a perfect partner for investigations, or a sleepless bodyguard for many nights to come. Effectively using this class requires taking one of the abilities to develop a base form for the specialized construct, then adding to it with the other abilities from this class or other augmentation alchemy classes.",
            "passive": {
                "Pet Project": "At the end of each of your turns, gain a special Major Action which can only be used for a Command Action directed to a construct. Command Actions given this way gain an additional Command."
            },
            "abilities": {
                "Basic Voltron Chassis": {
                    "name": "Basic Voltron Chassis",
                    "class": "Modifier",
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
                "Modular Weapons and Armor Set": {
                    "name": "Modular Weapons and Armor Set",
                    "class": "Modifier",
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
                        "increase ac",
                        "increase mr",
                        "increase ev"
                    ]
                },
                "Voltron Heart": {
                    "name": "Voltron Heart",
                    "class": "Modifier",
                    "description": [
                        "You provide a construct with greatly increased life. Target construct gains 200% increased Health, 100% Health Regeneration, and cannot have its maximum Health decreased for any reason while this augmentation is active."
                    ],
                    "tags": [
                        "alchemy",
                        "augmentation",
                        "increase health"
                    ]
                }
            }
        },
        "Night Lord": {
            "type": "class",
            "name": "Night Lord",
            "description": "The Night Lord is the ultimate class for rogues. Having mastered multiple aspects of the rogue's kit, this class prides itself on a wide variety of stealth based utilities. These abilities are split into moves allowing the Night Lord to infiltrate or pursue, moves for executing on a site, and finally, moves for escape or grand thievery. Many of the abilities in this class exist in other classes with worse stamina efficiency or action efficiency; the Night Lord makes heavy use of minor actions and exploits enemy blindspots with superior speed and initiative. Alternatively, the passive of the class provides a reliable way to escape combat to focus on side objectives or return to exploration and stealth.",
            "passive": {
                "A Step Ahead": "Making a Stealth: Sneak check to hide is a minor action for you. At the end of each of your turns, if you are Hidden, you get +20 Initiative. If your Initiative is higher than every enemy in combat, you may leave combat when you hide."
            },
            "abilities": {
                "Quickstep": {
                    "name": "Quickstep",
                    "class": "Night Lord",
                    "description": [
                        "You move quickly and quietly. Dash up to 40 ft in any direction. Until the end of your next turn, your Move Speed is doubled, your movement ignores all field effects and traps, and your movement cannot be reacted to."
                    ],
                    "tags": [
                        "dash",
                        "buff"
                    ]
                },
                "Flashbang": {
                    "name": "Flashbang",
                    "class": "Night Lord",
                    "description": [
                        "You use a special thief tool to blind pursuers. All enemies in range become Blinded and are knocked prone. An enemy that has not been Blinded by this ability previously has -30% CR for the Blind."
                    ],
                    "tags": [
                        "condition",
                        "blind",
                        "knock prone",
                        "conditional"
                    ]
                },
                "Burglary": {
                    "name": "Burglary",
                    "class": "Night Lord",
                    "description": [
                        "You take what you want. Steal 3 random items or up to 100 gp at a time from the inventory of a target in range. You may specify what you want to steal if you know certain items are in the target inventory and if you are Hidden."
                    ],
                    "tags": [
                        "attack",
                        "single-target"
                    ]
                },
                "Nothing Sacred": {
                    "name": "Nothing Sacred",
                    "class": "Night Lord",
                    "description": [
                        "You destroy magical defenses against thieves. Dispel all defensive spells within range and create a square field for the duration encompassing the range that silences all entites within it and causes you to auto-succeed on attempts to unlock things within it."
                    ],
                    "tags": [
                        "field",
                        "condition",
                        "silence"
                    ]
                },
                "Decoy": {
                    "name": "Decoy",
                    "class": "Night Lord",
                    "description": [
                        "You lure enemies away. Create a Decoy totem in an empty space within range that you can see. The Decoy has 1 health and lasts for the duration. The Decoy immediately Taunts all enemies within line of sight for 1 minute. Additionally, it Charms those targets, forcing them to use their Move Action to approach the totem. When an enemy moves towards the Decoy, you may dash an equal distance in any direction as a free reaction. An enemy that has not been Taunted or Charmed by this ability previously has -30% CR for the Taunt and Charm."
                    ],
                    "tags": [
                        "totem",
                        "condition",
                        "taunt",
                        "charm",
                        "conditional",
                        "dash"
                    ]
                },
                "Larceny": {
                    "name": "Larceny",
                    "class": "Night Lord",
                    "description": [
                        "You steal energy and morale. Drain 6d6 health from a target in range. Strip 1 buff from the target for every 6 rolled, applying the buff to yourself instead. Additionally, the target is inflicted with a mark that gives them -30 to skill checks until their next long rest."
                    ],
                    "tags": [
                        "attack",
                        "single-target",
                        "buff strip",
                        "conditional",
                        "mark"
                    ]
                }
            }
        },
        "Noxomancer": {
            "type": "class",
            "name": "Noxomancer",
            "description": "The Noxomancer is one of 8 offensive elemental mages. Harnessing the sinister aspect of dark, the Noxomancer is an aggressive class that deals both single target and AOE damage, but especially excels at stacking conditions on enemies, especially curses. He can inflict a variety of debilitating effects from blindness to fear, all while piling on damage. A small suite of utility spells allows the Noxomancer to take advantage of a variety of situations. Overall, the Noxomancer's slow and steady damage output is a force to be reckoned with.",
            "passive": {
                "Neverending Nightmare": "Whenever a non-curse condition that was inflicted by you ends (in any manner, including cleanse) on an enemy in sight, they gain a curse."
            },
            "abilities": {
                "Shadow Bolt": {
                    "name": "Shadow Bolt",
                    "class": "Noxomancer",
                    "description": [
                        "You amass dark energy and toss it at an enemy. Deal 4d10 dark magic damage to a target in range, and inflict the target with a curse for every 15 dark magic damage dealt this way."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "ranged",
                        "dark",
                        "destruction",
                        "condition",
                        "curse",
                        "conditional",
                        "single target"
                    ]
                },
                "Darkbomb": {
                    "name": "Darkbomb",
                    "class": "Noxomancer",
                    "description": [
                        "You release an orb of dark magic, primed to explode. Create a Darkbomb in an unoccupied space in range. You may have it detonate immediately to deal 4d10 dark magic damage and inflict a curse on every entity within 20 ft of the bomb. Alternatively, you may delay the explosion until the beginning of your next turn; if you do, it will deal 8d10 dark magic damage and inflict 2 curses on every entity within 20 ft of the bomb."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "dark",
                        "destruction",
                        "condition",
                        "curse",
                        "aoe",
                        "modal"
                    ]
                },
                "Corruption": {
                    "name": "Corruption",
                    "class": "Noxomancer",
                    "description": [
                        "You corrupt an enemy's body with dark energy. Deal 5d10 dark magic damage to a target and inflict them with a condition that causes them to gain a Curse and take 3d10 dark magic damage at the beginning of each turn and prevents Curses from expunging until the condition ends."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "single-target",
                        "dark",
                        "destruction",
                        "condition",
                        "curse",
                        "concentration"
                    ]
                },
                "Defile": {
                    "name": "Defile",
                    "class": "Noxomancer",
                    "description": [
                        "You infuse an enemy with dark energy, weakening and cursing them. Select a target in range, and choose one of the following:",
                        "<ul>",
                        "<li>Inflict a 30% Weaken for 1 minute</li>",
                        "<li>Inflict a 20% Weaken for 1 minute, and inflict 1 curse</li>",
                        "<li>Inflict a 10% Weaken for 1 minute, and inflict 2 curses</li>",
                        "</ul>"
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "dark",
                        "condition",
                        "weakened",
                        "curse",
                        "modal",
                        "single target"
                    ]
                },
                "Shriek": {
                    "name": "Shriek",
                    "class": "Noxomancer",
                    "description": [
                        "You release dark energy through your words, affecting the nervous system of nearby opponents. Enemies within 40 ft of you are Blinded and enemies within 20 ft of you are instead Feared."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "dark",
                        "condition",
                        "control",
                        "blind",
                        "fear",
                        "conditional",
                        "aoe"
                    ]
                },
                "Spreading Madness": {
                    "name": "Spreading Madness",
                    "class": "Noxomancer",
                    "description": [
                        "You corrupt the mind of an enemy with infectious dark magic. Inflict a condition on a target in range that causes 50% of their targeted attacks to be redirected at one of their allies in range if possible. When an enemy with this condition deals damage to another enemy, they inflict the same condition on hit. When you break concentration on this ability, all copies of this condition end as well."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "single-target",
                        "multi-target",
                        "dark",
                        "condition",
                        "control",
                        "concentration"
                    ]
                },
                "Siphon Soul": {
                    "name": "Siphon Soul",
                    "class": "Noxomancer",
                    "description": [
                        "You tear away magical effects on allies and enemies. Choose one of the following:",
                        "<ul>",
                        "<li>Target entity in range loses a buff of your choice</li>",
                        "<li>Target entity in range is cleansed of a condition of your choice</li>",
                        "</ul>",
                        "You may choose to expend an additional 10 mana to use both options."
                    ],
                    "tags": [
                        "spell",
                        "dark",
                        "modal",
                        "buff strip",
                        "cleanse",
                        "single-target",
                        "multi-target"
                    ]
                },
                "Treachery": {
                    "name": "Treachery",
                    "class": "Noxomancer",
                    "description": [
                        "You cause a mage to lose control of a spell during its casting. As a reaction to a target in range casting a spell, you may counter that spell. The target then expends 20 mana to deal 3d10 dark magic damage and inflict a curse on all of its allies within 10 ft of them."
                    ],
                    "tags": [
                        "spell",
                        "dark",
                        "single-target",
                        "aoe",
                        "destruction",
                        "defensive",
                        "counterspell",
                        "condition",
                        "curse"
                    ]
                },
                "Fiendish Circle": {
                    "name": "Fiendish Circle",
                    "class": "Noxomancer",
                    "description": [
                        "You call upon imps from a dark realm. Summon an Imp with 50 HP and 40 speed. Imps follow your Command Actions; otherwise, they use their Move Action to move towards enemies, their Major Action to make a melee attack that deals 4d10 dark magic damage, and their Minor Action to drink any potions they are carrying. When you cast this spell, you may choose to concentrate on this spell in order to spend an additional 20 mana to summon an extra Imp, and you may do this up to two more times to have a maximum of 4 Imps at one time."
                    ],
                    "tags": [
                        "spell",
                        "summoning",
                        "dark",
                        "minion",
                        "conditional",
                        "modal",
                        "concentration"
                    ]
                }
            }
        },
        "Pinpoint Monk": {
            "type": "class",
            "name": "Pinpoint Monk",
            "description": "The Pinpoint Monk has learned two vitally important systems over the beginner monk: the understanding of the body's natural pressure points and the effects of electricity on the body's nerves. Using just two fingers, this class applies force in an extremely fine and directed manner to specific parts of an opponent's body, releasing small amounts of lightning from their fingertips to disrupt the flow of energy and the nerve signals of the target's body. The result is immediate: paralysis of major muscle groups, disabling of sensory equipment, and sometimes critical amounts of damage to tissues. With an excess of mobility, the Pinpoint Monk opens fights with crowd control on single targets before following with devastating critical strikes later in their combos. The abilities of this class can provide a lot of needed versatility to the repertoire of the beginner monk, and provide them with a somewhat reliable new angle of attack in the form of critical strikes.",
            "passive": {
                "Precision Pummeling": "Your monk mastery increases. Additionally, before making an unarmed attack, you may convert up to half your critical strike chance to combo chance, or vice versa."
            },
            "abilities": {
                "Jolt Jab": {
                    "name": "Jolt Jab",
                    "class": "Pinpoint Monk",
                    "description": [
                        "You dash in like lightning with a quick blow. Dash up to 15 ft in any direction, then deal 3dU physical damage + 2d12 lightning magic damage to a target in range. Your next combo roll has +5% for every damage die on this ability that rolls an 11 or higher."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "lightning",
                        "melee",
                        "single-target",
                        "unarmed",
                        "dash",
                        "conditional",
                        "combo"
                    ]
                },
                "Atrophic Blow": {
                    "name": "Atrophic Blow",
                    "class": "Pinpoint Monk",
                    "description": [
                        "You hit pressure points that control the application of physical force. With a target in range, choose one of the following:",
                        "<ul>",
                        "<li>Inflict a 40% Weaken to the target until the end of their next turn</li>",
                        "<li>Inflict a 20% Weaken to the target until the end of their next turn. Your next combo roll has +10%</li>",
                        "</ul>"
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "melee",
                        "single-target",
                        "unarmed",
                        "modal",
                        "condition",
                        "weaken",
                        "combo"
                    ]
                },
                "Rising Energy": {
                    "name": "Rising Energy",
                    "class": "Pinpoint Monk",
                    "description": [
                        "You focus on aiming for weak spots without losing speed or power. While this buff is active, your unarmed attacks have +5% critical strike chance for every combo roll you have succeeded on within the current action for the duration."
                    ],
                    "tags": [
                        "buff",
                        "conditional"
                    ]
                },
                "Static Flurry": {
                    "name": "Static Flurry",
                    "class": "Pinpoint Monk",
                    "description": [
                        "You let loose with a flurry of lightning fast blows. Deal 4dU + 3d12 lightning magic damage to all targets in range; you may choose to push all targets back 15 ft, and you may also choose to dash in order to follow one target as you push them. Your next combo roll has +5% for every damage die on this ability that rolls an 11 or higher."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "lightning",
                        "melee",
                        "multi-target",
                        "unarmed",
                        "dash",
                        "modal",
                        "forced movement",
                        "combo"
                    ]
                },
                "Paralyzing Blow": {
                    "name": "Paralyzing Blow",
                    "class": "Pinpoint Monk",
                    "description": [
                        "You hit pressure points that control the propagation of neural signals. Inflict Paralysis on a target in range, then repeat this attack twice. Roll for critical strike chance with each attack; if you succeed, inflict 2 stacks of Paralysis instead."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "melee",
                        "single-target",
                        "unarmed",
                        "condition",
                        "paralysis",
                        "combo"
                    ]
                },
                "Move Like Lightning": {
                    "name": "Move Like Lightning",
                    "class": "Pinpoint Monk",
                    "description": [
                        "You dash quickly when your momentum is high. Dash up to 25 ft in any direction. If you made a successful critical strike this round, or if you completed a 3 ability combo this round, the dash has a distance of 40 ft instead, and you may cast this ability as a reaction until the end of the round."
                    ],
                    "tags": [
                        "dash",
                        "conditional",
                        "modal"
                    ]
                }
            }
        },
        "Psion": {
            "type": "class",
            "name": "Psion",
            "description": "The Psion is one of two entry level classes that use psionics as their primary way of engaging in combat. Psionics are unique in a number of ways from other combat styles. Psionic attacks deal psychic damage, a type of physical damage that cannot be dodged and ignores AC, but checks against defensive psionics and works in an all or nothing fashion. When you make a psionic attack, you roll Offensive Psionics to determine the DC that the target needs to beat with Defensive Psionics in order to negate all damage and effects. Additionally, you can pay for psionic abilities with health, stamina, or mana, meaning you have a lot of flexibility and can maintain psionic combat for quite a bit longer than other combat styles. You are still restricted to targets you have line of sight on, and psionic builds are difficult to support with gear. Psion provides ways to deal psionic damage to one or multiple targets, as well as a number of offensive psychic conditions and displacements as well as defense for both you and your party.",
            "passive": {
                "Stress Headache": "You may make a psionic autoattack as a Major Action, which deals 2d10 psychic damage to any target you can see within 100 ft. Additionally, all psychic damage you deal is increased by X%, where X is three times the percentage of total health, stamina, and mana added up that you are missing."
            },
            "abilities": {
                "Psyshock": {
                    "name": "Psyshock",
                    "class": "Psion",
                    "description": [
                        "You send waves of harmful energy directly into someone's mind. Deal 4d10 psychic damage to a target in range. When you cast this ability, you may expend an additional 10 of any resource aside from the type initially used; if you do, this attack deals 100% increased damage and your Offensive Psionics check gains +20."
                    ],
                    "tags": [
                        "psionic",
                        "offensive",
                        "attack",
                        "psychic",
                        "single-target",
                        "damage",
                        "modal"
                    ]
                },
                "Psywave": {
                    "name": "Psywave",
                    "class": "Psion",
                    "description": [
                        "You fire waves of errant psionics. Deal 5d10 psychic damage to all enemies in a 50 ft cone starting in front of you. When you cast this ability, you may expend an additional 20 of any resource aside from the type initially used; if you do, this attack deals 100% increased damage and strips a random buff from all affected targets."
                    ],
                    "tags": [
                        "psionic",
                        "offensive",
                        "attack",
                        "psychic",
                        "damage",
                        "modal",
                        "multi-target"
                    ]
                },
                "Befuddle": {
                    "name": "Befuddle",
                    "class": "Psion",
                    "description": [
                        "You scramble an enemy's thoughts. Inflict Confusion on a target in range until the end of its next turn. When you cast this ability, you may expend an additional 15 of any resource aside from the type initially used; if you do, Stun the target until the end of its next turn instead."
                    ],
                    "tags": [
                        "psionic",
                        "offensive",
                        "attack",
                        "condition",
                        "confusion",
                        "modal",
                        "stun"
                    ]
                },
                "Insinuate": {
                    "name": "Insinuate",
                    "class": "Psion",
                    "description": [
                        "You corrupt minds with paranoia. Choose one:",
                        "<ul>",
                        "<li>Inflict Fear on up to 5 targets in range for the duration. When you cast this ability and choose this mode, you may expend an additional 30 of any resource aside from the type initially used; if you do, you may target up to 10 targets in range instead, and they are additionally inflicted with Slowed for the duration</li>",
                        "<li>Spend an additional 5 minutes casting this ability while speaking to a target. If the target loses the psionic contest, the target becomes marked, becoming paranoid and fearful, and immediately seeks the safest place they know and avoids both friend and foe due to mistrust. The mark lasts for 1 hour. When you cast this ability and choose this mode, you may expend an additional 30 of any resource aside from the type initially used; if you do, the duration of the mark is extended to 6 hours. If you lose the psionic contest when you choose this mode, the target will not know you attempted to attack it, and becomes immune to psionic attacks until its next short rest.</li>",
                        "</ul>"
                    ],
                    "tags": [
                        "psionic",
                        "offensive",
                        "attack",
                        "condition",
                        "modal",
                        "fear",
                        "slow"
                    ]
                },
                "Focal Point": {
                    "name": "Focal Point",
                    "class": "Psion",
                    "description": [
                        "You draw in aberrant psionic attacks to protect your fellow man. As a reaction to a psionic attack on an ally in range, choose one:",
                        "<ul>",
                        "<li>Redirect the attack to yourself. You make the Defensive Psionics skill check instead</li>",
                        "<li>Add half your Defensive Psionics skill check bonus to the ally's Defensive Psionics skill check</li>",
                        "</ul>"
                    ],
                    "tags": [
                        "psionics",
                        "defensive",
                        "modal",
                        "redirect"
                    ]
                },
                "Brain Barrier": {
                    "name": "Brain Barrier",
                    "class": "Psion",
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
                        "psionics",
                        "defensive",
                        "modal",
                        "conditional",
                        "increase ac",
                        "increase evasion",
                        "increase mr",
                        "increase cr",
                        "gdr"
                    ]
                }
            }
        },
        "Pyromancer": {
            "type": "class",
            "name": "Pyromancer",
            "description": "The Pyromancer is the entry level mage that specializes in the use of spells aspected to the aggressive element of Fire. Fire magic sees heavy use in mage cadres of armies as well as heavy personal use for mage adventurers. As the premiere damage dealing element, Pyromancers enjoy a variety of high damage spells to target single or multiple enemies. Additional damage over time in the form of the Burn condition helps maintain a high level of DPS for a Pyromancer even when they find themselves forced to reposition or focus on other objectives in combat. The passive of the class helps make sure that this class's damage spells are relevant even in fights against magic damage tanks. The class has access to some minor area control, creating fields of flames that deter enemies from staying in one spot too long, and as all the other elemental mages do, the Pyromancer has access to a counterspell, but the vast majority of spells in the class's repertoire involve dealing damage in a straightforward manner, making the class an excellent choice for players looking to play a less complex style that still utilizes the system's flexible and powerful magic system.",
            "passive": {
                "Reduce To Ashes": "Your damage-dealing fire spell attacks and your Burn damage triggers inflict targets with -5% Fire MR and +5% Fire Vulnerability, stacking."
            },
            "abilities": {
                "Firebolt": {
                    "name": "Firebolt",
                    "class": "Pyromancer",
                    "description": [
                        "You toss a mote of fire at an enemy. Deal 4d12 fire magic damage to a target in range. This spell deals an additional 2d12 fire magic damage if it's the second fire spell you've cast this turn."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "fire",
                        "destruction",
                        "single-target",
                        "conditional"
                    ]
                },
                "Searing Blaze": {
                    "name": "Searing Blaze",
                    "class": "Pyromancer",
                    "description": [
                        "You scald an enemy with vicious flames. Deal 5d12 fire magic damage to a target in range. The target is then inflicted with Burn X, where X is equal to the amount of damage rolled."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "fire",
                        "destruction",
                        "single-target",
                        "condition",
                        "burn",
                        "conditional"
                    ]
                },
                "Banefire": {
                    "name": "Banefire",
                    "class": "Pyromancer",
                    "description": [
                        "You burn an enemy with overpowering fire. Deal 6d12 fire magic damage to a target in range. This spell cannot be blocked or counterspelled if it's the second fire spell you've cast this turn."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "fire",
                        "destruction",
                        "single-target",
                        "conditional",
                        "no block",
                        "no counter"
                    ]
                },
                "Magma Spray": {
                    "name": "Magma Spray",
                    "class": "Pyromancer",
                    "description": [
                        "You spray flames from outstretched hands. Deal 4d12 fire magic damage to all enemies in a 30 ft cone. Enemies hit by this spell that are at most 15 ft from you are additionally inflicted with Burn X, where X is equal to the amount of damage rolled."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "fire",
                        "destruction",
                        "aoe",
                        "cone",
                        "conditional",
                        "condition",
                        "burn"
                    ]
                },
                "Fireball": {
                    "name": "Fireball",
                    "class": "Pyromancer",
                    "description": [
                        "You conjure a massive ball of flames. Deal 5d12 fire magic damage to all enemies in a 35 ft square centered on a space in range. When you cast this spell, you may pay an additional 5 mana to add 1 damage die to the spell's damage roll, and you may do this any number of times."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "fire",
                        "destruction",
                        "aoe",
                        "square",
                        "modal"
                    ]
                },
                "Heat Ray": {
                    "name": "Heat Ray",
                    "class": "Pyromancer",
                    "description": [
                        "You fire a beam of heat and fire. Deal 6d12 fire magic damage to all enemies in a 120 ft line. This spell deals an additional 3d12 fire magic damage if it's the second fire spell you've cast this turn."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "fire",
                        "destruction",
                        "aoe",
                        "cone",
                        "conditional",
                        "condition",
                        "burn"
                    ]
                },
                "Burn Trail": {
                    "name": "Burn Trail",
                    "class": "Pyromancer",
                    "description": [
                        "You let your flames run loose. Create flames in up to 5 spaces within range for the duration; all target spaces must touch at least one other target space in an orthogonal or diagonal direction. These flames deal 3d12 fire magic damage to any entity that passes through their space, starts in their space, or ends a turn in their space."
                    ],
                    "tags": [
                        "spell",
                        "fire",
                        "conjuration",
                        "modal",
                        "conditional"
                    ]
                },
                "Pyroblast": {
                    "name": "Pyroblast",
                    "class": "Pyromancer",
                    "description": [
                        "You ignite an enemy mage's mana. As a reaction to a target in range casting a spell, you may counter that spell. The target takes fire magic damage equal to the amount of mana they spent on the countered spell"
                    ],
                    "tags": [
                        "spell",
                        "fire",
                        "destruction",
                        "defensive",
                        "counterspell",
                        "single-target"
                    ]
                },
                "Inflame": {
                    "name": "Inflame",
                    "class": "Pyromancer",
                    "description": [
                        "You create a flame within a target. Target in range gains the Inflame mark. When a target marked this way dies (or is knocked unconscious), they deal fire magic damage equal to half the amount of damage taken from the lethal hit to all adjacent targets, inflicting those targets with the Inflame mark. You may cast this spell as a reaction if you spend an additional 15 mana."
                    ],
                    "tags": [
                        "spell",
                        "fire",
                        "conjuration",
                        "destruction",
                        "conditional",
                        "modal"
                    ]
                },
                "Fiery Temper": {
                    "name": "Fiery Temper",
                    "class": "Pyromancer",
                    "description": [
                        "You convert the rage of battle into heat and flames. For the duration, at the beginning of each of your turns, deal 4d12 fire magic damage to all enemies in range. Additionally, enemies in range take twice as much damage from their Burns."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "fire",
                        "destruction",
                        "multi-target"
                    ]
                },
                "Devour In Flames": {
                    "name": "Devour In Flames",
                    "class": "Pyromancer",
                    "description": [
                        "You overpower an enemy with fire. Deal fire magic damage to a target in range equal to 10% of their maximum health. If this is the second fire spell you've cast this turn, this spell has X% Lethality, where X is the percentage of Vulnerability the target has in total."
                    ],
                    "tags": [
                        "spell",
                        "attack",
                        "fire",
                        "destruction",
                        "single-target",
                        "conditional"
                    ]
                },
                "Heat Seeker": {
                    "name": "Heat Seeker",
                    "class": "Pyromancer",
                    "description": [
                        "You can see heat signatures. For the duration, your vision becomes altered such that you can see the heat of living beings. You can see entities and objects with warmth that are invisible or Hidden with ease, even through walls that are no thicker than 2 ft. Additionally, while this buff is active, your fire spell attacks are attracted to your targets, gaining +100% Accuracy and triggering your Reduce to Ashes passive twice."
                    ],
                    "tags": [
                        "spell",
                        "fire",
                        "utility",
                        "divination",
                        "buff"
                    ]
                }
            }
        },
        "Reaper": {
            "type": "class",
            "name": "Reaper",
            "description": "A Reaper is more than just a mage or fighter; they are an omen of finality. Reaping the spirits of those cursed for death, a reaper cuts short lives with a gruesome mastery of the wicked scythe, or snuffs out souls with a unique curse signaling doomsday. The reaper's melee with scythe and spell leave behind harvestable souls which provide the reaper with the vigor to continue their solemn duty. Curses both mundane and unique make escaping the reaper's toll extremely difficult. With this combination of deadly conditions and scythe attacks, the reaper gives men a good reason to fear their deaths.",
            "passive": {
                "Ferryman of the Dead": "When you kill an enemy with an attack from a scythe, or when an enemy dies while affected by one of your condition spells, they leave behind a soul that occupies the space they died in. Walking through a space occupied by a soul allows you or an ally to pick up the soul freely, healing for 20% of maximum health."
            },
            "abilities": {
                "Soul Rend": {
                    "name": "Soul Rend",
                    "class": "Reaper",
                    "description": [
                        "You swing your magically enchanted scythe to damage an enemy's soul directly. Deal 5d10 physical damage to a target in range, then choose one:",
                        "<ul>",
                        "<li>This attack ignores all AC and cannot be blocked.</li>",
                        "<li>This attack has 20% lifesteal</li>",
                        "</ul>"
                    ],
                    "tags": [
                        "attack",
                        "melee",
                        "single-target",
                        "scythe",
                        "ac penetration",
                        "ignore block",
                        "modal",
                        "heal"
                    ]
                },
                "Tornado of Souls": {
                    "name": "Tornado of Souls",
                    "class": "Reaper",
                    "description": [
                        "You spin your scythe in a wide arc, harvesting power as you take life. Deal 5d10 physical damage to all adjacent targets. If this ability kills a target, you may repeat this ability immediately at no cost."
                    ],
                    "tags": [
                        "attack",
                        "melee",
                        "multi-target",
                        "scythe",
                        "conditional",
                        "repeatable"
                    ]
                },
                "Deathstroke": {
                    "name": "Deathstroke",
                    "class": "Reaper",
                    "description": [
                        "You absorb the life force of recently slain enemies and deliver a killing blow. Sacrifice any number of souls you've created with your Ferryman of the Dead passive. Deal 6d10 physical damage to a target in range, with 100% increased damage and 20% lethality for each soul sacrificed."
                    ],
                    "tags": [
                        "attack",
                        "melee",
                        "single-target",
                        "scythe",
                        "modal",
                        "conditional",
                        "sacrifice"
                    ]
                },
                "Inevitable End": {
                    "name": "Inevitable End",
                    "class": "Reaper",
                    "description": [
                        "You cut down flesh which has known your corruption. Deal 8d10 physical damage to all enemies in range. This attack has the following properties for each individual enemy targeted, based on how many different, unique conditions that enemy has suffered over the course of the current combat encounter that originated from you or your minions:",
                        "<ul>",
                        "<li>At least 2 conditions - The attack cannot be blocked or dodged</li>",
                        "<li>At least 4 conditions - The attack penetrates all AC</li>",
                        "<li>At least 6 conditions - The attack deals double damage and has 100% Lethality</li>",
                        "</ul>"
                    ],
                    "tags": [
                        "attack",
                        "melee",
                        "multi-target",
                        "scythe",
                        "conditional",
                        "lethality",
                        "no-block",
                        "no-dodge",
                        "ignore ac"
                    ]
                },
                "Call of the Void": {
                    "name": "Call of the Void",
                    "class": "Reaper",
                    "description": [
                        "You afflict a target with deadly magic to prevent escape. Deal 4d10 dark magic damage to a target in range. They are afflicted with a condition for the duration that makes movement that isn't towards you count as moving over difficult terrain and prevents dashes or teleports that aren't towards you."
                    ],
                    "tags": [
                        "spell",
                        "dark",
                        "destruction",
                        "damage",
                        "condition",
                        "conditional",
                        "single-target"
                    ]
                },
                "Harvester of Life": {
                    "name": "Harvester of Life",
                    "class": "Reaper",
                    "description": [
                        "You create a spirit reaper to assist you in your work. Summon a Harvester in an empty space in range with 50 HP, 40 ft flying speed, and 100% evasion. It wields an ephemeral copy of the scythe you wield when you cast this spell. It obeys your Commands and telepathically communicates to you everything it sees or hears, but not across planes. It persists regardless of the distance from its summoner. It can freely travel through mundane walls but cannot pass through enchanted or hallowed barriers. The Harvester's kills with its scythe count towards your Ferryman of the Dead passive. Unless you give it commands otherwise, it automatically does the following on its turn: It uses its Move Action to move up to its speed towards an enemy it sees. It uses its Major Action to attack with its scythe. It uses its Minor Action to inflict a random target within 30 ft with Fear."
                    ],
                    "tags": [
                        "spell",
                        "dark",
                        "scythe",
                        "summoning",
                        "minion"
                    ]
                },
                "Drag To Hell": {
                    "name": "Drag To Hell",
                    "class": "Reaper",
                    "description": [
                        "You chain an enemy's soul to its ultimate fate. Deal 6d10 dark magic damage to a target in range. They are afflicted with a condition for the duration that pulls them 30 ft in a direction of your choice and deals 3d10 dark magic damage to them at the beginning of each of their turns. Additionally, while this condition persists, you may use your reaction to pull the afflicted target 20 ft in a direction of your choice."
                    ],
                    "tags": [
                        "spell",
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
                "Enslaved Soul": {
                    "name": "Enslaved Soul",
                    "class": "Reaper",
                    "description": [
                        "You call upon one of many souls you've harvested. Select an entity whom you have killed at any point in the past. Unless blocked by divine intervention, you summon the soul of the selected entity assuming it is still intact, spending mana equal to the entity's Level. The Enslaved Soul has all of the same stats, abilities, and knowledge as it did in life. It is bound by your magic to assist you in combat and obey Command Actions that involve attacking enemies, defending allies, or being otherwise tactically relevant (including staying near you instead of trying to escape or staying quiet during stealthy operations). However, it knows you had a hand in ending its life, and may not be cooperative if you seek information. The Enslaved Soul remains with you for 1 minute or until its health reaches 0. You may choose to spend 1 minute to cast this spell as a minor ritual, extending the duration to 1 hour, or you may spend 10 minutes to cast this spell as a major ritual, extending the duration to 6 hours."
                    ],
                    "tags": [
                        "spell",
                        "dark",
                        "necromancy",
                        "summoning",
                        "control",
                        "minor ritual",
                        "major ritual"
                    ]
                },
                "The End Is Coming": {
                    "name": "The End Is Coming",
                    "class": "Reaper",
                    "description": [
                        "You afflict an enemy with a curse that slowly kills. A target in range is afflicted with a condition that causes them to gain a Curse at the beginning of each of their turns (or every 10 seconds while out of combat)."
                    ],
                    "tags": [
                        "spell",
                        "dark",
                        "destruction",
                        "condition",
                        "curse",
                        "single-target"
                    ]
                },
                "Death Throes": {
                    "name": "Death Throes",
                    "class": "Reaper",
                    "description": [
                        "You afflict an enemy with a curse that makes their efforts to avoid death helpless and pathetic. A target in range is afflicted with a condition that forces them to reroll all dice they roll, taking the lower of the two results each time. The sole exception is death saves, for which the target must reroll and take the higher result. Additionally, healing on the target is half as effective while they have this condition."
                    ],
                    "tags": [
                        "spell",
                        "dark",
                        "condition",
                        "single-target"
                    ]
                },
                "Frailty of Man": {
                    "name": "Frailty of Man",
                    "class": "Reaper",
                    "description": [
                        "You afflict an enemy with a curse that tears away their strength and leaves them frail. A target in range is stripped of all buffs and breaks all concentration. They are then afflicted with a condition that prevents them from gaining buffs, concentrating on abilities, benefiting from potions or fields, and using reactions and minor actions. This condition also afflicts the target with a 50% Weaken."
                    ],
                    "tags": [
                        "spell",
                        "dark",
                        "condition",
                        "single-target",
                        "weaken",
                        "buff strip",
                        "concentration break"
                    ]
                },
                "Final Fate": {
                    "name": "Final Fate",
                    "class": "Reaper",
                    "description": [
                        "You sentence an enemy to death. A target in range becomes marked for the duration. While marked this way, the target will be vaguely aware of a sense of doom, which will rapidly become more prominent over time. They will also become unable to take life while marked this way, finding that their courage or calmness fails them. When the duration of the mark expires, the target will die, even if it is Lethality-immune. The mark can only be removed by a blessing with divine support, such as from a priest of Adol or a paladin of Nox."
                    ],
                    "tags": [
                        "spell",
                        "dark",
                        "control",
                        "mark"
                    ]
                }
            }
        },
        "Rifleman": {
            "type": "class",
            "name": "Rifleman",
            "description": "The Rifleman is the entry level bullet weapon class. The use of firearms is difficult for multiple reasons, which the Rifleman helps remedy: firearms require a special action called a Reload Action, which takes two Major Actions, to reload their ammunition, and firearms have an inherent misfire rate that forces a player to roll everytime they attack to see if their gun doesn't just fall apart. To make up for these weaknesses, the average firearm has improved damage capabilities thanks to the secondary fire, an alternative to regular autoattacks. The Rifleman has abilities to minimize misfire, improve damage and speed, and abuse secondary fire and ammunition types to great effect, and acts as an excellent first step to any character who wishes to use firearms for the long term. Damage is high and range is medium compared to other ranged options, and firearms combine many of the unique strengths of both crossbows and bows, often piercing and pushing enemies back.",
            "passive": {
                "Silver Bullet": "At the beginning of your turn, select a bullet currently chambered in a firearm in your inventory. It becomes a silver bullet, this class's unique special ammunition (if the bullet chosen is already special ammunition, it retains its other properties). When you create a silver bullet, you may choose an additional effect for the ammunition from the list below:<ul><li>An attack with this ammunition ignores AC</li><li>An attack with this ammunition ignores MR</li><li>An attack with this ammunition cannot miss</li><li>An attack with this ammunition gains an extra damage die</li></ul>"
            },
            "abilities": {
                "Bodyshot": {
                    "name": "Bodyshot",
                    "class": "Rifleman",
                    "description": [
                        "You aim for center of mass. Fire your currently equipped firearm at an enemy in range, dealing an additional 3d12 physical damage. Your target then chooses to either fall prone or be pushed back 10 ft. If this attack is made with a silver bullet, your target must choose both.",
                        "<br>",
                        "Secondary Fire: Fire your currently equipped firearm at an enemy in range, dealing an additional 2d12 physical damage. The target is inflicted with 10% physical vulnerability, which can stack up to 5 times. If this attack is made with a silver bullet, your target gains 2 stacks of this vulnerability."
                    ],
                    "tags": [
                        "attack",
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
                "Burst Fire": {
                    "name": "Burst Fire",
                    "class": "Rifleman",
                    "description": [
                        "You fire several shots in quick succession. Fire your currently equipped firearm 3 times at up to 3 targets in range, with each shot dealing an additional d12 physical damage. If the first shot is a silver bullet, the other two bullets gain its properties.",
                        "<br>",
                        "Secondary Fire: Fire your currently equipped firearm at a target in range, dealing 3d12 physical damage, inflicting any on-hit effects with tripled effectiveness."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "single-target",
                        "multi-target",
                        "ranged",
                        "firearm",
                        "modal",
                        "conditional"
                    ]
                },
                "Iron Sights": {
                    "name": "Iron Sights",
                    "class": "Rifleman",
                    "description": [
                        "You aim down your iron sights for increased accuracy. Your next firearm attack has +10% critical strike chance; it also has +100% critical damage modifier if it is made with a silver bullet."
                    ],
                    "tags": [
                        "empower",
                        "conditional",
                        "increase critical"
                    ]
                },
                "Bleeding Bullet": {
                    "name": "Bleeding Bullet",
                    "class": "Rifleman",
                    "description": [
                        "You aim for areas of high blood flow. Your next firearm attack inflicts a d12 Bleed, increased to 2d12 Bleed if it is made with a silver bullet."
                    ],
                    "tags": [
                        "empower",
                        "conditional",
                        "condition",
                        "bleed"
                    ]
                },
                "Quick Reload": {
                    "name": "Quick Reload",
                    "class": "Rifleman",
                    "description": [
                        "You've learned how to quickly load a new clip of ammo. Reload each firearm you have currently equipped. When you do, each firearm you have currently equipped gains a silver bullet in a chamber of your choice."
                    ],
                    "tags": [
                        "reload"
                    ]
                },
                "Steady Shooting": {
                    "name": "Steady Shooting",
                    "class": "Rifleman",
                    "description": [
                        "You've learned to steady your gun to minimize misfire rate. Your next attack has -10% Misfire Rate. When you cast this ability, you may drop into a prone position; if you do, your next attack has -20% Misfire Rate instead."
                    ],
                    "tags": [
                        "modal"
                    ]
                }
            }
        },
        "Sentinel": {
            "type": "class",
            "name": "Sentinel",
            "description": "The Sentinel is a fighter class that has mastered the use of shields as weapons. Dual wielding bladed shields with specialized chain systems attached to their wristguards, the Sentinel has redefined the art of shield combat with innovative new techniques. Being able to double down on the defensive aspects of shields, the Sentinel also brings vicious new attacking opportunities and a wealth of utility and mobility. This class bides its time playing defensively in order to release energy in a burst of explosive movements and attacks in later rounds. The chains on his shields allow for easy shield tossing and dragging himself and opponents where he pleases, and opens up his effective range and target selection. While dual wielding is technically optional with this class, choosing to hold two shields maximizes the abilities this class provides. In order to help these specialized shields mesh with other classes, the Sentinel treats all shields that have implicit damage as axes, longblades, blunt weapons, and heavy throwing weapons as well. The default range for a Sentinel's shield chain is 30 ft, and can be picked up from range using the chains as a free action.",
            "passive": {
                "Perfect Shield": "While you are not in Shield stance, when you block an attack, gain a Shield stack. At the end of your turn, you may expend all Shield stacks to gain that many special reactions and enter Shield stance until the beginning of your next turn. You may use special reactions gained this way as normal reactions or to cast any Sentinel ability. Sentinel abilities you cast this way have their stamina cost halved."
            },
            "abilities": {
                "Crossguard Guillotine": {
                    "name": "Crossguard Guillotine",
                    "class": "Sentinel",
                    "description": [
                        "You swing your bladed shields in an X shaped pattern. Deal 4d10 physical damage to a target in range. This attack can block all incoming attacks that it reacts to, and if this attack combos with a dash, the block will also block any attacks along the path of your dash as well as at the final destination. If you are dual wielding shields, you may expend any number of Shield stacks; this attack deals an additional Xd10 physical damage, where X is the number of Shield stacks spent, and also hits enemies diagonally to your target."
                    ],
                    "tags": [
                        "attack",
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
                "Bladeshield Arc": {
                    "name": "Bladeshield Arc",
                    "class": "Sentinel",
                    "description": [
                        "You spin your shields around you in a wide arc. Deal 5d10 physical damage to all targets in range. This attack acts as an AOE block for the spaces it hits as well as your current space when it is used as a reaction. If you are dual wielding shields, you may expend any number of Shield stacks; this attack deals an additional Xd10 physical damage, where X is the number of Shield stacks spent, and has its range increased to 10 ft."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "melee",
                        "multi-target",
                        "conditional",
                        "aoe block",
                        "shield",
                        "modal"
                    ]
                },
                "Parallel Shields": {
                    "name": "Parallel Shields",
                    "class": "Sentinel",
                    "description": [
                        "You manipulate two shields to maximize coverage or layer your defenses. For each shield currently equipped, block an attack on yourself or on an ally in an adjacent space. If this ability combos with a dash, you can split up the two blocks to occur at two different points along the dash.",
                        "<br>",
                        "Alternatively, if you are dual wielding shields, you may expend a Shield stack to layer the shields atop each other, blocking a single attack on yourself. This block is effective even against attacks that normally cannot be blocked, and an attack blocked this way cannot penetrate AC."
                    ],
                    "tags": [
                        "block",
                        "shield",
                        "self-target",
                        "ally-target",
                        "conditional",
                        "modal"
                    ]
                },
                "Rapid Shields": {
                    "name": "Rapid Shields",
                    "class": "Sentinel",
                    "description": [
                        "You toss up your shields to block multiple attacks from a dangerous enemy. Block all the hits of a multi-hit attack on yourself or an ally in range. For each hit blocked this way, you may autoattack the attacking enemy as a free reaction. If you are dual wielding shields, you may expend a Shield stack to autoattack with each shield per hit instead."
                    ],
                    "tags": [
                        "block",
                        "shield",
                        "self-target",
                        "ally-target",
                        "conditional",
                        "modal"
                    ]
                },
                "Chain Rush": {
                    "name": "Chain Rush",
                    "class": "Sentinel",
                    "description": [
                        "You toss your shield and pull yourself to a new location with the chains. Toss your shield to a target space in range; if the space is occupied, push the entity in that space 5 ft away from you. If you are dual wielding shields, drop your other shield in your current space, then dash along your chain to the target space and pick up the shield there. As long as you do not use the shield at your original location for another action, you may dash along the chain back to that shield as a free reaction, picking the shield back up."
                    ],
                    "tags": [
                        "dash",
                        "conditional",
                        "modal",
                        "shield"
                    ]
                },
                "Chain Drag": {
                    "name": "Chain Drag",
                    "class": "Sentinel",
                    "description": [
                        "You toss your shield at an enemy to pull them towards you. Toss your shield at a target enemy in range, then drag them to a space within melee range. If you are dual wielding shields, do this twice. If you dash during this ability, drag your targets along with you."
                    ],
                    "tags": [
                        "forced movement",
                        "pull",
                        "conditional",
                        "shield"
                    ]
                },
                "Dual Shield Strike": {
                    "name": "Dual Shield Strike",
                    "class": "Sentinel",
                    "description": [
                        "You move quickly to stab with both shields. Dash up to 20 ft, then deal 6d10 physical damage to a target in range, dealing half as much damage to any enemy behind the target as well. When this attack is used as a reaction, it interrupts any enemy attack or spell it reacts to. If you are dual wielding shields, you may expend any number of Shield stacks; if you do, you may repeat this attack as a free reaction until the end of the turn without paying its stamina cost, except it deals an additional Xd10 physical damage, where X is the number of Shield stacks spent, and it hits up to 2 enemies behind the target as well."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "melee",
                        "single-target",
                        "multi-target",
                        "conditional",
                        "modal",
                        "interrupt"
                    ]
                },
                "Giga Drill Break": {
                    "name": "Giga Drill Break",
                    "class": "Sentinel",
                    "description": [
                        "You rapidly rotate your shields using a complex gear and chain system. Dash up to 40 ft, then deal 10d10 physical damage to a target in range, dealing an equal amount of damage to any enemies adjacent to the target as well. Targets hit by this attack are then inflicted with +30% Physical Vulnerability, plus an additional +10% Physical Vulnerability for every damage die that rolls a 10. You may concentrate on this ability when you cast it; if you do, you may cast it without paying its stamina cost as a major action or reaction for the duration. While concentrating on this ability, it deals an additional Xd10 physical damage, where X is the number of Shield stacks you have, and it ignores 100% of the target's AC."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "melee",
                        "single-target",
                        "multi-target",
                        "conditional",
                        "condition",
                        "vulnerability",
                        "modal",
                        "concentration"
                    ]
                },
                "Absorption Barrier": {
                    "name": "Absorption Barrier",
                    "class": "Sentinel",
                    "description": [
                        "You cover a wide area, fully absorbing enemy attacks. Block all damage and effects of the entire AOE of an attack that would hit you or an adjacent ally. You recover 10 stamina per ally protected with this ability, up to a limit of 30 stamina. If you are dual wielding shields, you may expend a Shield stack; if you do, you may dash to any empty space protected by this ability."
                    ],
                    "tags": [
                        "block",
                        "shield",
                        "self-target",
                        "ally-target",
                        "conditional",
                        "modal",
                        "dash"
                    ]
                },
                "Grand Guardian": {
                    "name": "Grand Guardian",
                    "class": "Sentinel",
                    "description": [
                        "You focus in order to react instinctively to attacks. For the duration, you may freely block an attack on yourself or an adjacent ally up to once per round as a free reaction, increased to up to twice per round if you are dual wielding shields. While this buff is active, you do not generate Shield stacks through your Perfect Shield passive; instead, you gain a Shield stack at the end of each of your turns."
                    ],
                    "tags": [
                        "buff",
                        "concentration",
                        "conditional"
                    ]
                },
                "Chain Snare": {
                    "name": "Chain Snare",
                    "class": "Sentinel",
                    "description": [
                        "You ensnare enemies by wrapping them in chains. Toss your shield at a target enemy in range; they become Grappled. If you are dual wielding shields, do this twice. While you have enemies Grappled in this manner, your attacks against them have +100% Accuracy, but you are limited to attacks made with your currently equipped shields."
                    ],
                    "tags": [
                        "attack",
                        "single-target",
                        "multi-target",
                        "grapple",
                        "modal",
                        "conditional"
                    ]
                },
                "Chain Blitz": {
                    "name": "Chain Blitz",
                    "class": "Sentinel",
                    "description": [
                        "You cycle the gears around your chains to a more offensive set up. For the duration, you do not generate Shield stacks through your Perfect Shield passive; instead, you gain a Shield stack whenever you hit an enemy with a shield attack. Also, while this buff is active, all of your physical attacks with your shields have +30 ft range. This buff ends automatically when you enter Shield stance; if this buff ends in this manner, you gain +100% increased physical damage until Shield stance ends."
                    ],
                    "tags": [
                        "buff",
                        "concentration",
                        "conditional"
                    ]
                }
            }
        },
        "Sniper": {
            "type": "class",
            "name": "Sniper",
            "description": "The Sniper delivers death from afar. Unlike archers who use shortbows and crossbows for medium range engagements, firing dozens of arrows to slay their target, the Sniper relies on single, extremely powerful and accurate shots from extreme ranges. The firing rate of the average longbow tends to be lower, but the range and damage output easily make up for it. The Sniper expands upon the longbow's strengths by preparing carefully for each shot. He spots his target, tracks their movement, the way they dodge, the weak points in their armor. And finally, when he is ready to take the shot, he has already stacked all the cards in his favor.",
            "passive": {
                "Spotter": "At any time, you may mark an enemy target you can see as Spotted. While you have a Spotted target, you gain 1 stack of Spotting whenever you take a Major action that does not involve dealing damage or moving. You can also use your Major action to track your target, gaining 2 stacks of Spotting. You have a maximum limit of 8 stacks of Spotting. You lose all stacks of Spotting when a Spotted target dies, or when you switch the mark to a new target. When you attack a Spotted target with a ranged attack from a longbow, you expend all stacks of Spotting, and deal 25% increased damage per stack expended this way."
            },
            "abilities": {
                "Piercing Shot": {
                    "name": "Piercing Shot",
                    "class": "Sniper",
                    "description": [
                        "You fire an empowered arrow, skewering multiple enemies. Deal 5d8 physical damage to all enemy targets in a 200 ft line. Targets beyond the first one hit take half damage, unless they are Spotted."
                    ],
                    "tags": [
                        "attack",
                        "ranged",
                        "physical",
                        "multi-target"
                    ]
                },
                "Kill Shot": {
                    "name": "Kill Shot",
                    "class": "Sniper",
                    "description": [
                        "You fire a single, massive arrow with deadly accuracy. Deal 7d8 physical damage to a target in range. You may choose to expend any number of Spotting stacks to add 10% Lethality to the attack per stack."
                    ],
                    "tags": [
                        "attack",
                        "ranged",
                        "physical",
                        "single-target",
                        "modal",
                        "lethal"
                    ]
                },
                "Shrapnel Shot": {
                    "name": "Shrapnel Shot",
                    "class": "Sniper",
                    "description": [
                        "You fire an arrow rigged to detonate, shooting deadly shrapnel from the arrowhead after initial impact. Deal 6d8 to a target in range. If the target is Spotted, this ability deals half as much damage taken by the target to all enemies within 20 ft of the target. If the target was killed by the initial hit, this ability deals damage equal to the damage taken by the target to all enemies within 20 ft of the target instead."
                    ],
                    "tags": [
                        "attack",
                        "ranged",
                        "physical",
                        "single-target",
                        "conditional",
                        "aoe"
                    ]
                },
                "Rapid Shot": {
                    "name": "Rapid Shot",
                    "class": "Sniper",
                    "description": [
                        "You fire a heavy stream of arrows. Expend any amount of stamina in order to deal 2d8 physical damage to a target in range for every 10 stamina spent this way. If the target is Spotted, these hits gain the damage increase from consuming Spotting stacks without actually consuming them until the last hit."
                    ],
                    "tags": [
                        "attack",
                        "ranged",
                        "physical",
                        "single-target",
                        "multi-hit",
                        "modal"
                    ]
                },
                "Distance Shooter": {
                    "name": "Distance Shooter",
                    "class": "Sniper",
                    "description": [
                        "You fire specialized arrows which speed up as they fly. Your next ranged attack deals 2 additional damage for every 5 ft between you and your target."
                    ],
                    "tags": [
                        "buff",
                        "self-target",
                        "conditional",
                        "ranged",
                        "bow"
                    ]
                },
                "Precision Shooter": {
                    "name": "Precision Shooter",
                    "class": "Sniper",
                    "description": [
                        "You fire specialized arrows which fly faster and punch through armor. Your next ranged attack ignores AC and MR, cannot miss, bypasses barriers and walls, cannot be blocked or redirected, and cannot be reacted to."
                    ],
                    "tags": [
                        "buff",
                        "self-target",
                        "ignore ac",
                        "ignore mr",
                        "ignore barriers/walls/blocks",
                        "no-miss",
                        "no-react",
                        "bow"
                    ]
                },
                "Analytical Shooter": {
                    "name": "Analytical Shooter",
                    "class": "Sniper",
                    "description": [
                        "You aim carefully, scanning for a target's weak points. Your next ranged attack gains 20% critical strike chance and 50% critical damage modifier. When you cast this ability, you may choose to concentrate on it. While concentrating on this ability, you may use a Major Action to gain an additional 10% critical strike chance and 25% critical damage modifier on your next ranged attack. This ability cannot grant more than 100% critical strike chance or more than 200% critical damage modifier. Concentration on this ability ends immediately upon making an attack."
                    ],
                    "tags": [
                        "buff",
                        "self-target",
                        "stat improve",
                        "critical",
                        "concentration",
                        "repeatable",
                        "bow"
                    ]
                },
                "Professional Shooter": {
                    "name": "Professional Shooter",
                    "class": "Sniper",
                    "description": [
                        "You force your senses past their limit. If you have an enemy Spotted, when you cast this ability, you instantly gain max Spotting stacks. After casting this ability, you lose the benefits of the Spotter passive until your next long rest."
                    ],
                    "tags": [
                        "self-target",
                        "bow"
                    ]
                },
                "Swift Sprint": {
                    "name": "Swift Sprint",
                    "class": "Sniper",
                    "description": [
                        "You quickly spring to your feet and sprint from danger. Cleanse Slow, Immobilize, Crippled, and Prone, then dash 10 ft in any direction. You may choose to expend a stack of Spotting to dash 25 ft instead."
                    ],
                    "tags": [
                        "dash",
                        "modal",
                        "cleanse"
                    ]
                },
                "Swift Shot": {
                    "name": "Swift Shot",
                    "class": "Sniper",
                    "description": [
                        "You flick your aim elsewhere and take a snap potshot. Deal 3d8 physical damage to a target in range, Stunning them until the end of the turn."
                    ],
                    "tags": [
                        "attack",
                        "ranged",
                        "physical",
                        "single-target",
                        "condition",
                        "stun"
                    ]
                },
                "Bola Shot": {
                    "name": "Bola Shot",
                    "class": "Sniper",
                    "description": [
                        "You fire an arrow with a bola head. Deal 4d8 damage and inflict Slow on a target in range. You may choose to expend a stack of Spotting to inflict Immobilize instead."
                    ],
                    "tags": [
                        "attack",
                        "ranged",
                        "physical",
                        "single-target",
                        "condition",
                        "slow",
                        "modal",
                        "immobilize"
                    ]
                },
                "Evasive Maneuvers": {
                    "name": "Evasive Maneuvers",
                    "class": "Sniper",
                    "description": [
                        "You concentrate all your energy on avoiding attacks. Expend any number of Spotting stacks to gain 10% evasion per stack expended this way. While this buff is active, you may use your Reaction to cast any Sniper ability."
                    ],
                    "tags": [
                        "buff",
                        "concentration",
                        "add evasion"
                    ]
                }
            }
        },
        "Soldier": {
            "type": "class",
            "name": "Soldier",
            "description": "The Soldier is a fighter who wields sword and shield, but boasts an impressive level of mobility as well. Trained with more modern techniques of striking quickly and focusing on survival, this class provides a multitude of options for blocking or dodging incoming attacks, and fighting in a responsive, calculated style that wouldn't normally be expected of a fighter. The Soldier fights on the front lines like other fighters, but isn't restricted to heavy armor, and utilizes strategy over raw power to whittle down opponents.",
            "passive": {
                "Defensive Footwork": "When you use your reaction to use a block ability and successfully avoid/reduce damage from an incoming attack, gain a special reaction until the beginning of your next turn which can only be used for a dash reaction ability. When you use your reaction to use a dash reaction ability and successfully avoid/reduce damage from an incoming attack, gain a special reaction until the beginning of your next turn which can only be used for a block reaction ability. Special reactions provided by Defensive Footwork have their mana and stamina costs halved. Defensive Footwork can activate at most once per round, and refreshes at the beginning of each of your turns."
            },
            "abilities": {
                "Fleetfoot Blade": {
                    "name": "Fleetfoot Blade",
                    "class": "Soldier",
                    "description": [
                        "You slash quickly at an enemy while staying mobile. Deal 4d10 physical damage to a target in range. If you cast a dash reaction ability, you may cast this ability as a free reaction at the beginning or end of your dash."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "single-target",
                        "melee",
                        "longblade",
                        "modal",
                        "conditional"
                    ]
                },
                "Steadfast Strikes": {
                    "name": "Steadfast Strikes",
                    "class": "Soldier",
                    "description": [
                        "You attack relentlessly in between evasive moves. Deal 2d10 physical damage to a target in range. You may choose to concentrate on this ability when you cast it. If you do, you may use your Major Action to repeat this ability at no stamina cost, dealing 2d10 + Xd10 physical damage to a target in range, where X is the number of times you have hit with this ability since beginning concentration. Concentration on this ability ends immediately when you take at least 1 point of damage or recieve a condition."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "single-target",
                        "melee",
                        "longblade",
                        "concentration",
                        "repeatable",
                        "conditional"
                    ]
                },
                "Biding Blade": {
                    "name": "Biding Blade",
                    "class": "Soldier",
                    "description": [
                        "You build energy while blocking to attack when the opening presents itself. Deal 5d10 physical damage to a target in range. If you cast a block reaction ability, you may cast this ability as a free reaction after your block, dealing 5d10 + X physical damage to a target in range, where X is half the blocked damage amount."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "single-target",
                        "melee",
                        "longblade",
                        "modal",
                        "conditional"
                    ]
                },
                "Sever The Head": {
                    "name": "Sever The Head",
                    "class": "Soldier",
                    "description": [
                        "You dive the enemy's backline with the goal of slaying their commander. Dash to a space adjacent to a target in range, marking the target and dealing 6d10 physical damage to it. While the target is marked, it loses its reaction and takes 50% increased damage from your attacks. The mark lasts until the beginning of your next turn or until you take at least 1 point of damage or gain a condition. Alternatively, you may end the mark early to dash up to 30 ft in any direction as a free reaction at any time."
                    ],
                    "tags": [
                        "attack",
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
                "Intercept": {
                    "name": "Intercept",
                    "class": "Soldier",
                    "description": [
                        "You toss your shield up to block an attack. Completely block one single-target attack on you as a reaction. If the attacker is in melee range, you may dash to any empty space that is still in melee range."
                    ],
                    "tags": [
                        "block",
                        "self-target",
                        "dash",
                        "conditional",
                        "shield"
                    ]
                },
                "Shield Bash": {
                    "name": "Shield Bash",
                    "class": "Soldier",
                    "description": [
                        "You preemptively counterattack before your enemy's attack lands. When an enemy in range targets you with an attack, deal 4d6 physical damage to that enemy. If you roll at least 18 on your damage dice for this ability, it also Stuns your target until the beginning of their next turn."
                    ],
                    "tags": [
                        "single-target",
                        "attack",
                        "physical",
                        "melee",
                        "shield",
                        "conditional",
                        "stun",
                        "condition"
                    ]
                },
                "Protective Sweep": {
                    "name": "Protective Sweep",
                    "class": "Soldier",
                    "description": [
                        "You spin your shield in a wide circle, protecting an entire area. Block all the effects of an incoming AOE attack for all spaces within range."
                    ],
                    "tags": [
                        "block",
                        "aoe",
                        "shield"
                    ]
                },
                "Long Live The King": {
                    "name": "Long Live The King",
                    "class": "Soldier",
                    "description": [
                        "You stand by an important ally, protecting them from harm. Until the beginning of your next turn, you may use any number of free reactions to redirect all attacks that would hit target adjacent ally to yourself, blocking 50% of the damage of those attacks. If the ally you targetted is not adjacent to you when they are attacked, you may dash to a space adjacent to them as a free reaction to such an attack, expending 5 stamina for every 5 ft traveled this way up to a limit of 50 ft."
                    ],
                    "tags": [
                        "block",
                        "dash",
                        "modal",
                        "variable stamina cost",
                        "redirect"
                    ]
                },
                "Dodge Roll": {
                    "name": "Dodge Roll",
                    "class": "Soldier",
                    "description": [
                        "You roll away or towards enemies. Dash up to 20 ft in any direction at any time. The max dash range extends to 30 ft if you use this ability as a reaction after using it as a minor action in the same round."
                    ],
                    "tags": [
                        "dash",
                        "conditional"
                    ]
                },
                "Double Time": {
                    "name": "Double Time",
                    "class": "Soldier",
                    "description": [
                        "You speed up your pace in combat. Increase your move speed by +20 and convert all movement made during Move Actions to dashes."
                    ],
                    "tags": [
                        "buff",
                        "move speed"
                    ]
                },
                "Tactical Withdrawal": {
                    "name": "Tactical Withdrawal",
                    "class": "Soldier",
                    "description": [
                        "You sprint out of a tactically unsound position. When you successfully resolve this ability, actions you take this turn do not trigger enemy reactions (although the initial cast of this ability can be reacted to). Dash up to 40 ft in any direction to a space that is not adjacent to an enemy."
                    ],
                    "tags": [
                        "dash",
                        "conditional",
                        "action denial"
                    ]
                },
                "Vigor of Battle": {
                    "name": "Vigor of Battle",
                    "class": "Soldier",
                    "description": [
                        "You build up speed as you deliver death. Until the beginning of your next turn, you gain 5 ft of additional move speed for every 5 damage you deal this round, and you gain 5% evasion for every 10 damage you deal this round. At the beginning of your next turn, any unused move speed you accumulated during the last round carries over to the new turn."
                    ],
                    "tags": [
                        "gain move speed",
                        "gain evasion"
                    ]
                }
            }
        },
        "Summoner": {
            "type": "class",
            "name": "Summoner",
            "description": "The Summoner is an entry level mage that has begun to master the school of summoning magic, a school that calls forth entities from distant lands and even other planes to fight by the caster's side. There is usually at least one summoner in every mage cadre, as the style lends itself well to fighting in the backline. As a mid-level practitioner of the art, the Summoner focuses on having a wide variety of options for summoning targets, including combat ready companions to attack and defend and utility based partners for problem solving, scouting, and skill usage. Each of the Summoner's spells creates an entity that has its own actions but also has a passive effect to help support other summons, which makes an army of summons increasingly powerful. Efficiency is all about picking the right summons for the right situations and finding a way to deal with the setup time required to build up a small army.",
            "passive": {
                "Return to Aether": "While not in combat, you may dispel any of your summons freely. If you dispel a summon this way, you gain mana equal to half the mana spent to summon it."
            },
            "abilities": {
                "Summon Ascarion Beast": {
                    "name": "Summon Ascarion Beast",
                    "class": "Summoner",
                    "description": [
                        "You summon one of the monstrous, toxic beasts of Ascari, the plane of amethyst poisons. Summon an Ascarion Beast with 30 HP, 40 ft Move Speed, 10 AC, 20% Evasion, 20% MR, and 20% CR. The Beast obeys your commands; otherwise, it uses its Move Action to approach enemies and its Major Action to attack them for 4d6 physical damage with \"On Hit: Inflict 2d6 Poison\". The Beast has a 20 ft aura that causes attacks made by allies to ignore 20% of their targets' CR."
                    ],
                    "tags": [
                        "spell",
                        "summoning",
                        "minion",
                        "physical",
                        "condition",
                        "poison"
                    ]
                },
                "Summon Asiok Dracolord": {
                    "name": "Summon Asiok Dracolord",
                    "class": "Summoner",
                    "description": [
                        "You summon one of the elite Draconian siegebreakers of Asiok, the war-scarred plane of scarlet tragedy. Summon an Asiok Dracolord with 50 HP, 40 ft Move Speed, 40 AC, 30% MR, and 30% CR. The Dracolord obeys your commands; otherwise, it uses its Move Action to approach enemies and its Major Action to use Firebreath, dealing 6d10 fire magic damage in a 30 ft cone. Firebreath deals double damage to constructs and buildings. The Dracolord has a 20 ft aura that increases ally damage by 30%."
                    ],
                    "tags": [
                        "spell",
                        "summoning",
                        "minion",
                        "aoe",
                        "cone"
                    ]
                },
                "Summon Throatslitter Demon": {
                    "name": "Summon Throatslitter Demon",
                    "class": "Summoner",
                    "description": [
                        "You summon one of the terrifying, evil demons that stalk the Aetherways. Summon a Throatslitter Demon with 50 HP, 50 ft Move Speed, 70% EV, 20% MR, 100% Armor Penetration, 50% Critical Strike Chance, and +100% Critical Damage Modifier. The Demon obeys your commands; otherwise, it uses its Move Action to approach enemies, its Major Action to attack in melee range for 6d6 physical damage, and its Minor Action to make Sneak checks with a +20 bonus. The Demon has a 20 ft aura that increases ally critical strike chance by +15%."
                    ],
                    "tags": [
                        "spell",
                        "summoning",
                        "minion",
                        "physical"
                    ]
                },
                "Summon Siretsu Leviathan": {
                    "name": "Summon Siretsu Leviathan",
                    "class": "Summoner",
                    "description": [
                        "You summon a monster from the depths of the oceans of Siretsu, the plane of lifestealing waters. Summon a Leviathan with 200 HP, massive size, 100 ft speed on land and in water, 50 AC, 50% MR, and 50% CR. The Leviathan obeys your commands; otherwise, it uses its Move Action to approach enemies, its Major Action to spawn tidal waves that deal 10d10 water magic damage in a 45 ft square centered on a space within 100 ft, and its Minor Action to grapple up to 4 enemies with its tentacles or to devour grappled enemies, dealing 10d10 physical damage and banishing them to Siretsu. The Leviathan has a 100 ft aura that drains 30 stamina and 30 mana from each enemy within the aura."
                    ],
                    "tags": [
                        "spell",
                        "summoning",
                        "minion",
                        "water",
                        "aoe",
                        "square"
                    ]
                },
                "Summon Batusan Golem": {
                    "name": "Summon Batusan Golem",
                    "class": "Summoner",
                    "description": [
                        "You summon an armored golem from Batusa, the plane of blacksteel mountains. Summon a Batusan Golem with 60 HP, 30 ft Move Speed, 30 AC, 50% MR, and 40% CR. The Golem obeys your commands; otherwise, it uses its Move Action to move towards you, its Major Action to make a melee multi-target attack, knocking back enemies 20 ft away from you, and its Reaction to block one attack or AOE hit on you. The Golem has a 20 ft aura that increases the AC of allies by 30%."
                    ],
                    "tags": [
                        "spell",
                        "summoning",
                        "minion",
                        "knockback",
                        "ac increase"
                    ]
                },
                "Summon Noxian Seraph": {
                    "name": "Summon Noxian Seraph",
                    "class": "Summoner",
                    "description": [
                        "You summon an angel from the domain of Nox. Summon a Noxian Seraph with 50 HP, 40 ft Move Speed, 10 AC, 50% MR, and 70% CR. The Seraph obeys your commands; otherwise, it uses its Move Action to move towards you, its Major Action to heal you for 5d10 health, and its Minor Action to cleanse you of 1 random condition. The Seraph has a 20 ft aura that increases the MR of allies by 30%."
                    ],
                    "tags": [
                        "spell",
                        "summoning",
                        "minion",
                        "healing",
                        "cleanse",
                        "mr increase"
                    ]
                },
                "Summon Vilyrian Spellmaster": {
                    "name": "Summon Vilyrian Spellmaster",
                    "class": "Summoner",
                    "description": [
                        "You summon a wizard from Vilyr, the Infinite Library. Summon a Vilyrian Spellmaster with 40 HP, 30 ft Move Speed, 70% MR, and 20% CR. The Spellmaster obeys your commands; otherwise, it uses its Move Action to move towards you, its Major Action to dispel a non-allied magical field or effect that it is adjacent to or inside of, and its reaction to cast a counterspell, countering an enemy spell cast within 50 ft. The Spellcaster has a 20 ft aura that increases the CR of allies by 20%."
                    ],
                    "tags": [
                        "spell",
                        "summoning",
                        "minion",
                        "defense",
                        "counterspell"
                    ]
                },
                "Summon Warpwurm": {
                    "name": "Summon Warpwurm",
                    "class": "Summoner",
                    "description": [
                        "You summon a warpwurm from the Aetherways. Summon a Warpwurm with 50 HP. The Warpwurm obeys you commands; otherwise, it does nothing. It uses its Major Action to create up to 2  temporary portals in empty spaces within 100 ft, linked to its own duration; these portals can be walked into to teleport to any other portal made by the Warpwurm. It uses its reaction to teleport you or other allies out of danger, such as to avoid AOE spells or to rescue someone from falling. The Warpwurm has a 20 ft aura; within this aura, all allies are spatially locked to the current plane of existence and cannot be forcibly banished or teleported."
                    ],
                    "tags": [
                        "spell",
                        "summoning",
                        "minion"
                    ]
                },
                "Summon Unseen Servant": {
                    "name": "Summon Unseen Servant",
                    "class": "Summoner",
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
                        "spell",
                        "summoning",
                        "minion"
                    ]
                },
                "Summon Estian Wayfinder": {
                    "name": "Summon Estian Wayfinder",
                    "class": "Summoner",
                    "description": [
                        "You summon a psionic guide from Estia, the plane of ephemeral, psychic pleasures. Summon an Estian Wayfinder with 30 HP, 150 ft Move Speed, 100% Evasion, and 50% CR. The Wayfinder obeys your commands; otherwise, it follows you and does nothing. The Wayfinder has masterful knowledge of most planes, and can act as a guide to nearly any location on a plane that isn't a well kept secret or whose location isn't lost to the ages. The Wayfinder has a 150 ft aura with the following effects: allies, mounts, and vehicles have doubled Move Speed; allies have +30 to Psionics: Defense checks; allies cannot be charmed, Feared, Confused, or put to Sleep."
                    ],
                    "tags": [
                        "spell",
                        "summoning",
                        "minion"
                    ]
                },
                "Summon Xat'hul Charmspirit": {
                    "name": "Summon Xat'hul Charmspirit",
                    "class": "Summoner",
                    "description": [
                        "You summon a small totemic spirit from Xat'hul, the plane of living, virulent mana. Summon a Xat'hul Charmspirit with 10 HP and 60 ft Move Speed. The Charmspirit obeys your commands; otherwise, it follows you and does nothing. The Charmspirit will imprint upon a humanoid of your choice, following them instead and granting them a random benefit (a humanoid cannot be imprinted by more than one Charmspirit at a time). The Charmspirit is attracted to sources of mana, informing its imprinted humanoid of nearby people or objects that contain mana up to a range of 1 mile, although it struggles with expressing exact numbers. The Charmspirit has a 5 ft aura with the following effects: allies have +25 to Artistry and Interaction skill checks; allies have +10% Health Regeneration; allies automatically stabilize if downed."
                    ],
                    "tags": [
                        "spell",
                        "summoning",
                        "minion"
                    ]
                },
                "Summon Watcher": {
                    "name": "Summon Watcher",
                    "class": "Summoner",
                    "description": [
                        "You summon a silent guardian from a plane long dead. Summon a Watcher with 1 HP and immunity to all damage and conditions. The Watcher maintains a vigilant guard upon all spaces within 100 ft of it, has true sight and can see through walls and barriers, and can telepathically inform the caster of the status of all entities within its sight. The Watcher will warn the caster of any changes or threats in the area. The Watcher prevents scrying magic or teleportation magic from affecting the spaces it watches unless otherwise commanded. If commanded, the Watcher can cause the spaces and entities it sees to phase out of the current plane of existence, moving everyone within its area of influence to a pocket realm for 1 hour before dying. Allies that short rest while being guarded by a Watcher gain +30% health regeneration, +30% stamina regeneration, and +30% mana regeneration. Allies that long rest while being guarded by a Watcher have dreams of possible future events."
                    ],
                    "tags": [
                        "spell",
                        "summoning",
                        "minion"
                    ]
                }
            }
        },
        "Symbiote": {
            "type": "class",
            "name": "Symbiote",
            "description": "The Symbiote is a standard part of many mage cadres, as an intermediate level mage with a mastery of buff magic. Buff spells allow this class to assist their allies without having to attack their enemies and put themselves in harms way. As long as allies have enough composure to handle the strain of multiple buff spells, this class can turn the party into ruthless killing machines or steadfast and unbreakable defenders. As the entry level class for buff magic, this class contains a wide variety of buffing effects and the ability to maintain those effects for an extended period of time.",
            "passive": {
                "Eternal Bond": "When an ally you can see has a buff's duration expire on them for a buff spell that you originally casted, you may recast the spell if they are in range as a free reaction. Mana costs are halved for spells cast this way."
            },
            "abilities": {
                "Strengthen Soul": {
                    "name": "Strengthen Soul",
                    "class": "Symbiote",
                    "description": [
                        "You strengthen an ally's conviction and confidence. Target ally in range gains a buff that increases their damage by 50% for the duration. When an ally gains this buff, they may use their reaction to make an autoattack."
                    ],
                    "tags": [
                        "spell",
                        "buff",
                        "increase damage"
                    ]
                },
                "Empower Soul": {
                    "name": "Empower Soul",
                    "class": "Symbiote",
                    "description": [
                        "You empower an ally's willpower and forcefulness. Target ally in range gains a buff that causes their attacks to ignore 20% MR and evasion for the duration. You may expend any amount of additional mana when you cast this spell to add to the percentage MR and evasion ignored by twice the amount of additional mana spent."
                    ],
                    "tags": [
                        "spell",
                        "buff",
                        "modal"
                    ]
                },
                "Bolster Soul": {
                    "name": "Bolster Soul",
                    "class": "Symbiote",
                    "description": [
                        "You bolster an ally's focus and precision. Target ally in range gains a buff that grants +20% critical strike chance and +100% critical damage modifier for the duration. As a free reaction to attacking an enemy, an ally with this buff may end the buff early to make the triggering attack a critical hit that cannot be reacted to."
                    ],
                    "tags": [
                        "spell",
                        "buff",
                        "modal",
                        "increase critical strike chance",
                        "increase critical damage modifier"
                    ]
                },
                "Embolden Soul": {
                    "name": "Embolden Soul",
                    "class": "Symbiote",
                    "description": [
                        "You embolden an ally's forward advance. Target ally in range gains a buff that causes them to lose their Minor Action but gain an extra Major Action each turn. When this buff ends (for any reason), the target may make an attack as a free reaction."
                    ],
                    "tags": [
                        "spell",
                        "buff",
                        "concentration"
                    ]
                },
                "Strengthen Body": {
                    "name": "Strengthen Body",
                    "class": "Symbiote",
                    "description": [
                        "You strengthen an ally's attention and constitution. Target ally in range gains a buff that increases their AC and Evasion by 40% for the duration. You may cast this spell as a reaction for an additional 10 mana."
                    ],
                    "tags": [
                        "spell",
                        "buff",
                        "increase ac",
                        "increase evasion",
                        "modal"
                    ]
                },
                "Empower Body": {
                    "name": "Empower Body",
                    "class": "Symbiote",
                    "description": [
                        "You suffuse an ally's body with protective magic. Target ally in range gains a buff that grants +20% general MR and +20% MR for an element of your choice for the duration. You may cast this spell as a reaction for an additional 10 mana."
                    ],
                    "tags": [
                        "spell",
                        "buff",
                        "defensive",
                        "increase mr",
                        "modal"
                    ]
                },
                "Bolster Body": {
                    "name": "Bolster Body",
                    "class": "Symbiote",
                    "description": [
                        "You bolster an ally's natural defenses against conditions. Target ally in range gains a buff that grants +20% general CR and +20% CR for a condition of your choice for the duration. You may cast this spell as a reaction for an additional 10 mana."
                    ],
                    "tags": [
                        "spell",
                        "buff",
                        "defensive",
                        "increase cr",
                        "modal"
                    ]
                },
                "Embolden Body": {
                    "name": "Embolden Body",
                    "class": "Symbiote",
                    "description": [
                        "You embolden an ally's forward advance. Target ally in range gains a buff that causes them to lose their Minor Action but gain an extra Reaction each turn. When this buff ends (for any reason), the target becomes invulnerable to damage until the end of the turn."
                    ],
                    "tags": [
                        "spell",
                        "buff",
                        "concentration"
                    ]
                },
                "Strengthen Mind": {
                    "name": "Strengthen Mind",
                    "class": "Symbiote",
                    "description": [
                        "You strengthen an ally's instincts and proficiency. Target ally in range gains a buff that grants +30 to all skill checks for the duration. The target may consume 10 minutes of this buff's duration to reroll a skill check and take the new result while this buff is active."
                    ],
                    "tags": [
                        "spell",
                        "buff",
                        "skill boost"
                    ]
                },
                "Power Spike": {
                    "name": "Power Spike",
                    "class": "Symbiote",
                    "description": [
                        "You empower a buff effect at the cost of its duration. Target buff effect in range that you originally granted has its effectiveness increased by 50% and its current duration cut in half (always rounded down to the nearest 10 second, 10 minute, or 6 hour interval as applicable for minute, hour, and day long buffs)."
                    ],
                    "tags": [
                        "spell",
                        "utility"
                    ]
                },
                "Bolster Speed": {
                    "name": "Bolster Speed",
                    "class": "Symbiote",
                    "description": [
                        "You bolster an ally's quickness and endurance. Target ally in range gains a buff that grants +30 move speed for the duration. The target may consume 10 seconds of this buff's duration to dash 30 ft in any direction as a minor action or reaction."
                    ],
                    "tags": [
                        "spell",
                        "buff",
                        "increase speed"
                    ]
                },
                "Power Surge": {
                    "name": "Power Surge",
                    "class": "Symbiote",
                    "description": [
                        "You layer multiple buff spells together. When you successfully cast this spell, immediately cast 2 different buff spells on a target in range. Those buff spells cannot be countered when cast this way, and if one of those buff effects is targeted by the Power Spike spell, the other is also affected by it. The mana cost of Power Surge is 30 + X where X is the sum of the mana costs of the 2 buff spells being cast by Power Surge."
                    ],
                    "tags": [
                        "spell",
                        "utility",
                        "modal",
                        "conditional"
                    ]
                }
            }
        },
        "Thief": {
            "type": "class",
            "name": "Thief",
            "description": "The Thief is a career of daring exploits and mischief. Stealing from the rich and poor, the strong and weak, the Thief preys upon the riches of others for their own personal gain. With excellent abilities to sneak past watchful eyes and a knack for knifeplay, the Thief augments its meager combat ability with excellent stealing and sneaking abilities. This class switches between focusing on stealing and focusing on sneaking and adapts to the situation at hand, fluidly sifting through a bag of both offensive and defensive tricks, and is effective at critical strikes when stealth fails and combat breaks out.",
            "passive": {
                "Hit and Run": "At the beginning of combat, enter either Hit Stance or Run Stance, and you may switch at the beginning of each of your turns. When you enter Hit Stance, drain 20 stamina from a target in melee range. During Hit Stance, your attacks have \"On Hit: Drain 10 health.\" When you enter Run Stance, become Hidden and dash up to 15 ft in any direction. During Run Stance, your movement does not provoke opportunity attacks or trigger traps, and you gain +20 move speed."
            },
            "abilities": {
                "Cloak and Dagger": {
                    "name": "Cloak and Dagger",
                    "class": "Thief",
                    "description": [
                        "You stab at an enemy behind the veil of stealth or with the sudden violence of a mugging. Deal 5d4 physical damage to a target in range. If you are in Hit Stance, this attack has +100% critical damage modifier. If you are in Run Stance, this attack has +20% critical strike chance."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "melee",
                        "conditional",
                        "stance",
                        "single-target"
                    ]
                },
                "Blade in the Dark": {
                    "name": "Blade in the Dark",
                    "class": "Thief",
                    "description": [
                        "You toss a knife from the shadows. Deal 5d4 physical damage to a target in range. If you entered Hit Stance this turn, you may dash to a space adjacent to your target after the attack, gaining 50% critical damage modifier until the end of your next turn. If you entered Run Stance this turn, this attack does not break your Hidden status, and you gain 10% critical strike chance until the end of your next turn."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "ranged",
                        "conditional",
                        "stance",
                        "hidden",
                        "buff",
                        "modal",
                        "single-target"
                    ]
                },
                "Frenetic Assault": {
                    "name": "Frenetic Assault",
                    "class": "Thief",
                    "description": [
                        "You quickly stab with your dagger multiple times. Deal d4 physical damage to a target in range, repeated 3 times. If you are in Hit Stance, these hits have, \"On Hit: Target loses your choice of 10 AC, 10% evasion, or 10% MR.\" If you are in Run Stance, you may dash up to 10 ft before each hit, and you may choose new targets for each hit."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "melee",
                        "conditional",
                        "stance",
                        "dash",
                        "single-target",
                        "multi-target"
                    ]
                },
                "Unavoidable Casualties": {
                    "name": "Unavoidable Casualties",
                    "class": "Thief",
                    "description": [
                        "You cut down the unsuspecting person who just happens to be in your way. As a reaction to stealing from an enemy, moving out of melee range of an enemy, or being attacked by an enemy in range, deal 20d4 physical damage to that enemy. If you are in Hit Stance, this attack gains 5% Lethality for every damage die that rolls its maximum. If you are in Run Stance, gain 5 stamina for every damage die that rolls its maximum. You may not attack an enemy who was hit by this ability during your next turn."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "melee",
                        "conditional",
                        "stance",
                        "lethality",
                        "recover stamina"
                    ]
                },
                "Snatch and Grab": {
                    "name": "Snatch and Grab",
                    "class": "Thief",
                    "description": [
                        "You reach into a distracted enemy's bag and grab the first thing you touch. Steal a random item or up to 100 gp from the inventory of a target in range. If you are in Hit Stance, steal twice from the target. If you fail to steal an item because the target's inventory is empty, you may make an auto attack against the target with an equipped dagger as a free action."
                    ],
                    "tags": [
                        "conditional",
                        "random",
                        "modal",
                        "attack",
                        "physical",
                        "dagger",
                        "stance"
                    ]
                },
                "Charm and Disarm": {
                    "name": "Charm and Disarm",
                    "class": "Thief",
                    "description": [
                        "You distract an enemy and snatch the weapon right out of an enemy's hand, or loosen the clasps on their armor so it falls free. A target in range becomes Confused until the beginning of their next turn. Then steal a weapon or armor piece that is equipped to that target. If you are in Hit Stance and steal a weapon this way, you may make an autoattack with that weapon as a free action before stowing or discarding it. If you are in Hit Stance and steal a piece of armor this way, the target's Confusion lasts until the end of their next turn instead."
                    ],
                    "tags": [
                        "conditional",
                        "stance",
                        "modal",
                        "attack",
                        "condition",
                        "confuse"
                    ]
                },
                "Purloin Powers": {
                    "name": "Purloin Powers",
                    "class": "Thief",
                    "description": [
                        "Your deft stealing skills allow you to steal an enemy's magic effects. Choose one:",
                        "<ul>",
                        "<li>Strip all buffs from all enemy targets in range, then gain those buffs yourself, or distribute them as you choose amongst allies within 30 ft.</li>",
                        "<li>If you are in Hit Stance, cast this ability as a reaction to a spell that is cast within range. Counter that spell, then you may copy and cast it yourself, choosing new targets and paying stamina instead of mana.</li>",
                        "</ul>"
                    ],
                    "tags": [
                        "buff strip",
                        "buff",
                        "modal",
                        "conditional",
                        "stance",
                        "counterspell"
                    ]
                },
                "Grand Thievery": {
                    "name": "Grand Thievery",
                    "class": "Thief",
                    "description": [
                        "You dash forward with the intent of stealing everything you can get your hands on. Dash up to 30 ft in any direction. Then, steal a random item or up to 100 gp from the inventory of a target in range. If you are in Hit Stance, steal twice instead. Then make a Steal check with a DC of 10 + X where X is 10 times the number of times you have stolen with this ability. If your Steal check succeeds, repeat this ability as a free action with no cost."
                    ],
                    "tags": [
                        "conditional",
                        "random",
                        "stance",
                        "repeatable"
                    ]
                },
                "Infiltrate": {
                    "name": "Infiltrate",
                    "class": "Thief",
                    "description": [
                        "You move quickly and quietly past doors and guards. Dash up to 40 ft in any direction. During this dash, you automatically unlock doors and windows and pass through magical barriers without harm. If you are in Run Stance, you may cast this ability as a Minor Action instead."
                    ],
                    "tags": [
                        "dash",
                        "conditional",
                        "modal",
                        "stance"
                    ]
                },
                "Dodge the Law": {
                    "name": "Dodge the Law",
                    "class": "Thief",
                    "description": [
                        "You evade an attempt at capture and escape the hands of your pursuers. Cleanse Cripple, Immobilize, Prone, and Slow. Break any grapple or bindings you are in and temporarily ignore any condition or spell that would prevent you from moving freely until the end of your next turn. Then dash up to 30 ft in any direction. If you are in Run Stance, you may instead dash up to 40 ft in any direction and become Hidden after your dash."
                    ],
                    "tags": [
                        "cleanse",
                        "dash",
                        "conditional",
                        "stance",
                        "hidden"
                    ]
                },
                "Smokescreen": {
                    "name": "Smokescreen",
                    "class": "Thief",
                    "description": [
                        "You drop a smoke bomb and disappear. Drop a 35 ft square of thick smoke that enemies cannot see through. You and your allies remain Hidden while in this smoke, and can see through it. This smoke suppresses the field effects of your enemies that overlap with it, and enemies inside the smoke have -50% evasion and -50% MR. This smoke can be blown away by a strong wind. If you are in Run Stance, you may cast this ability as a reaction; if you do, the smoke blocks AOE attacks and effects within its spaces until the beginning of your next turn."
                    ],
                    "tags": [
                        "hidden",
                        "conditional",
                        "stance",
                        "modal",
                        "block"
                    ]
                },
                "Phantom Thief": {
                    "name": "Phantom Thief",
                    "class": "Thief",
                    "description": [
                        "You embody the legend of the master thief that you are, a spirit of freedom. Gain a buff that grants +100% Evasion, +100% crowd control CR, 1 additional Minor Action per turn, and 1 additional reaction per round, for the duration. If you enter Run stance while this buff is active, gain an additional Major Action."
                    ],
                    "tags": [
                        "buff",
                        "conditional",
                        "stance",
                        "gain actions",
                        "gain evasion",
                        "gain cr"
                    ]
                }
            }
        },
        "Transfusionist": {
            "type": "class",
            "name": "Transfusionist",
            "description": "The Transfusionist is an alchemist that has taken the next step in the development of organics alchemy. With a dangerous blend of fine tuned chemistry and unethical augmentation alchemy, the Transfusionist evolves their organisms haphazardly by fusing them together to create volatile but superior creatures. Most of this alchemist's speciality is in taking the common products of organics alchemy and augmenting them with the powers of other creatures. Sometimes this involves roughly and messily stitching creatures together; other times, it involves forcing parasitism between species that would never normally associate. This class works best when the character has amassed a good number of organics products through other class abilities and organics blueprints.",
            "passive": {
                "Last Minute Fix": "Once per round, when you deploy an organism you've crafted, you may cast an Augmentation alchemy ability or use an Augmentation alchemy blueprint on that organism as a free action."
            },
            "abilities": {
                "Abhorrent Chimera": {
                    "name": "Abhorrent Chimera",
                    "class": "Transfusionist",
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
                "Organ Donor": {
                    "name": "Organ Donor",
                    "class": "Transfusionist",
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
                "Brain Worm": {
                    "name": "Brain Worm",
                    "class": "Transfusionist",
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
                "Perfect Fusion": {
                    "name": "Perfect Fusion",
                    "class": "Transfusionist",
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
                "Restoring Parasite": {
                    "name": "Restoring Parasite",
                    "class": "Transfusionist",
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
                "Corrupting Parasite": {
                    "name": "Corrupting Parasite",
                    "class": "Transfusionist",
                    "description": [
                        "You release an altered, parasitic form of one of your creatures to attack an enemy. You use an organism you can see in range or one in your inventory to do the following: target enemy in range takes physical damage equal to half the organism's current health and gains an X damage Bleed, where X is the organism's maximum health divided by 5 and rounded down."
                    ],
                    "tags": [
                        "alchemy",
                        "organics",
                        "augmentation",
                        "condition",
                        "bleed",
                        "minion"
                    ]
                },
                "Enhancing Parasite": {
                    "name": "Enhancing Parasite",
                    "class": "Transfusionist",
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
                "Parasitic Plague": {
                    "name": "Parasitic Plague",
                    "class": "Transfusionist",
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
                "Augment Transfer": {
                    "name": "Augment Transfer",
                    "class": "Transfusionist",
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
                "Product Recall": {
                    "name": "Product Recall",
                    "class": "Transfusionist",
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
                "Swap Parts": {
                    "name": "Swap Parts",
                    "class": "Transfusionist",
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
                "Adrenaline Rush": {
                    "name": "Adrenaline Rush",
                    "class": "Transfusionist",
                    "description": [
                        "You overcharge the effects of an organic augmentation. Choose a target in range that is affected by an organism you grafted or parasitized onto them. Double the effectiveness of any persisting effects on that target, and cut the duration of the effect by half, rounded down. If the target is a deployed organism, cut its duration in half as well, rounded down."
                    ],
                    "tags": [
                        "alchemy",
                        "organics",
                        "augmentation",
                        "minion"
                    ]
                }
            }
        },
        "Voidwalker": {
            "type": "class",
            "name": "Voidwalker",
            "description": "The Voidwalker is a rogue that has adapted magic heavily into its suite of tools in order to assist small groups in exercising stealth and safety during travel and site execution. The spell list of the Voidwalker looks a lot like the ability list of the Thief, but is adapted to function for the entire party, providing multiple people with access to Hidden, breaking line of sight, avoiding capture, and evading enemy attacks. An additional layer of defenses is provided by a suite of powerful group defensive spells, covering multiple angles that enemies might attack from. More uniquely, this class provides a heavy amount of mobility in the form of group teleportation, even over very long distances, and is effective at protecting groups during movement by providing access to an ethereal realm where enemies cannot freely interact with them. Ultimately this class's goal is to provide a group with options to avoid combat while infiltrating an enemy fortress or options to cover long distances without needing to walk or use mounts.",
            "passive": {
                "Embrace the Void": "Before initiative is rolled, choose two:<ul><li>All allies become Hidden</li><li>All allies get +20 Initiative</li><li>All allies teleport up to 20 ft to empty spaces of their choosing</li><li>All enemies teleport up to 20 ft to empty spaces in random directions</li></ul>"
            },
            "abilities": {
                "Veil of Darkness": {
                    "name": "Veil of Darkness",
                    "class": "Voidwalker",
                    "description": [
                        "You cover allies in darkness. All allies in range become Hidden; while Hidden in this way, allies ignore traps and difficult terrain, and their attacks have, \"On Hit: Inflict Blind\". Additionally, allies in Touch range cleanse 1 condition of their choice."
                    ],
                    "tags": [
                        "spell",
                        "dark",
                        "buff",
                        "hidden",
                        "condition",
                        "blind",
                        "conditional",
                        "cleanse"
                    ]
                },
                "Dimension Door": {
                    "name": "Dimension Door",
                    "class": "Voidwalker",
                    "description": [
                        "You teleport a short distance with friends in tow. You and any number of allies and objects in range teleport to adjacent, empty spaces within 200 ft that you can see. Allies in range can extend the range of this ability by also being in touch range of other targets."
                    ],
                    "tags": [
                        "spell",
                        "dark",
                        "conjuration",
                        "teleport"
                    ]
                },
                "Blacklands": {
                    "name": "Blacklands",
                    "class": "Voidwalker",
                    "description": [
                        "You envelop the ground with the magic of the void. Up to 30 target spaces within range that you can see turn black, each becoming a field which blocks AOE effects and treats allied movement within them as dashes. Additionally, any allies standing in black spaces are considered to be in touch range."
                    ],
                    "tags": [
                        "spell",
                        "dark",
                        "conjuration",
                        "defensive",
                        "field",
                        "block"
                    ]
                },
                "Shadowstep": {
                    "name": "Shadowstep",
                    "class": "Voidwalker",
                    "description": [
                        "You transport allies to a shadow of the real world. All allies in range are transported to the Ethereal Realm for the duration, a shadow of the current plane. Within this realm, the setting is similar to the current realm but nothing within the real world can be interacted with. Additionally, within this realm, entities cannot rest or recover health, stamina, or mana via abilities or items, and entities that are Downed die instantly, their bodies turning to dust. Travel within the Ethereal Realm equals a similar amount of travel in the real world, and after this spell's duration expires, all entities are returned to their new position in the real world. You may choose to spend 1 minute to cast this spell as a minor ritual; if you do, its duration becomes 1 hour. You may choose to spend 10 minutes to cast this spell as a major ritual; if you do, its duration becomes 6 hours."
                    ],
                    "tags": [
                        "spell",
                        "dark",
                        "defensive",
                        "conjuration",
                        "ritual"
                    ]
                },
                "Void Portal": {
                    "name": "Void Portal",
                    "class": "Voidwalker",
                    "description": [
                        "You create a portal to faraway lands. Create an invisible portal within range for the duration that teleports entrants to a specified location on the current plane. If you haven't been to the destination, you need to roll a Conjurations skill check, with a DC based on distance. When you cast this spell, allies in touch range are teleported directly to the portal."
                    ],
                    "tags": [
                        "spell",
                        "dark",
                        "conjuration",
                        "teleport",
                        "conditional"
                    ]
                },
                "Shadow Puppets": {
                    "name": "Shadow Puppets",
                    "class": "Voidwalker",
                    "description": [
                        "You create shadow clones of your allies to deceive enemies. All allies in range gain a buff that creates 3 duplicate illusions of each of them. Duplicates redirect attacks to themselves based on how many are present, and are destroyed upon being attacked or having a condition inflicted on them. With 3 duplicates, the chance of redirection is 90%. With 2 duplicates, the chance of redirection is 70%. With 1 duplicate, the chance of redirection is 40%. An entity cannot benefit from more than 3 duplicates at a time."
                    ],
                    "tags": [
                        "spell",
                        "dark",
                        "conjuration",
                        "defensive",
                        "illusions"
                    ]
                }
            }
        },
        "Warlord": {
            "type": "class",
            "name": "Warlord",
            "description": "The Warlord is a fighter that understands the value of flexibility. Adept at fighting at close range with a variety of melee abilities and controlling longer ranges with a ranged weapon of their choice, the Warlord dominates the battlefield by abusing range advantages against less prepared foes. Diving in close against archers and mages, kiting other fighters, harrying enemies as they approach, this class can reliably put down a constant stream of damage and never wastes turns getting into position due to good mobility. The Warlord is rewarded, however, for switching between ranged and melee attacks frequently, forcing enemies to keep up with constantly changing tactics.",
            "passive": {
                "Calculated Aggression": "When you successfully deal physical damage with a melee weapon to a target, your next ranged attack becomes empowered for 50% increased physical damage. When you successfully deal physical damage with a ranged weapon to a target, your next melee attack becomes empowered for 50% increased physical damage. Calculated Aggression can trigger at most once per turn and the empowered effect does not stack."
            },
            "abilities": {
                "Pivot and Slash": {
                    "name": "Pivot and Slash",
                    "class": "Warlord",
                    "description": [
                        "You focus on your footwork while you attack, looking for an opening. Deal 4d10 physical damage to a target in range. You may dash up to 5 ft in any direction before or after this attack."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "single-target",
                        "melee",
                        "modal",
                        "dash"
                    ]
                },
                "Knock Aside": {
                    "name": "Knock Aside",
                    "class": "Warlord",
                    "description": [
                        "You slam your weapon into your opponent to push them. Deal 5d10 physical damage to a target in range, pushing them 10 ft in any direction except towards you."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "single-target",
                        "melee",
                        "forced movement"
                    ]
                },
                "Crippling Blow": {
                    "name": "Crippling Blow",
                    "class": "Warlord",
                    "description": [
                        "You aim for an enemy's legs as they attempt to escape. As a reaction to an enemy attempt to move out of your reach, deal 5d10 physical damage to them, reduce their move speed to 0 for the turn, and inflict Crippled."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "single-target",
                        "melee",
                        "crippled"
                    ]
                },
                "Advancing Fire": {
                    "name": "Advancing Fire",
                    "class": "Warlord",
                    "description": [
                        "You fire at an enemy as you approach. Deal 4d10 physical damage to a target in range. You may dash up to 15 ft towards the target if your attack does not miss."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "single-target",
                        "ranged",
                        "conditional",
                        "modal",
                        "dash"
                    ]
                },
                "Hookshot": {
                    "name": "Hookshot",
                    "class": "Warlord",
                    "description": [
                        "You fire at an enemy with a projectile and chain. Deal 5d10 physical damage to a target in range, then pull them 20 ft towards you."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "single-target",
                        "ranged",
                        "forced movement"
                    ]
                },
                "Stopping Shot": {
                    "name": "Stopping Shot",
                    "class": "Warlord",
                    "description": [
                        "You shoot an enemy with a heavy projectile designed to stop their progression. As a reaction to an enemy moving into range or moving towards you, deal 5d10 physical damage to that enemy, reduce their move speed to 0 for the turn, and inflict Crippled."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "single-target",
                        "ranged",
                        "forced movement"
                    ]
                },
                "Weapon Swap: Roll": {
                    "name": "Weapon Swap: Roll",
                    "class": "Warlord",
                    "description": [
                        "You roll while swapping weapons. Dash up to 20 ft in any direction, then you may swap weapons in both hands."
                    ],
                    "tags": [
                        "modal",
                        "dash"
                    ]
                },
                "Weapon Swap: Quaff": {
                    "name": "Weapon Swap: Quaff",
                    "class": "Warlord",
                    "description": [
                        "You quickly down a potion while swapping weapons. Quaff a potion from your inventory, then you may swap weapons in both hands."
                    ],
                    "tags": [
                        "modal"
                    ]
                },
                "Weapon Swap: Attack": {
                    "name": "Weapon Swap: Attack",
                    "class": "Warlord",
                    "description": [
                        "You swap weapons and make a quick attack. Swap weapons in both hands, then you may make an autoattack with each weapon currently equipped if applicable."
                    ],
                    "tags": [
                        "modal",
                        "attack",
                        "physical",
                        "melee",
                        "ranged",
                        "single-target"
                    ]
                }
            }
        },
        "Warper": {
            "type": "class",
            "name": "Warper",
            "description": "The Warper is an assassin that has augmented all of his techniques with magic. Instead of standard infiltration with lockpick and stealth, the Warper uses short range teleports to close gaps and move from shadow to shadow. Instead of the usual process of slitting throats and poisoning dinners, the Warper uses control magic to make their targets helpless. The Warper is all about the process of getting to your target and locking it down. It is an enabling class that allows you to execute on the fantasy of an assassin mage.",
            "passive": {
                "Opportunistic Predator": "When you make an attack against an enemy that is crowd controlled, gain 50% increased critical strike chance on that attack. This triggers at most only once per round."
            },
            "abilities": {
                "Quicksilver Dagger": {
                    "name": "Quicksilver Dagger",
                    "class": "Warper",
                    "description": [
                        "You slip your knife into the back of a weakened foe. Deal 5d4 + Xd4 physical damage to a target in range, where X is the number of crowd control conditions that target has."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "conditional",
                        "melee"
                    ]
                },
                "Sever Tendons": {
                    "name": "Sever Tendons",
                    "class": "Warper",
                    "description": [
                        "You slice low at the muscles of the leg in order to escape or prevent escape. Deal 6d4 physical damage to a target in range and inflict Crippled. You may then choose to dash 20 ft in any direction."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "melee",
                        "crowd control",
                        "cripple",
                        "modal",
                        "dash"
                    ]
                },
                "Hunter's Knife": {
                    "name": "Hunter's Knife",
                    "class": "Warper",
                    "description": [
                        "You throw your equipped dagger at your prey. Deal 6d4 physical damage to a target in range and mark them, then select one of the following effects:",
                        "<ul>",
                        "<li>The marked target loses 20% of its Condition Resist.</li>",
                        "<li>Your teleports to spaces next to the marked target cost half mana.</li>",
                        "</ul>"
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "ranged",
                        "stat loss",
                        "condition resist",
                        "cost reduction",
                        "mark",
                        "modal",
                        "conditional"
                    ]
                },
                "From Nowhere": {
                    "name": "From Nowhere",
                    "class": "Warper",
                    "description": [
                        "You become a spectre of sudden death. For 1 minute, you gain the following effects: When you teleport, you may cast an attack ability as a free action; Your attacks that deal more than 10% of an enemy's maximum health refresh the duration of their crowd control conditions; When you kill an enemy, you gain a special free reaction, allowing you to cast any teleport spell immediately without paying its costs."
                    ],
                    "tags": [
                        "buff",
                        "concentration",
                        "conditional",
                        "modal",
                        "teleport"
                    ]
                },
                "Controlled Blink": {
                    "name": "Controlled Blink",
                    "class": "Warper",
                    "description": [
                        "You teleport towards your prey. Teleport to a target empty space within range that you can see. You may cast this ability as a reaction to an enemy gaining a crowd control condition, but if you do, the target space you teleport to must be adjacent to that enemy."
                    ],
                    "tags": [
                        "spell",
                        "conjuration",
                        "teleport",
                        "conditional",
                        "modal"
                    ]
                },
                "Dispersal": {
                    "name": "Dispersal",
                    "class": "Warper",
                    "description": [
                        "You and your allies teleport randomly to escape. You and up to 4 target allies within range that you can see teleport 1000 ft in a random direction (corrected slightly to avoid barriers). You may target additional allies when you cast this ability, at a cost of an additional 5 mana per additional target."
                    ],
                    "tags": [
                        "spell",
                        "conjuration",
                        "multi-target",
                        "teleport",
                        "random",
                        "modal"
                    ]
                },
                "Teleport Other": {
                    "name": "Teleport Other",
                    "class": "Warper",
                    "description": [
                        "You forcibly teleport someone else to a new location. Fire a bolt of dispersed energy at a target within range (checks against Evasion) and teleport them to any empty location up to a distance of 400 ft (checks against Condition Resist). If the target is willing to be teleported, this spell costs half mana."
                    ],
                    "tags": [
                        "spell",
                        "conjuration",
                        "single-target",
                        "teleport",
                        "conditional",
                        "forced movement"
                    ]
                },
                "Malign Gateway": {
                    "name": "Malign Gateway",
                    "class": "Warper",
                    "description": [
                        "You create a temporary portal for you and your allies, guarded by magical lashing tentacles. Create 2 linked portals: one in an adjacent empty space and one in an empty space you can see in range. When you or an ally enters a portal's space, they are teleported to an empty space of their choice adjacent to the other linked portal. Enemies cannot enter spaces with portals, and enemies who begin or end their turn in a space adjacent to a portal take 5d10 physical damage.",
                        "<br>",
                        "Instead of casting this ability as a Major Action, you may instead choose to spend 10 minutes casting this spell as a minor ritual and expend an additional 40 mana. If you do, the duration of this ability is extended to 12 hours, and you may wait to place the second portal as a Major Action at any time during the ability's duration."
                    ],
                    "tags": [
                        "spell",
                        "conjuration",
                        "teleport",
                        "modal",
                        "physical",
                        "ritual"
                    ]
                },
                "Stunbolt": {
                    "name": "Stunbolt",
                    "class": "Warper",
                    "description": [
                        "You fire a pulse of mana to rattle an enemy's senses. A target entity within range becomes Stunned until the beginning of their next turn."
                    ],
                    "tags": [
                        "spell",
                        "control",
                        "stun",
                        "crowd control"
                    ]
                },
                "Ensorcelled Hibernation": {
                    "name": "Ensorcelled Hibernation",
                    "class": "Warper",
                    "description": [
                        "You put large crowds to sleep. All entities in a 20 ft cube, centered on a point in range, fall Asleep for the duration. Any entity that resists this Sleep becomes Stunned instead."
                    ],
                    "tags": [
                        "spell",
                        "control",
                        "sleep",
                        "stun",
                        "crowd control",
                        "aoe",
                        "cube"
                    ]
                },
                "Dazzling Spray": {
                    "name": "Dazzling Spray",
                    "class": "Warper",
                    "description": [
                        "You fire magical bolts designed to disorient. All entities in a 60 ft cone in front of you become Confused. You are considered Hidden from any entities Confused in this way."
                    ],
                    "tags": [
                        "spell",
                        "control",
                        "aoe",
                        "cone",
                        "confuse",
                        "hidden"
                    ]
                },
                "Fulminant Prism": {
                    "name": "Fulminant Prism",
                    "class": "Warper",
                    "description": [
                        "You capture an enemy in a magical prison. A target entity within range becomes captured by your magic and has their current position locked. While captured in this way, they cannot move, dash, teleport, planeswalk, or be displaced by any means. For the duration of this ability, teleport spells you cast can have their target destination be an empty space adjacent to the captured target instead."
                    ],
                    "tags": [
                        "spell",
                        "control",
                        "single-target",
                        "conjuration",
                        "condition",
                        "immobilize"
                    ]
                }
            }
        },
        "Warrior": {
            "type": "class",
            "name": "Warrior",
            "description": "The Warrior is by nature a specialist. On the outside, he appears to be a run of the mill fighter that you might expect to see as a city guardsman or a caravanserai. However, the Warrior has made the simple act of waging war into a carefully measured process. The Warrior efficiently slays masses of foes while protecting his squad; he fells giant beasts while holding a defensive line; he is a centerpiece of calm when the rest of the team panics during an ambush. The warrior has simple and effective options for single and multi-target attacks, straightforward defensive techniques, and special warcries that provide buffs or apply conditions to large groups.",
            "passive": {
                "Warleader": "You gain 25% increased physical damage for each buff active on you. On your turn, you may end any buff on you of your choice as a free action to empower an ally who can hear you, increasing their next attack's damage by 25%."
            },
            "abilities": {
                "Spill Blood": {
                    "name": "Spill Blood",
                    "class": "Warrior",
                    "description": [
                        "You hack at an enemy, severing blood vessels. Deal 4d10 physical damage to a target in range. Inflict a d10 Bleed on the target. This Bleed's damage is amplified by your passive."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "single-target",
                        "melee",
                        "condition",
                        "bleed"
                    ]
                },
                "Cut Down": {
                    "name": "Cut Down",
                    "class": "Warrior",
                    "description": [
                        "You deliver a wide slash to the enemy's frontlines, adjusting for their formation. Choose one of the following:",
                        "<ul>",
                        "<li>Deal 3d10 damage to all enemies in a 10 ft cone, knocking them prone</li>",
                        "<li>Deal 3d10 damage to all enemies in a 25 ft horizontal line, knocking them back 10 ft</li>",
                        "</ul>",
                        "If you have at least 3 buffs active on you, choose both options."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "melee",
                        "aoe",
                        "cone",
                        "horizontal line",
                        "knock prone",
                        "knock back",
                        "modal",
                        "conditional"
                    ]
                },
                "Hack and Slash": {
                    "name": "Hack and Slash",
                    "class": "Warrior",
                    "description": [
                        "You turn vigor into violence, attacking quickly. Deal 4d10 physical damage to a target in range. Then, you may sacrifice a buff on you to repeat this skill at no cost."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "single-target",
                        "melee",
                        "repeatable",
                        "sacrifice"
                    ]
                },
                "Summary Execution": {
                    "name": "Summary Execution",
                    "class": "Warrior",
                    "description": [
                        "You finish off weakened enemies. Deal 8d10 physical damage to all targets in range. This attack has lethality equal to each target's percentage of missing health (calculated after this ability's damage). You may sacrifice any number of buffs on you as you cast this ability to increase the base lethality of this attack by 10% per buff sacrificed this way."
                    ],
                    "tags": [
                        "attack",
                        "physical",
                        "multi-target",
                        "melee",
                        "sacrifice",
                        "lethality",
                        "missing health"
                    ]
                },
                "Shields Up": {
                    "name": "Shields Up",
                    "class": "Warrior",
                    "description": [
                        "You toss up your shield or armguard to defend against an attack. Block an attack on you or an adjacent ally, reducing damage by 25%. Gain an additional 25% damage reduction for each buff you have."
                    ],
                    "tags": [
                        "block",
                        "damage reduction",
                        "self-target",
                        "ally-target"
                    ]
                },
                "Reinforce Armor": {
                    "name": "Reinforce Armor",
                    "class": "Warrior",
                    "description": [
                        "You strengthen your armor's natural defenses. Sacrifice any number of buffs active on you. Gain 25% increased AC, Evasion, or MR for each buff sacrificed this way for 1 minute. Recasting this ability while its buff is active will end your previous buff and start a new one."
                    ],
                    "tags": [
                        "buff",
                        "concentration",
                        "sacrifice",
                        "increase ac",
                        "increase evasion",
                        "increase mr"
                    ]
                },
                "Take Cover": {
                    "name": "Take Cover",
                    "class": "Warrior",
                    "description": [
                        "You dive and roll to rescue a comrade from danger. As a reaction to an attack on an allied target in range, immediately dash to them before the attack lands. Then, choose one of the following:",
                        "<ul>",
                        "<li>Use your body as a shield. Your target gains 30 AC, and the attack will be redirected to both you and your target</li>",
                        "<li>Tackle your target to the ground. You and your target gain 30% evasion, and both of you are knocked prone</li>",
                        "<li>Drag them to safety. Dash an additional 20 ft in any direction, dragging your target with you, and your target loses their reaction if they still have one</li>",
                        "</ul>"
                    ],
                    "tags": [
                        "dash",
                        "ally-target",
                        "modal",
                        "redirect",
                        "knock prone",
                        "increase ac",
                        "increase evasion"
                    ]
                },
                "Paragon of Victory": {
                    "name": "Paragon of Victory",
                    "class": "Warrior",
                    "description": [
                        "You become a powerful avatar of war. When you cast this ability, sacrifice any number of buffs on you. Gain the following effects, depending on the number of buffs sacrificed.",
                        "<ul>",
                        "<li>5 Buffs - Gain immunity to physical damage</li>",
                        "<li>10 Buffs - Gain all of the above in addition to immunity to conditions and crowd control</li>",
                        "<li>15 Buffs - Gain all of the above in addition to 50 ft of added speed and 100% increased damage</li>",
                        "</ul>"
                    ],
                    "tags": [
                        "buff",
                        "concentration",
                        "sacrifice",
                        "immunity",
                        "add speed",
                        "increase damage",
                        "modal"
                    ]
                },
                "\"Charge!\"": {
                    "name": "\"Charge!\"",
                    "class": "Warrior",
                    "description": [
                        "You bellow a righteous cry, calling all to drive forward into battle. All allies who can hear you gain 50% increased damage until the end of your next turn. When you cast this ability, all other allies who can hear you may use their reaction to move up to their speed in any direction."
                    ],
                    "tags": [
                        "buff",
                        "multi-target",
                        "self-target",
                        "ally-target",
                        "damage increase"
                    ]
                },
                "\"Fight Me!\"": {
                    "name": "\"Fight Me!\"",
                    "class": "Warrior",
                    "description": [
                        "You bellow a belligerent cry, igniting your enemies' fury. All enemies who can hear you are Taunted for 1 minute. An enemy Taunted by this ability previously is Immune to this ability's Taunt. When you cast this ability, all enemies who can hear you break concentration."
                    ],
                    "tags": [
                        "condition",
                        "taunt",
                        "multi-target",
                        "break concentration"
                    ]
                },
                "\"Overcome!\"": {
                    "name": "\"Overcome!\"",
                    "class": "Warrior",
                    "description": [
                        "You bellow an inspiring cry, encouraging everyone to persist. All allies who can hear you are cleansed of Fear, Stun, Paralysis, Confusion, Sleep, and Charm. Other allies in a 1000 ft range who are in a downed state become immediately stabilized. When you cast this ability, all allies who can hear you may use their reaction to cleanse an additional condition on them of their choice."
                    ],
                    "tags": [
                        "cleanse",
                        "stabilize",
                        "multi-target",
                        "self-target",
                        "ally-target"
                    ]
                },
                "\"Kill them all!\"": {
                    "name": "\"Kill them all!\"",
                    "class": "Warrior",
                    "description": [
                        "You bellow a powerful cry, cowing your enemies and announcing their coming deaths. All enemies who can hear you gain 50% physical damage vulnerability, lose natural elemental resistances, and become Feared. When you cast this ability, all enemies who can hear you are stripped of all buffs, and those buffs are distributed as you choose amongst you and all allies who can hear you."
                    ],
                    "tags": [
                        "condition",
                        "multi-target",
                        "fear",
                        "vulnerability",
                        "buff stripping",
                        "buff"
                    ]
                }
            }
        }
    };


    function get_ability(class_name, ability_name) {
        assert_not_null(class_name, 'get_ability() class_name');
        assert_not_null(ability_name, 'get_ability() ability_name');

        if (!(class_name in classes)) {
            LOG.error('Class %s not found'.format(class_name));
            return null;
        }

        if (!(ability_name in classes[class_name]['abilities'])) {
            LOG.error('Ability %s not found in class %s'.format(ability_name, class_name));
            return null;
        }

        return classes[class_name]['abilities'][ability_name];
    }


    // ################################################################################################################
    // Rolls


    // Type of a roll can vary. For example, an attack made with a melee weapon will result in a "physical" roll.
    // An spell attack results in a "magic" roll. Certain effects should only be applied to certain rolls. For example,
    // bonus damage on a melee weapon should not be applied to magic-type rolls.
    //
    class RollType {
        static is_type(roll_type, expected_type) {
            return roll_type === expected_type || roll_type === RollType.ALL;
        }

        static is_physical(roll_type) {
            return this.is_type(roll_type, RollType.PHYSICAL);
        }

        static is_pyschic(roll_type) {
            return this.is_type(roll_type, RollType.PSYCHIC);
        }

        static is_magic(roll_type) {
            return this.is_type(roll_type, RollType.MAGIC);
        }

        static is_healing(roll_type) {
            return this.is_type(roll_type, RollType.HEALING);
        }
    }

    RollType.PHYSICAL = 'roll_type_physical';
    RollType.PSYCHIC = 'roll_type_psychic';
    RollType.MAGIC = 'roll_type_magic';
    RollType.HEALING = 'roll_type_healing';
    RollType.ALL = 'roll_type_all';


    function get_roll_type(type) {
        switch (type.toLowerCase()) {
            case 'physical': return RollType.PHYSICAL;
            case 'psychic': return RollType.PSYCHIC;
            case 'magic': return RollType.MAGIC;
            case 'healing': return RollType.HEALING;
            case 'all': return RollType.ALL;
            default: return null;
        }
    }


    function guess_applicable_roll_type_from_damage(damage_type) {
        if (damage_type === Damage.PHYSICAL) {
            return RollType.PHYSICAL;
        } else if (damage_type === Damage.PSYCHIC) {
            return RollType.PSYCHIC;
        } else if (damage_type === Damage.HEALING) {
            return RollType.HEALING;
        } else if (damage_type === Damage.ALL || damage_type === Damage.ALL_MAGIC) {
            return null;
        } else {
            return RollType.MAGIC;
        }
    }


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
            this._type = 'Roll';
            this.character = character;
            this.roll_type = roll_type;
            this.damages = {};
            this.multipliers = {};
            this.effects = [];

            this.stats = {};
            this.stat_multipliers = {};
            this.hidden_stats = {};

            this.condition_resists = {};
            this.magic_resists = {};

            this.skills = {};

            this.initiative_bonus = 0;
            this.concentration_bonus = 0;
            this.buff_effectiveness = 1;
            this.enchant_effectiveness = 1;
            this.combo_chance = 0;

            this.crit = false;
            this.crit_damage_mod = 2;
            this.should_apply_crit = (roll_type === RollType.PHYSICAL || roll_type === RollType.ALL);

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
            this.effects.push(effect);
        }

        add_stat_bonus(stat, bonus) {
            assert_not_null(stat, 'add_stat_bonus() stat');
            assert_not_null(bonus, 'add_stat_bonus() bonus');

            if (!(stat.name in this.stats)) {
                this.stats[stat.name] = '%s'.format(bonus);
            } else {
                this.stats[stat.name] = '%s+%s'.format(this.stats[stat.name], bonus);
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

        add_condition_resist(condition, value) {
            assert_not_null(condition, 'add_condition_resist() condition');
            assert_not_null(value, 'add_condition_resist() value');

            if (!(condition in this.condition_resists)) {
                this.condition_resists[condition] = value;
            } else {
                this.condition_resists[condition] += value;
            }
        }

        add_magic_resist(type, value) {
            assert_not_null(type, 'add_magic_resist() type');
            assert_not_null(value, 'add_magic_resist() value');

            if (!(type in this.magic_resists)) {
                this.magic_resists[type] = value;
            } else {
                this.magic_resists[type] += value;
            }
        }

        add_initiative_bonus(bonus) {
            this.initiative_bonus += bonus;
        }

        add_concentration_bonus(bonus) {
            this.concentration_bonus += bonus;
        }

        add_buff_effectiveness(bonus) {
            this.buff_effectiveness += bonus / 100;
        }

        add_enchant_effectiveness(bonus) {
            this.enchant_effectiveness += bonus / 100;
        }

        add_combo_chance(bonus) {
            this.combo_chance += bonus;
        }

        add_skill_bonus(skill, bonus) {
            if (!(skill.name in this.skills)) {
                this.skills[skill.name] = '%s'.format(bonus);
            } else {
                this.skills[skill.name] = '%s+%s'.format(this.skills[skill.name], bonus);
            }
        }

        // "amount" should be passed in as a regular number, e.g. pass "10" for a 10% increase
        add_crit_damage_mod(amount) {
            this.crit_damage_mod += amount / 100;
        }

        dump_multipliers() {
            const keys = Object.keys(this.multipliers);
            for (let i = 0; i < keys.length; i++) {
                const type = keys[i];
                const keys_2 = Object.keys(this.multipliers[type]);
                for (let j = 0; j < keys_2.length; j++) {
                    const source = keys_2[j];
                    LOG.info('Multiplier[type=%s, source=%s, string=%s]'.format(type, source,
                                                                                this.multipliers[type][source]));
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
            this.should_apply_crit = other_roll.should_apply_crit;
        }

        copy_effects(other_roll) {
            for (let i = 0; i < other_roll.effects.length; i++) {
                const effect = other_roll.effects[i];
                // Using direct access because roll.add_effect() turns the effect into an HTML list item, which we
                // don't want to do twice.
                this.effects.push(effect);
            }
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

            if (is_magic_damage_type(type) && Damage.ALL_MAGIC in self.multipliers) {
                Object.keys(self.multipliers[Damage.ALL_MAGIC]).forEach(function (source) {
                    if (!(source in per_source_multipliers)) {
                        per_source_multipliers[source] = [];
                    }

                    per_source_multipliers[source].push(self.multipliers[Damage.ALL_MAGIC][source]);
                });
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
                        const count = parse_int(dmg_piece.split('d')[0]);
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

        get_crit_chance() {
            let final_crit_chance = this.character.get_stat(Stat.CRITICAL_HIT_CHANCE);

            // Crit chance may be upped by items. Add in that amount.
            if (Stat.CRITICAL_HIT_CHANCE.name in this.stats) {
                const crit_chance_string = this.stats[Stat.CRITICAL_HIT_CHANCE.name];
                assert_numeric(crit_chance_string, 'Crit chance "%s" is non-numeric', crit_chance_string)
                final_crit_chance += eval(crit_chance_string);
            }

            assert(!(Stat.CRITICAL_HIT_CHANCE.name in this.stat_multipliers),
                   'Crit chance stat multiplier is not supported');

            return Math.round(final_crit_chance);
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

                if (self.should_apply_crit && self.crit) {
                    dmg_str = '(%s)*%s'.format(dmg_str, self.crit_damage_mod);
                }

                rolls[type] = 'round(%s)'.format(dmg_str);
            });

            return rolls;
        }
    }


    // ################################################################################################################
    // Items


    const ItemType = {
        UNKNOWN: 'unknown',

        ACCESSORY: 'accessory',
        AXE: 'axe',
        ARMOR: 'armor',
        BLUNT: 'blunt',
        BOW: 'bow',
        BULLETS: 'bullets',
        CROSSBOW: 'crossbow',
        FINE: 'fine',
        HEAVY_THROWING: 'heavy throwing',
        LIGHT_THROWING: 'light throwing',
        LONGBLADE: 'longblade',
        ORB: 'orb',
        POLEARM: 'polearm',
        SHIELD: 'shield',
        SHORTBLADE: 'shortblade',
        STAFF: 'staff',
        UNARMED: 'unarmed',
        WAND: 'wand',
    };

    const ITEM_TYPE_KEYWORDS = {
        // Heck slot
        'amulet': ItemType.ACCESSORY,
        'periapt': ItemType.ACCESSORY,
        'brooch': ItemType.ACCESSORY,
        'necklace': ItemType.ACCESSORY,
        'choker': ItemType.ACCESSORY,
        // Ring slot
        'ring': ItemType.ACCESSORY,
        'band': ItemType.ACCESSORY,
        // Belt slot
        'belt': ItemType.ACCESSORY,
        'sash': ItemType.ACCESSORY,
        'buckle': ItemType.ACCESSORY,
        // Chest slot
        'robes': ItemType.ARMOR,
        'shirt': ItemType.ARMOR,
        'jacket': ItemType.ARMOR,
        'vest': ItemType.ARMOR,
        'steelplate': ItemType.ARMOR,
        'chestplate': ItemType.ARMOR,
        'breastplate': ItemType.ARMOR,
        'coat': ItemType.ARMOR,
        'longcoat': ItemType.ARMOR,
        // Feet slot
        'shoes': ItemType.ARMOR,
        'slippers': ItemType.ARMOR,
        'sneakers': ItemType.ARMOR,
        'greaves': ItemType.ARMOR,
        'boots': ItemType.ARMOR,
        'sandals': ItemType.ARMOR,
        // Hand slot
        'mittens': ItemType.ARMOR,
        'gloves': ItemType.ARMOR,
        'mitts': ItemType.ARMOR,
        'gauntlets': ItemType.ARMOR,
        'bracelets': ItemType.ARMOR,
        // Head slot
        'hood': ItemType.ARMOR,
        'shawl': ItemType.ARMOR,
        'helmet': ItemType.ARMOR,
        'helm': ItemType.ARMOR,
        'halfhelm': ItemType.ARMOR,
        'greathelm': ItemType.ARMOR,
        'hardhard': ItemType.ARMOR,
        'skullcap': ItemType.ARMOR,
        'hat': ItemType.ARMOR,
        'headband': ItemType.ARMOR,
        'cap': ItemType.ARMOR,
        // Weapons
        'axe': ItemType.AXE,
        'scythe': ItemType.AXE,
        'warhammer': ItemType.BLUNT,
        'shortbow': ItemType.BOW,
        'longbow': ItemType.BOW,
        'bullets': ItemType.BULLETS,
        'crossbow': ItemType.CROSSBOW,
        'rapier': ItemType.FINE,
        'foil': ItemType.FINE,
        'saber': ItemType.FINE,
        'javelin': ItemType.HEAVY_THROWING,
        'net': ItemType.HEAVY_THROWING,
        'bola': ItemType.LIGHT_THROWING,
        'blade': ItemType.LONGBLADE,
        'greatsword': ItemType.LONGBLADE,
        'sword': ItemType.LONGBLADE,
        'scimitar': ItemType.LONGBLADE,
        'longsword': ItemType.LONGBLADE,
        'sakabato': ItemType.LONGBLADE,
        'orb': ItemType.ORB,
        'halbred': ItemType.POLEARM,
        'spear': ItemType.POLEARM,
        'lance': ItemType.POLEARM,
        'shield': ItemType.SHIELD,
        'bladeshield': ItemType.SHIELD,
        'spikeshield': ItemType.SHIELD,
        'dagger': ItemType.SHORTBLADE,
        'swordbreaker': ItemType.SHORTBLADE,
        'knife': ItemType.SHORTBLADE,
        'shortsword': ItemType.SHORTBLADE,
        'quickblade': ItemType.SHORTBLADE,
        'longknife': ItemType.SHORTBLADE,
        'stilleto': ItemType.SHORTBLADE,
        'kukri': ItemType.SHORTBLADE,
        'kris': ItemType.SHORTBLADE,
        'staff': ItemType.STAFF,
        'knuckles': ItemType.UNARMED,
        'wand': ItemType.WAND,
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


    class ItemScaler {
        constructor(stat, handler) {
            assert_not_null(handler, 'ItemScaler::new() handler');

            this._type = 'ItemScaler';
            this.stat = stat;
            this.handler = handler;
        }
    }

    ItemScaler.MELEE = new ItemScaler(Stat.MELEE_DAMAGE, function (character, roll) {
        assert_not_null(character, 'ItemScaler::MELEE character');
        assert_not_null(roll, 'ItemScaler::MELEE roll');

        roll.add_damage(character.get_stat(Stat.MELEE_DAMAGE), Damage.PHYSICAL);
    });

    ItemScaler.RANGED_FINE = new ItemScaler(Stat.RANGED_FINE_DAMAGE, function (character, roll) {
        assert_not_null(character, 'ItemScaler::RANGED_FINE character');
        assert_not_null(roll, 'ItemScaler::RANGED_FINE roll');

        roll.add_damage(character.get_stat(Stat.RANGED_FINE_DAMAGE), Damage.PHYSICAL);
    });

    // This one has to be called with a parameter to create the function
    ItemScaler.OTHER = function(stat, damage_type) {
        assert_not_null(stat, 'ItemScaler::OTHER stat');
        assert_not_null(damage_type, 'ItemScaler::OTHER damage_type');

        return new ItemScaler(stat, function (character, roll) {
            assert_not_null(character, 'ItemScaler::OTHER character');
            assert_not_null(roll, 'ItemScaler::OTHER roll');

            roll.add_damage(character.get_stat(stat), damage_type);
        });
    };

    ItemScaler.NONE = new ItemScaler(null, function() {});


    class Effect {
        constructor(roll_time, roll_type, effect) {
            this._type = 'Effect';
            this.roll_time = roll_time;
            this.roll_type = roll_type;
            this.apply = effect;
        }

        static no_op_roll_effect() {
            return new Effect(RollTime.DEFAULT, RollType.ALL, function () {});
        }

        static stat_effect(stat, mod, applicable_roll_type) {
            assert_not_null(stat, 'stat_effect() stat');
            assert_not_null(mod, 'stat_effect() mod');
            assert_not_null(applicable_roll_type, 'stat_effect() applicable_roll_type');

            return new Effect(RollTime.DEFAULT, applicable_roll_type, function (roll) {
                if (RollType.is_type(applicable_roll_type, roll.roll_type)) {
                    roll.add_stat_bonus(stat, mod);
                }
            });
        }

        static hidden_stat(hidden_stat, value, applicable_roll_type) {
            assert_not_null(value, 'hidden_stat() value');
            assert_not_null(hidden_stat, 'hidden_stat() stat');
            assert_not_null(applicable_roll_type, 'hidden_stat() applicable_roll_type');

            return new Effect(RollTime.DEFAULT, applicable_roll_type, function (roll) {
                if (RollType.is_type(applicable_roll_type, roll.roll_type)) {
                    roll.add_hidden_stat(hidden_stat, value);
                }
            });
        }

        static condition_resist(condition, value) {
            assert_not_null(condition, 'condition_resist() condition');
            assert_not_null(value, 'condition_resist() value');

            return new Effect(RollTime.DEFAULT, RollType.ALL, function (roll) {
                roll.add_condition_resist(condition.toLowerCase().replace(/[()]/g, ''), value);
            });
        }

        static magic_resist(type, value) {
            assert_not_null(type, 'magic_resist() type');
            assert_not_null(value, 'magic_resist() value');

            return new Effect(RollTime.DEFAULT, RollType.ALL, function (roll) {
                roll.add_magic_resist(type, value);
            });
        }

        static skill_effect(skill, mod) {
            assert_not_null(skill, 'skill_effect() skill');
            assert_not_null(mod, 'skill_effect() mod');

            return new Effect(RollTime.DEFAULT, RollType.ALL, function (roll) {
                roll.add_skill_bonus(skill, mod);
            });
        }

        static initiative_bonus(bonus) {
            assert_not_null(bonus, 'initiative_bonus() bonus');

            return new Effect(RollTime.DEFAULT, RollType.ALL, function (roll) {
                roll.add_initiative_bonus(bonus);
            });
        }

        static concentration_bonus(bonus) {
            assert_not_null(bonus, 'concentration_bonus() bonus');

            return new Effect(RollTime.DEFAULT, RollType.ALL, function (roll) {
                roll.add_concentration_bonus(bonus);
            });
        }

        static buff_effectiveness(bonus) {
            assert_not_null(bonus, 'buff_effectiveness() bonus');

            return new Effect(RollTime.DEFAULT, RollType.ALL, function (roll) {
                roll.add_buff_effectiveness(bonus);
            });
        }

        static enchant_effectiveness(bonus) {
            assert_not_null(bonus, 'enchant_effectiveness() bonus');

            return new Effect(RollTime.DEFAULT, RollType.ALL, function (roll) {
                roll.add_enchant_effectiveness(bonus);
            });
        }

        static combo_chance(bonus) {
            assert_not_null(bonus, 'combo_chance() bonus');

            return new Effect(RollTime.DEFAULT, RollType.ALL, function (roll) {
                roll.add_combo_chance(bonus);
            });
        }

        static roll_damage(dmg, dmg_type, applicable_roll_type) {
            assert_not_null(dmg, 'roll_damage(), dmg');
            assert_not_null(dmg_type, 'roll_damage(), dmg_type');
            assert_not_null(applicable_roll_type, 'roll_damage(), applicable_roll_type');

            return new Effect(RollTime.DEFAULT, applicable_roll_type, function (roll) {
                if (RollType.is_type(applicable_roll_type, roll.roll_type)) {
                    if (/[Uu]/.test(dmg)) {
                        const monk_mastery = roll.character.get_monk_dice();
                        dmg = dmg.replace(/[Uu]/g, monk_mastery);
                    }

                    roll.add_damage(dmg, dmg_type);
                }
            });
        }

        static roll_multiplier(value, dmg_type, applicable_roll_type) {
            assert_not_null(value, 'roll_multiplier() value');
            assert_not_null(dmg_type, 'roll_multiplier() dmg_type');
            assert_not_null(applicable_roll_type, 'roll_multiplier() applicable_roll_type');

            return new Effect(RollTime.DEFAULT, applicable_roll_type, function (roll) {
                if (RollType.is_type(applicable_roll_type, roll.roll_type)) {
                    roll.add_multiplier(value, dmg_type, 'self');
                }
            });
        }

        static roll_effect(effect, applicable_roll_type) {
            assert_not_null(effect, 'roll_effect() effect');
            assert_not_null(applicable_roll_type, 'roll_effect() applicable_roll_type');

            return new Effect(RollTime.DEFAULT, applicable_roll_type, function (roll) {
                if (RollType.is_type(applicable_roll_type, roll.roll_type)) {
                    roll.add_effect(effect);
                }
            });
        }

        static crit_hidden_stat(hidden_stat, value, applicable_roll_type) {
            assert_not_null(value, 'crit_hidden_stat() value');
            assert_not_null(hidden_stat, 'crit_hidden_stat() stat');
            assert_not_null(applicable_roll_type, 'crit_hidden_stat() applicable_roll_type');

            return new Effect(RollTime.POST_CRIT, applicable_roll_type, function (roll) {
                if (RollType.is_type(applicable_roll_type, roll.roll_type)) {
                    if (roll.should_apply_crit && roll.crit) {
                        roll.add_hidden_stat(hidden_stat, value);
                    }
                }
            });
        }

        static crit_damage(dmg, dmg_type, applicable_roll_type) {
            assert_not_null(dmg, 'crit_damage() dmg');
            assert_not_null(dmg_type, 'crit_damage() dmg_type');
            assert_not_null(applicable_roll_type, 'crit_damage() applicable_roll_type');

            return new Effect(RollTime.POST_CRIT, applicable_roll_type, function (roll) {
                if (RollType.is_type(applicable_roll_type, roll.roll_type)) {
                    if (roll.should_apply_crit && roll.crit) {
                        roll.add_damage(dmg, dmg_type);
                    }
                }
            });
        }

        static crit_multiplier(value, dmg_type, applicable_roll_type) {
            assert_not_null(value, 'crit_multiplier() value');
            assert_not_null(dmg_type, 'crit_multiplier() dmg_type');
            assert_not_null(applicable_roll_type, 'crit_multiplier() applicable_roll_type');

            return new Effect(RollTime.POST_CRIT, applicable_roll_type, function (roll) {
                if (RollType.is_type(applicable_roll_type, roll.roll_type)) {
                    if (roll.should_apply_crit && roll.crit) {
                        roll.add_multiplier(value, dmg_type, 'self');
                    }
                }
            });
        }

        static crit_effect(effect, applicable_roll_type) {
            assert_not_null(effect, 'crit_effect() effect');
            assert_not_null(applicable_roll_type, 'crit_effect() applicable_roll_type');

            return new Effect(RollTime.POST_CRIT, applicable_roll_type, function (roll) {
                if (RollType.is_type(applicable_roll_type, roll.roll_type)) {
                    if (roll.should_apply_crit && roll.crit) {
                        roll.add_effect(effect);
                    }
                }
            });
        }

        static crit_damage_mod(amount, applicable_roll_type) {
            assert_not_null(amount, 'crit_damage_mod() amount');
            assert_not_null(applicable_roll_type, 'crit_damage_mod() applicable_roll_type');

            return new Effect(RollTime.DEFAULT, RollType.PHYSICAL, function (roll) {
                if (RollType.is_type(applicable_roll_type, roll.roll_type)) {
                    roll.add_crit_damage_mod(amount);
                }
            });
        }
    }


    const AFFIX_CONSTRUCTORS = {
        'initiative': function(self, item_name, part) {
            return self.irregular_stat_affix(item_name, part, 'initiative', Effect.initiative_bonus);
        },
        'concentration': function(self, item_name, part) {
            return self.irregular_stat_affix(item_name, part, 'concentration', Effect.concentration_bonus);
        },
        'buff effectiveness': function(self, item_name, part) {
            return self.irregular_stat_affix(item_name, part, 'buff effectiveness', Effect.buff_effectiveness);
        },
        'enchant effectiveness': function(self, item_name, part) {
            return self.irregular_stat_affix(item_name, part, 'enchant effectiveness', Effect.enchant_effectiveness);
        },
        'combo chance': function(self, item_name, part) {
            return self.irregular_stat_affix(item_name, part, 'combo chance', Effect.combo_chance);
        },
        'damage': function(self, item_name, part) {
            return self.damage_affix(item_name, part, Effect.roll_damage);
        },
        'multiplier': function(self, item_name, part) {
            return self.multiplier_affix(item_name, part, Effect.roll_multiplier);
        },
        'effect': function(self, item_name, part, original_part) {
            return self.effect_affix(item_name, original_part, Effect.roll_effect);
        },
        'crit damage': function(self, item_name, part) {
            return self.damage_affix(item_name, part, Effect.crit_damage);
        },
        'crit multiplier': function(self, item_name, part) {
            return self.multiplier_affix(item_name, part, Effect.crit_multiplier);
        },
        'crit effect': function(self, item_name, part, original_part) {
            return self.effect_affix(item_name, original_part, Effect.crit_effect);
        },
        'crit damage mod': function(self, item_name, part) {
            return self.crit_damage_mod_affix(item_name, part);
        },
    }

    // Add stat bonus definitions to affix constructors
    Object.keys(Stat).forEach(function (key) {
        const stat = Stat[key];
        AFFIX_CONSTRUCTORS[stat.name.toLowerCase().replace(/_/g, ' ') + ':'] = function (self, item_name, part) {
            return self.stat_affix(item_name, part, stat, Effect.stat_effect);
        }
    });

    // Add stat acronyms to affix constructors
    Object.keys(STAT_ACROS).forEach(function (acronym) {
        AFFIX_CONSTRUCTORS[acronym] = function(self, item_name, part) {
            return self.stat_affix(item_name, part, STAT_ACROS[acronym], Effect.stat_effect);
        }
    });

    // Add hidden stats and crit hidden stats to affix constructors
    Object.keys(HIDDEN_STAT_ACROS).forEach(function (acronym) {
        AFFIX_CONSTRUCTORS[acronym] = function(self, item_name, part) {
            return self.stat_affix(item_name, part, HIDDEN_STAT_ACROS[acronym], Effect.hidden_stat);
        }

        AFFIX_CONSTRUCTORS['crit ' + acronym] = function(self, item_name, part) {
            return self.stat_affix(item_name, part, HIDDEN_STAT_ACROS[acronym], Effect.crit_hidden_stat);
        }
    });

    // Add skill bonus definitions to affix constructors
    Object.keys(Skill).forEach(function (key) {
        const skill = Skill[key];
        AFFIX_CONSTRUCTORS[skill.name.toLowerCase()] = function(self, item_name, part) {
            return self.skill_affix(item_name, part, function(bonus) {
                return Effect.skill_effect(skill, bonus);
            });
        };
    });

    // Add element-specific magic resistances
    Object.keys(ElementalDamage).forEach(function (key) {
        const type = ElementalDamage[key];
        const handler = function(self, item_name, part) {
            return self.magic_resist_affix(item_name, part, type);
        };
        AFFIX_CONSTRUCTORS[type + ' mr'] = handler;
        AFFIX_CONSTRUCTORS[type + ' magic resist'] = handler;
    });

    // Add condition-specific resistances
    conditions.forEach(function (condition) {
        condition = condition.toLowerCase().replace(/[()]/g, '');
        const handler = function (self, item_name, part) {
            return self.condition_resist_affix(item_name, part, condition);
        };
        AFFIX_CONSTRUCTORS[condition + ' cr'] = handler;
        AFFIX_CONSTRUCTORS[condition + ' condition resist'] = handler;
    });


    class Item {
        constructor(name, type, slot, base_damage, damage_scaling, effects) {
            assert_not_null(name, 'Item::new() name');
            assert_not_null(type, 'Item::new() type ' + name);
            assert_not_null(slot, 'Item::new() slot ' + name);
            assert_not_null(base_damage, 'Item::new() base_damage ' + name);
            assert_type(damage_scaling, 'ItemScaler', 'Item::new() damage_scaling ' + name);
            assert_not_null(effects, 'Item::new() effects ' + name);

            this._type = 'Item';
            this.name = name;
            this.type = type;
            this.slot = slot;
            this.base_damage = base_damage;
            this.damage_scaling = damage_scaling;
            this.effects = effects;
        }

        static construct_item(item_string, slot) {
            assert_not_null(item_string, 'construct_item() item_string');
            assert_not_null(slot, 'construct_item() slot');

            if (item_string === '' || slot === '') {
                return null;
            }

            let parts = item_string.split(';');
            parts = trim_all(parts);
            parts = remove_empty(parts);

            const item_name = parts[0];
            parts = parts.slice(1);

            let item_type = ItemType.UNKNOWN;
            let base_damage = Effect.no_op_roll_effect();
            let scaler = ItemScaler.NONE;
            let effects = [];

            // Order of these keys matters. Handle longer keys first because some keys start with the same
            // strings (e.g. crit damage and crit damage mod)
            const affix_keys = Object.keys(AFFIX_CONSTRUCTORS).sort(function(a, b) {
                return b.length - a.length;
            });

            for (let i = 0; i < parts.length; i++) {
                LOG.debug('construct_item(), handling part ' + parts[i]);
                const original_part = parts[i];
                const part = parts[i].toLowerCase().replace(/[()]/g, '');

                // Check for base damage definition
                if (part.startsWith('base')) {
                    let pieces = part.split(':');
                    if (pieces.length !== 2) {
                        LOG.error('In item "%s", in base damage "%s", expected one colon'.format(item_name, part));
                        continue;
                    }

                    pieces = pieces[1].trim().split(' ');
                    if (pieces.length !== 3) {
                        LOG.error('In item "%s", in base damage "%s", expected three space-separated pieces ' +
                                      'after colon'.format(item_name, part));
                        continue;
                    }

                    const damage = pieces[0];
                    const damage_type = get_damage_from_type(pieces[1]);
                    if (damage_type === null) {
                        LOG.error('In item "%s", in base damage "%s", unrecognized damage type %s'.format(
                            item_name, part, pieces[1]));
                        continue;
                    }

                    const roll_type = guess_applicable_roll_type_from_damage(damage_type);
                    if (roll_type === null) {
                        LOG.error('In item "%s", in base damage "%s", damage type should not be "all_magic" ' +
                                      'or "all"'.format(item_name, part));
                        continue;
                    }

                    base_damage = Effect.roll_damage(damage, damage_type, roll_type);

                    if (pieces[2] === 'none') {
                        scaler = ItemScaler.NONE;
                    } else {
                        const scaling_stat = get_stat_for_attribute(pieces[2]);
                        if (scaling_stat === null) {
                            LOG.error('In item "%s", in base damage "%s", unrecognized attribute acronym "%s"'.format(
                                item_name, part, pieces[2]));
                            continue;
                        }

                        scaler = ItemScaler.OTHER(scaling_stat, damage_type);
                    }
                    LOG.trace('construct_item(), handled base damage part');
                    continue;

                } else if (part.startsWith('type')) {

                    let pieces = part.split(':');
                    if (pieces.length !== 2) {
                        LOG.error('In item "%s", in item type "%s", expected one colon'.format(item_name, part));
                        continue;
                    }

                    const given_string = pieces[1].trim();
                    let temp_item_type = null;
                    const item_types = Object.keys(ItemType);
                    for (let j = 0; j < item_types.length; j++) {
                        if (ItemType[item_types[j]].toLowerCase() === given_string) {
                            temp_item_type = ItemType[item_types[j]];
                        }
                    }

                    if (temp_item_type === null) {
                       LOG.error('In item "%s", in item type "%s", unrecognized type %s'.format(
                           item_name, part, given_string));
                       continue;
                    }

                    item_type = temp_item_type;
                    LOG.trace('construct_item(), handled item type part');
                    continue;
                }

                let identified_part = false;
                for (let j = 0; j < affix_keys.length; j++) {
                    const affix_key = affix_keys[j];
                    const affix_constructor = AFFIX_CONSTRUCTORS[affix_key];
                    if (part.startsWith(affix_key)) {
                        identified_part = true;

                        const effect = affix_constructor(this, item_name, part, original_part);
                        if (effect !== null) {
                            LOG.trace('construct_item(), handled "%s" part on item %s'.format(affix_key, item_name));
                            effects.push(effect);
                            break;
                        }
                    }
                }

                if (!identified_part) {
                    LOG.error('In item "%s", no known handler for affix "%s"'.format(item_name, part));
                }
            }

            // If the item type wasn't specified, take a guess based on a bunch of common keywords
            if (item_type === ItemType.UNKNOWN) {
                const name_parts = item_name.toLowerCase().split(' ');
                const keys = Object.keys(ITEM_TYPE_KEYWORDS);
                for (let i = 0; i < keys.length; i++) {
                    const key = keys[i];
                    if (name_parts.includes(key)) {
                        item_type = ITEM_TYPE_KEYWORDS[key];
                        break;
                    }
                }
            }
            if (item_type === ItemType.UNKNOWN) {
                LOG.warn('In item "%s", failed to guess the type'.format(item_name));
            }

            const item = new Item(item_name, item_type, slot, base_damage, scaler, effects);
            LOG.debug('Constructed item, name=%s, type=%s, slot=%s'.format(item.name, item.type, item.slot));
            return item;
        }

        static irregular_stat_affix(item_name, part, stat_name, create_effect) {
            assert_not_null(item_name, 'irregular_stat_affix() item_name');
            assert_not_null(part, 'irregular_stat_affix() part');
            assert_not_null(stat_name, 'irregular_stat_affix() stat_name');
            assert_not_null(create_effect, 'irregular_stat_affix() create_effect');

            const pieces = part.split(':');
            if (pieces.length !== 2) {
                LOG.error('In item "%s", in affix "%s", expected one colon'.format(item_name, part));
                return null;
            }

            const bonus = parse_int(pieces[1].trim());
            if (Number.isNaN(bonus)) {
                LOG.error('In item "%s", in affix "%s", value %s is not a number'.format(item_name, part, pieces[1]));
                return null;
            }

            LOG.trace('construct_item(), handled %s part'.format(stat_name));
            return create_effect(bonus);
        }

        static skill_affix(item_name, part, create_effect) {
            assert_not_null(item_name, 'skill_affix() item_name');
            assert_not_null(part, 'skill_affix() part');
            assert_not_null(create_effect, 'skill_affix() create_effect');

            const pieces = part.split(':');
            if (pieces.length !== 3) {
                LOG.error('In item "%s", in affix "%s", expected two colons'.format(item_name, part));
                return null;
            }

            const bonus = pieces.slice(-1)[0];
            return create_effect(bonus);
        }

        static damage_affix(item_name, part, create_effect) {
            assert_not_null(item_name, 'damage_affix() item_name');
            assert_not_null(part, 'damage_affix() part');
            assert_not_null(create_effect, 'damage_affix() create_effect');

            let pieces = part.split(':');
            if (pieces.length !== 2) {
                LOG.error('In item "%s", in affix "%s", expected one colon'.format(item_name, part));
                return null;
            }

            pieces = pieces[1].trim().split(' ');
            if (pieces.length !== 3) {
                LOG.error('In item "%s", in affix "%s", expected three space-separated pieces after colon'.format(
                    item_name, part));
                return null;
            }

            const damage = pieces[0];
            const damage_type = get_damage_from_type(pieces[1]);
            if (damage_type === null) {
                LOG.error('In item "%s", in affix "%s", unrecognized damage type %s'.format(
                    item_name, part, pieces[1]));
                return null;
            }

            const roll_type = get_roll_type(pieces[2]);
            if (roll_type === null) {
                LOG.error('In item "%s", in affix "%s", unrecognized roll type %s'.format(item_name, part, pieces[2]));
                return null;
            }

            return create_effect(damage, damage_type, roll_type);
        }

        static multiplier_affix(item_name, part, create_effect) {
            assert_not_null(item_name, 'multiplier_affix() item_name');
            assert_not_null(part, 'multiplier_affix() part');
            assert_not_null(create_effect, 'multiplier_affix() create_effect');

            let pieces = part.split(':');
            if (pieces.length !== 2) {
                LOG.error('In item "%s", in affix "%s", expected one colon'.format(item_name, part));
                return null;
            }

            pieces = pieces[1].trim().split(' ');
            if (pieces.length !== 3) {
                LOG.error('In item "%s", in affix "%s", expected three space-separated pieces after colon'.format(
                    item_name, part));
                return null;
            }

            const value = parse_int(trim_percent(pieces[0])) / 100;
            if (Number.isNaN(value)) {
                LOG.error('In item "%s", in affix "%s", value %s is not a number'.format(item_name, part, pieces[1]));
                return null;
            }

            const damage_type = get_damage_from_type(pieces[1]);
            if (damage_type === null) {
                LOG.error('In item "%s", in affix "%s", unrecognized multiplier damage type %s'.format(
                    item_name, part, pieces[1]));
                return null;
            }

            const roll_type = get_roll_type(pieces[2]);
            if (roll_type === null) {
                LOG.error('In item "%s", in affix "%s", unrecognized roll type %s'.format(item_name, part, pieces[2]));
                return null;
            }

            return create_effect(value, damage_type, roll_type);
        }

        static crit_damage_mod_affix(item_name, part) {
            assert_not_null(item_name, 'crit_damage_mod_affix() item_name');
            assert_not_null(part, 'crit_damage_mod_affix() part');

            let pieces = part.split(':');
            if (pieces.length !== 2) {
                LOG.error('In item "%s", in affix "%s", expected one colon'.format(item_name, part));
                return null;
            }

            pieces = pieces[1].trim().split(' ');
            if (pieces.length !== 2) {
                LOG.error('In item "%s", in affix "%s", expected two space-separated pieces after colon'.format(
                    item_name, part));
                return null;
            }

            let value = parse_int(trim_percent(pieces[0]));
            if (Number.isNaN(value)) {
                LOG.error('In item "%s", in affix "%s", value %s is not a number'.format(item_name, part, pieces[1]));
                return null;
            }

            const roll_type = get_roll_type(pieces[1]);
            if (roll_type === null) {
                LOG.error('In item "%s", in affix "%s", unrecognized roll type %s'.format(item_name, part, pieces[1]));
                return null;
            }

            return Effect.crit_damage_mod(value, roll_type);
        }

        static stat_affix(item_name, part, stat, create_effect) {
            assert_not_null(item_name, 'stat_affix() item_name');
            assert_not_null(part, 'stat_affix() part');
            assert_not_null(stat, 'stat_affix() stat');
            assert_not_null(create_effect, 'stat_affix() create_effect');

            let pieces = part.split(':');
            if (pieces.length !== 2) {
                LOG.error('In item "%s", in affix "%s", expected one colon'.format(item_name, part));
                return null;
            }

            pieces = pieces[1].trim().split(' ');
            if (pieces.length !== 2) {
                LOG.error('In item "%s", in affix "%s", expected two space-separated pieces after colon'.format(
                    item_name, part));
                return null;
            }

            const bonus = parse_int(trim_percent(pieces[0]));
            if (Number.isNaN(bonus)) {
                LOG.error('In item "%s", in affix "%s", value %s is not a number'.format(item_name, part, pieces[0]));
                return null;
            }

            const roll_type = get_roll_type(pieces[1]);
            if (roll_type === null) {
                LOG.error('In item "%s", in affix "%s", unrecognized roll type %s'.format(item_name, part, pieces[1]));
                return null;
            }

            return create_effect(stat, bonus, roll_type);
        }

        static effect_affix(item_name, part, create_effect) {
            assert_not_null(item_name, 'effect_affix() item_name');
            assert_not_null(part, 'effect_affix() part');
            assert_not_null(create_effect, 'effect_affix() create_effect');

            let pieces = part.split(':');
            if (pieces.length !== 2) {
                LOG.error('In item "%s", in affix "%s", expected one colon'.format(item_name, part));
                return null;
            }

            pieces = pieces[1].trim().split(' ');
            const effect_text = pieces.slice(0, pieces.length - 1).join(' ');
            const roll_type = get_roll_type(pieces.slice(-1)[0].toLowerCase());
            if (roll_type === null) {
                LOG.error('In item "%s", in affix "%s", unrecognized roll type %s'.format(item_name, part, pieces[1]));
                return null;
            }

            return create_effect(effect_text, roll_type);
        }

        static magic_resist_affix(item_name, part, type) {
            assert_not_null(item_name, 'magic_resist_affix() item_name');
            assert_not_null(part, 'magic_resist_affix() part');
            assert_not_null(type, 'magic_resist_affix() type');

            let pieces = part.split(':');
            if (pieces.length !== 2) {
                LOG.error('In item "%s", in affix "%s", expected one colon'.format(item_name, part));
                return null;
            }

            const value = parse_int(trim_percent(pieces[1]));
            if (Number.isNaN(value)) {
                LOG.error('In item "%s", in affix "%s", value %s is not a number'.format(item_name, part, pieces[1]));
                return null;
            }

            return Effect.magic_resist(type, value);
        }

        static condition_resist_affix(item_name, part, condition) {
            assert_not_null(item_name, 'condition_resist_affix() item_name');
            assert_not_null(part, 'condition_resist_affix() part');
            assert_not_null(condition, 'condition_resist_affix() condition');

            let pieces = part.split(':');
            if (pieces.length !== 2) {
                LOG.error('In item "%s", in affix "%s", expected one colon'.format(item_name, part));
                return null;
            }

            const value = parse_int(trim_percent(pieces[1]));
            if (Number.isNaN(value)) {
                LOG.error('In item "%s", in affix "%s", value %s is not a number'.format(item_name, part, pieces[1]));
                return null;
            }

            return Effect.condition_resist(condition, value);
        }
    }


    // ################################################################################################################
    // Characters



    class Character {
        static CHARACTER_SHEET_ITEM_SLOTS = [
            ItemSlot.HEAD, ItemSlot.BODY, ItemSlot.HANDS, ItemSlot.FEET, ItemSlot.NECK,
            'left_ring', 'right_ring', ItemSlot.BELT,
        ];
        static MONK_MASTERY_DICE = [4, 6, 8, 10, 12, 20];
        static MONK_MASTERY_COMBO = [0, 10, 20, 30, 35, 40];

        constructor(game_object, who) {
            this._type = 'Character';
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

            this.main_hand = this.get_item(ItemSlot.MAIN_HAND);
            this.offhand = this.get_item(ItemSlot.OFFHAND);
            this.items = this.get_items();

            // Fetched lazily, aka when requested
            this.attributes = {};
            this.stats = {};
            this.game_attributes = null;
            this.skills = null;
            this.abilities = null;
        }

        csv_to_array(list) {
            const items = [];
            if (list !== undefined && list !== null) {
                list.split(',').forEach(i => items.push(i.trim()));
                list.split(',').forEach(i => items.push(i.trim()));
            }
            return items;
        }

        get_items() {
            const character_items = [];

            for (let i = 0; i < Character.CHARACTER_SHEET_ITEM_SLOTS.length; i++) {
                const slot = Character.CHARACTER_SHEET_ITEM_SLOTS[i];
                const item = this.get_item(slot);
                if (item !== null) {
                    character_items.push(item);
                }
            }

            return character_items;
        }

        get_item(slot) {
            const item_name = getAttrByName(this.id, slot);

            if (item_name !== undefined && item_name !== null && item_name !== '') {
                const item = Item.construct_item(item_name, slot);
                if (item === null) {
                    LOG.error('Could not get item for name "%s" and slot %s'.format(item_name, slot));
                } else {
                    return item;
                }
            }

            return null;
        }

        get_attribute(attr_tla) {
            if (attr_tla in this.attributes) {
                return this.attributes[attr_tla];
            }

            const attr_value = parse_int(getAttrByName(this.id, attr_tla));
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

        get_game_attributes() {
            if (this.game_attributes === null) {
                this.game_attributes = findObjs({type: 'attribute', characterid: this.id});
            }

            return this.game_attributes;
        }

        get_skills() {
            if (this.skills !== null) {
                return this.skills;
            }

            const all_attributes = this.get_game_attributes();

            let attributes_by_id = {};
            for (let i = 0; i < all_attributes.length; i++) {
                const attribute = all_attributes[i];
                const attribute_name = attribute.get('name');

                if (attribute_name.includes('repeating_skills')) {
                    const attribute_id = attribute_name.split('_')[2];

                    if (attribute_name.includes('skill_name')) {
                        if (!(attribute_id in attributes_by_id)) {
                            attributes_by_id[attribute_id] = {};
                        }
                        attributes_by_id[attribute_id]['name'] = attribute.get('current');
                    }

                    if (attribute_name.includes('skill_points')) {
                        if (!(attribute_id in attributes_by_id)) {
                            attributes_by_id[attribute_id] = {};
                        }
                        attributes_by_id[attribute_id]['ap'] = attribute.get('current');
                    }
                }
            }

            this.skills = {};
            const keys = Object.keys(attributes_by_id);
            for (let i = 0; i < keys.length; i++) {
                const skill_attributes = attributes_by_id[keys[i]];
                if (!('name' in skill_attributes) || !('ap' in skill_attributes)) {
                    continue;
                }

                const name = skill_attributes['name'].toLowerCase();
                const ap = parse_int(skill_attributes['ap']);
                if (Number.isNaN(ap)) {
                    continue;
                }

                this.skills[name] = ap;
            }

            LOG.info(JSON.stringify(this.skills));
            return this.skills;
        }

        get_abilities() {
            if (this.abilities !== null) {
                return this.abilities;
            }

            const all_attributes = this.get_game_attributes();

            let attributes_by_id = {};
            for (let i = 0; i < all_attributes.length; i++) {
                const attribute = all_attributes[i];

                const attribute_name = attribute.get('name');
                if (attribute_name.includes('repeating_abilities')) {
                    const attribute_id = attribute_name.split('_')[2];

                    if (attribute_name.includes('class_name')) {
                        if (!(attribute_id in attributes_by_id)) {
                            attributes_by_id[attribute_id] = {};
                        }
                        attributes_by_id[attribute_id]['class'] = attribute.get('current');
                    }

                    if (attribute_name.includes('ability_name')) {
                        if (!(attribute_id in attributes_by_id)) {
                            attributes_by_id[attribute_id] = {};
                        }
                        attributes_by_id[attribute_id]['ability'] = attribute.get('current');
                    }
                }
            }

            this.abilities = [];
            const keys = Object.keys(attributes_by_id);
            for (let i = 0; i < keys.length; i++) {
                const ability_attributes = attributes_by_id[keys[i]];
                const ability = get_ability(ability_attributes['class'], ability_attributes['ability']);
                if (ability === null) {
                    continue;
                }

                this.abilities.push(ability);
            }

            return this.abilities;
        }

        get_num_monk_classes() {
            const abilities = this.get_abilities();

            // See what abilities have the "combo" tag, and build a set of their parent classes. Monk mastery
            // increases by 1 for each class of this nature that the character has.
            let classes_with_combo_abilities = new Set();
            for (let i = 0; i < abilities.length; i++) {
                const ability = abilities[i];
                if (ability['tags'].includes('combo')) {
                    classes_with_combo_abilities.add(ability['class']);
                }
            }

            return classes_with_combo_abilities.size;
        }

        get_monk_dice() {
            const num_monk_classes = this.get_num_monk_classes();
            const index = Math.min(num_monk_classes, Character.MONK_MASTERY_DICE.length - 1);
            return Character.MONK_MASTERY_DICE[index];
        }

        get_base_combo_chance() {
            const num_monk_classes = this.get_num_monk_classes();
            const index = Math.min(num_monk_classes, Character.MONK_MASTERY_COMBO.length - 1);
            return Character.MONK_MASTERY_COMBO[index];
        }
    }


    return {
        assert, assert_not_null, assert_type, assert_starts_with, assert_numeric,
        parse_int, trim_percent, trim_all, remove_empty,
        LOG,
        characters_by_owner,
        Stat, HiddenStat, Skill, conditions, classes,
        Damage, get_damage_from_type,
        RollType, RollTime, Roll,
        ItemType, ItemSlot, Item,
        Character,
    };
})();
