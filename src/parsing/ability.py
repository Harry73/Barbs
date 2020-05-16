from src.parsing.component import Component

"""
{class} ability: {name}

{branch} branch, tier {tier}

Action: {action}
Cost: {cost}
Range: {range}
Duration: {duration}

{description}

Tags: {tags} 
"""

"""
{name}: {action}, {cost}, {range}, {duration}
{description}
"""


class Ability(Component):

    def __init__(self, name, clazz, branch, tier, action, cost, rng, duration, description, tags):
        super(Ability, self).__init__(name, 'Ability')
        self.clazz = clazz  # a Clazz object
        self.branch = branch
        self.tier = tier
        self.action = action
        self.cost = cost
        self.rng = rng
        self.duration = duration
        self.description = description
        self.tags = tags

    def info(self):
        return ('%s[name="%s", class=%s, branch=%s, tier=%s, action="%s", cost="%s", range="%s", duration="%s", '
                'description="%s", tags=%s]') % (
                   self.cname, self.name, self.clazz, self.branch, self.tier, self.action, self.cost, self.rng,
                   self.duration, self.description, self.tags
               )

    def to_json(self):
        return {
            'type': 'ability',
            'name': self.name,
            'class': self.clazz.name,
            'branch': self.branch.name,
            'tier': self.tier,
            'action': self.action,
            'cost': self.cost,
            'range': self.rng,
            'duration': self.duration,
            'description': self.description,
            'tags': self.tags,
        }
