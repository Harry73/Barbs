import json
import os
import shutil


CURRENT_PATH = os.getcwd()
HTML_PATH = os.path.join(CURRENT_PATH, 'html')
HTML_GENERATED = os.path.join(HTML_PATH, 'generated')
HTML_TEMPLATES = os.path.join(HTML_PATH, 'templates')
HOME_PAGE = os.path.join(HTML_GENERATED, 'index.html')
RULEBOOK_PATH = os.path.join(CURRENT_PATH, 'rulebook')

BR_JOIN = '<br>'.join


def _debug(term, component):
    print('Working on %s %s' % (term, component['name']))


def _href(anchor, text):
    return '<a href="#{anchor}">{text}</a>'.format(anchor=anchor, text=text)


def _get_component(component_name, component_list, condition=None):
    for component in component_list:
        if component['name'] == component_name:
            if condition is None:
                return component

            if condition(component):
                return component

    raise Exception('Component %s not found' % component_name)


def _try_link_skill_req(skill_req):
    with open(os.path.join(RULEBOOK_PATH, 'skills.json'), encoding='utf8') as f:
        skills = json.load(f)

    for skill in skills:
        if skill['name'] in skill_req:
            return skill_req.replace(skill['name'], _href('skill_%s' % skill['name'], skill['name']))

    for skill in skills:
        if 'any' in skill_req.lower() and skill['category'] in skill_req:
            return skill_req.replace(skill['category'], _href('skills_%s' % skill['category'], skill['category']))

    print('Failed to link skill for requirement "%s"' % skill_req)
    return skill_req


def build_skills_nav():
    with open(os.path.join(RULEBOOK_PATH, 'skills.json'), encoding='utf8') as f:
        all_skills = json.load(f)

    # The rulebook organizes skills into sections by category. We will make a nav link per category.
    categorized_skills = set(skill['category'] for skill in all_skills)

    nav_htmls = [_href('skills_%s' % category, category) for category in sorted(categorized_skills)]
    return '\n'.join(nav_htmls)


def build_classes_nav():
    with open(os.path.join(RULEBOOK_PATH, 'classes.json'), encoding='utf8') as f:
        classes = json.load(f)

    nav_htmls = []
    for clazz in sorted(classes, key=lambda c: c['name']):
        if 'flavor_text' not in clazz:
            continue

        nav_htmls.append(_href('class_%s' % clazz['name'], clazz['name']))

    return '\n'.join(nav_htmls)


def build_attributes():
    with open(os.path.join(HTML_TEMPLATES, 'attribute.html'), encoding='utf8') as f:
        attribute_template = f.read().strip()

    with open(os.path.join(RULEBOOK_PATH, 'attributes.json'), encoding='utf8') as f:
        attributes = json.load(f)

    attribute_htmls = []
    for attribute in attributes:
        _debug('attribute', attribute)
        attribute_html = attribute_template.format(
            name=attribute['name'],
            name_and_tla='%s (%s)' % (attribute['name'], attribute['abbreviation']),
            description=attribute['description']
        )
        attribute_htmls.append(attribute_html)

    return BR_JOIN(attribute_htmls)


def build_races():
    with open(os.path.join(HTML_TEMPLATES, 'race.html'), encoding='utf8') as f:
        race_template = f.read().strip()
    with open(os.path.join(HTML_TEMPLATES, 'racial_trait.html'), encoding='utf8') as f:
        racial_trait_template = f.read().strip()

    with open(os.path.join(RULEBOOK_PATH, 'races.json'), encoding='utf8') as f:
        races = json.load(f)

    race_htmls = []
    for race in races:
        _debug('race', race)
        racial_trait_htmls = []
        for trait_name, trait_description, in race['traits'].items():
            racial_trait_html = racial_trait_template.format(
                trait=trait_name,
                trait_description=trait_description,
            )
            racial_trait_htmls.append(racial_trait_html)

        race_html = race_template.format(
            name=race['name'],
            description=race['description'],
            traits='\n'.join(racial_trait_htmls),
        )
        race_htmls.append(race_html)

    return BR_JOIN(race_htmls)


def build_buffs():
    with open(os.path.join(HTML_TEMPLATES, 'buff_or_condition.html'), encoding='utf8') as f:
        buff_template = f.read().strip()

    with open(os.path.join(RULEBOOK_PATH, 'buffs.json'), encoding='utf8') as f:
        buffs = json.load(f)

    buff_htmls = []
    for buff in buffs:
        _debug('buff', buff)
        buff_html = buff_template.format(**buff)
        buff_htmls.append(buff_html)

    return '\n'.join(buff_htmls)


