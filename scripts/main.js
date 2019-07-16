// Owner to player garbage

function get_owner_name(id) {
    var found_owner = null;
    Object.keys(owners).forEach(function(owner) {
        var owner_id = owners[owner];
        if (owner_id === id) {
            found_owner = owner;
        }
    });

    return found_owner;
}

function get_player(id) {
    var owner_name = get_owner_name(id);

    for (var i = 0; i < players.length; i++) {
        var player = players[i];
        if (player['owner'] === owner_name) {
            return player;
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

class Player {
    constructor(player_json) {
        this.attributes = this.get_attributes(player_json.attributes);
        this.stats = this.get_stats(this.attributes);
        this.skills = this.get_skills(player_json.skills);
        this.abilities = [];
        this.clazzes = this.get_clazzes(player_json.clazzes);
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

function setup_players() {
    for (var i = 0; i < player_list.length; i++) {
        var player = new Player(player_list[i]);
        players.push(player);
    }
}


on('ready', function() {
    log('main.js begin');

    setup_players();

    log('main.js complete');
});


// message handler
on("chat:message", function(msg) {
  // handle "!use" api call
  if(msg.type == "api" && msg.content.indexOf("!use ") !== -1) {
    var player = get_player(msg.playerid);

    var pieces = msg.content.split(' ');
    var ability_str = pieces[1];
    log('use ability ' + ability_str);
    
    // respond as the player
    sendChat(msg.who, 'player ' + player.name + ' use ability ' + ability_str);
  }
});

