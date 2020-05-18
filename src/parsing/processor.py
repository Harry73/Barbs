# convert things to json hopefully

import os
import json

from src.parsing.parser import parse_data

CURRENT_PATH = os.getcwd()
DATA_PATH = os.path.join(CURRENT_PATH, 'data')
RULEBOOK_PATH = os.path.join(CURRENT_PATH, 'rulebook')
DATA_TXT = os.path.join(DATA_PATH, 'data.txt')


def make_dirs():
    if not os.path.exists(DATA_PATH):
        os.makedirs(DATA_PATH)
    if not os.path.exists(RULEBOOK_PATH):
        os.makedirs(RULEBOOK_PATH)


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

    # Read the data file
    with open(DATA_TXT, encoding='utf16') as f:
        lines = f.readlines()

    attributes, races, buffs, conditions, skills, classes = parse_data(lines)

    branches = []
    abilities = []
    for clazz in classes:
        branches.extend(clazz.branches)
        abilities.extend(clazz.abilities)

    lists = {
        'attributes': attributes,
        'races': races,
        'buffs': buffs,
        'conditions': conditions,
        'skills': skills,
        'classes': classes,
        'branches': branches,
        'abilities': abilities,
    }

    # Dump raw components to files
    for collection, items in lists.items():
        with open(os.path.join(RULEBOOK_PATH, '%s.json' % collection), 'w') as f:
            json_items = [fix_quotes(item.to_json()) for item in items]
            json.dump(json_items, f, indent=4)

    components = []
    for name, l in lists.items():
        for item in l:
            components.append(fix_quotes(item.to_json()))

    with open(os.path.join(DATA_PATH, 'components.json'), 'w') as f:
        json.dump(components, f, indent=4)

    # Create a map of skills to their attribute acronyms
    skill_to_attr = {}
    for skill in skills:
        if not skill.attribute or not skill.attribute.abbreviation:
            print('error, skill missing data, %s' % skill)
            return

        skill_to_attr[skill.name] = skill.attribute.abbreviation

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
