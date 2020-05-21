import os
import shutil

from src.website.common import get_component, read_json_file, href, get_link_skill_req


CURRENT_PATH = os.getcwd()
HTML_PATH = os.path.join(CURRENT_PATH, 'html')
HTML_GENERATED = os.path.join(HTML_PATH, 'generated')
HTML_TEMPLATES = os.path.join(HTML_PATH, 'templates')
HOME_PAGE = os.path.join(HTML_GENERATED, 'index.html')

BR_JOIN = '<br>'.join
HTML_TAGS = ['<ul>', '</ul>', '<li>', '</li>', '<br>']


def _debug(term, component):
    print('Debug: working on %s %s' % (term, component['name']))


def build_skills_nav(skill_categories):
    nav_htmls = [href('skills_%s' % category, category) for category in skill_categories]
    return '\n'.join(nav_htmls)


def build_classes_nav(classes):
    nav_htmls = []
    for clazz in classes:
        if 'flavor_text' not in clazz:
            continue

        nav_htmls.append(href('class_%s' % clazz['name'], clazz['name']))

    return '\n'.join(nav_htmls)


def build_attributes(attributes):
    with open(os.path.join(HTML_TEMPLATES, 'attribute.html'), encoding='utf8') as f:
        attribute_template = f.read().strip()

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


def build_races(races):
    with open(os.path.join(HTML_TEMPLATES, 'race.html'), encoding='utf8') as f:
        race_template = f.read().strip()
    with open(os.path.join(HTML_TEMPLATES, 'racial_trait.html'), encoding='utf8') as f:
        racial_trait_template = f.read().strip()

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


def build_buffs(buffs):
    with open(os.path.join(HTML_TEMPLATES, 'buff_or_condition.html'), encoding='utf8') as f:
        buff_template = f.read().strip()

    buff_htmls = []
    for buff in buffs:
        _debug('buff', buff)
        buff_html = buff_template.format(**buff)
        buff_htmls.append(buff_html)

    return '\n'.join(buff_htmls)


def build_conditions(conditions):
    with open(os.path.join(HTML_TEMPLATES, 'buff_or_condition.html'), encoding='utf8') as f:
        condition_template = f.read().strip()

    condition_htmls = []
    for condition in conditions:
        _debug('condition', condition)
        condition_html = condition_template.format(**condition)
        condition_htmls.append(condition_html)

    return '\n'.join(condition_htmls)


def build_skills(skill_categories, skills):
    with open(os.path.join(HTML_TEMPLATES, 'skill.html'), encoding='utf8') as f:
        skill_template = f.read().strip()
    with open(os.path.join(HTML_TEMPLATES, 'skills_section.html'), encoding='utf8') as f:
        skills_section_template = f.read().strip()
    with open(os.path.join(HTML_TEMPLATES, 'list_item.html'), encoding='utf8') as f:
        list_item_template = f.read().strip()

    skills_section_htmls = []
    for category in skill_categories:
        skill_htmls = []
        for skill in skills:
            if skill['category'] != category:
                continue

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


def build_class_hint_unlocks(classes, skills):
    with open(os.path.join(HTML_TEMPLATES, 'class_hint.html'), encoding='utf8') as f:
        class_hint_template = f.read().strip()
    with open(os.path.join(HTML_TEMPLATES, 'class_hints_section.html'), encoding='utf8') as f:
        class_hints_section_template = f.read().strip()

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
                name_or_linked_name = href('class_%s' % clazz['name'], clazz['name'])

            class_hint_html = class_hint_template.format(
                color='#99747A' if clazz['all_reqs_known'] else 'transparent',
                name=name_or_linked_name,
                preview=clazz['preview'],
                known_requirements=', '.join([get_link_skill_req(req, skills) for req in clazz['known_requirements']]),
            )
            class_hint_htmls.append(class_hint_html)

        class_hints_section_html = class_hints_section_template.format(
            reqs=reqs,
            class_hints='\n'.join(class_hint_htmls),
        )
        class_hint_section_htmls.append(class_hints_section_html)

    return BR_JOIN(class_hint_section_htmls)


