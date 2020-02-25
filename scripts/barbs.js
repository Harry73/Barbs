
// Basic python-like string formatting
String.prototype.format = function() {
    let a = this;
    for (let i = 0; i < arguments.length; i++) {
        a = a.replace('%s', arguments[i]);
    }
    return a
};

const total_format = '&{template:default} {{name=%s}} {{%s=[[%s]]}}';
const regen_format = '&{template:default} {{name=%s}} {{%s=[[round([[%s]]*[[(%s)/100]])]]}}';
const percent_format = '&{template:default} {{name=%s}} {{%s=[[1d100cs>[[100-(%s)+1]]]]}}';
// TODO: The escaped double quotes at the end aren't working right. This does have to be one line.
const crit_roll_format = '<div class="sheet-rolltemplate-default"><table><caption>Critical Hit Chance</caption><tbody><tr><td>Crit</td><td><span class="inlinerollresult showtip tipsy-n-right fullcrit" original-title="<img src=&#34;images/quantumrollwhite.png&#34; class=&#34;inlineqroll&#34;> Rolling 1d100cs>%s = (<span class=&#34;basicdiceroll critsuccess &#34;>%s</span>)">%s</span></td></tr></tbody></table></div>';


function chat(character, string, handler) {
    sendChat(character.who, string, handler);
}


function get_character_names(who, id) {
    const found_characters = [];
    Object.keys(characters_by_owner).forEach(function(character_name) {
        const owner_names = characters_by_owner[character_name];
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

    return new Character(characters[0], msg.who);
}



function apply_items(character, thing_to_roll, effect_type) {
    let mod = '';
    _.each(character.items, function(item) {
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
    const stat = get_stat(stat_to_roll);
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

// Roll for whether or not this will be a crit, and set the result in the roll. The passed handler should take a string
// that can be appended to show the result of the crit roll.
//
function roll_crit(roll, handler) {
    roll_stat_inner(roll.character, 'critical hit chance', function(results) {
        const rolls = results[0].inlinerolls;

        const rolled_value_for_crit = rolls[1].results.total;
        const crit_compare_value = rolls[0].results.total;
        roll.crit = (rolled_value_for_crit >= crit_compare_value);

        // Show the crit roll
        chat(roll.character, crit_roll_format.format(crit_compare_value, rolled_value_for_crit, rolled_value_for_crit));

        handler();
    });
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

    if (!(skill_to_roll in skill_to_attribute_map)) {
        log('error, skill "' + skill_to_roll + '" not in skill-to-attribute map');
        return;
    }

    const attribute = parseInt(getAttrByName(character.id, skill_to_attribute_map[skill_to_roll]), 10);

    const modifier = apply_items(character, skill_to_roll, 'skill');
    let roll_string = 'd100+%s+%s'.format(bonus, attribute);
    if (modifier !== '') {
        roll_string += '+' + modifier;
    }

    chat(msg, total_format.format(skill_to_roll, 'Roll', roll_string));
}


// ####################################################################################################################
// Class abilities

function sniper_spotter(character, parameters) {
    chat(character, 'not implemented');
}

function sniper_piercing_shot(character, parameters) {
    const roll = new Roll(character);

    roll_crit(roll, function() {
        roll.add_damage('5d8', 'physical');
        roll.add_damage(character.get_stat('ranged fine damage'), 'physical');

        _.each(character.items, function(item) {
            for (let i = 0; i < item.effects.length; i++) {
                if (item.effects[i].type === 'roll') {
                    item.effects[i].apply(roll);
                }
            }
        });

        const rolls = roll.roll();
        let msg_strings = [];
        Object.keys(rolls).forEach(function(type) {
            msg_strings.push('[[%s]] %s'.format(rolls[type], type));
        });

        let msg = msg_strings.join(', ');

        if (roll.effects.length > 0) {
            msg = msg + '\nEffects: %s'.format(roll.effects.join(', '));
        }

        log('Roll: ' + msg);

        chat(character, msg);
    });
}

function sniper_kill_shot(character, parameters) {
    chat(character, 'not implemented');
}









const barbs_abilities_processors = {
    'Sniper': {
        'Spotter': sniper_spotter,
        'Piercing Shot': sniper_piercing_shot,
        'Kill Shot': sniper_kill_shot,
    },
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
    const option_pieces = options.split(',');
    const clazz = option_pieces[0];
    const ability = option_pieces[1];
    const parameters = option_pieces.slice(2);

    // Verify that we know how to handle this class + ability combo
    if (!(clazz in barbs_abilities_processors)) {
        chat(msg, 'unknown class %s'.format(clazz));
        return;
    }
    if (!(ability in barbs_abilities_processors[clazz])) {
        chat(msg, 'unknown ability %s'.format(ability));
        return;
    }

    // Double check that the class and ability names are correct based on the master components list
    if (!(clazz in clazzes)) {
        chat(msg, 'mismatched class %s, this is Ian\'s mistake'.format(clazz));
        return;
    }
    if (!(clazzes[clazz].abilities.includes(ability))) {
        chat(msg, 'mismatched ability %s, this is Ian\'s mistake'.format(ability));
    }

    const processor = barbs_abilities_processors[clazz][ability];
    processor(character, parameters);
}






// ####################################################################################################################
// Basic setup and message handling

on('ready', function() {
    log('barbs.js begin');

    // setup_characters();

    log('barbs.js complete');
});


barbs_subcommand_handlers = {
    'stat': roll_stat,
    'skill': roll_skill,
    'ability': process_ability,
};


// main message handler
on("chat:message", function(msg) {
    if(msg.type !== "api") {
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
    if (!(sub_command in barbs_subcommand_handlers)) {
        chat(msg, 'unknown barbs subcommand %s'.format(sub_command));
        return;
    }

    const processor = barbs_subcommand_handlers[sub_command];
    processor(msg);
});
