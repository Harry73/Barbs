import json
import os
import sys

from src.website.common import get_component, get_link_skill_req, MONTHS, read_json_file


CURRENT_PATH = os.path.dirname(os.path.realpath(sys.argv[0]))
RULEBOOK_PATH = os.path.join(CURRENT_PATH, 'rulebook')


def check_holidays(holidays_per_month):
    short_months = [month.split(' ')[0] for month in MONTHS]

    for month, holidays in holidays_per_month.items():
        if month not in short_months:
            raise Exception('Month %s in holidays.json file not in master list, %s' % (month, short_months))

        for day, holiday in holidays.items():
            try:
                int(day)
            except ValueError:
                raise Exception('Invalid day %s in month %s, expected an integer' % (day, month))


def check_for_duplicates(components, log):
    def _stringify(item):
        if item['type'] in ['branch', 'ability']:
            return '%s "%s" from class "%s"' % (item['type'], item['name'], item['class'])
        else:
            return '%s "%s"' % (item['type'], item['name'])

    seen = dict()
    for component in components:
        if component['name'] in seen:
            log('Warning: %s has same name as %s' % (_stringify(component), _stringify(seen[component['name']])))
        seen[component['name']] = component


def check_for_branch_duplicates(classes, log):
    seen = dict()
    for clazz in classes:
        if 'branches' not in clazz:
            continue

        for branch_name in clazz['branches']:
            if branch_name in seen:
                log('Warning: branch "%s" from class "%s" has same name as branch "%s" from class "%s"'
                    % (branch_name, clazz['name'], branch_name, seen[branch_name]))
            seen[branch_name] = clazz['name']


def check_class_fields(classes):
    base_fields = {
        'type': str,
        'preview': str,
        'num_requirements': int,
        'requirements': list,
        'all_reqs_known': bool,
    }
    full_fields = {
        'description': str,
        'branches': dict,
        'passive': dict,
        'abilities': list,
    }
    api_fields = {
        'description': str,
        'examples': list,
    }

    for clazz in classes:
        if 'name' not in clazz:
            raise Exception('Missing "name" field in class, class=%s' % clazz)

        for field, json_type in base_fields.items():
            if field not in clazz:
                raise Exception('Expected field "%s" to be present in class "%s"' % (field, clazz['name']))
            if not isinstance(clazz[field], json_type):
                raise Exception('Expected field "%s" to be type "%s" in class "%s"'
                                % (field, str(json_type), clazz['name']))

        if 'flavor_text' in clazz:
            for field, json_type in full_fields.items():
                if field not in clazz:
                    raise Exception('Expected field "%s" to be present in full class "%s"' % (field, clazz['name']))
                if not isinstance(clazz[field], json_type):
                    raise Exception('Expected field "%s" to be type "%s" in full class "%s"'
                                    % (field, str(json_type), clazz['name']))

        if 'api' in clazz:
            if not isinstance(clazz['api'], dict):
                raise Exception('Expected field "api" to be type "dict" in class "%s"' % clazz['name'])

            for field, json_type in api_fields.items():
                if field not in clazz['api']:
                    raise Exception('Expected field "api[%s]" to be present in class "%s" api'
                                    % (field, clazz['name']))
                if not isinstance(clazz['api'][field], json_type):
                    raise Exception('Expected field "api[%s]" to be type "%s" in class "%s"'
                                    % (field, str(json_type), clazz['name']))


def check_ability_fields(abilities):
    base_fields = {
        'type': str,
        'class': str,
        'branch': str,
        'tier': int,
        'action': str,
        'cost': str,
        'range': str,
        'duration': str,
        'description': list,
        'tags': list,
    }
    api_fields = {
        'description': str,
        'examples': list,
    }

    for ability in abilities:
        if 'name' not in ability:
            raise Exception('Missing "name" field in ability, ability=%s' % ability)

        for field, json_type in base_fields.items():
            if field not in ability:
                raise Exception('Expected field "%s" to be present in ability "%s"' % (field, ability['name']))
            if not isinstance(ability[field], json_type):
                raise Exception('Expected field "%s" to be type "%s" in ability "%s"'
                                % (field, str(json_type), ability['name']))

        if 'api' in ability:
            if not isinstance(ability['api'], dict):
                raise Exception('Expected field "api" to be type "dict" in ability "%s"' % ability['name'])

            for field, json_type in api_fields.items():
                if field not in ability['api']:
                    raise Exception('Expected field "api[%s]" to be present in ability "%s" api'
                                    % (field, ability['name']))
                if not isinstance(ability['api'][field], json_type):
                    raise Exception('Expected field "api[%s]" to be type "%s" in ability "%s"'
                                    % (field, str(json_type), ability['name']))


