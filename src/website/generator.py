import html
import os
import shutil
import sys

from src.website.common import get_component, read_json_file, href, get_link_skill_req, MONTHS


CURRENT_PATH = os.path.dirname(os.path.abspath(sys.argv[0]))
HTML_PATH = os.path.join(CURRENT_PATH, 'html')
HTML_GENERATED = os.path.join(HTML_PATH, 'generated')
CALENDAR_GENERATED = os.path.join(HTML_GENERATED, 'calendar')
HTML_TEMPLATES = os.path.join(HTML_PATH, 'templates')
HOME_PAGE = os.path.join(HTML_GENERATED, 'rulebook.html')

BR_JOIN = '<br>'.join
HTML_TAGS = ['<ul>', '</ul>', '<li>', '</li>', '<br>']

DAYS_OF_THE_WEEK = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
CALENDAR_START_INDEX = 0


def _debug(term, component):
    print('Debug: working on %s %s' % (term, component['name']))


def _build_skills_nav(skill_categories):
    nav_htmls = [href('#skills_%s' % category, category) for category in skill_categories]
    return '\n'.join(nav_htmls)


def _build_classes_nav(classes):
    nav_htmls = []
    for clazz in classes:
        if 'flavor_text' not in clazz:
            continue

        nav_htmls.append(href('#class_%s' % clazz['name'], clazz['name']))

    return '\n'.join(nav_htmls)


def _build_attributes(attributes):
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


def _build_races(races):
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


def _build_buffs(buffs):
    with open(os.path.join(HTML_TEMPLATES, 'buff_or_condition.html'), encoding='utf8') as f:
        buff_template = f.read().strip()

    buff_htmls = []
    for buff in buffs:
        _debug('buff', buff)
        buff_html = buff_template.format(**buff)
        buff_htmls.append(buff_html)

    return '\n'.join(buff_htmls)


def _build_conditions(conditions):
    with open(os.path.join(HTML_TEMPLATES, 'buff_or_condition.html'), encoding='utf8') as f:
        condition_template = f.read().strip()

    condition_htmls = []
    for condition in conditions:
        _debug('condition', condition)
        condition_html = condition_template.format(**condition)
        condition_htmls.append(condition_html)

    return '\n'.join(condition_htmls)


def _build_skills(skill_categories, skills):
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


