from src.parsing.component import Component

"""
Race: {name}

{description}

Traits:
• {name} - {description}
• {name} - {description}
"""


class Race(Component):

    def __init__(self, name, description):
        super(Race, self).__init__(name, 'Race')
        self.description = description
        self.traits = {}

    def add_traits(self, trait1_name, trait1_description, trait2_name, trait2_description):
        self.traits = {
            trait1_name: trait1_description,
            trait2_name: trait2_description,
        }

    def info(self):
        return '%s[name="%s", description="%s", traits=%s]' % (self.cname, self.name, self.description, self.traits)

    def to_json(self):
        return {
            'type': 'race',
            'name': self.name,
            'description': self.description,
            'traits': self.traits,
        }
