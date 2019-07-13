# convert things to json hopefully

import os
import json

from src.parser import parse_data

CURRENT_PATH = os.getcwd()
DATA_PATH = os.path.join(CURRENT_PATH, 'data')
DATA_TXT = os.path.join(DATA_PATH, 'data.txt')


# One method to call them all, and in the syntax run them
def main():

    # Read the data file
    with open(DATA_TXT, encoding='utf16') as f:
        lines = f.readlines()

    attributes, races, buffs, conditions, skills, clazzes = parse_data(lines)
    abilities = []
    for clazz in clazzes:
        abilities.extend(clazz.abilities)

    lists = {
        'attributes': attributes,
        'races': races,
        'buffs': buffs,
        'conditions': conditions,
        'skills': skills,
        'clazzes': clazzes,
        'abilities': abilities
    }

    components = []
    for name, l in lists.items():
        for item in l:
            components.append(item.to_json())

    with open(os.path.join(DATA_PATH, 'components.json'), 'w') as f:
        json.dump(components, f, indent=4)



# One method to compose them all, one method to hash them
if '__main__' == __name__:
    main()
