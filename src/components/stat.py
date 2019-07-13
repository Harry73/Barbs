import math

from src.components.component import Component


class Stat(Component):

    def __init__(self, name, formula, value=None):
        super(Stat, self).__init__(name, 'Attribute')
        self.formula = formula
        self.value = value

    def info(self):
        return '%s[name="%s"]' % (
            self.cname, self.name
        )

    def to_json(self):
        return {
            'type': 'stat',
            'name': self.name,
            'value': self.value,
        }


STATS = [
    Stat('Health', lambda v: 100 + 10 * v),
    Stat('Stamina', lambda v: 100 + 10 * v),
    Stat('Mana', lambda v: 100 + 10 * v),
    Stat('Health Regeneration', lambda v: 10 + v),
    Stat('Stamina Regeneration', lambda v: 10 + v),
    Stat('Mana Regeneration', lambda v: 10 + v),
    Stat('Movement Speed', lambda v: 30 + 5 * math.floor(v / 2)),
    Stat('AC', lambda v: 10 + v),
    Stat('Evasion', lambda v: 10 + v),
    Stat('Magic Resist', lambda v: 10 + v),
    Stat('Condition Resist', lambda v: 10 + v),
    Stat('Melee Damage', lambda v: v),
    Stat('Ranged/Fine Damage', lambda v: v),
    Stat('Magic Damage', lambda v: v),
    Stat('Critical Hit Chance', lambda v: 10 + v),
    Stat('Commands', lambda v: math.floor(v + 10) / 10 + 1),
    Stat('Languages', lambda v: math.floor(v + 10) / 3 + 1),
    Stat('Item Efficiency', lambda v: (v + 10) * 5),
    Stat('Buff Limit', lambda v: math.floor(v + 10) / 2),
    Stat('Concentration Limit', lambda v: math.floor(v + 10) / 2),
]
