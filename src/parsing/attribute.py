from src.parsing.component import Component

"""
Attribute: {name} ({abbreviation})

{description}
"""


class Attribute(Component):

    def __init__(self, name, abbreviation, description):
        super(Attribute, self).__init__(name, 'Attribute')
        self.abbreviation = abbreviation
        self.description = description

    def info(self):
        return '%s[name="%s", abbreviation="%s", description="%s"]' % (
            self.cname, self.name, self.abbreviation, self.description
        )

    def to_json(self):
        return {
            'type': 'attribute',
            'name': self.name,
            'abbreviation': self.abbreviation,
            'description': self.description,
        }
