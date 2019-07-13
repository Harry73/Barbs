from components.component import Component

"""
Player: {name}

Known skills:
• {name} - {rank}
• {name} - {rank}
...

Class previews:
{class_name}, {class_name}, {class_name}, ...

Class unlocks:
{class_name}, {class_name}, {class_name}, ...
"""


class Player(Component):

    def __init__(self, name, gender, race, height, weight, eye_color, alignment, languages, attributes, skills={},
                 clazzes=None):
        super(Player, self).__init__(name, 'Player')
        self.gender = gender
        self.race = race
        self.height = height
        self.weight = weight
        self.eye_color = eye_color
        self.alignment = alignment
        self.languages = languages
        self.attributes = attributes
        self.stats = None
        self.skills = skills
        self.clazzes = clazzes if clazzes else {}
        self.full_clazzes = []
        self.preview_clazzes = []
        self.items = []

    def add_skill(self, skill):
        for k, v in skill.items():
            self.skills[k] = v

    def add_full_clazz(self, clazz):
        if clazz not in self.full_clazzes:
            self.full_clazzes.append(clazz)

        if clazz in self.preview_clazzes:
            self.preview_clazzes.remove(clazz)

    def add_preview_clazz(self, clazz):
        if clazz not in self.preview_clazzes:
            self.preview_clazzes.append(clazz)

    def info(self):
        return '%s[name="%s", skills=%s, preview_clazzes=%s, full_clazzes=%s]' % (
            self.cname, self.name, self.skills, self.preview_clazzes, self.full_clazzes
        )
