# convert things to json hopefully

import os
import json

from src.parsing.parser import parse_data
from src.website.common import read_json_file, get_component

CURRENT_PATH = os.getcwd()
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
