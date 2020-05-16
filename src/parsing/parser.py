from src.parsing.attribute import Attribute
from src.parsing.buff import Buff
from src.parsing.condition import Condition
from src.parsing.clazz import Clazz
from src.parsing.race import Race
from src.parsing.skill import Skill


# Cut off period at the end, if there is one
def _trim(string):
    result = string.strip()

    if result[-1] == '.':
        result = result[:-1]

    if result[-1] == '­':
        result = result[:-1]

    return result


# There's a weird mix of two types of dashes to deal with
def _get_split_char(string):
    indexes = {}
    chars = ['-', '–']
    for char in chars:
        if char in string:
            indexes[string.index(char)] = char
    if not indexes:
        raise Exception('No dash to split on it "%s"' % string)
    return indexes[min(indexes.keys())]


# Parse attributes section into objects
def parse_attributes(lines):
    attributes = []

    # Dump first 2 lines (title and description)
    lines = lines[2:]

    # Handle in sets of 1
    for i in range(0, len(lines)):
        attribute_line = lines[i]

        # Split further
        attribute_full = attribute_line.split('–', 1)[0].strip()
        attribute_name = attribute_full.split(' ', 1)[0].strip()
        attribute_abbreviation = attribute_full.split(' ', 1)[1].strip()[1:-1]
        attribute_description = attribute_line.split('–', 1)[1].strip()

        # Capitalization
        attribute_description = attribute_description[0].capitalize() + attribute_description[1:]

        attribute = Attribute(attribute_name, attribute_abbreviation, attribute_description)
        attributes.append(attribute)

    return attributes


# Parse races section into objects
def parse_races(lines):
    races = []

    # Dump first line (title and description)
    lines = lines[2:]

    # Handle in sets of 4
    for i in range(0, len(lines), 4):
        race_line = lines[i]
        trait1_line = lines[i + 2]
        trait2_line = lines[i + 3]

        if race_line == 'Racial Languages':
            break

        # Split further
        race_name = race_line.split('–')[0].strip()
        race_description = race_line.split('–')[1].strip()
        trait1_name = trait1_line.split('–')[0].strip()
        trait1_description = trait1_line.split('–')[1].strip()
        trait2_name = trait2_line.split('–')[0].strip()
        trait2_description = trait2_line.split('–')[1].strip()

        # Capitalization
        race_description = race_description[0].capitalize() + race_description[1:]
        trait1_description = trait1_description[0].capitalize() + trait1_description[1:]
        trait2_description = trait2_description[0].capitalize() + trait2_description[1:]

        race = Race(race_name, race_description)
        race.add_traits(trait1_name, trait1_description, trait2_name, trait2_description)
        races.append(race)

    return races


# Parse buffs section into objects
def parse_buffs(lines):
    buffs = []

    # Dump first line (title and description)
    lines = lines[2:]

    for line in lines:
        split_char = _get_split_char(line)
        buff_pieces = line.split(split_char)

        name = buff_pieces[0].strip()
        duration = buff_pieces[1]
        duration = duration.split(':')[1].strip()
        description = buff_pieces[2].strip()

        buff = Buff(name, duration, description)
        buffs.append(buff)

    return buffs


# Parse conditions section into objects
def parse_conditions(lines):
    conditions = []

    # Dump first line (title and description)
    lines = lines[2:]

    for line in lines:
        split_char = _get_split_char(line)
        condition_pieces = line.split(split_char)

        name = condition_pieces[0].strip()
        duration = condition_pieces[1]
        duration = duration.split(':')[1].strip()
        description = condition_pieces[2].strip()

        condition = Condition(name, duration, description)
        conditions.append(condition)

    return conditions


# Parse skills section into objects
def parse_skills(lines, attributes):

    def get_attribute(attribute_name):
        for attr in attributes:
            if attribute_name == attr.name:
                return attr

        raise Exception('No attribute found for "%s"' % attribute_name)

    skills = []

    # Dump first 40 lines (title and description)
    lines = lines[40:]

    # Keep track of which lines we've gone through already
    lines = [[line, False] for line in lines]

    # Handle in sets of 5
    for i in range(0, len(lines)):
        if lines[i][1]:
            continue  # Line has been processed as part of a skill already

        if ':' not in lines[i][0]:
            lines[i][1] = True  # This is a header line within skills, ignore it
            continue

        skill_line = lines[i][0]
        lines[i][1] = True
        description_line = lines[i + 1][0]
        lines[i + 1][1] = True
        attribute_line = lines[i + 2][0]
        lines[i + 2][1] = True
        untrained_line = lines[i + 3][0]
        lines[i + 3][1] = True

        # There may be notes for multiple ranks
        rank_lines = []
        start = i + 4
        while start < len(lines) and lines[start][0].startswith('Rank'):
            rank_lines.append(lines[start][0])
            lines[start][1] = True
            start += 1

        # Split each line into fields
        skill_name = _trim(skill_line)
        description = _trim(description_line.split(':')[0])
        attribute = get_attribute(_trim(attribute_line.split(' ')[-1]))
        rank_notes = [('Untrained', _trim(untrained_line.split('–')[1]))]
        for rank_line in rank_lines:
            split_char = _get_split_char(rank_line)
            rank_note = (_trim(rank_line.split(split_char)[0]), _trim(rank_line.split(split_char)[1]))
            rank_notes.append(rank_note)

        skill = Skill(skill_name, description, attribute)
        skill.add_rank_notes(rank_notes)
        skills.append(skill)

    return skills


