// Owner to player garbage

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


// Player

class Character {
    constructor(character_json) {
        this.name = character_json.name;
        this.owner = character_json.owner;
        this.gender = character_json.gender;
        this.race = this.get_race(character_json.race);
        this.height = character_json.height;
        this.weight = character_json.weight;
        this.eye_color = character_json.eye_color;
        this.alignment = character_json.alignment;
        this.languages = character_json.languages;

        this.attributes = this.get_attributes(character_json.attributes);
        this.stats = this.get_stats(this.attributes);
        this.skills = this.get_skills(character_json.skills);
        this.abilities = [];
        this.clazzes = this.get_clazzes(character_json.clazzes);
        this.items = [];
    }

    get_attributes(attributes_json) {
        var attributes = [];
        Object.keys(attributes_json).forEach(function(attribute_name) {
            attributes.push(get_attribute(attribute_name, attributes_json[attribute_name]));
        });

        return attributes;
    }

    get_stats(attributes) {
        var stats = [];
        for (var i = 0; i < attributes; i++) {
            stats.push(get_stat(attribute));
        }

        return stats;
    }

    get_race(race_name) {
        return null;
    }

    get_skills(skills_json) {
        var skills = [];
        Object.keys(skills_json).forEach(function(skill_name) {
            skills.push(get_skill(skill_name, skills_json[skill_name]));
        });

        return skills;
    }

    get_abilities(abilities_list) {
        for (var i = 0; i < abilities_list.length; i++) {
            this.abilities.push(get_ability(abilities_list[i]));
        }
    }

    get_clazzes(clazzes_json) {
        var clazzes = [];
        var self = this;
        Object.keys(clazzes_json).forEach(function(clazz_name) {
            clazzes.push(get_clazz(clazz_name));
            self.get_abilities(clazzes_json[clazz_name]);
        });

        return clazzes;
    }

};

function setup_characters() {
    for (var i = 0; i < character_list.length; i++) {
        var character = new Character(character_list[i]);
        characters.push(character);
    }
}


on('ready', function() {
    log('main.js begin');

    setup_characters();

    log('main.js complete');
});


// message handler
on("chat:message", function(msg) {
  // handle "!use" api call
    if(msg.type != "api") {
        return;
    }

    log('who=' + msg.who + ', id=' + msg.playerid + ', message=' + msg.content);

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
});

