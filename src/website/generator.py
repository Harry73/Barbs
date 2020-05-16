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


def _href(term, name):
    return '<a href="#{type}_{name}">{name}</a>'.format(type=term, name=name)


def _get_component(component_name, component_list):
    for component in component_list:
        if component['name'] == component_name:
            return component

    raise Exception('Component %s not found' % component_name)


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
    return '{buffs}'


def build_conditions():
    return '{conditions}'


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
        skills = categorized_skills[category]

        skill_htmls = []
        for skill in skills:
            _debug('skill', skill)

            rank_note_htmls = []
            for rank in ['Untrained', 'Rank F', 'Rank A', 'Rank 5', 'Rank 1']:
                if rank in skill['rank_notes']:
                    rank_note = '%s - %s' % (rank, skill['rank_notes'][rank])
                    rank_note_htmls.append(list_item_template.format(text=rank_note))

            skill_html = skill_template.format(
                name='%s: %s' % (skill['category'], skill['sub_name']),
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
                name_or_linked_name = _href('class', clazz['name'])

            class_hint_html = class_hint_template.format(
                name=name_or_linked_name,
                preview=clazz['preview'],
                known_requirements=', '.join(clazz['known_requirements']),
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
        branch = _get_component(branch_name, branches)

        ability_htmls = []
        for ability_name in branch['abilities']:
            ability = _get_component(ability_name, abilities)
            ability_html = ability_template.format(
                name=ability['name'],
                action=ability['action'],
                cost=ability['cost'],
                range=ability['range'],
                duration=ability['duration'],
                description=''.join('<p>%s</p>' % line for line in ability['description']),
                tags=', '.join(ability['tags']),
            )
            ability_htmls.append(ability_html)

        branch_html = branch_template.format(
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
    for clazz in classes:
        # Skip over classes that haven't been unlocked yet. We'll use the flavor_text field to deduce this.
        if 'flavor_text' not in clazz:
            continue

        _debug('class', clazz)

        requirement_htmls = []
        for requirement in clazz['requirements']:
            requirement_html = list_item_template.format(text=requirement)
            requirement_htmls.append(requirement_html)

        branch_description_htmls = []
        for branch_name in clazz['branches']:
            branch = _get_component(branch_name, branches)
            linked_branch_description = branch['description'].replace(branch_name, _href('branch', branch_name))
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

    attributes = build_attributes()
    races = build_races()
    buffs = build_buffs()
    conditions = build_conditions()
    skills = build_skills()
    class_hint_unlocks = build_class_hint_unlocks()
    classes = build_classes()

    index_template = index_template.format(
        attributes=attributes,
        races=races,
        buffs=buffs,
        conditions=conditions,
        skills=skills,
        class_hint_unlocks=class_hint_unlocks,
        classes=classes,
    )

    with open(os.path.join(HTML_GENERATED, 'index.html'), 'w', encoding='utf8') as f:
        f.write(index_template)

    shutil.copyfile(os.path.join(HTML_TEMPLATES, 'style.css'), os.path.join(HTML_GENERATED, 'style.css'))
