from src.parsing.component import Component

"""
{class} branch: {name}

Skills:
• Tier 1 - {class_skill}
• Tier 2 - {class_skill}
• Tier 3 - {class_skill}
• Tier 4 - {class_skill}
"""

MAX_TIER = 4


class Branch(Component):

    def __init__(self, name, description, clazz):
        super(Branch, self).__init__(name, 'Branch')
        self.description = description
        self.clazz = clazz  # a Clazz object
        self.class_abilities = []  # list of Ability objects

    def add_ability(self, ability):
        if ability not in self.class_abilities:
            self.class_abilities.append(ability)

    def info(self):
        return '%s[name="%s", description="%s", clazz=%s]' % (self.cname, self.name, self.description, self.clazz)

    def to_json(self):
        return {
            'type': 'branch',
            'name': self.name,
            'description': self.description,
            'class': self.clazz.name,
            'abilities': [ability.name for ability in self.class_abilities],
        }
