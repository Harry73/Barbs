import json

from collections import OrderedDict


ATTRIBUTES_ORDER = [
    'Vitality', 'Endurance', 'Spirit', 'Recovery', 'Perseverance', 'Sanity', 'Agility', 'Toughness', 'Reflex',
    'Resistance', 'Fortitude', 'Strength', 'Dexterity', 'Attunement', 'Precision', 'Appeal', 'Intelligence', 'Wisdom',
    'Composure', 'Focus'
]

MONTHS = [
    'Icemoon (Winter)',
    'Waterfall (Spring)',
    'Earthdust (Spring)',
    'Lightstar (Summer)',
    'Firesun (Summer)',
    'Thundersky (Autumn)',
    'Windring (Autumn)',
    'Darknight (Winter)',
]


def href(anchor, text, title=None, fancy=''):
    if title:
        return '<a href="{anchor}" title="{title}" {fancy}>{text}</a>'.format(anchor=anchor, text=text,
                                                                              title=title, fancy=fancy)
    else:
        return '<a href="{anchor}" {fancy}>{text}</a>'.format(anchor=anchor, text=text, fancy=fancy)


def read_json_file(file_path):
    with open(file_path, 'r', encoding='utf8') as f:
        components = json.load(f, object_pairs_hook=OrderedDict)

    # Order attributes by pre-defined order
    if 'attributes' in file_path:
        return [get_component(attr, components) for attr in ATTRIBUTES_ORDER]

    # If components is a list, sort it by name
    if isinstance(components, list):
        return sorted(components, key=lambda item: item['name'])
    else:
        return components


def get_component(component_name, component_list, condition=None):
    for component in component_list:
        if component['name'] == component_name:
            if condition is None:
                return component

            if condition(component):
                return component

    raise KeyError('Component %s not found' % component_name)


def get_link_skill_req(skill_req, skills):
    strings_to_check = skill_req.split(' or ')

    for string_to_check in strings_to_check:
        longest_match = None
        for skill in skills:
            if skill['name'] in string_to_check:
                if longest_match is None or len(skill['name']) > len(longest_match['name']):
                    longest_match = skill

        if longest_match is not None:
            skill_req = skill_req.replace(longest_match['name'],
                                          href('#skill_%s' % longest_match['name'], longest_match['name']))
            continue

        for skill in skills:
            if 'any' in string_to_check.lower() and skill['category'] in string_to_check:
                skill_req = skill_req.replace(skill['category'],
                                              href('#skills_%s' % skill['category'], skill['category']))
                break

    return skill_req
