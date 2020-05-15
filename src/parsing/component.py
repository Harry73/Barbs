class Component:

    def __init__(self, name, cname):
        self.name = name
        self.cname = cname

    def __str__(self):
        return '%s[%s]' % (self.cname, self.name)

    def __repr__(self):
        return self.__str__()

    def __eq__(self, other):
        return self.name.lower() == other.name.lower()

    def __ne__(self, other):
        return not self.name.lower() == other.name.lower()

    def __cmp__(self, other):
        return self.name.lower() == other.name.lower()

    def __hash__(self):
        return hash(self.name)
