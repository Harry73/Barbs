var Barbs = Barbs || (function () {
    'use strict';


    // ################################################################################################################
    // Imports


    const assert = BarbsComponents.assert;
    const assert_not_null = BarbsComponents.assert_not_null;
    const assert_type = BarbsComponents.assert_type;
    const assert_enum = BarbsComponents.assert_enum;
    const assert_numeric = BarbsComponents.assert_numeric;
    const parse_int = BarbsComponents.parse_int;
    const trim_percent = BarbsComponents.trim_percent;
    const trim_all = BarbsComponents.trim_all;
    const remove_empty = BarbsComponents.remove_empty;
    const LOG = BarbsComponents.LOG;
    const CHARACTER_NAME_VARIANTS = BarbsComponents.CHARACTER_NAME_VARIANTS;
    const Stat = BarbsComponents.Stat;
    const HiddenStat = BarbsComponents.HiddenStat;
    const SkillObject = BarbsComponents.SkillObject;
    const Skill = BarbsComponents.Skill;
    const get_skill_by_name = BarbsComponents.get_skill_by_name;
    const conditions = BarbsComponents.conditions;
    const crowd_control_conditions = BarbsComponents.crowd_control_conditions;
    const classes = BarbsComponents.classes;
    const ElementalDamage = BarbsComponents.ElementalDamage;
    const Damage = BarbsComponents.Damage;
    const get_damage_from_type = BarbsComponents.get_damage_from_type;
    const RollType = BarbsComponents.RollType;
    const RollTime = BarbsComponents.RollTime;
    const Roll = BarbsComponents.Roll;
    const EffectType = BarbsComponents.EffectType;
    const ItemType = BarbsComponents.ItemType;
    const ItemSlot = BarbsComponents.ItemSlot;
    const ItemScalar = BarbsComponents.ItemScalar;
    const Duration = BarbsComponents.Duration;
    const Item = BarbsComponents.Item;
    const Affix = BarbsComponents.Affix;
    const Character = BarbsComponents.Character;


    // ################################################################################################################
    // Constants


    const STATE_NAME = 'Barbs';
    const LAST_TURN_ID = 'last_turn_id';
    const MESSAGE_LOG = 'message_log';
    const MESSAGE_LOG_INDEX = 'message_log_index';
    const MESSAGE_LOG_SIZE = 20;

    const initiative_format = '&{template:5eDefault} {{name=Initiative}} {{title=Initiative}} {{subheader=%s}} {{rollname=Initiative}} {{roll=[[%s+%s+%s]]}}';
    const total_format = '&{template:default} {{name=%s}} {{%s=[[%s]]}}';
    const regen_format = '&{template:default} {{name=%s}} {{%s=[[round([[%s]]*[[(%s)/100]])]]}}';
    const percent_format = '&{template:default} {{name=%s}} {{%s (%s%)=[[1d100cs>[[100-round(%s)+1)]]]]}}';

    const roll_format = '&{template:Barbs} {{name=%s}} %s %s %s %s %s';
    const damage_section_format = '{{%s=[[%s]]}}';
    const crit_section_format = '{{crit_value=[[%s]]}} {{crit_cutoff=[[%s]]}} {{crit_chance=%s}} {{modified_crit=[[%s-%s]]}}';
    const combo_section_format = '{{combo_chance=%s}} {{combo=[[d100cs>%s]]}}';
    const effects_section_format = '{{effects=%s}}';

    const ability_block_format = '&{template:5eDefault} {{spell=1}} {{title=%s}} {{subheader=%s}} 0 {{abilityshowdesc=1}} {{abilitydescription=%s }} 0 0 0 0 0 0 0';

    const ARMOR_SLOTS = [ItemSlot.HEAD, ItemSlot.BODY, ItemSlot.HANDS, ItemSlot.FEET];

    let persistent_effects = [];

    let record_messages_ = false;
    let sent_messages_ = [];
    let received_messages_ = [];


    // ################################################################################################################
    // Functional


    // Basic python-like string formatting
    String.prototype.format = function () {
        let a = this;
        for (let i = 0; i < arguments.length; i++) {
            a = a.replace('%s', arguments[i]);
        }
        return a;
    };


    function raw_chat(sender, message, handler) {
        assert_not_null(sender, 'raw_chat() sender');
        assert_not_null(message, 'raw_chat() message');

        if (handler === undefined || handler === null) {
            const message_name = message.match(/{{name=.*?}}/g);
            if (message_name !== null) {
                sent_messages_.push(message_name[0]);
            }
        }

        sendChat(sender, message, handler);
    }


    function chat(character, message, handler) {
        assert_not_null(character, 'chat() character');
        assert_not_null(message, 'chat() message');

        raw_chat(character.who, message, handler);
    }


    // Split a string by sep and keep sep as an element in the result
    function split_string(string, sep) {
        assert_not_null(string, 'split_string() string');
        assert_not_null(sep, 'split_string() sep');

        let array = string.split(sep);
        let new_array = [];
        for (let i = 0; i < array.length; i++) {
            const item = array[i];
            new_array.push(item);
            if (i !== array.length - 1) {
                new_array.push(sep);
            }
        }

        return new_array;
    }


    // Split elements in an array using splitString
    function split_array(array, sep) {
        assert_not_null(array, 'split_array() array');
        assert_not_null(sep, 'split_array() sep');

        let new_array = [];
        for (let index = 0; index < array.length; index++) {
            const item = array[index];
            if (item.includes(sep) && sep !== item) {
                let temp_array = split_string(item, sep);
                for (let j = 0; j < temp_array.length; j++) {
                    new_array.push(temp_array[j]);
                }
            } else {
                new_array.push(item);
            }
        }

        return new_array;
    }


    function occurrences(string, pattern) {
        assert_not_null(string, 'occurrences() string');
        assert_not_null(pattern, 'occurrences() pattern');

        if (pattern.length <= 0) {
            return string.length + 1;
        }

        let count = 0;
        let position = 0;
        const step = pattern.length;

        while (true) {
            position = string.indexOf(pattern, position);
            if (position < 0) {
                break;
            }

            count++;
            position += step;
        }
        return count;
    }


    function collect_logs(handler) {
        assert_not_null(handler, 'collect_logs() handler');

        // Temporarily change Item and Affix's loggers to something that lets us save the error messages.
        const errors = [];
        class Collector {
            static trace() {
            }
            static debug() {
            }
            static info() {
            }
            static warn(string) {
                assert_not_null(string, 'warn() string');
                errors.push(string);
            }
            static error(string) {
                assert_not_null(string, 'error() string');
                errors.push(string);
            }
        }
        Item.LOGGER = Collector;
        Affix.LOGGER = Collector;

        handler();

        // Revert the logger hack
        Item.LOGGER = LOG;
        Affix.LOGGER = LOG;

        return errors;
    }


    // ################################################################################################################
    // Character lookup


    function get_proper_character_names(name_to_find) {
        const matched_character_names = [];
        Object.keys(CHARACTER_NAME_VARIANTS).forEach(function (proper_character_name) {
            const name_variants = CHARACTER_NAME_VARIANTS[proper_character_name];
            for (let i = 0; i < name_variants.length; i++) {
                if (name_variants[i] === name_to_find) {
                    matched_character_names.push(proper_character_name);
                }
            }
        });

        return matched_character_names;
    }


    // If 'ignore_failure' is false, this method will always return a Character object. It will throw an exception if
    // no matching character is found. If 'ignore_failure' is true, this method may return null if no matching
    // character is found.
    function get_character(name_to_find, ignore_failure = false) {
        assert_not_null(name_to_find, 'get_character_from_msg() msg');

        const character_names = get_proper_character_names(name_to_find);

        let game_character_objects = [];
        for (let i = 0; i < character_names.length; i++) {
            const objects = findObjs({
                _type: 'character',
                name: character_names[i]
            });

            game_character_objects = game_character_objects.concat(objects);
        }

        if (game_character_objects.length === 0) {
            if (!ignore_failure) {
                assert(false, 'Error, did not find a character for ' + name_to_find);
            } else {
                return null;
            }
        } else if (game_character_objects.length > 1) {
            // warn, but pray we've got the right ones regardless
            LOG.warn('Found ' + game_character_objects.length + ' matching characters for ' + name_to_find);
        }

        if (game_character_objects[0] === undefined || game_character_objects[0] === null) {
            if (!ignore_failure) {
                assert(false, 'character 0 is undefined');
            } else {
                return null;
            }
        }

        return new Character(game_character_objects[0], name_to_find);
    }


    // This method is ONLY for use at the very beginning of top-level request processor methods.
    function get_character_from_msg(msg) {
        assert_not_null(msg, 'get_character_from_msg() msg');

        // We've allowing two patterns here:
        //   1) The character's name is explicitly passed in, surrounded by "$" to identify it. In this case,
        //       we pick out the name and remove it from the original message.
        const match = msg.content.match(/\$.*?\$( ?)/);
        if (match !== null) {
            msg.content = msg.content.replace(match[0], '');
            const character_name = match[0].trim().split('$')[1];
            return get_character(character_name);
        }

        //   2) The character's name is not provided. We will attempt to deduce it based on who spoke the message.
        return get_character(msg.who);
    }


    // ################################################################################################################
    // Parameter helpers


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


    function get_target_characters(parameter_key, parameters) {
        assert_not_null(parameter_key, 'get_target_characters() parameter_key');
        assert_not_null(parameters, 'get_target_characters() parameters');

        const parameter = get_parameter(parameter_key, parameters);
        assert(parameter !== null, '"%s" parameter, the target player(s), is required', parameter_key);

        const target_names = remove_empty(trim_all(parameter.split(',')));
        const target_characters = [];
        for (let i = 0; i < target_names.length; i++) {
            const target_character = get_character(target_names[i]);
            target_characters.push(target_character);
        }

        return target_characters;
    }


    function get_target_character(parameter_key, parameters) {
        const target_characters = get_target_characters(parameter_key, parameters);
        assert(target_characters.length === 1, 'Expected exactly 1 target player for "%s" parameter', parameter_key);
        return target_characters[0];
    }


    // ################################################################################################################
    // Non-attack rolls


    function get_roll_with_items_and_effects(character) {
        assert_type(character, Character, 'get_roll_with_items_and_effects() character');

        const roll = new Roll(character, RollType.ALL);

        // Any effect that might modify a stat, skill, or concentration roll should not depend on whether or not a roll
        // is a crit. Thus, all of these effects should be applied at DEFAULT time.
        const roll_time = RollTime.DEFAULT;

        // Apply effects from items that have the proper roll time
        character.items.push(character.main_hand);
        character.items.push(character.offhand);
        for (let i = 0; i < character.items.length; i++) {
            const item = character.items[i];
            if (item === null) {
                continue;
            }

            for (let j = 0; j < item.effects.length; j++) {
                if (item.effects[j].roll_time === roll_time) {
                    item.effects[j].apply(roll);
                }
            }
        }

        // Apply persistent effects that have the proper roll time
        for (let i = 0; i < persistent_effects.length; i++) {
            if (persistent_effects[i].target === character.name && persistent_effects[i].roll_time === roll_time) {
                let func = persistent_effects[i].handler;
                if (persistent_effects[i].effectiveness !== 1) {
                    func = make_handler_effective(character, func, /*parameters=*/[],
                                                  persistent_effects[i].effectiveness);
                }

                func(character, roll, /*parameters=*/[]);
            }
        }

        return roll;
    }


    function get_stat_roll_modifier(character, roll, stat) {
        assert_type(character, Character, 'generate_stat_roll_modifier_from_items() character');
        assert_type(roll, Roll, 'generate_stat_roll_modifier_from_items() roll');
        assert_not_null(stat, 'generate_stat_roll_modifier_from_items() stat');

        const attribute = parse_int(getAttrByName(character.id, stat.attr_tla));
        let mod = '%s'.format(stat.value(attribute));

        if (stat.name in roll.stats) {
            mod = '%s+%s'.format(mod, roll.stats[stat.name]);
        }

        if (stat.name in roll.stat_multipliers) {
            mod = '(%s)*(1+%s)'.format(mod, roll.stat_multipliers[stat.name]);
        }

        assert_numeric(mod, 'Non-numeric stat roll modifier "%s"', mod);
        return mod;
    }


    function get_token(character) {
        assert_type(character, Character, 'get_token() msg');

        /*
            [{
                "_id":"-M6lgdQEUXiMKuXgZlLM",
                "_pageid":"-Lk6uhdRWP32g0OY4nCe",
                ...
                "name":"Janatris",
                ...
                "represents":"-Ljms24S-oCLvsIB_tEn",
                ...
           }]
        */
        const tokens = findObjs({_type: 'graphic', represents: character.id});
        if (tokens === undefined || tokens === null || tokens.length <= 0) {
            LOG.warn('No tokens found for character %s'.format(character.name));
            return null;
        }

        // Filter by player-active page id, in case there are multiple tokens strewn about multiple pages
        const filtered_by_page_id = [];
        const page_id = Campaign().get('playerpageid');
        for (let i = 0; i < tokens.length; i++) {
            const token_page_id = tokens[i].get('_pageid');
            if (token_page_id === page_id) {
                filtered_by_page_id.push(tokens[i]);
            } else {
                LOG.debug('Token for character %s on wrong page %s, looking for page %s'.format(
                    character.name, token_page_id, page_id));
            }
        }

        if (filtered_by_page_id.length === 0) {
            LOG.error('Did not find token for character %s on this page'.format(character.name));
            return null;
        } else if (filtered_by_page_id.length === 1) {
            return filtered_by_page_id[0];
        }

        // Filter by the character's first name, if multiple tokens are found for the character. This should really
        // only be necessary for Nightside.
        const filtered_by_name = [];
        for (let i = 0; i < filtered_by_page_id.length; i++) {
            const character_first_name = character.name.split(' ')[0];
            const token_name = filtered_by_page_id[i].get('name');
            if (token_name.startsWith(character_first_name)) {
                filtered_by_name.push(filtered_by_page_id[i]);
            } else {
                LOG.debug('Found token for character %s with wrong name %s'.format(character.name, token_name));
            }
        }

        if (filtered_by_name.length === 1) {
            return filtered_by_name[0];
        } else if (filtered_by_name.length === 0) {
            LOG.error('Found tokens for character %s, but no names matched'.format(character.name));
        } else {
            LOG.error('Found mutiple tokens for character %s, please remove all but one'.format(character.name));
        }

        return null;
    }


    function roll_initiative(msg) {
        assert_not_null(msg, 'roll_initiative() msg');

        const character = get_character_from_msg(msg);
        const roll = get_roll_with_items_and_effects(character);
        chat(character, '[[d100]]', function (results) {
            const rolls = results[0].inlinerolls;
            const initiative_roll = rolls[0].results.total;

            const token = get_token(character);
            if (token === null) {
                return;
            }

            chat(character, initiative_format.format(character.name, initiative_roll, roll.initiative_bonus,
                                                     character.get_attribute('AGI')));

            const initiative = initiative_roll + roll.initiative_bonus + character.get_attribute('AGI');

            let turn_order = Campaign().get('turnorder');
            if (turn_order === '') {
                turn_order = [];
            } else {
                turn_order = JSON.parse(turn_order);
            }

            // Update existing entry in the turn order, if one exists
            for (let i = 0; i < turn_order.length; i++) {
                if (turn_order[i].id === token.id) {
                    turn_order[i].pr = initiative.toString();
                    Campaign().set('turnorder', JSON.stringify(turn_order));
                    return;
                }
            }

            // Otherwise, add a new entry to the turn order
            turn_order.push({
                id: token.id,
                pr: initiative.toString(),
                custom: character.name
            });
            Campaign().set('turnorder', JSON.stringify(turn_order));
        });
    }


    function roll_stat(msg) {
        assert_not_null(msg, 'roll_stat() msg');

        const character = get_character_from_msg(msg);
        const stat = Stat[msg.content.split(' ')[2].toUpperCase()];
        const roll = get_roll_with_items_and_effects(character);
        const modifier = get_stat_roll_modifier(character, roll, stat);
        const numeric_modifier = eval(modifier);
        assert_numeric(numeric_modifier, 'Non-numeric stat roll modifier "%s", something went wrong', modifier);

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
                chat(character, percent_format.format('Evasion', 'Evasion', numeric_modifier,
                                                      Math.min(101, numeric_modifier)));
                break;

            case Stat.MAGIC_RESIST.name:
                let result = '&{template:Barbs} {{name=Magic Resists}} {{general=[[round(%s)]]}}'.format(modifier);
                const keys = Object.keys(ElementalDamage);
                for (let i = 0; i < keys.length; i++) {
                    const type = ElementalDamage[keys[i]];
                    if (type in roll.magic_resists) {
                        const value = roll.magic_resists[type];
                        result = result + ' {{%s=[[round(%s)]]}}'.format(type, value);
                    }
                }

                chat(character, result);
                break;

            case Stat.CONDITION_RESIST.name:
                const msg_format = '&{template:Barbs} {{name=Condition Resist}} ' +
                    '{{effects=<li>General CR: [[1d100cs>[[100-(%s)+1]]]]</li>}} {{button=%s}}';

                const options = conditions.join('|');
                let button_section = '<a href="!barbs cr $%s$ ?{Condition|%s}">Specific Condition CR</a>'.format(
                    character.name, options);

                chat(character, msg_format.format(modifier, button_section));
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
                chat(character, percent_format.format('Critical Hit Chance', 'Crit', numeric_modifier,
                                                      Math.min(101, numeric_modifier)));
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


    function roll_condition_resist(msg) {
        assert_not_null(msg, 'roll_condition_resist() msg');

        const character = get_character_from_msg(msg);
        const roll = get_roll_with_items_and_effects(character);
        let total_cr = eval(get_stat_roll_modifier(character, roll, Stat.CONDITION_RESIST));

        const condition = msg.content.split(' ').slice(2).join(' ');
        const cleaned_condition = condition.toLowerCase().replace(/[()]/g, '');
        if (condition !== 'general' && cleaned_condition in roll.condition_resists) {
            total_cr += roll.condition_resists[cleaned_condition];
        }

        if (crowd_control_conditions.includes(condition)) {
            total_cr += roll.crowd_control_resist;
        }

        chat(character, percent_format.format(condition + ' Condition Resist', 'CR', total_cr,
                                              Math.min(101, total_cr)));
    }


    function damage_reduction(msg) {
        assert_not_null(msg, 'damage_reduction() msg');

        const character = get_character_from_msg(msg);

        let damage_strings = remove_empty(msg.content.split(' ')).slice(2);

        // Pick apart the damage strings, e.g. "light:5|5" into the damage type, damage taken, and
        // penetration on the damage.
        const damages_taken = {}
        const penetrations = {};
        for (let i = 0; i < damage_strings.length; i++) {
            const damage_string = damage_strings[i];
            if (!damage_string.includes(':')) {
                continue;
            }

            const pieces = trim_all(damage_string.split(':'));
            const damage_type = get_damage_from_type(pieces[0]);
            if (damage_type === null) {
                LOG.warn('what is this damage type %s'.format(pieces[0]));
                continue;
            }

            const values = pieces[1];
            if (values === '') {
                continue;
            }

            if (values.includes('|')) {
                const parts = trim_all(values.split('|'));
                damages_taken[damage_type] = parts[0] || 0;
                penetrations[damage_type] = parts[1] || 0;
            } else {
                damages_taken[damage_type] = values
            }
        }

        // Check given damages are numeric
        let types = Object.keys(damages_taken);
        for (let i = 0; i < types.length; i++) {
            const type = types[i];
            const given_value = damages_taken[type];
            assert_numeric(given_value, 'Non-numeric value "%s" for %s damage type', given_value, type);
        }

        // Check given penetrations are numeric
        types = Object.keys(penetrations);
        for (let i = 0; i < types.length; i++) {
            const type = types[i];
            const penetration = penetrations[type];
            assert_numeric(penetration, 'Non-numeric penetration value "%s" for %s damage type', penetration, type);
        }

        const roll = get_roll_with_items_and_effects(character);
        let total_ac = eval(get_stat_roll_modifier(character, roll, Stat.AC));
        const base_mr = eval(get_stat_roll_modifier(character, roll, Stat.MAGIC_RESIST));

        // Reduce given damages by relevant stats, with stats decreased by penetrations
        const reduced_damages = {};
        types = Object.keys(damages_taken);
        for (let i = 0; i < types.length; i++) {
            const damage_type = types[i];
            const damage_value = damages_taken[damage_type];
            const penetration_value = eval(penetrations[damage_type]) || 0;

            if (eval(damage_value) <= 0) {
                continue;
            }

            if (damage_type === Damage.PHYSICAL) {
                total_ac = Math.max(0, total_ac);

                let pen = penetration_value;
                pen = Math.max(0, pen);
                pen = Math.min(100, pen);

                let damage_taken = '(%s)-(%s*%s)'.format(damage_value, total_ac, 1 - pen / 100);
                if (eval(damage_taken) < 0) {
                    damage_taken = '0';
                }
                reduced_damages[Damage.PHYSICAL] = damage_taken;

            } else if (damage_type === Damage.PSYCHIC) {
                // TODO: psychic resistance / damage reduction is possible, handle it when we have classes that do this
                reduced_damages[Damage.PSYCHIC] = damage_value;

            } else {
                let total_mr = base_mr;
                if (damage_type in roll.magic_resists) {
                    total_mr += roll.magic_resists[damage_type];
                }
                total_mr -= penetration_value;
                total_mr = Math.max(0, total_mr);
                total_mr = Math.min(100, total_mr);

                reduced_damages[damage_type] = '(%s)*%s'.format(damage_value, Math.max(0, 1 - total_mr / 100));
            }
        }

        const gdr = Math.max(0, Math.min(100, roll.general_damge_reduction));

        // Build the roll and calculate the total
        let result = '&{template:Barbs} {{name=Damage Reduction}} '
        let total = 0;
        types = Object.keys(reduced_damages);
        for (let i = 0; i < types.length; i++) {
            const damage_type = types[i];
            const damage_value = '(%s)*%s'.format(reduced_damages[damage_type], (100 - gdr) / 100);
            result = result + '{{%s=[[round(%s)]]}}'.format(damage_type, damage_value);
            total = total + Math.max(0, Math.round(eval(damage_value)));
        }
        result = result + '{{total=[[%s]]}}'.format(total);

        LOG.info('Damage: ' + result);
        chat(character, result);
    }


    function roll_concentration(msg) {
        assert_not_null(msg, 'roll_concentration() msg');

        const character = get_character_from_msg(msg);

        // Proper concentration check
        const roll = get_roll_with_items_and_effects(character);
        const roll_string = 'd100+%s'.format(roll.concentration_bonus);
        chat(character, total_format.format('Concentration Check', 'Roll', roll_string));

        // Athletics: Pain Tolerance check, if the character has it
        const skills = character.get_skills();
        const skill_name = Skill.ATHLETICS_PAIN_TOLERANCE.name.toLowerCase();
        if (!(skill_name in skills)) {
            return;
        }

        const points_in_skill = skills[skill_name];
        do_skill_check(character, Skill.ATHLETICS_PAIN_TOLERANCE, 'Athletics: Pain Tolerance', points_in_skill);
    }


    function roll_skill(msg) {
        assert_not_null(msg, 'roll_skill() msg');

        const character = get_character_from_msg(msg);
        const pieces = msg.content.split(' ');
        const points_in_skill = parse_int(pieces[pieces.length - 1]);
        const given_skill_name = pieces.slice(2, pieces.length - 1).join(' ');
        const skill_name = given_skill_name.replace(/:/g, '').replace(/ /g, '_').toUpperCase();

        if (!(skill_name in Skill)) {
            chat(character, 'Error, skill "%s" not in skill-to-attribute map'.format(skill_name));
            return;
        }

        const skill = Skill[skill_name];
        do_skill_check(character, skill, given_skill_name, points_in_skill);
    }


    function roll_psionics_offensive(character) {
        const skills = character.get_skills();
        const skill_name = Skill.PSIONICS_OFFENSIVE.name.toLowerCase();
        if (!(skill_name in skills)) {
            chat(character, 'Attack has psychic damage but character does not have Psionics: Offensive. ' +
                'You auto-fail the Psionics check.');
            return;
        }

        const points_in_skill = skills[skill_name];
        do_skill_check(character, Skill.PSIONICS_OFFENSIVE, 'Psionics: Offensive', points_in_skill);
    }


    function do_skill_check(character, skill, skill_name, points_in_skill) {
        const bonus = 5 * points_in_skill;

        const attribute = character.get_attribute(skill.scaling_attr_tla);
        let bonus_string = '%s+%s'.format(bonus, attribute);

        const roll = get_roll_with_items_and_effects(character);
        if (skill.name in roll.skills) {
            bonus_string += '+%s'.format(roll.skills[skill.name]);
        }
        if (Skill.ALL.name in roll.skills) {
            bonus_string += '+%s'.format(roll.skills[Skill.ALL.name]);
        }

        let dice = 'd100';

        // Some abilities just love to be little stupid snowflakes. Deal with them here.
        assert_numeric(bonus_string, 'Skill bonus "%s" is non-numeric', bonus_string);
        for (let i = 0; i < persistent_effects.length; i++) {
            if (persistent_effects[i].target !== character.name) {
                continue;
            }

            if (persistent_effects[i].name === 'Vastwood Sovereignty') {
                if (eval(bonus_string) < 0) {
                    bonus_string = '0';
                } else {
                    bonus_string = '(1.5*(%s))'.format(bonus_string);
                }

                dice = '2d100d1';
            }
        }

        const roll_string = 'round(%s+%s)'.format(dice, bonus_string);

        chat(character, total_format.format(skill_name, 'Roll', roll_string));
    }


    // ################################################################################################################
    // Rests


    function get_bar_value(token, type, arg) {
        let value = token.get(arg);
        value = value === '' ? 0 : parse_int(value);
        assert(!Number.isNaN(value), '%s bar value "%s" is non-numeric'.format(type, token.get(arg)));
        return value;
    }


    function take_rest(msg) {
        const character = get_character_from_msg(msg);

        const pieces = msg.content.split(' ');
        if (pieces.length < 3) {
            chat(character, 'Not enough parts in "!barbs rest" call');
            return;
        }

        const type = pieces[2];

        const token = get_token(character);
        if (token === null) {
            return;
        }

        const current_health = get_bar_value(token, 'Health', 'bar3_value');
        const current_stamina = get_bar_value(token, 'Stamina', 'bar1_value');
        const current_mana = get_bar_value(token, 'Mana', 'bar2_value');

        const roll = get_roll_with_items_and_effects(character);
        const max_health = eval(get_stat_roll_modifier(character, roll, Stat.HEALTH));
        const max_stamina = eval(get_stat_roll_modifier(character, roll, Stat.STAMINA));
        const max_mana = eval(get_stat_roll_modifier(character, roll, Stat.MANA));

        if (type === 'short') {
            const health_regen = eval(get_stat_roll_modifier(character, roll, Stat.HEALTH_REGENERATION));
            const stamina_regen = eval(get_stat_roll_modifier(character, roll, Stat.STAMINA_REGENERATION));
            const mana_regen = eval(get_stat_roll_modifier(character, roll, Stat.MANA_REGENERATION));

            const health_regenerated = Math.round(Math.min(max_health - current_health,
                                                           max_health * health_regen / 100));
            const stamina_regenerated = Math.round(Math.min(max_stamina - current_stamina,
                                                            max_stamina * stamina_regen / 100));
            const mana_regenerated = Math.round(Math.min(max_mana - current_mana,
                                                         max_mana * mana_regen / 100));

            const new_health = current_health + health_regenerated;
            const new_stamina = current_stamina + stamina_regenerated;
            const new_mana = current_mana + mana_regenerated;

            token.set({'bar3_value': new_health, 'bar1_value': new_stamina, 'bar2_value': new_mana});

            const effects = [
                '<li>Health regenerated: [[%s]]</li>'.format(health_regenerated),
                '<li>Stamina regenerated: [[%s]]</li>'.format(stamina_regenerated),
                '<li>Mana regenerated: [[%s]]</li>'.format(mana_regenerated),
            ];
            const effects_section = effects_section_format.format(effects.join(''));

            const button_section = " {{button=<a href='!barbs rest $%s$ undo %s %s %s'>Undo</a>}}".format(
                character.name, health_regenerated, stamina_regenerated, mana_regenerated);

            chat(character, roll_format.format('Short Rest', '', '', '', effects_section, button_section));

        } else if (type === 'long') {
            const health_regenerated = max_health - current_health;
            const stamina_regenerated = max_stamina - current_stamina;
            const mana_regenerated = max_mana - current_mana;

            token.set({'bar3_value': max_health, 'bar1_value': max_stamina, 'bar2_value': max_mana});

            const effects = [
                '<li>Health regenerated: [[%s]]</li>'.format(health_regenerated),
                '<li>Stamina regenerated: [[%s]]</li>'.format(stamina_regenerated),
                '<li>Mana regenerated: [[%s]]</li>'.format(mana_regenerated),
            ];
            const effects_section = effects_section_format.format(effects.join(''));

            const button_section = " {{button=<a href='!barbs rest $%s$ undo %s %s %s'>Undo</a>}}".format(
                character.name, health_regenerated, stamina_regenerated, mana_regenerated);

            chat(character, roll_format.format('Long Rest', '', '', '', effects_section, button_section));

        } else if (type === 'undo') {
            if (pieces.length < 6) {
                chat(character, 'Not enough parts in "!barbs rest undo" call');
                return;
            }

            const health_regenerated = parse_int(pieces[3]);
            const stamina_regenerated = parse_int(pieces[4]);
            const mana_regenerated = parse_int(pieces[5]);

            const new_health = current_health - health_regenerated;
            const new_stamina = current_stamina - stamina_regenerated;
            const new_mana = current_mana - mana_regenerated;

            token.set({'bar3_value': new_health, 'bar1_value': new_stamina, 'bar2_value': new_mana});

            const effects = [
                '<li>Health reverted to: [[%s]]</li>'.format(new_health),
                '<li>Stamina reverted to: [[%s]]</li>'.format(new_stamina),
                '<li>Mana reverted to: [[%s]]</li>'.format(new_mana),
            ];
            const effects_section = effects_section_format.format(effects.join(''));

            chat(character, roll_format.format('Undoing Rest', '', '', '', effects_section, ''));

        } else {
            chat(character, 'Unknown rest type "%s"'.format(type));
        }
    }


    // ################################################################################################################
    // Managing persistent effects


    // Most effects don't care about when they are applied to a roll. But some want to be applied specifically after
    // others. This allows effects to have some desired ordering.
    //
    // Ordering 50 is the default. Things that use non-default orders are listed below, as they may be dependent on
    // each other.
    //    * Order 10 (default timing)   : Arcanist - Magic Primer
    //    * Order 50 ------------------ : DEFAULT
    //    * Order 80 (default timing)   : Enchanter - Perpetual Runology
    //    * Order 85 (default timing)   : Pinpoint Monk - Precision Pummeling
    //    * Order 90 (post-crit timing) : Assassin - Sharpen
    //    * Order 95 (post-crit timing) : Vastwood Knight - Vastwood Sovereignty
    //    * Order 99 (post-crit timing) : Sniper - Distance Shooter
    //
    class Order {
        constructor(val) {
            this._type = 'Order';
            this.val = val;
        }
    }


    function Ordering(val = 50) {
        return new Order(val);
    }


    // Merge two lists based on ordering
    function merge(left, right) {
        const result = [];

        while (left.length !== 0 && right.length !== 0) {
            if (left[0].ordering.val <= right[0].ordering.val) {
                result.push(left[0]);
                left.shift();
            } else {
                result.push(right[0]);
                right.shift();
            }
        }

        // Either left or right may have elements left; consume them.
        while (left.length !== 0) {
            result.push(left[0]);
            left.shift();
        }
        while (right.length !== 0) {
            result.push(right[0]);
            right.shift();
        }

        return result;
    }


    function make_handler_effective(target_character, handler, parameters, effectiveness) {
        assert_type(target_character, Character, 'make_handler_effective() target_character');
        assert_not_null(handler, 'make_handler_effective() handler');
        assert_not_null(parameters, 'make_handler_effective() parameters');
        assert_not_null(effectiveness, 'make_handler_effective() effectiveness');

        // Figure out what damage / multiplier this handler grants
        const fake_roll = new Roll(target_character, RollType.ALL);
        handler(target_character, fake_roll, parameters, effectiveness);

        // Edit the handler into something that grants the same damages and multipliers, but increased by 50%
        return function (char, roll, params) {
            assert_type(char, Character, 'make_handler_effective() inner target_character');
            assert_type(roll, Roll, 'make_handler_effective() inner handler');
            assert_not_null(params, 'make_handler_effective() inner parameters');

            // Increase the number of damage dice for added damages by effectiveness
            const damage_types = Object.keys(fake_roll.damages);
            for (let i = 0; i < damage_types.length; i++) {
                const damage_type = damage_types[i];
                const base_damage = fake_roll.damages[damage_type];

                let dmg_pieces = split_string(base_damage, '+');
                dmg_pieces = split_array(dmg_pieces, '-');
                dmg_pieces = split_array(dmg_pieces, '*');
                dmg_pieces = split_array(dmg_pieces, '/');
                dmg_pieces = split_array(dmg_pieces, '^');
                dmg_pieces = split_array(dmg_pieces, '(');
                dmg_pieces = split_array(dmg_pieces, ')');

                let revised_dmg = '';
                for (let j = 0; j < dmg_pieces.length; j++) {
                    let dmg_piece = dmg_pieces[j];
                    if (!dmg_piece.includes('d')) {
                        revised_dmg += dmg_piece;

                    } else {
                        let count = dmg_piece.split('d')[0];
                        if (count === '') {
                            count = 0;
                        } else {
                            count = parse_int(count);
                        }
                        const die = dmg_piece.split('d')[1];
                        const revised_piece = '%sd%s'.format(Math.round(effectiveness * count), die);
                        revised_dmg += revised_piece;
                    }
                }

                roll.add_damage('(%s)'.format(revised_dmg), damage_type);
            }

            // Increase damage multipliers by effectiveness
            const multiplier_types = Object.keys(fake_roll.multipliers);
            for (let i = 0; i < multiplier_types.length; i++) {
                const multiplier_type = multiplier_types[i];

                const sources = Object.keys(fake_roll.multipliers[multiplier_type]);
                for (let j = 0; j < sources.length; j++) {
                    const source = sources[j];
                    const base_multiplier = fake_roll.multipliers[multiplier_type][source];
                    roll.add_multiplier('(%s*(%s))'.format(effectiveness, base_multiplier), multiplier_type, source);
                }
            }

            // Increase crit chance, crit damage mod, concentration bonus, and initiative bonus by effectiveness
            if (Stat.CRITICAL_HIT_CHANCE.name in fake_roll.stats) {
                roll.add_stat_bonus(Stat.CRITICAL_HIT_CHANCE,
                                    effectiveness * fake_roll.stats[Stat.CRITICAL_HIT_CHANCE.name]);
            }
            roll.add_crit_damage_mod(effectiveness * 100 * (fake_roll.crit_damage_mod - 2));
            roll.add_concentration_bonus(effectiveness * fake_roll.concentration_bonus);
            roll.add_initiative_bonus(effectiveness * fake_roll.initiative_bonus);
            roll.add_combo_chance(effectiveness * fake_roll.combo_chance);

            // If the old effect changed these, the new effect should do the same
            if (roll.crit !== fake_roll.crit) {
                roll.crit = fake_roll.crit;
            }
            if (roll.should_apply_crit !== fake_roll.should_apply_crit) {
                roll.should_apply_crit = fake_roll.should_apply_crit;
            }
            if (roll.max_damage !== fake_roll.max_damage) {
                roll.max_damage = fake_roll.max_damage;
            }

            // Increase stat bonuses by effectiveness
            const stats = Object.keys(fake_roll.stats);
            for (let i = 0; i < stats.length; i++) {
                const stat = Stat[stats[i]];
                const base_bonus = fake_roll.stats[stat.name];
                roll.add_stat_bonus(stat, '(%s*(%s))'.format(effectiveness, base_bonus));
            }

            // Increase stat multipliers by effectiveness
            const stat_multipliers = Object.keys(fake_roll.stat_multipliers);
            for (let i = 0; i < stat_multipliers.length; i++) {
                const stat = Stat[stat_multipliers[i]];
                const base_bonus = fake_roll.stat_multipliers[stat.name];
                roll.add_stat_multiplier(stat, '(%s*(%s))'.format(effectiveness, base_bonus));
            }

            // Increase hidden stats by effectiveness
            const hidden_stats = Object.keys(fake_roll.hidden_stats);
            for (let i = 0; i < hidden_stats.length; i++) {
                const hidden_stat = hidden_stats[i];
                const base_bonus = fake_roll.hidden_stats[hidden_stat];
                roll.add_hidden_stat(hidden_stat, Math.round(effectiveness * base_bonus));
            }

            // Increase condition resists by effectiveness
            const condition_resists = Object.keys(fake_roll.condition_resists);
            for (let i = 0; i < condition_resists.length; i++) {
                const condition = condition_resists[i];
                const base_bonus = fake_roll.condition_resists[condition];
                roll.add_condition_resist(condition, Math.round(effectiveness * base_bonus));
            }

            // Increase magic resists by effectiveness
            const magic_resists = Object.keys(fake_roll.magic_resists);
            for (let i = 0; i < magic_resists.length; i++) {
                const damage_type = magic_resists[i];
                const base_bonus = fake_roll.magic_resists[damage_type];
                roll.add_magic_resist(damage_type, Math.round(effectiveness * base_bonus));
            }

            // Increase skill bonus by effectiveness
            const skills = Object.keys(fake_roll.skills);
            for (let i = 0; i < skills.length; i++) {
                const skill = get_skill_by_name(skills[i]);
                assert_type(skill, SkillObject, 'make_handler_effective() inner skill')
                const base_bonus = fake_roll.skills[skill.name];
                roll.add_skill_bonus(skill, '(%s*(%s))'.format(effectiveness, base_bonus));
            }

            // Copy over effects
            for (let i = 0; i < fake_roll.effects.length; i++) {
                roll.add_effect(fake_roll.effects[i]);
            }

            return true;
        };

    }


    function add_persistent_effect(caster, ability, parameters, target_character, duration, order, roll_type, roll_time,
                                   count, handler) {
        assert_type(caster, Character, 'add_persistent_effect() caster');
        assert_not_null(ability, 'add_persistent_effect() ability');
        assert_not_null(parameters, 'add_persistent_effect() parameters');
        assert_type(target_character, Character, 'add_persistent_effect() target_character');
        assert_type(duration, Duration, 'add_persistent_effect() duration');
        assert_type(order, Order, 'add_persistent_effect() order');
        assert_enum(roll_type, RollType, 'add_persistent_effect() roll_type');
        assert_enum(roll_time, RollTime, 'add_persistent_effect() roll_time');
        assert_numeric(count, 'add_persistent_effect() count');
        assert_not_null(handler, 'add_persistent_effect() handler');

        // See if this effect already exists on the character. Effects generally should not be stackable.
        for (let i = 0; i < persistent_effects.length; i++) {
            const persistent_effect = persistent_effects[i];
            if (persistent_effect.name === ability['name'] && persistent_effect.target === target_character.name) {
                assert(false, 'Effect "%s" is already present on %s', ability['name'], target_character.name);
            }
        }

        // Determine type of the effect, e.g. buff, enchant, other
        let effect_type = EffectType.UNKNOWN;
        if ('tags' in ability) {
            if (ability.tags.includes('buff')) {
                effect_type = EffectType.BUFF;
            } else if (ability.tags.includes('enchantment')) {
                effect_type = EffectType.ENCHANTMENT;
            } else if (ability.tags.includes('empower')) {
                effect_type = EffectType.EMPOWER;
            }
        }

        inner_add_persistent_effect(caster, ability, parameters, target_character, duration, order,
                                    roll_type, roll_time, count, effect_type, handler);
    }


    function inner_add_persistent_effect(caster, ability, parameters, target_character, duration, order, roll_type,
                                         roll_time, count, effect_type, handler) {
        assert_type(caster, Character, 'inner_add_persistent_effect() caster');
        assert_not_null(ability, 'inner_add_persistent_effect() ability');
        assert_not_null(parameters, 'inner_add_persistent_effect() parameters');
        assert_type(target_character, Character, 'inner_add_persistent_effect() target_character');
        assert_type(duration, Duration, 'inner_add_persistent_effect() duration');
        assert_type(order, Order, 'inner_add_persistent_effect() order');
        assert_enum(roll_type, RollType, 'inner_add_persistent_effect() roll_type');
        assert_enum(roll_time, RollTime, 'inner_add_persistent_effect() roll_time');
        assert_numeric(count, 'inner_add_persistent_effect() count');
        assert_enum(effect_type, EffectType, 'inner_add_persistent_effect() effect_type');
        assert_not_null(handler, 'inner_add_persistent_effect handler');

        // Figure out the caster's buff or enchant effectiveness
        const roll = new Roll(caster, RollType.ALL);
        if (!add_extras(caster, ability, roll, RollTime.DEFAULT, parameters, '')) {
            chat(caster, 'Error calculating buff/enchant effectiveness for ability %s'.format(ability.name));
            return;
        }

        let effectiveness = 1;
        if (effect_type === EffectType.BUFF) {
            effectiveness = roll.buff_effectiveness;

            const target_short_name = target_character.name.toLowerCase().split(' ')[0];
            if (target_short_name in roll.split_buff_effectiveness) {
                effectiveness += roll.split_buff_effectiveness[target_short_name] / 100;
            } else if ('default' in roll.split_buff_effectiveness) {
                effectiveness += roll.split_buff_effectiveness['default'] / 100;
            }

        } else if (effect_type === EffectType.ENCHANTMENT) {
            effectiveness = roll.enchant_effectiveness;
        }

        // Continue to allow effectiveness to be specified as a parameter
        // TODO: stop supporting this?
        let effectiveness_string = get_parameter('effectiveness', parameters);
        if (effectiveness_string !== null) {
            effectiveness_string = trim_percent(effectiveness_string);
            effectiveness += parse_int(effectiveness_string) / 100;
            assert_numeric(effectiveness, 'Non-numeric effectiveness "%s"', effectiveness_string);
        }

        // Check if adding this effect is putting the target character over their buff limit and issue a warning if so.
        // We'll still add the effect though.
        let buffs_on_character = 0;
        for (let i = 0; i < persistent_effects.length; i++) {
            const effect = persistent_effects[i];
            if (effect.target === target_character.name && effect.effect_type === EffectType.BUFF) {
                buffs_on_character += 1;
            }
        }

        const character_buff_limit = target_character.get_stat(Stat.BUFF_LIMIT);
        if (buffs_on_character + 1 > character_buff_limit) {
            raw_chat('API', '%s is over his/her buff limit (%s)'.format(target_character.name, character_buff_limit));
        }

        const effect = {
            'caster': caster.name,
            'name': ability.name,
            'target': target_character.name,
            'duration': duration,
            'ordering': order,
            'roll_type': roll_type,
            'roll_time': roll_time,
            'count': count,
            'effectiveness': effectiveness,
            'effect_type': effect_type,
            'handler': handler,
        };

        LOG.info('Added persistent effect %s'.format(JSON.stringify(effect)));
        persistent_effects.push(effect);
    }


    function create_persistent_effect(msg) {
        const character = get_character_from_msg(msg);
        const pieces = msg.content.split(' ');
        const effect_string = pieces.slice(2).join(' ');

        let parts = effect_string.split(';');
        parts = trim_all(parts);
        parts = remove_empty(parts);
        if (parts.length < 2) {
            chat(character, 'Missing name for the effect or any actual behavior');
            return;
        }

        const effect_name = parts[0];
        const affix_strings = parts.slice(1);
        let results = null;

        const errors = collect_logs(function() {
            results = Affix.process_affixes(character, effect_name, affix_strings);
        });

        // If there were any errors processing affixes, log them and then fail creating the effect
        if (errors.length > 0) {
            for (let i = 0; i < errors.length; i++) {
                raw_chat('API', errors[i]);
            }
            return;
        }

        const effect_type = results['effect_type'];
        let duration = results['duration'];
        const affixes = results['affixes'];

        if (effect_type === EffectType.ARROW || effect_type === EffectType.EMPOWER) {
            duration = Duration.SINGLE_USE();
        }
        if (duration === null) {
            raw_chat('API', 'Duration must be specified');
            return;
        }

        // Attempt to organize affixes by roll type and time to minimize the number of actual effects we create
        const organized_affixes = {};
        for (let i = 0; i < affixes.length; i++) {
            const affix = affixes[i];
            const key = affix.roll_type + affix.roll_time;

            if (!(key in organized_affixes)) {
                organized_affixes[key] = [];
            }

            organized_affixes[key].push(affix);
        }

        const keys = Object.keys(organized_affixes);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const affixes = organized_affixes[key];

            let name = effect_name;
            for (let j = 0; j < affixes.length; j++) {
                name += ' (%s)'.format(affixes[j].description);
            }

            const fake_ability = {
                'name': name,
                'tags': [],
            };

            const handler = function (char, roll, parameters) {
                for (let j = 0; j < affixes.length; j++) {
                    affixes[j].apply(roll);
                }
                return true;
            };

            inner_add_persistent_effect(character, fake_ability, /*parameters=*/[], character, duration, Ordering(),
                                        affixes[0].roll_type, affixes[0].roll_time, /*count=*/1, effect_type, handler);
        }

        chat(character, 'Created effect %s on %s'.format(effect_name, character.name));
    }


    // Helper to print floating-point numbers more nicely than JS does by default
    function decimal_round(value) {
        const str = '%s'.format(value);
        if (!str.includes('.')) {
            return str;
        }

        const float_component = str.split('.')[1];
        if (float_component.length < 3) {
            return str;
        }

        const chars = str.split('');
        const ints = [];
        let is_negative = false;
        for (let i = 0; i < chars.length; i++) {
            const char = chars[i];
            if (char === '.') {
                ints.push(char);
            } else if (char === '-') {
                is_negative = true;
            } else {
                ints.push(parseInt(char, 10));
            }
        }

        // Look for a sequence of 3 zeros or 3 nines as a indicator that we can probably print this number better
        // than plain old JS.
        let zero_index = -1;
        let nine_index = -1;
        for (let i = 0; i < ints.length - 2; i++ ) {
            if (ints[i] === 0 && ints[i + 1] === 0 && ints[i + 2] === 0) {
                zero_index = i;
                break;
            }
            if (ints[i] === 9 && ints[i + 1] === 9 && ints[i + 2] === 9) {
                nine_index = i;
                break;
            }
        }

        // If there is no sequence of 3 zeros or 3 nines, we can't round this number nicely so just return what we got.
        if (zero_index === -1 && nine_index === -1) {
            return str;
        }

        function concat_ints(array) {
            let merged = '';
            for (let i = 0; i < array.length; i++) {
                merged = "%s%s".format(merged, array[i]);
            }

            if (merged.endsWith('.')) {
                merged = merged.slice(0, merged.length - 1);
            }

            if (is_negative) {
                return '-' + merged;
            }
            return merged;
        }

        // If there is a sequence of 3 zeros, truncate the string at the first zero in the sequence
        if (zero_index !== -1) {
            const truncated = ints.slice(0, zero_index);
            return concat_ints(truncated, is_negative);
        }

        // There must be a sequence of 3 nines. First truncate at the first nine in the sequence.
        let truncated = ints.slice(0, nine_index);
        // Then round up from the right to left
        for (let i = truncated.length - 1; i >= 0; i--) {
            const int = truncated[i];

            // Skip over the decimal point
            if (int === '.') {
                continue;
            }

            // If we're at the front of the string...
            if (i === 0) {
                if (int !== 9) {
                    truncated[i] += 1;
                } else {
                    truncated[i] = 0;
                    truncated.unshift(1);
                }
                break;
            }

            // If we're not yet at the front of the string...
            if (int !== 9) {
                truncated[i] += 1;
                break;
            } else {
                truncated[i] = 0;
            }
        }

        return concat_ints(truncated, is_negative);
    }


    function list_persistent_effects(msg) {
        const character = get_character_from_msg(msg);

        const effects_on_character = [];
        for (let i = 0; i < persistent_effects.length; i++) {
            if (persistent_effects[i].target === character.name) {
                effects_on_character.push(persistent_effects[i]);
            }
        }

        // Alphabetize effects
        effects_on_character.sort(function(a, b) {
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return 0;
        });

        let buffs_text = '';
        let enchants_text = '';
        let potions_text = '';
        let effects_text = '';
        let callback_options = [];
        for (let i = 0; i < effects_on_character.length; i++) {
            const effect = effects_on_character[i];

            let effect_text = '';
            if (effect.effectiveness === 1) {
                effect_text = '<li>%s</li>'.format(effect.name);
            } else {
                effect_text = '<li>%s (%sx)</li>'.format(effect.name, decimal_round(effect.effectiveness));
            }

            if (effect.effect_type === EffectType.BUFF) {
                buffs_text += effect_text;
            } else if (effect.effect_type === EffectType.ENCHANTMENT) {
                enchants_text += effect_text;
            } else if (effect.effect_type === EffectType.POTION) {
                potions_text += effect_text;
            } else {
                effects_text += effect_text;
            }

            callback_options.push(effect.name);
        }

        let output_text = '&{template:Barbs} {{name=Effects on %s}}'.format(character.name);
        if (buffs_text !== '') {
            output_text += ' {{buffs=%s}}'.format(buffs_text);
        }
        if (enchants_text !== '') {
            output_text += ' {{enchants=%s}}'.format(enchants_text);
        }
        if (potions_text !== '') {
            output_text += ' {{potions=%s}}'.format(potions_text);
        }
        if (effects_text !== '') {
            output_text += ' {{effects=%s}}'.format(effects_text);
        }

        if (callback_options.length > 0) {
            callback_options = callback_options.join('|').replace(/\'/g, '&#39;');
            const button_text = " {{button=<a href='!barbs remove_effect $%s$ ?{Remove which effect?|%s}'>Remove Effect</a>}}";

            chat(character, output_text + button_text.format(character.name, callback_options));
        } else {
            chat(character, output_text + ' {{effects=<li>None</li>}}');
        }
    }


    function remove_persistent_effect(msg) {
        const character = get_character_from_msg(msg);
        const pieces = msg.content.split(' ');

        const effect_name = pieces.slice(2).join(' ');
        for (let i = 0; i < persistent_effects.length; i++) {
            if (persistent_effects[i].name === effect_name && persistent_effects[i].target === character.name) {
                persistent_effects.splice(i, 1);
                i--;

                chat(character, 'Removed effect %s from %s'.format(effect_name, character.name));
                return;
            }
        }

        chat(character, 'Did not find effect %s on %s'.format(effect_name, character.name));
    }


    // Iterate through effects of abilities (buffs, empowers, etc) that may last multiple turns and return a list of
    // applicable ones.
    function get_applicable_persistent_effects_to_roll(character, roll, roll_time, parameters) {
        assert_type(character, Character, 'get_applicable_persistent_effects_to_roll() character');
        assert_not_null(roll, 'get_applicable_persistent_effects_to_roll() roll');
        assert_not_null(roll_time, 'get_applicable_persistent_effects_to_roll() roll_time');
        assert_not_null(parameters, 'get_applicable_persistent_effects_to_roll() parameters');

        const runnables = [];
        for (let i = 0; i < persistent_effects.length; i++) {
            const effect = persistent_effects[i];

            const right_target = effect.target === character.name;
            const right_time = effect.roll_time === roll_time;
            const right_type = RollType.is_type(effect.roll_type, roll.roll_type);
            if (right_target && right_time && right_type) {

                // Modify the handler here if it has an effectiveness other than 1. We do this here because this is on
                // the path for an attack roll, which is when the effect's effectiveness actually matters. This also
                // lets us pass along the actual parameters that are used for the attack when deducing buff
                // effectiveness.
                let func = persistent_effects[i].handler;
                if (persistent_effects[i].effectiveness !== 1) {
                    func = make_handler_effective(character, func, parameters, persistent_effects[i].effectiveness);
                }

                // Wrap the handler to bind the args and so that calling the handler is consistent with arbitrary
                // parameters.
                persistent_effects[i].modified_handler = function() {
                    return func(character, roll, parameters);
                }
                runnables.push(persistent_effects[i]);
            }
        }

        return runnables;
    }


    // ################################################################################################################
    // Class abilities helpers


    // Helper to do a roll and collect the results into strings that sum the results for each roll.
    // This is meant for rolls that are just individual collections of dice, e.g. "[[5d10]][[4d12]]".
    // This probably won't work if you put math in the expression, e.g. "[[5d10+12]]".
    function hidden_roll(roll, handler) {
        chat({'who': 'API'}, roll, function (response) {
            LOG.trace('Roll response: ' + JSON.stringify(response));
            // results[0].inlinerolls = [
            //   {
            //     "expression":"4d8",
            //     "results": {
            //       "type":"V",
            //       "rolls":[
            //         {
            //           "type":"R",
            //           "dice":4,
            //           "sides":8,
            //           "mods":{},
            //           "results":[{"v":2},{"v":6},{"v":3},{"v":4}]
            //         }
            //       ],
            //       "resultType":"sum",
            //       "total":15
            //     },
            //   },
            //   {
            //       <next roll>
            //   },
            // ]
            const rolls = response[0]['inlinerolls'];
            const value_strings = [];
            for (let i = 0; i < rolls.length; i++) {
                const results = rolls[i]['results']['rolls'][0]['results'];
                let value_string = '';
                for (let j = 0; j < results.length; j++) {
                    const value = results[j]['v'];
                    if (value_string === '') {
                        value_string = '%s'.format(value);
                    } else {
                        value_string += '+%s'.format(value);
                    }
                }
                value_strings.push(value_string);
            }
            LOG.trace('Value strings: ' + JSON.stringify(value_strings));

            handler(value_strings);
        });
    }


    function add_bonuses_from_skills(character, roll, attack_weapons) {
        assert_not_null(character, 'check_skills() character');
        assert_not_null(roll, 'check_skills() roll');
        assert_not_null(attack_weapons, 'check_skills() attack_weapons');

        const item_types = new Set();
        for (let i = 0; i < attack_weapons.length; i++) {
            const weapon = attack_weapons[i];
            assert_type(weapon, Item, 'add_bonuses_from_skills() weapon');
            item_types.add(weapon.type);
        }

        // Check if Weapon Mastery: Shields is at rank 1 (15 AP)
        if (item_types.has(ItemType.SHIELD)) {
            const skills = character.get_skills();
            const skill_of_interest = Skill.WEAPON_MASTERY_SHIELDS.name.toLowerCase();
            if (skill_of_interest in skills && skills[skill_of_interest] === 15) {
                roll.add_multiplier(0.5, Damage.PHYSICAL, character.name);
            }
        }
    }


    function append_weapon(character, list, item, slot) {
        assert_not_null(character, 'append_weapon() character');
        assert_not_null(list, 'append_weapon() list');
        // The item may be null
        assert_not_null(slot, 'append_weapon() slot');

        if (item !== undefined && item !== null) {
            list.push(item);
        } else {
            chat(character, '%s has no %s weapon'.format(character.name, slot));
        }
    }


    function get_applying_weapons(character, roll, parameters) {
        const applying_weapons = [];

        // This special override parameter can be added to parameters to forcibly skip adding items here.
        // This is really for roll_item(), so that we don't apply main/offhand weapons twice.
        if (get_parameter('skip_applying_weapons', parameters) !== null) {
            return applying_weapons;
        }

        if (roll.roll_type === RollType.PHYSICAL) {
            if (get_parameter('offhand', parameters) !== null) {
                append_weapon(character, applying_weapons, character.offhand, 'offhand');
            } else if (get_parameter('dual_wield', parameters) !== null) {
                append_weapon(character, applying_weapons, character.main_hand, 'main hand');
                append_weapon(character, applying_weapons, character.offhand, 'offhand');
            } else {
                append_weapon(character, applying_weapons, character.main_hand, 'main hand');
            }
        } else {
            // Not using append_weapon() here because we don't necessarily expect a magic-using character to have main
            // hand and offhand weapons. Also, this is where we land when calculating buff/enchant effectiveness, since
            // we use a fake roll with RollType.ALL.
            if (character.main_hand !== null) {
                applying_weapons.push(character.main_hand);
            }
            if (character.offhand !== null) {
                applying_weapons.push(character.offhand);
            }
        }

        return applying_weapons;
    }


    // For classes abilities specifically
    function add_scale_damage(character, roll, parameters) {
        assert_not_null(character, 'add_scale_damage() character');
        assert_not_null(roll, 'add_scale_damage() roll');
        assert_not_null(parameters, 'add_scale_damage() parameters');

        if (!RollType.is_physical(roll.roll_type)) {
            chat(character, 'Unexpected roll type %s while adding weapon scaling damage'.format(roll.roll_type));
            return;
        }

        const attack_weapons = get_applying_weapons(character, roll, parameters);

        let max_damage_scaling = null;
        for (let i = 0; i < attack_weapons.length; i++) {
            const damage_scaling = attack_weapons[i].damage_scaling;
            if (damage_scaling.stat === null) {
                continue;
            }

            if (max_damage_scaling === null || character.get_stat(damage_scaling.stat) > character.get_stat(max_damage_scaling.stat)) {
                max_damage_scaling = damage_scaling;
            }
        }

        if (max_damage_scaling !== null) {
            assert_type(max_damage_scaling, ItemScalar, 'add_scale_damage() max_damage_scaling');
            max_damage_scaling.handler(character, roll);
        }
    }


    function add_item_to_roll(item, roll, roll_time) {
        LOG.trace('Applying item "%s"'.format(item.name));
        for (let i = 0; i < item.effects.length; i++) {
            if (item.effects[i].roll_time === roll_time) {
                LOG.trace('Applying effect %s from item "%s"'.format(i, item.name));
                item.effects[i].apply(roll);
            }
        }
    }


    // Iterate through the character's items and add any damage bonuses or multipliers to the roll
    function add_items_to_roll(character, roll, roll_time, parameters) {
        assert_not_null(character, 'add_items_to_roll() character');
        assert_not_null(roll, 'add_items_to_roll() roll');
        assert_not_null(roll_time, 'add_items_to_roll() roll_time');
        assert_not_null(parameters, 'add_items_to_roll() parameters');

        for (let i = 0; i < character.items.length; i++) {
            const item = character.items[i];
            add_item_to_roll(item, roll, roll_time);
        }

        const attack_weapons = get_applying_weapons(character, roll, parameters);
        for (let i = 0; i < attack_weapons.length; i++) {
            const attack_weapon = attack_weapons[i];
            if (attack_weapon === null) {
                continue;
            }

            add_item_to_roll(attack_weapon, roll, roll_time);
        }

        if (roll_time === RollTime.DEFAULT) {
            add_bonuses_from_skills(character, roll, attack_weapons);
        }
    }


    function add_extras(character, ability, roll, roll_time, parameters, crit_section) {
        assert_not_null(character, 'add_extras() character');
        assert_not_null(ability, 'add_extras() ability');
        assert_not_null(roll, 'add_extras() roll');
        assert_not_null(roll_time, 'add_extras() roll_time');
        assert_not_null(parameters, 'add_extras() parameters');

        add_items_to_roll(character, roll, roll_time, parameters);

        const runnables_1 = get_applicable_normal_arbitrary_parameter_handlers(ability, roll, roll_time, parameters);
        const runnables_2 = get_applicable_persistent_effects_to_roll(character, roll, roll_time, parameters);
        const runnables = merge(runnables_1, runnables_2);

        for (let i = 0; i < runnables.length; i++) {
            assert_not_null(runnables[i], 'add_extras() runnables[%s]'.format(i));
            if (!runnables[i].modified_handler()) {
                LOG.warn('Problem adding effects at time ' + roll_time);
                return false;
            }
        }

        // Try these special arbitrary parameters last. They will effectively "take over" handling the rest of the
        // roll, so we will fail here and let the arbitrary parameter do it's thing.
        return !handle_takeover_arbitrary_parameters(ability, roll, roll_time, parameters, crit_section);
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
    function roll_crit(ability, roll, parameters, handler) {
        assert_not_null(roll, 'roll_crit() roll');
        assert_not_null(parameters, 'roll_crit() parameters');
        assert_not_null(handler, 'roll_crit() handler');

        const character = roll.character;

        // Most effects can be applied whether or not we know if the result is a crit. These effects should have
        // RollTime.DEFAULT and are applied here.
        if (!add_extras(character, ability, roll, RollTime.DEFAULT, parameters, '')) {
            return;
        }

        const crit_chance = roll.get_crit_chance();
        // Crit chance threshold can't go below 0, even if the crit chance is over 100%, or Roll20 will break.
        const crit_compare_value = Math.max(0, 100 - crit_chance + 1);

        chat(roll.character, '[[d100]]', function (results) {
            const rolls = results[0].inlinerolls;
            const rolled_value_for_crit = rolls[0].results.total;
            roll.crit = (rolled_value_for_crit >= crit_compare_value);

            const crit_section = crit_section_format.format(rolled_value_for_crit, crit_compare_value, crit_chance,
                                                            rolled_value_for_crit, crit_compare_value);
            handler(crit_section);
        });
    }


    // 1. Do the roll, which actually builds up the strings for the roll on a per-type basis.
    // 2. Fill out a roll template to construct the message.
    // 3. Add in any extra effects that don't fit nicely into a damage type to the message.
    // 4. Record and send the message.
    function do_roll(character, ability, roll, parameters, crit_section, do_finalize = true,
                     last_minute_handler = null) {
        assert_not_null(character, 'do_roll() character');
        assert_not_null(ability, 'do_roll() ability');
        assert_not_null(roll, 'do_roll() roll');
        assert_not_null(parameters, 'do_roll() parameters');
        assert_not_null(crit_section, 'do_roll() crit_section');

        // Any effect that needs to know whether or not a roll is a crit is applied here. These effects should have
        // RollTime.POST_CRIT.
        if (!add_extras(character, ability, roll, RollTime.POST_CRIT, parameters, crit_section)) {
            return;
        }

        // If we shouldn't actually apply crit chance to this roll, empty out the crit section. Effects that are
        // dependent on whether or not the roll was a crit should not have been applied.
        if (!roll.should_apply_crit) {
            crit_section = '';
        }

        // If an attack has psychic damage, we have to do a Psionics: Offensive skill check
        if (Damage.PSYCHIC in roll.damages) {
            roll_psionics_offensive(character);
        }

        if (last_minute_handler !== null) {
            last_minute_handler(roll);
        }

        const rolls_per_type = roll.roll();

        let combo_section = '';
        if ('tags' in ability && ability.tags.includes('combo')) {
            const combo_chance = Math.round(character.get_base_combo_chance() + roll.combo_chance);
            const combo_threshold = Math.max(0, 100 - combo_chance + 1);
            combo_section = combo_section_format.format(combo_chance, combo_threshold);
        }

        format_and_send_roll(character, ability.name, roll, rolls_per_type, crit_section, combo_section);
        if (do_finalize) {
            finalize_roll(character, roll, parameters);
        }
    }


    function format_and_send_roll(character, roll_title, roll, rolls_per_type, crit_section, combo_section = '',
                                  button_section='') {
        assert_not_null(character, 'format_and_send_roll() character');
        assert_not_null(roll_title, 'format_and_send_roll() roll_title');
        assert_not_null(roll, 'format_and_send_roll() roll');
        assert_not_null(rolls_per_type, 'format_and_send_roll() rolls_per_type');
        assert_not_null(crit_section, 'format_and_send_roll() crit_section');
        assert_not_null(combo_section, 'format_and_send_roll() combo_section');
        assert_not_null(button_section, 'format_and_send_roll() button_section');

        let damage_section = '';
        Object.keys(rolls_per_type).forEach(function (type) {
            damage_section = damage_section + damage_section_format.format(type, rolls_per_type[type]);
        });

        let effects = Array.from(roll.effects);
        effects.forEach(function(effect, index, this_) {
            this_[index] = '<li>%s</li>'.format(effect);
        });

        // TODO: only add specific-magic-type penetrations if that damage type is in the roll
        const hidden_stat_formats = Object.keys(roll.hidden_stats);
        for (let i = 0; i < hidden_stat_formats.length; i++) {
            const hidden_stat_format = hidden_stat_formats[i];
            let value = roll.hidden_stats[hidden_stat_format];

            // Minion lethality is a little special, because the value should also include Lethality chance,
            // if present. The API doesn't know what you're attacking though, so we'll show both regular lethality and
            // minion lethality.
            if (hidden_stat_format === HiddenStat.MINION_LETHALITY && HiddenStat.LETHALITY in roll.hidden_stats) {
                value += roll.hidden_stats[HiddenStat.LETHALITY];
            }

            const format_args = occurrences(hidden_stat_format, '%s');
            let formatted_hidden_stat;
            if (format_args === 1) {
                formatted_hidden_stat = hidden_stat_format.format(value);
            } else if (format_args === 2) {
                const threshold = 100 - Math.min(101, value) + 1;
                formatted_hidden_stat = hidden_stat_format.format(value, threshold);
            }
            effects.push('<li>%s</li>'.format(formatted_hidden_stat));
        }

        const effects_section = effects_section_format.format(effects.join(''));
        const msg = roll_format.format(roll_title, damage_section, crit_section, combo_section, effects_section,
                                       button_section);

        LOG.info('format_and_send_roll() - roll: ' + msg);
        chat(character, msg);
    }


    function finalize_roll(character, roll, parameters) {
        assert_not_null(character, 'finalize_roll() character');
        assert_not_null(roll, 'finalize_roll() roll');
        assert_not_null(parameters, 'finalize_roll() parameters');

        // Some effects last exactly one attack. At this point, we've successfully applied everything and done the roll,
        // so the attack is done. Thus we can remove the single-use persistent effects from the master list.
        LOG.debug('removing effects for roll of type ' + roll.roll_type);
        for (let i = 0; i < persistent_effects.length; i++) {
            const effect = persistent_effects[i];

            const right_target = effect.target === character.name;
            const right_type = RollType.is_type(effect.roll_type, roll.roll_type);
            if (effect.duration.single_use() && right_target && right_type) {
                LOG.debug('removing effect = %s'.format(JSON.stringify(effect)));
                persistent_effects.splice(i, 1);
                i--;
            }
        }
    }


    // ################################################################################################################
    // Minions


    function make_minion(character, name) {
        assert_type(character, Character, 'make_minion() character');
        assert_not_null(name, 'make_minion() name');

        const id = name.replace(/\s+/g, '_').toLowerCase();

        // The summon acts as a separate character, so we make a fake one to be able to do rolls with. The critical
        // hit chance stat must at least be set for this to work properly. The name is also needed to create
        // multipliers from the minion.
        const minion = new Character({'id': id}, character.who);
        minion.name = name;
        minion.stats[Stat.CRITICAL_HIT_CHANCE.name] = 0;
        return minion
    }


    function make_minion_roll(character, ability, parameters, minion, roll_type) {
        assert_type(character, Character, 'make_minion_roll() character');
        assert_not_null(ability, 'make_minion_roll() ability');
        assert_not_null(parameters, 'make_minion_roll() parameters');
        assert_type(minion, Character, 'make_minion_roll() minion');
        assert_not_null(roll_type, 'make_minion_roll() roll_type');

        // Figuring out a character's minion damage
        const character_roll = new Roll(character, roll_type);
        if (!add_extras(character, ability, character_roll, RollTime.DEFAULT, parameters, '')) {
            return null;
        }

        const minion_roll = new Roll(minion, roll_type);
        minion_roll.add_multiplier(character_roll.minion_damage / 100, Damage.ALL, character.name);

        // Draconic Pact from Dragoncaller is weird because the source should be the summoner, not the minion doing
        // the roll. So we'll deal with it here instead of making it an arbitrary parameter.
        const draconic_pact = get_parameter('draconic_pact', parameters);
        if (draconic_pact !== null) {
            assert_numeric(draconic_pact, 'Non-numeric draconic_pact number "%s"', draconic_pact);
            const pacts = parse_int(draconic_pact);
            minion_roll.add_multiplier(pacts, Damage.ALL, character.name);
        }

        return minion_roll;
    }


    // ################################################################################################################
    // Class passives (usually) that may apply to anything


    class ArbitraryParameter {
        constructor(handler, ordering) {
            this._type = 'ArbitraryParameter';
            this.handler = handler;
            this.ordering = ordering;
        }
    }


    function arbitrary_damage(ability, roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        const pieces = parameter.split(' ');
        const damage = pieces[1];

        const damage_type = get_damage_from_type(pieces[2]);
        if (damage_type === null) {
            chat(roll.character, 'Unrecognized damage type "%s"'.format(pieces[2]));
            return false;
        }

        roll.add_damage(damage, damage_type);
        return true;
    }


    function arbitrary_multiplier(ability, roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        const pieces = parameter.split(' ');

        const multiplier_percent = trim_percent(pieces[1]);
        const multiplier = parse_int(multiplier_percent) / 100;
        if (Number.isNaN(multiplier)) {
            chat(roll.character, 'Non-numeric multiplier "%s"'.format(pieces[1]));
            return false;
        }

        const damage_type = get_damage_from_type(pieces[2]);
        if (damage_type === null) {
            chat(roll.character, 'Unrecognized damage type "%s"'.format(pieces[2]));
            return false;
        }

        const source = pieces.splice(3).join(' ');

        roll.add_multiplier(multiplier, damage_type, source);
        return true;
    }


    function aquamancer_tide(ability, roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        const pieces = parameter.split(' ');
        const tide = pieces.splice(1).join(' ');

        if (tide.toLowerCase() === 'flood tide') {
            roll.add_multiplier(0.5, Damage.WATER, roll.character.name);
            if (HiddenStat.FORCED_MOVEMENT in roll.hidden_stats) {
                roll.add_hidden_stat(HiddenStat.FORCED_MOVEMENT, 20);
            }

        } else if (tide.toLowerCase() === 'ebb tide') {
            roll.add_multiplier(0.5, Damage.HEALING, roll.character.name);
            // TODO: buffs grant 20% general MR
        } else {
            chat(roll.character, 'Unknown tide for Aquamancer passive: ' + tide);
            return false;
        }

        return true;
    }


    function assassin_assassinate(ability, roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        // Assassinate is a pure "double resulting damage." That is different from a normal multiplier. I'm putting in
        // a screwy source so that this counts as a pure double.
        roll.add_multiplier(1, Damage.ALL, 'dummy_source');
        return true;
    }


    function assassin_pursue_mark(ability, roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        const stacks = parse_int(parameter.split(' ')[1]);
        roll.add_crit_damage_mod(stacks * 50);
        return true;
    }


    function cryomancer_frostbite_arbitrary(ability, roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        const stacks = parse_int(parameter.split(' ')[1]);
        roll.add_multiplier(stacks * 0.5, Damage.ICE, roll.character.name);
        return true;
    }


    function daggerspell_marked(ability, roll, roll_time, parameter, parameters) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        roll.add_stat_bonus(Stat.CRITICAL_HIT_CHANCE, 10);

        const empowered = get_parameter('empowered', parameters);
        if (empowered !== null && RollType.is_physical(roll.roll_type)) {
            roll.add_crit_damage_mod(100);
        }
        return true;
    }


    function daggerspell_ritual_dagger(ability, roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        const parts = parameter.split(' ');
        if (parts.length !== 2) {
            chat(roll.character, 'Missing mana spent for "empowered" parameter');
            return false;
        }

        const mana_spent = parts[1];
        assert_numeric(mana_spent, 'Non-numeric value "%s" for "empowered" parameter', mana_spent);
        roll.add_damage(Math.round(parse_int(mana_spent) / 2), Damage.PHYSICAL);
        return true;
    }


    function enchanter_perpetual_runology(ability, roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        roll.enchant_effectiveness = roll.enchant_effectiveness / 2;
        return true;
    }


    function juggernaut_what_doesnt_kill_you(ability, roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        const pieces = parameter.split(' ');
        const ratio = pieces[1];
        const current_health = parse_int(ratio.split('/')[0]);
        const total_health = parse_int(ratio.split('/')[1]);
        const missing_health = total_health - current_health;

        roll.add_multiplier(missing_health / total_health, Damage.PHYSICAL, roll.character.name);
        return true;
    }


    function pinpoint_monk_precision_pummeling(ability, roll, roll_time, parameter) {
        // Any effects that modify combo chance or crit chance must happen at DEFAULT time. An item affix or ability
        // like "Your next combo roll gains +X if you crit" or vice versa cannot exist because of this passive.
        // This arbitrary parameter has a later ordering so that other effects that modify combo and crit chance
        // happen first.
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        const pieces = parameter.split(' ');
        if (pieces.length < 2) {
            chat(roll.character, 'Pinpoint Monk passive parameter "pinpoint" must have a value');
            return false;
        }

        const choice = pieces[1];

        // This is kind of hacky. We're adding a negative bonus to incorporate the loss of crit/combo chance rather
        // than supporting something like a negative multiplier.
        if (choice === 'crit') {
            const combo_chance = Math.round(roll.character.get_base_combo_chance() + roll.combo_chance);
            roll.add_stat_bonus(Stat.CRITICAL_HIT_CHANCE, combo_chance / 2);
            roll.add_combo_chance(-combo_chance / 2);
        } else if (choice === 'combo') {
            const crit_chance = roll.get_crit_chance();
            LOG.info(crit_chance);
            roll.add_stat_bonus(Stat.CRITICAL_HIT_CHANCE, -crit_chance / 2);
            roll.add_combo_chance(crit_chance / 2);
        } else {
            chat(roll.character, 'Value for "pinpoint" passive must be either "crit" or "combo"');
            return false;
        }

        return true;
    }


    function lightning_duelist_arc_lightning_mark(ability, roll, roll_time, parameter, parameters) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        if (RollType.is_physical(roll.roll_type)) {
            roll.add_damage('6d8', Damage.LIGHTNING);

            // Triggering this also hits another random target
            const side_roll = new Roll(roll.character, RollType.MAGIC);
            side_roll.add_damage('6d8', Damage.LIGHTNING);
            side_roll.add_damage(roll.character.get_stat(Stat.MAGIC_DAMAGE), Damage.LIGHTNING);

            const modified_ability = {
                'name': 'Arc Lightning (Random Target)',
                'tags': ability.tags,
            }

            // Everything - items, persistent effects - should apply to the main and secondary roll here. I'm losing
            // the parameters for the secondary roll though, which might matter eventually. For now it's fine.
            if (!add_extras(roll.character, modified_ability, roll, RollTime.DEFAULT, parameters, '')) {
                return false;
            }

            do_roll(side_roll.character, modified_ability, side_roll, /*parameters=*/[], '');
        }

        return true;
    }


    function martial_artist_choke_hold_arbitrary(ability, roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        roll.add_combo_chance(15);
        return true;
    }


    function mirror_mage_concave_mirror(ability, roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        roll.add_hidden_stat(HiddenStat.ACCURACY, 50);
        roll.add_hidden_stat(HiddenStat.GENERAL_MAGIC_PENETRATION, 50);
        roll.max_damage = true;
        return true;
    }


    // Note that this is a "takeover arbitrary parameter", so it behaves differently from other arbitrary
    // parameter handlers. The occurs strictly after we've determined if the roll is a crit, in case that matters.
    function mirror_mage_alter_course(ability, roll, parameter, parameters, crit_section) {
        const character = roll.character;
        const parameter_pieces = parameter.split(' ');
        const redirects = parse_int(parameter_pieces[1]);
        let source = roll.character.name;
        if (parameter_pieces.length > 2) {
            const source_character = get_character(parameter_pieces[2]);
            source = source_character.name;
        }

        // Extract damages from the original roll and send them to chat to actually do the roll.
        let fake = '';
        if (roll.max_damage) {
            roll.convert_to_max_damages();
        }
        const damage_types = Object.keys(roll.damages);
        for (let i = 0; i < damage_types.length; i++) {
            fake = fake + '[[%s]]'.format(roll.damages[damage_types[i]]);
        }
        LOG.info('Alter course, fake roll: ' + fake);

        chat(character, fake,  function (results) {
            const rolls = results[0].inlinerolls;
            LOG.info('Alter course, fake roll result: ' + JSON.stringify(rolls));

            for (let redirect_num = 0; redirect_num <= redirects; redirect_num++) {
                const redirected_roll = new Roll(character, RollType.MAGIC);

                // Steal the multipliers from the original roll.
                redirected_roll.copy_multipliers(roll);

                // Copy damages from what we got back from sending the damages to chat to be rolled.
                for (let i = 0; i < damage_types.length; i++) {
                    const damage = rolls[i].results.total.toString();
                    redirected_roll.add_damage(damage, damage_types[i]);
                }

                // Copy crit status
                redirected_roll.crit = roll.crit;
                redirected_roll.crit_damage_mod = roll.crit_damage_mod;
                redirected_roll.should_apply_crit = roll.should_apply_crit;

                if (!redirected_roll.should_apply_crit) {
                    crit_section = '';
                }

                // Only include the hidden stats and effects in the first roll, for cleanliness. We shouldn't care
                // about anything else in the roll for this passive.
                if (redirect_num === 0) {
                    redirected_roll.hidden_stats = roll.hidden_stats;
                    redirected_roll.copy_effects(roll);
                }

                // Add the multiplier for the redirect number
                redirected_roll.add_multiplier(redirect_num * 0.5, Damage.ALL, source);

                const rolls_per_type = redirected_roll.roll();
                format_and_send_roll(character, ability.name + ' (Redirect %s)'.format(redirect_num), redirected_roll,
                                     rolls_per_type, crit_section);
            }

            finalize_roll(character, roll, parameters);
        });

        return true;
    }


    function sniper_spotter(ability, roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        const stacks = parse_int(parameter.split(' ')[1]);
        if (Number.isNaN(stacks)) {
            chat(roll.character, 'Non-numeric number of stacks for "spotter" parameter');
            return false;
        }

        roll.add_multiplier(stacks * 0.25, Damage.ALL, roll.character.name);
        return true;
    }


    function thief_stance(ability, roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        const pieces = parameter.split(' ');
        if (pieces.length < 2) {
            chat('Missing option for parameter "stance", expected "hit" or "run"');
            return true;
        }

        const stance = pieces[1];

        if (stance === 'hit') {
            roll.add_effect('Drain: 10 Health');
        } else if (stance === 'run') {
            roll.add_stat_bonus(Stat.MOVEMENT_SPEED, 20);
        } else {
            chat('Unrecognized option for "stance" parameter, should be either "run" or "hit"');
            return;
        }

        return true;
    }


    function warper_opportunistic_predator(ability, roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        // If the parameter is present, we always add the bonus crit chance
        roll.add_stat_bonus(Stat.CRITICAL_HIT_CHANCE, 50);
        return true;
    }


    function warrior_warleader_arbitrary(ability, roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        const buffs = parse_int(parameter.split(' ')[1]);
        if (Number.isNaN(buffs)) {
            chat(roll.character, 'Non-numeric number of buffs for "warleader" parameter');
            return false;
        }

        roll.add_multiplier(buffs * 0.25, Damage.PHYSICAL, roll.character.name);
        return true;
    }


    function warlord_aggression(ability, roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }
        roll.add_multiplier(0.5, Damage.PHYSICAL, roll.character.name);
        return true;
    }


    const arbitrary_parameters = {
        'damage': new ArbitraryParameter(arbitrary_damage, Ordering()),
        'multiplier': new ArbitraryParameter(arbitrary_multiplier, Ordering()),

        'assassinate': new ArbitraryParameter(assassin_assassinate, Ordering()),
        'arc_lightning': new ArbitraryParameter(lightning_duelist_arc_lightning_mark, Ordering()),
        'choke_hold': new ArbitraryParameter(martial_artist_choke_hold_arbitrary, Ordering()),
        'concave': new ArbitraryParameter(mirror_mage_concave_mirror, Ordering()),
        'daggerspell_marked': new ArbitraryParameter(daggerspell_marked, Ordering()),
        'empowered': new ArbitraryParameter(daggerspell_ritual_dagger, Ordering()),
        'frostbite': new ArbitraryParameter(cryomancer_frostbite_arbitrary, Ordering()),
        'juggernaut': new ArbitraryParameter(juggernaut_what_doesnt_kill_you, Ordering()),
        'pinpoint': new ArbitraryParameter(pinpoint_monk_precision_pummeling, Ordering(85)),
        'pursued': new ArbitraryParameter(assassin_pursue_mark, Ordering()),
        'enchanter': new ArbitraryParameter(enchanter_perpetual_runology, Ordering(80)),
        'spotting': new ArbitraryParameter(sniper_spotter, Ordering()),
        'stance': new ArbitraryParameter(thief_stance, Ordering()),
        'tide': new ArbitraryParameter(aquamancer_tide, Ordering()),
        'warper_cc': new ArbitraryParameter(warper_opportunistic_predator, Ordering()),
        'warleader': new ArbitraryParameter(warrior_warleader_arbitrary, Ordering()),
        'warlord': new ArbitraryParameter(warlord_aggression, Ordering()),
    };


    const takeover_arbitrary_parameters = {
        'redirected': mirror_mage_alter_course,
    };


    function get_applicable_normal_arbitrary_parameter_handlers(ability, roll, roll_time, parameters) {
        assert_not_null(ability, 'get_applicable_normal_arbitrary_parameter_handlers() ability');
        assert_type(roll, Roll, 'get_applicable_normal_arbitrary_parameter_handlers() roll');
        assert_enum(roll_time, RollTime, 'get_applicable_normal_arbitrary_parameter_handlers() roll_time');
        assert_not_null(parameters, 'get_applicable_normal_arbitrary_parameter_handlers() parameters');

        // Apply arbitrary parameter handlers, and return false if one fails
        const runnables = [];
        for (let i = 0; i < parameters.length; i++) {
            const parameter = parameters[i];
            const parameter_keyword = parameter.split(' ')[0].split(':')[0];

            const keywords = Object.keys(arbitrary_parameters);
            for (let j = 0; j < keywords.length; j++) {
                const keyword = keywords[j];
                const arbitrary_parameter = arbitrary_parameters[keyword];

                if (parameter_keyword === keyword) {
                    // Wrap the handler to bind the args and so that calling the handler is consistent with persistent
                    // effects.
                    arbitrary_parameter.modified_handler = function() {
                        return arbitrary_parameter.handler(ability, roll, roll_time, parameter, parameters,
                                                           /*crit_section=*/'');
                    };
                    runnables.push(arbitrary_parameter);
                }
            }
        }

        return runnables;
    }


    function handle_takeover_arbitrary_parameters(ability, roll, roll_time, parameters, crit_section) {
        assert_type(roll, Roll, 'handle_takeover_arbitrary_parameters() roll');
        assert_enum(roll_time, RollTime, 'handle_takeover_arbitrary_parameters() roll_time');
        assert_not_null(parameters, 'handle_takeover_arbitrary_parameters() parameters');
        assert_not_null(crit_section, 'handle_takeover_arbitrary_parameters() crit_section');

        // These should only be applied at the end of all things, which must be post-crit
        if (roll_time !== RollTime.POST_CRIT) {
            return false;
        }

        // Apply takeover arbitrary parameter handlers, and return true if one actually does something
        for (let i = 0; i < parameters.length; i++) {
            const parameter = parameters[i];
            const parameter_keyword = parameter.split(' ')[0].split(':')[0];

            const keywords = Object.keys(takeover_arbitrary_parameters);
            for (let j = 0; j < keywords.length; j++) {
                const keyword = keywords[j];
                const func = takeover_arbitrary_parameters[keyword];

                if (parameter_keyword === keyword) {
                    if (func(ability, roll, parameter, parameters, crit_section)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }


    // ################################################################################################################
    // Auto-attacks with an item


    function check_items(msg) {
        let character = null;
        const errors = collect_logs(function() {
            // Getting the character constructs items under the hood, so this is good enough to check for errors
            character = get_character_from_msg(msg);
        });

        if (errors.length > 0) {
            for (let i = 0; i < errors.length; i++) {
                raw_chat('API', errors[i]);
            }
        } else {
            raw_chat('API', 'Items for %s are correct.'.format(character.name));
        }
    }


    function roll_item(msg) {
        const character = get_character_from_msg(msg);

        const halves = msg.content.split('|');
        if (halves.length !== 2) {
            chat(character, 'Error, did not find | character in item roll request');
            return;
        }

        const args = remove_empty(trim_all(halves[0].split(' ')));
        const parameters = remove_empty(trim_all(halves[1].split(';')));
        if (args.length < 4) {
            chat(character, 'Error, got fewer arguments than expected. Is there no item?');
            return;
        }

        const item_slot = args[2];
        const item_string = args.slice(3).join(' ');

        // Create the item object from the given string
        const item = Item.construct_item(character, item_string, item_slot);
        if (item === null) {
            chat(character, 'Error, failed to construct item for "%s"'.format(item_string));
            return;
        }

        // There are no magic auto-attacks, so the type here is always physical.
        const roll = new Roll(character, RollType.PHYSICAL);
        item.base_damage.apply(roll);

        // We know the item being used explicitly, so don't use add_scale_damage(), which guesses
        item.damage_scaling.handler(character, roll);

        // Still need to check for potential bonuses from high-ranking skills though
        add_bonuses_from_skills(character, roll, [item]);

        parameters.push('skip_applying_weapons');
        add_item_to_roll(item, roll, RollTime.DEFAULT);

        initiate_sum_all(parameters);

        roll_crit(item, roll, parameters, function (crit_section) {
            add_item_to_roll(item, roll, RollTime.POST_CRIT);
            do_roll(character, item, roll, parameters, crit_section);
        });
    }


    // ################################################################################################################
    // Class abilities


    // There are some abilities that don't make any real changes to combat. Simply print the description for
    // these abilities.
    function print_ability_description(character, ability) {
        chat(character, ability_block_format.format(ability['name'], ability['class'],
                                                    ability['description'].join('\n')));
    }


    function air_duelist_arc_of_air(character, ability, parameters) {
        add_persistent_effect(character, ability, parameters, character, Duration.ONE_MINUTE(), Ordering(),
                              RollType.PHYSICAL, RollTime.DEFAULT, 1, function (character, roll, parameters) {
            roll.add_damage('2d8', Damage.AIR);
            return true;
        });

        chat(character, ability_block_format.format(ability['name'], ability['class'],
                                                    ability['description'].join('\n')));
    }


    function air_duelist_cutting_winds(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('6d8', Damage.AIR);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.AIR);
        roll.add_effect('Knocks prone');

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function air_duelist_mistral_bow(character, ability, parameters) {
        add_persistent_effect(character, ability, parameters, character, Duration.ONE_MINUTE(), Ordering(),
                              RollType.PHYSICAL, RollTime.DEFAULT, 1, function (character, roll, parameters) {
            roll.add_effect('Bow attacks push target 5ft away');
            return true;
        });

        print_ability_description(character, ability);
    }


    function aquamancer_baptize(character, ability, parameters) {
        const roll = new Roll(character, RollType.HEALING);
        roll.add_damage('6d6', Damage.HEALING);
        roll.add_effect('Cleanse a random condition on the target for every 6 you roll');

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function aquamancer_tidal_wave(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('8d6', Damage.WATER);
        roll.add_effect('Leaves behind a field of shallow water that is difficult terrain for 1 hour');

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function arcane_archer_broadhead_arrow(character, ability, parameters) {
        const sacrifice = get_parameter('sacrifice', parameters);
        if (sacrifice !== null) {
            for (let i = 0; i < persistent_effects.length; i++) {
                if (persistent_effects[i].name === ability.name && persistent_effects[i].target === character.name) {
                    persistent_effects.splice(i, 1);

                    const ability_copy = {...ability};
                    ability_copy.name = ability.name + ' (sacrificed)';
                    add_persistent_effect(character, ability_copy, parameters, character, Duration.SINGLE_USE(),
                                          Ordering(), RollType.PHYSICAL, RollTime.DEFAULT, 1,
                                          function (char, roll, parameters) {
                        roll.add_multiplier(2, Damage.PHYSICAL, character.name);
                        roll.add_effect('Ignore 100% of target\'s AC');
                        return true;
                    });

                    chat(character, 'Sacrificed Broadhead Arrow');
                    return;
                }
            }

            const msg_format = 'Broadhead Arrow is not active on %s, and thus cannot be sacrificed.'
            chat(character, msg_format.format(character.name));

        } else {
            add_persistent_effect(character, ability, parameters, character, Duration.ONE_MINUTE(), Ordering(),
                                  RollType.PHYSICAL, RollTime.DEFAULT, 1, function (char, roll, parameters) {
                roll.add_multiplier(1, Damage.PHYSICAL, character.name);
                roll.add_effect('Single target attacks hit adjacent targets');
                return true;
            });

            print_ability_description(character, ability);
        }
    }


    function arcane_archer_elusive_hunter(character, ability, parameters) {
        add_persistent_effect(character, ability, parameters, character, Duration.ONE_MINUTE(), Ordering(),
                              RollType.ALL, RollTime.DEFAULT, 1, function (character, roll, parameters) {
            roll.add_stat_multiplier(Stat.EVASION, 0.5);
            roll.add_stat_bonus(Stat.MOVEMENT_SPEED, 15);
            return true;
        });

        print_ability_description(character, ability);
    }


    function arcane_archer_persistent_hunter(character, ability, parameters) {
        add_persistent_effect(character, ability, parameters, character, Duration.ONE_MINUTE(), Ordering(),
                              RollType.ALL, RollTime.DEFAULT, 1, function (character, roll, parameters) {
            roll.add_stat_bonus(Stat.CONDITION_RESIST, 30);
            roll.add_crowd_control_resist(30);
            return true;
        });

        print_ability_description(character, ability);
    }


    function arcane_archer_surefire_shot(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('7d8', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);

        // Get number of buffs on character
        let num_buffs = 0;
        for (let i = 0; i < persistent_effects.length; i++) {
            const effect = persistent_effects[i];
            if (effect.target === character.name && effect.effect_type === EffectType.BUFF) {
                num_buffs += 1;
            }
        }

        roll.add_hidden_stat(HiddenStat.ACCURACY, 20 * num_buffs);
        roll.add_hidden_stat(HiddenStat.RANGE, 40 * num_buffs);

        const sacrifice = get_parameter('sacrifice', parameters);
        if (sacrifice !== null) {
            roll.add_multiplier(0.5, Damage.PHYSICAL, character.name);
            roll.add_effect('Cannot be blocked');
        }

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function arcane_archer_swelling_shot(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('9d8', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);

        // Get number of buffs on character
        let num_buffs = 0;
        for (let i = 0; i < persistent_effects.length; i++) {
            const effect = persistent_effects[i];
            if (effect.target === character.name && effect.effect_type === EffectType.BUFF) {
                num_buffs += 1;
            }
        }

        roll.add_effect('%s ft square AOE'.format(25 + 10 * num_buffs));

        const sacrifice = get_parameter('sacrifice', parameters);
        if (sacrifice !== null) {
            roll.add_multiplier(0.5, Damage.PHYSICAL, character.name);
            roll.add_effect('On hit Crippled [[d100]]');
        }

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function arcanist_magic_dart(character, ability, parameters) {
        const parameter = get_parameter('damage_types', parameters);
        if (parameter === null) {
            chat(character, '"damage_types" parameter is missing');
            return;
        }

        let damage_type_strings = parameter.split(' ');
        if (damage_type_strings.length === 1) {
            damage_type_strings.push(damage_type_strings[0]);
            damage_type_strings.push(damage_type_strings[0]);
        }

        // Check that we understand the given damage types
        const damage_types = []
        for (let i = 0; i < damage_type_strings.length; i++) {
            const damage_type = get_damage_from_type(damage_type_strings[i]);
            if (damage_type === null) {
                chat(character, 'Unrecognized damage type "%s"'.format(damage_type_strings[i]));
                return;
            }
            damage_types.push(damage_type);
        }

        // This is a bit more complicated that you might expect in case the spell has the ability to crit.
        const dummy_roll = new Roll(character, RollType.MAGIC);
        roll_crit(ability, dummy_roll, parameters, function (crit_section) {
            for (let i = 0; i < damage_types.length; i++) {
                const modified_ability = {
                    'name': '%s (%s)'.format(ability.name, damage_types[i]),
                    'tags': ability.tags,
                };

                const roll = new Roll(character, RollType.MAGIC);
                roll.add_damage('1d12', damage_types[i]);
                roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), damage_types[i]);

                roll.copy_damages(dummy_roll);
                roll.copy_multipliers(dummy_roll);
                roll.copy_effects(dummy_roll);

                if (!add_extras(character, modified_ability, dummy_roll, RollTime.POST_CRIT, parameters,
                                crit_section)) {
                    return;
                }

                if (!roll.should_apply_crit) {
                    crit_section = '';
                }

                const rolls_per_type = roll.roll();
                format_and_send_roll(character, modified_ability.name, roll, rolls_per_type, crit_section);
            }

            finalize_roll(character, dummy_roll, parameters);
        });
    }


    function arcanist_magic_primer(character, ability, parameters) {
        // This should be applied before other effects that rely on knowing whether or not a roll was a crit
        add_persistent_effect(character, ability, parameters, character, Duration.SINGLE_USE(), Ordering(10),
                              RollType.MAGIC, RollTime.DEFAULT, 1, function (char, roll, parameters) {
            roll.add_multiplier(0.3, Damage.ALL, character.name);
            roll.should_apply_crit = true;
            return true;
        });

        print_ability_description(character, ability);
    }


    function archaeomancer_skill_boost(character, ability, parameters) {
        const target_characters = get_target_characters('targets', parameters);

        let bonus;
        if (target_characters.length === 1) {
            bonus = 40;
        } else {
            bonus = 20;
        }

        for (let i = 0; i < target_characters.length; i++) {
            const target_character = target_characters[i];
            add_persistent_effect(character, ability, parameters, target_character, Duration.ONE_HOUR(), Ordering(),
                                  RollType.ALL, RollTime.DEFAULT, 1, function (char, roll, parameters) {
                roll.add_skill_bonus(Skill.ALL, bonus);
                return true;
            });
        }

        print_ability_description(character, ability);
    }


    function assassin_backstab(character, ability, parameters) {
        const parameter = get_parameter('hidden', parameters);

        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('3d4', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);

        roll_crit(ability, roll, parameters, function (crit_section) {
            let hidden_effect = false;
            for (let i = 0; i < roll.effects.length; i++) {
                if (roll.effects[i] === 'Hidden') {
                    hidden_effect = true;
                    break;
                }
            }

            if ((parameter !== null && parameter === 'true') || hidden_effect) {
                roll.max_damage = true;
            }

            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function assassin_focus(character, ability, parameters) {
        add_persistent_effect(character, ability, parameters, character, Duration.SINGLE_USE(), Ordering(),
                              RollType.ALL, RollTime.DEFAULT, 1, function (character, roll, parameters) {
            roll.add_stat_bonus(Stat.CRITICAL_HIT_CHANCE, 30);
            return true;
        });

        print_ability_description(character, ability);
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
        for (let i = 0; i < dice_divisions.length; i++) {
            total_dice += parse_int(dice_divisions[i]);
        }

        if (total_dice !== 16) {
            chat(character, 'Total dice do not add up to 16');
            return;
        }

        const dummy_roll = new Roll(character, RollType.PHYSICAL);
        roll_crit(ability, dummy_roll, parameters, function (crit_section) {
            if (!add_extras(character, ability, dummy_roll, RollTime.POST_CRIT, parameters, crit_section)) {
                return;
            }

            for (let i = 0; i < dice_divisions.length; i++) {
                const roll = new Roll(character, RollType.PHYSICAL);
                roll.add_damage('%sd4'.format(dice_divisions[i]), Damage.PHYSICAL);
                add_scale_damage(character, roll, parameters);

                const lethality_chance = 5 * dice_divisions[i];
                roll.add_effect('%s% Massacre lethality chance, chance: [[d100cs>%s]]'.format(
                    lethality_chance, 100 - Math.min(101, lethality_chance) + 1))

                roll.copy_damages(dummy_roll);
                roll.copy_multipliers(dummy_roll);
                roll.copy_effects(dummy_roll);

                // Copy hidden stats
                const hidden_stats = Object.keys(dummy_roll.hidden_stats);
                for (let i = 0; i < hidden_stats.length; i++) {
                    const hidden_stat = hidden_stats[i];
                    const base_bonus = dummy_roll.hidden_stats[hidden_stat];
                    roll.add_hidden_stat(hidden_stat, base_bonus);
                }

                const rolls_per_type = roll.roll();
                format_and_send_roll(character, '%s (%sd4)'.format(ability.name, dice_divisions[i]), roll,
                                     rolls_per_type, crit_section);
            }

            finalize_roll(character, dummy_roll, parameters);
        });
    }


    function assassin_sharpen(character, ability, parameters) {
        add_persistent_effect(character, ability, parameters, character, Duration.ONE_MINUTE(), Ordering(90),
                              RollType.ALL, RollTime.POST_CRIT, 1, function (character, roll, parameters) {
            // We're going to inspect the damages accumulated in the roll and change any d4's to d6's. This relies
            // on the fact that persistent effects are added to rolls last and that "Ordering 90" will occur after
            // other effects that add damage to rolls.
            Object.keys(roll.damages).forEach(function (dmg_type) {
                roll.damages[dmg_type] = roll.damages[dmg_type].replace(/d4/g, 'd6');
            });
            return true;
        });

        print_ability_description(character, ability);
    }


    function assassin_skyfall(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('8d4', Damage.PHYSICAL);
        roll.add_crit_damage_mod(100);
        add_scale_damage(character, roll, parameters);

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function assassin_vanish(character, ability, parameters) {
        const modified_name = {'name': 'Hidden'}
        add_persistent_effect(character, modified_name, parameters, character, Duration.SINGLE_USE(), Ordering(),
                              RollType.ALL, RollTime.DEFAULT, 1, function (character, roll, parameters) {
            roll.add_effect('Hidden');
            return true;
        });

        print_ability_description(character, ability);
    }


    function captain_blitzkrieg(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('5d10', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
        print_ability_description(character, ability);
    }


    function captain_inspirational_speech(character, ability, parameters) {
        const parameter = get_parameter('targets', parameters);
        if (parameter === null) {
            chat(character, '"targets" parameter, the list of affected players, is missing');
            return;
        }

        const target_names = remove_empty(trim_all(parameter.split(',')));
        const target_characters = [];
        for (let i = 0; i < target_names.length; i++) {
            const target_character = get_character(target_names[i]);
            target_characters.push(target_character);
        }

        const source = character.name;
        for (let i = 0; i < target_characters.length; i++) {
            const target_character = target_characters[i];
            add_persistent_effect(character, ability, parameters, target_character, Duration.SOFT(1), Ordering(),
                                  RollType.ALL, RollTime.DEFAULT, 1, function (char, roll, parameters) {
                roll.add_multiplier(1, Damage.ALL, source);
                return true;
            });
        }

        print_ability_description(character, ability);
    }


    function champion_disarming_blow(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('5d6', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);

        roll_crit(ability, roll, parameters, function (crit_section) {
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
        add_scale_damage(character, roll, parameters);

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function champion_skull_bash(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('6d10', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);
        roll.add_effect('Stun target until end of their next turn CR:[[1d100]]');

        roll_crit(ability, roll, parameters, function (crit_section) {
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
            add_scale_damage(character, roll, parameters);

            roll_crit(ability, roll, parameters, function (crit_section) {
                do_roll(character, ability, roll, parameters, crit_section);
            });
            return;
        }

        const rolls_to_keep = get_parameter('keep', parameters);
        if (rolls_to_keep === null) {
            // If not using a sword or axe, the caller has to select what they want to re-roll. Send out the initial
            // roll first so that the caller can select what to re-roll.
            let message = '&{template:Barbs} {{name=%s}} {{physical=%s}} {{button=%s}}'
            let rolls = '[[d10]][[d10]][[d10]][[d10]][[d10]]';

            let button_section = '<a href="!barbs ability $%s$ %s;%s;%s;keep ?{Rolls to keep:}">Pick Rolls to Keep</a>';
            // Colons don't play well in the href for buttons in chat, for some reason. We don't really need them for
            // parameters, though, so just take them out.
            const parameters_string = parameters.join(';').replace(/:/g, '');
            button_section = button_section.format(character.name, ability['class'], ability.name, parameters_string);

            message = message.format(ability.name, rolls, button_section);
            LOG.info('Roll: ' + message);
            chat(character, message);
            return;
        }

        const roll = new Roll(character, RollType.PHYSICAL);

        let values = [];
        if (rolls_to_keep !== '') {
            values = rolls_to_keep.split(/[\s,]+/);
            values.forEach(function (value) {
                roll.add_damage(value, Damage.PHYSICAL);
            });
        }

        if (values.length > 5) {
            chat(character, 'Too many values to keep given');
            return;
        }

        roll.add_damage('%sd10'.format(5 - values.length), Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);

        roll_crit(ability, roll, parameters, function(crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function cryomancer_aurora_beam(character, ability, parameters) {
        const mana = get_parameter('mana', parameters);
        if (mana === null) {
            chat(character, '"mana" parameter, the amount of mana you are spending, is missing');
            return;
        }

        const dice = parse_int(mana) / 5;

        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('%sd8'.format(dice), Damage.ICE);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.ICE);


        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function cryomancer_glacial_crash(character, ability, parameters) {
        const roll_1 = new Roll(character, RollType.MAGIC);
        roll_1.add_damage('8d8', Damage.ICE);
        roll_1.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.ICE);
        roll_1.add_effect('Frozen CR:[[1d100]]');
        const a_1 = {
            'name': '%s (5 ft)'.format(ability.name),
            'tags': ability.tags,
        }
        roll_crit(a_1, roll_1, parameters, function (crit_section) {
            do_roll(character, a_1, roll_1, parameters, crit_section, /*do_finalize=*/false);
        });

        const roll_2 = new Roll(character, RollType.MAGIC);
        roll_2.add_damage('6d8', Damage.ICE);
        roll_2.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.ICE);
        roll_2.add_effect('Slowed CR:[[1d100]]');
        const a_2 = {
            'name': '%s (10 ft)'.format(ability.name),
            'tags': ability.tags,
        }
        roll_crit(a_2, roll_2, parameters, function (crit_section) {
            do_roll(character, a_2, roll_2, parameters, crit_section, /*do_finalize=*/false);
        });

        const roll_3 = new Roll(character, RollType.MAGIC);
        roll_3.add_damage('4d8', Damage.ICE);
        roll_3.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.ICE);
        const a_3 = {
            'name': '%s (15 ft)'.format(ability.name),
            'tags': ability.tags,
        }
        roll_crit(a_3, roll_3, parameters, function (crit_section) {
            do_roll(character, a_3, roll_3, parameters, crit_section, /*do_finalize=*/true);
        });
    }


    function cryomancer_frostbite(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);

        const dmg = get_parameter('dmg', parameters);
        if (dmg === null) {
            chat(character, 'Missing parameter "dmg"');
            return;
        }

        roll.add_damage(dmg, Damage.ICE);
        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function cryomancer_ice_spear(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('6d8', Damage.ICE);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.ICE);
        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function daggerspell_exposing_tear(character, ability, parameters) {
        const type = get_parameter('type', parameters);
        assert(type !== null, '"type" parameter is required');

        const magic_type = get_damage_from_type(type)
        assert(magic_type !== null, 'Unexpected damage type "%s"'.format(type));

        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('8d8', magic_type);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), magic_type);

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function daggerspell_absorption_well(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('12d8', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function daggerspell_fadeaway_slice(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('4d4', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function daggerspell_hidden_blade(character, ability, parameters) {
        add_persistent_effect(character, ability, parameters, character, Duration.ONE_MINUTE(), Ordering(),
                              RollType.PHYSICAL, RollTime.DEFAULT, 1, function (char, roll, parameters) {
            roll.add_stat_bonus(Stat.CRITICAL_HIT_CHANCE, 15);

            const empowered = get_parameter('empowered', parameters);
            if (empowered !== null) {
                roll.add_effect('Hidden');
            }

            return true;
        });

        print_ability_description(character, ability);
    }


    function daggerspell_shieldbreaker(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('6d4', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);
        roll.add_effect('Cannot be blocked by spells or magic effects');

        const empowered = get_parameter('empowered', parameters);
        if (empowered !== null) {
            roll.add_effect('-40% MR [[d100]]');
        } else {
            roll.add_effect('-20% MR [[d100]]');
        }

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function daggerspell_heartpiercer(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('8d4', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);

        let empowered = get_parameter('empowered', parameters);
        if (empowered !== null) {
            assert_numeric(empowered, 'Non-numeric value "%s" for "empowered" parameter', empowered);
            empowered = parse_int(empowered);

            if (empowered >= 20) {
                roll.add_multiplier(1, Damage.PHYSICAL, character.name);
            }
            if (empowered >= 40) {
                roll.add_crit_damage_mod(100);
            }
            if (empowered >= 50) {
                roll.add_stat_bonus(Stat.CRITICAL_HIT_CHANCE, 1000);
            }
        }

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function dynamancer_spark_bolt(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('4d12', Damage.LIGHTNING);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.LIGHTNING);
        roll.add_effect('50% chance to deal an additional d12 lightning magic damage Chance: [[1d100]]');
        roll.add_effect('30% to inflict Paralyze for 1 minute Chance:[[1d100]] CR:[[1d100]]');
        roll.add_effect('20% to inflict Stunned until the beginning of your next turn Chance: [[1d100]] CR:[[1d100]]');
        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function destroyer_challenge(character, ability, parameters) {
        let num_targets = get_parameter('targets', parameters);
        let buff = get_parameter('buff', parameters);

        if (num_targets !== null) {
            // Do the CR roll for the taunts
            num_targets = parse_int(num_targets);
            assert(!Number.isNaN(num_targets), 'Value for "targets" parameter must be numeric');

            let rolls = '';
            for (let i = 0; i < num_targets; i++) {
                rolls += '[[d100]]';
            }

            const effects_section = effects_section_format.format(
                '<li>Taunt %s enemies: %s</li>'.format(num_targets, rolls));
            const msg = roll_format.format(ability.name, /*damage_section=*/'', /*crit_section=*/'',
                                           /*combo_section=*/'', effects_section);
            chat(character, msg);

        } else if (buff !== null) {
            // Add the buff based on how many enemies failed the taunt
            buff = parse_int(buff);
            assert(!Number.isNaN(buff), 'Value for "count" parameter must be numeric');

            add_persistent_effect(character, ability, parameters, character, Duration.ONE_MINUTE(), Ordering(),
                                  RollType.ALL, RollTime.DEFAULT, 1, function (char, roll, parameters) {
                roll.add_stat_multiplier(Stat.AC, 0.1 * buff);
                roll.add_stat_bonus(Stat.MAGIC_RESIST, 10 * buff);
                return true;
            });

            const msg = roll_format.format(
                ability.name, /*damage_section=*/'', /*crit_section=*/'', /*combo_section=*/'',
                /*effects_section=*/effects_section_format.format('<p>Gain %s% AC and MR.</p>'.format(10 * buff)));
            chat(character, msg);

        } else {
            chat(character, '"targets" or "buff" parameter should be specified');
        }
    }


    function destroyer_execute(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('6d10', Damage.PHYSICAL);
        roll.add_effect('Lethality equal to target\'s missing health after this damage');
        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function destroyer_leaping_crush(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('8d10', Damage.PHYSICAL);
        roll.add_effect('Knock up enemies [[d100]]');
        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function destroyer_mortal_strike(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('5d10', Damage.PHYSICAL);
        roll.add_effect('Shred 25% AC [[d100]]');
        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function destroyer_rampage(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('6d10', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);
        roll.add_effect('Knock targets prone');

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function destroyer_slam(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('4d10', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);
        roll.add_effect('Inflict Physical Vulnerability equal to 10% + X%, where X is the target\'s current Physical Vulnerability CR:[[1d100]]');

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function destroyer_whirlwind(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('5d10', Damage.PHYSICAL);
        roll.add_effect('Targets with full health take double damage');
        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function destroyer_willbreaker(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('8d10', Damage.PHYSICAL);
        roll.add_effect('Inflict condition that prevents reactions to dash away from or block your attacks [[d100]]');
        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function _dragoncaller_make_roll(character, ability, parameters, minion_name, roll_type, is_self) {
        assert_type(character, Character, '_dragoncaller_make_roll() character');
        assert_not_null(ability, '_dragoncaller_make_roll() ability');
        assert_not_null(parameters, '_dragoncaller_make_roll() parameters');
        assert_not_null(minion_name, '_dragoncaller_make_roll() minion_name');
        assert_enum(roll_type, RollType, '_dragoncaller_make_roll() roll_type');
        assert_not_null(is_self, '_dragoncaller_make_roll() is_self');

        if (is_self) {
            // Character is doing the roll, via Dragonform
            const roll = new Roll(character, roll_type)
            return [character, roll];

        } else {
            // Minion is doing the roll
            const dragon = make_minion(character, minion_name);
            const roll = make_minion_roll(character, ability, parameters, dragon, roll_type);
            return [dragon, roll];
        }
    }


    function dragoncaller_summon_bronze_dragon(character, ability, parameters, is_self = false) {
        const short_name = 'Bronze Dragon';

        const major_action = get_parameter('major', parameters);
        if (major_action !== null) {
            if (major_action === 'breath') {
                const results = _dragoncaller_make_roll(character, ability, parameters, short_name,
                                                        RollType.MAGIC, is_self);
                const char = results[0];
                const roll = results[1];
                roll.add_damage('10d12', Damage.LIGHTNING);

                roll_crit(ability, roll, parameters, function (crit_section) {
                    do_roll(char, ability, roll, parameters, crit_section);
                });

            } else if (major_action === 'claw') {
                const results = _dragoncaller_make_roll(character, ability, parameters, short_name,
                                                        RollType.PHYSICAL, is_self);
                const char = results[0];
                const roll = results[1];
                roll.add_damage('10d10', Damage.PHYSICAL);

                roll_crit(ability, roll, parameters, function (crit_section) {
                    do_roll(char, ability, roll, parameters, crit_section);
                });

            } else {
                chat(character, 'Unexpected option for parameter "major", expected {claw/breath}')
            }
        }

        const minor_action = get_parameter('minor', parameters);
        if (minor_action !== null) {
            const target_names = remove_empty(trim_all(minor_action.split(',')));
            const target_characters = [];
            const official_names = []
            for (let i = 0; i < target_names.length; i++) {
                const target_character = get_character(target_names[i]);
                target_characters.push(target_character);
                official_names.push(target_character.name);
            }

            for (let i = 0; i < target_characters.length; i++) {
                const target_character = target_characters[i];
                let count = 1;
                for (let j = 0; j < persistent_effects.length; j++) {
                    const persistent_effect = persistent_effects[j];
                    if (persistent_effect.target === target_character.name && persistent_effect.name.startsWith(short_name)) {
                        count = persistent_effect.count + 1;
                        persistent_effects.splice(j, 1);
                        LOG.debug('Found previous instance of %s on %s, replacing it with %s instance'.format(
                            short_name, target_character.name, count));
                        break;
                    }
                }

                const modified_name = {'name': '%s: %s MS and %s% AC Pen'.format(short_name, 10 * count, 10 * count)}
                add_persistent_effect(character, modified_name, parameters, target_character, Duration.ONE_MINUTE(),
                                      Ordering(), RollType.ALL, RollTime.DEFAULT, count,
                                      function (char, roll, parameters) {
                    roll.add_stat_bonus(Stat.MOVEMENT_SPEED, 10 * count);
                    roll.add_hidden_stat(HiddenStat.AC_PENETRATION, 10 * count);
                    return true;
                });
            }

            chat(character, 'Buffed ' + official_names.join(', '));
        }
    }


    function dragoncaller_summon_silver_dragon(character, ability, parameters, is_self = false) {
        const short_name = 'Silver Dragon';

        const major_action = get_parameter('major', parameters);
        if (major_action !== null) {
            if (major_action === 'breath') {
                const results = _dragoncaller_make_roll(character, ability, parameters, short_name,
                                                        RollType.MAGIC, is_self);
                const char = results[0];
                const roll = results[1];
                roll.add_damage('12d8', Damage.ICE);

                roll_crit(ability, roll, parameters, function (crit_section) {
                    do_roll(char, ability, roll, parameters, crit_section);
                });

            } else if (major_action === 'tail') {
                const results = _dragoncaller_make_roll(character, ability, parameters, short_name,
                                                        RollType.PHYSICAL, is_self);
                const char = results[0];
                const roll = results[1];
                roll.add_damage('8d10', Damage.PHYSICAL);

                roll_crit(ability, roll, parameters, function (crit_section) {
                    do_roll(char, ability, roll, parameters, crit_section);
                });

            } else {
                chat(character, 'Unexpected option for parameter "major", expected {tail/breath}')
            }
        }

        const minor_action = get_parameter('minor', parameters);
        if (minor_action !== null) {
            const target_names = remove_empty(trim_all(minor_action.split(',')));
            const target_characters = [];
            const official_names = []
            for (let i = 0; i < target_names.length; i++) {
                const target_character = get_character(target_names[i]);
                target_characters.push(target_character);
                official_names.push(target_character.name);
            }

            for (let i = 0; i < target_characters.length; i++) {
                const target_character = target_characters[i];
                let count = 1;
                for (let j = 0; j < persistent_effects.length; j++) {
                    const persistent_effect = persistent_effects[j];
                    if (persistent_effect.target === target_character.name && persistent_effect.name.startsWith(short_name)) {
                        count = persistent_effect.count + 1;
                        persistent_effects.splice(j, 1);
                        LOG.debug('Found previous instance of %s on %s, replacing it with %s instance'.format(
                            short_name, target_character.name, count));
                        break;
                    }
                }

                const modified_name = {'name': '%s: %s% CR and %s% Magic Pen'.format(short_name, 10 * count, 10 * count)}
                add_persistent_effect(character, modified_name, parameters, target_character, Duration.ONE_MINUTE(),
                                      Ordering(), RollType.ALL, RollTime.DEFAULT, count,
                                      function (char, roll, parameters) {
                    roll.add_stat_bonus(Stat.CONDITION_RESIST, 10 * count);
                    roll.add_hidden_stat(HiddenStat.GENERAL_MAGIC_PENETRATION, 10 * count);
                    return true;
                });
            }

            chat(character, 'Buffed ' + official_names.join(', '));
        }
    }


    function dragoncaller_summon_gold_dragon(character, ability, parameters, is_self = false) {
        const short_name = 'Gold Dragon';

        const major_action = get_parameter('major', parameters);
        if (major_action !== null) {
            // There's only one option, but we're doing it like this so that this ability follows the same pattern as
            // other summons in this class.
            if (major_action === 'breath') {
                const results = _dragoncaller_make_roll(character, ability, parameters, short_name,
                                                        RollType.MAGIC, is_self);
                const char = results[0];
                const roll = results[1];
                roll.add_damage('10d12', Damage.FIRE);
                roll.add_effect('Leaves behind a field of fire');
                roll.add_hidden_stat(HiddenStat.GENERAL_MAGIC_PENETRATION, 100);

                roll_crit(ability, roll, parameters, function (crit_section) {
                    do_roll(char, ability, roll, parameters, crit_section);
                });

            } else {
                chat(character, 'Unexpected option for parameter "major", expected {breath}')
            }
        }

        const minor_action = get_parameter('minor', parameters);
        if (minor_action !== null) {
            const target_names = remove_empty(trim_all(minor_action.split(',')));
            const target_characters = [];
            const official_names = []
            for (let i = 0; i < target_names.length; i++) {
                const target_character = get_character(target_names[i]);
                target_characters.push(target_character);
                official_names.push(target_character.name);
            }

            for (let i = 0; i < target_characters.length; i++) {
                const target_character = target_characters[i];
                let count = 1;
                for (let j = 0; j < persistent_effects.length; j++) {
                    const persistent_effect = persistent_effects[j];
                    if (persistent_effect.target === target_character.name && persistent_effect.name.startsWith(short_name)) {
                        count = persistent_effect.count + 1;
                        persistent_effects.splice(j, 1);
                        LOG.debug('Found previous instance of %s on %s, replacing it with %s instance'.format(
                            short_name, target_character.name, count));
                        break;
                    }
                }

                const modified_name = {'name': '%s: %s% increased damage'.format(short_name, 20 * count)}
                add_persistent_effect(character, modified_name, parameters, target_character, Duration.ONE_MINUTE(),
                                      Ordering(), RollType.ALL, RollTime.DEFAULT, count,
                                      function (char, roll, parameters) {
                    roll.add_multiplier(0.2 * count, Damage.ALL, short_name);
                    return true;
                });
            }

            chat(character, 'Buffed ' + official_names.join(', '));
        }
    }


    function dragoncaller_bronze_dragon_breath(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('6d12', Damage.LIGHTNING);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.LIGHTNING);

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function dragoncaller_silver_dragon_breath(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('10d8', Damage.ICE);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.ICE);

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function dragoncaller_gold_dragon_breath(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('8d12', Damage.FIRE);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.FIRE);

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function dragoncaller_dragonform(character, ability, parameters) {
        const transform = get_parameter('transform', parameters);
        const bronze = get_parameter('bronze', parameters);
        const silver = get_parameter('silver', parameters);
        const gold = get_parameter('gold', parameters);

        if (transform !== null) {
            add_persistent_effect(character, ability, parameters, character, Duration.ONE_MINUTE(),
                                  Ordering(), RollType.ALL, RollTime.DEFAULT, 1, function (char, roll) {
                roll.add_stat_bonus(Stat.HEALTH, 300);
                roll.add_stat_bonus(Stat.AC, 30);
                roll.add_stat_bonus(Stat.MAGIC_RESIST, 30);
                roll.add_stat_bonus(Stat.EVASION, 30);
                roll.add_stat_bonus(Stat.CONDITION_RESIST, 30);
                return true;
            });

            print_ability_description(character, ability);

        } else if (bronze !== null) {
            dragoncaller_summon_bronze_dragon(character, ability, parameters, /*self=*/true);
        } else if (silver !== null) {
            dragoncaller_summon_silver_dragon(character, ability, parameters, /*self=*/true);
        } else if (gold !== null) {
            dragoncaller_summon_gold_dragon(character, ability, parameters, /*self=*/true);
        }
    }


    function dragoncaller_dragonflight(character, ability, parameters) {
        const targets = get_parameter('targets', parameters);
        assert(targets !== null, '"targets" parameter is required');

        const target_names = remove_empty(trim_all(targets.split(',')));
        const target_characters = [];
        const effects = ['<p>The following characters have flying Movement Speed and cleanse one condition:</p>'];
        for (let i = 0; i < target_names.length; i++) {
            const target_character = get_character(target_names[i]);
            target_characters.push(target_character);
            effects.push('<li>%s</li>'.format(target_character.name));
        }

        for (let i = 0; i < target_characters.length; i++) {
            const target_character = target_characters[i];
            // The buff itself doesn't do anything relevant to the API, but we'll create it for buff-tracking purposes
            add_persistent_effect(character, ability, parameters, target_character, Duration.ONE_MINUTE(),
                                  Ordering(), RollType.ALL, RollTime.DEFAULT, 1, function () {
                return true;
            });
        }

        const effects_section = effects_section_format.format(effects.join(''));
        const msg = roll_format.format(ability.name, /*damage_section=*/'', /*crit_section=*/'', /*combo_section=*/'',
                                       effects_section);
        chat(character, msg);
    }


    function dragoncaller_dragonsight(character, ability, parameters) {
        const targets = get_parameter('targets', parameters);
        assert(targets !== null, '"targets" parameter is required');

        let choice = get_parameter('choice', parameters);
        assert(choice !== null, '"choice" parameter is required');

        let choice_string = '';
        if (choice === 'acc') {
            choice = HiddenStat.ACCURACY;
            choice_string = 'Accuracy';
        } else if (choice === 'ac pen') {
            choice = HiddenStat.AC_PENETRATION;
            choice_string = 'AC Penetration';
        } else if (choice === 'mr pen') {
            choice = HiddenStat.GENERAL_MAGIC_PENETRATION;
            choice_string = 'Magic Penetration';
        } else {
            chat(character, '"choice" parameter must be one of the following: {acc, ac pen, mr pen}');
            return;
        }

        const target_names = remove_empty(trim_all(targets.split(',')));
        const target_characters = [];
        const effects = ['<p>The following characters gain true sight and 50% %s:</p>'.format(choice_string)];
        for (let i = 0; i < target_names.length; i++) {
            const target_character = get_character(target_names[i]);
            target_characters.push(target_character);
            effects.push('<li>%s</li>'.format(target_character.name));
        }

        const revised_name = {'name': '%s (%s)'.format(ability.name, choice_string)};
        for (let i = 0; i < target_characters.length; i++) {
            const target_character = target_characters[i];
            // The buff itself doesn't do anything relevant to the API, but we'll create it for buff-tracking purposes
            add_persistent_effect(character, revised_name, parameters, target_character, Duration.ONE_MINUTE(),
                                  Ordering(), RollType.ALL, RollTime.DEFAULT, 1, function (char, roll, parameters) {
                roll.add_hidden_stat(choice, 50);
                return true;
            });
        }

        const effects_section = effects_section_format.format(effects.join(''));
        const msg = roll_format.format(ability.name, /*damage_section=*/'', /*crit_section=*/'', /*combo_section=*/'',
                                       effects_section);
        chat(character, msg);
    }


    function dragoncaller_dragonblood(character, ability, parameters) {
        const target_character = get_target_character('target', parameters);

        // The API isn't going to do anything for this, but we'll create it for buff-tracking purposes
        add_persistent_effect(character, ability, parameters, target_character, Duration.HARD(6 * 60),
                              Ordering(), RollType.ALL, RollTime.DEFAULT, 1, function () {
            return true;
        });

        print_ability_description(character, ability);
    }


    function enchanter_modify_weapon(character, ability, parameters) {
        const target_character = get_target_character('target', parameters);
        const choice = get_parameter('choice', parameters);
        if (choice === null) {
            chat(character, '"choice {first/second}" parameter is missing');
            return;
        }

        if (choice === 'first') {
            add_persistent_effect(character, ability, parameters, target_character, Duration.ONE_MINUTE(), Ordering(),
                                  RollType.PHYSICAL, RollTime.DEFAULT, 1, function (character, roll, parameters) {
                roll.add_damage('4d10', Damage.PHYSICAL);
                return true;
            });

        } else if (choice === 'second') {
            add_persistent_effect(character, ability, parameters, target_character, Duration.ONE_MINUTE(), Ordering(),
                                  RollType.PHYSICAL, RollTime.DEFAULT, 1, function (char, roll, parameters) {
                roll.add_multiplier(-0.5, Damage.PHYSICAL, character.name);
                return true;
            });

        } else {
            chat(character, 'Unknown value for "choice" parameter "%s"'.format(choice));
        }

        print_ability_description(character, ability);
    }


    function evangelist_anthos_pagetou_khilion_eton(character, ability, parameters) {
        let count = 1;
        if (get_parameter('me', parameters) !== null) {
            count = 2;
        }

        let num_enemies = get_parameter('enemies', parameters);
        assert(num_enemies !== null, '"enemies" parameter is required');
        num_enemies = parse_int(num_enemies);
        if (Number.isNaN(num_enemies)) {
            chat(character, 'Value given for "enemies" parameter must be numeric');
            return;
        }

        let secret_roll = '';
        for (let i = 0; i < num_enemies; i++) {
            secret_roll += '[[%sd6]]'.format(count);
        }

        hidden_roll(secret_roll, function (value_strings) {
            const effects = [];
            for (let i = 0; i < value_strings.length; i++) {
                const value_string = value_strings[i];
                const values = value_string.split('+');
                const effect_format = '<li>CR: [[d100]]<br/>Flower rolls: %s<br/>%s</li>';

                // Figure out what effect this would have, assuming the enemy fails the CR check
                let flower_effect = '';
                if (values.includes('1') || values.includes('2')) {
                    flower_effect = 'Cursed, Slowed, Confused';
                } else if (values.includes('3') || values.includes('4')) {
                    flower_effect = 'May not move away from flower';
                } else if (values.includes('5') || values.includes('6')) {
                    flower_effect = 'Must use Move Action to move towards flower';
                }

                // Build the flower rolls string
                const revised_values = [];
                for (let j = 0; j < values.length; j++) {
                    revised_values.push('[[%s]]'.format(values[j]));
                }
                const flower_rolls = revised_values.join(' ');

                effects.push(effect_format.format(flower_rolls, flower_effect));
            }

            const msg = roll_format.format(ability.name, /*damage_section=*/'', /*crit_section=*/'',
                                           /*combo_section=*/'', effects_section_format.format(effects.join('<br>')));
            chat(character, msg);
        });
    }


    function evangelist_krystalline_basileia(character, ability, parameters) {
        const conditions_paramater = get_parameter('conditions', parameters);
        if (conditions_paramater === null) {
            chat(character, '"conditions" parameter is missing');
        }

        const conditions_list = remove_empty(trim_all(conditions_paramater.split(',')));
        if (conditions_list.length !== 2) {
            chat(character, 'Select 2 conditions');
            return;
        }

        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('6d8', Damage.ICE);
        roll.add_damage('5d10', Damage.DARK);

        for (let i = 0; i < 2; i++) {
            if (conditions_list[i].toLowerCase().includes('curse')){
                roll.add_effect(conditions_list[i] + ': [[1d100]] [[1d100]]');
            } else {
                roll.add_effect(conditions_list[i] + ': [[1d100]]');
            }
        }

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function evangelist_magia_erebea(character, ability, parameters) {
        // Allows you to dispel an active Magia Erebea
        const dispel = get_parameter('dispel', parameters);
        if (dispel !== null) {
            for (let i = 0; i < persistent_effects.length; i++) {
                if (persistent_effects[i].name === 'Magia Erebea' && persistent_effects[i].target === character.name) {
                    persistent_effects.splice(i, 1);
                    chat(character, 'Removed effect "Magia Erebea" from %s'.format(character.name));
                    return;
                }
            }

            chat(character, 'Did not find existing Magia Erebea effect to remove');
            return;
        }

        const chosen_spell = get_parameter('spell', parameters);
        if (chosen_spell == null) {
            chat(character, '"spell" parameter, the absorbed spell, is missing');
            return;
        }

        // Check if Magia Erebea is already applied
        for (let i = 0; i < persistent_effects.length; i++) {
            if (persistent_effects[i].name === 'Magia Erebea' && persistent_effects[i].target === character.name) {
                chat(character, 'Magia Erebea is already applied');
                return;
            }
        }

        if (chosen_spell === 'KB') {
            const conditions_paramater = get_parameter('conditions', parameters);
            if (conditions_paramater === null) {
                chat(character, '"conditions" parameter is missing');
            }

            const conditions_list = remove_empty(trim_all(conditions_paramater.split(',')));
            if (conditions_list.length !== 2) {
                chat(character, 'Select 2 conditions');
                return;
            }

            add_persistent_effect(character, ability, parameters, character, Duration.INFINITE(), Ordering(),
                                  RollType.MAGIC, RollTime.DEFAULT, 1, function (char, roll, parameters) {
                roll.add_damage('6d8', Damage.ICE);
                roll.add_damage('5d10', Damage.DARK);

                for (let i = 0; i < 2; i++) {
                    if (conditions_list[i].toLowerCase().includes('curse')){
                        roll.add_effect(conditions_list[i] + ': [[1d100]] [[1d100]]');
                    } else {
                        roll.add_effect(conditions_list[i] + ': [[1d100]]');
                    }
                }

                return true;
            });
            chat(character,'KB absorbed');

        } else {
            chat(character, 'Unrecognized spell "%s"'.format(chosen_spell));
        }
    }


    function juggernaut_hostility(character, ability, parameters) {
        const concentration = get_parameter('conc', parameters);

        add_persistent_effect(character, ability, parameters, character, Duration.ONE_MINUTE(), Ordering(),
                              RollType.PHYSICAL, RollTime.DEFAULT, 1, function (character, roll, parameters) {
            if (concentration !== null) {
                roll.add_hidden_stat(HiddenStat.LIFESTEAL, 25);
            } else {
                roll.add_hidden_stat(HiddenStat.LIFESTEAL, 15);
            }

            return true;
        });

        print_ability_description(character, ability);
    }


    function juggernaut_tachycardia(character, ability, parameters) {
        add_persistent_effect(character, ability, parameters, character, Duration.ONE_MINUTE(), Ordering(),
                              RollType.ALL, RollTime.DEFAULT, 1, function (char, roll, parameters) {
            roll.add_stat_bonus(Stat.MOVEMENT_SPEED, 30);

            if (RollType.is_physical(roll.roll_type)) {
                roll.add_hidden_stat(HiddenStat.REACH, 5);
            }
            roll.add_hidden_stat(HiddenStat.AC_PENETRATION, 50);

            const parameter = get_parameter('low_health', parameters);
            if (parameter !== null) {
                roll.add_multiplier(1, Damage.PHYSICAL, character.name);
            }

            return true;
        });

        print_ability_description(character, ability);
    }


    function juggernaut_wild_swing(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('5d10', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);
        roll.add_hidden_stat(HiddenStat.LIFESTEAL, 30);
        roll.add_effect('+30% lifesteal if your health is below 30%');

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function ki_monk_drain_punch(character, ability, parameters) {
        const monk_dice = character.get_monk_dice();
        const spent_ki = get_parameter('ki', parameters);

        let secret_roll = '[[5d%s]]'.format(monk_dice);
        if (spent_ki !== null) {
            secret_roll += '[[5d%s]]'.format(monk_dice);
        }

        hidden_roll(secret_roll.format(monk_dice), function (value_strings) {
            const physical_damage = value_strings[0];
            const roll = new Roll(character, RollType.PHYSICAL);
            roll.add_damage(physical_damage, Damage.PHYSICAL);
            add_scale_damage(character, roll, parameters);
            roll.add_effect('Gain [[round((%s)/2)]] Ki'.format(physical_damage));

            if (spent_ki !== null) {
                const psychic_damage = value_strings[1];
                roll.add_damage(psychic_damage, Damage.PSYCHIC);
                roll.add_effect('Heal [[round((%s)/2)]]'.format(psychic_damage));
            }

            roll_crit(ability, roll, parameters, function (crit_section) {
                do_roll(character, ability, roll, parameters, crit_section);
            });
        });
    }


    function ki_monk_find_center(character, ability, parameters) {
        const monk_dice = character.get_monk_dice();
        const roll = '<li>Gain Ki: [[3d%s]]</li>'.format(monk_dice);

        const effects_section = effects_section_format.format(roll);
        const msg = roll_format.format(ability.name, /*damage_section=*/'', /*crit_section=*/'', /*combo_section=*/'',
                                       effects_section);
        chat(character, msg);
    }


    function ki_monk_spirit_punch(character, ability, parameters) {
        const monk_dice = character.get_monk_dice();

        hidden_roll('[[4d%s]]'.format(monk_dice), function (value_strings) {
            const physical_damage = value_strings[0];
            const roll = new Roll(character, RollType.PHYSICAL);
            roll.add_damage(physical_damage, Damage.PHYSICAL);
            add_scale_damage(character, roll, parameters);
            roll.add_effect('Gain [[%s]] Ki'.format(physical_damage));

            const spent_ki = get_parameter('ki', parameters);
            if (spent_ki !== null) {
                roll.add_damage('4d%s'.format(monk_dice), Damage.PSYCHIC);
            }

            roll_crit(ability, roll, parameters, function (crit_section) {
                do_roll(character, ability, roll, parameters, crit_section);
            });
        });
    }


    function ki_monk_spirit_shotgun(character, ability, parameters) {
        const monk_dice = character.get_monk_dice();

        const roll = new Roll(character, RollType.PSYCHIC);
        roll.add_damage('5d%s'.format(monk_dice), Damage.PSYCHIC);

        const spent_ki = get_parameter('ki', parameters);
        if (spent_ki !== null) {
            roll.add_multiplier(0.5, Damage.ALL, character.name);
            roll.add_effect('All hit targets are knocked back 20 ft');
        }

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function lightning_duelist_arc_lightning(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('6d8', Damage.LIGHTNING);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.LIGHTNING);

        roll_crit(ability, roll, parameters, function (crit_section) {
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
                add_scale_damage(character, roll, parameters);

                roll_crit(ability, roll, parameters, function (crit_section) {
                    do_roll(character, ability, roll, parameters, crit_section);
                });
            }
        });
    }


    function lightning_duelist_shock_tendrils(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('3d8', Damage.LIGHTNING);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.LIGHTNING);

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function lightning_duelist_shocking_parry(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('5d8', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);
        roll.add_effect('On hit, you have a 50% chance of recovering half the stamina cost');

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function lightning_duelist_sword_of_lightning(character, ability, parameters) {
        add_persistent_effect(character, ability, parameters, character, Duration.ONE_MINUTE(), Ordering(),
                              RollType.PHYSICAL, RollTime.DEFAULT, 1, function (character, roll, parameters) {
            if (RollType.is_physical(roll.roll_type)) {
                roll.add_damage('2d8', Damage.LIGHTNING);
            }
            return true;
        });

        print_ability_description(character, ability);
    }


    function luxomancer_lightbolt(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('4d10', Damage.LIGHT);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.LIGHT);

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function luxomancer_beam_of_light(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('6d10', Damage.LIGHT);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.LIGHT);

        const touch = get_parameter('guiding_light', parameters);
        if (touch !== null) {
            roll.add_effect('Ignore MR');
        }

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function luxomancer_light_touch(character, ability, parameters) {
        const touch = get_parameter('touch', parameters);
        if (touch === null) {
            chat(character, 'Missing required parameter "touch"');
            return;
        }

        const roll = new Roll(character, RollType.HEALING);
        if (touch === 'yes') {
            roll.add_damage('6d10', Damage.HEALING);
        } else {
            roll.add_damage('4d10', Damage.HEALING);
        }

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function luxomancer_warrior_of_light(character, ability, parameters) {
        const target_character = get_target_character('target', parameters);

        add_persistent_effect(character, ability, parameters, target_character, Duration.ONE_MINUTE(), Ordering(),
                              RollType.ALL, RollTime.DEFAULT, 1, function (char, roll, parameters) {
            roll.add_damage('4d10', Damage.LIGHT);
            roll.add_hidden_stat(HiddenStat.ACCURACY, 20);
            return true;
        });

        print_ability_description(character, ability);
    }


    function martial_artist_choke_hold(character, ability, parameters) {
        const monk_dice = character.get_monk_dice();

        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('4d%s'.format(monk_dice), Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function martial_artist_flying_kick(character, ability, parameters) {
        const monk_dice = character.get_monk_dice();

        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('6d%s'.format(monk_dice), Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);

        const combo_bonus = get_parameter('combo_bonus', parameters);
        if (combo_bonus !== null) {
            roll.add_combo_chance(20);
        }

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function martial_artist_focus_energy(character, ability, parameters) {
        for (let i = 0; i < persistent_effects.length; i++) {
            if (persistent_effects[i].name === ability.name && persistent_effects[i].target === character.name) {
                chat(character, 'Focus Energy is already active on %s and does not stack'.format(character.name));
                return;
            }
        }

        add_persistent_effect(character, ability, parameters, character, Duration.SINGLE_USE(), Ordering(),
                              RollType.ALL, RollTime.DEFAULT, 1, function (character, roll, parameters) {
            roll.add_combo_chance(30);
            return true;
        });

        print_ability_description(character, ability);
    }


    function mirror_mage_helix_beam(character, ability, parameters) {
        // Add this in to get the arbitrary takeover handler to get called
        parameters.push('helix_beam');

        const p = get_parameter('element', parameters);
        if (p === null) {
            chat(character, 'Starting "element" parameter is required');
            return;
        }

        let element = get_damage_from_type(p);
        if (element === null) {
            chat(character, 'Unrecognized starting element ' + p);
            return;
        }

        if (element !== Damage.ICE && element !== Damage.LIGHT) {
            chat(character, 'Starting element must be ice or light');
            return;
        }

        // If this attack isn't being redirected
        const redirects_param = get_parameter('redirected', parameters);
        if (redirects_param === null) {
            const roll = new Roll(character, RollType.MAGIC);
            roll.add_damage('9d8', element);
            roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), element);

            if (element === Damage.ICE) {
                roll.add_hidden_stat(HiddenStat.FROZEN_CHANCE, 20);
            } else if (element === Damage.LIGHT) {
                roll.add_hidden_stat(HiddenStat.STUN_CHANCE, 20);
            }

            roll_crit(ability, roll, parameters, function (crit_section) {
                do_roll(character, ability, roll, parameters, crit_section);
            });
            return;
        }

        const redirects = parse_int(redirects_param);
        if (Number.isNaN(redirects)) {
            chat(character, 'Non-numeric redirects "%s"'.format(redirects_param));
            return;
        }

        // If the attack is being redirected
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('9d8', Damage.ICE);
        roll.add_damage('9d8', Damage.LIGHT);

        roll_crit(ability, roll, parameters, function (crit_section) {
            // Don't use do_roll(), because we don't actually want to send this roll to chat. Don't use add_extras()
            // because we're handling redirects ourselves and don't want to run takeover parameters.
            add_items_to_roll(character, roll, RollTime.POST_CRIT, parameters);

            const runnables_1 = get_applicable_normal_arbitrary_parameter_handlers(ability, roll, RollTime.POST_CRIT,
                                                                                   parameters);
            const runnables_2 = get_applicable_persistent_effects_to_roll(character, roll, RollTime.POST_CRIT,
                                                                          parameters);
            const runnables = merge(runnables_1, runnables_2);

            for (let i = 0; i < runnables.length; i++) {
                if (!runnables[i].modified_handler()) {
                    LOG.warn('Problem adding effects at time ' + RollTime.POST_CRIT);
                    return false;
                }
            }

            // Extract damages from the original roll and send them to chat to actually do the roll.
            let fake = '';
            const damage_types = Object.keys(roll.damages);
            for (let i = 0; i < damage_types.length;i++) {
                if (!roll.max_damage) {
                    fake = fake + '[[%s]]'.format(roll.damages[damage_types[i]]);
                } else {
                    fake = fake + '[[9*8]]'.format(roll.damages[damage_types[i]]);
                }
            }
            LOG.info('Alter course, fake roll: ' + fake);

            chat(character, fake,  function (results) {
                const rolls = results[0].inlinerolls;
                LOG.info('Alter course, fake roll result: ' + JSON.stringify(rolls));

                for (let redirect_num = 0; redirect_num <= redirects; redirect_num++) {
                    const redirected_roll = new Roll(character, RollType.MAGIC);

                    // Steal the multipliers from the original roll.
                    redirected_roll.copy_multipliers(roll);

                    // Copy damages from what we got back from sending the damages to chat to be rolled.
                    for (let i = 0; i < damage_types.length; i++) {
                        if (damage_types[i] === element) {
                            const damage = rolls[i].results.total.toString();
                            redirected_roll.add_damage(damage, damage_types[i]);

                            if (damage_types[i] === Damage.ICE) {
                                redirected_roll.add_hidden_stat(HiddenStat.FROZEN_CHANCE, 20);
                                element = Damage.LIGHT;
                            } else if (damage_types[i] === Damage.LIGHT) {
                                redirected_roll.add_hidden_stat(HiddenStat.STUNNED_CHANCE, 20);
                                element = Damage.ICE;
                            }
                            break;
                        }
                    }

                    // Copy crit status
                    redirected_roll.crit = roll.crit;
                    redirected_roll.crit_damage_mod = roll.crit_damage_mod;
                    redirected_roll.should_apply_crit = roll.should_apply_crit;

                    if (!redirected_roll.should_apply_crit) {
                        crit_section = '';
                    }

                    // Only include the hidden stats and effects in the first roll, for cleanliness. We shouldn't care
                    // about anything else in the roll for this passive.
                    if (redirect_num === 0) {
                        redirected_roll.hidden_stats = roll.hidden_stats;
                        redirected_roll.copy_effects(roll);
                    }

                    // Add the multiplier for the redirect number
                    redirected_roll.add_multiplier(redirect_num * 0.5, Damage.ALL, character.name);

                    const rolls_per_type = redirected_roll.roll();
                    format_and_send_roll(character, 'Helix Beam (Redirect %s)'.format(redirect_num), redirected_roll,
                                         rolls_per_type, crit_section);
                }

                finalize_roll(character, roll, parameters);
            });
        });
    }


    function mirror_mage_scatter_shards(character, ability, parameters) {
        for (let i = 0; i < 3; i++) {
            const roll = new Roll(character, RollType.MAGIC);
            roll.add_damage('5d8', Damage.ICE);
            roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.ICE);

            const modified_ability = {
                'name': ability.name + ' ' + String.fromCharCode(65 + i),
                'tags': ability.tags,
            };

            roll_crit(modified_ability, roll, parameters, function (crit_section) {
                do_roll(character, modified_ability, roll, parameters, crit_section);
            });
        }
    }


    function mistguard_cold_snap(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('13d8', Damage.ICE);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.ICE);
        roll.add_effect('-5 Move Speed, stacking [[d100]]');

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function mistguard_deep_snow(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('7d8', Damage.ICE);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.ICE);

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function mistguard_glacial_gust(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('9d8', Damage.ICE);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.ICE);
        roll.add_effect('Push targets back to edge of cone');

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function mistguard_silver_armor(character, ability, parameters) {
        add_persistent_effect(character, ability, parameters, character, Duration.ONE_MINUTE(), Ordering(),
                              RollType.ALL, RollTime.DEFAULT, 1, function (character, roll) {
            roll.add_stat_bonus(Stat.AC, 40);
            roll.add_stat_bonus(Stat.MAGIC_RESIST, 40);
            // 60% critical strike resistance
            return true;
        });

        print_ability_description(character, ability);
    }


    function night_lord_decoy(character, ability, parameters) {
        // This isn't really an attack, so not using a proper roll
        const effects = [
            'Taunt all enemies in sight [[d100]]',
            'Charm all Taunted enemies [[d100]]',
        ];

        const effects_section = effects_section_format.format(effects.join(''));
        const msg = roll_format.format(ability.name, /*damage_section=*/'', /*crit_section=*/'', /*combo_section=*/'',
                                       effects_section, /*button_section=*/'');

        LOG.info('night_lord_decoy() - roll: ' + msg);
        chat(character, msg);
    }


    function night_lord_flashbang(character, ability, parameters) {
        // This isn't an attack, so not using a proper roll
        const effects = [
            'Blind all enemies in range [[d100]]',
            'Knock Prone all enemies in range [[d100]]',
        ];

        const effects_section = effects_section_format.format(effects.join(''));
        const msg = roll_format.format(ability.name, /*damage_section=*/'', /*crit_section=*/'', /*combo_section=*/'',
                                       effects_section, /*button_section=*/'');

        LOG.info('night_lord_flashbang() - roll: ' + msg);
        chat(character, msg);
    }


    function night_lord_larceny(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_effect('Drain [[6d6]] health');
        roll.add_effect('Strip 1 buff for each 6 rolled [[d100]]');

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function night_lord_lockbreaker(character, ability, parameters) {
        add_persistent_effect(character, ability, parameters, character, Duration.ONE_MINUTE(), Ordering(),
                              RollType.ALL, RollTime.DEFAULT, 1, function () {
            return true;
        });

        print_ability_description(character, ability);
    }


    function night_lord_single_track_mind(character, ability, parameters) {
        add_persistent_effect(character, ability, parameters, character, Duration.ONE_HOUR(), Ordering(),
                              RollType.ALL, RollTime.DEFAULT, 1, function () {
            return true;
        });

        print_ability_description(character, ability);
    }


    function night_lord_quickstep(character, ability, parameters) {
        add_persistent_effect(character, ability, parameters, character, Duration.HARD(1), Ordering(),
                              RollType.ALL, RollTime.DEFAULT, 1, function (character, roll) {
            roll.add_stat_multiplier(Stat.MOVEMENT_SPEED, 1);
            return true;
        });

        print_ability_description(character, ability);
    }


    function night_lord_robbery(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_effect('Drain [[6d6]] stamina or mana');
        roll.add_effect('Drained target forgets last ability used');

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function night_lord_thief_toolbelt(character, ability, parameters) {
        const parameter = get_parameter('targets', parameters);
        if (parameter === null) {
            chat(character, '"targets" parameter, the list of affected players, is missing');
            return;
        }

        const target_names = remove_empty(trim_all(parameter.split(',')));
        const target_characters = [];
        for (let i = 0; i < target_names.length; i++) {
            const target_character = get_character(target_names[i]);
            target_characters.push(target_character);
        }

        for (let i = 0; i < target_characters.length; i++) {
            const target_character = target_characters[i];
            add_persistent_effect(character, ability, parameters, target_character, Duration.ONE_MINUTE(), Ordering(),
                                  RollType.ALL, RollTime.DEFAULT, 1, function () {
                return true;
            });
        }

        print_ability_description(character, ability);
    }


    function night_lord_quick_fingers(character, ability, parameters) {
        // This isn't an attack, so not using a proper roll
        const effects = [
            'Reset action on a 2: [[d2]]',
        ];

        const effects_section = effects_section_format.format(effects.join(''));
        const msg = roll_format.format(ability.name, /*damage_section=*/'', /*crit_section=*/'', /*combo_section=*/'',
                                       effects_section, /*button_section=*/'');

        LOG.info('night_lord_quick_fingers() - roll: ' + msg);
        chat(character, msg);
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
            roll.add_effect('1 curse CR:[[1d100]]')
        } else if (delay === 'true') {
            roll.add_damage('6d10', Damage.DARK);
            roll.add_effect('2 curses CR:[[d100]][[1d100]]')
        } else {
            chat(character, 'Incorrect option for "delay" parameter, should be "delay {true/false}"')
        }

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function pinpoint_monk_atrophic_blow(character, ability, parameters) {
        const choice = get_parameter('choice', parameters);
        assert(choice !== null, '"choice {first/second}" parameter is required');

        const roll = new Roll(character, RollType.PHYSICAL);
        if (choice === 'first') {
            roll.add_effect('Inflict 40% Weaken until end of their next turn [[d100]]');
        } else if (choice === 'second') {
            roll.add_effect('Inflict 20% Weaken until end of their next turn [[d100]]');
            roll.add_combo_chance(10);
        } else {
            assert(false, 'Value for "choice" parameter must be either "first" or "second"');
            return;
        }

        do_roll(character, ability, roll, parameters, /*crit_section=*/'');
    }


    function pyromancer_banefire(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('6d12', Damage.FIRE);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.FIRE);
        roll.add_effect('Unblockable/uncounterable if this is your second fire spell this turn');
        roll.add_effect('-5% Fire MR CR:[[1d100]]');
        roll.add_effect('+5% Fire Vulnerability CR:[[1d100]]');

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function pyromancer_devour_in_flames(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);

        let vulnerability = get_parameter('vulnerability', parameters);
        if (vulnerability !== null) {
            vulnerability = parse_int(vulnerability);
            if (Number.isNaN(vulnerability)) {
                chat(character, 'Value for "vulnerability" parameter must be numeric');
                return;
            }
            roll.add_hidden_stat(HiddenStat.LETHALITY, vulnerability);
        }

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section, /*do_finalize=*/true,
                    /*last_minute_handler=*/function(r) {
                    r.add_effect('Fire magic damage multiplier: ' + eval(r.get_multiplier_string(Damage.FIRE)));
                });
        });

        print_ability_description(character, ability);
    }


    function pyromancer_magma_spray(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('4d12', Damage.FIRE);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.FIRE);
        roll.add_effect('Hit enemies 15 ft from you are inflicted with Burn X, where X is equal to the amount of damage rolled CR:[[1d100]]');
        roll.add_effect('-5% Fire MR CR:[[1d100]]');
        roll.add_effect('+5% Fire Vulnerability CR:[[1d100]]');

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function sentinel_crossguard_guillotine(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('4d10', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);

        const stacks = get_parameter('stacks', parameters);
        if (stacks !== null) {
            roll.add_damage('%sd10'.format(stacks), Damage.PHYSICAL);
            roll.add_effect('Hits enemies diagonally to your target');
        }

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function sentinel_bladeshield_arc(character, ability, parameters) {
        const stacks = get_parameter('stacks', parameters);
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('5d10', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);


        if (stacks !== null) {
            roll.add_damage('%sd10'.format(stacks), Damage.PHYSICAL);
            roll.add_effect('Range extended to 10 feet');
        }

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function sentinel_giga_drill_break(character, ability, parameters) {
        const stacks = get_parameter('stacks', parameters);
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('10d10', Damage.PHYSICAL);
        roll.add_effect('30% Physical Vulnerability + 10% for every 10 rolled. CR: [[1d100]]');
        add_scale_damage(character, roll, parameters);
        if (stacks !== null) {
            roll.add_damage('%sd10'.format(stacks), Damage.PHYSICAL)
            roll.add_hidden_stat(HiddenStat.AC_PENETRATION, 100);
        }

        roll_crit(ability, roll, parameters, function (crit_section) {
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
            // TODO: this should really modify the existing effect rather than adding a new one
            add_persistent_effect(character, ability, parameters, character, Duration.SINGLE_USE(), Ordering(),
                                  RollType.PHYSICAL, RollTime.DEFAULT, 1, function (character, roll, parameters) {
                roll.add_stat_bonus(Stat.CRITICAL_HIT_CHANCE, 10);
                roll.add_crit_damage_mod(25);
                return true;
            });

        } else {
            add_persistent_effect(character, ability, parameters, character, Duration.SINGLE_USE(), Ordering(),
                                  RollType.PHYSICAL, RollTime.DEFAULT, 1, function (character, roll, parameters) {
                roll.add_stat_bonus(Stat.CRITICAL_HIT_CHANCE, 20);
                roll.add_crit_damage_mod(50);
                return true;
            });
        }

        print_ability_description(character, ability);
    }


    function sniper_distance_shooter(character, ability, parameters) {
        add_persistent_effect(character, ability, parameters, character, Duration.SINGLE_USE(), Ordering(99),
                              RollType.PHYSICAL, RollTime.POST_CRIT, 1,
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

            // Because this effect has an ordering of "99" and post-crit timing, all other effects should have been
            // accounted for in the base roll by the time we get here. Distance shooter damage will always be
            // calculated after the base roll so that it can cope with multiple distances. Multipliers from the
            // original roll are copied into a new roll per given distance.
            for (let i = 0; i < distances.length; i++) {
                const distance_roll = new Roll(character, RollType.PHYSICAL);
                distance_roll.add_damage(2 * parse_int(distances[i]) / 5, Damage.PHYSICAL);
                distance_roll.copy_multipliers(roll);
                const rolls_per_type = distance_roll.roll();
                format_and_send_roll(character, '%s (%s ft)'.format(ability.name, distances[i]), distance_roll,
                                     rolls_per_type, '', '');
            }

            return true;
        });

        print_ability_description(character, ability);
    }


    function sniper_kill_shot(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('7d8', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);

        const stacks_spent_for_lethality = get_parameter('stacks', parameters);
        if (stacks_spent_for_lethality !== null) {
            roll.add_hidden_stat(HiddenStat.LETHALITY, 10 * parse_int(stacks_spent_for_lethality));
        }

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function sniper_piercing_shot(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('5d8', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function sniper_precision_shooter(character, ability, parameters) {
        add_persistent_effect(character, ability, parameters, character, Duration.SINGLE_USE(), Ordering(),
                              RollType.PHYSICAL, RollTime.DEFAULT, 1, function (character, roll, parameters) {
            roll.add_effect('Ignores AC');
            roll.add_effect('Ignores MR');
            roll.add_effect('Cannot miss');
            roll.add_effect('Cannot be blocked');
            roll.add_effect('Cannot be reacted to');
            roll.add_effect('Cannot be blocked or redirected');
            roll.add_effect('Bypasses barriers and walls');
            return true;
        });

        print_ability_description(character, ability);
    }


    function sniper_shrapnel_shot(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('6d8', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function sniper_swift_shot(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('3d8', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);
        roll.add_effect('Stun until end of turn CR:[[1d100]]');

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function soldier_biding_blade(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('5d10', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);

        const blocked_damage = get_parameter('blocked', parameters);
        if (blocked_damage !== null) {
            const half_blocked_damage = parse_int(blocked_damage) / 2;
            roll.add_damage(half_blocked_damage.toString(), Damage.PHYSICAL);
        }

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function soldier_double_time(character, ability, parameters) {
        add_persistent_effect(character, ability, parameters, character, Duration.ONE_MINUTE(), Ordering(),
                              RollType.ALL, RollTime.DEFAULT, 1, function (char, roll, parameters) {
            roll.add_stat_bonus(Stat.MOVEMENT_SPEED, 20);
            return true;
        });

        print_ability_description(character, ability);
    }


    function soldier_fleetfoot_blade(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('4d10', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function soldier_shield_bash(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('4d6', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);
        roll.add_effect('If you roll 18 on damage dice, also Stun target');

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function soldier_steadfast_strikes(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('2d10', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);

        const hits = get_parameter('hits', parameters);
        if (hits !== null) {
            roll.add_damage('%sd10'.format(hits), Damage.PHYSICAL);
        }

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function summoner_summon_ascarion_beast(character, ability, parameters) {
        // The summon acts as a separate character, so we make a fake one to be able to do rolls with. The critical
        // hit chance stat must at least be set for this to work properly.
        const summon = new Character({'id': 'ascarion_beast'}, character.who);
        summon.stats[Stat.CRITICAL_HIT_CHANCE.name] = 0;

        const roll = new Roll(summon, RollType.PHYSICAL);
        roll.add_damage('4d6', Damage.PHYSICAL);
        roll.add_effect('Poison [[2d6]] CR:[[1d100]]');

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(summon, ability, roll, parameters, crit_section);
        });
    }


    function symbiote_empower_soul(character, ability, parameters) {
        const target_name = get_target_character('target', parameters);

        let percentage = 20;
        const extra_mana_spent = get_parameter('mana', parameters);
        if (extra_mana_spent !== null) {
            percentage += 2 * parse_int(extra_mana_spent);
        }

        add_persistent_effect(character, ability, parameters, target_character, Duration.ONE_MINUTE(), Ordering(),
                              RollType.ALL, RollTime.DEFAULT, 1, function (char, roll, parameters) {
            roll.add_hidden_stat(HiddenStat.ACCURACY, percentage);
            roll.add_hidden_stat(HiddenStat.GENERAL_MAGIC_PENETRATION, percentage);
            return true;
        });

        print_ability_description(character, ability);
    }


    function symbiote_power_spike(character, ability, parameters) {
        const target_buff = get_parameter('buff', parameters);
        if (target_buff === null) {
            chat(character, '"buff" parameter is missing');
            return;
        }

        const target_character = get_target_character('target', parameters);

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

        // Modify the effect's duration and effectiveness
        persistent_effects[index].duration.length = Math.floor(persistent_effects[index].duration.length / 2);
        persistent_effects[index].effectiveness = 1.5 * persistent_effects[index].effectiveness;

        chat(character, 'Power Spiked ' + target_buff + ' on ' + target_character.name);
    }


    function symbiote_strengthen_body(character, ability, parameters) {
        const target_character = get_target_character('target', parameters);

        add_persistent_effect(character, ability, parameters, target_character, Duration.ONE_MINUTE(), Ordering(),
                              RollType.ALL, RollTime.DEFAULT, 1, function (char, roll, parameters) {
            roll.add_stat_multiplier(Stat.EVASION, 0.4);
            roll.add_stat_multiplier(Stat.AC, 0.4);
            return true;
        });

        print_ability_description(character, ability);
    }


    function symbiote_strengthen_mind(character, ability, parameters) {
        const target_character = get_target_character('target', parameters);

        add_persistent_effect(character, ability, parameters, target_character, Duration.ONE_HOUR(), Ordering(),
                              RollType.ALL, RollTime.DEFAULT, 1, function (char, roll, parameters) {
            roll.add_skill_bonus(Skill.ALL, 30);
            return true;
        });

        print_ability_description(character, ability);
    }


    function symbiote_strengthen_soul(character, ability, parameters) {
        const target_character = get_target_character('target', parameters);

        const source = character.name;
        add_persistent_effect(character, ability, parameters, target_character, Duration.ONE_MINUTE(), Ordering(),
                              RollType.ALL, RollTime.DEFAULT, 1, function (char, roll, parameters) {
            roll.add_multiplier(0.5, Damage.ALL, source);
            return true;
        });

        print_ability_description(character, ability);
    }


    function thief_cloak_and_dagger(character, ability, parameters) {
        const stance = get_parameter('stance', parameters);
        if (stance === null) {
            chat(character, 'The "stance" parameter is required to specify if you are in hit or run stance');
            return;
        }

        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('5d4', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);

        if (stance === 'run'){
            roll.add_stat_bonus(Stat.CRITICAL_HIT_CHANCE, 20);
        } else if (stance === 'hit'){
            roll.add_crit_damage_mod(100);
        } else {
            chat('Unrecognized option for "stance" parameter, should be either "run" or "hit"');
        }

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function thief_phantom_thief(character, ability, parameters) {
        add_persistent_effect(character, ability, parameters, character, Duration.ONE_MINUTE(), Ordering(),
                              RollType.ALL, RollTime.DEFAULT, 1, function (char, roll, parameters) {
            roll.add_stat_bonus(Stat.EVASION, 100);
            return true;
        });

        print_ability_description(character, ability);
    }


    function thief_snatch_and_grab(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);

        const stance = get_parameter('stance', parameters);
        if (stance !== null && stance === 'hit'){
            roll.add_effect('Steal: [[d100]] [[d100]]');
        } else {
            roll.add_effect('Steal: [[d100]]');
        }

        do_roll(character, ability, roll, parameters, '');
    }


    function vastwood_knight_sovereignty(character, ability, parameters) {
        add_persistent_effect(character, ability, parameters, character, Duration.ONE_HOUR(), Ordering(95),
                              RollType.ALL, RollTime.POST_CRIT, 1, function (character, roll, parameters) {
            // Damage dice upgrade one size
            const dmg_types = Object.keys(roll.damages);
            for (let i = 0; i < dmg_types.length; i++) {
                const dmg_type = dmg_types[i];
                roll.damages[dmg_type] = roll.damages[dmg_type].replace(/d12/g, 'd20');
                roll.damages[dmg_type] = roll.damages[dmg_type].replace(/d10/g, 'd12');
                roll.damages[dmg_type] = roll.damages[dmg_type].replace(/d8/g, 'd10');
                roll.damages[dmg_type] = roll.damages[dmg_type].replace(/d6/g, 'd8');
                roll.damages[dmg_type] = roll.damages[dmg_type].replace(/d4/g, 'd6');
            }

            // Any rolls can be re-rolled, and you take the higher. So convert NdM into N instances of 2dMd1,
            // added together
            for (let i = 0; i < dmg_types.length; i++) {
                const dmg_type = dmg_types[i];

                let dmg_pieces = split_string(roll.damages[dmg_type], '+');
                dmg_pieces = split_array(dmg_pieces, '-');
                dmg_pieces = split_array(dmg_pieces, '*');
                dmg_pieces = split_array(dmg_pieces, '/');
                dmg_pieces = split_array(dmg_pieces, '^');
                dmg_pieces = split_array(dmg_pieces, '(');
                dmg_pieces = split_array(dmg_pieces, ')');

                let revised_dmg = '';
                for (let j = 0; j < dmg_pieces.length; j++) {
                    let dmg_piece = dmg_pieces[j];
                    if (!dmg_piece.includes('d')) {
                        revised_dmg += dmg_piece;

                    } else {
                        let count = dmg_piece.split('d')[0];
                        if (count === '') {
                            count = 0;
                        } else {
                            count = parse_int(count);
                        }
                        const die = dmg_piece.split('d')[1];

                        const temp = [];
                        for (let k = 0; k < count; k++) {
                            temp.push('2d%sd1'.format(die));
                        }
                        const revised_piece = '(%s)'.format(temp.join('+'));
                        revised_dmg += revised_piece;
                    }
                }

                roll.damages[dmg_type] = revised_dmg;
            }

            return true;
        });

        print_ability_description(character, ability);
    }


    function vastwood_knight_swordpoint_diplomacy(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('6d10', Damage.PHYSICAL);
        roll.add_effect('Target gains a mark, and must choose whether it grants attacks against it 20% increased damage or 10% critical strike chance');
        add_scale_damage(character, roll, parameters);

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function vastwood_knight_natural_precognition(character, ability, parameters) {
        const target_characters = get_target_characters('targets', parameters);
        const defense = get_parameter('defense', parameters)

        let stat;
        if (defense === 'AC') {
            stat = Stat.AC;
        } else if (defense === 'MR') {
            stat = Stat.MAGIC_RESIST;
        } else if (defense === 'EV') {
            stat = Stat.EVASION;
        } else {
            chat(character, '"defense" parameter must have one of the following values: "AC", "MR", or "EV"');
            return;
        }

        const ability_copy = {...ability};
        ability_copy.name = '%s (%s)'.format(ability.name, defense);

        for (let i = 0; i < target_characters.length; i++) {
            const target_character = target_characters[i];
            add_persistent_effect(character, ability_copy, parameters, target_character, Duration.ONE_MINUTE(),
                                  Ordering(), RollType.ALL, RollTime.DEFAULT, 1,
                                  function (char, roll, parameters, effectiveness) {
                // We need to figure out how the character's stats will be modified by armor items and only remove the
                // negative mods. We're going to apply effects from each armor-slot item to a fake roll, see what
                // negative values get added to the fake roll, if any, and add those up. With the total, we'll add the
                // opposite as a stat bonus, while being tricksy to negate buff effectiveness that may be applied
                // later on. Then tack on the +30 as well, letting buff effectiveness do it's thing to that part.
                //
                let negative_mods = 0;
                for (let i = 0; i < char.items.length; i++) {
                    const item = char.items[i];
                    if (item === null) {
                        continue;
                    }

                    if (!ARMOR_SLOTS.includes(item.slot) && !(item.type === (ItemType.SHIELD))) {
                        continue;
                    }

                    const analysis_roll = new Roll(char, RollType.ALL);
                    for (let j = 0; j < item.effects.length; j++) {
                        // Everything we care about should be applied at DEFAULT time.
                        if (item.effects[j].roll_time === RollTime.DEFAULT) {
                            item.effects[j].apply(analysis_roll);
                        }
                    }

                    if (!(stat.name in analysis_roll.stats)) {
                        continue;
                    }

                    // Tokenize the stat we care about. I think we can assume that anything in the analysis_roll bonus
                    // is only integers added together, so just splitting on '+' is good enough.
                    const stat_bonus_parts = analysis_roll.stats[stat.name].split('+');
                    for (let j = 0; j < stat_bonus_parts.length; j++) {
                        const bonus = parse_int(stat_bonus_parts[j]);
                        if (bonus < 0) {
                            negative_mods += bonus;
                        }
                    }
                }

                // Add the opposite of the negative mods from armor, and add a multiplier to cancel buff effectiveness.
                if (effectiveness === undefined || effectiveness === null) {
                    effectiveness = 1;
                }
                roll.add_stat_bonus(stat, -1 * negative_mods * (1 / effectiveness));

                // And add the +30 no matter what, subject to regular effectiveness
                roll.add_stat_bonus(stat, 30);
                return true;
            });
        }

        print_ability_description(character, ability);
    }


    function warrior_charge(character, ability, parameters) {
        const target_characters = get_target_characters('targets', parameters);

        const source = character.name;
        for (let i = 0; i < target_characters.length; i++) {
            const target_character = target_characters[i];
            add_persistent_effect(character, ability, parameters, target_character, Duration.HARD(1), Ordering(),
                                  RollType.ALL, RollTime.DEFAULT, 1, function (char, roll, parameters) {
                roll.add_multiplier(0.5, Damage.ALL, source);
                return true;
            });
        }

        print_ability_description(character, ability);
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
            add_scale_damage(character, roll, parameters);

            roll_crit(ability, roll, parameters, function (crit_section) {
                do_roll(character, ability, roll, parameters, crit_section);
            });
        }

        if (choice === 'second' || choice === 'both') {
            const roll = new Roll(character, RollType.PHYSICAL);
            roll.add_damage('3d10', Damage.PHYSICAL);
            add_scale_damage(character, roll, parameters);

            roll_crit(ability, roll, parameters, function (crit_section) {
                do_roll(character, ability, roll, parameters, crit_section);
            });
        }
    }


    function warrior_fight_me(character, ability, parameters) {
        const target = get_parameter('target', parameters);
        if (target === null) {
            chat(character, '"target" parameter is missing');
            return;
        }

        const number = target.split(', ');
        const roll = new Roll(character, RollType.PHYSICAL);
        for (let i = 0; i < number; i++) {
            roll.add_effect('CR: [[1d100]]');
        }
        do_roll(character, ability, roll, parameters, '');
        print_ability_description(character, ability);
    }


    function warlord_hookshot(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('5d10', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);
        roll.add_effect('Pull target 20 ft towards you');

        roll_crit(ability, roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function warrior_reinforce_armor(character, ability, parameters) {
        const sacrifices = get_parameter('buffs', parameters);
        const stat = get_parameter('defense', parameters);
        if (sacrifices === null) {
            chat(character, '"buffs" parameter is missing');
            return;
        }
        if (stat === null) {
            chat(character, '"stat" parameter is missing');
            return;
        }

        const buffs = sacrifices.split(', ');
        for (let i = 0; i < persistent_effects.length; i++) {
            if (buffs.includes(persistent_effects[i].name) && persistent_effects[i].target === character.name) {
                chat(character, 'Removed effect %s from %s'.format(persistent_effects[i].name, character.name));
                persistent_effects.splice(i, 1);
            }
        }

        add_persistent_effect(character, ability, parameters, character, Duration.ONE_MINUTE(), Ordering(),
                              RollType.ALL, RollTime.DEFAULT, 1, function (char, roll, parameters) {
            if (stat.toLowerCase() === 'ac'){
                roll.add_stat_multiplier(Stat.AC, 0.25 * buffs.length);
            } else if (stat.toLowerCase() === 'mr'){
                roll.add_stat_multiplier(Stat.MAGIC_RESIST, 0.25 * buffs.length);
            } else if (stat.toLowerCase() === 'evasion'){
                roll.add_stat_multiplier(Stat.EVASION, 0.25 * buffs.length);
            }

            return true;
        });

        print_ability_description(character, ability);
    }


    function warrior_warleader(character, ability, parameters) {
        const target_character = get_target_character('target', parameters);

        const source = character.name;
        add_persistent_effect(character, ability, parameters, target_character, Duration.SINGLE_USE(), Ordering(),
                              RollType.ALL, RollTime.DEFAULT, 1, function (char, roll, parameters) {
            roll.add_multiplier(0.25, Damage.ALL, source);
            return true;
        });

        print_ability_description(character, ability);
    }


    const abilities_processors = {
        'Air Duelist': {
            'Cutting Winds': air_duelist_cutting_winds,
            'Mistral Bow': air_duelist_mistral_bow,
            'Arc of Air': air_duelist_arc_of_air,
        },
        'Aquamancer': {
            'Tidal Wave': aquamancer_tidal_wave,
            'Baptize': aquamancer_baptize,
        },
        'Arcane Archer': {
            'Surefire Shot': arcane_archer_surefire_shot,
            'Swelling Shot': arcane_archer_swelling_shot,
            'Broadhead Arrow': arcane_archer_broadhead_arrow,
            'Elusive Hunter': arcane_archer_elusive_hunter,
            'Persistent Hunter': arcane_archer_persistent_hunter,
        },
        'Arcanist': {
            'Magic Dart': arcanist_magic_dart,
            'Magic Primer': arcanist_magic_primer,
        },
        'Archaeomancer': {
            'Arcane Lock': print_ability_description,
            'Skill Boost': archaeomancer_skill_boost,
            'Echoes of the Past': print_ability_description,
        },
        'Assassin': {
            'Vanish': assassin_vanish,
            'Pursue': print_ability_description,
            'Focus': assassin_focus,
            'Sharpen': assassin_sharpen,
            'Haste': print_ability_description,
            'Backstab': assassin_backstab,
            'Skyfall': assassin_skyfall,
            'Massacre': assassin_massacre,
        },
        'Captain': {
            'Blitzkrieg': captain_blitzkrieg,
            'Inspirational Speech': captain_inspirational_speech,
            'Scramble': print_ability_description,
        },
        'Champion': {
            'Master of Arms': champion_master_of_arms,
            'Slice and Dice': champion_slice_and_dice,
            'Skull Bash': champion_skull_bash,
            'Piercing Blow': champion_piercing_blow,
            'Disarming Blow': champion_disarming_blow,
        },
        'Conjurer': {
            'Web': print_ability_description,
        },
        'Cryomancer': {
            'Frostbite': cryomancer_frostbite,
            'Ice Spear': cryomancer_ice_spear,
            'Glacial Crash': cryomancer_glacial_crash,
            'Aurora Beam': cryomancer_aurora_beam,
            'Flash Freeze': print_ability_description,
            'Freezing Wind': print_ability_description,
            'Hypothermia': print_ability_description,
            'Heart of Ice': print_ability_description,
            'Ice Crafting': print_ability_description,
            'Extinguish': print_ability_description,
            'Frozen Arena': print_ability_description,
        },
        'Daggerspell': {
            'Fadeaway Slice': daggerspell_fadeaway_slice,
            'Shieldbreaker': daggerspell_shieldbreaker,
            'Heartpiercer': daggerspell_heartpiercer,
            'Exposing Tear': daggerspell_exposing_tear,
            'Absorption Well': daggerspell_absorption_well,
            'Hidden Blade': daggerspell_hidden_blade,
            'Wanted: Dead or Alive': print_ability_description,
        },
        'Destroyer': {
            'Slam': destroyer_slam,
            'Mortal Strike': destroyer_mortal_strike,
            'Execute': destroyer_execute,
            'Willbreaker': destroyer_willbreaker,
            'Whirlwind': destroyer_whirlwind,
            'Rampage': destroyer_rampage,
            'Leaping Crush': destroyer_leaping_crush,
            'Demolish': print_ability_description,
            'Challenge': destroyer_challenge,
            'Flatten': print_ability_description,
            'Groundbreaker': print_ability_description,
        },
        'Dragoncaller': {
            'Summon Bronze Dragon': dragoncaller_summon_bronze_dragon,
            'Summon Silver Dragon': dragoncaller_summon_silver_dragon,
            'Summon Gold Dragon': dragoncaller_summon_gold_dragon,
            'Dragonstorm': print_ability_description,
            'Bronze Dragon Breath': dragoncaller_bronze_dragon_breath,
            'Silver Dragon Breath': dragoncaller_silver_dragon_breath,
            'Gold Dragon Breath': dragoncaller_gold_dragon_breath,
            'Dragonform': dragoncaller_dragonform,
            'Dragonfear': print_ability_description,
            'Dragonflight': dragoncaller_dragonflight,
            'Dragonsight': dragoncaller_dragonsight,
            'Dragonblood': dragoncaller_dragonblood,
        },
        'Dynamancer': {
            'Spark Bolt': dynamancer_spark_bolt,
        },
        'Enchanter': {
            'Modify Weapon': enchanter_modify_weapon,
            'Bless Equipment': print_ability_description,
            'Reconstruct Barrier': print_ability_description,
            'Rebuild Floor': print_ability_description,
            'Secure Building': print_ability_description,
            'Sphere of Safety': print_ability_description,
            'Mint Coinage': print_ability_description,
            'Enhance Vehicle': print_ability_description,
            'Inscribe Book': print_ability_description,
        },
        'Evangelist': {
            'Magia Erebea': evangelist_magia_erebea,
            'Krystalline Basileia': evangelist_krystalline_basileia,
            'Anthos Pagetou Khilion Eton': evangelist_anthos_pagetou_khilion_eton,
        },
        'Juggernaut': {
            'Wild Swing': juggernaut_wild_swing,
            'Hostility': juggernaut_hostility,
            'Blood For Vigor': print_ability_description,
            'Tachycardia': juggernaut_tachycardia,
        },
        'Ki Monk': {
            'Spirit Punch': ki_monk_spirit_punch,
            'Drain Punch': ki_monk_drain_punch,
            'Spirit Shotgun': ki_monk_spirit_shotgun,
            'Find Center': ki_monk_find_center,
            'Find Stability': print_ability_description,
            'Find Solace': print_ability_description,
            'Find Strength': print_ability_description,
        },
        'Lightning Duelist': {
            'Blade Storm': lightning_duelist_blade_storm,
            'Shocking Parry': lightning_duelist_shocking_parry,
            'Shock Tendrils': lightning_duelist_shock_tendrils,
            'Arc Lightning': lightning_duelist_arc_lightning,
            'Sword of Lightning': lightning_duelist_sword_of_lightning,
        },
        'Luxomancer': {
            'Lightbolt': luxomancer_lightbolt,
            'Beam of Light': luxomancer_beam_of_light,
            'Light Touch': luxomancer_light_touch,
            'Healing Surge': print_ability_description,
            'Dancing Lights': print_ability_description,
            'Warrior of Light': luxomancer_warrior_of_light,
        },
        'Martial Artist': {
            'Choke Hold': martial_artist_choke_hold,
            'Flying Kick': martial_artist_flying_kick,
            'Focus Energy': martial_artist_focus_energy,
        },
        'Mirror Mage': {
            'Helix Beam': mirror_mage_helix_beam,
            'Scatter Shards': mirror_mage_scatter_shards,
        },
        'Mistguard': {
            'Deep Snow': mistguard_deep_snow,
            'Glacial Gust': mistguard_glacial_gust,
            'Cold Snap': mistguard_cold_snap,
            'Silver Armor': mistguard_silver_armor,
            'Annul': print_ability_description,
            'Mist Screen': print_ability_description,
            'Morning Frost': print_ability_description,
            'Cold Shoulder': print_ability_description,
            'Impenetrable Mist': print_ability_description,
        },
        'Night Lord': {
            'Quickstep': night_lord_quickstep,
            'Nothing Sacred': print_ability_description,
            'Lockbreaker': night_lord_lockbreaker,
            'Single Track Mind': night_lord_single_track_mind,
            'Flashbang': night_lord_flashbang,
            'Decoy': night_lord_decoy,
            'Thief Toolbelt': night_lord_thief_toolbelt,
            'Quick Fingers': night_lord_quick_fingers,
            'Burglary': print_ability_description,
            'Larceny': night_lord_larceny,
            'Robbery': night_lord_robbery,
            'Heist': print_ability_description,
        },
        'Noxomancer': {
            'Darkbomb': noxomancer_darkbomb,
            'Defile': print_ability_description,  // TODO this maybe could do more
            'Siphon Soul': print_ability_description,
        },
        'Pinpoint Monk': {
            'Atrophic Blow': pinpoint_monk_atrophic_blow,
        },
        'Pyromancer': {
            'Banefire': pyromancer_banefire,
            'Devour In Flames': pyromancer_devour_in_flames,
            'Magma Spray': pyromancer_magma_spray,
            'Pyroblast': print_ability_description,
        },
        'Sentinel': {
            'Crossguard Guillotine': sentinel_crossguard_guillotine,
            'Bladeshield Arc': sentinel_bladeshield_arc,
            'Giga Drill Break': sentinel_giga_drill_break,
            'Parallel Shields': print_ability_description,
            'Rapid Shields': print_ability_description,
            'Absorption Barrier': print_ability_description,
            'Grand Guardian': print_ability_description,
            'Chain Rush': print_ability_description,
            'Chain Drag': print_ability_description,
        },
        'Sniper': {
            'Piercing Shot': sniper_piercing_shot,
            'Kill Shot': sniper_kill_shot,
            'Shrapnel Shot': sniper_shrapnel_shot,
            'Distance Shooter': sniper_distance_shooter,
            'Precision Shooter': sniper_precision_shooter,
            'Analytical Shooter': sniper_analytical_shooter,
            'Professional Shooter': print_ability_description,
            'Swift Sprint': print_ability_description,
            'Swift Shot': sniper_swift_shot,
        },
        'Soldier': {
            'Fleetfoot Blade': soldier_fleetfoot_blade,
            'Steadfast Strikes': soldier_steadfast_strikes,
            'Biding Blade': soldier_biding_blade,
            'Intercept': print_ability_description,
            'Shield Bash': soldier_shield_bash,
            'Protective Sweep': print_ability_description,
            'Long Live The King': print_ability_description,
            'Dodge Roll': print_ability_description,
            'Double Time': soldier_double_time,
            'Tactical Withdrawal': print_ability_description,
        },
        'Summoner': {
            'Summon Ascarion Beast': summoner_summon_ascarion_beast,
            'Summon Vilyrian Spellmaster': print_ability_description,
            'Summon Unseen Servant': print_ability_description,
            'Summon Estian Wayfinder': print_ability_description,
            "Summon Xat'hul Charmspirit": print_ability_description,
            'Summon Watcher': print_ability_description,
        },
        'Symbiote': {
            'Strengthen Soul': symbiote_strengthen_soul,
            'Empower Soul': symbiote_empower_soul,
            'Embolden Soul': print_ability_description,
            'Strengthen Body': symbiote_strengthen_body,
            'Embolden Body': print_ability_description,
            'Power Spike': symbiote_power_spike,
            'Strengthen Mind': symbiote_strengthen_mind,
        },
        'Thief': {
            'Cloak and Dagger': thief_cloak_and_dagger,
            'Snatch and Grab': thief_snatch_and_grab,
            'Charm and Disarm': print_ability_description,
            'Purloin Powers': print_ability_description,
            'Infiltrate': print_ability_description,
            'Phantom Thief': thief_phantom_thief,
        },
        'Vastwood Knight': {
            'Vastwood Sovereignty': vastwood_knight_sovereignty,
            'Swordpoint Diplomacy': vastwood_knight_swordpoint_diplomacy,
            'Natural Precognition': vastwood_knight_natural_precognition,
        },
        'Voidwalker': {
            'Dimension Door': print_ability_description,
            'Void Portal': print_ability_description,
            'Blacklands': print_ability_description,
            'Shadowstep': print_ability_description,
        },
        'Warlord': {
            'Hookshot': warlord_hookshot,
            'Weapon Swap: Roll': print_ability_description,
        },
        'Warrior': {
            'Warleader': warrior_warleader,
            'Cut Down': warrior_cut_down,
            'Shields Up': print_ability_description,
            'Reinforce Armor': warrior_reinforce_armor,
            'Take Cover': print_ability_description,
            '"Charge!"': warrior_charge,
            '"Fight Me!"': warrior_fight_me,
        },
    };


    function get_ability(class_name, ability_name) {
        assert_not_null(class_name, 'get_ability(), class_name');
        assert_not_null(ability_name, 'get_ability(), ability_name');

        // Get the ability or passive info from master class list
        assert(class_name in classes, 'Unrecognized class "%s", wrong spelling?', class_name);

        const clazz = classes[class_name];
        const class_abilities = clazz['abilities'];
        const class_passive_name = Object.keys(clazz.passive)[0];

        let ability = null;
        if (ability_name in class_abilities) {
            ability = class_abilities[ability_name];
        }
        if (ability_name === class_passive_name) {
            ability = {
                'name': class_passive_name,
                'description': [clazz['passive'][class_passive_name]],
                'class': clazz['name'],
                'action': 'N/A',
                'cost': 'N/A',
                'range': 'N/A',
                'duration': 'N/A',
            };
        }

        assert(ability !== null, 'Unrecognized passive or ability "%s" for class "%s", wrong spelling?',
               ability_name, clazz.name);
        return ability;
    }


    function process_ability(msg) {
        const character = get_character_from_msg(msg);
        const pieces = msg.content.split(' ');
        const options = pieces.slice(2).join(' ');
        const option_pieces = options.split(';');
        const class_name = option_pieces[0];
        const ability_name = option_pieces[1];
        let parameters = option_pieces.slice(2);
        parameters = trim_all(parameters);
        parameters = remove_empty(parameters);

        const ability = get_ability(class_name, ability_name);

        // See if we have a processor for this class + ability combo
        if (!(class_name in abilities_processors) || !(ability_name in abilities_processors[class_name])) {
            raw_chat('API', 'The API does not know how to handle this ability yet, printing ability description');
            print_ability_description(character, ability);
            return;
        }

        initiate_sum_all(parameters);

        const processor = abilities_processors[class_name][ability_name];
        processor(character, ability, parameters);
    }


    function info_block(msg) {
        const character = get_character_from_msg(msg);
        const pieces = msg.content.split(' ');
        const options = pieces.slice(2).join(' ');
        const option_pieces = options.split(';');
        const class_name = option_pieces[0];
        const ability_name = option_pieces[1];

        const ability = get_ability(class_name, ability_name);

        // Borrowing the 5e info block format
        const adjusted_format = [
            '&{template:5eDefault}',
            '{{spell=1}}',
            '{{abilityshowinfoblock=1}}',
            '{{abilityshowdesc=1}}',
            '{{title=%s}}'.format(ability['name']),
            '{{subheader=%s}}'.format(ability['class']),
            '{{abilitycasttime=%s}}'.format(ability['action']),
            '{{abilitycost=%s}}'.format(ability['cost']),
            '{{abilityrange=%s}}'.format(ability['range']),
            '{{abilityduration=%s}}'.format(ability['duration']),
            '{{abilitydescription=%s}}'.format(ability['description'].join('')),
        ];

        chat(character, adjusted_format.join(' '));
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
        if (turn === undefined || turn === null) {
            return;  // turn order probably disappeared while we were waiting
        }

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

        LOG.debug('get name for ' + id);

        const token = getObj('graphic', id);
        if (token === null || token === undefined) {
            LOG.debug('no token found for id ' + id);
            return null;
        }

        const token_name = token.get('name');
        if (token_name === null) {
            LOG.debug('token_name is null, token=' + token);
            return null;
        }

        return token_name;
    }


    function do_turn_order_change() {
        const turn = get_current_turn();
        LOG.debug('turn order changed ' + turn.id);
        if (turn.id === state[STATE_NAME][LAST_TURN_ID]) {
            LOG.debug('no real turn order change');
            return;
        }

        const current_name = get_name_from_token_id(turn.id);
        if (current_name === null) {
            return;
        }
        LOG.info('turn order changed, up now is ' + current_name);

        // CombatTracker adds a placeholder entry in the turn order that counts the rounds. If the turn is this
        // entry, CombatTracker will advance the turn order to the next one automatically. We should wait for this
        // change, so that we do our handling on an actual character's turn.
        if (current_name.includes('Round')) {
            setTimeout(function () {
                wait_for_turn_order_change(do_turn_order_change);
            }, 100);
            LOG.debug('CombatTracker token ignored');
            return;
        }

        const last_turn_id = state[STATE_NAME][LAST_TURN_ID];
        state[STATE_NAME][LAST_TURN_ID] = turn.id;

        const current_character = get_character(current_name, /*ignore_failure=*/true);
        if (current_character === null) {
            return;
        }

        // Decrement durations for effects cast by the character who is currently up, and end any at zero.
        for (let i = 0; i < persistent_effects.length; i++) {
            assert_type(persistent_effects[i].duration, Duration, 'do_turn_order_change() start duration');

            if (persistent_effects[i].caster !== current_character.name) {
                continue;
            }

            if (persistent_effects[i].duration.single_use()) {
                continue;
            }

            persistent_effects[i].duration.length -= 1;

            if (persistent_effects[i].duration.length === 0) {
                LOG.info('Persistent effect "%s" on %s ended'.format(persistent_effects[i].name,
                                                                     persistent_effects[i].target));
                persistent_effects.splice(i, 1);
                i--;
            }
        }

        // End effects when a character's turn ends. No decrement here, but get rid of ones with duration < 1.
        if (last_turn_id !== '') {
            const previous_name = get_name_from_token_id(last_turn_id);
            if (previous_name === null) {
                return;
            }

            const previous_character = get_character(previous_name, /*ignore_failure=*/true);
            if (previous_character === null) {
                return;
            }

            for (let i = 0; i < persistent_effects.length; i++) {
                assert_type(persistent_effects[i].duration, Duration, 'do_turn_order_change() end duration');

                if (persistent_effects[i].caster !== previous_character.name) {
                    continue;
                }

                if (persistent_effects[i].duration.single_use()) {
                    continue;
                }

                if (persistent_effects[i].duration.length < 1) {
                    LOG.info('Persistent effect "%s" on %s ended'.format(persistent_effects[i].name,
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
    // Methods for processing non-API-call messages and calls that rely on a message backlog


    function initiate_sum_all(parameters) {
        assert_not_null(parameters, 'initiate_sum_all() parameters');

        record_messages_ = false;
        sent_messages_ = [];
        received_messages_ = [];
        if (get_parameter('sum_all', parameters) !== null) {
            record_messages_ = true;
        }
    }


    // Hang onto all named messages in a circular buffer
    function record_message(msg) {
        let message_name = msg.content.match(/{{name=.*?}}/g);
        if (message_name === null) {
            LOG.debug('record_message() - other message has no name');
            return;
        }

        let message_log_index = state[STATE_NAME][MESSAGE_LOG_INDEX];
        state[STATE_NAME][MESSAGE_LOG][message_log_index] = msg;
        message_log_index = message_log_index + 1;
        if (message_log_index === MESSAGE_LOG_SIZE) {
            message_log_index = 0;
        }
        state[STATE_NAME][MESSAGE_LOG_INDEX] = message_log_index;
    }


    // Additionally store messages for the "sum_all" parameter
    function handle_non_api_message(msg) {
        let message_name = msg.content.match(/{{name=.*?}}/g);
        if (message_name === null) {
            LOG.debug('handle_non_api_message() - other message has no name');
            return;
        }
        message_name = message_name[0];

        let match = null;
        for (let i = 0; i < sent_messages_.length; i++) {
            if (sent_messages_[i] === message_name) {
                match = i;
            }
        }

        if (match === null) {
            LOG.debug('handle_non_api_message() - other message does not match recorded messages');
            return;
        }

        received_messages_.push(msg);

        if (received_messages_.length === sent_messages_.length) {
            // Order is important here, we have to turn off message recording first because we're about to send
            // a message.
            record_messages_ = false;

            calculate_and_send_total(msg);
            sent_messages_ = [];
            received_messages_ = [];
        } else {
            LOG.debug('handle_non_api_message() - still waiting for more messages');
        }
    }


    function calculate_and_send_total(last_msg) {
        const character = get_character(last_msg.who, /*ignore_failure=*/true);
        if (character === null) {
            return;
        }

        // Get the damage values from each message and add them up on a per-type basis into total_damages
        const total_damages = {};
        for (let i = 0; i < received_messages_.length; i++) {
            const message_damages = get_damages_from_message(received_messages_[i]);
            const types = Object.keys(message_damages);
            for (let j = 0; j < types.length; j++) {
                const type = types[j];
                const message_damage = message_damages[type];

                if (type in total_damages) {
                    total_damages[type] += message_damage;
                } else {
                    total_damages[type] = message_damage;
                }
            }
        }

        // Build the roll and calculate the total
        let result = '&{template:Barbs} {{name=Total Damage}}'
        let total = 0;

        const types = Object.keys(total_damages);
        for (let i = 0; i < types.length; i++) {
            const type = types[i];
            const damage_value = total_damages[type];
            result = result + ' {{%s=[[%s]]}}'.format(type, damage_value);
            total += damage_value;
        }
        result = result + '{{total=[[%s]]}}'.format(total);

        LOG.info('Total damage: ' + result);
        chat(character, result);
    }


    function get_damages_from_message(msg) {
        assert_not_null(msg, 'get_damages_from_message() msg');

        const parts = msg.content.match(/{{[A-Za-z]*=.*?}}/g);
        if (parts === null) {
            LOG.debug('No damage parts in the message');
            return {};
        }

        const damages = {};

        // These look like this:
        //     {{physical=$[[0]]}} {{light=$[[4]]}}
        // For each part, we have to identify the damage type and the "placeholder index." The placeholder index will
        // tell us where to look in the messages inline roll for the actual value of the roll.
        for (let i = 0; i < parts.length; i++) {
            LOG.debug('get_damages_from_message() - processing part ' + parts[i]);
            let part = parts[i];
            part = part.slice(2, part.length - 2);  // cut off the braces

            const pieces = part.split('=');
            const type = get_damage_from_type(pieces[0]);
            if (type === null) {
                LOG.debug('get_damages_from_message() - unknown damage type "%s"'.format(pieces[0]));
                continue;  // the "type" in the part is not one of the damage types, skip this part
            }

            let index = pieces[1];
            index = index.slice(3, index.length - 2);  // cut off the dollar sign and brackets
            index = parse_int(index);

            // Use the index in the message content to find the roll total in the message's roll results
            damages[type] = msg.inlinerolls[index].results.total;
        }

        return damages;
    }


    function reconstruct_roll_result_string(msg, handle_dice) {
        /* Example of what the API gets as a roll message. We want the content string, but with the placeholders filled
           in and with the actual results of rolls.

        {
            "content":" {{name=Piercing Shot}} {{physical=$[[0]]}}{{light=$[[4]]}} {{crit_value=$[[1]]}} {{crit_cutoff=$[[2]]}} {{crit_chance=10}} {{modified_crit=$[[3]]}}  {{effects=<li>20% accuracy</li>}} ",
            "inlinerolls":[
                {
                    "expression":"round(((5d8+5)*(1))*2)",
                    "results":{
                        "resultType":"sum",
                        "rolls":[
                            {"expr":"round(((","type":"M"},
                            {"dice":5,"results":[{"v":5},{"v":8},{"v":6},{"v":2},{"v":5}],"sides":8,"type":"R"},
                            {"expr":"+5)*(1))*2)","type":"M"}
                        ],
                        "total":62,
                        "type":"V"
                    },
                    "rollid":"-MK1JTxrQZymicxtRWLt",
                    "signature":"1a57fb986ad76839434f0959e91b3b13ad0303ccbce28a11e32edf34a5331d377edac3887b2fe126ca9994e16206bbbcf497b455bab867257b21bd8ccb891809"
                },
                {
                    "expression":"96",
                    "results":{
                        "resultType":"M",
                        "rolls":[
                            {"expr":96,"type":"M"}
                        ],
                        "total":96,
                        "type":"V"
                    },
                    "signature":false
                },
                {
                    "expression":"91",
                    "results":{
                        "resultType":"M",
                        "rolls":[
                            {"expr":91,"type":"M"}
                        ],
                        "total":91,
                        "type":"V"
                    },
                    "signature":false
                },
                {
                    "expression":"96-91",
                    "results":{
                        "resultType":"M",
                        "rolls":[
                            {"expr":"96-91","type":"M"}
                        ],
                        "total":5,
                        "type":"V"
                    },
                    "signature":false
                },
                {
                    "expression":"round(((4d10)*(1))*2)",
                    "results":{
                        "resultType":"sum",
                        "rolls":[
                            {"expr":"round(((","type":"M"},
                            {"dice":4,"results":[{"v":5},{"v":8},{"v":10},{"v":5}],"sides":10,"type":"R"},
                            {"expr":")*(1))*2)","type":"M"}
                        ],
                        "total":56,
                        "type":"V"
                    },
                    "rollid":"-MK1JTxw-Q4aL9vfcufD",
                    "signature":"345a73bb90faa043a45ad27311e3bc2376ac00b7509d2ee05f83a82e3e3343547cf26add3804c7a085cc9e1fdc7a7d08f1204a55d2d88cde1417cf6527c3b4b4"
                }
            ],
            "playerid":"API",
            "rolltemplate":"Barbs",
            "type":"general",
            "who":"Hoshiko Nightside"
        }
        */

        assert_not_null(msg, 'reconstruct_roll_result_string(), msg');
        assert_not_null(handle_dice, 'reconstruct_roll_result_string(), handle_dice');

        let full_result_string = msg.content;
        const rolls = msg.inlinerolls;

        for (let i = 0; i < rolls.length; i++) {
            const roll_results = rolls[i].results.rolls;
            let roll_string = '';
            for (let j = 0; j < roll_results.length; j++) {
                const roll_result = roll_results[j];
                if ('expr' in roll_result) {
                    roll_string += roll_result['expr'];

                } else if ('dice' in roll_result) {
                    roll_string += handle_dice(roll_result);

                } else {
                    assert(false, 'roll20 inlinerolls in message have unexpected content %s',
                           JSON.stringify(roll_results));
                }
            }

            const placeholder = '$[[%s]]'.format(i);
            const replacement_string = '[[%s]]'.format(roll_string);
            full_result_string = full_result_string.replace(placeholder, replacement_string);
        }

        return full_result_string.trim();
    }


    function inner_reroll(character, message_name, handle_matching_message) {
        assert_type(character, Character, 'inner_reroll(), character');
        assert_not_null(message_name, 'inner_reroll(), message_name');
        assert_not_null(handle_matching_message, 'inner_reroll(), handle_matching_message');

        // Rotate message log so that index is 0, the oldest message is at index 0, and everything is in order
        const message_log_index = state[STATE_NAME][MESSAGE_LOG_INDEX];
        const message_log = state[STATE_NAME][MESSAGE_LOG];
        for (let i = 0; i < message_log_index; i++) {
            message_log.push(message_log.shift());
        }
        state[STATE_NAME][MESSAGE_LOG_INDEX] = 0;

        // Look through the message log, newest first, for a message with matching name by the same character
        for (let i = MESSAGE_LOG_SIZE - 1; i >= 0; i--) {
            const historical_message = message_log[i];
            if (historical_message === '') {
                continue;
            }

            // Check that the requester matches the character that sent the past message
            const historical_message_character = get_character(historical_message.who, /*ignore_failure=*/true);
            if (historical_message_character === null) {
                LOG.trace('reroll() - no character for message ' + i);
                continue;
            }
            if (character.name !== historical_message_character.name) {
                LOG.trace('reroll() - wrong character for message ' + i);
                continue;
            }

            // Check that the past message name matches the given name
            let historical_message_name = historical_message.content.match(/{{name=.*?}}/g);
            if (historical_message_name === null) {
                LOG.trace('reroll() - no name for message ' + i);
                continue;
            }

            historical_message_name = historical_message_name[0];
            if (!historical_message_name.toLowerCase().includes(message_name.toLowerCase())) {
                continue;
            }

            // We have a matching message. Do something with it to create the re-roll message
            const revised_roll = handle_matching_message(historical_message);
            if (revised_roll === null) {
                continue;
            }

            // Append "(Re-roll)" to the name in the re-roll message
            historical_message_name = historical_message_name.substring(2, historical_message_name.length - 2);
            return revised_roll.replace(new RegExp(historical_message_name),
                                        '%s (Re-roll)'.format(historical_message_name));
        }

        return null;
    }


    function reroll(msg) {
        assert_not_null(msg, 'reroll(), msg');

        const character = get_character_from_msg(msg);
        const pieces = msg.content.split(' ');
        assert(pieces.length >= 3, 'Too few space-separated pieces in reroll message');
        const reroll_type = pieces[2];

        let message_name = null;
        let revised_roll = null;

        if (reroll_type === 'average') {
            message_name = pieces.slice(3).join(' ');
            revised_roll = inner_reroll(character, message_name, function (historical_message) {
                const historical_result_string = reconstruct_roll_result_string(historical_message, function (roll_result) {
                    const dice_sides = roll_result['sides'];
                    const roll_values = [];
                    for (let k = 0; k < roll_result['dice']; k++) {
                        const roll_value = roll_result['results'][k]['v'];
                        if (roll_value < (dice_sides + 1) / 2) {
                            roll_values.push('d%s'.format(dice_sides));
                        } else {
                            roll_values.push(roll_value);
                        }
                    }
                    return roll_values.join('+');
                });

                return '&{template:%s} %s'.format(historical_message['rolltemplate'], historical_result_string);
            });

        } else if (reroll_type === 'substitution') {
            const parts = pieces.slice(3).join(' ').split('|');
            assert(parts.length === 3, 'Wrong number of bar-separated pieces in substitution reroll message');
            message_name = parts[0];
            const substring = parts[1];
            const replacement_string = parts[2];

            revised_roll = inner_reroll(character, message_name, function (historical_message) {
                const historical_result_string = reconstruct_roll_result_string(historical_message, function (roll_result) {
                    const roll_values = [];
                    for (let k = 0; k < roll_result['dice']; k++) {
                        roll_values.push(roll_result['results'][k]['v']);
                    }
                    return roll_values.join('+');
                });

                if (!historical_result_string.includes(substring)) {
                    return null;
                }

                return '&{template:%s} %s'.format(historical_message['rolltemplate'],
                                                  historical_result_string.replace(substring, replacement_string));
            });

        } else {
            assert(false, 'Unrecognized reroll type "%s", expected "average" or "substitution"', reroll_type);
        }

        if (revised_roll !== null) {
            LOG.info('reroll() - roll: %s'.format(revised_roll));
            chat(character, revised_roll);
        } else {
            raw_chat('API', 'Did not find prior message matching name "%s"'.format(message_name));
        }
    }


    // ################################################################################################################
    // Time management


    function advance_time(msg) {
        assert_not_null(msg, 'reroll(), msg');

        const pieces = msg.content.split(' ');
        assert(pieces.length >= 4, 'Too few space-separated pieces in reroll message');
        const count = parse_int(pieces[2]);
        const period = pieces[3];

        let cycles = 0;
        if (period.includes('minute')) {
            cycles = count * 6;
        } else if (period.includes('hour')) {
            cycles = count * 60;
        }

        for (let i = 0; i < persistent_effects.length; i++) {
            assert_type(persistent_effects[i].duration, Duration, 'advance_time() duration');

            if (persistent_effects[i].duration.single_use()) {
                continue;
            }

            persistent_effects[i].duration.length -= cycles;

            if (persistent_effects[i].duration.length <= 0) {
                LOG.info('Persistent effect "%s" on %s ended'.format(persistent_effects[i].name,
                                                                     persistent_effects[i].target));
                persistent_effects.splice(i, 1);
                i--;
            }
        }

        raw_chat('API', 'Advanced time by %s %s'.format(count, period));
    }


    // ################################################################################################################
    // Basic setup and message handling


    const request_processors = {
        'initiative': roll_initiative,
        'dmg': damage_reduction,
        'cr': roll_condition_resist,
        'concentration': roll_concentration,
        'stat': roll_stat,
        'skill': roll_skill,
        'rest': take_rest,
        'create_effect': create_persistent_effect,
        'list_effects': list_persistent_effects,
        'remove_effect': remove_persistent_effect,
        'check_items': check_items,
        'item': roll_item,
        'ability': process_ability,
        'info': info_block,
        'reroll': reroll,
        'advance_time': advance_time,
    };


    function handle_input(msg) {
        record_message(msg);

        if (msg.content.startsWith('!')) {
            // Regular API call
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

            LOG.info('handle_input() - API call: who=%s, message="%s"'.format(msg.who, msg.content));

            const request = pieces[1];
            if (!(request in request_processors)) {
                raw_chat('API', 'unknown barbs request %s'.format(request));
                return;
            }

            const processor = request_processors[request];

            try {
                processor(msg);
            } catch (err) {
                if (Object.prototype.toString.call(err) === '[object String]') {
                    raw_chat('API', err);
                } else {
                    throw err;
                }
            }

        } else if (record_messages_) {
            LOG.info('handle_input() - regular message: ' + JSON.stringify(msg));
            handle_non_api_message(msg);
        }
    }


    const register_event_handlers = function () {
        // Set up permanent state
        if (!(STATE_NAME in state)) {
            state[STATE_NAME] = {};
            LOG.info('Created Barbs initial state');
        }
        if (!(LAST_TURN_ID in state[STATE_NAME])) {
            state[STATE_NAME][LAST_TURN_ID] = '';
            LOG.info('Created Barbs last turn id state');
        }
        if (!(MESSAGE_LOG in state[STATE_NAME])) {
            state[STATE_NAME][MESSAGE_LOG] = [];
            for (let i = 0; i < MESSAGE_LOG_SIZE; i++ ) {
                state[STATE_NAME][MESSAGE_LOG].push('');
            }
            LOG.info('Created Barbs message log state');
        }
        if (!(MESSAGE_LOG_INDEX in state[STATE_NAME])) {
            state[STATE_NAME][MESSAGE_LOG_INDEX] = 0;
            LOG.info('Created Barbs message log index state');
        }

        // TODO: If we want to maintain persistent effects through API restarts, we would have to reconstruct handlers.
        //  Functions cannot be saved permanently in state.

        on('chat:message', handle_input);
        on('change:campaign:turnorder', handle_turn_order_change);
        LOG.info('Barbs API ready');
    };


    return {
        register_event_handlers,
    };
})();


on('ready', () => {
    'use strict';

    Barbs.register_event_handlers();
});
