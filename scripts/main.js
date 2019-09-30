
// Basic python-like string formatting
String.prototype.format = function() {
    let a = this;
    for (let i = 0; i < arguments.length; i++) {
        a = a.replace('%s', arguments[i]);
    }
    return a
};

const item_slots = [
    'main_hand',
    'offhand',
    'head',
    'body',
    'hands',
    'feet',
    'neck',
    'left_ring',
    'right_ring',
    'belt',
];

const total_format = '&{template:default} {{name=%s}} {{%s=[[%s]]}}';
const regen_format = '&{template:default} {{name=%s}} {{%s=[[round([[%s]]*[[(%s)/100]])]]}}';
const percent_format = '&{template:default} {{name=%s}} {{%s=[[1d100cs>[[100-(%s)+1]]]]}}';


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


function get_character(who, id) {
    const character_names = get_character_names(who, id);

    let characters = [];
    for (let i = 0; i < character_names.length; i++) {
        const objects = findObjs({
            _type: 'character',
            name: character_names[i]
        });

        characters = characters.concat(objects);
    }

    if (characters.length === 0) {
        sendChat(who, 'Error, did not find a character for ' + who);
        return null;
    } else if (characters.length > 1) {
        // warn, but pray we've got the right ones regardless
        log('warning, found ' + characters.length + ' matching characters for ' + who);
    }

    return characters[0];
}


function get_item_names(character) {
    const item_names = [];

    _.each(item_slots, function(slot) {
        const item_name = getAttrByName(character.id, slot);
        if (item_name !== '') {
            item_names.push(item_name);
        }
    });

    return item_names;
}


function get_character_items(character) {
    const item_names = get_item_names(character);

    // find the actual item for each given name
    const character_items = [];

    _.each(item_names, function(item_name) {
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


function apply_items(character, thing_to_roll, effect_type) {
    const character_items = get_character_items(character);

    let mod = '';
    _.each(character_items, function(item) {
        for (let i = 0; i < item.effects.length; i++) {
            if (item.effects[i].type === effect_type) {
                mod = mod + item.effects[i].apply(thing_to_roll);
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
    const character = get_character(msg.who, msg.playerid);
    if (character === null) {
        log('error, unknown character for ' + msg.who);
        return;
    }

    const stat_to_roll = msg.content.split(' ')[1].replace(/_/g, ' ').toLowerCase();
    const modifier = generate_stat_roll_modifier_from_items(character, stat_to_roll, 'stat');

    switch (stat_to_roll) {
        case 'health':
            sendChat(msg.who, total_format.format('Total Health', 'Health', modifier));
            break;
        case 'stamina':
            sendChat(msg.who, total_format.format('Total Stamina', 'Stamina', modifier));
            break;

        case 'mana':
            sendChat(msg.who, total_format.format('Total Mana', 'Mana', modifier));
            break;

        case 'health regeneration':
            const total_health = generate_stat_roll_modifier_from_items(character, 'health', 'stat');
            sendChat(msg.who, regen_format.format('Health Regeneration', 'Regen', total_health, modifier));
            break;

        case 'stamina regeneration':
            const total_stamina = generate_stat_roll_modifier_from_items(character, 'stamina', 'stat');
            sendChat(msg.who, regen_format.format('Stamina Regeneration', 'Regen', total_stamina, modifier));
            break;

        case 'mana regeneration':
            const total_mana = generate_stat_roll_modifier_from_items(character, 'mana', 'stat');
            sendChat(msg.who, regen_format.format('Mana Regeneration', 'Regen', total_mana, modifier));
            break;

        case 'movement speed':
            sendChat(msg.who, total_format.format('Total Movement Speed', 'Speed', modifier));
            break;

        case 'ac':
            sendChat(msg.who, total_format.format('Total AC', 'AC', modifier));
            break;

        case 'evasion':
            sendChat(msg.who, percent_format.format('Evasion', 'Evasion', modifier));
            break;

        case 'magic resist':
            sendChat(msg.who, total_format.format('Total Magic Resist', 'Magic Resist', modifier));
            break;

        case 'condition resist':
            sendChat(msg.who, percent_format.format('Condition Resist', 'CR', modifier));
            break;

        case 'melee damage':
            sendChat(msg.who, total_format.format('Bonus Melee Damage', 'Damage', modifier));
            break;

        case 'ranged fine damage':
            sendChat(msg.who, total_format.format('Bonus Ranged/Fine Damage', 'Damage', modifier));
            break;

        case 'magic damage':
            sendChat(msg.who, total_format.format('Bonus Magic Damage', 'Damage', modifier));
            break;

        case 'critical hit chance':
            sendChat(msg.who, percent_format.format('Critical Hit Chance', 'Crit', modifier));
            break;

        case 'commands':
            sendChat(msg.who, total_format.format('Total Commands', 'Commands', modifier));
            break;

        case 'languages':
            sendChat(msg.who, total_format.format('Total Languages', 'Languages', modifier));
            break;

        case 'item efficiency':
            sendChat(msg.who, total_format.format('Total Item Efficiency', 'Modifier', modifier));
            break;

        case 'buff limit':
            sendChat(msg.who, total_format.format('Total Buff Limit', 'Buff Limit', modifier));
            break;

        case 'concentration limit':
            sendChat(msg.who, total_format.format('Total Concentration Limit', 'Concentration Limit', modifier));
            break;

        default:
            sendChat(msg.who, 'Error, unknown stat ' + stat_to_roll);
    }
}


function roll_skill(msg) {
    const character = get_character(msg.who, msg.playerid);
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

    sendChat(msg.who, total_format.format(skill_to_roll, 'Roll', roll_string));
}


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
    }
});
