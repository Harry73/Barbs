var Barbs = Barbs || (function() {
    'use strict';

    // Basic python-like string formatting
    String.prototype.format = function () {
        let a = this;
        for (let i = 0; i < arguments.length; i++) {
            a = a.replace('%s', arguments[i]);
        }
        return a
    };

    const total_format = '&{template:default} {{name=%s}} {{%s=[[%s]]}}';
    const regen_format = '&{template:default} {{name=%s}} {{%s=[[round([[%s]]*[[(%s)/100]])]]}}';
    const percent_format = '&{template:default} {{name=%s}} {{%s=[[1d100cs>[[100-(%s)+1]]]]}}';

    const roll_format = '&{template:Barbs} {{name=%s}} %s %s %s';
    const damage_section_format = '{{%s=[[%s]]}}';
    const crit_section_format = '{{crit_value=[[%s]]}} {{crit_cutoff=[[%s]]}}';
    const effects_section_format = '{{effects=%s}}';

    const full_info_block_format = '&{template:5eDefault} {{spell=1}} {{spellshowinfoblock=1}} {{spellshowdesc=1}} {{character_name=@{Kairi Halicarnuss|character_name}}} {{title=%s}} {{subheader=%s}} {{subheaderright=%s}} {{spellcasttime=%s}} {{spellduration=%s}} {{spelltarget=%s}} {{spellrange=%s}} {{spellgainedfrom=%s}} {{spelldescription=Create or destroy 20 gallons of water. You can extinguish flames with this in 30 ft cube if you want. }} @{Kairi Halicarnuss|classactionspellinfo}'
    const ability_block_format = '&{template:5eDefault} {{spell=1}} {{title=%s}} {{subheader=%s}} 0 {{spellshowdesc=1}} {{spelldescription=%s }} 0 0 0 0 0 0 0';

    let persistent_effects = [];


    function chat(character, string, handler) {
        sendChat(character.who, string, handler);
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


    /*
    // Example msg result from a crit roll
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


    function get_parameter(parameter, parameters) {
        for (let i = 0; i < parameters.length; i++) {
            if (parameters[i].includes(parameter)) {
                return parameters[i].split(' ')[1];
            }
        }

        return null;
    }


    // Roll for whether or not this will be a crit, and set the result in the roll. The passed handler should take a
    // string that can be appended to show the result of the crit roll.
    function roll_crit(roll, handler) {
        roll_stat_inner(roll.character, 'critical hit chance', function (results) {
            const rolls = results[0].inlinerolls;
            const crit_compare_value = rolls[0].results.total;
            const rolled_value_for_crit = rolls[1].results.total;
            roll.crit = (rolled_value_for_crit >= crit_compare_value);

            const crit_section = crit_section_format.format(rolled_value_for_crit, crit_compare_value);
            handler(crit_section);
        });
    }


    // Iterate through the character's items and add any damage bonuses or multipliers to the roll
    function add_items_to_roll(character, roll) {
        _.each(character.items, function (item) {
            for (let i = 0; i < item.effects.length; i++) {
                if (item.effects[i].type === 'roll') {
                    item.effects[i].apply(roll);
                }
            }
        });
    }


    // Iterate through effects of abilities (buffs, empowers, etc) that may last multiple turns and add applicable ones
    // to the roll.
    function add_persistent_effects_to_roll(character, roll, parameters) {
        for (let i = 0; i < persistent_effects.length; i++) {
            if (character.name === persistent_effects[i].character) {
                if (!persistent_effects[i].handler(character, roll, parameters)) {
                    return false;
                }
            }
        }

        return true;
    }


    // 1. Do the roll, which actually builds up the strings for the roll on a per-type basis.
    // 2. Fill out a roll template to construct the message.
    // 3. Add in any extra effects that don't fit nicely into a damage type to the message.
    // 4. Record and send the message.
    function do_roll(character, ability, roll, crit_section) {
        const rolls_per_type = roll.roll();

        // Some effects last exactly one attack. At this point, we've successfully applied everything and done the roll,
        // so the attack will complete. the single-use persistent effects from the master list.
        for (let i = 0; i < persistent_effects.length; i++) {
            if (persistent_effects[i].remove_after_single_application) {
                persistent_effects.splice(i, 1);
                i--;
            }
        }

        let damage_section = '';
        Object.keys(rolls_per_type).forEach(function (type) {
            damage_section = damage_section + damage_section_format.format(type, rolls_per_type[type]);
        });

        let effects = '';
        if (roll.effects.length > 0) {
            effects = effects_section_format.format(roll.effects.join(''));
        }

        const msg = roll_format.format(ability, damage_section, crit_section, effects);

        log('Roll: ' + msg);
        chat(character, msg);
    }


    // ################################################################################################################
    // Class passives (usually) that may apply to anything


    function arbitrary_multiplier(roll, parameter) {
        const pieces = parameter.split(' ');
        const multiplier = pieces[1];
        const type = pieces[2];
        const source = pieces[3];
        roll.add_multiplier(multiplier, type, source);
        return true;
    }


    function arbitrary_damage(roll, parameter) {
        const pieces = parameter.split(' ');
        const damage = pieces[1];
        const type = pieces[2];
        roll.add_damage(damage, type);
        return true;
    }


    function sniper_spotter(roll, parameter) {
        const stacks = parseInt(parameter.split(' ')[1]);
        roll.add_multiplier(stacks * 0.25, 'all', 'self');
        return true;
    }


    const arbitrary_parameters = {
        'misc_multiplier': arbitrary_multiplier,
        'misc_damage': arbitrary_damage,
        'spotting': sniper_spotter,
    };


    function handle_arbitrary_parameters(roll, parameters) {
        for (let i = 0; i < parameters.length; i++) {
            Object.keys(arbitrary_parameters).forEach(function (keyword) {
                if (parameters[i].includes(keyword)) {
                    if (!arbitrary_parameters[keyword](roll, parameters[i])) {
                        return false;
                    }
                }
            });
        }

        return true;
    }


    // ################################################################################################################
    // Class abilities


    function air_duelist_mistral_bow(character, ability, parameters) {
        const ability_info = get_ability_info(ability);

        const persistent = {
            'character': character.name,
            'duration': ability_info.duration,
            'remove_after_single_application': false,
            'handler': function (character, roll) {
                roll.add_effect('Bow attacks push target 5ft away');
            },
        };

        persistent_effects.push(persistent);
        chat(character, ability_block_format.format(ability, ability_info.clazz, ability_info.description.join('\n')));
    }


    function air_duelist_arc_of_air(character, ability, parameters) {
        const ability_info = get_ability_info(ability);

        const persistent = {
            'character': character.name,
            'duration': ability_info.duration,
            'handler': function (character, roll) {
                roll.add_damage('2d8', 'air');
                return true;
            },
        };

        persistent_effects.push(persistent);
        chat(character, ability_block_format.format(ability, ability_info.clazz, ability_info.description.join('\n')));
    }


    function air_duelist_cutting_winds(character, ability, parameters) {
        const roll = new BarbsComponents.Roll(character, 'magic');

        roll_crit(roll, function (crit_section) {
            roll.add_damage('6d8', 'air');
            roll.add_damage(character.get_stat('magic damage'), 'air');
            roll.add_effect('Knocks prone');

            add_items_to_roll(character, roll);
            if (!add_persistent_effects_to_roll(character, roll, parameters)) {
                return;
            }
            if (!handle_arbitrary_parameters(roll, parameters)) {
                return;
            }
            do_roll(character, ability, roll, crit_section);
        });
    }


    function enchanter_mint_coinage(character, ability, parameters) {
        const ability_info = get_ability_info(ability);
        chat(character, ability_block_format.format(ability, ability_info.clazz, ability_info.description.join('\n')));
    }


    function sniper_piercing_shot(character, ability, parameters) {
        const roll = new BarbsComponents.Roll(character, 'physical');

        roll_crit(roll, function (crit_section) {
            roll.add_damage('5d8', 'physical');
            roll.add_damage(character.get_stat('ranged fine damage'), 'physical');
            add_items_to_roll(character, roll);
            if (!add_persistent_effects_to_roll(character, roll, parameters)) {
                return;
            }
            if (!handle_arbitrary_parameters(roll, parameters)) {
                return;
            }
            do_roll(character, ability, roll, crit_section);
        });
    }


    function sniper_kill_shot(character, ability, parameters) {
        const roll = new BarbsComponents.Roll(character, 'physical');

        roll_crit(roll, function (crit_section) {
            roll.add_damage('7d8', 'physical');
            roll.add_damage(character.get_stat('ranged fine damage'), 'physical');

            const stacks_spent_for_lethality = get_parameter('stacks', parameters);
            if (stacks_spent_for_lethality !== null) {
                roll.add_effect('%s% Lethality'.format(10 * parseInt(stacks_spent_for_lethality, 10)));
            }

            add_items_to_roll(character, roll);
            if (!add_persistent_effects_to_roll(character, roll, parameters)) {
                return;
            }
            if (!handle_arbitrary_parameters(roll, parameters)) {
                return;
            }
            do_roll(character, ability, roll, crit_section);
        });
    }


    function sniper_distance_shooter(character, ability, parameters) {
        const ability_info = get_ability_info(ability);

        const persistent = {
            'character': character.name,
            'duration': 1,
            'remove_after_single_application': true,
            'handler': function (character, roll, parameters) {
                const distance = get_parameter('distance', parameters);
                if (distance === null) {
                    chat(character, '"distance" parameter is missing');
                    return false;
                }

                // 2 damage per 5 ft between character and target
                roll.add_damage(2 * parseInt(distance, 10) / 5, 'physical');

                return true;
            },
        };

        // TODO: cope with multiple targets being hit by one instance of distance shooter
        // Isn't there a world where you could output the base roll and multipliers first, and then have it output the
        // damage just from distance and the multipliers for that bonus damage for each target? So the base roll would
        // be the same for each enemy and then we'd just add on manually the multiplied damage from the distance for
        // each enemy

        persistent_effects.push(persistent);
        chat(character, ability_block_format.format(ability, ability_info.clazz, ability_info.description.join('\n')));
    }


    function sniper_precision_shooter(character, ability, parameters) {
        const ability_info = get_ability_info(ability);

        const persistent = {
            'character': character.name,
            'duration': 1,
            'remove_after_single_application': true,
            'handler': function (character, roll, parameters) {
                roll.add_effect('Ignores AC');
                roll.add_effect('Ignores MR');
                roll.add_effect('Cannot miss');
                roll.add_effect('Cannot be blocked');
                roll.add_effect('Cannot be reacted to');
                roll.add_effect('Cannot be blocked or redirected');
                roll.add_effect('Bypasses barriers and walls');
                return true;
            },
        };

        persistent_effects.push(persistent);
        chat(character, ability_block_format.format(ability, ability_info.clazz, ability_info.description.join('\n')));
    }


    function warrior_charge(character, ability, parameters) {
        const ability_info = get_ability_info(ability);

        if (parameters.length < 1) {
            chat(character, 'Need a parameter for the list of affected players');
        }
        const character_names = parameters[0].split(',');

        for (let i = 0; i < character_names.length; i++) {
            const fake_msg = {'who': character_names[i], 'id': ''};
            const target_character = get_character(fake_msg);
            if (target_character === null) {
                return;
            }

            const persistent = {
                'character': target_character.name,
                'duration': 1,
                'remove_after_single_application': false,
                'handler': function (character, roll, parameters) {
                    roll.add_multiplier(0.5, 'all', character.name);
                    return true;
                },
            };

            persistent_effects.push(persistent);
        }

        chat(character, ability_block_format.format(ability, ability_info.clazz, ability_info.description.join('\n')));
    }


    function soldier_fleetfoot_blade(character, ability, parameters) {
        const roll = new BarbsComponents.Roll(character, 'physical');

        roll_crit(roll, function (crit_section) {
            roll.add_damage('4d10', 'physical');
            roll.add_damage(character.get_stat('melee damage'), 'physical');
            add_items_to_roll(character, roll);
            if (!add_persistent_effects_to_roll(character, roll, parameters)) {
                return;
            }
            if (!handle_arbitrary_parameters(roll, parameters)) {
                return;
            }
            do_roll(character, ability, roll, crit_section);
        });
    }


    const abilities_processors = {
        'Air Duelist': {
            'Mistral Bow': air_duelist_mistral_bow,
            'Arc of Air': air_duelist_arc_of_air,
            'Cutting Winds': air_duelist_cutting_winds,
        },
        'Enchanter': {
            'Mint Coinage': enchanter_mint_coinage,
        },
        'Sniper': {
            'Piercing Shot': sniper_piercing_shot,
            'Kill Shot': sniper_kill_shot,
            'Distance Shooter': sniper_distance_shooter,
            'Precision Shooter': sniper_precision_shooter,
        },
        'Soldier': {
            'Fleetfoot Blade': soldier_fleetfoot_blade,
        },
        'Warrior': {
            '"Charge!"': warrior_charge,
        }
        // TODO add more
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
            chat(msg, 'mismatched class %s, this is Ian\'s mistake'.format(clazz));
            return;
        }
        if (!(BarbsComponents.clazzes[clazz].abilities.includes(ability))) {
            chat(msg, 'mismatched ability %s, this is Ian\'s mistake'.format(ability));
        }

        const processor = abilities_processors[clazz][ability];
        processor(character, ability, parameters);
    }


    // ################################################################################################################
    // Basic setup and message handling

    // main message handler
    const subcommand_handlers = {
        'stat': roll_stat,
        'skill': roll_skill,
        'ability': process_ability,
    };


    function handle_input(msg) {
        if (msg.type !== 'api') {
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

        log('API call: who=' + msg.who + ', id=' + msg.playerid + ', message="' + msg.content + '"');

        const sub_command = pieces[1];
        if (!(sub_command in subcommand_handlers)) {
            chat(msg, 'unknown barbs subcommand %s'.format(sub_command));
            return;
        }

        const processor = subcommand_handlers[sub_command];
        processor(msg);
    }


    const register_event_handlers = function() {
        on('chat:message', handle_input);
    };


    return {
        register_event_handlers,
    };
})();


on('ready', () => {
    'use strict';

    Barbs.register_event_handlers();
});
