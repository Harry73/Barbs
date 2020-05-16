from src.parsing.component import Component


class Skill(Component):

    def __init__(self, category, name, description, attribute):
        super(Skill, self).__init__('%s %s' % (category, name), 'Skill')
        self.sub_name = name
        self.category = category
        self.description = description
        self.attribute = attribute  # an Attribute object
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
            'sub_name': self.sub_name,
            'category': self.category,
            'description': self.description,
            'attribute': self.attribute.name,
            'rank_notes': self.rank_notes,
        }
