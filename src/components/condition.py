from src.components.component import Component

"""
Condition: {name}

{duration}

{description}
"""


class Condition(Component):

    def __init__(self, name, duration, description):
        super(Condition, self).__init__(name, 'Condition')
        self.duration = duration
        self.description = description

    def info(self):
        return '%s[name="%s", duration="%s", description="%s"]' % (
            self.cname, self.name, self.duration, self.description
        )

    def to_json(self):
        return {
            'type': 'condition',
            'name': self.name,
            'duration': self.duration,
            'description': self.description,
        }
