import json
import os

from src.website.common import get_component, read_json_file, get_link_skill_req


def check_for_duplicates(components, log):
    def _stringify(item):
        if item['type'] in ['branch', 'ability']:
            return '%s "%s" from class "%s"' % (item['type'], item['name'], item['class'])
        else:
            return '%s "%s"' % (item['type'], item['name'])

    seen = dict()
    for component in components:
        if component['name'] in seen:
            log('%s has same name as %s' % (_stringify(component), _stringify(seen[component['name']])))
        seen[component['name']] = component


def check_skill_attribute_links(skills, attributes, log):
    for skill in skills:
        try:
            get_component(skill['attribute'], attributes)
        except KeyError:
            raise Exception('Attribute "%s" for skill "%s" not found in attributes.json'
                            % (skill['attribute'], skill['name']))


def check_class_skill_requirements(classes, skills, log):
    for clazz in classes:
        for skill_req in clazz['known_requirements']:
            if skill_req == get_link_skill_req(skill_req, skills):
                log('Failed to find corresponding skill for class "%s"'
                    ' hint requirement "%s"' % (clazz['name'], skill_req))

        if 'requirements' not in clazz:
            continue

        for skill_req in clazz['requirements']:
            if skill_req == get_link_skill_req(skill_req, skills):
                log('Failed to find corresponding skill for class "%s" '
                    'full description requirement "%s"' % (clazz['name'], skill_req))


def check_class_branch_links(classes, branches):
    for branch in branches:
        try:
            get_component(branch['class'], classes)
        except KeyError:
            raise Exception('Class "%s" for branch "%s" not found in classes.json' % (branch['class'], branch['name']))

    for clazz in classes:
        if 'branches' not in clazz:
            continue

        for branch_name in clazz['branches']:
            try:
                get_component(branch_name, branches, lambda b: b['class'] == clazz['name'])
            except KeyError:
                raise Exception('Branch "%s" in class "%s" not found in branch.json' % (branch_name, clazz['name']))


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
                get_component(ability_name, abilities, lambda a: a['class'] == clazz['name'])
            except KeyError:
                raise Exception('Ability "%s" in class "%s" not found in abilities.json' % (ability_name, clazz['name']))


def check_branch_ability_links(branches, abilities):
    for ability in abilities:
        try:
            get_component(ability['branch'], branches)
        except KeyError:
            raise Exception('Branch "%s" for ability "%s" not found in branches.json'
                            % (ability['branch'], ability['name']))

    for branch in branches:
        for ability_name in branch['abilities']:
            try:
                get_component(ability_name, abilities, lambda a: a['branch'] == branch['name'])
            except KeyError:
                raise Exception('Ability "%s" in branch "%s" not found in abilities.json'
                                % (ability_name, branch['name']))


def validate(log):
    log('Validating rulebook files')
    current_path = os.getcwd()
    rulebook_path = os.path.join(current_path, 'rulebook')

    try:
        abilities = read_json_file(os.path.join(rulebook_path, 'abilities.json'))
    except json.JSONDecodeError as e:
        raise Exception('Failed to parse abilities.json file, %s' % str(e))

    try:
        attributes = read_json_file(os.path.join(rulebook_path, 'attributes.json'))
    except json.JSONDecodeError as e:
        raise Exception('Failed to parse attributes.json file, %s' % str(e))

    try:
        branches = read_json_file(os.path.join(rulebook_path, 'branches.json'))
    except json.JSONDecodeError as e:
        raise Exception('Failed to parse branches.json file, %s' % str(e))

    try:
        buffs = read_json_file(os.path.join(rulebook_path, 'buffs.json'))
    except json.JSONDecodeError as e:
        raise Exception('Failed to parse buffs.json file, %s' % str(e))

    try:
        classes = read_json_file(os.path.join(rulebook_path, 'classes.json'))
    except json.JSONDecodeError as e:
        raise Exception('Failed to parse classes.json file, %s' % str(e))

    try:
        conditions = read_json_file(os.path.join(rulebook_path, 'conditions.json'))
    except json.JSONDecodeError as e:
        raise Exception('Failed to parse conditions.json file, %s' % str(e))

    try:
        races = read_json_file(os.path.join(rulebook_path, 'races.json'))
    except json.JSONDecodeError as e:
        raise Exception('Failed to parse races.json file, %s' % str(e))

    try:
        skills = read_json_file(os.path.join(rulebook_path, 'skills.json'))
    except json.JSONDecodeError as e:
        raise Exception('Failed to parse skills.json file, %s' % str(e))

    check_for_duplicates(abilities + attributes + branches + buffs + classes + conditions + races + skills, log)
    check_skill_attribute_links(skills, attributes, log)
    check_class_skill_requirements(classes, skills, log)
    check_class_branch_links(classes, branches)
    check_class_ability_links(classes, abilities)
    check_branch_ability_links(branches, abilities)
    log('Validated rulebook files')
