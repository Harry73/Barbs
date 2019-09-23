// Owner to player garbage

/*
function get_owner_name(who, id) {
    var found_owner = null;
    Object.keys(owners).forEach(function(owner_name) {
        var owner_ids = owners[owner_name];
        for (var i = 0; i < owner_ids.length; i++) {
            if (owner_ids[i] == who || owner_ids[i] == id) {
                found_owner = owner_name;
            }
        }
    });

    return found_owner;
}

function get_character(who, id) {
    var owner_name = get_owner_name(who, id);
    if (owner_name == null) {
        log('owner is null');
        return null;
    }

    for (var i = 0; i < character_list.length; i++) {
        var character = character_list[i];
        if (character.owner === owner_name) {
            return character;
        }
    }

    return null;
}

// Fetch component from the giant lists

function get_attribute(name, value) {
    for (var i = 0; i < attributes.length; i++) {
        if (attributes[i].name == name) {
            var attr = attributes[i];
            attr.value = value;
            return attr;
        }
    }

    return null;
}

function get_stat(attribute) {
    for (var i = 0; i < STATS.length; i++) {
        if (STATS[i].attr_tla == attribute.abbreviation) {
            return STATS[i];
        }
    }

    return null;
}

function get_skill(name, value) {
    return null;
}

function get_clazz(name) {
    return null;
}

function get_ability(name) {
    return null;
}
*/

String.prototype.format = function() {
    a = this;
    for (k in arguments) {
        a = a.replace('%s', arguments[k])
    }
    return a
}


function get_character_names(who, id) {
    var found_characters = [];
    Object.keys(characters_by_owner).forEach(function(character_name) {
        var owner_names = characters_by_owner[character_name];
        for (var i = 0; i < owner_names.length; i++) {
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
        sendChat(who, 'Error, found multiple characters for ' + who);
        return null;
    }

    return characters[0];
}

function get_item_names(character) {
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

function generate_stat_roll_modifier(character, stat_to_roll) {
    const character_items = get_character_items(character);
    const stat = get_stat(stat_to_roll);
    const attribute = parseInt(getAttrByName(character.id, stat.attr_tla), 10);

    let mod = '' + stat.value(attribute);
    _.each(character_items, function(item) {
        for (let i = 0; i < item.effects.length; i++) {
            if (item.effects[i].type === 'stat') {
                mod = mod + item.effects[i].apply(stat_to_roll);
            }
        }
    });

    return mod;
}

function roll_stat(msg) {
    const character = get_character(msg.who, msg.playerid);
    if (character === null) {
        return;
    }

    const stat_to_roll = msg.content.split(' ')[1].replace(/_/g, ' ').toLowerCase();
    const modifier = generate_stat_roll_modifier(character, stat_to_roll);

    const total_format = '&{template:default} {{name=%s}} {{%s=[[%s]]}}';
    const regen_format = '&{template:default} {{name=%s}} {{%s=[[round([[%s]]*[[(%s)/100]])]]}}';
    const percent_format = '&{template:default} {{name=%s}} {{%s=[[1d100cs>[[100-(%s)+1]]]]}}';

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
            const total_health = generate_stat_roll_modifier(character, 'health');
            sendChat(msg.who, regen_format.format('Health Regeneration', 'Regen', total_health, modifier));
            break;

        case 'stamina regeneration':
            const total_stamina = generate_stat_roll_modifier(character, 'stamina');
            sendChat(msg.who, regen_format.format('Stamina Regeneration', 'Regen', total_stamina, modifier));
            break;

        case 'mana regeneration':
            const total_mana = generate_stat_roll_modifier(character, 'mana');
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

    /*
    var character = get_character(msg.who, msg.playerid);
    if (character === null) {
        log('no character');
        return;
    }

    if (msg.content.indexOf('!use ') !== -1) {
        var pieces = msg.content.split(' ');
        var ability_str = pieces[1];
        log('use ability ' + ability_str);

        // respond as the player
        sendChat(msg.who, 'character ' + character.name + ' use ability ' + ability_str);
    } else if (msg.content.indexOf('!roll skill ') !== -1) {
        var pieces = msg.content.split(' ');
        var skill_str = pieces[2].replace('name', 'value');

        log('use skill ' + skill_str);
        //get scale stat
        var scaling_stat = 'REF';

        sendChat(msg.who, '[[1d100 + @{Ren Nightside|' + skill_str + '} * 5 + @{Ren Nightside|' + scaling_stat + '}]]');
    }
    */
});

