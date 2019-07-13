import itertools

from player import Player

players = [
    {
        'name': 'Hoshiko/Luna/Ren Nightside',
        'gender': 'Female',
        'race': 'Shifter',
        'height': '5 ft 4 in',
        'weight':  '108',
        'eye_color': 'Amber/Hazel/Red',
        'alignment': 'Neutral Good',
        'languages': [
            'Common',
            'Celestial',
            'Anima',
        ],
        'attributes': {
            'Vitality': 5,
            'Endurance': 0,
            'Spirit': -5,
            'Recovery': -5,
            'Perseverance': -8,
            'Sanity': -10,
            'Agility': 0,
            'Toughness': -10,
            'Reflex': -10,
            'Resistance': 0,
            'Fortitude': -10,
            'Strength': -10,
            'Dexterity': 5,
            'Attunement': -10,
            'Precision': 0,
            'Appeal': -5,
            'Intelligence': -4,
            'Wisdom': 0,
            'Composure': -8,
            'Focus': -10,
        },
        'skills': {
            'Armor: Light': 6,
            'Artistry: Literature': 1,
            'Athletics: Balance': 1,
            'Athletics: Climbing': 1,
            'Crafting: Ranged Weapons': 2,
            'Combat: Dodging': 1,
            'Element Mastery: Air': 6,
            'Gathering: Skinning': 1,
            'Interaction: Deception': 1,
            'Interaction: Intent': 1,
            'Observation: Listening': 2,
            'Weapons: Bows': 8,
            'Weapons: Crossbows': 1,
        },
        'clazzes': {
            'Sniper': [
                'Piercing Shot',
                'Shrapnel Shot',
                'Distance Shooter',
                'Precision Shooter',
                'Swift Sprint',
            ],
        },
    },
]


def process_player(player, components):
    assert 'name' in player
    assert 'gender' in player
    assert 'race' in player
    assert 'height' in player
    assert 'weight' in player
    assert 'eye_color' in player
    assert 'alignment' in player
    assert 'attributes' in player
    assert 'skills' in player
    assert 'clazzes' in player

    def get_component(name, typ):
        for component in components:
            if component['type'] == typ and component['name'] == name:
                return component

        raise ValueError('Component %s not found' % name)

    player_race = get_component(player['race'], 'race')

    player_attributes = []
    for attribute in player['attributes']:
        player_attributes.append(get_component(attribute, 'attribute'))

    player_skills = []
    for skill in player['skills']:
        player_skills.append(get_component(skill, 'skill'))

    player_clazzes = []
    for clazz in player['clazzes'].keys():
        player_clazzes.append(get_component(clazz, 'clazz'))

    player_abilities = []
    for ability in list(itertools.chain.from_iterable(player['clazzes'].values())):
        player_abilities.append(get_component(ability, 'ability'))

    return {
        Player(player['name'], player['gender'], player_race, player['height'], player['weight'],
               player['eye_color'], player['alignment'], player['languages'], player_attributes, player_skills,
               player_clazzes)
    }


def process_players(components):
    return [process_player(player, components) for player in players]