# Parse classes section into objects
def parse_clazzes(lines, skills):
    clazzes = []

    # Skills listed as requirements for a class don't match skill names perfectly,
    # so this is weird "closest match" logic
    def get_skill(skill_name):
        max_count = 1
        closest_skill_matches = []
        for sk in skills:
            count = 0
            skill_pieces = sk.name.split()
            for piece in skill_name.split():
                if any(piece in skill_piece for skill_piece in skill_pieces):
                    count += 1

            if count > max_count:
                max_count = count
                closest_skill_matches = [sk]
            elif count == max_count:
                closest_skill_matches.append(sk)

        if len(closest_skill_matches) > 1:
            raise Exception('Multiple near matches found for "%s": %s' %
                            (skill_name, [str(match) for match in closest_skill_matches]))

        return closest_skill_matches[0]

    def get_branch(branch_name, clzz):
        for branch in clzz.branches:
            if branch.name == branch_name:
                return branch

    def get_clazz(clzz_name):
        for clzz in clazzes:
            if clzz_name == clzz.name:
                return clzz

        return None

    def parse_clazz_skill(clazz_skill_lines):
        nm = clazz_skill_lines[0]
        ac = clazz_skill_lines[1]
        cst = clazz_skill_lines[2].split(':', 1)[1].strip()
        rg = clazz_skill_lines[3].split(':', 1)[1].strip()
        dur = clazz_skill_lines[5]

        tags_line_index = None
        for j in range(len(clazz_skill_lines)):
            if 'Tags' in clazz_skill_lines[j]:
                tags_line_index = j
                break

        if not tags_line_index:
            raise Exception('Could not find tags line in skill %s' % nm)

        desc = clazz_skill_lines[6:tags_line_index]
        tags_line = clazz_skill_lines[tags_line_index]
        tgs = [tag.strip() for tag in tags_line.split(':', 1)[1].split(',')]

        return nm, ac, cst, rg, dur, desc, tgs

    # Find class hints and dump whatever comes before them
    class_hint_index = 0
    for i in range(len(lines)):
        if lines[i] == 'Class Hint Unlocks':
            class_hint_index = i
            break

    if class_hint_index == 0:
        raise Exception('Did not find class hint unlocks')

    lines = lines[class_hint_index+2:]

    first_class_index = None
    for i in range(0, len(lines)):
        if lines[i] == 'Abjurer':
            first_class_index = i

    if first_class_index is None:
        raise Exception('did not find first class')

    class_hint_lines = lines[0:first_class_index]

    # Process class previews
    num_requirements = None
    for i in range(0, len(class_hint_lines)):
        preview_line = class_hint_lines[i]

        if 'Classes with' in preview_line:
            ints = [int(s) for s in preview_line.split() if s.isdigit()]
            if len(ints) != 1:
                raise Exception('Found more than one integer in line "%s"' % preview_line)
            num_requirements = ints[0]
            continue

        split_char = _get_split_char(preview_line)
        clazz_name = _trim(preview_line.split(split_char, 1)[0].strip())
        rest = preview_line.split(split_char, 1)[1].strip()
        clazz_preview = rest.split('[')[0].strip()
        skill_reqs = rest.split('[')[1].split(']')[0].strip()
        skill_reqs = [skill_req.strip() for skill_req in skill_reqs.split(',')]

        clazz = get_clazz(clazz_name)
        if clazz:
            raise Exception('Class %s already exists' % clazz_name)

        clazz = Clazz(clazz_name)
        clazz.add_preview(clazz_preview, skill_reqs, num_requirements)
        clazzes.append(clazz)

    # Process full classes
    i = 0
    lines = lines[first_class_index:]
    while i < len(lines):
        clazz_name = lines[i]
        clazz = get_clazz(clazz_name)
        if not clazz:
            raise Exception('Class %s does not exist' % clazz_name)

        i += 1  # skip requirements line
        requirements = []
        while True:
            i += 1
            if lines[i].startswith('Description'):
                break  # No longer handling requirements, go back to class handling

            requirement = lines[i]
            if requirement.startswith('·'):
                requirement = requirement[1:]
            requirements.append(requirement.strip())

        flavor_text = lines[i + 1]
        description = lines[i + 2]

        branch1_description = lines[i + 3]
        branch2_description = lines[i + 4]
        branch3_description = lines[i + 5]
        branch1_name = branch1_description[3:branch1_description.index('branch')-1].strip()
        branch2_name = branch2_description[3:branch2_description.index('branch')-1].strip()
        branch3_name = branch3_description[3:branch3_description.index('branch')-1].strip()
        branch_names = [branch1_name, branch2_name, branch3_name]
        branch_descriptions = [branch1_description, branch2_description, branch3_description]

        # Get the passive, which may be multiple lines
        i += 5
        passive_line_start = i + 1
        while True:
            if lines[i].startswith(branch1_name):
                break
            i += 1

        passive_lines = lines[passive_line_start:i]
        split_char = _get_split_char(passive_lines[0])
        passive_name = passive_lines[0].split(split_char, 1)[0].split(':', 1)[1].strip()
        passive_description = passive_lines[0].split(split_char, 1)[1].strip()
        if len(passive_lines) > 1:
            passive_description += '\n' + '\n'.join(passive_lines[1:])

        clazz.add_passive(flavor_text, description, requirements, branch_names, branch_descriptions, passive_name,
                          passive_description)

        # Handle class skills
        i -= 1  # because i'm too lazy to do this nicer. i is at the first branch name
        known_tiers = None
        for throw_away in range(3):
            i += 1
            if i == len(lines):
                raise Exception('Out of lines before processing class skills, %s' % clazz)

            current_branch = get_branch(lines[i], clazz)
            if not known_tiers:
                tier = 0
                while True:
                    if lines[i + 1] in branch_names:  # Expecting to find the info line, move to next branch if not
                        known_tiers = tier
                        break  # Done with skills in first branch

                    tier += 1

                    # Determine where skill ends by "Tags" line, because the description can be multiple lines
                    start = i + 1
                    for tag_line_index in range(start, len(lines)):
                        if 'Tags:' in lines[tag_line_index]:
                            end = tag_line_index
                            break
                    else:
                        raise Exception('No tags found while process class "%s"' % clazz_name)

                    name, action, cost, rng, duration, description, tags = parse_clazz_skill(lines[start:end+1])
                    clazz.add_ability(current_branch, tier, name, action, cost, rng, duration, description, tags)
                    i = end

            else:
                for tier in range(known_tiers):
                    # Determine where skill ends by "Tags" line, because the description can be multiple lines
                    start = i + 1
                    for tag_line_index in range(start, len(lines)):
                        if 'Tags:' in lines[tag_line_index]:
                            end = tag_line_index
                            break
                    else:
                        raise Exception('No tags found while process class "%s"' % clazz_name)

                    name, action, cost, rng, duration, description, tags = parse_clazz_skill(lines[start:end+1])
                    clazz.add_ability(current_branch, tier + 1, name, action, cost, rng, duration, description,
                                      tags)
                    i = end

        if clazz not in clazzes:  # Safety check, though it shouldn't be necessary anymore
            clazzes.append(clazz)

        i += 1

    return clazzes


