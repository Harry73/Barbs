
function get_stat(attr_tla) {
    for (var i = 0; i < STATS.length; i++) {
        if (STATS[i].attr_tla == attr_tla) {
            return STATS[i];
        }
    }
    
    return null;
}

function get_attr(name) {
    for (var i = 0; i < attributes.length; i++) {
        if (attributes[i].name == name) {
            return attributes[i];
        }
    }
    
    return null;
}

on('ready', function() {
    log('main.js begin');
    for (var i = 0; i < components.length; i++) {
        log(components[i].name);
    }
    
    Object.keys(hoshiko.attributes).forEach(function(attribute_name) {
        attribute_value = hoshiko.attributes[attribute_name];
        
        attribute = get_attr(attribute_name);
        stat = get_stat(attribute.abbreviation);
        
        log(stat.name + " " + stat.value(attribute_value));
    });

    log('main.js complete');
});
