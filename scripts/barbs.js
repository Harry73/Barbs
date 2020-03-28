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


    const STATE_NAME = 'Barbs';
    const LAST_TURN_ID = 'last_turn_id';

    const HiddenStat = BarbsComponents.HiddenStat;
    const Damage = BarbsComponents.Damage;
    const RollType = BarbsComponents.RollType;
    const RollTime = BarbsComponents.RollTime;
    const Roll = BarbsComponents.Roll;
    const ITEMS = BarbsComponents.ITEMS;

    const total_format = '&{template:default} {{name=%s}} {{%s=[[%s]]}}';
    const regen_format = '&{template:default} {{name=%s}} {{%s=[[round([[%s]]*[[(%s)/100]])]]}}';
    const percent_format = '&{template:default} {{name=%s}} {{%s=[[1d100cs>[[100-(%s)+1]]]]}}';

    const roll_format = '&{template:Barbs} {{name=%s}} %s %s %s';
    const damage_section_format = '{{%s=[[%s]]}}';
    const crit_section_format = '{{crit_value=[[%s]]}} {{crit_cutoff=[[%s]]}} {{modified_crit=[[%s-%s]]}}';
    const effects_section_format = '{{effects=%s}}';

    const full_info_block_format = '&{template:5eDefault} {{spell=1}} {{spellshowinfoblock=1}} {{spellshowdesc=1}} {{character_name=@{Kairi Halicarnuss|character_name}}} {{title=%s}} {{subheader=%s}} {{subheaderright=%s}} {{spellcasttime=%s}} {{spellduration=%s}} {{spelltarget=%s}} {{spellrange=%s}} {{spellgainedfrom=%s}} {{spelldescription=Create or destroy 20 gallons of water. You can extinguish flames with this in 30 ft cube if you want. }} @{Kairi Halicarnuss|classactionspellinfo}'
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
            chat(msg, 'Error, did not find a character for ' + msg.who);
            return null;
        } else if (characters.length > 1) {
            // warn, but pray we've got the right ones regardless
            log('warning, found ' + characters.length + ' matching characters for ' + msg.who);
        }

        return new BarbsComponents.Character(characters[0], msg.who);
    }


    function get_character_by_name(name) {
        const fake_msg = {'who': name, 'id': ''};
        return get_character(fake_msg);
    }


    function apply_items(character, thing_to_roll, effect_type) {
        let mod = '';
        _.each(character.items, function (item) {
            for (let i = 0; i < item.effects.length; i++) {
                if (item.effects[i].type === effect_type) {
                    const item_mod = item.effects[i].apply(thing_to_roll).toString(10);
                    mod = mod + '+%s'.format(item_mod);
                }
            }
        });

        return mod;
    }


    function generate_stat_roll_modifier_from_items(character, stat_to_roll, effect_type) {
        const stat = BarbsComponents.get_stat(stat_to_roll);
        const attribute = parseInt(getAttrByName(character.id, stat.attr_tla), 10);
        let mod = stat.value(attribute).toString(10);

        mod = mod + apply_items(character, stat_to_roll, effect_type);

        return mod;
    }


    function roll_stat(msg) {
        const character = get_character(msg);
        if (character === null) {
            log('error, unknown character for ' + msg.who);
            return;
        }

        const stat_to_roll = msg.content.split(' ')[2].replace(/_/g, ' ').toLowerCase();
        roll_stat_inner(character, stat_to_roll)
    }


    function roll_stat_inner(character, stat_to_roll, handler) {
        const modifier = generate_stat_roll_modifier_from_items(character, stat_to_roll, 'stat');

        switch (stat_to_roll) {
            case 'health':
                chat(character, total_format.format('Total Health', 'Health', modifier));
                break;
            case 'stamina':
                chat(character, total_format.format('Total Stamina', 'Stamina', modifier));
                break;

            case 'mana':
                chat(character, total_format.format('Total Mana', 'Mana', modifier));
                break;

            case 'health regeneration':
                const total_health = generate_stat_roll_modifier_from_items(character, 'health', 'stat');
                chat(character, regen_format.format('Health Regeneration', 'Regen', total_health, modifier));
                break;

            case 'stamina regeneration':
                const total_stamina = generate_stat_roll_modifier_from_items(character, 'stamina', 'stat');
                chat(character, regen_format.format('Stamina Regeneration', 'Regen', total_stamina, modifier));
                break;

            case 'mana regeneration':
                const total_mana = generate_stat_roll_modifier_from_items(character, 'mana', 'stat');
                chat(character, regen_format.format('Mana Regeneration', 'Regen', total_mana, modifier));
                break;

            case 'movement speed':
                chat(character, total_format.format('Total Movement Speed', 'Speed', modifier));
                break;

            case 'ac':
                chat(character, total_format.format('Total AC', 'AC', modifier));
                break;

            case 'evasion':
                chat(character, percent_format.format('Evasion', 'Evasion', modifier));
                break;

            case 'magic resist':
                chat(character, total_format.format('Total Magic Resist', 'Magic Resist', modifier));
                break;

            case 'condition resist':
                chat(character, percent_format.format('Condition Resist', 'CR', modifier));
                break;

            case 'melee damage':
                chat(character, total_format.format('Bonus Melee Damage', 'Damage', modifier));
                break;

            case 'ranged fine damage':
                chat(character, total_format.format('Bonus Ranged/Fine Damage', 'Damage', modifier));
                break;

            case 'magic damage':
                chat(character, total_format.format('Bonus Magic Damage', 'Damage', modifier));
                break;

            case 'critical hit chance':
                chat(character, percent_format.format('Critical Hit Chance', 'Crit', modifier), handler);
                break;

            case 'commands':
                chat(character, total_format.format('Total Commands', 'Commands', modifier));
                break;

            case 'languages':
                chat(character, total_format.format('Total Languages', 'Languages', modifier));
                break;

            case 'item efficiency':
                chat(character, total_format.format('Total Item Efficiency', 'Modifier', modifier));
                break;

            case 'buff limit':
                chat(character, total_format.format('Total Buff Limit', 'Buff Limit', modifier));
                break;

            case 'concentration limit':
                chat(character, total_format.format('Total Concentration Limit', 'Concentration Limit', modifier));
                break;

            default:
                chat(character, 'Error, unknown stat ' + stat_to_roll);
        }
    }


    function roll_skill(msg) {
        const character = get_character(msg);
        if (character === null) {
            log('error, unknown character for ' + msg.who);
            return;
        }

        const pieces = msg.content.split(' ');

        const bonus = 5 * parseInt(pieces[pieces.length - 1]);
        const skill_to_roll = pieces.slice(2, pieces.length - 1).join(' ').replace(/:/g, '');

        if (!(skill_to_roll in BarbsComponents.skill_to_attribute_map)) {
            log('error, skill "' + skill_to_roll + '" not in skill-to-attribute map');
            return;
        }

        const attribute = parseInt(getAttrByName(character.id, BarbsComponents.skill_to_attribute_map[skill_to_roll]));

        const modifier = apply_items(character, skill_to_roll, 'skill');
        let roll_string = 'd100+%s+%s'.format(bonus, attribute);
        if (modifier !== '') {
            roll_string += '+' + modifier;
        }

        chat(msg, total_format.format(skill_to_roll, 'Roll', roll_string));
    }


    // ################################################################################################################
    // Managing persistent effects


    // Effects may be applied before or after a roll. Within the "before" and "after" categories, effects can
    // additionally have some desired ordering. This class wraps both by giving each effect some "ordering" in which
    // it should be applied.
    //
    class Ordering {
        constructor(type, val) {
            this.type = type;
            this.val = val;
        }

        static BEFORE(val = 50) {
            return new Ordering('before', val);
        }

        static AFTER(val = 50) {
            return new Ordering('after', val);
        }
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
            'time': roll_time,
            'single_application': single_application,
            'handler': handler,
        };

        // Keep persistent effects in a priority queue, so that we process lower priority effects first and higher
        // priority effects last
        for (let i = 0; i < persistent_effects.length; i++) {
            if (persistent_effects[i].ordering.val > effect.ordering.val) {
                log('Added persistent effect %s'.format(JSON.stringify(effect)));
                persistent_effects.splice(i, 0, effect);
                return;
            }
        }

        log('Added persistent effect %s'.format(JSON.stringify(effect)));
        persistent_effects.push(effect);
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
    function add_persistent_effects_to_roll(character, roll, roll_time, parameters, ordering) {
        for (let i = 0; i < persistent_effects.length; i++) {
            if (persistent_effects[i].target === character.name
                && persistent_effects[i].ordering.type === ordering.type
                && persistent_effects[i].time === roll_time) {

                if (!persistent_effects[i].handler(character, roll, parameters)) {
                    return false;
                }
            }
        }

        return true;
    }


    // ################################################################################################################
    // Class abilities helpers


    function get_ability_info(ability) {
        for (let i = 0; i < BarbsComponents.abilities.length; i++) {
            if (BarbsComponents.abilities[i].name === ability) {
                return BarbsComponents.abilities[i];
            }
        }

        log('ERROR: ability ' + ability + ' not found');
        return null;
    }


    function get_passive_clazz(passive) {
        const clazz_names = Object.keys(BarbsComponents.clazzes);
        for (let i = 0; i < clazz_names.length; i++) {
            const clazz = BarbsComponents.clazzes[clazz_names[i]];
            if ('passive' in clazz && passive === Object.keys(clazz.passive)[0]) {
                return clazz;
            }
        }

        log('ERROR: Class with passive ' + passive + ' not found');
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
        if (!add_persistent_effects_to_roll(character, roll, roll_time, parameters, Ordering.BEFORE())) {
            log('Problem adding persistent effects to roll at time ' + roll_time);
            return false;
        }
        if (!handle_arbitrary_parameters(roll, roll_time, parameters)) {
            log('Problem handling arbitrary parameters at time ' + roll_time);
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

        // Some effects only apply when we know that the result is a crit. Those should have RollTime.CRIT, and
        // are applied here.
        if (!add_extras(character, roll, RollTime.CRIT, parameters)) {
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

        if (!add_extras(character, roll, RollTime.ROLL, parameters)) {
            return;
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
        Object.keys(roll.hidden_stats).forEach(function (hidden_stat_format) {
            const formatted_hidden_stat = hidden_stat_format.format(roll.hidden_stats[hidden_stat_format]);
            effects.push('<li>%s</li>'.format(formatted_hidden_stat));
        });

        const effects_section = effects_section_format.format(effects.join(''));
        const msg = roll_format.format(ability, damage_section, crit_section, effects_section);

        log('Roll: ' + msg);
        chat(character, msg);
    }


    function finalize_roll(character, roll, parameters) {
        assert_not_null(character, 'finalize_roll() character');
        assert_not_null(roll, 'finalize_roll() roll');
        assert_not_null(parameters, 'finalize_roll() parameters');

        // There are some effects that want to occur after a roll entirely completes. This is the purpose of Ordering.
        // The hope was that AFTER effects would be sent to chat after the main roll, but it seems that the order in
        // which we call chat() isn't respected when actually showing messages in chat, so the ordering doesn't really
        // work.
        // TODO: Consider removing ordering and letting AFTER effects run when we call add_extras() in do_roll()?
        if (!add_persistent_effects_to_roll(character, roll, RollTime.ROLL, parameters, Ordering.AFTER())) {
            log('Problem adding persistent effects after roll');
            return false;
        }

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
        if (roll_time !== RollTime.ROLL) {
            return true;
        }

        const pieces = parameter.split(' ');
        const multiplier = pieces[1];
        const type = pieces[2];
        const source = pieces[3];
        roll.add_multiplier(multiplier, type, source);
        return true;
    }


    function arbitrary_damage(roll, roll_time, parameter) {
        if (roll_time !== RollTime.ROLL) {
            return true;
        }

        const pieces = parameter.split(' ');
        const damage = pieces[1];
        const type = pieces[2];
        roll.add_damage(damage, type);
        return true;
    }


    function cryomancer_frostbite(roll, roll_time, parameter) {
        if (roll_time !== RollTime.ROLL) {
            return true;
        }

        const stacks = parseInt(parameter.split(' ')[1]);
        roll.add_multiplier(stacks * 0.5, Damage.ICE, 'self');
        return true;
    }


    function sniper_spotter(roll, roll_time, parameter) {
        if (roll_time !== RollTime.ROLL) {
            return true;
        }

        const stacks = parseInt(parameter.split(' ')[1]);
        roll.add_multiplier(stacks * 0.25, Damage.ALL, 'self');
        return true;
    }


    function warper_opportunistic_predator(roll, roll_time, parameter) {
        if (roll_time !== RollTime.CRIT) {
            return true;
        }

        // If the parameter is present, we always add the bonus crit chance
        roll.add_crit_chance(50);
        return true;
    }


    const arbitrary_parameters = {
        'misc_multiplier': arbitrary_multiplier,
        'misc_damage': arbitrary_damage,
        'spotting': sniper_spotter,
        'frostbite': cryomancer_frostbite,
        'warper_cc': warper_opportunistic_predator,
    };


    function handle_arbitrary_parameters(roll, roll_time, parameters) {
        for (let i = 0; i < parameters.length; i++) {
            Object.keys(arbitrary_parameters).forEach(function (keyword) {
                if (parameters[i].includes(keyword)) {
                    if (!arbitrary_parameters[keyword](roll, roll_time, parameters[i])) {
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
            log('error, unknown character for ' + msg.who);
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
        chat(character, ability_block_format.format(ability, ability_info.clazz, ability_info.description.join('\n')));
    }


    function air_duelist_mistral_bow(character, ability, parameters) {
        const ability_info = get_ability_info(ability);

        add_persistent_effect(character, ability, character, 6,  Ordering.BEFORE(), RollTime.ROLL, true,
                              function (character, roll, parameters) {
            roll.add_effect('Bow attacks push target 5ft away');
            return true;
        });

        chat(character, ability_block_format.format(ability, ability_info.clazz, ability_info.description.join('\n')));
    }


    function air_duelist_arc_of_air(character, ability, parameters) {
        const ability_info = get_ability_info(ability);

        add_persistent_effect(character, ability, character, 6,  Ordering.BEFORE(), RollTime.ROLL, false,
                              function (character, roll, parameters) {
            roll.add_damage('2d8', Damage.AIR);
            return true;
        });

        chat(character, ability_block_format.format(ability, ability_info.clazz, ability_info.description.join('\n')));
    }


    function air_duelist_cutting_winds(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('6d8', Damage.AIR);
        roll.add_damage(character.get_stat('magic damage'), Damage.AIR);
        roll.add_effect('Knocks prone');

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function assassin_focus(character, ability, parameters) {
        const ability_info = get_ability_info(ability);

        add_persistent_effect(character, ability, character, ability_info.duration,  Ordering.BEFORE(), RollTime.CRIT, true,
            function (character, roll, parameters) {
                roll.add_crit_chance(30);
                return true;
            });

        chat(character, ability_block_format.format(ability, ability_info.clazz, ability_info.description.join('\n')));
    }


    function assassin_backstab(character, ability, parameters) {
        const parameter = get_parameter('hidden', parameters);
        if (parameter === null) {
            chat(character, '"hidden {true/false}" parameter is required');
            return;
        }

        const roll = new Roll(character, RollType.PHYSICAL);
        if (parameter === 'true') {
            roll.add_damage('4+4+4', Damage.PHYSICAL);
        } else {
            roll.add_damage('3d4', Damage.PHYSICAL);
        }
        add_scale_damage(character, roll);

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
            if (!add_extras(character, dummy_roll, RollTime.ROLL, parameters)) {
                return;
            }

            for (let i = 0; i < dice_divisions.length; i++) {
                const roll = new Roll(character, RollType.PHYSICAL);
                roll.add_damage('%sd4'.format(dice_divisions[i]), Damage.PHYSICAL);
                add_scale_damage(character, roll);
                roll.add_hidden_stat(5 * dice_divisions[i], HiddenStat.LETHALITY);

                roll.copy_multipliers(dummy_roll);
                const rolls_per_type = roll.roll();
                format_and_send_roll(character, '%s (%sd4)'.format(ability, dice_divisions[i]), roll,
                                     rolls_per_type, crit_section);
            }

            finalize_roll(character, dummy_roll, parameters);
        });
    }


    function champion_slice_and_dice(character, ability, parameters) {
        // TODO
        chat(character, 'not yet implemented');
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


    function champion_piercing_blow(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('7d10', Damage.PHYSICAL);
        add_scale_damage(character, roll);

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function champion_disarming_blow(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('5d6', Damage.PHYSICAL);
        add_scale_damage(character, roll);

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
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
        do_roll(character, ability, roll, parameters, '');
    }


    function cryomancer_glacial_crash(character, ability, parameters) {
        const roll_1 = new Roll(character, RollType.MAGIC);
        roll_1.add_damage('8d8', Damage.ICE);
        roll_1.add_effect('Frozen');
        do_roll(character, '%s (5 ft)'.format(ability), roll_1, parameters, '', /*do_finalize=*/false);

        const roll_2 = new Roll(character, RollType.MAGIC);
        roll_2.add_damage('6d8', Damage.ICE);
        roll_1.add_effect('Slowed');
        do_roll(character, '%s (5 ft)'.format(ability), roll_2, parameters, '', /*do_finalize=*/false);

        const roll_3 = new Roll(character, RollType.MAGIC);
        roll_3.add_damage('4d8', Damage.ICE);
        do_roll(character, '%s (5 ft)'.format(ability), roll_3, parameters, '', /*do_finalize=*/true);
    }


    function cryomancer_ice_spear(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('6d8', Damage.ICE);
        do_roll(character, ability, roll, parameters, '');
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
            add_persistent_effect(character, ability, target_character, 6,  Ordering.BEFORE(), RollTime.CRIT, true,
                function (character, roll, parameters) {
                    roll.add_damage('4d10', Damage.PHYSICAL);
                    return true;
                });

        } else if (choice === 'second') {
            add_persistent_effect(character, ability, target_character, 6,  Ordering.BEFORE(), RollTime.CRIT, true,
                function (character, roll, parameters) {
                    roll.add_multiplier(-0.5, Damage.PHYSICAL, 'self');
                    return true;
                });

        } else {
            chat(character, 'Unknown value for "choice" parameter "%s"'.format(choice));
        }

        const ability_info = get_ability_info(ability);
        chat(character, ability_block_format.format(ability, ability_info.clazz, ability_info.description.join('\n')));
    }


    function noxomancer_darkbomb(character, ability, parameters) {
        const target_name = get_parameter('delay', parameters);
        if (target_name === null) {
            chat(character, '"delay {true/false}" parameter is missing');
            return;
        }

        const roll = new Roll(character, RollType.MAGIC);

        if (choice === 'false') {
            roll.add_damage('3d10', Damage.DARK);
            roll.add_effect('1 curse')
        } else if (choice === 'true') {
            roll.add_damage('6d10', Damage.DARK);
            roll.add_effect('2 curses')
        }

        do_roll(character, ability, roll, parameters, '');
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


    function sniper_piercing_shot(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('5d8', Damage.PHYSICAL);
        add_scale_damage(character, roll);

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function sniper_kill_shot(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('7d8', Damage.PHYSICAL);
        roll.add_damage(character.get_stat('ranged fine damage'), Damage.PHYSICAL);

        const stacks_spent_for_lethality = get_parameter('stacks', parameters);
        if (stacks_spent_for_lethality !== null) {
            roll.add_hidden_stat(10 * parseInt(stacks_spent_for_lethality), HiddenStat.LETHALITY);
        }

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function sniper_shrapnel_shot(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('6d8', Damage.PHYSICAL);
        roll.add_damage(character.get_stat('ranged fine damage'), Damage.PHYSICAL);

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function sniper_distance_shooter(character, ability, parameters) {
        const ability_info = get_ability_info(ability);

        add_persistent_effect(character, ability, character, 1,  Ordering.AFTER(99), RollTime.ROLL, true,
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

            // Because this effect has the "AFTER" ordering, the distance shooter rolls will be sent after the
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

        chat(character, ability_block_format.format(ability, ability_info.clazz, ability_info.description.join('\n')));
    }


    function sniper_precision_shooter(character, ability, parameters) {
        const ability_info = get_ability_info(ability);

        add_persistent_effect(character, ability, character, 1, Ordering.BEFORE(), RollTime.ROLL, true,
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

        chat(character, ability_block_format.format(ability, ability_info.clazz, ability_info.description.join('\n')));
    }


    function sniper_analytical_shooter(character, ability, parameters) {
        const ability_info = get_ability_info(ability);

        const parameter = get_parameter('concentration', parameters);
        if (parameter === null) {
            chat(character, '"concentration {true/false}" parameter is required');
            return;
        }

        if (parameter === 'true') {
            add_persistent_effect(character, ability, character, ability_info.duration,  Ordering.BEFORE(), RollTime.CRIT, true,
                function (character, roll, parameters) {
                    roll.add_crit_chance(10);
                    roll.add_crit_damage_mod(25);
                    return true;
                });
        } else {
            add_persistent_effect(character, ability, character, ability_info.duration,  Ordering.BEFORE(), RollTime.CRIT, true,
                function (character, roll, parameters) {
                    roll.add_crit_chance(20);
                    roll.add_crit_damage_mod(50);
                    return true;
                });
        }

        chat(character, ability_block_format.format(ability, ability_info.clazz, ability_info.description.join('\n')));
    }


    function sniper_swift_shot(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('3d8', Damage.PHYSICAL);
        roll.add_damage(character.get_stat('ranged fine damage'), Damage.PHYSICAL);
        roll.add_effect('Stun until end of turn');

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function symbiote_strengthen_soul(character, ability, parameters) {
        const ability_info = get_ability_info(ability);

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
        add_persistent_effect(character, ability, target_character, 6, Ordering.BEFORE(), RollTime.ROLL, false,
            function (char, roll, parameters) {
                roll.add_multiplier(0.5, Damage.ALL, source);
                return true;
            });

        chat(character, ability_block_format.format(ability, ability_info.clazz, ability_info.description.join('\n')));
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


    function warrior_warleader(character, ability, parameters) {
        const clazz = get_passive_clazz(ability);

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
        add_persistent_effect(character, ability, target_character, 1, Ordering.BEFORE(), RollTime.ROLL, true,
            function (char, roll, parameters) {
                roll.add_multiplier(0.25, Damage.ALL, source);
                return true;
            });

        chat(character, ability_block_format.format(ability, 'Warleader', clazz.passive['Warleader']));
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


    function warrior_charge(character, ability, parameters) {
        const ability_info = get_ability_info(ability);

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
            add_persistent_effect(character, ability, target_character, 1, Ordering.BEFORE(), RollTime.ROLL, false,
                function (char, roll, parameters) {
                    roll.add_multiplier(0.5, Damage.ALL, source);
                    return true;
                });
        }

        chat(character, ability_block_format.format(ability, ability_info.clazz, ability_info.description.join('\n')));
    }


    function soldier_fleetfoot_blade(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('4d10', Damage.PHYSICAL);
        add_scale_damage(character, roll);

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    const abilities_processors = {
        'Air Duelist': {
            'Mistral Bow': air_duelist_mistral_bow,
            'Arc of Air': air_duelist_arc_of_air,
            'Cutting Winds': air_duelist_cutting_winds,
        },
        'Assassin': {
            'Vanish': print_ability_description,
            'Focus': assassin_focus,
            'Backstab': assassin_backstab,
            'Haste': print_ability_description,
            'Massacre': assassin_massacre,
        },
        'Champion': {
            'Slice and Dice': champion_slice_and_dice,
            'Skull Bash': champion_skull_bash,
            'Piercing Blow': champion_piercing_blow,
            'Disarming Blow': champion_disarming_blow,
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
        'Enchanter': {
            'Mint Coinage': print_ability_description,
            'Modify Weapon': enchanter_modify_weapon,
            'Reconstruct Barrier': print_ability_description,
        },
        'Noxomancer': {
            'Defile': print_ability_description,  // TODO this maybe could do more
            'Siphon Soul': print_ability_description,  // TODO this maybe could do more
            'Darkbomb': noxomancer_darkbomb,
        },
        'Sentinel': {
            'Crossguard Guillotine': sentinel_crossguard_guillotine,
        },
        'Sniper': {
            'Piercing Shot': sniper_piercing_shot,
            'Kill Shot': sniper_kill_shot,
            'Shrapnel Shot': sniper_shrapnel_shot,
            'Distance Shooter': sniper_distance_shooter,
            'Precision Shooter': sniper_precision_shooter,
            'Analytical Shooter': sniper_analytical_shooter,
            'Swift Sprint': print_ability_description,
            'Swift Shot': sniper_swift_shot,
        },
        'Soldier': {
            'Fleetfoot Blade': soldier_fleetfoot_blade,
            'Intercept': print_ability_description,
            'Dodge Roll': print_ability_description,
            'Double Time': print_ability_description,  // TODO this could do more
        },
        'Symbiote': {
            'Strengthen Soul': symbiote_strengthen_soul,
            'Empower Soul': print_ability_description,  // TODO this could do more
            'Strengthen Body': print_ability_description,  // TODO this could do more
            'Strengthen Mind': print_ability_description,  // TODO this could do more
        },
        'Warlord': {
            'Hookshot': warlord_hookshot,
            'Weapon Swap': print_ability_description,
        },
        'Warrior': {
            'Warleader': warrior_warleader,
            'Cut Down': warrior_cut_down,
            'Shields Up': print_ability_description,  // TODO this could do more
            'Reinforce Armor': print_ability_description,  // TODO this could do more
            '"Charge!"': warrior_charge,
            '"Fight Me!"': print_ability_description,  // TODO this could do more
        }
    };


    function process_ability(msg) {
        const character = get_character(msg);
        if (character === null) {
            log('error, unknown character for ' + msg.who);
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
        if (!(clazz in BarbsComponents.clazzes)) {
            log('mismatched class %s'.format(clazz));
        }
        if (!(BarbsComponents.clazzes[clazz].abilities.includes(ability))
                && Object.keys(BarbsComponents.clazzes[clazz].passive)[0] !== ability) {
            log('mismatched ability %s'.format(ability));
        }

        const processor = abilities_processors[clazz][ability];
        processor(character, ability, parameters);
    }


    // ################################################################################################################
    // Turn order tracking


    function do_turn_order_change() {
        const turn = get_current_turn();
        if (turn.id === state[STATE_NAME][LAST_TURN_ID]) {
            return;
        }

        const last_turn_id = state[STATE_NAME][LAST_TURN_ID];
        state[STATE_NAME][LAST_TURN_ID] = turn.id;

        // End effects cast by the character who is currently up
        const current_token = getObj('graphic', turn.id);
        const current_name = current_token.get('name');
        if (current_name === null) {
            return;
        }

        // TODO CombatTracker adds a placeholder entry in the turn order that counts the rounds. If the turn is this
        //  entry, CombatTracker will advance the turn order to the next one automatically. We should wait for this
        //  change, so that we do our handling on an actual character's turn.

        const current_character = get_character_by_name(current_name);
        if (current_character === null) {
            return;
        }

        for (let i = 0; i < persistent_effects.length; i++) {
            if (persistent_effects[i].caster !== current_character.name) {
                continue;
            }

            if (persistent_effects[i].single_application) {
                continue;
            }

            if (persistent_effects[i].duration === 0) {
                log('Persistent effect %s on %s ended'.format(persistent_effects[i].name, persistent_effects[i].target));
                persistent_effects.splice(i, 1);
                i--;
            }

            persistent_effects[i].duration -= 1;
        }

        // End effects when a character's turn ends. No decrement here, just get rid of ones with 0 duration.
        const previous_token = getObj('graphic', last_turn_id);
        const previous_name = previous_token.get('name');
        if (previous_name === null) {
            return;
        }
        const previous_character = get_character_by_name(previous_name);

        for (let i = 0; i < persistent_effects.length; i++) {
            if (persistent_effects[i].caster !== previous_character.name) {
                continue;
            }

            if (persistent_effects[i].single_application) {
                continue;
            }

            if (persistent_effects[i].duration === 0) {
                log('Persistent effect %s on %s ended'.format(persistent_effects[i].name, persistent_effects[i].target));
                persistent_effects.splice(i, 1);
                i--;
            }
        }
    }


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

    // main message handler
    const subcommand_handlers = {
        'item': roll_item,
        'stat': roll_stat,
        'skill': roll_skill,
        'ability': process_ability,
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
                // TODO I could do better and make something that repeatedly, asynchronously, waits for the turn order
                //  to change, courtesy of CombatTracker, rather than a one-time check and hope.
                //
                setTimeout(do_turn_order_change, 1000);
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

            log('API call: who=' + msg.who + ', message="' + msg.content + '"');

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
    };


    return {
        register_event_handlers,
    };
})();


on('ready', () => {
    'use strict';

    Barbs.register_event_handlers();
});