def _build_branches_html(clazz, abilities):
    with open(os.path.join(HTML_TEMPLATES, 'branch.html'), encoding='utf8') as f:
        branch_template = f.read().strip()
    with open(os.path.join(HTML_TEMPLATES, 'ability.html'), encoding='utf8') as f:
        ability_template = f.read().strip()

    passive_name = next(iter(clazz['passive']))

    branches_htmls = []
    for branch_name, branch_description in clazz['branches'].items():
        branch_abilities = []
        for ability in abilities:
            if ability['class'] == clazz['name'] and ability['branch'] == branch_name:
                branch_abilities.append(ability)
        branch_abilities.sort(key=lambda a: a['tier'])

        ability_htmls = []
        for ability in branch_abilities:
            description = []
            for line in ability['description']:
                if any(tag in line for tag in HTML_TAGS):
                    description.append(line)
                else:
                    description.append('<p>%s</p>' % line)

            for i in range(len(description)):
                link = href('%s_%s' % (clazz['name'], passive_name), passive_name)
                description[i] = description[i].replace(passive_name, '<i>%s</i>' % link)

            ability_html = ability_template.format(
                name=ability['name'].replace('"', '&quot'),
                clazz=ability['class'],
                action=ability['action'],
                cost=ability['cost'],
                range=ability['range'],
                duration=ability['duration'],
                description=''.join(description),
                tags=', '.join(ability['tags']),
            )
            ability_htmls.append(ability_html)

        branch_html = branch_template.format(
            clazz=clazz['name'],
            branch=branch_name,
            abilities=BR_JOIN(ability_htmls),
        )
        branches_htmls.append(branch_html)

    return BR_JOIN(branches_htmls)


def build_classes(abilities, classes, skills):
    with open(os.path.join(HTML_TEMPLATES, 'class.html'), encoding='utf8') as f:
        class_template = f.read().strip()
    with open(os.path.join(HTML_TEMPLATES, 'list_item.html'), encoding='utf8') as f:
        list_item_template = f.read().strip()

    class_htmls = []
    for clazz in classes:
        # Skip over classes that haven't been unlocked yet. We'll use the flavor_text field to deduce this.
        if 'flavor_text' not in clazz:
            continue

        _debug('class', clazz)

        requirement_htmls = []
        for requirement in clazz['requirements']:
            requirement_html = list_item_template.format(text=get_link_skill_req(requirement, skills))
            requirement_htmls.append(requirement_html)

        branch_description_htmls = []
        for branch_name, branch_description in clazz['branches'].items():
            branch_anchor = 'class_%s_branch_%s' % (clazz['name'], branch_name)
            linked_branch_description = branch_description.replace(branch_name, href(branch_anchor, branch_name))
            branch_description_html = list_item_template.format(text=linked_branch_description)
            branch_description_htmls.append(branch_description_html)

        passive_name = next(iter(clazz['passive']))
        passive_description = clazz['passive'][passive_name]
        if '<ul>' in passive_description and '</ul>' in passive_description:
            start_part = passive_description.split('<ul>', 1)[0]
            html_part = passive_description.split('<ul>', 1)[1].split('</ul>', 1)[0]
            end_part = passive_description.split('<ul>', 1)[1].split('</ul>', 1)[1]
            passive_description = '%s</p><ul>%s</ul><p>%s</p>' % (start_part, html_part, end_part)
        else:
            passive_description += '</p>'

        branches_html = _build_branches_html(clazz, abilities)

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


def generate_html(log):
    log('Generating HTML rulebook')
    rulebook_path = os.path.join(CURRENT_PATH, 'rulebook')

    if not os.path.exists(HTML_GENERATED):
        os.makedirs(HTML_GENERATED)

    with open(os.path.join(HTML_TEMPLATES, 'index.html'), encoding='utf8') as f:
        index_template = f.read().strip()

    abilities = read_json_file(os.path.join(rulebook_path, 'abilities.json'))
    attributes = read_json_file(os.path.join(rulebook_path, 'attributes.json'), sort=False)
    buffs = read_json_file(os.path.join(rulebook_path, 'buffs.json'))
    classes = read_json_file(os.path.join(rulebook_path, 'classes.json'))
    conditions = read_json_file(os.path.join(rulebook_path, 'conditions.json'))
    races = read_json_file(os.path.join(rulebook_path, 'races.json'))
    skills = read_json_file(os.path.join(rulebook_path, 'skills.json'))

    # The rulebook organizes skills into sections by category
    skill_categories = sorted(list(set(skill['category'] for skill in skills)))

    format_args = {
        'skills_nav': build_skills_nav(skill_categories),
        'classes_nav': build_classes_nav(classes),
        'attributes': build_attributes(attributes),
        'races': build_races(races),
        'buffs': build_buffs(buffs),
        'conditions': build_conditions(conditions),
        'skills': build_skills(skill_categories, skills),
        'class_hint_unlocks': build_class_hint_unlocks(classes, skills),
        'classes': build_classes(abilities, classes, skills),
    }
    index_html = index_template.format(**format_args)

    with open(os.path.join(HTML_GENERATED, 'index.html'), 'w', encoding='utf8') as f:
        f.write(index_html)

    shutil.copyfile(os.path.join(HTML_TEMPLATES, 'style.css'), os.path.join(HTML_GENERATED, 'style.css'))
    log('Generated HTML rulebook')

