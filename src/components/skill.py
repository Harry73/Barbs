from src.components.component import Component


class Skill(Component):

    def __init__(self, name, description, attribute, value=None):
        super(Skill, self).__init__(name, 'Skill')
        self.description = description
        self.attribute = attribute  # an Attribute object
        self.value = value
        self.rank_notes = {}

    # Expects notes in an array of pairs
    def add_rank_notes(self, ranks):
        for rank in ranks:
            self.rank_notes[rank[0]] = rank[1]

    def info(self):
        return '%s[name="%s", description="%s", attribute=%s, rank_notes=%s]' % (
            self.cname, self.name, self.description, self.attribute, self.rank_notes
        )

    def to_json(self):
        return {
            'type': 'skill',
            'name': self.name,
            'description': self.description,
            'attribute': self.attribute.name,
            'value': self.value,
            'rank_notes': self.rank_notes,
        }
