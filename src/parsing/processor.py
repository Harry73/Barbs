# convert things to json hopefully

import os
import json
import sys

from src.website.common import get_component, read_json_file


CURRENT_PATH = os.path.dirname(os.path.realpath(sys.argv[0]))
DATA_PATH = os.path.join(CURRENT_PATH, 'data')
RULEBOOK_PATH = os.path.join(CURRENT_PATH, 'rulebook')
DATA_TXT = os.path.join(DATA_PATH, 'data.txt')


def make_dirs():
    if not os.path.exists(DATA_PATH):
        os.makedirs(DATA_PATH)


def fix_quotes(obj):
    if isinstance(obj, str):
        return obj.replace(u'\u201C', '"').replace(u'\u201D', '"').replace(u'\u2019', "'")
    elif isinstance(obj, list):
        return [fix_quotes(o) for o in obj]
    elif isinstance(obj, dict):
        return {fix_quotes(k): fix_quotes(v) for k, v in obj.items()}
    else:
        return obj


# One method to call them all, and in the syntax run them
def process_data_file():
    make_dirs()

    abilities = read_json_file(os.path.join(RULEBOOK_PATH, 'abilities.json'))
    attributes = read_json_file(os.path.join(RULEBOOK_PATH, 'attributes.json'))
    buffs = read_json_file(os.path.join(RULEBOOK_PATH, 'buffs.json'))
    classes = read_json_file(os.path.join(RULEBOOK_PATH, 'classes.json'))
    conditions = read_json_file(os.path.join(RULEBOOK_PATH, 'conditions.json'))
    races = read_json_file(os.path.join(RULEBOOK_PATH, 'races.json'))
    skills = read_json_file(os.path.join(RULEBOOK_PATH, 'skills.json'))

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

    # Dump what we read back to their files to fix formatting
    for file_name, items in lists.items():
        with open(os.path.join(RULEBOOK_PATH, '%s.json' % file_name), 'w') as f:
            json.dump(items, f, indent=4)

    # Create a map of skills to their attribute acronyms
    skill_to_attr = {}
    for skill in skills:
        if 'attribute' not in skill:
            raise Exception('Error, skill missing data, %s' % skill)

        attribute = get_component(skill['attribute'], attributes)
        if attribute is None:
            raise Exception('Error, attribute %s not found' % skill['attribute'])

        skill_to_attr[skill['name']] = attribute['abbreviation']

    with open(os.path.join(DATA_PATH, 'skills_to_attributes.json'), 'w') as f:
        json.dump(skill_to_attr, f)

    # Create js for SkillObjects in the API scripts
    with open(os.path.join(DATA_PATH, 'skills.txt'), 'w') as f:
        for skill_name, attr_tla in skill_to_attr.items():
            string = "%s: new SkillObject('%s', '%s'),\n" % (
                skill_name.replace(' ', '_').replace(':', '').upper(),
                skill_name,
                attr_tla,
            )
            f.write(string)

        f.write("ALL: new SkillObject('All', ''),\n")

    # Merge classes and abilities lists
    ability_keys_to_remove = ['type', 'branch', 'tier', 'action', 'cost', 'range', 'duration', 'api']
    class_keys_to_remove = [
        'preview', 'num_requirements', 'requirements', 'all_reqs_known', 'flavor_text', 'branches', 'api',
    ]

    revised_classes = {}
    for clazz in classes:
        skip = False
        if 'flavor_text' not in clazz:
            skip = True

        for key in class_keys_to_remove:
            clazz.pop(key, None)

        ability_names = clazz.get('abilities', [])
        clazz['abilities'] = {}

        if skip:
            continue

        # Get each ability for the class, remove keys we don't care about, and save the ability in the class
        for ability_name in ability_names:
            ability = get_component(ability_name, abilities, lambda a: a['class'] == clazz['name'])
            for key in ability_keys_to_remove:
                ability.pop(key, None)

            clazz['abilities'][ability['name']] = ability

        revised_classes[clazz['name']] = clazz

    with open(os.path.join(DATA_PATH, 'classes.json'), 'w') as f:
        json.dump(revised_classes, f, indent=4)
