from components.component import Component


class Modifier(Component):

    def __init__(self, name, formula, value=None):
        super(Modifier, self).__init__(name, 'Attribute')
        self.formula = formula
        self.value = value

    def info(self):
        return '%s[name="%s"]' % (
            self.cname, self.name
        )