def _build_class_hint_unlocks(classes, skills):
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
                name_or_linked_name = href('#class_%s' % clazz['name'], clazz['name'])

            class_hint_html = class_hint_template.format(
                color='#99747A' if clazz['all_reqs_known'] else 'transparent',
                name=name_or_linked_name,
                preview=clazz['preview'],
                requirements=', '.join([get_link_skill_req(req, skills) for req in clazz['requirements']]),
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
                link = href('#%s_%s' % (clazz['name'], passive_name), passive_name)
                description[i] = description[i].replace(passive_name, '<i>%s</i>' % link)

            ability_html = ability_template.format(
                name=html.escape(ability['name']),
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


def _build_classes(abilities, classes, skills):
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
            branch_anchor = '#class_%s_branch_%s' % (clazz['name'], branch_name)
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


def _get_month_days():
    month_start_indices = [CALENDAR_START_INDEX]
    start_index = CALENDAR_START_INDEX
    for month in MONTHS:
        if month == MONTHS[0]:
            continue

        start_index = (start_index + 40) % 7
        month_start_indices.append(start_index)

    month_days = {}
    for i, month in enumerate(MONTHS):
        days = [[0 for x in range(7)] for y in range(7)]

        week = 0
        day_index = month_start_indices[i]
        for day in range(1, 41):
            days[week][day_index] = day
            day_index += 1
            if day_index == 7:
                week += 1
                day_index = 0

        month_days[month] = days

    return month_days


def _build_calendar():
    tr = '<tr>%s</tr>'
    empty_th = '<th>&nbsp;</th>'
    th = '<th>%s</th>'
    empty_row = tr % '<th colspan="25">&nbsp;</th>'

    month_days = _get_month_days()

    holidays_path = os.path.join(CURRENT_PATH, 'rulebook', 'holidays.json')
    holidays_per_month = read_json_file(holidays_path)

    def _month_set(index):
        month_header = empty_row + empty_th
        for i in range(index, index + 3):
            if i >= len(MONTHS):
                month_header += '<th colspan="8">&nbsp;</th>'
                break

            month_anchor = href('/calendar?month=%s' % MONTHS[i].split(' ')[0], MONTHS[i])
            month_header += '<th colspan="7" class="table-header right">%s</th>' % month_anchor
            month_header += empty_th

        days_header = empty_th
        for i in range(3):
            if index + i >= len(MONTHS):
                days_header += '<th colspan="8">&nbsp;</th>'
                break

            for day_of_the_week in DAYS_OF_THE_WEEK:
                days_header += '<th class="bottom-bordered">%s</th>' % day_of_the_week[0]
            days_header += empty_th

        return (tr % month_header) + (tr % days_header)

    def _days_set(index):
        rows = ''
        for i in range(7):  # 7 rows in a month
            row = empty_th

            for j in range(3):  # 3 months in a row
                if index + j >= len(MONTHS):
                    row += '<th colspan="8">&nbsp;</th>'
                    break

                month_season = MONTHS[index + j]
                month = month_season.split(' ')[0]

                for k in range(7):  # 7 days in a week
                    month_day = month_days[month_season][i][k]
                    if month_day == 0:
                        row += empty_th
                    else:
                        if str(month_day) in holidays_per_month[month]:
                            kwargs = {}
                            if 'birthday' in holidays_per_month[month][str(month_day)].lower():
                                kwargs['fancy'] = 'class="green-link"'
                            row += th % href('/calendar?month=%s' % month, month_day, **kwargs)

                        else:
                            row += th % month_day

                row += empty_th

            rows += tr % row

        return rows

    calendar_html = tr % '<th colspan="25" class="table-title right">Lemurian Calendar - Year 2018 AS</th>'
    calendar_html += _month_set(0)
    calendar_html += _days_set(0)
    calendar_html += _month_set(3)
    calendar_html += _days_set(3)
    calendar_html += _month_set(6)
    calendar_html += _days_set(6)
    if any(month_days['Windring (Autumn)'][6][i] != 0 or month_days['Darknight (Winter)'][6][i] != 0 for i in range(7)):
        calendar_html += empty_row

    return '<table class="padded bordered">%s</table>' % calendar_html


def _generate_rulebook_html(log):
    log('Generating rulebook HTML')
    rulebook_path = os.path.join(CURRENT_PATH, 'rulebook')

    with open(os.path.join(HTML_TEMPLATES, 'rulebook.html'), encoding='utf8') as f:
        rulebook_template = f.read().strip()

    abilities = read_json_file(os.path.join(rulebook_path, 'abilities.json'))
    attributes = read_json_file(os.path.join(rulebook_path, 'attributes.json'))
    buffs = read_json_file(os.path.join(rulebook_path, 'buffs.json'))
    classes = read_json_file(os.path.join(rulebook_path, 'classes.json'))
    conditions = read_json_file(os.path.join(rulebook_path, 'conditions.json'))
    races = read_json_file(os.path.join(rulebook_path, 'races.json'))
    skills = read_json_file(os.path.join(rulebook_path, 'skills.json'))

    # The rulebook organizes skills into sections by category
    skill_categories = sorted(list(set(skill['category'] for skill in skills)))

    format_args = {
        'calendar': _build_calendar(),
        'skills_nav': _build_skills_nav(skill_categories),
        'classes_nav': _build_classes_nav(classes),
        'attributes': _build_attributes(attributes),
        'races': _build_races(races),
        'buffs': _build_buffs(buffs),
        'conditions': _build_conditions(conditions),
        'skills': _build_skills(skill_categories, skills),
        'class_hint_unlocks': _build_class_hint_unlocks(classes, skills),
        'classes': _build_classes(abilities, classes, skills),
    }
    rulebook_html = rulebook_template.format(**format_args)

    with open(os.path.join(HTML_GENERATED, 'rulebook.html'), 'w', encoding='utf8') as f:
        f.write(rulebook_html)

    log('Generated rulebook HTML')


def _generate_calendar_months_html(log):
    tr = '<tr class="thin-bordered">%s</tr>'
    empty_th = '<th class="thin-bordered">&nbsp;</th>'

    month_days = _get_month_days()

    with open(os.path.join(HTML_TEMPLATES, 'calendar_month.html'), encoding='utf8') as f:
        calendar_month_template = f.read().strip()

    holidays_path = os.path.join(CURRENT_PATH, 'rulebook', 'holidays.json')
    holidays_per_month = read_json_file(holidays_path)

    for month_season in MONTHS:
        month = month_season.split(' ')[0]
        holidays = holidays_per_month[month]

        table = tr % '<th colspan="7" class="table-title left">%s Lemurian Calendar - Year 2018 AS</th>' % month_season
        table += tr % '<th colspan="7">&nbsp;</th>'

        row = ''
        for day_of_week in DAYS_OF_THE_WEEK:
            row += '<th class="table-header thin-bordered">%s</th>' % day_of_week
        table += tr % row

        for week in range(7):  # 7 rows in a month
            if all(month_days[month_season][week][i] == 0 for i in range(7)):
                break

            row = ''
            for i in range(7):  # 7 days in a week
                month_day = month_days[month_season][week][i]
                if month_day == 0:
                    row += empty_th
                else:
                    text = '<div class="top-right">%s</div>' % month_day
                    if str(month_day) in holidays:
                        text += '<br><div class="bottom-left small">%s</div>' % holidays[str(month_day)]

                    row += '<th class="large-cell thin-bordered">%s</th>' % text

            table += tr % row

        month_html = '<table class="padded thin-bordered">%s</table>' % table
        calendar_month_html = calendar_month_template.format(month=month_html)

        with open(os.path.join(CALENDAR_GENERATED, '%s.html' % month), 'w') as f:
            f.write(calendar_month_html)


def _build_abilities_api(clazz, abilities):
    if 'api' not in clazz:
        return '<p>Not implemented</p>'

    with open(os.path.join(HTML_TEMPLATES, 'api_ability.html'), encoding='utf8') as f:
        api_ability_template = f.read().strip()
    with open(os.path.join(HTML_TEMPLATES, 'list_item.html'), encoding='utf8') as f:
        list_item_template = f.read().strip()

    def _build_examples_html(examples):
        if not examples:
            return ''

        examples_htmls = ['<ul>']
        for example in examples:
            text = '<span class="monospace">%s</span>' % html.escape(example)
            examples_htmls.append(list_item_template.format(text=text))
        examples_htmls.append('</ul>')

        return '\n'.join(examples_htmls)

    abilities_htmls = []

    # Add the passive first
    passive_name = next(iter(clazz['passive']))
    passive_examples_html = _build_examples_html(clazz['api']['examples'])
    passive_ability_html = api_ability_template.format(
        name=href('/#%s_%s' % (clazz['name'], passive_name), passive_name, title='Rulebook'),
        description=clazz['api']['description'],
        examples=passive_examples_html,
    )
    abilities_htmls.append(passive_ability_html)
    abilities_htmls.append('<br>')

    for branch_name, branch_description in clazz['branches'].items():
        branch_abilities = []
        for ability in abilities:
            if ability['class'] == clazz['name'] and ability['branch'] == branch_name:
                branch_abilities.append(ability)
        branch_abilities.sort(key=lambda a: a['tier'])

        for ability in branch_abilities:
            if 'api' in ability:
                description = ability['api']['description']
                examples_html = _build_examples_html(ability['api']['examples'])
            else:
                description = 'Not implemented'
                examples_html = ''

            ability_name = html.escape(ability['name'])

            api_ability_html = api_ability_template.format(
                name=href('/#class_%s_ability_%s' % (clazz['name'], ability_name), ability_name, title='Rulebook'),
                description=description,
                examples=examples_html,
            )
            abilities_htmls.append(api_ability_html)

        abilities_htmls.append('<br>')

    return '\n'.join(abilities_htmls)


def _build_classes_api(abilities, classes):
    with open(os.path.join(HTML_TEMPLATES, 'api_class.html'), encoding='utf8') as f:
        class_template = f.read().strip()

    class_htmls = []
    for clazz in classes:
        # Skip over classes that haven't been unlocked yet. We'll use the flavor_text field to deduce this.
        if 'flavor_text' not in clazz:
            continue

        _debug('api class', clazz)

        class_html = class_template.format(
            name=clazz['name'],
            abilities=_build_abilities_api(clazz, abilities),
        )
        class_htmls.append(class_html)

    return BR_JOIN(class_htmls)


def _generate_api_html(log):
    log('Generating API HTML')
    rulebook_path = os.path.join(CURRENT_PATH, 'rulebook')

    with open(os.path.join(HTML_TEMPLATES, 'api.html'), encoding='utf8') as f:
        api_template = f.read().strip()

    abilities = read_json_file(os.path.join(rulebook_path, 'abilities.json'))
    classes = read_json_file(os.path.join(rulebook_path, 'classes.json'))

    format_args = {
        'classes_nav': _build_classes_nav(classes),
        'classes': _build_classes_api(abilities, classes),
    }
    api_html = api_template.format(**format_args)

    with open(os.path.join(HTML_GENERATED, 'api.html'), 'w', encoding='utf8') as f:
        f.write(api_html)

    log('Generated API HTML')


def generate_html(log):
    if not os.path.exists(HTML_GENERATED):
        os.makedirs(HTML_GENERATED)
    if not os.path.exists(CALENDAR_GENERATED):
        os.makedirs(CALENDAR_GENERATED)

    _generate_rulebook_html(log)
    _generate_calendar_months_html(log)
    _generate_api_html(log)
    shutil.copyfile(os.path.join(HTML_TEMPLATES, 'style.css'), os.path.join(HTML_GENERATED, 'style.css'))
