
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


function chat(character, string) {
    sendChat(character.who, string);
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

    const stat_to_roll = msg.content.split(' ')[1].replace(/_/g, ' ').toLowerCase();
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
            chat(character, percent_format.format('Critical Hit Chance', 'Crit', modifier));
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
    const skill_to_roll = pieces.slice(1, pieces.length - 1).join(' ').replace(/:/g, '');

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
    let msg = '';
    Object.keys(rolls).forEach(function(type) {
        msg = msg + '[[%s]] %s, '.format(rolls[type], type);
    });

    // TODO I don't think I can figure some things out before actually sending the message, so there'd just be extra
    // text, like "Stun on crit". Or I do two rolls for everything. One with damage and crit, another for
    // additional stuff, like multiplied damage and extra effects. There's supposedly a callback feature I can use
    // to get the result and then do things with it.
    chat(character, msg);
}

function sniper_kill_shot(character, parameters) {
    chat(character, 'not implemented');
}









const barbs_abilities_processors = {
    'sniper_spotter': sniper_spotter,
    'sniper_piercing_shot': sniper_piercing_shot,
    'sniper_kill_shot': sniper_kill_shot,
    // TODO add more
};


function process_ability(msg) {
    const character = get_character(msg);
    if (character === null) {
        log('error, unknown character for ' + msg.who);
        return;
    }

    const pieces = msg.content.split(' ');
    const ability = pieces[1];
    const parameters = pieces.slice(2);

    if (!(ability in barbs_abilities_processors)) {
        chat(msg, 'unknown ability %s'.format(ability));
        return;
    }

    const processor = barbs_abilities_processors[ability];
    processor(character, parameters);
}






// ####################################################################################################################
// Basic setup and message handling

on('ready', function() {
    log('main.js begin');

    // setup_characters();

    log('main.js complete');
});


// message handler
on("chat:message", function(msg) {
    if(msg.type !== "api") {
        return;
    }

    log('API call: who=' + msg.who + ', id=' + msg.playerid + ', message="' + msg.content + '"');

    if (msg.content.indexOf('!barbs_stat') !== -1) {
        roll_stat(msg);
    } else if (msg.content.indexOf('!barbs_skill') !== -1) {
        roll_skill(msg);
    } else if (msg.content.indexOf('!barbs_ability') !== -1) {
        process_ability(msg)
    }
});