def build_conditions():
    with open(os.path.join(HTML_TEMPLATES, 'buff_or_condition.html'), encoding='utf8') as f:
        condition_template = f.read().strip()

    with open(os.path.join(RULEBOOK_PATH, 'conditions.json'), encoding='utf8') as f:
        conditions = json.load(f)

    condition_htmls = []
    for condition in conditions:
        _debug('condition', condition)
        condition_html = condition_template.format(**condition)
        condition_htmls.append(condition_html)

    return '\n'.join(condition_htmls)


def build_skills():
    with open(os.path.join(HTML_TEMPLATES, 'skill.html'), encoding='utf8') as f:
        skill_template = f.read().strip()
    with open(os.path.join(HTML_TEMPLATES, 'skills_section.html'), encoding='utf8') as f:
        skills_section_template = f.read().strip()
    with open(os.path.join(HTML_TEMPLATES, 'list_item.html'), encoding='utf8') as f:
        list_item_template = f.read().strip()

    with open(os.path.join(RULEBOOK_PATH, 'skills.json'), encoding='utf8') as f:
        all_skills = json.load(f)

    # The rulebook organizes skills into sections by category. Group them here so we can easily build each section.
    categorized_skills = {}
    for skill in all_skills:
        category = skill['category']
        if category not in categorized_skills:
            categorized_skills[category] = []
        categorized_skills[category].append(skill)

    skills_section_htmls = []
    for category in sorted(categorized_skills.keys()):
        skills = sorted(categorized_skills[category], key=lambda s: s['name'])

        skill_htmls = []
        for skill in skills:
            _debug('skill', skill)

            rank_note_htmls = []
            for rank in ['Untrained', 'Rank F', 'Rank A', 'Rank 5', 'Rank 1']:
                if rank in skill['rank_notes']:
                    rank_note = '%s - %s' % (rank, skill['rank_notes'][rank])
                    rank_note_htmls.append(list_item_template.format(text=rank_note))

            skill_html = skill_template.format(
                name=skill['name'],
                description=skill['description'],
                attribute=skill['attribute'],
                rank_notes='\n'.join(rank_note_htmls),
            )
            skill_htmls.append(skill_html)

        skills_section_html = skills_section_template.format(
            section=category,
            skills=BR_JOIN(skill_htmls)
        )
        skills_section_htmls.append(skills_section_html)

    return BR_JOIN(skills_section_htmls)


def build_class_hint_unlocks():
    with open(os.path.join(HTML_TEMPLATES, 'class_hint.html'), encoding='utf8') as f:
        class_hint_template = f.read().strip()
    with open(os.path.join(HTML_TEMPLATES, 'class_hints_section.html'), encoding='utf8') as f:
        class_hints_section_template = f.read().strip()

    with open(os.path.join(RULEBOOK_PATH, 'classes.json'), encoding='utf8') as f:
        classes = json.load(f)

    reqs_per_class = {}
    for clazz in classes:
        reqs = clazz['num_requirements']
        if reqs not in reqs_per_class:
            reqs_per_class[reqs] = []
        reqs_per_class[reqs].append(clazz)

    class_hint_section_htmls = []
    for reqs in sorted(reqs_per_class.keys()):

        class_hint_htmls = []
        for clazz in reqs_per_class[reqs]:
            _debug('class hint', clazz)

            # We're using the presence of the flavor_text field to indicate whether or not a class is unlocked.
            # We'll link to the full class if it is unlocked.
            name_or_linked_name = clazz['name']
            if 'flavor_text' in clazz:
                name_or_linked_name = _href('class_%s' % clazz['name'], clazz['name'])

            class_hint_html = class_hint_template.format(
                name=name_or_linked_name,
                preview=clazz['preview'],
                known_requirements=', '.join([_try_link_skill_req(req) for req in clazz['known_requirements']]),
            )
            class_hint_htmls.append(class_hint_html)

        class_hints_section_html = class_hints_section_template.format(
            reqs=reqs,
            class_hints='\n'.join(class_hint_htmls),
        )
        class_hint_section_htmls.append(class_hints_section_html)

    return BR_JOIN(class_hint_section_htmls)