# Read text and parse into objects
def parse_data(lines):
    # Strip whitespace, ignore blank lines, ignore page breaks
    lines = [line.strip() for line in lines]
    lines = [line for line in lines if line != '']
    lines = [line for line in lines if line != '________________']

    attributes_index = None
    races_index = None
    buffs_and_conditions_index = None
    buffs_index = None
    conditions_index = None
    additional_rules_index = None
    skills_index = None
    crafting_index = None
    classes_index = None
    patches_index = None
    for i in range(0, len(lines)):
        if lines[i] == 'Attributes':
            attributes_index = i
        if lines[i] == 'Races':
            races_index = i
        if lines[i] == 'Buffs and Conditions':
            buffs_and_conditions_index = i
        if lines[i] == 'Buffs':
            buffs_index = i
        if lines[i] == 'Conditions':
            conditions_index = i
        if lines[i] == 'Additional Rules':
            additional_rules_index = i
        if lines[i] == 'Skills':
            skills_index = i
        if lines[i] == 'Crafting':
            crafting_index = i
        if lines[i] == 'Classes':
            classes_index = i
        if lines[i] == 'Gameplay Patches':
            patches_index = i

    # Sanity check that we found the expected lines
    assert attributes_index is not None
    assert races_index is not None
    assert buffs_and_conditions_index is not None
    assert buffs_index is not None
    assert conditions_index is not None
    assert additional_rules_index is not None
    assert skills_index is not None
    assert classes_index is not None

    attributes = parse_attributes(lines[attributes_index:races_index])
    races = parse_races(lines[races_index:buffs_and_conditions_index])
    buffs = parse_buffs(lines[buffs_index:conditions_index])
    conditions = parse_conditions(lines[conditions_index:additional_rules_index])
    skills = parse_skills(lines[skills_index:crafting_index], attributes)
    clazzes = parse_clazzes(lines[classes_index:patches_index], skills)

    return attributes, races, buffs, conditions, skills, clazzes