def check_skill_attribute_links(skills, attributes):
    for skill in skills:
        try:
            get_component(skill['attribute'], attributes)
        except KeyError:
            raise Exception('Attribute "%s" for skill "%s" not found in attributes.json'
                            % (skill['attribute'], skill['name']))


def check_class_skill_requirements(classes, skills, log):
    for clazz in classes:
        for skill_req in clazz['requirements']:
            strings_to_check = skill_req.split(' or ')

            for string_to_check in strings_to_check:
                # We should get link text back for each skill req
                if string_to_check == get_link_skill_req(string_to_check, skills):
                    log('Warning: Failed to find corresponding skill for class "%s" full description requirement "%s"'
                        % (clazz['name'], string_to_check))

                # Each skill req should have an associated rank
                if 'Rank' not in string_to_check:
                    log('Warning: Missing keyword "Rank" in skill requirement "%s" for class "%s" full description'
                        % (string_to_check, clazz['name']))


def check_class_ability_links(classes, abilities):
    for ability in abilities:
        try:
            get_component(ability['class'], classes)
        except KeyError:
            raise Exception('Class "%s" for ability "%s" not found in classes.json'
                            % (ability['class'], ability['name']))

    for clazz in classes:
        if 'abilities' not in clazz:
            continue

        for ability_name in clazz['abilities']:
            try:
                ability = get_component(ability_name, abilities, lambda a: a['class'] == clazz['name'])
            except KeyError:
                raise Exception('Ability "%s" in class "%s" not found in abilities.json'
                                % (ability_name, clazz['name']))

            if ability['branch'] not in clazz['branches']:
                raise Exception('Ability "%s" in class "%s" has branch "%s" which is not listed in the class'
                                % (ability_name, ability['class'], ability['branch']))


def validate(log):
    log('Validating rulebook files')

    try:
        abilities = read_json_file(os.path.join(RULEBOOK_PATH, 'abilities.json'))
    except json.JSONDecodeError as e:
        raise Exception('Failed to parse abilities.json file, %s' % str(e))

    try:
        attributes = read_json_file(os.path.join(RULEBOOK_PATH, 'attributes.json'))
    except json.JSONDecodeError as e:
        raise Exception('Failed to parse attributes.json file, %s' % str(e))

    try:
        buffs = read_json_file(os.path.join(RULEBOOK_PATH, 'buffs.json'))
    except json.JSONDecodeError as e:
        raise Exception('Failed to parse buffs.json file, %s' % str(e))

    try:
        classes = read_json_file(os.path.join(RULEBOOK_PATH, 'classes.json'))
    except json.JSONDecodeError as e:
        raise Exception('Failed to parse classes.json file, %s' % str(e))

    try:
        conditions = read_json_file(os.path.join(RULEBOOK_PATH, 'conditions.json'))
    except json.JSONDecodeError as e:
        raise Exception('Failed to parse conditions.json file, %s' % str(e))

    try:
        races = read_json_file(os.path.join(RULEBOOK_PATH, 'races.json'))
    except json.JSONDecodeError as e:
        raise Exception('Failed to parse races.json file, %s' % str(e))

    try:
        skills = read_json_file(os.path.join(RULEBOOK_PATH, 'skills.json'))
    except json.JSONDecodeError as e:
        raise Exception('Failed to parse skills.json file, %s' % str(e))

    try:
        holidays_per_month = read_json_file(os.path.join(RULEBOOK_PATH, 'holidays.json'))
    except json.JSONDecodeError as e:
        raise Exception('Failed to parse holidays.json file, %s' % str(e))

    check_holidays(holidays_per_month)
    check_for_duplicates(abilities + attributes + buffs + classes + conditions + races + skills, log)
    check_for_branch_duplicates(classes, log)
    check_class_fields(classes)
    check_ability_fields(abilities)
    check_skill_attribute_links(skills, attributes)
    check_class_skill_requirements(classes, skills, log)
    check_class_ability_links(classes, abilities)

    # Organize abilities by class, branch, and tier
    abilities.sort(key=lambda a: (a['class'], a['branch'], a['tier']))

    lists = {
        'abilities': abilities,
        'attributes': attributes,
        'buffs': buffs,
        'classes': classes,
        'conditions': conditions,
        'races': races,
        'skills': skills,
    }

    # Dump what we read back to their files to sort items and fix formatting
    for file_name, items in lists.items():
        with open(os.path.join(RULEBOOK_PATH, '%s.json' % file_name), 'w') as f:
            json.dump(items, f, indent=4)

    log('Validated rulebook files')
