import json

from collections import OrderedDict


def href(anchor, text):
    return '<a href="#{anchor}">{text}</a>'.format(anchor=anchor, text=text)


def read_json_file(file_path):
    with open(file_path, 'r', encoding='utf8') as f:
        return sorted(json.load(f, object_pairs_hook=OrderedDict), key=lambda item: item['name'])


def get_component(component_name, component_list, condition=None):
    for component in component_list:
        if component['name'] == component_name:
            if condition is None:
                return component

            if condition(component):
                return component

    raise KeyError('Component %s not found' % component_name)


def get_link_skill_req(skill_req, skills):
    for skill in skills:
        if skill['name'] in skill_req:
            return skill_req.replace(skill['name'], href('skill_%s' % skill['name'], skill['name']))

    for skill in skills:
        if 'any' in skill_req.lower() and skill['category'] in skill_req:
            return skill_req.replace(skill['category'], href('skills_%s' % skill['category'], skill['category']))

    return skill_req
