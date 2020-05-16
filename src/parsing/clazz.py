from src.parsing.branch import Branch
from src.parsing.ability import Ability
from src.parsing.component import Component


class Clazz(Component):

    def __init__(self, name):
        super(Clazz, self).__init__(name, 'Clazz')
        self.full = False
        self.preview = ''
        self.flavor_text = ''
        self.description = ''
        self.num_requirements = 0
        self.known_requirements = []
        self.full_requirements = []
        self.branches = []
        self.passive = {}
        self.abilities = []

    def add_preview(self, preview, skill_reqs, num_requirements):
        self.preview = preview
        self.known_requirements.extend(skill_reqs)
        self.num_requirements = num_requirements

    def add_passive(self, flavor_text, description, num_reqs, skill_reqs, branch_names, branch_descriptions,
                    passive_name, passive_description):
        self.full = True
        self.flavor_text = flavor_text
        self.description = description
        self.num_requirements = num_reqs
        self.full_requirements = list(skill_reqs)  # TODO: change this to dict() if I can parse requirements better
        for i, branch_name in enumerate(branch_names):
            branch = Branch(branch_name, branch_descriptions[i], self)
            if branch not in self.branches:
                self.branches.append(branch)
        self.passive = {passive_name: passive_description}

    def add_ability(self, branch, tier, name, action, cost, rng, duration, description, tags):
        ability = Ability(name, self, branch, tier, action, cost, rng, duration, description, tags)
        if ability not in self.abilities:  # 'in' relies on __eq__() underneath
            self.abilities.append(ability)
        branch.add_ability(ability)

    def info(self):
        return ('%s[name="%s", preview="%s", flavor_text="%s", description="%s", num_requirements=%s, '
                'known_requirements=%s, full_requirements=%s, branches=%s, passive=%s, abilities=%s]') % (
            self.cname, self.name, self.preview, self.flavor_text, self.description, self.num_requirements,
            self.known_requirements, self.full_requirements, self.branches, self.passive, self.abilities
        )

    def to_json(self):
        j = {
            'type': 'class',
            'name': self.name,
            'num_requirements': self.num_requirements,
        }

        if self.passive:
            j.update({
                'flavor_text': self.flavor_text,
                'description': self.description,
                'requirements': self.full_requirements,
                'branches': [branch.name for branch in self.branches],
                'passive': self.passive,
                'abilities': [ability.name for ability in self.abilities],
            })
        else:
            j.update({
                'preview': self.preview,
                'requirements': self.known_requirements,
            })

        return j