def _build_branches_html(clazz, branches, abilities):
    with open(os.path.join(HTML_TEMPLATES, 'branch.html'), encoding='utf8') as f:
        branch_template = f.read().strip()
    with open(os.path.join(HTML_TEMPLATES, 'ability.html'), encoding='utf8') as f:
        ability_template = f.read().strip()

    branches_htmls = []
    for branch_name in clazz['branches']:
        # There are some branches in different classes with the same name, so additionally check that the
        # class name is right when finding the branch.
        branch = _get_component(branch_name, branches, condition=lambda b: b['class'] == clazz['name'])

        ability_htmls = []
        for ability_name in branch['abilities']:
            # There are some abilities in different classes with the same name, so additionally check that the
            # class name is right when finding the ability
            ability = _get_component(ability_name, abilities, condition=lambda c: c['class'] == clazz['name'])
            ability_html = ability_template.format(
                name=ability['name'].replace('"', '&quot'),
                clazz=ability['class'],
                action=ability['action'],
                cost=ability['cost'],
                range=ability['range'],
                duration=ability['duration'],
                description=''.join('<p>%s</p>' % line for line in ability['description']),
                tags=', '.join(ability['tags']),
            )
            ability_htmls.append(ability_html)

        branch_html = branch_template.format(
            clazz=clazz['name'],
            branch=branch['name'],
            abilities=BR_JOIN(ability_htmls),
        )
        branches_htmls.append(branch_html)

    return BR_JOIN(branches_htmls)


def build_classes():
    with open(os.path.join(HTML_TEMPLATES, 'class.html'), encoding='utf8') as f:
        class_template = f.read().strip()
    with open(os.path.join(HTML_TEMPLATES, 'list_item.html'), encoding='utf8') as f:
        list_item_template = f.read().strip()

    with open(os.path.join(RULEBOOK_PATH, 'classes.json'), encoding='utf8') as f:
        classes = json.load(f)
    with open(os.path.join(RULEBOOK_PATH, 'branches.json'), encoding='utf8') as f:
        branches = json.load(f)
    with open(os.path.join(RULEBOOK_PATH, 'abilities.json'), encoding='utf8') as f:
        abilities = json.load(f)

    class_htmls = []
    for clazz in sorted(classes, key=lambda c: c['name']):
        # Skip over classes that haven't been unlocked yet. We'll use the flavor_text field to deduce this.
        if 'flavor_text' not in clazz:
            continue

        _debug('class', clazz)

        requirement_htmls = []
        for requirement in clazz['requirements']:
            requirement_html = list_item_template.format(text=_try_link_skill_req(requirement))
            requirement_htmls.append(requirement_html)

        branch_description_htmls = []
        for branch_name in clazz['branches']:
            branch = _get_component(branch_name, branches)
            branch_anchor = 'class_%s_branch_%s' % (clazz['name'], branch['name'])
            linked_branch_description = branch['description'].replace(branch_name, _href(branch_anchor, branch_name))
            branch_description_html = list_item_template.format(text=linked_branch_description)
            branch_description_htmls.append(branch_description_html)

        passive_name = next(iter(clazz['passive']))
        passive_description = clazz['passive'][passive_name]
        branches_html = _build_branches_html(clazz, branches, abilities)

        class_html = class_template.format(
            name=clazz['name'],
            requirements='\n'.join(requirement_htmls),
            flavor_text=clazz['flavor_text'],
            description=clazz['description'],
            branch_descriptions='\n'.join(branch_description_htmls),
            passive_name=passive_name,
            passive_description=passive_description,
            branches=branches_html,
        )
        class_htmls.append(class_html)

    return BR_JOIN(class_htmls)


def generate_html():
    if not os.path.exists(HTML_GENERATED):
        os.makedirs(HTML_GENERATED)

    with open(os.path.join(HTML_TEMPLATES, 'index.html'), encoding='utf8') as f:
        index_template = f.read().strip()

    format_args = {
        'skills_nav': build_skills_nav(),
        'classes_nav': build_classes_nav(),
        'attributes': build_attributes(),
        'races': build_races(),
        'buffs': build_buffs(),
        'conditions': build_conditions(),
        'skills': build_skills(),
        'class_hint_unlocks': build_class_hint_unlocks(),
        'classes': build_classes(),
    }
    index_html = index_template.format(**format_args)

    with open(os.path.join(HTML_GENERATED, 'index.html'), 'w', encoding='utf8') as f:
        f.write(index_html)

    shutil.copyfile(os.path.join(HTML_TEMPLATES, 'style.css'), os.path.join(HTML_GENERATED, 'style.css'))
