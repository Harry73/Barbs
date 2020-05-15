from src.parsing.component import Component

"""
Buff: {name}

{duration}

{description}
"""


class Buff(Component):

    def __init__(self, name, duration, description):
        super(Buff, self).__init__(name, 'Buff')
        self.duration = duration
        self.description = description

    def info(self):
        return '%s[name="%s", duration="%s", description="%s"]' % (
            self.cname, self.name, self.duration, self.description
        )

    def to_json(self):
        return {
            'type': 'buff',
            'name': self.name,
            'duration': self.duration,
            'description': self.description,
        }
