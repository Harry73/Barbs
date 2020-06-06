import json

from collections import OrderedDict


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


def href(anchor, text, title=None):
    if title:
        return '<a href="{anchor}" title="{title}">{text}</a>'.format(anchor=anchor, text=text, title=title)
    else:
        return '<a href="{anchor}">{text}</a>'.format(anchor=anchor, text=text)


def read_json_file(file_path, sort=True):
    with open(file_path, 'r', encoding='utf8') as f:
        components = json.load(f, object_pairs_hook=OrderedDict)

    if sort:
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
    longest_match = None
    for skill in skills:
        if skill['name'] in skill_req:
            if longest_match is None or len(skill['name']) > len(longest_match['name']):
                longest_match = skill

    if longest_match is not None:
        skill_req = skill_req.replace(longest_match['name'],
                                      href('#skill_%s' % longest_match['name'], longest_match['name']))
        return skill_req

    for skill in skills:
        if 'any' in skill_req.lower() and skill['category'] in skill_req:
            return skill_req.replace(skill['category'], href('#skills_%s' % skill['category'], skill['category']))

    return skill_req
