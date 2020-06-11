var Barbs = Barbs || (function () {
    'use strict';


    // ################################################################################################################
    // Constants


    const assert_not_null = BarbsComponents.assert_not_null;
    const assert_type = BarbsComponents.assert_type;
    const assert_starts_with = BarbsComponents.assert_starts_with;
    const parse_int = BarbsComponents.parse_int;
    const trim_percent = BarbsComponents.trim_percent;
    const trim_all = BarbsComponents.trim_all;
    const remove_empty = BarbsComponents.remove_empty;
    const LOG = BarbsComponents.LOG;
    const characters_by_owner = BarbsComponents.characters_by_owner;
    const Stat = BarbsComponents.Stat;
    const HiddenStat = BarbsComponents.HiddenStat;
    const Skill = BarbsComponents.Skill;
    const classes = BarbsComponents.classes;
    const Damage = BarbsComponents.Damage;
    const get_damage_from_type = BarbsComponents.get_damage_from_type;
    const RollType = BarbsComponents.RollType;
    const RollTime = BarbsComponents.RollTime;
    const Roll = BarbsComponents.Roll;
    const Item = BarbsComponents.Item;
    const Character = BarbsComponents.Character;


    // ################################################################################################################
    // Constants


    const STATE_NAME = 'Barbs';
    const LAST_TURN_ID = 'last_turn_id';

    const initiative_format = '&{template:5eDefault} {{title=Initiative}} {{subheader=%s}} {{rollname=Initiative}} {{roll=[[d100+%s+%s]]}}';
    const total_format = '&{template:default} {{name=%s}} {{%s=[[%s]]}}';
    const regen_format = '&{template:default} {{name=%s}} {{%s=[[round([[%s]]*[[(%s)/100]])]]}}';
    const percent_format = '&{template:default} {{name=%s}} {{%s=[[1d100cs>[[100-(%s)+1]]]]}}';

    const roll_format = '&{template:Barbs} {{name=%s}} %s %s %s %s';
    const damage_section_format = '{{%s=[[%s]]}}';
    const crit_section_format = '{{crit_value=[[%s]]}} {{crit_cutoff=[[%s]]}} {{crit_chance=%s}} {{modified_crit=[[%s-%s]]}}';
    const effects_section_format = '{{effects=%s}}';

    const ability_block_format = '&{template:5eDefault} {{spell=1}} {{title=%s}} {{subheader=%s}} 0 {{spellshowdesc=1}} {{spelldescription=%s }} 0 0 0 0 0 0 0';

    let persistent_effects = [];


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


    function chat(character, message, handler) {
        assert_not_null(character, 'chat() character');
        assert_not_null(message, 'chat() message');

        sendChat(character.who, message, handler);
    }


    // Split a string by sep and keep sep as an element in the result
    function split_string(string, sep) {
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



    // ################################################################################################################
    // Character lookup


    function get_character_names(who, id) {
        const found_characters = [];
        Object.keys(characters_by_owner).forEach(function (character_name) {
            const owner_names = characters_by_owner[character_name];
            for (let i = 0; i < owner_names.length; i++) {
                if (owner_names[i] === who || owner_names[i] === id) {
                    found_characters.push(character_name);
                }
            }
        });

        return found_characters;
    }


    function get_character(msg, ignore_failure = false) {
        const character_names = get_character_names(msg.who, msg.id);

        let characters = [];
        for (let i = 0; i < character_names.length; i++) {
            const objects = findObjs({
                _type: 'character',
                name: character_names[i]
            });

            characters = characters.concat(objects);
        }

        if (characters.length === 0 && !ignore_failure) {
            chat(msg, 'Error, did not find a character for ' + msg.who);
            return null;
        } else if (characters.length > 1) {
            // warn, but pray we've got the right ones regardless
            LOG.warn('Found ' + characters.length + ' matching characters for ' + msg.who);
        }

        return new Character(characters[0], msg.who);
    }


    function get_character_by_name(name, ignore_failure = false) {
        assert_not_null(name, 'get_character_by_name() name');

        const fake_msg = {'who': name, 'id': ''};
        return get_character(fake_msg, ignore_failure);
    }


    // ################################################################################################################
    // Non-attack rolls


    function get_roll_with_items_and_effects(character) {
        assert_not_null(character, 'get_roll_with_items_and_effects() character');

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
                persistent_effects[i].handler(character, roll, /*parameters=*/[]);
            }
        }

        return roll;
    }


    function get_stat_roll_modifier(character, roll, stat) {
        assert_not_null(character, 'generate_stat_roll_modifier_from_items() character');
        assert_not_null(roll, 'generate_stat_roll_modifier_from_items() roll');
        assert_not_null(stat, 'generate_stat_roll_modifier_from_items() stat');

        const attribute = parse_int(getAttrByName(character.id, stat.attr_tla));
        let mod = '%s'.format(stat.value(attribute));

        if (stat.name in roll.stats) {
            mod = '%s+%s'.format(mod, roll.stats[stat.name]);
        }

        if (stat.name in roll.stat_multipliers) {
            mod = '(%s)*(1+%s)'.format(mod, roll.stat_multipliers[stat.name]);
        }

        return mod;
    }


    function roll_stat(msg) {
        const character = get_character(msg);
        if (character === null) {
            return;
        }

        const stat = Stat[msg.content.split(' ')[2].toUpperCase()];
        const roll = get_roll_with_items_and_effects(character);
        const modifier = get_stat_roll_modifier(character, roll, stat);

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
                chat(character, percent_format.format('Evasion', 'Evasion', modifier));
                break;

            case Stat.MAGIC_RESIST.name:
                chat(character, total_format.format('Total Magic Resist', 'Magic Resist', modifier));
                break;

            case Stat.CONDITION_RESIST.name:
                chat(character, percent_format.format('Condition Resist', 'CR', modifier));
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
                chat(character, percent_format.format('Critical Hit Chance', 'Crit', modifier));
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


    function roll_skill(msg) {
        const character = get_character(msg);
        if (character === null) {
            return;
        }

        const pieces = msg.content.split(' ');

        const points_in_skill = parse_int(pieces[pieces.length - 1]);
        const bonus = 5 * points_in_skill;
        const given_skill_name = pieces.slice(2, pieces.length - 1).join(' ');
        const skill_name = given_skill_name.replace(/:/g, '').replace(/ /g, '_').toUpperCase();

        if (!(skill_name in Skill)) {
            chat(character, 'Error, skill "%s" not in skill-to-attribute map'.format(skill_name));
            return;
        }

        const skill = Skill[skill_name];
        const attribute = character.get_attribute(skill.scaling_attr_tla);
        let roll_string = 'd100+%s+%s'.format(bonus, attribute);

        const roll = get_roll_with_items_and_effects(character);
        if (skill.name in roll.skills) {
            roll_string += '+%s'.format(roll.skills[skill.name]);
        }
        if (Skill.ALL.name in roll.skills) {
            roll_string += '+%s'.format(roll.skills[Skill.ALL.name]);
        }
        roll_string = 'round(%s)'.format(roll_string);

        chat(msg, total_format.format(given_skill_name, 'Roll', roll_string));
    }


    function roll_initiative(msg) {
        const character = get_character(msg);
        if (character === null) {
            return;
        }

        const roll = get_roll_with_items_and_effects(character);
        chat(msg, initiative_format.format(character.name, roll.initiative_bonus, character.get_attribute('AGI')));
        // TODO: add the character to the tracker, if possible. Trying to add the '&{tracker}' tag to the roll sent
        //  by the API causes an error. I guess we would edit the turn order manually.
    }


    function roll_concentration(msg) {
        const character = get_character(msg);
        if (character === null) {
            return;
        }

        const roll = get_roll_with_items_and_effects(character);
        const roll_string = 'd100+%s'.format(roll.concentration_bonus);
        chat(msg, total_format.format('Concentration Check', 'Roll', roll_string));

    }


    // ################################################################################################################
    // Managing persistent effects


    // Most effects don't care about when they are applied to a roll. But some want to be applied specifically after
    // others. This allows effects to have some desired ordering.
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


    const DurationType = {
        HARD: 'duration_type_hard',
        SOFT: 'duration_type_soft',
        INFINITE: 'duration_type_infinite',
        SINGLE: 'duration_type_single',
    };


    class Duration {
        constructor(duration_type, length) {
            this._type = 'Duration';
            this.duration_type = duration_type;
            this.length = length;
        }

        single_use() {
            return this.duration_type === DurationType.SINGLE;
        }

        // Hard durations end at the end of a turn.
        static HARD(length) {
            return new Duration(DurationType.HARD, length + 0.5);
        }

        // Soft durations end at the start of a turn.
        static SOFT(length) {
            return new Duration(DurationType.SOFT, length);
        }

        // Some effects have effectively indefinite duration. We'll just use 9999 to represent this.
        static INFINITE() {
            return new Duration(DurationType.INFINITE, 9999);
        }

        // Single use durations last until they are applied to an attack once.
        static SINGLE_USE() {
            return new Duration(DurationType.SINGLE, 5);
        }

        // One round is 10 seconds. An effect that lasts one minute should last for the given turn until the end of
        // the 5th turn from when it was cast.
        static ONE_MINUTE() {
            return this.HARD(5);
        }

        // One round is 10 seconds. An effect that lasts one hour should last for the given turn until the end of the
        // 59th turn from when it was cast.
        static ONE_HOUR() {
            return this.HARD(59);
        }
    }


    function make_handler_effective(target_character, handler, parameters, effectiveness) {
        // Figure out what damage / multiplier this handler grants
        const fake_roll = new Roll(target_character, RollType.ALL);
        handler(target_character, fake_roll, parameters);

        // Edit the handler into something that grants the same damages and multipliers, but increased by 50%
        return function (char, roll, params) {
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
            if (Stat.CRITICAL_HIT_CHANCE.name in roll.stats) {
                roll.add_stat_bonus(Stat.CRITICAL_HIT_CHANCE,
                                    effectiveness * fake_roll.stats[Stat.CRITICAL_HIT_CHANCE.name]);
            }
            roll.add_crit_damage_mod(effectiveness * 100 * (fake_roll.crit_damage_mod - 2));
            roll.add_concentration_bonus(effectiveness * fake_roll.concentration_bonus);
            roll.add_initiative_bonus(effectiveness * fake_roll.initiative_bonus);

            // If the old effect changed these, the new effect should do the same
            roll.crit = fake_roll.crit;
            roll.should_apply_crit = fake_roll.should_apply_crit;
            roll.max_damage = fake_roll.max_damage;

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

            // Increase skill bonus by effectiveness
            const skills = Object.keys(fake_roll.skills);
            for (let i = 0; i < skills.length; i++) {
                const skill = Skill[skills[i].toUpperCase().replace(' ', '_').replace(':', '')];
                const base_bonus = fake_roll.skills[skill.name];
                roll.add_skill_bonus(skill, '(%s*(%s))'.format(effectiveness, base_bonus));
            }

            // Copy over effects
            for (let i = 0; i < fake_roll.effects.length; i++) {
                const effect = fake_roll.effects[i];
                // Using direct access because roll.add_effect() turns the effect into an HTML list item, which we
                // don't want to do twice.
                roll.effects.push(effect);
            }

            return true;
        };

    }


    function add_persistent_effect(caster, ability, parameters, target_character, duration, order, roll_type, roll_time,
                                   count, handler) {
        assert_type(caster, 'Character', 'add_persistent_effect() caster');
        assert_not_null(ability, 'add_persistent_effect() ability');
        assert_not_null(parameters, 'add_persistent_effect() parameters');
        assert_type(target_character, 'Character', 'add_persistent_effect() target_character');
        assert_type(duration, 'Duration', 'add_persistent_effect() duration');
        assert_type(order, 'Order', 'add_persistent_effect() order');
        assert_starts_with(roll_type, 'roll_type', 'add_persistent_effect() roll_type');
        assert_starts_with(roll_time, 'roll_time', 'add_persistent_effect() roll_time');
        assert_not_null(handler, 'add_persistent_effect() handler');

        let effectiveness = 1;
        let effectiveness_string = get_parameter('effectiveness', parameters);
        if (effectiveness_string !== null) {
            effectiveness_string = trim_percent(effectiveness_string);
            effectiveness = 1 + parse_int(effectiveness_string) / 100;
            if (Number.isNaN(effectiveness)) {
                chat(caster, 'Non-numeric effectiveness "%s"'.format(effectiveness_string));
                return;
            }
        }

        const effect = {
            'caster': caster.name,
            'name': ability['name'],
            'target': target_character.name,
            'duration': duration,
            'ordering': order,
            'roll_type': roll_type,
            'roll_time': roll_time,
            'count': count,
            'effectiveness': effectiveness,
            'handler': handler,
        };

        // Keep persistent effects in a priority queue, so that we process lower priority effects first and higher
        // priority effects last
        for (let i = 0; i < persistent_effects.length; i++) {
            if (persistent_effects[i].ordering.val > effect.ordering.val) {
                LOG.info('Added persistent effect %s'.format(JSON.stringify(effect)));
                persistent_effects.splice(i, 0, effect);
                return;
            }
        }

        persistent_effects.push(effect);
        LOG.info('Added persistent effect %s'.format(JSON.stringify(effect)));
    }


    function list_persistent_effects(msg) {
        const pieces = msg.content.split(' ');
        let character = null;
        if (pieces.length > 2) {
            const character_name = pieces.slice(2).join(' ');
            character = get_character_by_name(character_name);
        } else {
            character = get_character(msg);
        }

        if (character === null) {
            return;
        }

        let effects = '';
        let callback_options = [];
        for (let i = 0; i < persistent_effects.length; i++) {
            if (persistent_effects[i].target === character.name) {
                effects = effects + '<li>%s</li>'.format(persistent_effects[i].name);
                callback_options.push(persistent_effects[i].name);
            }
        }

        let format = '&{template:Barbs} {{name=Effects on %s}} {{effects=%s}}';
        if (callback_options.length > 0) {
            callback_options = callback_options.join('|').replace(/\'/g, '&#39;');

            format += " {{button=<a href='!barbs remove_effect %s;?{Remove which effect?|%s}'>Remove Effect</a>}}";
            chat(character, format.format(character.name, effects, character.name, callback_options));
        } else {
            chat(character, format.format(character.name, '<li>None</li>'));
        }
    }


    function remove_persistent_effect(msg) {
        const pieces = msg.content.split(' ');
        const options = pieces.slice(2).join(' ');
        const option_pieces = options.split(';');

        let character = null;
        let effect_name = '';
        if (option_pieces.length > 1) {
            // both character and effect were specified
            const character_name = option_pieces[0];
            effect_name = option_pieces[1];
            character = get_character_by_name(character_name);
        } else {
            // only effect was specified
            effect_name = option_pieces[0];
            character = get_character(msg);
        }

        if (character === null) {
            return;
        }

        for (let i = 0; i < persistent_effects.length; i++) {
            if (persistent_effects[i].name === effect_name && persistent_effects[i].target === character.name) {
                persistent_effects.splice(i, 1);
                i--;

                chat(msg, 'Removed effect %s from %s'.format(effect_name, character.name));
                return;
            }
        }

        chat(msg, 'Did not find effect %s on %s'.format(effect_name, character.name));
    }


    // Iterate through effects of abilities (buffs, empowers, etc) that may last multiple turns and add applicable ones
    // to the roll.
    function add_persistent_effects_to_roll(character, roll, roll_time, parameters) {
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
                let handler = persistent_effects[i].handler;
                if (persistent_effects[i].effectiveness !== 1) {
                    handler = make_handler_effective(character, handler, parameters,
                                                     persistent_effects[i].effectiveness);
                }

                if (!handler(character, roll, parameters)) {
                    return false;
                }
            }
        }

        return true;
    }


    // ################################################################################################################
    // Class abilities helpers


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


    function get_applying_weapons(character, roll, parameters) {
        const applying_weapons = [];

        // This special override parameter can be added to parameters to forcibly skip adding items here.
        // This is really for roll_item(), so that we don't apply main/offhand weapons twice.
        if (get_parameter('skip_applying_weapons', parameters) !== null) {
            return applying_weapons;
        }

        if (roll.roll_type === RollType.PHYSICAL) {
            if (get_parameter('offhand', parameters) !== null) {
                applying_weapons.push(character.offhand);
            } else if (get_parameter('dual_wield', parameters) !== null) {
                applying_weapons.push(character.main_hand);
                applying_weapons.push(character.offhand);
            } else {
                applying_weapons.push(character.main_hand);
            }
        } else {
            applying_weapons.push(character.main_hand);
            applying_weapons.push(character.offhand);
        }

        return applying_weapons;
    }


    // For classes abilities specifically. We assume that the ability uses the character's equipped item with type
    // MAIN_HAND or TWO_HAND.
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
    }


    function add_extras(character, roll, roll_time, parameters, crit_section) {
        assert_not_null(character, 'add_extras() character');
        assert_not_null(roll, 'add_extras() roll');
        assert_not_null(roll_time, 'add_extras() roll_time');
        assert_not_null(parameters, 'add_extras() parameters');

        add_items_to_roll(character, roll, roll_time, parameters);

        if (!handle_normal_arbitrary_parameters(roll, roll_time, parameters)) {
            LOG.warn('Problem handling arbitrary parameters at time ' + roll_time);
            return false;
        }

        if (!add_persistent_effects_to_roll(character, roll, roll_time, parameters)) {
            LOG.warn('Problem adding persistent effects to roll at time ' + roll_time);
            return false;
        }

        // Try these special arbitrary parameters last. They will effectively "take over" handling the rest of the roll,
        // so we will fail here and let the arbitrary parameter do it's thing.
        if (handle_takeover_arbitrary_parameters(roll, roll_time, parameters, crit_section)) {
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

        // Most effects can be applied whether or not we know if the result is a crit. These effects should have
        // RollTime.DEFAULT and are applied here.
        if (!add_extras(character, roll, RollTime.DEFAULT, parameters, '')) {
            return;
        }

        const crit_chance = roll.get_crit_chance();
        const crit_compare_value = 100 - crit_chance + 1;

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
    function do_roll(character, ability, roll, parameters, crit_section, do_finalize = true) {
        assert_not_null(character, 'do_roll() character');
        assert_not_null(ability, 'do_roll() ability');
        assert_not_null(roll, 'do_roll() roll');
        assert_not_null(parameters, 'do_roll() parameters');
        assert_not_null(crit_section, 'do_roll() crit_section');

        // Any effect that needs to know whether or not a roll is a crit is applied here. These effects should have
        // RollTime.POST_CRIT.
        if (!add_extras(character, roll, RollTime.POST_CRIT, parameters, crit_section)) {
            return;
        }

        // If we shouldn't actually apply crit chance to this roll, empty out the crit section. Effects that are
        // dependent on whether or not the roll was a crit should not have been applied.
        if (!roll.should_apply_crit) {
            crit_section = '';
        }

        const rolls_per_type = roll.roll();
        format_and_send_roll(character, ability.name, roll, rolls_per_type, crit_section);
        if (do_finalize) {
            finalize_roll(character, roll, parameters);
        }
    }


    function format_and_send_roll(character, roll_title, roll, rolls_per_type, crit_section) {
        assert_not_null(character, 'format_and_send_roll() character');
        assert_not_null(roll_title, 'format_and_send_roll() roll_title');
        assert_not_null(roll, 'format_and_send_roll() roll');
        assert_not_null(rolls_per_type, 'format_and_send_roll() rolls_per_type');
        assert_not_null(crit_section, 'format_and_send_roll() crit_section');

        let damage_section = '';
        Object.keys(rolls_per_type).forEach(function (type) {
            damage_section = damage_section + damage_section_format.format(type, rolls_per_type[type]);
        });

        let effects = Array.from(roll.effects);
        effects.forEach(function(effect, index, self) {
            self[index] = '<li>%s</li>'.format(effect);
        });

        // TODO: only add specific-magic-type penetrations if that damage type is in the roll
        const hidden_stat_formats = Object.keys(roll.hidden_stats);
        for (let i = 0; i < hidden_stat_formats.length; i++) {
            const hidden_stat_format = hidden_stat_formats[i];
            const hidden_stat_value = roll.hidden_stats[hidden_stat_format];

            let formatted_hidden_stat = hidden_stat_format.format(hidden_stat_value);
            if (formatted_hidden_stat.includes('chance')) {
                const value = Math.min(101, hidden_stat_value);
                formatted_hidden_stat = formatted_hidden_stat + ' [[d100cs>[[100-(%s)+1]]]]'.format(value);
            }
            effects.push('<li>%s</li>'.format(formatted_hidden_stat));
        }

        const effects_section = effects_section_format.format(effects.join(''));
        const msg = roll_format.format(roll_title, damage_section, crit_section, effects_section);

        LOG.info('Roll: ' + msg);
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
    // Class passives (usually) that may apply to anything


    function arbitrary_damage(roll, roll_time, parameter) {
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


    function arbitrary_multiplier(roll, roll_time, parameter) {
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


    function aquamancer_tide(roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        const pieces = parameter.split(' ');
        const tide = pieces.splice(1).join(' ');

        if (tide.toLowerCase() === 'flood tide') {
            roll.add_multiplier(0.5, Damage.WATER, 'self');
            if (HiddenStat.FORCED_MOVEMENT in roll.hidden_stats) {
                roll.add_hidden_stat(HiddenStat.FORCED_MOVEMENT, 20);
            }

        } else if (tide.toLowerCase() === 'ebb tide') {
            roll.add_multiplier(0.5, Damage.HEALING, 'self');
            // TODO: buffs grant 20% general MR
        } else {
            chat(roll.character, 'Unknown tide for Aquamancer passive: ' + tide);
            return false;
        }

        return true;
    }


    function assassin_assassinate(roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        roll.add_multiplier(1, Damage.ALL, 'self');
        return true;
    }


    function assassin_pursue_mark(roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        const stacks = parse_int(parameter.split(' ')[1]);
        roll.add_crit_damage_mod(stacks * 50);
        return true;
    }


    function cryomancer_frostbite(roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        const stacks = parse_int(parameter.split(' ')[1]);
        roll.add_multiplier(stacks * 0.5, Damage.ICE, 'self');
        return true;
    }


    function daggerspell_marked(roll, roll_time, parameter, parameters) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        roll.add_stat_bonus(Stat.CRITICAL_HIT_CHANCE, 10);

        const empowered = get_parameter('empowered', parameters);
        if (empowered !== null) {
            roll.add_crit_damage_mod(100);
        }
        return true;
    }


    function dragoncaller_draconic_pact(roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        const pacts = parse_int(parameter.split(' ')[1]);
        roll.add_multiplier(pacts, Damage.ALL, 'self');
        return true;
    }


    function daggerspell_ritual_dagger(roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        const mana_spent = parameter.split(' ')[1];
        roll.add_damage(Math.round(mana_spent / 2), Damage.PHYSICAL);
        return true;
    }


    function juggernaut_what_doesnt_kill_you(roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        const pieces = parameter.split(' ');
        const ratio = pieces[1];
        const current_health = parse_int(ratio.split('/')[0]);
        const total_health = parse_int(ratio.split('/')[1]);
        const missing_health = total_health - current_health;

        roll.add_multiplier(missing_health / total_health, Damage.PHYSICAL, 'self');
        return true;
    }


    function lightning_duelist_arc_lightning_mark(roll, roll_time, parameter, parameters) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        if (RollType.is_physical(roll.roll_type)) {
            roll.add_damage('6d8', Damage.LIGHTNING);

            // Triggering this also hits another random target
            const side_roll = new Roll(roll.character, RollType.MAGIC);
            side_roll.add_damage('6d8', Damage.LIGHTNING);
            side_roll.add_damage(roll.character.get_stat(Stat.MAGIC_DAMAGE), Damage.LIGHTNING);

            // Everything - items, persistent effects - should apply to the main and secondary roll here. I'm losing
            // the parameters for the secondary roll though, which might matter eventually. For now it's fine.
            if (!add_extras(roll.character, roll, RollTime.DEFAULT, parameters, '')) {
                return false;
            }

            do_roll(side_roll.character, 'Arc Lightning (Random Target)', side_roll, /*parameters=*/[], '');
        }

        return true;
    }

    function mirror_mage_concave_mirror(roll, roll_time, parameter, parameters) {
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
    function mirror_mage_alter_course(roll, parameter, parameters, crit_section) {
        const character = roll.character;
        const parameter_pieces = parameter.split(' ');
        const redirects = parse_int(parameter_pieces[1]);
        let source = 'self';
        if (parameter_pieces.length > 2) {
            source = parameter_pieces[2];
        }

        // Extract damages from the original roll and send them to chat to actually do the roll.
        let fake = '';
        const damage_types = Object.keys(roll.damages);
        for (let i = 0; i < damage_types.length;i++){
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
                for (let i = 0; i < damage_types.length; i++){
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
                // TODO: plumb the ability name here somehow, so we can put it in the title
                format_and_send_roll(character, 'Redirect: ' + redirect_num, redirected_roll, rolls_per_type,
                                     crit_section);
            }

            finalize_roll(character, roll, parameters);
        });

        return true;
    }


    function sniper_spotter(roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        const stacks = parse_int(parameter.split(' ')[1]);
        roll.add_multiplier(stacks * 0.25, Damage.ALL, 'self');
        return true;
    }


    function thief_stance(roll, roll_time, parameter) {
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


    function warper_opportunistic_predator(roll, roll_time, parameter) {
        if (roll_time !== RollTime.DEFAULT) {
            return true;
        }

        // If the parameter is present, we always add the bonus crit chance
        roll.add_stat_bonus(Stat.CRITICAL_HIT_CHANCE, 50);
        return true;
    }


    const arbitrary_parameters = {
        'damage': arbitrary_damage,
        'multiplier': arbitrary_multiplier,

        'assassinate': assassin_assassinate,
        'arc_lightning': lightning_duelist_arc_lightning_mark,
        'frostbite': cryomancer_frostbite,
        'juggernaut': juggernaut_what_doesnt_kill_you,
        'pursued': assassin_pursue_mark,
        'daggerspell_marked': daggerspell_marked,
        'draconic_pact': dragoncaller_draconic_pact,
        'empowered': daggerspell_ritual_dagger,
		'concave': mirror_mage_concave_mirror,
        'spotting': sniper_spotter,
        'stance': thief_stance,
        'tide': aquamancer_tide,
        'warper_cc': warper_opportunistic_predator,
    };


    const takeover_arbitrary_parameters = {
        'redirected': mirror_mage_alter_course,
    };


    function handle_normal_arbitrary_parameters(roll, roll_time, parameters) {
        assert_type(roll, 'Roll', 'handle_normal_arbitrary_parameters() roll');
        assert_starts_with(roll_time, 'roll_time', 'handle_normal_arbitrary_parameters() roll_time');
        assert_not_null(parameters, 'handle_normal_arbitrary_parameters() parameters');

        // Apply arbitrary parameter handlers, and return false if one fails
        for (let i = 0; i < parameters.length; i++) {
            const parameter = parameters[i];
            const parameter_keyword = parameter.split(' ')[0].split(':')[0];

            const keywords = Object.keys(arbitrary_parameters);
            for (let j = 0; j < keywords.length; j++) {
                const keyword = keywords[j];
                const func = arbitrary_parameters[keyword];

                if (parameter_keyword === keyword) {
                    if (!func(roll, roll_time, parameter, parameters, /*crit_section=*/'')) {
                        return false;
                    }
                }
            }
        }

        return true;
    }


    function handle_takeover_arbitrary_parameters(roll, roll_time, parameters, crit_section) {
        assert_type(roll, 'Roll', 'handle_takeover_arbitrary_parameters() roll');
        assert_starts_with(roll_time, 'roll_time', 'handle_takeover_arbitrary_parameters() roll_time');
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
                    if (func(roll, parameter, parameters, crit_section)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }


    // ################################################################################################################
    // Auto-attacks with an item


    function roll_item(msg) {
        const character = get_character(msg);
        if (character === null) {
            return;
        }

        const pieces = remove_empty(msg.content.split(' '));
        const item_slot = pieces[2];
        const options = pieces.slice(3).join(' ');
        const option_pieces = options.split('|');
        const item_name = option_pieces[0];
        let parameters = option_pieces[1].split(';');
        parameters = trim_all(parameters);
        parameters = remove_empty(parameters);

        // Find the item object for the name
        const item = Item.get_item(item_name, item_slot);
        if (item === null) {
            chat(character, 'Error, could not find item with name ' + item_name);
            return;
        }

        // There are no magic auto-attacks, so the type here is always physical.
        const roll = new Roll(character, RollType.PHYSICAL);
        item.base_damage.apply(roll);

        // We know the item being used explicitly, so don't use add_scale_damage(), which guesses
        item.damage_scaling.handler(character, roll);

        parameters.push('skip_applying_weapons');
        add_item_to_roll(item, roll, RollTime.DEFAULT);

        roll_crit(roll, parameters, function (crit_section) {
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

        roll_crit(roll, parameters, function (crit_section) {
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

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function aquamancer_tidal_wave(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('8d6', Damage.WATER);
        roll.add_effect('Leaves behind a field of shallow water that is difficult terrain for 1 hour');

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function aquamancer_draught_of_vigor(character, ability, parameters) {
        // NOTE: It's a "pick two of these effects" case
        chat(character, 'Not yet implemented');
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
        for (let i = 0; i < damage_types.length; i++) {
            const damage_type = get_damage_from_type(damage_types[i]);
            if (damage_type === null) {
                chat(character, 'Unrecognized damage type "%s"'.format(damage_types[i]));
                return;
            }
            damage_types.push(damage_type);
        }

        // This is a bit more complicated that you might expect in case the spell has the ability to crit.
        const dummy_roll = new Roll(character, RollType.MAGIC);
        roll_crit(dummy_roll, parameters, function (crit_section) {
            for (let i = 0; i < damage_types.length; i++) {
                const roll = new Roll(character, RollType.MAGIC);
                roll.add_damage('1d12', damage_types[i]);
                roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), damage_types[i]);

                roll.copy_damages(dummy_roll);
                roll.copy_multipliers(dummy_roll);
                roll.copy_effects(dummy_roll);

                if (!add_extras(character, dummy_roll, RollTime.POST_CRIT, parameters, crit_section)) {
                    return;
                }

                if (!roll.should_apply_crit) {
                    crit_section = '';
                }

                const rolls_per_type = roll.roll();
                format_and_send_roll(character, '%s (%s)'.format(ability.name, damage_types[i]), roll, rolls_per_type,
                                     crit_section);
            }

            finalize_roll(character, dummy_roll, parameters);
        });
    }


    function arcanist_magic_primer(character, ability, parameters) {
        // This should be applied before other effects that rely on knowing whether or not a roll was a crit
        add_persistent_effect(character, ability, parameters, character, Duration.SINGLE_USE(), Ordering(10),
                              RollType.MAGIC, RollTime.DEFAULT, 1, function (character, roll, parameters) {
            roll.add_multiplier(0.3, Damage.ALL, 'self');
            roll.should_apply_crit = true;
            return true;
        });

        print_ability_description(character, ability);
    }


    function assassin_backstab(character, ability, parameters) {
        const parameter = get_parameter('hidden', parameters);

        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('3d4', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);

        roll_crit(roll, parameters, function (crit_section) {
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
        roll_crit(dummy_roll, parameters, function (crit_section) {
            if (!add_extras(character, dummy_roll, RollTime.POST_CRIT, parameters, crit_section)) {
                return;
            }

            for (let i = 0; i < dice_divisions.length; i++) {
                const roll = new Roll(character, RollType.PHYSICAL);
                roll.add_damage('%sd4'.format(dice_divisions[i]), Damage.PHYSICAL);
                add_scale_damage(character, roll, parameters);
                roll.add_hidden_stat(HiddenStat.LETHALITY, 5 * dice_divisions[i]);

                roll.copy_damages(dummy_roll);
                roll.copy_multipliers(dummy_roll);
                roll.copy_effects(dummy_roll);

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
                roll.damages[dmg_type] = roll.damages[dmg_type].replace('d4', 'd6');
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

        roll_crit(roll, parameters, function (crit_section) {
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


    function assassin_focus(character, ability, parameters) {
        add_persistent_effect(character, ability, parameters, character, Duration.SINGLE_USE(), Ordering(),
                              RollType.ALL, RollTime.DEFAULT, 1, function (character, roll, parameters) {
            roll.add_stat_bonus(Stat.CRITICAL_HIT_CHANCE, 30);
            return true;
        });

        print_ability_description(character, ability);
    }


    function captain_inspirational_speech(character, ability, parameters) {
        const parameter = get_parameter('targets', parameters);
        if (parameter === null) {
            chat(character, '"targets" parameter, the list of affected players, is missing');
            return;
        }

        const target_names = parameter.split(',');
        const target_characters = [];
        for (let i = 0; i < target_names.length; i++) {
            const target_character = get_character_by_name(target_names[i].trim());
            if (target_character === null) {
                return;
            }
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

        roll_crit(roll, parameters, function (crit_section) {
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

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function champion_skull_bash(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('6d10', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);
        roll.add_effect('Stun target until end of their next turn');

        roll_crit(roll, parameters, function (crit_section) {
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

            roll_crit(roll, parameters, function (crit_section) {
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

            let button_section = '<a href="!barbs ability %s;%s;%s;keep ?{Rolls to keep:}">Pick Rolls to Keep</a>';
            // Colons don't play well in the href for buttons in chat, for some reason. We don't really need them for
            // parameters, though, so just take them out.
            const parameters_string = parameters.join(';').replace(/:/g, '');
            button_section = button_section.format(ability['class'], ability.name, parameters_string);

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

        roll_crit(roll, parameters, function(crit_section) {
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


        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function cryomancer_glacial_crash(character, ability, parameters) {
        const roll_1 = new Roll(character, RollType.MAGIC);
        roll_1.add_damage('8d8', Damage.ICE);
        roll_1.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.ICE);
        roll_1.add_effect('Frozen');
        roll_crit(roll_1, parameters, function (crit_section) {
            do_roll(character, '%s (5 ft)'.format(ability.name), roll_1, parameters, crit_section, /*do_finalize=*/false);
        });

        const roll_2 = new Roll(character, RollType.MAGIC);
        roll_2.add_damage('6d8', Damage.ICE);
        roll_2.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.ICE);
        roll_2.add_effect('Slowed');
        roll_crit(roll_2, parameters, function (crit_section) {
            do_roll(character, '%s (10 ft)'.format(ability.name), roll_2, parameters, crit_section, /*do_finalize=*/false);
        });

        const roll_3 = new Roll(character, RollType.MAGIC);
        roll_3.add_damage('4d8', Damage.ICE);
        roll_3.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.ICE);
        roll_crit(roll_3, parameters, function (crit_section) {
            do_roll(character, '%s (15 ft)'.format(ability.name), roll_3, parameters, crit_section, /*do_finalize=*/true);
        });
    }


    function cryomancer_ice_spear(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('6d8', Damage.ICE);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.ICE);
        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function daggerspell_fadeaway_slice(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('4d4', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function daggerspell_exposing_tear(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('8d4', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);

        roll_crit(roll, parameters, function (crit_section) {
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


    function dynamancer_spark_bolt(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('4d12', Damage.LIGHTNING);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.LIGHTNING);
        roll.add_effect('50% chance to deal an additional d12 lightning magic damage');
        roll.add_effect('30% to inflict Paralyze for 1 minute');
        roll.add_effect('20% to inflict Stunned until the beginning of your next turn');
        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function destroyer_challenge(character, ability, parameters) {
        const num_targets = get_parameter('targets', parameters);
        if (num_targets === null) {
            chat(character, '"targets" parameter is missing');
            return;
        }

        add_persistent_effect(character, ability, parameters, character, Duration.ONE_MINUTE(), Ordering(),
                              RollType.ALL, RollTime.DEFAULT, 1, function (char, roll, parameters) {
            roll.add_stat_multiplier(Stat.AC, 0.1 * parse_int(num_targets));
            roll.add_stat_bonus(Stat.MAGIC_RESIST, 10 * parse_int(num_targets));
            return true;
        });

        print_ability_description(character, ability);
    }


    function destroyer_rampage(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('6d10', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);
        roll.add_effect('Knock targets prone');

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function destroyer_slam(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('4d10', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);
        roll.add_effect('Inflict Physical Vulnerability equal to 10% + X%, where X is the target\'s current Physical Vulnerability');

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function dragoncaller_summon_bronze_dragon(character, ability, parameters) {
        const short_name = 'Bronze Dragon';

        const major_action = get_parameter('major', parameters);
        if (major_action !== null) {
            // The summon acts as a separate character, so we make a fake one to be able to do rolls with. The critical
            // hit chance stat must at least be set for this to work properly.
            const dragon = new Character({'id': 'bronze_dragon'}, character.who);
            dragon.stats[Stat.CRITICAL_HIT_CHANCE.name] = 0;

            if (major_action === 'breath') {
                const roll = new Roll(dragon, RollType.MAGIC);
                roll.add_damage('10d12', Damage.LIGHTNING);

                roll_crit(roll, parameters, function (crit_section) {
                    do_roll(dragon, ability, roll, parameters, crit_section);
                });

            } else if (major_action === 'claw') {
                const roll = new Roll(dragon, RollType.PHYSICAL);
                roll.add_damage('10d10', Damage.PHYSICAL);

                roll_crit(roll, parameters, function (crit_section) {
                    do_roll(dragon, ability, roll, parameters, crit_section);
                });

            } else {
                chat(character, 'Unexpected option for parameter "major", expected {claw/breath}')
            }
        }

        const minor_action = get_parameter('minor', parameters);
        if (minor_action !== null) {
            const target_names = minor_action.split(',');
            const target_characters = [];
            for (let i = 0; i < target_names.length; i++) {
                const target_character = get_character_by_name(target_names[i].trim());
                if (target_character === null) {
                    return;
                }
                target_characters.push(target_character);
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
        }
    }


    function dragoncaller_bronze_dragon_breath(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('6d12', Damage.LIGHTNING);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.LIGHTNING);

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
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
            add_persistent_effect(character, ability, parameters, target_character, Duration.ONE_MINUTE(), Ordering(),
                                  RollType.PHYSICAL, RollTime.DEFAULT, 1, function (character, roll, parameters) {
                roll.add_damage('4d10', Damage.PHYSICAL);
                return true;
            });

        } else if (choice === 'second') {
            add_persistent_effect(character, ability, parameters, target_character, Duration.ONE_MINUTE(), Ordering(),
                                  RollType.PHYSICAL, RollTime.DEFAULT, 1, function (character, roll, parameters) {
                roll.add_multiplier(-0.5, Damage.PHYSICAL, 'self');
                return true;
            });

        } else {
            chat(character, 'Unknown value for "choice" parameter "%s"'.format(choice));
        }

        print_ability_description(character, ability);
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
            const conditions_list = get_parameter('conditions', parameters);
            if (conditions_list === null) {
                chat(character, '"conditions" parameter is missing');
            }

            const conditions = conditions_list.split(',');
            if (conditions.length !== 2) {
                chat(character, 'Select 2 conditions');
                return;
            }

            add_persistent_effect(character, ability, parameters, character, Duration.INFINITE(), Ordering(),
                                  RollType.MAGIC, RollTime.DEFAULT, 1, function (char, roll, parameters) {
                roll.add_damage('6d8', Damage.ICE);
                roll.add_damage('6d8', Damage.DARK);

                for (let i = 0; i < 2; i++) {
                    if (conditions[i].toLowerCase().includes('curse')){
                        roll.add_effect(conditions[i].trim() + ': [[1d100]] [[1d100]]');
                    } else {
                        roll.add_effect(conditions[i].trim() + ': [[1d100]]');
                    }
                }

                return true;
            });
            chat(character,'KB absorbed');

        } else {
            chat(character, 'Unrecognized spell "%s"'.format(chosen_spell));
        }
    }


    function juggernaut_wild_swing(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('5d10', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);
        roll.add_hidden_stat(HiddenStat.LIFESTEAL, 30);
        roll.add_effect('+30% lifesteal if your health is below 30%');

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
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
                              RollType.ALL, RollTime.DEFAULT, 1, function (character, roll, parameters) {
            roll.add_stat_bonus(Stat.MOVEMENT_SPEED, 30);

            if (RollType.is_physical(roll.roll_type)) {
                roll.add_hidden_stat(HiddenStat.REACH, 5);
            }
            roll.add_hidden_stat(HiddenStat.AC_PENETRATION, 50);

            const parameter = get_parameter('low_health', parameters);
            if (parameter !== null) {
                roll.add_multiplier(1, Damage.PHYSICAL, 'self');
            }

            return true;
        });

        print_ability_description(character, ability);
    }


    function ki_monk_spirit_punch(character, ability, parameters) {
        const monk_mastery = character.get_monk_mastery();

        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('4d%s'.format(monk_mastery), Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);
        roll.add_effect('Gain Ki equal to rolled value');

        const spent_ki = get_parameter('ki', parameters);
        if (spent_ki !== null) {
            roll.add_damage('4d%s'.format(monk_mastery), Damage.PSYCHIC);
        }

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function ki_monk_drain_punch(character, ability, parameters) {
        const monk_mastery = character.get_monk_mastery();

        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('5d%s'.format(monk_mastery), Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);
        roll.add_effect('Gain Ki equal to half the rolled value');

        const spent_ki = get_parameter('ki', parameters);
        if (spent_ki !== null) {
            roll.add_damage('5d%s'.format(monk_mastery), Damage.PSYCHIC);
        }

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function ki_monk_spirit_shotgun(character, ability, parameters) {
        const monk_mastery = character.get_monk_mastery();

        const roll = new Roll(character, RollType.PSYCHIC);
        roll.add_damage('5d%s'.format(monk_mastery), Damage.PSYCHIC);

        const spent_ki = get_parameter('ki', parameters);
        if (spent_ki !== null) {
            roll.add_multiplier(0.5, Damage.ALL, 'self');
            roll.add_effect('All hit targets are knocked back 20 ft');
        }

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function lightning_duelist_arc_lightning(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('6d8', Damage.LIGHTNING);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.LIGHTNING);

        roll_crit(roll, parameters, function (crit_section) {
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

                roll_crit(roll, parameters, function (crit_section) {
                    do_roll(character, ability, roll, parameters, crit_section);
                });
            }
        });
    }


    function lightning_duelist_shock_tendrils(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('3d8', Damage.LIGHTNING);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.LIGHTNING);

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function lightning_duelist_shocking_parry(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('5d8', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);
        roll.add_effect('On hit, you have a 50% chance of recovering half the stamina cost');

        roll_crit(roll, parameters, function (crit_section) {
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

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function martial_artist_choke_hold(character, ability, parameters) {
        const monk_mastery = character.get_monk_mastery();

        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('4d%s'.format(monk_mastery), Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function martial_artist_flying_kick(character, ability, parameters) {
        const monk_mastery = character.get_monk_mastery();

        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('6d%s'.format(monk_mastery), Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function mistguard_deep_snow(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('7d8', Damage.ICE);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.ICE);

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }

    function mirror_mage_scatter_shards(character, ability, parameters) {
        for (let i = 0; i < 3; i++) {
            let roll = new Roll(character, RollType.MAGIC);
            roll.add_damage('5d8', Damage.ICE);
            roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.ICE);
            roll_crit(roll, parameters, function (crit_section) {
                do_roll(character, ability, roll, parameters, crit_section);
            });
        }
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
            roll.add_effect('1 curse')
        } else if (delay === 'true') {
            roll.add_damage('6d10', Damage.DARK);
            roll.add_effect('2 curses')
        } else {
            chat(character, 'Incorrect option for "delay" parameter, should be "delay {true/false}"')
        }

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function pyromancer_banefire(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('6d12', Damage.FIRE);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.FIRE);
        roll.add_effect('Unblockable/uncounterable if this is your second fire spell this turn');
        roll.add_effect('-5% Fire MR');
        roll.add_effect('+5% Fire Vulnerability');

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function pyromancer_magma_spray(character, ability, parameters) {
        const roll = new Roll(character, RollType.MAGIC);
        roll.add_damage('4d12', Damage.FIRE);
        roll.add_damage(character.get_stat(Stat.MAGIC_DAMAGE), Damage.FIRE);
        roll.add_effect('Hit enemies 15 ft from you are inflicted with Burn X, where X is equal to the amount of damage rolled');
        roll.add_effect('-5% Fire MR');
        roll.add_effect('+5% Fire Vulnerability');

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function sentinel_crossguard_guillotine(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('4d10', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);

        const stacks = get_parameter(parameters, 'stacks');
        if (stacks !== null) {
            roll.add_damage('%sd10'.format(stacks), Damage.PHYSICAL);
            roll.add_effect('Hits enemies diagonally to your target');
        }

        roll_crit(roll, parameters, function (crit_section) {
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
                              RollType.PHYSICAL, RollTime.POST_CRIT, 1, function (character, roll, parameters) {
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

            // Because this effect has an ordering of "99", the distance shooter rolls will be sent after the
            // base roll. Distance shooter damage will always be calculated after the base roll so that it can cope
            // with multiple distances. Multipliers from the original roll are copied into a new roll per given
            // distance.
            for (let i = 0; i < distances.length; i++) {
                const distance_roll = new Roll(character, RollType.PHYSICAL);
                distance_roll.add_damage(2 * parse_int(distances[i]) / 5, Damage.PHYSICAL);
                distance_roll.copy_multipliers(roll);
                const rolls_per_type = distance_roll.roll();
                format_and_send_roll(character, '%s (%s ft)'.format(ability.name, distances[i]), distance_roll,
                    rolls_per_type, '');
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

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function sniper_piercing_shot(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('5d8', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);

        roll_crit(roll, parameters, function (crit_section) {
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

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function sniper_swift_shot(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('3d8', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);
        roll.add_effect('Stun until end of turn');

        roll_crit(roll, parameters, function (crit_section) {
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

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(character, ability, roll, parameters, crit_section);
        });
    }


    function soldier_double_time(character, ability, parameters) {
        add_persistent_effect(character, ability, parameters, character, Duration.ONE_MINUTE(), Ordering(),
                              RollType.ALL, RollTime.DEFAULT, 1, function (char, roll, parameters) {
            roll.add_stat_bonus(Stat.MOVEMENT_SPEED, 20);
        });

        print_ability_description(character, ability);
    }


    function soldier_fleetfoot_blade(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('4d10', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);

        roll_crit(roll, parameters, function (crit_section) {
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

        roll_crit(roll, parameters, function (crit_section) {
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
        roll.add_effect('Poison [[2d6]]');

        roll_crit(roll, parameters, function (crit_section) {
            do_roll(summon, ability, roll, parameters, crit_section);
        });
    }


    function symbiote_empower_soul(character, ability, parameters) {
        const target_name = get_parameter('target', parameters);
        if (target_name === null) {
            chat(character, '"target" parameter is missing');
            return;
        }

        const target_character = get_character_by_name(target_name);
        if (target_character === null) {
            return;
        }

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

        const target_name = get_parameter('target', parameters);
        if (target_name === null) {
            chat(character, '"target" parameter is missing');
            return;
        }

        const target_character = get_character_by_name(target_name);
        if (target_character === null) {
            return;
        }

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
        const target_name = get_parameter('target', parameters);
        if (target_name === null) {
            chat(character, '"target" parameter is missing');
            return;
        }

        const target_character = get_character_by_name(target_name);
        if (target_character === null) {
            return;
        }

        add_persistent_effect(character, ability, parameters, target_character, Duration.ONE_MINUTE(), Ordering(),
                              RollType.ALL, RollTime.DEFAULT, 1, function (char, roll, parameters) {
            roll.add_stat_bonus(Stat.EVASION, 40);
            roll.add_stat_multiplier(Stat.AC, 0.4);
            return true;
        });

        print_ability_description(character, ability);
    }


    function symbiote_strengthen_mind(character, ability, parameters) {
        const target_name = get_parameter('target', parameters);
        if (target_name === null) {
            chat(character, '"target" parameter is missing');
            return;
        }

        const target_character = get_character_by_name(target_name);
        if (target_character === null) {
            return;
        }

        add_persistent_effect(character, ability, parameters, target_character, Duration.ONE_HOUR(), Ordering(),
                              RollType.ALL, RollTime.DEFAULT, 1, function (char, roll, parameters) {
            roll.add_skill_bonus(Skill.ALL, 30);
            return true;
        });

        print_ability_description(character, ability);
    }


    function symbiote_strengthen_soul(character, ability, parameters) {
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

        roll_crit(roll, parameters, function (crit_section) {
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


    function warrior_charge(character, ability, parameters) {
        const parameter = get_parameter('targets', parameters);
        if (parameter === null) {
            chat(character, '"targets" parameter, the list of affected players, is missing');
            return;
        }

        const target_names = parameter.split(',');
        const target_characters = [];
        for (let i = 0; i < target_names.length; i++) {
            const target_character = get_character_by_name(target_names[i].trim());
            if (target_character === null) {
                return;
            }
            target_characters.push(target_character);
        }

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

            roll_crit(roll, parameters, function (crit_section) {
                do_roll(character, ability, roll, parameters, crit_section);
            });
        }

        if (choice === 'second' || choice === 'both') {
            const roll = new Roll(character, RollType.PHYSICAL);
            roll.add_damage('3d10', Damage.PHYSICAL);
            add_scale_damage(character, roll, parameters);

            roll_crit(roll, parameters, function (crit_section) {
                do_roll(character, ability, roll, parameters, crit_section);
            });
        }
    }


    function warlord_hookshot(character, ability, parameters) {
        const roll = new Roll(character, RollType.PHYSICAL);
        roll.add_damage('5d10', Damage.PHYSICAL);
        add_scale_damage(character, roll, parameters);
        roll.add_effect('Pull target 20 ft towards you');

        roll_crit(roll, parameters, function (crit_section) {
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


    // TODO there is another half of this passive
    function warrior_warleader(character, ability, parameters) {
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
        add_persistent_effect(character, ability, parameters, target_character, Duration.SINGLE_USE(), Ordering(),
                              RollType.ALL, RollTime.DEFAULT, 1, function (char, roll, parameters) {
            roll.add_multiplier(0.25, Damage.ALL, source);
            return true;
        });

        print_ability_description(character, ability);
    }


    const abilities_processors = {
        'Air Duelist': {
            'Arc of Air': air_duelist_arc_of_air,
            'Cutting Winds': air_duelist_cutting_winds,
            'Mistral Bow': air_duelist_mistral_bow,
        },
        'Aquamancer': {
            'Baptize': aquamancer_baptize,
            'Tidal Wave': aquamancer_tidal_wave,
            'Draught of Vigor': aquamancer_draught_of_vigor,
        },
        'Arcanist': {
            'Magic Dart': arcanist_magic_dart,
            'Magic Primer': arcanist_magic_primer,
        },
        'Assassin': {
            'Backstab': assassin_backstab,
            'Focus': assassin_focus,
            'Haste': print_ability_description,
            'Massacre': assassin_massacre,
            'Pursue': print_ability_description,
            'Sharpen': assassin_sharpen,
            'Skyfall': assassin_skyfall,
            'Vanish': assassin_vanish,
        },
        'Captain': {
            'Inspirational Speech': captain_inspirational_speech,
        },
        'Champion': {
            'Disarming Blow': champion_disarming_blow,
            'Master of Arms': champion_master_of_arms,
            'Piercing Blow': champion_piercing_blow,
            'Skull Bash': champion_skull_bash,
            'Slice and Dice': champion_slice_and_dice,
        },
        'Conjurer': {
            'Web': print_ability_description,
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
        'Daggerspell': {
            'Fadeaway Slice': daggerspell_fadeaway_slice,
            'Exposing Tear': daggerspell_exposing_tear,
            'Hidden Blade': daggerspell_hidden_blade,
        },
        'Demon Hunter': {
            // TODO May want a "marked" parameter for Essence Scatter
            'Essence Scatter': print_ability_description,
        },
        'Destroyer': {
            'Challenge': destroyer_challenge,
            'Rampage': destroyer_rampage,
            'Slam': destroyer_slam,
        },
        'Dragoncaller': {
            'Summon Bronze Dragon': dragoncaller_summon_bronze_dragon,
            'Bronze Dragon Breath': dragoncaller_bronze_dragon_breath,
        },
        'Dynamancer': {
            'Spark Bolt': dynamancer_spark_bolt,
        },
        'Enchanter': {
            'Mint Coinage': print_ability_description,
            'Modify Weapon': enchanter_modify_weapon,
            'Reconstruct Barrier': print_ability_description,
        },
        'Evangelist': {
            'Magia Erebea': evangelist_magia_erebea,
        },
        'Juggernaut': {
            'Wild Swing': juggernaut_wild_swing,
            'Hostility': juggernaut_hostility,
            'Tachycardia': juggernaut_tachycardia,
        },
        'Ki Monk': {
            'Spirit Punch': ki_monk_spirit_punch,
            'Drain Punch': ki_monk_drain_punch,
            'Spirit Shotgun': ki_monk_spirit_shotgun,
        },
        'Lightning Duelist': {
            'Arc Lightning': lightning_duelist_arc_lightning,
            'Blade Storm': lightning_duelist_blade_storm,
            'Shock Tendrils': lightning_duelist_shock_tendrils,
            'Shocking Parry': lightning_duelist_shocking_parry,
            'Sword of Lightning': lightning_duelist_sword_of_lightning,
        },
        'Luxomancer': {
            'Light Touch': luxomancer_light_touch,
        },
        'Martial Artist': {
            'Focus Energy': print_ability_description,
            'Choke Hold': martial_artist_choke_hold,
            'Flying Kick': martial_artist_flying_kick,
        },
        'Mirror Mage': {
            'Scatter Shards': mirror_mage_scatter_shards,
        },
        'Mistguard': {
            'Deep Snow': mistguard_deep_snow,
            'Morning Frost': print_ability_description,
        },
        'Noxomancer': {
            'Darkbomb': noxomancer_darkbomb,
            'Defile': print_ability_description,  // TODO this maybe could do more
            'Siphon Soul': print_ability_description,
        },
        'Pyromancer': {
            'Banefire': pyromancer_banefire,
            'Magma Spray': pyromancer_magma_spray,
            'Pyroblast': print_ability_description,
        },
        'Sentinel': {
            'Crossguard Guillotine': sentinel_crossguard_guillotine,
            'Parallel Shields': print_ability_description,
        },
        'Sniper': {
            'Analytical Shooter': sniper_analytical_shooter,
            'Distance Shooter': sniper_distance_shooter,
            'Kill Shot': sniper_kill_shot,
            'Piercing Shot': sniper_piercing_shot,
            'Precision Shooter': sniper_precision_shooter,
            'Shrapnel Shot': sniper_shrapnel_shot,
            'Swift Shot': sniper_swift_shot,
            'Swift Sprint': print_ability_description,
        },
        'Soldier': {
            'Biding Blade': soldier_biding_blade,
            'Dodge Roll': print_ability_description,
            'Double Time': soldier_double_time,
            'Fleetfoot Blade': soldier_fleetfoot_blade,
            'Intercept': print_ability_description,
            'Steadfast Strikes': soldier_steadfast_strikes,
        },
        'Summoner': {
            'Summon Ascarion Beast': summoner_summon_ascarion_beast,
            'Summon Unseen Servant': print_ability_description,
            'Summon Estian Wayfinder': print_ability_description,
            'Summon Vilyrian Spellmaster': print_ability_description,
            'Summon Watcher': print_ability_description,
        },
        'Symbiote': {
            'Empower Soul': symbiote_empower_soul,
            'Power Spike': symbiote_power_spike,
            'Strengthen Body': symbiote_strengthen_body,
            'Strengthen Mind': symbiote_strengthen_mind,
            'Strengthen Soul': symbiote_strengthen_soul,
        },
        'Thief': {
            'Charm and Disarm': print_ability_description,
            'Cloak and Dagger': thief_cloak_and_dagger,
            'Infiltrate': print_ability_description,
            'Phantom Thief': thief_phantom_thief,
            'Purloin Powers': print_ability_description,
            'Snatch and Grab': thief_snatch_and_grab,
        },
        'Voidwalker': {
            'Dimension Door': print_ability_description,
            'Blacklands': print_ability_description,
        },
        'Warlord': {
            'Hookshot': warlord_hookshot,
            'Weapon Swap: Roll': print_ability_description,
        },
        'Warrior': {
            '"Charge!"': warrior_charge,
            'Cut Down': warrior_cut_down,
            '"Fight Me!"': print_ability_description,  // TODO this maybe could do more
            'Reinforce Armor': warrior_reinforce_armor,  // TODO this could do more
            'Shields Up': print_ability_description,
            'Warleader': warrior_warleader,
        }
    };


    function process_ability(msg) {
        const character = get_character(msg);
        if (character === null) {
            return;
        }

        const pieces = msg.content.split(' ');
        const options = pieces.slice(2).join(' ');
        const option_pieces = options.split(';');
        const class_name = option_pieces[0];
        const ability_name = option_pieces[1];
        let parameters = option_pieces.slice(2);
        parameters = trim_all(parameters);
        parameters = remove_empty(parameters);

        // Verify that we have a processor for this class + ability combo
        if (!(class_name in abilities_processors)) {
            chat(msg, 'Unknown class %s'.format(class_name));
            return;
        }

        if (!(ability_name in abilities_processors[class_name])) {
            chat(msg, 'Unknown ability %s'.format(ability_name));
            return;
        }

        const processor = abilities_processors[class_name][ability_name];

        // Get the ability or passive info from master class list
        if (!(class_name in classes)) {
            chat(msg, 'Mismatched class %s, wrong spelling?'.format(class_name));
            return;
        }

        const clazz = classes[class_name];
        const class_abilities = clazz['abilities'];
        const class_passive_name = Object.keys(clazz.passive)[0];

        if (ability_name in class_abilities) {
            processor(character, class_abilities[ability_name], parameters);
            return;
        }

        if (ability_name === class_passive_name) {
            const ability = {
                'name': class_passive_name,
                'description': [clazz['passive'][class_passive_name]],
                'class': clazz['name'],
            };

            processor(character, ability, parameters);
            return;
        }

        chat(msg, 'Mismatched ability %s, wrong spelling?'.format(ability_name));
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

        const current_character = get_character_by_name(current_name, /*ignore_failure=*/true);
        if (current_character === null) {
            return;
        }

        // Decrement durations for effects cast by the character who is currently up, and end any at zero.
        for (let i = 0; i < persistent_effects.length; i++) {
            assert_type(persistent_effects[i].duration, 'Duration', 'do_turn_order_change() start duration');

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

            const previous_character = get_character_by_name(previous_name, /*ignore_failure=*/true);
            if (previous_character === null) {
                return;
            }

            for (let i = 0; i < persistent_effects.length; i++) {
                assert_type(persistent_effects[i].duration, 'Duration', 'do_turn_order_change() end duration');

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
    // Basic setup and message handling


    const subcommand_handlers = {
        'item': roll_item,
        'stat': roll_stat,
        'skill': roll_skill,
        'initiative': roll_initiative,
        'concentration': roll_concentration,
        'ability': process_ability,
        'list_effects': list_persistent_effects,
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

            LOG.info('API call: who=%s, message="%s"'.format(msg.who, msg.content));

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
