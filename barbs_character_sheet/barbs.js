var Barbs = Barbs || (function () {
    'use strict';

    // Basic python-like string formatting
    String.prototype.format = function () {
        let a = this;
        for (let i = 0; i < arguments.length; i++) {
            a = a.replace('%s', arguments[i]);
        }
        return a;
    };

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


    const LogLevel = {
        TRACE: 0,
        DEBUG: 1,
        INFO: 2,
        WARN: 3,
        ERROR: 4,
    };
    const LOG_LEVEL = LogLevel.INFO;


    function _log(log_level, string) {
        assert_not_null(log_level, '_log() log_level');
        assert_not_null(string, '_log() string');

        if (log_level >= LOG_LEVEL) {
            log(string);
        }
    }


    const STATE_NAME = 'Barbs';
    const LAST_TURN_ID = 'last_turn_id';

    const Stat = BarbsComponents.Stat;
    const HiddenStat = BarbsComponents.HiddenStat;
    const Skill = BarbsComponents.Skill;
    const Damage = BarbsComponents.Damage;
    const RollType = BarbsComponents.RollType;
    const RollTime = BarbsComponents.RollTime;
    const Roll = BarbsComponents.Roll;
    const ITEMS = BarbsComponents.ITEMS;

    const initiative_format = '&{template:5eDefault} {{title=Initiative}} {{subheader=%s}} {{rollname=Initiative}} {{roll=[[d100+%s+%s]]}}';
    const total_format = '&{template:default} {{name=%s}} {{%s=[[%s]]}}';
    const regen_format = '&{template:default} {{name=%s}} {{%s=[[round([[%s]]*[[(%s)/100]])]]}}';
    const percent_format = '&{template:default} {{name=%s}} {{%s=[[1d100cs>[[100-(%s)+1]]]]}}';

    const roll_format = '&{template:Barbs} {{name=%s}} %s %s %s';
    const damage_section_format = '{{%s=[[%s]]}}';
    const crit_section_format = '{{crit_value=[[%s]]}} {{crit_cutoff=[[%s]]}} {{modified_crit=[[%s-%s]]}}';
    const effects_section_format = '{{effects=%s}}';

    const ability_block_format = '&{template:5eDefault} {{spell=1}} {{title=%s}} {{subheader=%s}} 0 {{spellshowdesc=1}} {{spelldescription=%s }} 0 0 0 0 0 0 0';

    let persistent_effects = [];


    function chat(character, message, handler) {
        assert_not_null(character, 'chat() character');
        assert_not_null(message, 'chat() message');

        sendChat(character.who, message, handler);
    }


    function get_character_names(who, id) {
        const found_characters = [];
        Object.keys(BarbsComponents.characters_by_owner).forEach(function (character_name) {
            const owner_names = BarbsComponents.characters_by_owner[character_name];
            for (let i = 0; i < owner_names.length; i++) {
                if (owner_names[i] === who || owner_names[i] === id) {
                    found_characters.push(character_name);
                }
            }
        });

        return found_characters;
    }


    function get_character(msg) {
        const character_names = get_character_names(msg.who, msg.id);

        let characters = [];
        for (let i = 0; i < character_names.length; i++) {
            const objects = findObjs({
                _type: 'character',
                name: character_names[i]
            });

            characters = characters.concat(objects);
        }

        if (characters.length === 0) {
            _log(LogLevel.ERROR, 'Did not find a character for ' + msg.who);
            return null;
        } else if (characters.length > 1) {
            // warn, but pray we've got the right ones regardless
            _log(LogLevel.WARN, 'Found ' + characters.length + ' matching characters for ' + msg.who);
        }

        return new BarbsComponents.Character(characters[0], msg.who);
    }


    function get_character_by_name(name) {
        assert_not_null(name, 'get_character_by_name() name');

        const fake_msg = {'who': name, 'id': ''};
        return get_character(fake_msg);
    }


    function get_roll_with_items_and_effects(character) {
        assert_not_null(character, 'get_roll_with_items_and_effects() character');

        const roll = new Roll(character, RollType.ALL);

        // Any effect that might modify a stat, skill, or concentration roll should not depend on whether or not a roll
        // is a crit. Thus, all of these effects should be applied at DEFAULT time.
        const roll_time = RollTime.DEFAULT;

        // Apply effects from items that have the proper roll time
        _.each(character.items, function (item) {
            for (let i = 0; i < item.effects.length; i++) {
                if (item.effects[i].roll_time === roll_time) {
                    item.effects[i].apply(roll);
                }
            }
        });

        // Apply persistent effects that have the proper roll time
        for (let i = 0; i < persistent_effects.length; i++) {
            if (persistent_effects[i].target === character.name && persistent_effects[i].roll_time === roll_time) {
                persistent_effects[i].handler(character, roll, /*parameters=*/[]);
            }
        }

        return roll;
    }


    function get_stat_roll_modifier(character, roll, stat) {
        assert_not_null(character, 'generate_stat_roll_modifier_from_items() character');
        assert_not_null(roll, 'generate_stat_roll_modifier_from_items() roll');
        assert_not_null(stat, 'generate_stat_roll_modifier_from_items() stat');

        const attribute = parseInt(getAttrByName(character.id, stat.attr_tla));
        let mod = '%s'.format(stat.value(attribute));

        if (stat.name in roll.stats) {
            mod = '%s+%s'.format(mod, roll.stats[stat.name]);
        }

        if (stat.name in roll.stat_multipliers) {
            mod = '(%s)*(1+%s)'.format(mod, roll.stat_multipliers[stat.name]);
        }

        return mod;
    }


    function roll_stat(msg) {
        const character = get_character(msg);
        if (character === null) {
            return;
        }

        const stat = Stat[msg.content.split(' ')[2].toUpperCase()];
        const roll = get_roll_with_items_and_effects(character);
        const modifier = get_stat_roll_modifier(character, roll, stat);

        switch (stat.name) {
            case Stat.HEALTH.name:
                chat(character, total_format.format('Total Health', 'Health', modifier));
                break;

            case Stat.STAMINA.name:
                chat(character, total_format.format('Total Stamina', 'Stamina', modifier));
                break;

            case Stat.MANA.name:
                chat(character, total_format.format('Total Mana', 'Mana', modifier));
                break;

            case Stat.HEALTH_REGENERATION.name:
                const total_health = get_stat_roll_modifier(character, roll, Stat.HEALTH);
                chat(character, regen_format.format('Health Regeneration', 'Regen', total_health, modifier));
                break;

            case Stat.STAMINA_REGENERATION.name:
                const total_stamina = get_stat_roll_modifier(character, roll, Stat.STAMINA);
                chat(character, regen_format.format('Stamina Regeneration', 'Regen', total_stamina, modifier));
                break;

            case Stat.MANA_REGENERATION.name:
                const total_mana = get_stat_roll_modifier(character, roll, Stat.MANA);
                chat(character, regen_format.format('Mana Regeneration', 'Regen', total_mana, modifier));
                break;

            case Stat.MOVEMENT_SPEED.name:
                chat(character, total_format.format('Total Movement Speed', 'Speed', modifier));
                break;

            case Stat.AC.name:
                chat(character, total_format.format('Total AC', 'AC', modifier));
                break;

            case Stat.EVASION.name:
                chat(character, percent_format.format('Evasion', 'Evasion', modifier));
                break;

            case Stat.MAGIC_RESIST.name:
                chat(character, total_format.format('Total Magic Resist', 'Magic Resist', modifier));
                break;

            case Stat.CONDITION_RESIST.name:
                chat(character, percent_format.format('Condition Resist', 'CR', modifier));
                break;

            case Stat.MELEE_DAMAGE.name:
                chat(character, total_format.format('Bonus Melee Damage', 'Damage', modifier));
                break;

            case Stat.RANGED_FINE_DAMAGE.name:
                chat(character, total_format.format('Bonus Ranged/Fine Damage', 'Damage', modifier));
                break;

            case Stat.MAGIC_DAMAGE.name:
                chat(character, total_format.format('Bonus Magic Damage', 'Damage', modifier));
                break;

            case Stat.CRITICAL_HIT_CHANCE.name:
                chat(character, percent_format.format('Critical Hit Chance', 'Crit', modifier));
                break;

            case Stat.COMMANDS.name:
                chat(character, total_format.format('Total Commands', 'Commands', modifier));
                break;

            case Stat.LANGUAGES.name:
                chat(character, total_format.format('Total Languages', 'Languages', modifier));
                break;

            case Stat.ITEM_EFFICIENCY.name:
                chat(character, total_format.format('Total Item Efficiency', 'Modifier', modifier));
                break;

            case Stat.BUFF_LIMIT.name:
                chat(character, total_format.format('Total Buff Limit', 'Buff Limit', modifier));
                break;

            case Stat.CONCENTRATION_LIMIT.name:
                chat(character, total_format.format('Total Concentration Limit', 'Concentration Limit', modifier));
                break;

            default:
                chat(character, 'Error, unknown stat ' + stat.name);
        }
    }


    function roll_skill(msg) {
        const character = get_character(msg);
        if (character === null) {
            return;
        }

        const pieces = msg.content.split(' ');

        const points_in_skill = parseInt(pieces[pieces.length - 1]);
        const bonus = 5 * points_in_skill;
        const given_skill_name = pieces.slice(2, pieces.length - 1).join(' ');
        const skill_name = given_skill_name.replace(/:/g, '').replace(/ /g, '_').toUpperCase();

        if (!(skill_name in Skill)) {
            chat(character, 'Error, skill "%s" not in skill-to-attribute map'.format(skill_name));
            return;
        }

        const skill = Skill[skill_name];
        const attribute = character.get_attribute(skill.scaling_attr_tla);
        let roll_string = 'd100+%s+%s'.format(bonus, attribute);

        const roll = get_roll_with_items_and_effects(character);
        if (skill.name in roll.skills) {
            roll_string += '+%s'.format(roll.skills[skill.name]);
        }
        if (Skill.ALL.name in roll.skills) {
            roll_string += '+%s'.format(roll.skills[Skill.ALL.name]);
        }

        chat(msg, total_format.format(given_skill_name, 'Roll', roll_string));
    }


    function roll_initiative(msg) {
        const character = get_character(msg);
        if (character === null) {
            return;
        }

        const roll = get_roll_with_items_and_effects(character);
        chat(msg, initiative_format.format(character.name, roll.initiative_bonus, character.get_attribute('AGI')));
        // TODO: add the character to the tracker, if possible. Trying to add the '&{tracker}' tag to the roll sent
        //  by the API causes an error.
    }


    function roll_concentration(msg) {
        const character = get_character(msg);
        if (character === null) {
            return;
        }

        const roll = get_roll_with_items_and_effects(character);
        const roll_string = 'd100+%s'.format(roll.concentration_bonus);
        chat(msg, total_format.format('Concentration Check', 'Roll', roll_string));

    }


    // ################################################################################################################
    // Managing persistent effects


    // Most effects don't care about when they are applied to a roll. But some want to be applied specifically after
    // others. This allows effects to have some desired ordering.
    //
    class Order {
        constructor(val) {
            this.val = val;
        }
    }

    function Ordering(val = 50) {
        return new Order(val);
    }


    function add_persistent_effect(caster, ability, target_character, duration, order, roll_time, single_application, handler) {
        assert_not_null(caster, 'add_persistent_effect() caster');
        assert_not_null(ability, 'add_persistent_effect() ability');
        assert_not_null(target_character, 'add_persistent_effect() target_character');
        assert_not_null(duration, 'add_persistent_effect() duration');
        assert_not_null(order, 'add_persistent_effect() order');
        assert_not_null(roll_time, 'add_persistent_effect() roll_time');
        assert_not_null(single_application, 'add_persistent_effect() single_application');
        assert_not_null(handler, 'add_persistent_effect() handler');

        const effect = {
            'caster': caster.name,
            'name': ability,
            'target': target_character.name,
            'duration': duration,
            'ordering': order,
            'roll_time': roll_time,
            'single_application': single_application,
            'handler': handler,
        };

        // Keep persistent effects in a priority queue, so that we process lower priority effects first and higher
        // priority effects last
        for (let i = 0; i < persistent_effects.length; i++) {
            if (persistent_effects[i].ordering.val > effect.ordering.val) {
                _log(LogLevel.INFO, 'Added persistent effect %s'.format(JSON.stringify(effect)));
                persistent_effects.splice(i, 0, effect);
                return;
            }
        }

        _log(LogLevel.INFO, 'Added persistent effect %s'.format(JSON.stringify(effect)));
        persistent_effects.push(effect);
    }


    function list_persistent_effects(msg) {
        const pieces = msg.content.split(' ');
        let character = null;
        if (pieces.length > 2) {
            const character_name = pieces.slice(2).join(' ');
            character = get_character_by_name(character_name);

        } else {
            character = get_character(msg);
        }

        if (character === null) {
            return;
        }

        let response = '';
        for (let i = 0; i < persistent_effects.length; i++) {
            if (persistent_effects[i].target === character.name) {
                response = response = '<li>%s</li>'.format(persistent_effects[i].name);
            }
        }

        const format = '&{template:Barbs} {{name=Effects on %s}} {{effects=%s}}';
        chat(character, format.format(character.name, response));
    }


    function remove_persistent_effect(msg) {
        const pieces = msg.content.split(' ');
        const options = pieces.slice(2).join(' ');
        const option_pieces = options.split(';');
        const character_name = option_pieces[0];
        const effect_name = option_pieces[1];

        const character = get_character_by_name(character_name);
        if (character === null) {
            return;
        }

        for (let i = 0; i < persistent_effects.length; i++) {
            if (persistent_effects[i].name === effect_name && persistent_effects[i].target === character.name) {
                persistent_effects.splice(i, 1);
                i--;

                chat(get_character(msg), 'Removed effect ' + effect_name + ' from ' + character.name);
            }
        }
    }


    // Iterate through effects of abilities (buffs, empowers, etc) that may last multiple turns and add applicable ones
    // to the roll.
    function add_persistent_effects_to_roll(character, roll, roll_time, parameters) {
        for (let i = 0; i < persistent_effects.length; i++) {
            if (persistent_effects[i].target === character.name
                    && persistent_effects[i].roll_time === roll_time) {

                if (!persistent_effects[i].handler(character, roll, parameters)) {
                    return false;
                }
            }
        }

        return true;
    }


    // ################################################################################################################
    // Class abilities helpers


    function get_ability_info(ability_name) {
        const ability_names = Object.keys(BarbsComponents.abilities);
        for (let i = 0; i < ability_names.length; i++) {
            const ability = BarbsComponents.abilities[ability_names[i]];
            if (ability.name === ability_name) {
                return ability;
            }
        }

        _log(LogLevel.ERROR, 'Ability ' + ability_name + ' not found');
        return null;
    }


    function get_passive_class(passive) {
        const class_names = Object.keys(BarbsComponents.classes);
        for (let i = 0; i < class_names.length; i++) {
            const clazz = BarbsComponents.classes[class_names[i]];
            if ('passive' in clazz && passive === Object.keys(clazz.passive)[0]) {
                return clazz;
            }
        }

        _log(LogLevel.ERROR, 'Class with passive ' + passive + ' not found');
        return null;
    }


    function get_parameter(parameter, parameters) {
        assert_not_null(parameter, 'get_parameter() parameter');
        assert_not_null(parameters, 'get_parameter() parameters');

        for (let i = 0; i < parameters.length; i++) {
            if (parameters[i].includes(parameter)) {
                return parameters[i].split(' ').slice(1).join(' ');
            }
        }

        return null;
    }


    // For classes abilities specifically. We assume that the ability uses the character's equipped item with type
    // MAIN_HAND or TWO_HAND.
    function add_scale_damage(character, roll) {
        assert_not_null(character, 'add_scale_damage() character');
        assert_not_null(roll, 'add_scale_damage() roll');

        if (roll.roll_type !== RollType.PHYSICAL) {
            chat(character, 'Unexpected roll type %s while adding weapon scaling damage'.format(roll.roll_type));
        }

        let main_hand_item = character.get_main_weapon();
        if (main_hand_item !== null) {
            main_hand_item.damage_scaling(character, roll);
        }
    }


    function get_damage_type(type) {
        const damage_types = Object.keys(Damage);
        for (let i = 0; i < damage_types.length; i++) {
            const damage_type = damage_types[i];
            const damage_type_string = Damage[damage_type];
            if (type === damage_type_string) {
                return damage_type;
            }
        }

        return null;
    }


    function get_monk_mastery(character) {
        const all_attributes = findObjs({
            type: 'attribute',
            characterid: character.id,
        });

        let ability_names = [];
        for (let i = 0; i < all_attributes.length; i++) {
            const attribute = all_attributes[i];

            if (attribute.get('name').includes('repeating_abilities') && attribute.get('name').includes('ability_name')) {
                ability_names.push(attribute.get('current'));
            }
        }

        // See what abilities have the "combo" tag, and build a set of their parent classes. Monk mastery increases by 1
        // for each class of this nature that the character has.
        let classes_with_combo_abilities = new Set();
        for (let i = 0; i < ability_names.length; i++) {
            const ability = get_ability_info(ability_names[i]);
            if (ability === null) {
                continue;
            }

            if (ability['tags'].includes('combo')) {
                classes_with_combo_abilities.add(ability['class']);
            }
        }

        const mastery_levels = [4, 6, 8, 10, 12, 20];
        const monk_classes = Math.min(classes_with_combo_abilities.size, mastery_levels.length - 1);
        return mastery_levels[monk_classes];
    }


    // Iterate through the character's items and add any damage bonuses or multipliers to the roll
    function add_items_to_roll(character, roll, roll_time) {
        assert_not_null(character, 'add_items_to_roll() character');
        assert_not_null(roll, 'add_items_to_roll() roll');
        assert_not_null(roll_time, 'add_items_to_roll() roll_time');

        _.each(character.items, function (item) {
            for (let i = 0; i < item.effects.length; i++) {
                if (item.effects[i].roll_time === roll_time) {
                    item.effects[i].apply(roll);
                }
            }
        });
    }


    function add_extras(character, roll, roll_time, parameters) {
        assert_not_null(character, 'add_extras() character');
        assert_not_null(roll, 'add_extras() roll');
        assert_not_null(roll_time, 'add_extras() roll_time');
        assert_not_null(parameters, 'add_extras() parameters');

        add_items_to_roll(character, roll, roll_time);
        if (!handle_arbitrary_parameters(roll, roll_time, parameters)) {
            _log(LogLevel.WARN, 'Problem handling arbitrary parameters at time ' + roll_time);
            return false;
        }
        if (!add_persistent_effects_to_roll(character, roll, roll_time, parameters)) {
            _log(LogLevel.WARN, 'Problem adding persistent effects to roll at time ' + roll_time);
            return false;
        }

        return true;
    }


    /*
     * Roll for whether or not this will be a crit, and set the result in the roll. The passed handler should take a
     * string that can be appended to show the result of the crit roll. Example crit roll result:

        const msg = {
            "who":"Ren Nightside",
            "type":"general",
            "content":" {{name=Critical Hit Chance}} {{Crit=$[[1]]}}","playerid":"API","avatar":false,
            "inlinerolls":[
                {
                    "expression":"100-(10+0+0+0+0+0+0+0+0+0+0+0)+1",
                    "results":{
                        "type":"V",
                        "rolls":[{"type":"M","expr":"100-(10+0+0+0+0+0+0+0+0+0+0+0)+1"}],
                        "resultType":"M",
                        "total":91
                    },
                    "signature":false,
                    "rollid":null
                },
                {
                    "expression":"1d100cs>91",
                    "results":{
                        "type":"V",
                        "rolls":[
                            {
                                "type":"R","dice":1,"sides":100,
                                "mods":{
                                    "customCrit":[{"comp":">=","point":91}]
                                },
                                "results":[{"v":100}]
                            }
                        ],
                        "resultType":"sum",
                        "total":100
                    },
                    "signature":"3e6cfaf705fb91181557676b07dc48b9cbec0c251e310cf2c621dd3edc1e26d2f2aebed79e7108b08bfda4d98465e6e65d367d67829e8b295cb42d81a34df077",
                    "rollid":"-M0t49TVaJccGoUk9Jx3"
                }
            ],
            "rolltemplate":"default"
        };
    */
    function roll_crit(roll, parameters, handler) {
        assert_not_null(roll, 'roll_crit() roll');
        assert_not_null(parameters, 'roll_crit() parameters');
        assert_not_null(handler, 'roll_crit() handler');

        const character = roll.character;

        // Most effects can be applied whether or not we know if the result is a crit. These effects should have
        // RollTime.DEFAULT and are applied here.
        if (!add_extras(character, roll, RollTime.DEFAULT, parameters)) {
            return;
        }

        const crit_chance = roll.get_crit_chance();

        chat(roll.character, percent_format.format('Critical Hit Chance', 'Crit', crit_chance), function (results) {
            const rolls = results[0].inlinerolls;
            const crit_compare_value = rolls[0].results.total;
            const rolled_value_for_crit = rolls[1].results.total;
            roll.crit = (rolled_value_for_crit >= crit_compare_value);

            const crit_section = crit_section_format.format(rolled_value_for_crit, crit_compare_value,
                                                            rolled_value_for_crit, crit_compare_value);
            handler(crit_section);
        });
    }


    // 1. Do the roll, which actually builds up the strings for the roll on a per-type basis.
    // 2. Fill out a roll template to construct the message.
    // 3. Add in any extra effects that don't fit nicely into a damage type to the message.
    // 4. Record and send the message.
    function do_roll(character, ability, roll, parameters, crit_section, do_finalize = true) {
        assert_not_null(character, 'do_roll() character');
        assert_not_null(ability, 'do_roll() ability');
        assert_not_null(roll, 'do_roll() roll');
        assert_not_null(parameters, 'do_roll() parameters');
        assert_not_null(crit_section, 'do_roll() crit_section');

        // Any effect that needs to know whether or not a roll is a crit is applied here. These effects should have
        // RollTime.POST_CRIT.
        if (!add_extras(character, roll, RollTime.POST_CRIT, parameters)) {
            return;
        }

        // If we shouldn't actually apply crit chance to this roll, empty out the crit section. Effects that are
        // dependent on whether or not the roll was a crit should not have been applied.
        if (!roll.should_apply_crit) {
            crit_section = '';
        }

        const rolls_per_type = roll.roll();
        format_and_send_roll(character, ability, roll, rolls_per_type, crit_section);
        if (do_finalize) {
            finalize_roll(character, roll, parameters);
        }
    }


    function format_and_send_roll(character, ability, roll, rolls_per_type, crit_section) {
        assert_not_null(character, 'format_and_send_roll() character');
        assert_not_null(ability, 'format_and_send_roll() ability');
        assert_not_null(roll, 'format_and_send_roll() roll');
        assert_not_null(rolls_per_type, 'format_and_send_roll() rolls_per_type');
        assert_not_null(crit_section, 'format_and_send_roll() crit_section');

        let damage_section = '';
        Object.keys(rolls_per_type).forEach(function (type) {
            damage_section = damage_section + damage_section_format.format(type, rolls_per_type[type]);
        });

        let effects = Array.from(roll.effects);
        // TODO: only add specific-magic-type penetrations if that damage type is in the roll
        Object.keys(roll.hidden_stats).forEach(function (hidden_stat_format) {
            const formatted_hidden_stat = hidden_stat_format.format(roll.hidden_stats[hidden_stat_format]);
            effects.push('<li>%s</li>'.format(formatted_hidden_stat));
        });

        const effects_section = effects_section_format.format(effects.join(''));
        const msg = roll_format.format(ability, damage_section, crit_section, effects_section);

        _log(LogLevel.INFO, 'Roll: ' + msg);
        chat(character, msg);
    }


    function finalize_roll(character, roll, parameters) {
        assert_not_null(character, 'finalize_roll() character');
        assert_not_null(roll, 'finalize_roll() roll');
        assert_not_null(parameters, 'finalize_roll() parameters');

        // Some effects last exactly one attack. At this point, we've successfully applied everything and done the roll,
        // so the attack is done. Thus we can remove the single-use persistent effects from the master list.
        for (let i = 0; i < persistent_effects.length; i++) {
            if (persistent_effects[i].single_application && persistent_effects[i].target === character.name) {
                persistent_effects.splice(i, 1);
                i--;
            }
        }
    }


    // ################################################################################################################
    // Class passives (usually) that may apply to anything


    function arbitrary_multiplier(roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        const pieces = parameter.split(' ');
        const multiplier = pieces[1];
        const type = pieces[2];
        const source = pieces.splice(3).join(' ');
        roll.add_multiplier(multiplier, type, source);
        return true;
    }


    function arbitrary_damage(roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        const pieces = parameter.split(' ');
        const damage = pieces[1];
        const type = pieces[2];
        roll.add_damage(damage, type);
        return true;
    }


    function aquamancer_tide(roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        const pieces = parameter.split(' ');
        const tide = pieces.splice(1).join(' ');

        if (tide.toLowerCase() === 'flood tide') {
            roll.add_multiplier(0.5, Damage.WATER, 'self');
            if (HiddenStat.FORCED_MOVEMENT in roll.hidden_stats) {
                roll.add_hidden_stat(HiddenStat.FORCED_MOVEMENT, 20);
            }

        } else if (tide.toLowerCase() === 'ebb tide') {
            roll.add_multiplier(0.5, Damage.HEALING, 'self');
            // TODO: buffs grant 20% general MR
        } else {
            chat(roll.character, 'Unknown tide for Aquamancer passive: ' + tide);
            return false;
        }

        return true;
    }


    function assassin_pursue_mark(roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        const stacks = parseInt(parameter.split(' ')[1]);
        roll.add_crit_damage_mod(stacks * 50);
        return true;
    }


    function cryomancer_frostbite(roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        const stacks = parseInt(parameter.split(' ')[1]);
        roll.add_multiplier(stacks * 0.5, Damage.ICE, 'self');
        return true;
    }


    function daggerspell_marked(roll, roll_time, parameter, parameters) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        roll.add_crit_chance(10);

        const empowered = get_parameter('empowered', parameters);
        if (empowered !== null) {
            roll.add_crit_damage_mod(100);
        }
        return true;
    }


    function dragoncaller_draconic_pact(roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        const pacts = parseInt(parameter.split(' ')[1]);
        roll.add_multiplier(pacts, Damage.ALL, 'self');
        return true;
    }


    function daggerspell_ritual_dagger(roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        const mana_spent = parameter.split(' ')[1];
        roll.add_damage(Math.round(mana_spent / 2), Damage.PHYSICAL);
        return true;
    }


    function juggernaut_what_doesnt_kill_you(roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        const pieces = parameter.split(' ');
        const ratio = pieces[1];
        const current_health = parseInt(ratio.split('/')[0]);
        const total_health = parseInt(ratio.split('/')[1]);
        const missing_health = total_health - current_health;

        roll.add_multiplier(missing_health / total_health, Damage.PHYSICAL, 'self');
        return true;
    }


    function lightning_duelist_arc_lightning_mark(roll, roll_time, parameter, parameters) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        if (roll.roll_type === RollType.PHYSICAL || roll.roll_type === RollType.ALL) {
            roll.add_damage('6d8', Damage.LIGHTNING);

            // Triggering this also hits another random target
            const side_roll = new Roll(roll.character, RollType.MAGIC);
            side_roll.add_damage('6d8', Damage.LIGHTNING);
            side_roll.add_damage(roll.character.get_stat(Stat.MAGIC_DAMAGE), Damage.LIGHTNING);

            // Everything - items, persistent effects - should apply to the main and secondary roll here. I'm losing
            // the parameters for the secondary roll though, which might matter eventually. For now it's fine.
            if (!add_extras(roll.character, roll, RollTime.DEFAULT, parameters)) {
                return false;
            }

            do_roll(side_roll.character, 'Arc Lightning (Random Target)', side_roll, /*parameters=*/[], '');
        }

        return true;
    }


    function sniper_spotter(roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        const stacks = parseInt(parameter.split(' ')[1]);
        roll.add_multiplier(stacks * 0.25, Damage.ALL, 'self');
        return true;
    }


    function warper_opportunistic_predator(roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        // If the parameter is present, we always add the bonus crit chance
        roll.add_crit_chance(50);
        return true;
    }


    const arbitrary_parameters = {
        'arc_lightning': lightning_duelist_arc_lightning_mark,
        'frostbite': cryomancer_frostbite,
        'juggernaut': juggernaut_what_doesnt_kill_you,
        'misc_multiplier': arbitrary_multiplier,
        'misc_damage': arbitrary_damage,
        'pursued': assassin_pursue_mark,
        'daggerspell_marked': daggerspell_marked,
        'draconic_pact': dragoncaller_draconic_pact,
        'empowered': daggerspell_ritual_dagger,
        'spotting': sniper_spotter,
        'tide': aquamancer_tide,
        'warper_cc': warper_opportunistic_predator,
    };


    function handle_arbitrary_parameters(roll, roll_time, parameters) {
        for (let i = 0; i < parameters.length; i++) {
            Object.keys(arbitrary_parameters).forEach(function (keyword) {
                if (parameters[i].includes(keyword)) {
                    if (!arbitrary_parameters[keyword](roll, roll_time, parameters[i], parameters)) {
                        return false;
                    }
                }
            });
        }

        return true;
    }


    // ################################################################################################################
    // Auto-attacks with an item


    function roll_item(msg) {
        const character = get_character(msg);
        if (character === null) {
            return;
        }

        const pieces = msg.content.split(' ');
        const options = pieces.slice(2).join(' ');
        const option_pieces = options.split(';');
        const item_name = option_pieces[0];
        const parameters = option_pieces.slice(1);
        parameters.forEach(function (parameter, index, self) {
            self[index] = parameter.trim();
        });

        // Find the item object for the name
        let item = null;
        for (let i = 0; i < ITEMS.length; i++) {
            if (item_name === ITEMS[i].name) {
                item = ITEMS[i];
                break;
            }
        }

        if (item === null) {
            chat(character, 'Error, could not find item with name ' + item_name);
            return;
        }

        // There are no magic auto-attacks, so the type here is always physical.
        const roll = new Roll(character, RollType.PHYSICAL);
        item.base_damage.apply(roll);

        // We know the item being used explicitly, so don't use add_scale_damage(), which guesses
        item.damage_scaling(character, roll);

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, item_name, roll, parameters, crit_section);
        });
    }


    // ################################################################################################################
    // Class abilities


    // There are some abilities that don't make any real changes to combat. Simply print the description for
    // these abilities.
    function print_ability_description(character, ability, parameters) {
        const ability_info = get_ability_info(ability);
        chat(character, ability_block_format.format(ability, ability_info['class'], ability_info.description.join('\n')));
    }


    function air_duelist_arc_of_air(character, ability, parameters) {
        add_persistent_effect(character, ability, character, 6,  Ordering(), RollTime.DEFAULT, false,
            function (character, roll, parameters) {
                if (roll.roll_type === RollType.PHYSICAL || roll.roll_type === RollType.ALL) {
                    roll.add_damage('2d8', Damage.AIR);
                }
                return true;
            });

        const ability_info = get_ability_info(ability);
        chat(character, ability_block_format.format(ability, ability_info['class'], ability_info.description.join('\n')));
    }


    function air_duelist_cutting_winds(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('6d8', Damage.AIR);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.AIR);
        roll.add_effect('Knocks prone');

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function air_duelist_mistral_bow(character, ability, parameters) {
        add_persistent_effect(character, ability, character, 6,  Ordering(), RollTime.DEFAULT, false,
            function (character, roll, parameters) {
                roll.add_effect('Bow attacks push target 5ft away');
                return true;
            });

        const ability_info = get_ability_info(ability);
        chat(character, ability_block_format.format(ability, ability_info['class'], ability_info.description.join('\n')));
    }


    function aquamancer_baptise(character, ability, parameters) {
        const roll = new Roll(character, RollType.HEALING);
        roll.add_damage('6d6', Damage.HEALING);
        roll.add_effect('Cleanse a random condition on the target for every 6 you roll');

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function aquamancer_tidal_wave(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('8d6', Damage.WATER);
        roll.add_effect('Leaves behind a field of shallow water that is difficult terrain for 1 hour');

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function aquamancer_draught_of_vigor(character, ability, parameters) {
        // NOTE: It's a "pick two of these effects" case
        chat(character, 'Not yet implemented');
    }


    function arcanist_magic_dart(character, ability, parameters) {
        const parameter = get_parameter('damage_type', parameters);
        if (parameter === null) {
            chat(character, '"damage_type" parameter is missing');
            return;
        }

        let damage_types = parameter.split(' ');
        if (damage_types.length === 1) {
            damage_types.push(damage_types[0]);
            damage_types.push(damage_types[0]);
        }

        // Check that we understand the given damage types
        for (let i = 0; i < damage_types.length; i++) {
            const damage_type = get_damage_type(damage_types[i]);
            if (damage_type === null) {
                chat(character, 'Unrecognized damage_type "%s"'.format(damage_types[i]));
                return;
            }
        }

        // This is a bit more complicated that you might expect in case the spell has the ability to crit.
        const dummy_roll = new Roll(character, RollType.MAGIC);
        roll_crit(dummy_roll, parameters, function (crit_section) {
            for (let i = 0; i < damage_types.length; i++) {
                const roll = new Roll(character, RollType.MAGIC);
                roll.add_damage('%sd12'.format(1), damage_types[i]);
                roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), damage_types[i]);

                roll.copy_damages(dummy_roll);
                roll.copy_multipliers(dummy_roll);

                if (!add_extras(character, dummy_roll, RollTime.POST_CRIT, parameters)) {
                    return;
                }

                if (!roll.should_apply_crit) {
                    crit_section = '';
                }

                const rolls_per_type = roll.roll();
                format_and_send_roll(character, '%s (%s)'.format(ability, damage_types[i]), roll, rolls_per_type,
                                     crit_section);
            }

            finalize_roll(character, dummy_roll, parameters);
        });
    }


    function arcanist_magic_primer(character, ability, parameters) {
        // This should be applied before other effects that rely on knowing whether or not a roll was a crit
        add_persistent_effect(character, ability, character, 1,  Ordering(10), RollTime.DEFAULT, true,
            function (character, roll, parameters) {
                roll.add_multiplier(0.3, Damage.ALL, 'self');
                roll.should_apply_crit = true;
                return true;
            });

        const ability_info = get_ability_info(ability);
        chat(character, ability_block_format.format(ability, ability_info['class'], ability_info.description.join('\n')));
    }


    function assassin_backstab(character, ability, parameters) {
        const parameter = get_parameter('hidden', parameters);
        if (parameter === null) {
            chat(character, '"hidden {true/false}" parameter is required');
            return;
        }

        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('3d4', Damage.PHYSICAL);
        add_scale_damage(character, roll);

        if (parameter === 'true') {
            roll.max_damage = true;
        }

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function assassin_massacre(character, ability, parameters) {
        const parameter = get_parameter('division', parameters);
        if (parameter === null) {
            chat(character, '"division" parameter is missing');
            return;
        }

        const dice_divisions = parameter.split(' ');

        // Check that the total adds up to 16
        let total_dice = 0;
        _.each(dice_divisions, function (dice_division) {
            total_dice += parseInt(dice_division);
        });

        if (total_dice !== 16) {
            chat(character, 'Total dice do not add up to 16');
            return;
        }

        const dummy_roll = new Roll(character, RollType.PHYSICAL);
        roll_crit(dummy_roll, parameters, function (crit_section) {
            if (!add_extras(character, dummy_roll, RollTime.POST_CRIT, parameters)) {
                return;
            }

            for (let i = 0; i < dice_divisions.length; i++) {
                const roll = new Roll(character, RollType.PHYSICAL);
                roll.add_damage('%sd4'.format(dice_divisions[i]), Damage.PHYSICAL);
                add_scale_damage(character, roll);
                roll.add_hidden_stat(HiddenStat.LETHALITY, 5 * dice_divisions[i]);

                roll.copy_damages(dummy_roll);
                roll.copy_multipliers(dummy_roll);
                const rolls_per_type = roll.roll();
                format_and_send_roll(character, '%s (%sd4)'.format(ability, dice_divisions[i]), roll,
                    rolls_per_type, crit_section);
            }

            finalize_roll(character, dummy_roll, parameters);
        });
    }


    function assassin_sharpen(character, ability, parameters) {
        add_persistent_effect(character, ability, character, 6,  Ordering(90), RollTime.POST_CRIT, false,
            function (character, roll, parameters) {
                // We're going to inspect the damages accumulated in the roll and change any d4's to d6's. This relies
                // on the fact that persistent effects are added to rolls last and that "Ordering 90" will occur after
                // other effects that add damage to rolls.
                Object.keys(roll.damages).forEach(function (dmg_type) {
                    roll.damages[dmg_type] = roll.damages[dmg_type].replace('d4', 'd6');
                });
                return true;
            });

        const ability_info = get_ability_info(ability);
        chat(character, ability_block_format.format(ability, ability_info['class'], ability_info.description.join('\n')));
    }


    function assassin_skyfall(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('8d4', Damage.PHYSICAL);
        roll.add_crit_damage_mod(100);
        add_scale_damage(character, roll);

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function assassin_focus(character, ability, parameters) {
        add_persistent_effect(character, ability, character, 1,  Ordering(), RollTime.DEFAULT, true,
            function (character, roll, parameters) {
                roll.add_crit_chance(30);
                return true;
            });

        const ability_info = get_ability_info(ability);
        chat(character, ability_block_format.format(ability, ability_info['class'], ability_info.description.join('\n')));
    }


    function captain_inspirational_speech(character, ability, parameters) {
        const parameter = get_parameter('targets', parameters);
        if (parameter === null) {
            chat(character, '"targets" parameter, the list of affected players, is missing');
            return;
        }

        const target_names = parameter.split(',');
        for (let i = 0; i < target_names.length; i++) {
            const fake_msg = {'who': target_names[i], 'id': ''};
            const target_character = get_character(fake_msg);
            if (target_character === null) {
                return;
            }

            const source = character.name;
            add_persistent_effect(character, ability, target_character, 1, Ordering(), RollTime.DEFAULT, false,
                function (char, roll, parameters) {
                    roll.add_multiplier(1, Damage.ALL, source);
                    return true;
                });
        }

        const ability_info = get_ability_info(ability);
        chat(character, ability_block_format.format(ability, ability_info['class'], ability_info.description.join('\n')));
    }


    function champion_disarming_blow(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('5d6', Damage.PHYSICAL);
        add_scale_damage(character, roll);

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function champion_master_of_arms(character, ability, parameters) {
        // TODO
        chat(character, 'not yet implemented');
    }


    function champion_piercing_blow(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('7d10', Damage.PHYSICAL);
        add_scale_damage(character, roll);

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function champion_skull_bash(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('6d10', Damage.PHYSICAL);
        add_scale_damage(character, roll);
        roll.add_effect('Stun target until end of their next turn');

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function champion_slice_and_dice(character, ability, parameters) {
        const keep_highest = get_parameter('keep_highest', parameters);
        if (keep_highest !== null) {
            // When using a sword or axe, we can do the whole calculation in one step since we always re-roll and
            // always take the highest.
            const roll = new Roll(character, RollType.PHYSICAL);
            roll.add_damage('2d10d1+2d10d1+2d10d1+2d10d1+2d10d1', Damage.PHYSICAL);
            add_scale_damage(character, roll);

            roll_crit(roll, parameters, function (crit_section) {
                do_roll(character, ability, roll, parameters, crit_section);
            });
            return;
        }

        const rolls_to_keep = get_parameter('keep', parameters);
        if (rolls_to_keep === null) {
            // If not using a sword or axe, the caller has to select what they want to re-roll. Send out the initial
            // roll first so that they can select what to re-roll.
            const roll = new Roll(character, RollType.PHYSICAL);
            roll.add_damage('5d10', Damage.PHYSICAL);
            const rolls_per_type = roll.roll();
            format_and_send_roll(character, ability, roll, rolls_per_type, '');

        } else {
            const roll = new Roll(character, RollType.PHYSICAL);

            const values = rolls_to_keep.split(' ');
            values.forEach(function (value) {
                roll.add_damage(value, Damage.PHYSICAL);
            });

            roll.add_damage('%sd10'.format(5 - values.length), Damage.PHYSICAL);
            add_scale_damage(character, roll);

            roll_crit(roll, parameters, function(crit_section) {
                do_roll(character, ability, roll, parameters, crit_section);
            });
        }
    }


    function cryomancer_aurora_beam(character, ability, parameters) {
        const mana = get_parameter('mana', parameters);
        if (mana === null) {
            chat(character, '"mana" parameter, the amount of mana you are spending, is missing');
            return;
        }

        const dice = parseInt(mana) / 5;

        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('%sd8'.format(dice), Damage.ICE);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.ICE);


        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function cryomancer_glacial_crash(character, ability, parameters) {
        const roll_1 = new Roll(character, RollType.MAGIC);
        roll_1.add_damage('8d8', Damage.ICE);
        roll_1.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.ICE);
        roll_1.add_effect('Frozen');
        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, '%s (5 ft)'.format(ability), roll_1, parameters, crit_section, /*do_finalize=*/false);
        });

        const roll_2 = new Roll(character, RollType.MAGIC);
        roll_2.add_damage('6d8', Damage.ICE);
        roll_2.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.ICE);
        roll_1.add_effect('Slowed');
        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, '%s (10 ft)'.format(ability), roll_2, parameters, crit_section, /*do_finalize=*/false);
        });

        const roll_3 = new Roll(character, RollType.MAGIC);
        roll_3.add_damage('4d8', Damage.ICE);
        roll_3.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.ICE);
        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, '%s (15 ft)'.format(ability), roll_3, parameters, crit_section, /*do_finalize=*/true);
        });
    }


    function cryomancer_ice_spear(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('6d8', Damage.ICE);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.ICE);
        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function daggerspell_fadeaway_slice(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('4d4', Damage.PHYSICAL);
        add_scale_damage(character, roll);

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function daggerspell_exposing_tear(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('8d4', Damage.PHYSICAL);
        add_scale_damage(character, roll);

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function daggerspell_hidden_blade(character, ability, parameters) {
        add_persistent_effect(character, ability, character, 6, Ordering(), RollTime.DEFAULT, false,
            function (char, roll, parameters) {
                roll.add_crit_chance(15);

                const empowered = get_parameter('empowered', parameters);
                if (empowered !== null) {
                    roll.add_effect('Hidden');
                }

                return true;
            });

        const ability_info = get_ability_info(ability);
        chat(character, ability_block_format.format(ability, ability_info['class'], ability_info.description.join('\n')));
    }


    function dynamancer_spark_bolt(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('4d12', Damage.LIGHTNING);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.LIGHTNING);
        roll.add_effect('50% chance to deal an additional d12 lightning magic damage');
        roll.add_effect('30% to inflict Paralyze for 1 minute');
        roll.add_effect('20% to inflict Stunned until the beginning of your next turn');
        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function destroyer_challenge(character, ability, parameters) {
        const num_targets = get_parameter('targets', parameters);
        if (num_targets === null) {
            chat(character, '"targets" parameter is missing');
            return;
        }

        add_persistent_effect(character, ability, character, 6, Ordering(), RollTime.DEFAULT, false,
            function (char, roll, parameters) {
                roll.add_stat_multiplier(Stat.AC, 0.1 * parseInt(num_targets));
                roll.add_stat_bonus(Stat.MAGIC_RESIST, 10 * parseInt(num_targets));
                return true;
            });

        const ability_info = get_ability_info(ability);
        chat(character, ability_block_format.format(ability, ability_info['class'], ability_info.description.join('\n')));
    }


    function destroyer_rampage(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('6d10', Damage.PHYSICAL);
        add_scale_damage(character, roll);
        roll.add_effect('Knock targets prone');

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function destroyer_slam(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('4d10', Damage.PHYSICAL);
        add_scale_damage(character, roll);
        roll.add_effect('Inflict Physical Vulnerability equal to 10% + X%, where X is the target\'s current Physical Vulnerability');

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function dragoncaller_summon_bronze_dragon(character, ability, parameters) {
        const major_action = get_parameter('major', parameters);
        const minor_action = get_parameter('minor', parameters);

        if (major_action !== null) {
            // TODO: should the character for these rolls actually be `character`? Or should it be some fake character
            //  for the summoned dragon? I imagine that the dragon shouldn't be getting whatever is applied to the
            //  the caster, or whatever effects are granted by the caster's items. This currently doesn't work.
            const dragon = new BarbsComponents.Character({'id': 'garbage'}, character.who);

            if (major_action === 'breath') {
                const roll = new Roll(dragon, RollType.MAGIC);
                roll.add_damage('10d12', Damage.LIGHTNING);

                roll_crit(roll, parameters, function (crit_section) {
                    do_roll(dragon, ability, roll, parameters, crit_section);
                });

            } else if (major_action === 'claw') {
                const roll = new Roll(dragon, RollType.PHYSICAL);
                roll.add_damage('10d10', Damage.PHYSICAL);

                roll_crit(roll, parameters, function (crit_section) {
                    do_roll(dragon, ability, roll, parameters, crit_section);
                });

            } else {
                chat(character, 'Unexpected option for parameter "major", expected {claw/breath}')
            }
        }

        if (minor_action !== null) {
            // TODO deal with this better. We're gonna need a list of allies for the buff, and it's not worth doing
            // anything for the debuff.
            if (minor_action === 'buff') {

            } else if (minor_action === 'debuff') {

            } else {
                chat(character, 'Unexpected option for parameter "minor", expected {buff/debuff}')
            }
        }
    }


    function dragoncaller_bronze_dragon_breath(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('6d12', Damage.LIGHTNING);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.LIGHTNING);

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }

    function enchanter_modify_weapon(character, ability, parameters) {
        const target_name = get_parameter('target', parameters);
        if (target_name === null) {
            chat(character, '"target" parameter is missing');
            return;
        }

        const target_character = get_character_by_name(target_name);
        if (target_character === null) {
            return;
        }

        const choice = get_parameter('choice', parameters);
        if (choice === null) {
            chat(character, '"choice {first/second}" parameter is missing');
            return;
        }

        if (choice === 'first') {
            add_persistent_effect(character, ability, target_character, 6,  Ordering(), RollTime.DEFAULT, true,
                function (character, roll, parameters) {
                    roll.add_damage('4d10', Damage.PHYSICAL);
                    return true;
                });

        } else if (choice === 'second') {
            add_persistent_effect(character, ability, target_character, 6,  Ordering(), RollTime.DEFAULT, true,
                function (character, roll, parameters) {
                    roll.add_multiplier(-0.5, Damage.PHYSICAL, 'self');
                    return true;
                });

        } else {
            chat(character, 'Unknown value for "choice" parameter "%s"'.format(choice));
        }

        const ability_info = get_ability_info(ability);
        chat(character, ability_block_format.format(ability, ability_info['class'], ability_info.description.join('\n')));
    }


    function evangelist_magia_erebia(character, ability, parameters) {
        // Allows you to dispel an active Magia Erebia
        const dispel = get_parameter('dispel', parameters);
        if (dispel !== null) {
            for (let i = 0; i < persistent_effects.length; i++) {
                if (persistent_effects[i].name === 'Magia Erebia' && persistent_effects[i].target === character.name) {
                    persistent_effects.splice(i, 1);
                    i--;
                    chat(character, 'Removed effect ' + 'Magia Erebia' + ' from ' + character.name);
                }
            }
            return
        }

        const chosen_spell = get_parameter('spell', parameters);
        if (chosen_spell == null) {
            chat(character, '"spell" parameter, the absorbed spell, is missing');
            return;
        }

        // Check if Magia Erebia is already applies
        for (let i = 0; i < persistent_effects.length; i++) {
            if (persistent_effects[i].name === 'Magia Erebia' && persistent_effects[i].target === character.name) {
                chat(character, 'Magia Erebia is already applied');
                return;
            }
        }

        const duration = 5000;

        if (chosen_spell === 'KB') {
            add_persistent_effect(character, ability, character, duration, Ordering(), RollTime.DEFAULT, false,
                function (char, roll, parameters) {
                    roll.add_damage('6d8', Damage.ICE);
                    roll.add_damage('6d8', Damage.DARK);
                    roll.add_effect('Frozen [[1d100]]');
                    roll.add_effect('Slowed [[1d100]]');
                    roll.add_effect('Blinded [[1d100]]');
                    roll.add_effect('2 Curses [[1d100]] [[1d100]]');
                    return true;
                }
            );
            chat(character,'KB absorbed');
        } else {
            chat(character, 'Unrecognized spell "%s"'.format(chosen_spell));
        }
    }


    function juggernaut_wild_swing(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('5d10', Damage.PHYSICAL);
        add_scale_damage(character, roll);
        roll.add_hidden_stat(HiddenStat.LIFESTEAL, 30);
        roll.add_effect('+30% lifesteal if your health is below 30%');

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function juggernaut_hostility(character, ability, parameters) {
        const concentration = get_parameter('conc', parameters);

        add_persistent_effect(character, ability, character, 6,  Ordering(), RollTime.DEFAULT, false,
            function (character, roll, parameters) {
                if (concentration !== null) {
                    roll.add_hidden_stat(HiddenStat.LIFESTEAL, 25);
                } else {
                    roll.add_hidden_stat(HiddenStat.LIFESTEAL, 15);
                }

                return true;
            });

        const ability_info = get_ability_info(ability);
        chat(character, ability_block_format.format(ability, ability_info['class'], ability_info.description.join('\n')));
    }


    function juggernaut_tachycardia(character, ability, parameters) {
        add_persistent_effect(character, ability, character, 6,  Ordering(), RollTime.DEFAULT, false,
            function (character, roll, parameters) {
                roll.add_stat_bonus(Stat.MOVEMENT_SPEED, 30);

                if (roll.roll_type === RollType.PHYSICAL) {
                    roll.add_hidden_stat(HiddenStat.REACH, 5);
                }
                roll.add_hidden_stat(HiddenStat.AC_PENETRATION, 50);

                const parameter = get_parameter('low_health', parameters);
                if (parameter !== null) {
                    roll.add_multiplier(1, Damage.PHYSICAL, 'self');
                }

                return true;
            });

        const ability_info = get_ability_info(ability);
        chat(character, ability_block_format.format(ability, ability_info['class'], ability_info.description.join('\n')));
    }


    function ki_monk_spirit_punch(character, ability, parameters) {
        const monk_mastery = get_monk_mastery(character);

        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('4d%s'.format(monk_mastery), Damage.PHYSICAL);
        add_scale_damage(character, roll);
        roll.add_effect('Gain Ki equal to rolled value');

        const spent_ki = get_parameter('ki', parameters);
        if (spent_ki !== null) {
            roll.add_damage('4d%s'.format(monk_mastery), Damage.PSYCHIC);
        }

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function ki_monk_drain_punch(character, ability, parameters) {
        const monk_mastery = get_monk_mastery(character);

        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('5d%s'.format(monk_mastery), Damage.PHYSICAL);
        add_scale_damage(character, roll);
        roll.add_effect('Gain Ki equal to half the rolled value');

        const spent_ki = get_parameter('ki', parameters);
        if (spent_ki !== null) {
            roll.add_damage('5d%s'.format(monk_mastery), Damage.PSYCHIC);
        }

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function ki_monk_spirit_shotgun(character, ability, parameters) {
        const monk_mastery = get_monk_mastery(character);

        const roll = new Roll(character, RollType.PSYCHIC);
        roll.add_damage('5d%s'.format(monk_mastery), Damage.PSYCHIC);

        const spent_ki = get_parameter('ki', parameters);
        if (spent_ki !== null) {
            roll.add_multiplier(0.5, Damage.ALL, 'self');
            roll.add_effect('All hit targets are knocked back 20 ft');
        }

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function lightning_duelist_arc_lightning(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('6d8', Damage.LIGHTNING);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.LIGHTNING);

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function lightning_duelist_blade_storm(character, ability, parameters) {
        // This is d8 damage that repeats 2-6 times, so we do a secret roll first to see how many times we should
        // execute this attack.
        chat(character, '[[d5]]',  function (results) {
            const rolls = results[0].inlinerolls;
            const repetitions = rolls[0].results.total + 1;

            for (let i = 0; i < repetitions; i++) {
                const roll = new Roll(character, RollType.PHYSICAL);
                roll.add_damage('d8', Damage.PHYSICAL);
                add_scale_damage(character, roll);

                roll_crit(roll, parameters, function (crit_section) {
                    do_roll(character, ability, roll, parameters, crit_section);
                });
            }
        });
    }


    function lightning_duelist_shock_tendrils(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('3d8', Damage.LIGHTNING);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.LIGHTNING);

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function lightning_duelist_shocking_parry(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('5d8', Damage.PHYSICAL);
        add_scale_damage(character, roll);
        roll.add_effect('On hit, you have a 50% chance of recovering half the stamina cost');

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function lightning_duelist_sword_of_lightning(character, ability, parameters) {
        add_persistent_effect(character, ability, character, 6,  Ordering(), RollTime.DEFAULT, false,
            function (character, roll, parameters) {
                if (roll.roll_type === RollType.PHYSICAL || roll.roll_type === RollType.ALL) {
                    roll.add_damage('2d8', Damage.LIGHTNING);
                }
                return true;
            });

        const ability_info = get_ability_info(ability);
        chat(character, ability_block_format.format(ability, ability_info['class'], ability_info.description.join('\n')));
    }


    function martial_artist_choke_hold(character, ability, parameters) {
        const monk_mastery = get_monk_mastery(character);

        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('4d%s'.format(monk_mastery), Damage.PHYSICAL);
        add_scale_damage(character, roll);

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function martial_artist_flying_kick(character, ability, parameters) {
        const monk_mastery = get_monk_mastery(character);

        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('6d%s'.format(monk_mastery), Damage.PHYSICAL);
        add_scale_damage(character, roll);

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function noxomancer_darkbomb(character, ability, parameters) {
        const delay = get_parameter('delay', parameters);
        if (delay === null) {
            chat(character, '"delay {true/false}" parameter is missing');
            return;
        }

        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.DARK);

        if (delay === 'false') {
            roll.add_damage('3d10', Damage.DARK);
            roll.add_effect('1 curse')
        } else if (delay === 'true') {
            roll.add_damage('6d10', Damage.DARK);
            roll.add_effect('2 curses')
        } else {
            chat(character, 'Incorrect option for "delay" parameter, should be "delay {true/false}"')
        }

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function pyromancer_banefire(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('6d12', Damage.FIRE);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.FIRE);
        roll.add_effect('Unblockable/uncounterable if this is your second fire spell this turn');
        roll.add_effect('-5% Fire MR');
        roll.add_effect('+5% Fire Vulnerability');

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function pyromancer_magma_spray(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('4d12', Damage.FIRE);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.FIRE);
        roll.add_effect('Hit enemies 15 ft from you are inflicted with Burn X, where X is equal to the amount of damage rolled');
        roll.add_effect('-5% Fire MR');
        roll.add_effect('+5% Fire Vulnerability');

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function sentinel_crossguard_guillotine(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('4d10', Damage.PHYSICAL);
        add_scale_damage(character, roll);

        const stacks = get_parameter(parameters, 'stacks');
        if (stacks !== null) {
            roll.add_damage('%sd10'.format(stacks), Damage.PHYSICAL);
            roll.add_effect('Hits enemies diagonally to your target');
        }

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function sniper_analytical_shooter(character, ability, parameters) {
        const parameter = get_parameter('concentration', parameters);
        if (parameter === null) {
            chat(character, '"concentration {true/false}" parameter is required');
            return;
        }

        if (parameter === 'true') {
            add_persistent_effect(character, ability, character, 1,  Ordering(), RollTime.DEFAULT, true,
                function (character, roll, parameters) {
                    roll.add_crit_chance(10);
                    roll.add_crit_damage_mod(25);
                    return true;
                });
        } else {
            add_persistent_effect(character, ability, character, 1,  Ordering(), RollTime.DEFAULT, true,
                function (character, roll, parameters) {
                    roll.add_crit_chance(20);
                    roll.add_crit_damage_mod(50);
                    return true;
                });
        }

        const ability_info = get_ability_info(ability);
        chat(character, ability_block_format.format(ability, ability_info['class'], ability_info.description.join('\n')));
    }


    function sniper_distance_shooter(character, ability, parameters) {
        add_persistent_effect(character, ability, character, 1,  Ordering(99), RollTime.POST_CRIT, true,
            function (character, roll, parameters) {
                const parameter = get_parameter('distance', parameters);
                if (parameter === null) {
                    chat(character, '"distance" parameter is missing');
                    return false;
                }

                const distances = parameter.split(' ');
                if (distances.length < 1) {
                    chat(character, 'Missing values for "distance" parameter');
                    return false;
                }

                // Because this effect has an ordering of "99", the distance shooter rolls will be sent after the
                // base roll. Distance shooter damage will always be calculated after the base roll so that it can cope
                // with multiple distances. Multipliers from the original roll are copied into a new roll per given
                // distance.
                for (let i = 0; i < distances.length; i++) {
                    const distance_roll = new Roll(character, RollType.PHYSICAL);
                    distance_roll.add_damage(2 * parseInt(distances[i]) / 5, Damage.PHYSICAL);
                    distance_roll.copy_multipliers(roll);
                    const rolls_per_type = distance_roll.roll();
                    format_and_send_roll(character, '%s (%s ft)'.format(ability, distances[i]), distance_roll,
                        rolls_per_type, '');
                }

                return true;
            });

        const ability_info = get_ability_info(ability);
        chat(character, ability_block_format.format(ability, ability_info['class'], ability_info.description.join('\n')));
    }


    function sniper_kill_shot(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('7d8', Damage.PHYSICAL);
        add_scale_damage(character, roll);

        const stacks_spent_for_lethality = get_parameter('stacks', parameters);
        if (stacks_spent_for_lethality !== null) {
            roll.add_hidden_stat(HiddenStat.LETHALITY, 10 * parseInt(stacks_spent_for_lethality));
        }

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function sniper_piercing_shot(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('5d8', Damage.PHYSICAL);
        add_scale_damage(character, roll);

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function sniper_precision_shooter(character, ability, parameters) {
        add_persistent_effect(character, ability, character, 1, Ordering(), RollTime.DEFAULT, true,
            function (character, roll, parameters) {
                roll.add_effect('Ignores AC');
                roll.add_effect('Ignores MR');
                roll.add_effect('Cannot miss');
                roll.add_effect('Cannot be blocked');
                roll.add_effect('Cannot be reacted to');
                roll.add_effect('Cannot be blocked or redirected');
                roll.add_effect('Bypasses barriers and walls');
                return true;
            });

        const ability_info = get_ability_info(ability);
        chat(character, ability_block_format.format(ability, ability_info['class'], ability_info.description.join('\n')));
    }


    function sniper_shrapnel_shot(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('6d8', Damage.PHYSICAL);
        add_scale_damage(character, roll);

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function sniper_swift_shot(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('3d8', Damage.PHYSICAL);
        add_scale_damage(character, roll);
        roll.add_effect('Stun until end of turn');

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function soldier_biding_blade(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('5d10', Damage.PHYSICAL);
        add_scale_damage(character, roll);

        const blocked_damage = get_parameter('blocked', parameters);
        if (blocked_damage !== null) {
            const half_blocked_damage = parseInt(blocked_damage) / 2;
            roll.add_damage(half_blocked_damage.toString(), Damage.PHYSICAL);
        }

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function soldier_double_time(character, ability, parameters) {
        add_persistent_effect(character, ability, character, 6, Ordering(), RollTime.DEFAULT, false,
            function (char, roll, parameters) {
                roll.add_stat_bonus(Stat.MOVEMENT_SPEED, 20);
            });

        const ability_info = get_ability_info(ability);
        chat(character, ability_block_format.format(ability, ability_info['class'], ability_info.description.join('\n')));
    }


    function soldier_fleetfoot_blade(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('4d10', Damage.PHYSICAL);
        add_scale_damage(character, roll);

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function soldier_steadfast_strikes(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('2d10', Damage.PHYSICAL);
        add_scale_damage(character, roll);

        const hits = get_parameter('hits', parameters);
        if (hits !== null) {
            roll.add_damage('%sd10'.format(hits), Damage.PHYSICAL);
        }

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function symbiote_empower_soul(character, ability, parameters) {
        const target_name = get_parameter('target', parameters);
        if (target_name === null) {
            chat(character, '"target" parameter is missing');
            return;
        }

        const target_character = get_character_by_name(target_name);
        if (target_character === null) {
            return;
        }

        let percentage = 20;
        const extra_mana_spent = get_parameter('mana', parameters);
        if (extra_mana_spent !== null) {
            percentage += 2 * parseInt(extra_mana_spent);
        }

        add_persistent_effect(character, ability, target_character, 6, Ordering(), RollTime.DEFAULT, false,
            function (char, roll, parameters) {
                roll.add_hidden_stat(HiddenStat.ACCURACY, percentage);
                roll.add_hidden_stat(HiddenStat.GENERAL_MAGIC_PENETRATION, percentage);
                return true;
            });

        const ability_info = get_ability_info(ability);
        chat(character, ability_block_format.format(ability, ability_info['class'], ability_info.description.join('\n')));
    }

    function symbiote_power_spike(character, ability, parameters){
        const target_buff = get_parameter('buff', parameters);
        if (target_buff === null) {
            chat(character, '"buff" parameter is missing');
            return;
        }

        const target_name = get_parameter('target', parameters);
        if (target_name === null) {
            chat(character, '"target" parameter is missing');
            return;
        }

        const target_character = get_character_by_name(target_name);
        if (target_character === null) {
            return;
        }

        // Find the buff
        let index = -1;
        for (let i = 0; i < persistent_effects.length; i++) {
            if (persistent_effects[i].name === target_buff && persistent_effects[i].target === target_character.name) {
                index = i;
                break;
            }
        }

        if (index === -1) {
            chat(character, 'Did not find buff with name "%s" and target "%s"'.format(target_buff, target_character.name));
            return;
        }
        persistent_effects[index].duration = Math.floor(persistent_effects[index].duration / 2);

        // Figure out what damage / multiplier this buff grants
        const fake_roll = new Roll(target_character, RollType.ALL);
        persistent_effects[index].handler(target_character, fake_roll, parameters);

        // Edit the handler into something that grants the same damages and multipliers, but increased by 50%
        persistent_effects[index].handler = function (char, roll, parameters) {
            // For added damages, increase the number of damage dice by 1.5
            const damage_types = Object.keys(fake_roll.damages);
            for (let i = 0; i < damage_types.length; i++) {
                const damage_type = damage_types[i];
                const base_damage = fake_roll.damages[damage_type];

                const dmg_pieces = base_damage.split('+');
                let revised_dmg = '';

                const append = function (piece) {
                    if (revised_dmg === '') {
                        revised_dmg = piece;
                    } else {
                        revised_dmg = revised_dmg + '+' + piece;
                    }
                };

                for (let j = 0; j < dmg_pieces.length; j++) {
                    const dmg_piece = dmg_pieces[j];
                    if (!dmg_piece.includes('d')) {
                        append(dmg_piece);

                    } else {
                        let count = dmg_piece.split('d')[0];
                        if (count === '') {
                            count = 0;
                        } else {
                            count = parseInt(count);
                        }
                        const die = dmg_piece.split('d')[1];
                        const revised_piece = '%sd%s'.format(Math.round(1.5 * count), die);
                        append(revised_piece);
                    }
                }

                roll.add_damage('(%s)'.format(revised_dmg), damage_type);
            }

            // For added multipliers, multiply the multiplier by 1.5
            const multiplier_types = Object.keys(fake_roll.multipliers);
            for (let i = 0; i < multiplier_types.length; i++) {
                const multiplier_type = multiplier_types[i];
                if (character.name in fake_roll.multipliers[multiplier_type]) {
                    const base_multiplier = fake_roll.multipliers[multiplier_type][character.name];
                    roll.add_multiplier('(1.5*(%s))'.format(base_multiplier), multiplier_type, character.name);
                }
            }

            return true;
        };

        chat(character, 'Power Spiked ' + target_buff + ' on ' + target_character.name);
    }


    function symbiote_strengthen_body(character, ability, parameters) {
        const target_name = get_parameter('target', parameters);
        if (target_name === null) {
            chat(character, '"target" parameter is missing');
            return;
        }

        const target_character = get_character_by_name(target_name);
        if (target_character === null) {
            return;
        }

        add_persistent_effect(character, ability, target_character, 6, Ordering(), RollTime.DEFAULT, false,
            function (char, roll, parameters) {
                roll.add_stat_bonus(Stat.EVASION, 40);
                roll.add_stat_multiplier(Stat.AC, 0.4);
                return true;
            });

        const ability_info = get_ability_info(ability);
        chat(character, ability_block_format.format(ability, ability_info['class'], ability_info.description.join('\n')));
    }


    function symbiote_strengthen_mind(character, ability, parameters) {
        const target_name = get_parameter('target', parameters);
        if (target_name === null) {
            chat(character, '"target" parameter is missing');
            return;
        }

        const target_character = get_character_by_name(target_name);
        if (target_character === null) {
            return;
        }

        add_persistent_effect(character, ability, target_character, 60, Ordering(), RollTime.DEFAULT, false,
            function (char, roll, parameters) {
                roll.add_skill_bonus(Skill.ALL, 30);
                return true;
            });

        const ability_info = get_ability_info(ability);
        chat(character, ability_block_format.format(ability, ability_info['class'], ability_info.description.join('\n')));
    }


    function symbiote_strengthen_soul(character, ability, parameters) {
        const target_name = get_parameter('target', parameters);
        if (target_name === null) {
            chat(character, '"target" parameter is missing');
            return;
        }

        const target_character = get_character_by_name(target_name);
        if (target_character === null) {
            return;
        }

        const source = character.name;
        add_persistent_effect(character, ability, target_character, 6, Ordering(), RollTime.DEFAULT, false,
            function (char, roll, parameters) {
                roll.add_multiplier(0.5, Damage.ALL, source);
                return true;
            });

        const ability_info = get_ability_info(ability);
        chat(character, ability_block_format.format(ability, ability_info['class'], ability_info.description.join('\n')));
    }


    function warrior_charge(character, ability, parameters) {
        const parameter = get_parameter('targets', parameters);
        if (parameter === null) {
            chat(character, '"targets" parameter, the list of affected players, is missing');
            return;
        }

        const target_names = parameter.split(',');
        for (let i = 0; i < target_names.length; i++) {
            const fake_msg = {'who': target_names[i], 'id': ''};
            const target_character = get_character(fake_msg);
            if (target_character === null) {
                return;
            }

            const source = character.name;
            add_persistent_effect(character, ability, target_character, 1, Ordering(), RollTime.DEFAULT, false,
                function (char, roll, parameters) {
                    roll.add_multiplier(0.5, Damage.ALL, source);
                    return true;
                });
        }

        const ability_info = get_ability_info(ability);
        chat(character, ability_block_format.format(ability, ability_info['class'], ability_info.description.join('\n')));
    }


    function warrior_cut_down(character, ability, parameters) {
        const choice = get_parameter('choice', parameters);
        if (choice === null) {
            chat(character, '"choice {first/second/both}" parameter is missing');
            return;
        }

        if (choice === 'first' || choice === 'both') {
            const roll = new Roll(character, RollType.PHYSICAL);
            roll.add_damage('3d10', Damage.PHYSICAL);
            add_scale_damage(character, roll);

            roll_crit(roll, parameters, function (crit_section) {
                do_roll(character, ability, roll, parameters, crit_section);
            });
        }

        if (choice === 'second' || choice === 'both') {
            const roll = new Roll(character, RollType.PHYSICAL);
            roll.add_damage('3d10', Damage.PHYSICAL);
            add_scale_damage(character, roll);

            roll_crit(roll, parameters, function (crit_section) {
                do_roll(character, ability, roll, parameters, crit_section);
            });
        }
    }


    function warlord_hookshot(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('5d10', Damage.PHYSICAL);
        add_scale_damage(character, roll);
        roll.add_effect('Pull target 20 ft towards you');

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    // TODO there is another half of this passive
    function warrior_warleader(character, ability, parameters) {
        const target_name = get_parameter('target', parameters);
        if (target_name === null) {
            chat(character, '"target" parameter, the affected player, is missing');
            return;
        }

        const target_character = get_character_by_name(target_name);
        if (target_character === null) {
            return;
        }

        const source = character.name;
        add_persistent_effect(character, ability, target_character, 1, Ordering(), RollTime.DEFAULT, true,
            function (char, roll, parameters) {
                roll.add_multiplier(0.25, Damage.ALL, source);
                return true;
            });

        const clazz = get_passive_class(ability);
        chat(character, ability_block_format.format(ability, 'Warleader', clazz.passive['Warleader']));
    }


    const abilities_processors = {
        'Air Duelist': {
            'Arc of Air': air_duelist_arc_of_air,
            'Cutting Winds': air_duelist_cutting_winds,
            'Mistral Bow': air_duelist_mistral_bow,
        },
        'Aquamancer': {
            'Baptise': aquamancer_baptise,
            'Tidal Wave': aquamancer_tidal_wave,
            'Draught of Vigor': aquamancer_draught_of_vigor,
        },
        'Arcanist': {
            'Magic Dart': arcanist_magic_dart,
            'Magic Primer': arcanist_magic_primer,
        },
        'Assassin': {
            'Backstab': assassin_backstab,
            'Focus': assassin_focus,
            'Haste': print_ability_description,
            'Massacre': assassin_massacre,
            'Pursue': print_ability_description,
            'Sharpen': assassin_sharpen,
            'Skyfall': assassin_skyfall,
            'Vanish': print_ability_description,
        },
        'Captain': {
            'Inspirational Speech': captain_inspirational_speech,
        },
        'Champion': {
            'Disarming Blow': champion_disarming_blow,
            'Master of Arms': champion_master_of_arms,
            'Piercing Blow': champion_piercing_blow,
            'Skull Bash': champion_skull_bash,
            'Slice and Dice': champion_slice_and_dice,
        },
        'Cryomancer': {
            'Aurora Beam': cryomancer_aurora_beam,
            'Extinguish': print_ability_description,
            'Flash Freeze': print_ability_description,
            'Freezing Wind': print_ability_description,
            'Frozen Arena': print_ability_description,
            'Glacial Crash': cryomancer_glacial_crash,
            'Heart of Ice': print_ability_description,
            'Hypothermia': print_ability_description,
            'Ice Crafting': print_ability_description,
            'Ice Spear': cryomancer_ice_spear,
        },
        'Daggerspell': {
            'Fadeaway Slice': daggerspell_fadeaway_slice,
            'Exposing Tear': daggerspell_exposing_tear,
            'Hidden Blade': daggerspell_hidden_blade,
        },
        'Demon Hunter': {
            // TODO May want a "marked" parameter for Essence Scatter
            // 'Demonbane Blast': demon_hunter_demonbane_blast,
            // 'Banishing Bolt': demon_hunter_banishing_bolt,
            // "Hunter's Guile": demon_hunter_hunters_guile,
            'Essence Scatter': print_ability_description,
            // 'Lifesteal Elegy': demon_hunter_lifesteal_elegy,
        },
        'Destroyer': {
            'Challenge': destroyer_challenge,
            'Rampage': destroyer_rampage,
            'Slam': destroyer_slam,
        },
        'Dragoncaller': {
            'Summon Bronze Dragon': dragoncaller_summon_bronze_dragon,
            'Bronze Dragon Breath': dragoncaller_bronze_dragon_breath,
        },
        'Dynamancer': {
            'Spark Bolt': dynamancer_spark_bolt,
        },
        'Enchanter': {
            'Mint Coinage': print_ability_description,
            'Modify Weapon': enchanter_modify_weapon,
            'Reconstruct Barrier': print_ability_description,
        },
        'Evangelist': {
            'Magia Erebia': evangelist_magia_erebia,
        },
        'Juggernaut': {
            'Wild Swing': juggernaut_wild_swing,
            'Hostility': juggernaut_hostility,
            'Tachycardia': juggernaut_tachycardia,
        },
        'Ki Monk': {
            'Spirit Punch': ki_monk_spirit_punch,
            'Drain Punch': ki_monk_drain_punch,
            'Spirit Shotgun': ki_monk_spirit_shotgun,
        },
        'Lightning Duelist': {
            'Arc Lightning': lightning_duelist_arc_lightning,
            'Blade Storm': lightning_duelist_blade_storm,
            'Shock Tendrils': lightning_duelist_shock_tendrils,
            'Shocking Parry': lightning_duelist_shocking_parry,
            'Sword of Lightning': lightning_duelist_sword_of_lightning,
        },
        'Martial Artist': {
            'Focus Energy': print_ability_description,
            'Choke Hold': martial_artist_choke_hold,
            'Flying Kick': martial_artist_flying_kick,
        },
        'Noxomancer': {
            'Darkbomb': noxomancer_darkbomb,
            'Defile': print_ability_description,  // TODO this maybe could do more
            'Siphon Soul': print_ability_description,  // TODO this maybe could do more
        },
        'Pyromancer': {
            'Banefire': pyromancer_banefire,
            'Magma Spray': pyromancer_magma_spray,
            'Pyroblast': print_ability_description,
        },
        'Sentinel': {
            'Crossguard Guillotine': sentinel_crossguard_guillotine,
            'Parallel Shields': print_ability_description,
        },
        'Sniper': {
            'Analytical Shooter': sniper_analytical_shooter,
            'Distance Shooter': sniper_distance_shooter,
            'Kill Shot': sniper_kill_shot,
            'Piercing Shot': sniper_piercing_shot,
            'Precision Shooter': sniper_precision_shooter,
            'Shrapnel Shot': sniper_shrapnel_shot,
            'Swift Shot': sniper_swift_shot,
            'Swift Sprint': print_ability_description,
        },
        'Soldier': {
            'Biding Blade': soldier_biding_blade,
            'Dodge Roll': print_ability_description,
            'Double Time': soldier_double_time,
            'Fleetfoot Blade': soldier_fleetfoot_blade,
            'Intercept': print_ability_description,
            'Steadfast Strikes': soldier_steadfast_strikes,
        },
        'Symbiote': {
            'Empower Soul': symbiote_empower_soul,
            'Power Spike': symbiote_power_spike,
            'Strengthen Body': symbiote_strengthen_body,
            'Strengthen Mind': symbiote_strengthen_mind,
            'Strengthen Soul': symbiote_strengthen_soul,
        },
        'Warlord': {
            'Hookshot': warlord_hookshot,
            'Weapon Swap: Roll': print_ability_description,
        },
        'Warrior': {
            '"Charge!"': warrior_charge,
            'Cut Down': warrior_cut_down,
            '"Fight Me!"': print_ability_description,  // TODO this maybe could do more
            'Reinforce Armor': print_ability_description,  // TODO this could do more
            'Shields Up': print_ability_description,
            'Warleader': warrior_warleader,
        }
    };


    function process_ability(msg) {
        const character = get_character(msg);
        if (character === null) {
            sendChat(msg.who, 'error, unknown character for ' + msg.who);
            return;
        }

        const pieces = msg.content.split(' ');
        const options = pieces.slice(2).join(' ');
        const option_pieces = options.split(';');
        const clazz = option_pieces[0];
        const ability = option_pieces[1];
        const parameters = option_pieces.slice(2);
        parameters.forEach(function (parameter, index, self) {
            self[index] = parameter.trim();
        });

        // Verify that we know how to handle this class + ability combo
        if (!(clazz in abilities_processors)) {
            chat(msg, 'unknown class %s'.format(clazz));
            return;
        }
        if (!(ability in abilities_processors[clazz])) {
            chat(msg, 'unknown ability %s'.format(ability));
            return;
        }

        // Double check that the class and ability names are correct based on the master components list
        if (!(clazz in BarbsComponents.classes)) {
            _log(LogLevel.WARN, 'Mismatched class %s'.format(clazz));
        }
        if (!(BarbsComponents.classes[clazz].abilities.includes(ability))
                && Object.keys(BarbsComponents.classes[clazz].passive)[0] !== ability) {
            _log(LogLevel.WARN, 'Mismatched ability %s'.format(ability));
        }

        const processor = abilities_processors[clazz][ability];
        processor(character, ability, parameters);
    }


    // ################################################################################################################
    // Turn order tracking


    /*
     * Returns an object like this:
     * [
     *     {"id":"-M-C5a0xiYo2A1bLNuZg","pr":"0","custom":"","_pageid":"-LjmruGu018C64mngzAF"},
     *     {"id":"-M3TKw8c9XOY5jkr5MUn","pr":-1,"custom":"","pageid":"-LjmruGu018C64mngzAF","_pageid":"-LjmruGu018C64mngzAF"},
     *     {"id":"-M0_UPCxQT49IBrQe1Ex","pr":"0","custom":"","_pageid":"-LjmruGu018C64mngzAF"}
     * ]
     *
     * or an empty array, if there is no turn order.
     */
    function get_turn_order() {
        const turn_order = Campaign().get('turnorder');
        if (turn_order === '') {
            return [];
        } else {
            return Array.from(JSON.parse(turn_order));
        }
    }


    /*
     * Returns an object like this:
     * {
     *    "id":"-M-C5a0xiYo2A1bLNuZg",
     *    "pr":"0",
     *     "custom":"",
     *     "_pageid":"-LjmruGu018C64mngzAF"
     * }
     */
    function get_current_turn() {
        return get_turn_order().shift();
    }


    function wait_for_turn_order_change(handler) {
        assert_not_null(handler, 'wait_for_turn_order_change() handler');

        const turn = get_current_turn();
        if (turn.id === state[STATE_NAME][LAST_TURN_ID]) {
            setTimeout(function () {
                wait_for_turn_order_change(handler);
            }, 100);
            return;
        }

        handler();
    }


    function get_name_from_token_id(id) {
        assert_not_null(id, 'get_name_from_token_id() id');

        _log(LogLevel.DEBUG, 'get name for ' + id);

        const token = getObj('graphic', id);
        if (token === null || token === undefined) {
            _log(LogLevel.DEBUG, 'no token found for id ' + id);
            return null;
        }

        const token_name = token.get('name');
        if (token_name === null) {
            _log(LogLevel.DEBUG, 'token_name is null, token=' + token);
            return null;
        }

        return token_name;
    }


    function do_turn_order_change() {
        const turn = get_current_turn();
        _log(LogLevel.INFO, 'turn order changed ' + turn.id);
        if (turn.id === state[STATE_NAME][LAST_TURN_ID]) {
            _log(LogLevel.DEBUG, 'no real turn order change');
            return;
        }

        const current_name = get_name_from_token_id(turn.id);
        if (current_name === null) {
            return;
        }

        // CombatTracker adds a placeholder entry in the turn order that counts the rounds. If the turn is this
        // entry, CombatTracker will advance the turn order to the next one automatically. We should wait for this
        // change, so that we do our handling on an actual character's turn.
        if (current_name.includes('Round')) {
            setTimeout(function () {
                wait_for_turn_order_change(do_turn_order_change);
            }, 100);
            _log(LogLevel.DEBUG, 'CombatTracker token ignored');
            return;
        }

        const last_turn_id = state[STATE_NAME][LAST_TURN_ID];
        state[STATE_NAME][LAST_TURN_ID] = turn.id;

        const current_character = get_character_by_name(current_name);
        if (current_character === null) {
            return;
        }

        // End effects cast by the character who is currently up
        for (let i = 0; i < persistent_effects.length; i++) {
            // TODO: why is this necessary?
            if (persistent_effects[i].caster !== current_character.name) {
                continue;
            }

            if (persistent_effects[i].single_application) {
                continue;
            }

            if (persistent_effects[i].duration === 0) {
                _log(LogLevel.INFO, 'Persistent effect %s on %s ended'.format(persistent_effects[i].name,
                                                                              persistent_effects[i].target));
                persistent_effects.splice(i, 1);
                i--;
            }

            persistent_effects[i].duration -= 1;
        }

        // End effects when a character's turn ends. No decrement here, just get rid of ones with 0 duration.
        if (last_turn_id !== '') {
            const previous_name = get_name_from_token_id(last_turn_id);
            if (previous_name === null) {
                return;
            }

            const previous_character = get_character_by_name(previous_name);
            if (previous_character === null) {
                return;
            }

            for (let i = 0; i < persistent_effects.length; i++) {
                if (persistent_effects[i].caster !== previous_character.name) {
                    continue;
                }

                if (persistent_effects[i].single_application) {
                    continue;
                }

                if (persistent_effects[i].duration === 0) {
                    _log(LogLevel.INFO, 'Persistent effect %s on %s ended'.format(persistent_effects[i].name,
                                                                                  persistent_effects[i].target));
                    persistent_effects.splice(i, 1);
                    i--;
                }
            }
        }
    }


    /*
     * current = {
     *     "_type":"campaign",
     *     "turnorder": [
     *         {"id":"-M-C5a0xiYo2A1bLNuZg","pr":"0","custom":"","_pageid":"-LjmruGu018C64mngzAF"},
     *         {"id":"-M3TKw8c9XOY5jkr5MUn","pr":-1,"custom":"","pageid":"-LjmruGu018C64mngzAF","_pageid":"-LjmruGu018C64mngzAF"},
     *         {"id":"-M0_UPCxQT49IBrQe1Ex","pr":"0","custom":"","_pageid":"-LjmruGu018C64mngzAF"}
     *     ],
     *     "initiativepage":"-LjmruGu018C64mngzAF",
     *     "playerpageid":"-LjmruGu018C64mngzAF",
     *     "playerspecificpages":false,
     *     ...
     * }
     *
     * previous = {
     *     "_type":"campaign",
     *     "turnorder":"[
     *         {"id":"-M0_UPCxQT49IBrQe1Ex","pr":"0","custom":"","_pageid":"-LjmruGu018C64mngzAF"},
     *         {"id":"-M-C5a0xiYo2A1bLNuZg","pr":"0","custom":"","_pageid":"-LjmruGu018C64mngzAF"},
     *         {"id":"-M3TKw8c9XOY5jkr5MUn","pr":-1,"custom":"","pageid":"-LjmruGu018C64mngzAF","_pageid":"-LjmruGu018C64mngzAF"}
     *     ]",
     *     "initiativepage":"-LjmruGu018C64mngzAF",
     *     "playerpageid":"-LjmruGu018C64mngzAF",
     *     "playerspecificpages":false,
     *     ...
     * }
     */
    function handle_turn_order_change(current, previous) {
        // current and previous are json blobs for the Campaign object.
        if (current.get('turnorder') === previous.turnorder) {
            return;
        }

        const turn_order = (current.get('turnorder') === '') ? [] : JSON.parse(current.get('turnorder'));
        const previous_turn_order = (previous.turnorder === '') ? [] : JSON.parse(previous.turnorder);

        // If we have a previous and current turn order, and the item at the top of the turn order is different, the
        // order has changed.
        if (turn_order.length > 0 && previous_turn_order.length > 0 && turn_order[0].id !== previous_turn_order[0].id) {
            do_turn_order_change();
        }
    }


    // ################################################################################################################
    // Basic setup and message handling


    const subcommand_handlers = {
        'item': roll_item,
        'stat': roll_stat,
        'skill': roll_skill,
        'initiative': roll_initiative,
        'concentration': roll_concentration,
        'ability': process_ability,
        'list_effects': list_persistent_effects,
        'remove_effect': remove_persistent_effect,
    };


    function handle_input(msg) {
        // Regular API call
        if (msg.content.startsWith('!')) {
            if (msg.content === '!ct next') {
                // A masterful hack. CombatTracker is an API script that will update the turn order when a player
                // clicks a button to say their turn is done. As this is the API modifying the turn order, it does
                // not trigger the 'change:campaign:turnorder' event. To catch this turn order change, we look for the
                // CombatTracker API command to go to the next turn, '!ct next', and then schedule our work to occur
                // asynchronously after 1s. We're assuming that CombatTracker will complete it's updates within this
                // time.
                //
                setTimeout(function () {
                    wait_for_turn_order_change(do_turn_order_change);
                }, 100);
                return;
            }

            const pieces = msg.content.split(' ');
            if (pieces.length < 2) {
                return;
            }

            const main_command = pieces[0];
            if ('!barbs' !== main_command) {
                return;
            }

            _log(LogLevel.INFO, 'API call: who=%s, message="%s"'.format(msg.who, msg.content));

            const sub_command = pieces[1];
            if (!(sub_command in subcommand_handlers)) {
                chat(msg, 'unknown barbs subcommand %s'.format(sub_command));
                return;
            }

            const processor = subcommand_handlers[sub_command];
            processor(msg);
        }

        // TODO: There are some abilities, like something in Demon Hunter, where we'd like to get back the result of a
        //  roll after it's been sent and after tha API call is done. We can react to any message, not just API-type
        //  messages, so we can do this. Add a list of abilities that have "secondary activations" in the API, and look
        //  for them here.
    }


    const register_event_handlers = function () {
        // Set up permanent state
        if (!(STATE_NAME in state)) {
            state[STATE_NAME] = {};
            state[STATE_NAME][LAST_TURN_ID] = '';
        }

        on('chat:message', handle_input);
        on('change:campaign:turnorder', handle_turn_order_change);
        _log(LogLevel.INFO, 'Barbs API ready');
    };


    return {
        register_event_handlers,
    };
})();


on('ready', () => {
    'use strict';

    Barbs.register_event_handlers();
});
