
const characters_by_owner = {
    'Hoshiko Nightside': [
        'Ian',
        'Ian P.',
        'Hoshiko Nightside',
        '-LjmvO3KlA-S3iHQlRW3',
    ],
    'Ren Nightside': [
        'Ian',
        'Ian P.',
        'Ren Nightside',
        '-LjmvO3KlA-S3iHQlRW3',
    ],
    'Luna Nightside': [
        'Ian',
        'Ian P.',
        'Luna Nightside',
        '-LjmvO3KlA-S3iHQlRW3',
    ],
    'Edwin Markov (Adric Vapeiros)': [
        'Edwin Markov (Adric Vapeiros)',
        'Ahasan R.',
        'Ahasan',
        '-Ljmverqp4J9xjCdHGq4',
    ],
    'Kirin Inagami': [
        'Kirin Inagami',
        'Sanjay N.',
        'Sanjay',
        '-Lk1li2MqriN_SAJ1ARF',
    ],
    'Russ': [
        'Russ',
        'Ravi B.',
        'Ravi',
        '-Lk7Ovry6ltsLmK8qnUY',
    ],
    'Russ Finnegan': [
        'Russ Finnegan',
        'Ravi B.',
        'Ravi',
        '-Lk7Ovry6ltsLmK8qnUY',
    ],
    'Cordelia Tenebris': [
        'Cordelia Tenebris',
        'Jason',
        'Jason V.',
    ],
    "Suro N'Gamma": [
        "Suro N'Gamma",
        'Steve K.',
        'Steve',
    ],
    'Orpheus Glacierum': [
        'Orpheus Glacierum',
        'Matthew H.',
        'Matthew',
        'Matt H.',
        'Matt',
    ],
    'Faust Brightwood': [
        'Faust Brightwood',
        'Nevil A.',
        'Nevil,',
        'Drenion',
        'Drenion A.',
    ],
    'Janatris': [
        'Janatris',
        'Daniel B.',
        'Daniel',
        'Dan B.',
        'Dan',
    ],
};


// ########################################################
// Stats

class Stat {

    constructor(name, attr_tla, formula) {
        this.type = 'stat';
        this.name = name;
        this.attr_tla = attr_tla;
        this.formula = formula;
    }

    value(v) {
        return this.formula(v);
    }
}

const STATS = [
    new Stat('health', 'VIT', function(v) { return 100 + 10 * v }),
    new Stat('stamina', 'END', function(v) { return 100 + 10 * v }),
    new Stat('mana', 'SPT', function(v) { return 100 + 10 * v }),
    new Stat('health regeneration', 'RCV', function(v) { return 10 + v }),
    new Stat('stamina regeneration', 'PER', function(v) { return 10 + v }),
    new Stat('mana regeneration', 'SAN', function(v) { return 10 + v }),
    new Stat('movement speed', 'AGI', function(v) { return 30 + 5 * Math.floor(v / 2) }),
    new Stat('ac', 'TGH', function(v) { return 10 + v }),
    new Stat('evasion', 'REF', function(v) { return 10 + v }),
    new Stat('magic resist', 'RES', function(v) { return 10 + v }),
    new Stat('condition resist', 'FRT', function(v) { return 10 + v }),
    new Stat('melee damage', 'STR', function(v) { return v }),
    new Stat('ranged fine damage', 'DEX', function(v) { return v }),
    new Stat('magic damage', 'ATN', function(v) { return v }),
    new Stat('critical hit chance', 'PRE', function(v) { return 10 + v }),
    new Stat('commands', 'APL', function(v) { return Math.floor((v + 10) / 10) + 1 }),
    new Stat('languages', 'INT', function(v) { return Math.floor((v + 10) / 3) + 1 }),
    new Stat('item efficiency', 'WIS', function(v) { return (v + 10) * 5 }),
    new Stat('buff limit', 'COM', function(v) { return Math.floor((v + 10) / 2) }),
    new Stat('concentration limit', 'FCS', function(v) { return Math.floor((v + 10) / 2) }),
];


function get_stat(name) {
   for (let i = 0; i < STATS.length; i++) {
       if (STATS[i].name === name) {
           return STATS[i];
       }
   }

   return null;
}


// ####################################################################################################################
// Main components, excluding items

// individual collections are built at the end off of `components`, which has everything
let attributes = [];
let abilities = [];
let races = [];
let clazzes = [];
let skills = [];
let buffs = [];
let conditions = [];
let components = [
    {
        "type": "attribute",
        "name": "Vitality",
        "abbreviation": "VIT",
        "description": "A measure of your physical fitness and how well your body can persevere through damage, pain, trauma, and exercise. PC health starts at a base of 100, plus or minus 10 times your Vitality modifier. A PC with -10 VIT will have a max health of 1.",
        "value": null
    },
    {
        "type": "attribute",
        "name": "Endurance",
        "abbreviation": "END",
        "description": "A measure of how well your character can exert his body for physically demanding actions. PC stamina starts at a base of 100, plus or minus 10 times your Endurance modifier. Stamina can be zero if your END is -10.",
        "value": null
    },
    {
        "type": "attribute",
        "name": "Spirit",
        "abbreviation": "SPT",
        "description": "A measure of your ability to draw upon magical reserves in an efficient manner. PC mana starts at a base of 100, plus or minus 10 times your Spirit modifier. Mana can be zero if your SPT is -10.",
        "value": null
    },
    {
        "type": "attribute",
        "name": "Recovery",
        "abbreviation": "RCV",
        "description": "A measure of your ability to heal moderate wounds. Health Regeneration starts at 0% for a PC with -10 RCV, and goes up 1% for each point.",
        "value": null
    },
    {
        "type": "attribute",
        "name": "Perseverance",
        "abbreviation": "PER",
        "description": "A measure of your ability to maintain physical activity over long periods of time. Stamina Regeneration starts at 0% for a PC with -10 PER, and goes up 1% for each point.",
        "value": null
    },
    {
        "type": "attribute",
        "name": "Sanity",
        "abbreviation": "SAN",
        "description": "A measure of your ability to maintain mental acuity even after rigorous brain function. Mana Regeneration starts at 0% for a PC with -10 SAN, and goes up 1% for each point.",
        "value": null
    },
    {
        "type": "attribute",
        "name": "Agility",
        "abbreviation": "AGI",
        "description": "A measure of your swiftness. PCs have a base movement speed of 30 feet if they have 0 AGI. Every two points of AGI provides 5 feet of movement speed. A PC with -10 AGI has a movement speed of 5.",
        "value": null
    },
    {
        "type": "attribute",
        "name": "Toughness",
        "abbreviation": "TGH",
        "description": "A measure of your body\u2019s resistance to damage. Armor Class (AC) is a flat reduction to physical damage taken, and is equal to 10 plus or minus your Toughness modifier. Usually a PC\u2019s AC comes from two sources: their TGH and their worn armor.",
        "value": null
    },
    {
        "type": "attribute",
        "name": "Reflex",
        "abbreviation": "REF",
        "description": "A measure of how quickly you can avoid an incoming threat without thought. Evasion is a percentage chance to avoid an attack targeted against you and is equal to 10% plus or minus or Reflex modifier in percentage points. Usually a PC\u2019s Evasion comes from two sources: their REF and their worm armor.",
        "value": null
    },
    {
        "type": "attribute",
        "name": "Resistance",
        "abbreviation": "RES",
        "description": "A measure of your body\u2019s natural resistance to magical damage. Magic Resist is a flat reduction to all types of magic damage taken, and is equal to 10% plus or minus your Resistance modifier. Usually a PC\u2019s Magic Resist comes from two sources: their RES and their worm armor.",
        "value": null
    },
    {
        "type": "attribute",
        "name": "Fortitude",
        "abbreviation": "FRT",
        "description": "A measure of your body\u2019s natural resistance to debilitating effects. Base condition resistance for a PC is 0% for a PC with -10 FRT, and you gain 1% resistance for each point of FRT, up to a max base condition resistance of 30% at 20 FRT",
        "value": null
    },
    {
        "type": "attribute",
        "name": "Strength",
        "abbreviation": "STR",
        "description": "A measure of how hard you can work your muscles. Strength increases physical damage with melee weapons by a flat amount equal to the modifier.",
        "value": null
    },
    {
        "type": "attribute",
        "name": "Dexterity",
        "abbreviation": "DEX",
        "description": "A measure of how finely you can work your muscles. Dexterity increases physical damage with ranged and fine weapons by a flat amount equal to the modifier.",
        "value": null
    },
    {
        "type": "attribute",
        "name": "Attunement",
        "abbreviation": "ATN",
        "description": "A measure of how strong your link with your magical reserves is. Attunement increases magic damage by a flat amount equal to the modifier.",
        "value": null
    },
    {
        "type": "attribute",
        "name": "Precision",
        "abbreviation": "PRE",
        "description": "A measure of how easily you can execute actions that require specialized precision. Precision increases your critical chance by 1% for each point for a max critical chance of 30% at 20 PRE.",
        "value": null
    },
    {
        "type": "attribute",
        "name": "Appeal",
        "abbreviation": "APL",
        "description": "A measure of how strong your personality is and how easily you influence the actions of others. For every ten points of APL you have above -10, you gain one additional command during a Command Major Action, for a possible total of 4 commands per action at 20 APL.",
        "value": null
    },
    {
        "type": "attribute",
        "name": "Intelligence",
        "abbreviation": "INT",
        "description": "A measure of how good you are at storing information and using it when you need it; in other words, how book-smart you are. The number of languages you can learn and retain starts at 1 for a PC with -10 INT, and every 3 points of INT gets you another language slot.",
        "value": null
    },
    {
        "type": "attribute",
        "name": "Wisdom",
        "abbreviation": "WIS",
        "description": "A measure of how good you are at using what you\u2019ve learned through your experiences and applying your problem-solving abilities; in other words, how street-smart you are. Wisdom affects your Item Efficiency stat, which increases the effectiveness of items you use by a percentage. Each point of WIS gives you 5% more Item Efficiency, for a maximum Item Efficiency of 150% at 20 WIS",
        "value": null
    },
    {
        "type": "attribute",
        "name": "Composure",
        "abbreviation": "COM",
        "description": "A measure of how well you hold up under the effect of multiple mental strains. Buff Limit is a stat that defines how many buffs you can have active on you with full benefit. Every two points of COM above -10 increases your Buff Limit by 1, for a maximum Buff Limit of 15 for a PC with 20 COM.",
        "value": null
    },
    {
        "type": "attribute",
        "name": "Focus",
        "abbreviation": "FCS",
        "description": "A measure of your ability to multitask and divide your attention without a drop in the quality of your action execution. Concentration Limit is a stat that defines how many magical effects you can actively maintain at any given time with full benefit. Every two points of FCS above -10 increases your Concentration Limit by 1, for a maximum Concentration Limit of 15 for a PC with 20 FCS.",
        "value": null
    },
    {
        "type": "race",
        "name": "Aasimar",
        "description": "The aasimar is a race of celestial beings, and are essentially the closest playable race to an angel. They mostly appear human, although they\u2019re much more attractive than the average human. In darkness, they glow softly with holy radiance, and they have white feathered wings. The aasimar tend to gravitate towards the tenets of lawfulness and good.",
        "traits": {
            "Wings": "The aasimar can activate the magic in its wings to fly and glide at a speed equal to its ground speed. Flying consumes 1 stamina per 5 seconds (12 stamina per minute). Flying takes concentration.",
            "Aura": "The aasimar is protected by a celestial aura, making it immune to bodily possession by ghosts, demons, etc."
        }
    },
    {
        "type": "race",
        "name": "Merfolk",
        "description": "The merfolk are a race of half humanoid, half fish beings that live deep within the oceans. They can freely transform their lower half from that of a fish to human legs. They always smell like the ocean. Women far outnumber men, and are known for their beautiful songs that lure fishermen into the ocean, although this tends to be for the purpose of theft or play rather than any other more evil scheme.",
        "traits": {
            "Fishtail": "The merfolk can freely transform its legs into a fish tail and can breathe underwater.",
            "Song": "The merfolk can sing a melody that causes one intelligent character to be charmed for 1 minute, treating the merfolk as a friend for the duration. Song can be used once per day and has a chance of failure, and the charm breaks if the affected target takes any damage. Maintaining the charm takes concentration."
        }
    },
    {
        "type": "race",
        "name": "Demonspawn",
        "description": "The demonspawn are a race of humanity tainted by the seed of hellish demons. They tend to have red, purple, or black hair and various vestigial demon parts (horns, tail, small wings, claws, etc.). Demonspawn tend towards evil but some overcome the bestial nature of their own flesh to become heroes.",
        "traits": {
            "Summon": "The demonspawn can summon a small fiend familiar as a free action. It takes the shape of a flying eyeball. The demonspawn can see through the familiar\u2019s eye. The familiar can go invisible freely, but cannot interact with items or characters, and is barred by obstacles. Maintaining the familiar takes concentration.",
            "Curse": "The demonspawn can curse a piece of equipment or an item as a major action so that it cannot be unequipped/dropped."
        }
    },
    {
        "type": "race",
        "name": "Beastkin",
        "description": "The beastkin are mostly human but display a variety of physical traits of animals. From squirrel tails to lion manes to cat ears, the sheer phenotypic variety of the beastkin is impressive, despite being limited to land-dwelling mammals. While beastkin have comparable intelligence to the other races, they are also strongly influenced by their animal instincts.",
        "traits": {
            "Senses": "The beastkin can never be surprised and is alert to incoming danger within 100 feet, even while asleep",
            "Athleticism": "The beastkin\u2019s climbing speed is equal to its ground speed, and it can easily climb without needing handholds or footholds."
        }
    },
    {
        "type": "race",
        "name": "Kajeem",
        "description": "The kajeem are a race of underground dwelling, reptilian creatures. Instead of skin, they have flesh-like scales. They also have strong, muscular tails, forked-tongues, reptilian eyes, and bony spines protruding from their bodies. While they share the strong muscles of the reptile family, they are not cold-blooded, so they can live underground no problem. It is said they are descended from wingless dragons.",
        "traits": {
            "Venom": "The kajeem can apply a potent poison with its bite, paralyzing a target for 1 hour (if the target has a circulation system). This paralysis reduces the target\u2019s movement speed to 5 feet. Venom can be used once per day.",
            "Regeneration": "The kajeem can regenerate a lost limb over a three day healing period"
        }
    },
    {
        "type": "race",
        "name": "Dryad",
        "description": "The dryads are a group of intelligent plant humanoids. They have green, fibrous skin with a waxy protective covering, and they are hairless; instead, they have numerous leaves and branches all over their body",
        "traits": {
            "Roots": "The dryad is immune to knockups, knockdowns, pushes, and pulls.",
            "Treeform": "The dryad can turn into a regular tree as a method of disguise. The appearance and height of the tree is up to the dryad. Treeform requires concentration."
        }
    },
    {
        "type": "race",
        "name": "Overmind",
        "description": "The overminds are a race of transcendent humans. Due to powerful psionic abilities morphing their genomes, they display a number of drastic physiological differences from their human progenitors, including blue skin and glowing blue eyes. They tend to live near the ocean, which further altered their abilities.",
        "traits": {
            "Telekinesis": "The overmind can pull any object to its location within 20 feet as a minor action, as long as the object\u2019s weight doesn\u2019t exceed 10 pounds.",
            "Waterwalking": "The overmind can walk on the surface of water"
        }
    },
    {
        "type": "race",
        "name": "Djinn",
        "description": "The djinns are a race of fire spirits with the bodies of regular humans. They are a race shrouded in mystery and myth; in reality, they do not live in lamps or grant wishes. Instead, they are one of two races that dwell in the deserts, and employ various types of magic to hide from travelers.",
        "traits": {
            "Mirage": "The djinn can, as a major action, create a visual illusion no larger than a 5 foot cube. The illusion makes no sound, smell, and physical interaction with it reveals it to be an illusion.",
            "Pyrokinesis": "The djinn can, as a minor action, set fire to an object within 30 feet that it can see. The object cannot be one that is worn or held by another creature, and must be flammable to begin with."
        }
    },
    {
        "type": "race",
        "name": "Shade",
        "description": "The shades are a line of humans tainted by spirits of darkness. Just like these spirits, the shades are at best, mistrusted, and at worst, feared. In reality, there are just as many kindly shades as there are evil ones. They mostly look like regular humans, but their pale gray skin gives them away, so they tend to hide from others.",
        "traits": {
            "Shadows": "The shade can go invisible when in darkness. Maintaining invisibility requires concentration, and counts as a buff.",
            "Blind": "Once per day, the shade can inflict the Blind debuff as a minor action to up to six creatures in sight within 40 feet."
        }
    },
    {
        "type": "race",
        "name": "Manti",
        "description": "The manti are a race of half-insect, half-humans. Prominent features include large raptorial arms with inward-facing cartilage blades/spikes and thin, colorful, translucent wings. By day the manti are merciless hunters; by night they are ravenous lovers and merrymakers",
        "traits": {
            "Blades": "The manti has arms that can be effectively used like shortswords, and the bladed portion of their arms can be retracted and deployed freely.",
            "Carapace": "The manti can use a reaction to thicken their skin and nullify incoming physical damage. Carapace can be used once per day."
        }
    },
    {
        "type": "race",
        "name": "Vampire",
        "description": "The vampires are an old race of nocturnal bloodsuckers. In the past, they used to blend in with human communities, creating devoted thralls through their bite and feeding upon humans with ease. Over time, the vampire race has weakened as a result of interracial breeding; modern vampires cannot create thralls even though they still require blood. On the flip side, many of their weaknesses have also been phased out of the genome.",
        "traits": {
            "Drain": "The vampire can drink blood as a major action from a living creature, which heals the Vampire for 20% of its maximum health. Can be used once daily.",
            "Blood": "The vampire is immune to poison and disease"
        }
    },
    {
        "type": "race",
        "name": "Elf",
        "description": "The elves are a race that live in the desert, and are one of the few races that are not descended of ancient humanity, despite quite possibly being one of the few remaining races that could pass for humans. They are dark skinned with long ears, and hair color tends to be light (white, blond, etc). They\u2019ve adapted heavily to life in the desert, and are fiercely loyal to friends and family.",
        "traits": {
            "Adapt": "The elf is immune to all effects caused by weather and is comfortable in extreme heat",
            "Hawkeye": "The elf can see even small details from up to a mile away, and can see bodies of heat even through thin walls."
        }
    },
    {
        "type": "race",
        "name": "Cyclops",
        "description": "The cyclopes are a race of giants with a single eye and horn distinguishing them. They are larger than most of the other races and live high in the mountains. They are prolific traders as well, so many can be found on the roads with precious metals they\u2019ve mined from their homes. Other cyclopes join armies, where their size gives them a significant advantage in combat.",
        "traits": {
            "Quake": "The cyclops can, as a major action, cause a tremor that knocks down any number of target creatures within 60 feet, once per day",
            "Strength": "The cyclops can equip heavy weapons in their mainhand alone"
        }
    },
    {
        "type": "race",
        "name": "Dwarf",
        "description": "The dwarves are a race of short, stocky humanoids that live in extremely cold areas, carving their homes out of glaciers. They value tradition and show it through the intricate design of their ice buildings and sculptures. They\u2019ve adapted to life in the snow and ice, and make their homes high in the snowy caps of mountains or in tundra near the poles.",
        "traits": {
            "Adapt": "The dwarf is immune to all effects caused by weather and is comfortable in extreme cold",
            "Build": "The dwarf can, as a major action, rapidly build a small building that can house up to seven people uncomfortably"
        }
    },
    {
        "type": "race",
        "name": "Chrom",
        "description": "The chroms are a race of humans infused with metal magics from birth. As a result, they have skin of soft metal and their bones and sometimes spines of metal sticking out of their bodies. Unfortunately, all this extra metal isn\u2019t much stronger than regular human bones and skin.",
        "traits": {
            "Metalskin": "The chrom is immune to Bleed, Corrode, and Paralysis",
            "Metaltouch": "The chrom can touch a single object as a minor action and turn it into metal. Maintaining the object\u2019s metallic form requires concentration."
        }
    },
    {
        "type": "race",
        "name": "Arrist",
        "description": "The arrists are humans who, through the use of magic tattoos through many generations, have infused their skin with arcane runes. Their magic seeps down to their very genome; arrist children are born with unique tattoos providing special effects related to family lineage. Their skin is usually beige or gray",
        "traits": {
            "Tattoo": "The arrist can, as a minor action, activate their tattoo.",
            "Draw": "The arrist can, as a free action once per day, change their Tattoo effect to grant one of the following buffs: AC +10, Evasion +10%, MR (all types) +20%, Condition Resist +20%, Movement Speed +20 ft"
        }
    },
    {
        "type": "race",
        "name": "Zoltron",
        "description": "The zoltrons are a race of humanoids whose natural electrical currents have evolved beyond that of any other race. They have no obvious traits except that they tend to have static running across their skin. They\u2019re generally dark skinned and make their homes in caves high up in the mountains, where they can harness energy from the frequent lightning storms",
        "traits": {
            "Flash": "The zoltron can teleport 30 feet as a minor action three times per day",
            "Sparks": "The zoltron can emit a flurry of non-damaging, multicolored sparks in a 15 foot cone"
        }
    },
    {
        "type": "race",
        "name": "Shifter",
        "description": "The shifters have no set physical form; they borrow features from all of the other races. They can freely change their appearance in order to suit needs such as espionage and crime avoidance. As a result, shifters are seen as untrustworthy by other races.",
        "traits": {
            "Shift": "The shifter can, as a major action, change its physical appearance, but cannot change height or weight significantly. Shifting consumes 20 stamina.",
            "Mimic": "The shifter can imitate the voice of any person whose voice they\u2019ve heard."
        }
    },
    {
        "type": "race",
        "name": "Manalith",
        "description": "The manaliths are made of pure mana, solidified and brought to life. No one knows whether they evolved naturally or were created by mages of ancient times. The mana that makes up their lifeblood seeps through their veins and empowers their spells. They dwell in temples throughout the world, secluded from the rest of society.",
        "traits": {
            "Casting": "The manalith can, once per day, cast a spell without consuming any mana., after rolling damage/effects",
            "Penetration": "The manalith can, one per day, have a spell ignore an enemy\u2019s Magic Defense, after rolling damage"
        }
    },
    {
        "type": "race",
        "name": "Human",
        "description": "The most prolific race on the planet, humans have been around longer than any other race. It is said that all other races are descendant from ancient humans, which is extremely likely given the race\u2019s propensity to mate with anything that moves. The human race is the most balanced choice for players who don\u2019t like the demi-human races presented above.",
        "traits": {
            "Scavenge": "The human has 20% better gather rates",
            "Create": "The human has 20% better crafting rates"
        }
    },
    {
        "type": "buff",
        "name": "Hidden",
        "duration": "Until broken",
        "description": "Enemies cannot track you for the purposes of targeting you. If you attack an enemy while Hidden, you will lose the Hidden buff, but your target cannot use a Reaction in response to the attack."
    },
    {
        "type": "buff",
        "name": "Immunity",
        "duration": "Permanent",
        "description": "You have immunity to a certain type of damage or a certain condition. Some entities will have innate immunity, which is not a buff."
    },
    {
        "type": "buff",
        "name": "Increased Stats",
        "duration": "Varies",
        "description": "You have your stats increased temporarily due to the effects of skills, abilities, consumables, items, battlefield effects, etc."
    },
    {
        "type": "buff",
        "name": "Invisible",
        "duration": "1 minute",
        "description": "You are Hidden and cannot be seen at all. Hidden is not lost until this buff ends."
    },
    {
        "type": "condition",
        "name": "Bleeding",
        "duration": "Until broken",
        "description": "At the beginning of each of your turns, you take a varying amount of physical damage. Skill checks can be used to cleanse this condition, as determined by the DM."
    },
    {
        "type": "condition",
        "name": "Blinded",
        "duration": "1 minute",
        "description": "Ranged attacks you make always miss. Melee attacks you make have a 50% chance of missing before factoring in your target\u2019s Evasion. You automatically fail skill check requiring sight, like Search. You have no line of sight for targeting with spells."
    },
    {
        "type": "condition",
        "name": "Cursed",
        "duration": "Varies",
        "description": "When you have at least 3 curses, you instantly take Xd20 dark magic damage, where X is the number of curses you have"
    },
    {
        "type": "condition",
        "name": "Charmed",
        "duration": "Varies",
        "description": "You consider the entity that charmed you as a friend."
    },
    {
        "type": "condition",
        "name": "Confused",
        "duration": "1 minute",
        "description": "When you move or make an attack, you will move in a random direction instead of your intended direction."
    },
    {
        "type": "condition",
        "name": "Crippled",
        "duration": "Until cleansed",
        "description": "Your movement speed is halved and you cannot jump, climb, or take flight through physical means."
    },
    {
        "type": "condition",
        "name": "Decreased Stats",
        "duration": "Varies",
        "description": "You have your stats decreased temporarily due to the effects of skills, abilities, consumables, items, battlefield effects, etc."
    },
    {
        "type": "condition",
        "name": "Fear",
        "duration": "1 minute",
        "description": "You cannot move towards the object of your fear."
    },
    {
        "type": "condition",
        "name": "Frozen",
        "duration": "1 minute",
        "description": "You cannot take any actions. You gain 10 AC. If you are attacked, Frozen has a 50% chance of being cleansed."
    },
    {
        "type": "condition",
        "name": "Helpless",
        "duration": "Until broken",
        "description": "You are susceptible to non-combat execution."
    },
    {
        "type": "condition",
        "name": "Immobilized",
        "duration": "Varies",
        "description": "You may not take the Move Action or dash."
    },
    {
        "type": "condition",
        "name": "Knocked Down (Prone)",
        "duration": "Until broken",
        "description": "You lie prone on the floor, and cannot take a Move Action unless you get up, which takes half your movement. Being prone may also confer other effects depending on other abilities or situations."
    },
    {
        "type": "condition",
        "name": "Knocked Up (Airborne)",
        "duration": "Until the beginning of target\u2019s next turn",
        "description": "You are helplessly flying in the air and cannot evade or use reactions. At the beginning of your next turn you fall to the ground prone unless you make an appropriate skill check to land on your feet."
    },
    {
        "type": "condition",
        "name": "Paralyzed",
        "duration": "1 minute",
        "description": "When you take a Move or Major Action, you have a 25% chance of failing the action. This condition can stack multiple times, and each additional stack increases the chance of failing your action by 25%, up to a limit of 3 stacks for a 75% failure chance."
    },
    {
        "type": "condition",
        "name": "Petrified",
        "duration": "1 minute",
        "description": "You cannot take any actions. You become attuned to earth. At the beginning of your turn you can make an appropriate skill check to break out of your stone casing."
    },
    {
        "type": "condition",
        "name": "Silenced",
        "duration": "Varies",
        "description": "You cannot speak or cast spells."
    },
    {
        "type": "condition",
        "name": "Sleeping",
        "duration": "Until broken",
        "description": "You are asleep, and cannot take any actions nor perceive anything. You are considered helpless. If you are attacked, Sleeping is cleansed. Other entities can use a Minor Action to shake you awake, and you can also be awakened by loud noises."
    },
    {
        "type": "condition",
        "name": "Slowed",
        "duration": "1 minute",
        "description": "Your movement speed is halved."
    },
    {
        "type": "condition",
        "name": "Stunned",
        "duration": "1 round",
        "description": "You cannot take any actions."
    },
    {
        "type": "condition",
        "name": "Taunted",
        "duration": "1 minute",
        "description": "When you make an attack on an enemy that did not Taunt you, roll a d6. If you roll 4 or lower, you must redirect your attack to the enemy that Taunted you if possible. You do not have to redirect your attack if attacking the enemy that Taunted you would be impossible (due to being out of range, or behind a barrier, or out of sight)."
    },
    {
        "type": "condition",
        "name": "Weakened",
        "duration": "1 minute",
        "description": "All your damage output is decreased by X%, after all other modifiers. This condition does not stack; subsequent Weakened effects simply change the original."
    },
    {
        "type": "skill",
        "name": "Alchemy Augmentation",
        "description": "This school of alchemy focuses on the alteration of material objects. Instead of fundamentally changing what the object is, you can change the natural properties of the object, while maintaining some of its original properties",
        "attribute": "Intelligence",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot perform Augmentation Alchemy",
            "Rank F": "You can perform Augmentation Alchemy from basic blueprints"
        }
    },
    {
        "type": "skill",
        "name": "Alchemy Constructs",
        "description": "This school of alchemy focuses on the creation of constructs, like robots and golems, that are technically non-living bodies powered by magic. Constructs lack any intelligence whatsoever, but aren\u2019t limited physically the same way organics are",
        "attribute": "Intelligence",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot perform Construct Alchemy",
            "Rank F": "You can perform Construct Alchemy from basic blueprints"
        }
    },
    {
        "type": "skill",
        "name": "Alchemy Organics",
        "description": "This school of alchemy focuses on the creation of organic life, like homunculi and chimera. These creatures are intelligent and don\u2019t require magical input to operate, but have more realistic physical limitations",
        "attribute": "Intelligence",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot perform Organics Alchemy",
            "Rank F": "You can perform Organics Alchemy from basic blueprints"
        }
    },
    {
        "type": "skill",
        "name": "Alchemy Transformation",
        "description": "This school of alchemy focuses on the transformation of material objects. Instead of simply altering the properties of an object, you change things into completely different objects entirely",
        "attribute": "Intelligence",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot perform Transmutation Alchemy",
            "Rank F": "You can perform Transmutation Alchemy from basic blueprints"
        }
    },
    {
        "type": "skill",
        "name": "Armor Mastery Cloth",
        "description": "Cloth Armor Mastery involves the effective use of defensive clothes, cloth armor, and robes, which normally provide magic defense and condition resistance. This skill will help you maximize the defenses provided by such armors while minimizing their weaknesses",
        "attribute": "Resistance",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot wear cloth armor",
            "Rank F": "You can wear normal and magic cloth armor",
            "Rank A": "You can wear rare and unique cloth armor"
        }
    },
    {
        "type": "skill",
        "name": "Armor Mastery Heavy",
        "description": "Heavy Armor Mastery involves the effective use of heavy armor with high AC. This skill will help you maximize the defenses provided by such armors while minimizing their weaknesses",
        "attribute": "Toughness",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot wear heavy armor",
            "Rank F": "You can wear normal and magic heavy armor"
        }
    },
    {
        "type": "skill",
        "name": "Armor Mastery Light",
        "description": "Light Armor Mastery involves the effective use of light armor with high evasion. This skill will help you maximize the defenses provided by such armors while minimizing their weaknesses",
        "attribute": "Reflex",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot wear light armor",
            "Rank F": "You can wear normal and magic light armor",
            "Rank A": "You can wear rare and unique light armor"
        }
    },
    {
        "type": "skill",
        "name": "Armor Mastery Shields",
        "description": "Shield Armor Mastery involves the effective use of a shield for AC. This skill will help you maximize the defenses provided by shields while minimizing their weaknesses",
        "attribute": "Toughness",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot equip shields",
            "Rank F": "You can equip mundane and magic shields in your offhand",
            "Rank A": "You can equip rare and unique shields in your offhand"
        }
    },
    {
        "type": "skill",
        "name": "Artistry Acting",
        "description": "Acting Mastery involves the ability to act as someone you are not for the purposes of art, such as in a play or skit. At higher ranks, this skill can be used to empower magic and create your own plays",
        "attribute": "Appeal",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Acting checks",
            "Rank F": "You can perform Acting checks"
        }
    },
    {
        "type": "skill",
        "name": "Artistry Dancing",
        "description": "Dancing Mastery involves the ability to twirl, leap, and pirouette, creating art with your body. At higher ranks, this skill can be used to choreograph your own dances and empower magic",
        "attribute": "Appeal",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Dancing checks",
            "Rank F": "You can perform Dancing checks",
            "Rank A": "You can infuse magic into dances and perform improvised physical arts with dances"
        }
    },
    {
        "type": "skill",
        "name": "Artistry Illustration",
        "description": "Illustration Mastery involves the ability to draw, sketch, paint, and perform other graphic arts. At higher ranks, this skill can also be used to create magical prints",
        "attribute": "Appeal",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Illustration checks",
            "Rank F": "You can perform Illustration checks"
        }
    },
    {
        "type": "skill",
        "name": "Artistry Literature",
        "description": "Literature Mastery involves the creation of poetry, prose, or any other written art. At higher ranks, this skill can be used to empower magic and write faster",
        "attribute": "Appeal",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Literature checks",
            "Rank F": "You can perform Literature checks"
        }
    },
    {
        "type": "skill",
        "name": "Artistry Music",
        "description": "Music Mastery involves the ability to play various instruments, and also includes singing. At higher ranks, this skill can also be used to compose your own original scores or empower magic",
        "attribute": "Appeal",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Music checks",
            "Rank F": "You can perform Music checks"
        }
    },
    {
        "type": "skill",
        "name": "Artistry Sculpture",
        "description": "Sculpture Mastery involves the creation of artistic pieces using raw materials like stone, wood, glass, ceramics, or gems; it also includes architecture. At higher ranks, this skill can also be used to create magical artifacts and original sculptures",
        "attribute": "Appeal",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Sculpture checks",
            "Rank F": "You can perform Sculpture checks"
        }
    },
    {
        "type": "skill",
        "name": "Athletics Balance",
        "description": "Balance involves keeping yourself steady in situations where that would normally be difficult, such as when you traverse slippery terrain, walk along narrow ledges, or drink way too much ale",
        "attribute": "Dexterity",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Balance checks",
            "Rank F": "You can perform Balance checks"
        }
    },
    {
        "type": "skill",
        "name": "Athletics Climbing",
        "description": "Climbing includes things like scaling difficult walls and quickly ascending the side of a tower. One might use tools to assist in climbing, but putting points in this skill make it easier to do so, with or without assistance from tools",
        "attribute": "Agility",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Climbing checks",
            "Rank F": "You can perform Climbing checks"
        }
    },
    {
        "type": "skill",
        "name": "Athletics Flexibility",
        "description": "Flexibility involves being able to bend or stretch in uncommon ways. You might use this to fit into small spaces, contort your body, or perform dodges that would be impossible for others",
        "attribute": "Dexterity",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Flexibility checks",
            "Rank F": "You can perform Flexibility checks"
        }
    },
    {
        "type": "skill",
        "name": "Athletics Force",
        "description": "Force involves the effective use of your muscles to push, pull, lift, drag, or do any sort of athletic ability requiring raw muscles strength",
        "attribute": "Strength",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Force checks",
            "Rank F": "You can perform Force checks"
        }
    },
    {
        "type": "skill",
        "name": "Athletics Movement",
        "description": "Movement involves efficient use of your muscles and physical reserves to run long distances, sprint, jump, and continue moving in harsh environments",
        "attribute": "Agility",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Movement checks",
            "Rank F": "You can perform Movement checks"
        }
    },
    {
        "type": "skill",
        "name": "Athletics Pain Tolerance",
        "description": "Pain Tolerance involves being able to maintain top physical and mental form even when under extreme stress caused by great amounts of pain. You might make a Pain Tolerance check to maintain concentration after damage, or if you\u2019re being tortured for information, or to maintain consciousness",
        "attribute": "Composure",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Pain Tolerance checks",
            "Rank F": "You can perform Pain Tolerance checks"
        }
    },
    {
        "type": "skill",
        "name": "Beast Mastery Battle Pet",
        "description": "Battle Pet checks allow you to use a pet in combat. Skill checks are needed for specialized commands",
        "attribute": "Wisdom",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot use your pet in combat",
            "Rank F": "You can command your pet in combat"
        }
    },
    {
        "type": "skill",
        "name": "Beast Mastery Riding",
        "description": "Riding allows you to mount and ride horses, donkeys, and other animals that can normally be mounted. It requires a measure of physical fitness in many areas to ride effectively. Putting points in this skill will allow you to also ride exotic animals and gain further bonuses for riding",
        "attribute": "Agility",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot ride animals at full speed",
            "Rank F": "You can mount and ride common animals at full speed"
        }
    },
    {
        "type": "skill",
        "name": "Beast Mastery Taming",
        "description": "Taming allows you to calm down and control wild animals. You might use this for simpler tasks like cowing a dangerous wild dog or more involved, longer term actions like raising your own pet. Points in taming allow you to control more exotic beasts",
        "attribute": "Wisdom",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot tame animals",
            "Rank F": "You can tame common animals"
        }
    },
    {
        "type": "skill",
        "name": "Combat Blocking",
        "description": "Blocking skill checks are used whenever you want to absorb incoming damage. It should be noted that such a skill check is only doable with a shield or heavy armor",
        "attribute": "Toughness",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Blocking checks",
            "Rank F": "You can perform Blocking checks to reduce incoming damage further"
        }
    },
    {
        "type": "skill",
        "name": "Combat Dodging",
        "description": "Dodging skill checks are used whenever you want to avoid getting hit by something. It should be noted that such a skill check is for when you need to use your quickness to avoid damage, and as such, Dodging checks can\u2019t be rolled against attacks that are inherently unavoidable",
        "attribute": "Reflex",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Dodging checks",
            "Rank F": "You can perform Dodging checks"
        }
    },
    {
        "type": "skill",
        "name": "Combat Grappling",
        "description": "Grappling checks are for replacing your regular attacks with grapples, holds, throws, etc. Grappling is separate from unarmed combat and is based off of how quickly you can take control of your enemy\u2019s balance and weight, so many types of characters can make use of simple holds and throws",
        "attribute": "Agility",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Grappling checks",
            "Rank F": "You can perform Grappling checks"
        }
    },
    {
        "type": "skill",
        "name": "Combat Trapping",
        "description": "Trapping skill checks are used whenever you must set up or tinker with traps under pressure, which occurs most notably during combat. If interacting with a trap would be easy, then it does not require a skill check",
        "attribute": "Fortitude",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot performing Trapping checks in combat",
            "Rank F": "You can perform Trapping checks in combat as a Major Action"
        }
    },
    {
        "type": "skill",
        "name": "Crafting Armorsmithing",
        "description": "Armorsmithing involves the creation of heavy armor and shields. With this skill you can create mundane plate or chain mail, as well as more exotic designs. Regular blacksmithing of metal objects also falls under this skill",
        "attribute": "Toughness",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot craft heavy armor",
            "Rank F": "You can craft heavy armor from recipes"
        }
    },
    {
        "type": "skill",
        "name": "Crafting Artificing",
        "description": "Artificing involves the creation of magical weapons. You can create wands, staves, and magic orbs, as well as more exotic designs. Making magic weapons is dangerous and thus requires good magical resistances. Regular carpentry also falls under this skill",
        "attribute": "Resistance",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Artificing checks",
            "Rank F": "You can perform Artificing checks to craft items up to magic rarity"
        }
    },
    {
        "type": "skill",
        "name": "Crafting Cooking",
        "description": "Cooking involves the creation of food and drink. You can bake cakes, brew ale, and make a variety of other types of sustenance",
        "attribute": "Appeal",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Cooking checks",
            "Rank F": "You can perform Cooking checks and cook delicacies"
        }
    },
    {
        "type": "skill",
        "name": "Crafting Enchanting",
        "description": "Enchanting is the ability to apply magical effects to weapons, armor, and other items. The process can be a bit dangerous, so resistance to magical damage is necessary to master it completely",
        "attribute": "Resistance",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot enchant items",
            "Rank F": "You can enchant items up to magic rarity"
        }
    },
    {
        "type": "skill",
        "name": "Crafting Fine Weapons",
        "description": "Fine Weapon crafting involves the crafting of melee weapons that scale off Dexterity for their damage. You can make things like rapiers or whips, as well as more exotic designs",
        "attribute": "Reflex",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot craft fine weapons",
            "Rank F": "You can craft fine weapons up to magic rarity"
        }
    },
    {
        "type": "skill",
        "name": "Crafting Forgery",
        "description": "Forgery is the ability to craft fakes. Whether it\u2019s a false letter written in the hand of the mayor, or an ornate dagger built with false gems and fool\u2019s gold, forgery allows you to create items that are not what they seem",
        "attribute": "Precision",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot perform Forgery checks",
            "Rank F": "You can create forged written documents and blueprints"
        }
    },
    {
        "type": "skill",
        "name": "Crafting Leatherworking",
        "description": "Leatherworking involves the creation of light armor, as well as various other leather objects. With this skill you can make burnished leather armor or boots, as well as more exotic designs",
        "attribute": "Reflex",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot craft light armor",
            "Rank F": "You can craft light armor up to magic rarity"
        }
    },
    {
        "type": "skill",
        "name": "Crafting Jewelry",
        "description": "Jewelry Crafting involves the creation of accessories like rings, necklaces, and belts. Since accessories naturally give magical effects, magical resistances are needed to properly work with them. Regular stonecraft also falls under this skill",
        "attribute": "Fortitude",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot craft jewelry",
            "Rank F": "You can craft jewelry up to magic rarity"
        }
    },
    {
        "type": "skill",
        "name": "Crafting Heavy Weapons",
        "description": "Heavy Weapon Crafting involves the creation of any weapons which have Strength scaling for their damage. You can make things like axes, longblades, or spears, as well as more exotic designs",
        "attribute": "Toughness",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot craft heavy weapons",
            "Rank F": "You can craft heavy weapons up to magic rarity"
        }
    },
    {
        "type": "skill",
        "name": "Crafting Poisons",
        "description": "Poison Crafting allows you to make any number of debilitating concoctions. Because the nature of all of these items are dangerous, and taste testing is required to make sure you\u2019re making the proper progress, you need to be tough willed to create poison",
        "attribute": "Fortitude",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot craft poisons",
            "Rank F": "You can craft poisons"
        }
    },
    {
        "type": "skill",
        "name": "Crafting Potions",
        "description": "Potion Crafting allows you to make any number of invigorating concoctions. Because the nature of all of these items can have abnormal side effects if not properly prepared, you need to be tough willed to create potions",
        "attribute": "Fortitude",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot craft potions",
            "Rank F": "You can craft potions"
        }
    },
    {
        "type": "skill",
        "name": "Crafting Ranged Weapons",
        "description": "Ranged Weapon crafting involves the creation ranged weapons which scale off Dexterity for their damage. You can make things like bows, crossbows, and even guns and slings, as well as more exotic designs. You can also craft ammunition for your ranged weapons with this skill",
        "attribute": "Reflex",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot craft ranged weapons",
            "Rank F": "You can craft ranged weapons up to magic rarity"
        }
    },
    {
        "type": "skill",
        "name": "Crafting Shortblades",
        "description": "Shortblade Weapon crafting involves the creation of shortblades, which do not scale with STR or DEX. You can make things like daggers and specialized throwing knives, as well as more exotic designs. Crafting thieves\u2019 tools also falls under this skill",
        "attribute": "Precision",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot craft shortblades",
            "Rank F": "You can craft shortblades up to magic rarity"
        }
    },
    {
        "type": "skill",
        "name": "Crafting Tailoring",
        "description": "Tailoring involves the creation of cloth armor, as well as various other types of clothing. With this skill you can make magic-resisting robes or dresses, as well as more exotic designs",
        "attribute": "Resistance",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot craft cloth armor",
            "Rank F": "You can craft cloth armor up to magic rarity"
        }
    },
    {
        "type": "skill",
        "name": "Element Mastery Air",
        "description": "Air Mastery involves the effective use of the element air in magic spells. Putting points in Air Mastery will allow you to cast air spells as well as invoke air cantrips from equipment",
        "attribute": "Agility",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot use air magic",
            "Rank F": "You can cast air cantrips",
            "Rank A": "You can cast air spells given to you by class abilities"
        }
    },
    {
        "type": "skill",
        "name": "Element Mastery Dark",
        "description": "Dark Mastery involves the effective use of the element dark in magic spells. Putting points in Dark Mastery will allow you to cast dark spells as well as invoke dark cantrips from equipment",
        "attribute": "Fortitude",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot use Dark magic",
            "Rank F": "You can cast dark cantrips",
            "Rank A": "You can cast dark spells given to you by class abilities"
        }
    },
    {
        "type": "skill",
        "name": "Element Mastery Earth",
        "description": "Earth Mastery involves the effective use of the element earth in magic spells. Putting points in Earth Mastery will allow you to cast earth spells as well as invoke earth cantrips from equipment",
        "attribute": "Resistance",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot use earth magic",
            "Rank F": "You can cast earth cantrips"
        }
    },
    {
        "type": "skill",
        "name": "Element Mastery Fire",
        "description": "Fire Mastery involves the effective use of the element fire in magic spells. Putting points in Fire Mastery will allow you to cast fire spells as well as invoke fire cantrips from equipment",
        "attribute": "Attunement",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot use fire magic",
            "Rank F": "You can cast fire cantrips"
        }
    },
    {
        "type": "skill",
        "name": "Element Mastery Ice",
        "description": "Ice Mastery involves the effective use of the element ice in magic spells. Putting points in Ice Mastery will allow you to cast ice spells as well as invoke ice cantrips from equipment",
        "attribute": "Fortitude",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot use ice magic",
            "Rank F": "You can cast ice cantrips",
            "Rank A": "You can cast ice spells given to you by class abilities without penalties"
        }
    },
    {
        "type": "skill",
        "name": "Element Mastery Light",
        "description": "Light Mastery involves the effective use of the element light in magic spells. Putting points in Light Mastery will allow you to cast light spells as well as invoke light cantrips from equipment",
        "attribute": "Focus",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot use light magic",
            "Rank F": "You can cast light cantrips",
            "Rank A": "You can cast light spells given to you by class abilities"
        }
    },
    {
        "type": "skill",
        "name": "Element Mastery Lightning",
        "description": "Lightning Mastery involves the effective use of the element lightning in magic spells. Putting points in Lightning Mastery will allow you to cast lightning spells as well as invoke lightning cantrips from equipment",
        "attribute": "Attunement",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot use lightning magic",
            "Rank F": "You can cast lightning cantrips",
            "Rank A": "You can cast lightning spells given to you by class abilities"
        }
    },
    {
        "type": "skill",
        "name": "Element Mastery Water",
        "description": "Water Mastery involves the effective use of the element water in magic spells. Putting points in Water Mastery will allow you to cast water spells as well as invoke water cantrips from equipment",
        "attribute": "Focus",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot use water magic",
            "Rank F": "You can cast water cantrips"
        }
    },
    {
        "type": "skill",
        "name": "Gathering Forestry",
        "description": "Forestry allows you to cut down and process wood from trees for later use in crafting. Forestry requires an axe, and skill checks are required to quickly cut down trees. Higher level Forestry lets you gather wood from magical trees",
        "attribute": "Toughness",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Forestry checks",
            "Rank F": "You can perform Forestry checks"
        }
    },
    {
        "type": "skill",
        "name": "Gathering Harvest",
        "description": "Food Gathering allows you to search for edible plants, such as berries or roots, as well as fish in bodies of water or farm your own crops. Various tools might be needed to search for food, and skill checks are required to find safe foods to eat. Higher level Food Gathering only increases the amount of food you bring in",
        "attribute": "Agility",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Food Gathering checks",
            "Rank F": "You can perform Harvest Gathering checks"
        }
    },
    {
        "type": "skill",
        "name": "Gathering Herbology",
        "description": "Gathering allows you to harvest plants from nature for later use in crafting. Herbology requires no special tools, but skill checks are required to safely gather. Higher level Herbology lets you gather magical herbs",
        "attribute": "Resistance",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Herbology checks",
            "Rank F": "You can perform Herbology checks"
        }
    },
    {
        "type": "skill",
        "name": "Gathering Hunting",
        "description": "Hunting allows you to go out in search for game to hunt for meat and skins for later use in crafting. Hunting requires a weapon and rope, and skill checks are required to quickly take down targets. Higher level Hunting lets you hunt magical game",
        "attribute": "Reflex",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Hunting checks",
            "Rank F": "You can perform Hunting checks"
        }
    },
    {
        "type": "skill",
        "name": "Gathering Mining",
        "description": "Mining allows you to harvest raw ore from the earth for later use in crafting. Mining requires a pick, and skill checks are required to gather large enough, workable pieces. Higher level Mining lets you gather magical ores",
        "attribute": "Toughness",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Mining checks",
            "Rank F": "You can perform Mining checks"
        }
    },
    {
        "type": "skill",
        "name": "Gathering Skinning",
        "description": "Skinning allows you to remove the skin of creatures for later use in crafting. Skinning requires a knife, and skill checks are required to skin correctly and quickly. Higher level Skinning lets you skin magical creatures with thicker skins",
        "attribute": "Reflex",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Skinning checks",
            "Rank F": "You can perform Skinning checks"
        }
    },
    {
        "type": "skill",
        "name": "Item Use Appraisal",
        "description": "Appraisal checks are for discerning the inherent value and properties of an object or entity upon closer inspection of it. What you do with that knowledge is up to you",
        "attribute": "Wisdom",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Appraisal checks",
            "Rank F": "You can perform Appraisal checks"
        }
    },
    {
        "type": "skill",
        "name": "Item Use Construction",
        "description": "Construction checks can be used to build any large objects that do not require a delicate hand to assemble. This could be anything from wooden fortifications to a trebuchet",
        "attribute": "Strength",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Construction checks",
            "Rank F": "You can perform Construction checks"
        }
    },
    {
        "type": "skill",
        "name": "Item Use First Aid",
        "description": "First Aid involves the application of salves and bandages, suturing lacerations, fixing bones, and other emergency medical operations",
        "attribute": "Fortitude",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail First Aid checks",
            "Rank F": "You can perform First Aid checks"
        }
    },
    {
        "type": "skill",
        "name": "Item Use Literacy",
        "description": "Literacy involves the ability to read and write beyond the basic ability that most people are capable of. Skill checks could include forging a letter, faking your handwriting, writing something down accurately from memory, or keeping up with spoken word while taking records",
        "attribute": "Intelligence",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Literacy checks",
            "Rank F": "You can perform Literacy checks"
        }
    },
    {
        "type": "skill",
        "name": "Item Use Ropes",
        "description": "Rope Mastery involves the effective use of ropes, chains, netting, and other cords. Skill checks could include tying people up, tying yourself to a support, or even using chains as weapons",
        "attribute": "Wisdom",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Rope checks",
            "Rank F": "You can perform Rope checks"
        }
    },
    {
        "type": "skill",
        "name": "Item Use Tinkering",
        "description": "Tinkering checks will be used largely as a catch-all for any difficult action requiring the delicate operating of various small objects. This could include anything from building a wooden doll to carefully reconstructing an ancient clock",
        "attribute": "Wisdom",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Tinkering checks",
            "Rank F": "You can perform Tinkering checks"
        }
    },
    {
        "type": "skill",
        "name": "Item Use Traps",
        "description": "Traps are mechanisms designed to trigger to an event (like opening a door) and cause something to happen (like releasing poison). They can be simple and made of random objects, or complex and require building in a workshop. Making and disabling traps requires calm handiwork",
        "attribute": "Composure",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Traps checks",
            "Rank F": "You can perform Traps checks"
        }
    },
    {
        "type": "skill",
        "name": "Interaction Deception",
        "description": "Deception checks are for successfully lying to people or withholding/bending the truth. You might use this to lie to a guard or hide some family secret",
        "attribute": "Appeal",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Deception checks",
            "Rank F": "You can perform Deception checks"
        }
    },
    {
        "type": "skill",
        "name": "Interaction Intent",
        "description": "Intent checks are for discerning whether others are lying to you or hiding details by watching for verbal tics or visual cues. It can be used to find deeper meaning in what people are saying",
        "attribute": "Wisdom",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Intent checks",
            "Rank F": "You can perform Intent checks"
        }
    },
    {
        "type": "skill",
        "name": "Interaction Intimidation",
        "description": "Intimidation checks are for scaring people into doing things you want. You might use this to interrogate a captured enemy or convince a group of bandits to stand down",
        "attribute": "Composure",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Intimidation checks",
            "Rank F": "You can perform Intimidation checks"
        }
    },
    {
        "type": "skill",
        "name": "Interaction Leadership",
        "description": "Leadership checks are for inspiring groups and guiding them to act together. You might use this to boost the morale of a vast army or convince a mercenary band of the soundness of your tactics",
        "attribute": "Composure",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Leadership checks",
            "Rank F": "You can perform Leadership checks"
        }
    },
    {
        "type": "skill",
        "name": "Interaction Persuasion",
        "description": "Persuasion checks are for convincing people to do things you want. You might use this to barter for better prices, convince someone to give you information, or convince an enemy to stand down",
        "attribute": "Appeal",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Persuasion checks",
            "Rank F": "You can perform Persuasion checks"
        }
    },
    {
        "type": "skill",
        "name": "Interaction Seduction",
        "description": "Seduction checks are for charming people and making them fall for you. With a high rank in Seduction, even the ugliest players can find love",
        "attribute": "Appeal",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Seduction checks",
            "Rank F": "You can perform Seduction checks"
        }
    },
    {
        "type": "skill",
        "name": "Knowledge Arcana",
        "description": "Arcana skill checks exercise your knowledge of magic. You might use this skill to identify an enemy spell cast or investigate a magic circle",
        "attribute": "Intelligence",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Arcana checks",
            "Rank F": "You can perform Arcana checks",
            "Rank A": "You can make an Arcana check during combat as a free action or free reaction once per round"
        }
    },
    {
        "type": "skill",
        "name": "Knowledge Culture",
        "description": "Culture skill checks exercise your knowledge of the various races and their cultures. You might use this skill to discern whether a piece of pottery is of elven or dwarven design, or to know if manti hunt alone or in packs",
        "attribute": "Intelligence",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Culture checks",
            "Rank F": "You can perform Culture checks"
        }
    },
    {
        "type": "skill",
        "name": "Knowledge History",
        "description": "History skill checks exercise your knowledge of historical events and people or places of the past. You might use this skill to explore the origins of a city, or the fate of a long dead king",
        "attribute": "Intelligence",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail History checks",
            "Rank F": "You can perform History checks"
        }
    },
    {
        "type": "skill",
        "name": "Knowledge Nature",
        "description": "Nature skill checks exercise your knowledge of plants and animals. You might use this skill to investigate a mysterious creature you encounter or know if a particular mushroom is safe to eat",
        "attribute": "Intelligence",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Nature checks",
            "Rank F": "You can perform Nature checks"
        }
    },
    {
        "type": "skill",
        "name": "Knowledge Religion",
        "description": "Religion skill checks exercise your knowledge of the various religions of the world. You might use this skill to see what you know about a god, a cult, a certain religious practice, or a religious symbol",
        "attribute": "Intelligence",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Religion checks",
            "Rank F": "You can perform Religion checks"
        }
    },
    {
        "type": "skill",
        "name": "Magic Buffs",
        "description": "Buff magic applies positive effects, known as buffs, to creatures. Skill checks usually involve knowledge about the buff magic subtype, or possibly improvised buff spell usage",
        "attribute": "Focus",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Buff Magic checks",
            "Rank F": "You can perform Buff Magic checks",
            "Rank A": "You can perform improvised magic arts with buff spells"
        }
    },
    {
        "type": "skill",
        "name": "Magic Conditions",
        "description": "Condition magic applies negative effects, known as conditions, to creatures. Skill checks usually involve knowledge about the condition magic subtype, or possibly improvised condition spell usage",
        "attribute": "Attunement",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Condition Magic checks",
            "Rank F": "You can perform Condition Magic checks"
        }
    },
    {
        "type": "skill",
        "name": "Magic Conjuration",
        "description": "Conjuration magic creates objects using mana. Skill checks usually involve knowledge about the conjuration magic subtype, or possibly improvised conjuration spell usage",
        "attribute": "Focus",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Conjuration Magic checks",
            "Rank F": "You can perform Conjuration Magic checks"
        }
    },
    {
        "type": "skill",
        "name": "Magic Control",
        "description": "Control magic involves spells that influence the actions of creatures. Skill checks usually involve knowledge about the control magic subtype, or possibly improvised control spell usage",
        "attribute": "Attunement",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Control Magic checks",
            "Rank F": "You can perform Control Magic checks"
        }
    },
    {
        "type": "skill",
        "name": "Magic Defensive",
        "description": "Defensive magic involves spells that protect. Skill checks usually involve knowledge about the defensive magic subtype, or possibly improvised defensive spell usage",
        "attribute": "Resistance",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Defensive Magic checks",
            "Rank F": "You can perform Defensive Magic checks"
        }
    },
    {
        "type": "skill",
        "name": "Magic Destruction",
        "description": "Destruction magic focuses on inflicting damage upon creatures. Skill checks usually involve knowledge about the destruction magic subtype, or possibly improvised destruction spell usage",
        "attribute": "Attunement",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Destruction Magic checks",
            "Rank F": "You can perform Destruction Magic checks",
            "Rank A": "You can perform improvised magic arts with destruction spells"
        }
    },
    {
        "type": "skill",
        "name": "Magic Divination",
        "description": "Divination magic involves spells that protect. Skill checks usually involve knowledge about the divination magic subtype, or possibly improvised divination spell usage",
        "attribute": "Attunement",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Divination Magic checks",
            "Rank F": "You can perform Divination Magic checks"
        }
    },
    {
        "type": "skill",
        "name": "Magic Enchantment",
        "description": "Enchantment magic involves applying various effects to objects. Skill checks usually involve knowledge about the enchantment magic subtype, or possibly improvised enchantment spell usage",
        "attribute": "Focus",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Enchantment Magic checks",
            "Rank F": "You can perform Enchantment Magic checks",
            "Rank A": "You can perform improvised magic arts with enchantment spells"
        }
    },
    {
        "type": "skill",
        "name": "Magic Illusions",
        "description": "Illusion magic involves creating sensory stimuli with magic to deceive. Skill checks usually involve knowledge about the illusion magic subtype, or possibly improvised illusion spell usage",
        "attribute": "Focus",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Illusion Magic checks",
            "Rank F": "You can perform Illusion Magic checks"
        }
    },
    {
        "type": "skill",
        "name": "Magic Mana Channeling",
        "description": "Mana Channeling involves the ability to channel raw mana that isn\u2019t being formed into an element for a spell. This skill is primarily used when you want to act as a source of mana for another person or object, or if an action requires so many different types of elemental magic that using raw mana is more appropriate",
        "attribute": "Composure",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot control mana output",
            "Rank F": "You can control mana output without wasting any when you cast spells"
        }
    },
    {
        "type": "skill",
        "name": "Magic Restoration",
        "description": "Restoration magic focuses on healing conditions and recovering health. Skill checks usually involve knowledge about the restoration magic subtype, or possibly improvised restoration spell usage",
        "attribute": "Attunement",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Restoration Magic checks",
            "Rank F": "You can perform Restoration Magic checks"
        }
    },
    {
        "type": "skill",
        "name": "Magic Summoning",
        "description": "Summoning magic involves creating creatures to assist you. Skill checks usually involve knowledge about the summoning magic subtype, or possibly improvised summoning spell usage",
        "attribute": "Focus",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Summoning Magic checks",
            "Rank F": "You can perform Summoning Magic checks"
        }
    },
    {
        "type": "skill",
        "name": "Magic Transmutation",
        "description": "Transmutation magic involves transforming objects or creatures into other things. Skill checks usually involve knowledge about the transmutation magic subtype, or possibly improvised transmutation spell usage",
        "attribute": "Focus",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Transmutation Magic checks",
            "Rank F": "You can perform Transmutation Magic checks"
        }
    },
    {
        "type": "skill",
        "name": "Magic Utility",
        "description": "Utility magic involves spells that provide small benefits of varying types. Skill checks usually involve knowledge about the utility magic subtype, or possibly improvised utility spell usage",
        "attribute": "Attunement",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Utility Magic checks",
            "Rank F": "You can perform Utility Magic checks"
        }
    },
    {
        "type": "skill",
        "name": "Observation Listen",
        "description": "Listen skill checks are for picking up on sounds that the average person would either not hear or subconsciously ignore. You would use this skill to eavesdrop or listen through a door",
        "attribute": "Wisdom",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Listen checks",
            "Rank F": "You can perform Listen checks"
        }
    },
    {
        "type": "skill",
        "name": "Observation Search",
        "description": "Search checks are for investigating areas for clues. Higher ranks of Search ensure you don\u2019t miss what you\u2019re looking for and speed up your searching",
        "attribute": "Wisdom",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Search checks",
            "Rank F": "You can perform Search checks"
        }
    },
    {
        "type": "skill",
        "name": "Observation Tracking",
        "description": "Tracking checks are for following trails of clues. Higher ranks of Tracking allow you to follow trails of footsteps or other clues that others might normally miss",
        "attribute": "Wisdom",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Tracking checks",
            "Rank F": "You can perform Tracking checks"
        }
    },
    {
        "type": "skill",
        "name": "Psionics Defensive",
        "description": "Defensive Psionics are not strictly speaking the use of psionic powers, but it is more of using your body and mind to resist psionic attacks. While some psionic arts are classified as defensive, this skill check is more often used by non-psionic users to resist attacks",
        "attribute": "Composure",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Defensive Psionics checks",
            "Rank F": "You can perform Defensive Psionic checks"
        }
    },
    {
        "type": "skill",
        "name": "Psionics Offensive",
        "description": "Offensive Psionics allow you to use your mind as a weapon in a way that is patently different from using magic. It requires raw brain power rather than mana, and thus is a physical exertion of your will",
        "attribute": "Composure",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot use psionics offensively",
            "Rank F": "You can use psionics offensively"
        }
    },
    {
        "type": "skill",
        "name": "Psionics Utility",
        "description": "Utility Psionics includes any psionic ability that isn\u2019t an attack on another creature or defending against an attack from a creature. This usually involves using psionic abilities on objects",
        "attribute": "Composure",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Utility Psionics checks",
            "Rank F": "You can perform Utility Psionic checks"
        }
    },
    {
        "type": "skill",
        "name": "Stealth Disguise",
        "description": "Disguise checks allow you to hide your identity through elaborate disguises or cleverly placed mundane clothing. You would also use this check if you wanted to put a disguise on another person or object",
        "attribute": "Precision",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Disguise checks",
            "Rank F": "You can perform Disguise checks"
        }
    },
    {
        "type": "skill",
        "name": "Stealth Lockpicking",
        "description": "Lockpicking is for breaking open locked doors and chests. It usually requires lockpicking tools. Higher ranks of Lockpicking helps you save tools and open harder locks",
        "attribute": "Precision",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Lockpicking checks",
            "Rank F": "You can perform Lockpicking checks"
        }
    },
    {
        "type": "skill",
        "name": "Stealth Sleight of Hand",
        "description": "Sleight of Hand is for being deceptive with your hand motions. You can use this skill for cheating at card games, hiding a dagger up your sleeve, or swapping out a goblet of wine with poison, all without being detected",
        "attribute": "Precision",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Sleight of Hand checks",
            "Rank F": "You can perform Sleight of Hand checks"
        }
    },
    {
        "type": "skill",
        "name": "Stealth Sneak",
        "description": "Sneaking is for moving without being detected. Good sneaking means you won\u2019t be spotted even when people are actively looking for you and you won\u2019t make noise while moving. High levels of Sneak allow you to move quickly and perform actions that would normally be too loud",
        "attribute": "Precision",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Sneak checks",
            "Rank F": "You can perform Sneak checks",
            "Rank A": "You can perform physical and magical arts while sneaking"
        }
    },
    {
        "type": "skill",
        "name": "Stealth Steal",
        "description": "Stealing is for taking things that don\u2019t belong to you. This skill is mostly used to steal things in combat or pickpocket people out of combat. Higher levels increase your success rates and let you take more things",
        "attribute": "Precision",
        "value": null,
        "rank_notes": {
            "Untrained": "You automatically fail Steal checks",
            "Rank F": "You can perform Steal checks",
            "Rank A": "You can steal during combat as a Major Action even while not hidden"
        }
    },
    {
        "type": "skill",
        "name": "Transportation Air Vehicles",
        "description": "Air Vehicle Mastery allows you to effectively drive airships, hot air balloons, and any other vehicle that moves through the air. Checks might be required for difficult maneuvers, and you need to be calm and composed while thousands of feet above solid land",
        "attribute": "Composure",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot drive air vehicles",
            "Rank F": "You can drive small air vehicles"
        }
    },
    {
        "type": "skill",
        "name": "Transportation Land Vehicles",
        "description": "Land Vehicle Mastery allows you to effectively drive carts, wagons, carriages, chariots, sleds, and any other vehicle that moves over land. Checks might be required for difficult maneuvers, and you need to be able to move and react quickly",
        "attribute": "Agility",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot drive land vehicles",
            "Rank F": "You can drive small land vehicles"
        }
    },
    {
        "type": "skill",
        "name": "Transportation Sea Vehicles",
        "description": "Sea Vehicle Mastery allows you to effectively drive canoes, boats, ships, and any other vehicle that moves in water. Checks might be required for difficult maneuvers, and you need to be able to focus on all the various parts and little movements that come with driving most waterborne vehicles",
        "attribute": "Focus",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot drive sea vehicles",
            "Rank F": "You can drive small sea vehicles"
        }
    },
    {
        "type": "skill",
        "name": "Weapon Mastery Axes",
        "description": "Axe Mastery involves the effective use of axes. If you\u2019re looking to maximize the damage and flexibility of a hand axe, throwing axe, great axe, war pick, scythe, or sickle, you want to put points in Axe Mastery",
        "attribute": "Strength",
        "value": null,
        "rank_notes": {
            "Untrained": "You deal half damage with axes",
            "Rank F": "You deal regular damage with axes"
        }
    },
    {
        "type": "skill",
        "name": "Weapon Mastery Blunt",
        "description": "Blunt Weapons Mastery involves the effective use of bludgeoning weapons. If you\u2019re looking to maximize the damage and flexibility of a club, hammer, maul, mace, flail, or quarterstaff, you want to put points in Blunt Weapons Mastery",
        "attribute": "Strength",
        "value": null,
        "rank_notes": {
            "Untrained": "You deal half damage with bludgeoning weapons",
            "Rank F": "You deal regular damage with bludgeoning weapons"
        }
    },
    {
        "type": "skill",
        "name": "Weapon Mastery Bows",
        "description": "Bow Weapon Mastery involves the effective use of bows. If you\u2019re looking to maximize the damage and flexibility of a shortbow, longbow, or composite bow, you want to put points in Ranged Weapon Mastery",
        "attribute": "Dexterity",
        "value": null,
        "rank_notes": {
            "Untrained": "You deal half damage with bows",
            "Rank F": "You deal regular damage with bows",
            "Rank A": "You can perform improvised physical arts with ranged weapons",
            "Rank 5": "Your autoattacks with bows pierce once, hitting another target behind your initial target within range"
        }
    },
    {
        "type": "skill",
        "name": "Weapon Mastery Bullets",
        "description": "Bullet Weapon mastery involves the effective use of ranged weapons that use ammunition that is not bolts or arrows. If you\u2019re looking to maximize the damage and flexibility of a sling, pistol, or rifle, you want to put points in Bullet Weapon Mastery",
        "attribute": "Dexterity",
        "value": null,
        "rank_notes": {
            "Untrained": "You deal half damage with bullets",
            "Rank F": "You deal regular damage with bullets",
            "Rank A": "You can perform improvised physical arts with bullets"
        }
    },
    {
        "type": "skill",
        "name": "Weapon Mastery Crossbows",
        "description": "Crossbow Weapon Mastery involves the effective use of crossbows. If you\u2019re looking to maximize the damage and flexibility of a crossbow of any kind, you want to put points in Crossbow Weapon Mastery",
        "attribute": "Dexterity",
        "value": null,
        "rank_notes": {
            "Untrained": "You deal half damage with crossbows",
            "Rank F": "You deal regular damage with crossbows"
        }
    },
    {
        "type": "skill",
        "name": "Weapon Mastery Fine",
        "description": "Fine Weapon Mastery involves the effective use of medium sized weapons with the fine weapon subtype. If you\u2019re looking to maximize the damage and flexibility of a rapier, whip, or shortsword, you want to put points in Fine Weapon Mastery",
        "attribute": "Dexterity",
        "value": null,
        "rank_notes": {
            "Untrained": "You deal half damage with fine weapons",
            "Rank F": "You deal regular damage with fine weapons",
            "Rank A": "You can perform improvised physical arts with fine weapons"
        }
    },
    {
        "type": "skill",
        "name": "Weapon Mastery Improvised Weapons",
        "description": "Improvised Weapon Mastery involves the effective use of any random items as weapons. If you\u2019re looking to maximize the damage and flexibility of a chair, a broken bottle, or really any other object that isn\u2019t strictly speaking a weapon, you want to put points in Improvised Weapon Mastery",
        "attribute": "Wisdom",
        "value": null,
        "rank_notes": {
            "Untrained": "You cannot use improvised weapons",
            "Rank F": "You can use improvised weapons"
        }
    },
    {
        "type": "skill",
        "name": "Weapon Mastery Heavy Thrown Weapons",
        "description": "Heavy Throwing Mastery involves the effective use of javelins, nets, throwing axes, and even boulders as weapons. Heavy throwing weapons involve the use of your raw strength instead of any fancy technique, and are a good ranged option for warriors",
        "attribute": "Strength",
        "value": null,
        "rank_notes": {
            "Untrained": "You deal half damage with heavy thrown weapons",
            "Rank F": "You deal regular damage with heavy thrown weapons",
            "Rank A": "You can perform improvised physical arts with heavy thrown weapons"
        }
    },
    {
        "type": "skill",
        "name": "Weapon Mastery Light Thrown Weapons",
        "description": "Light Throwing Mastery involves the effective use of throwing knives, needles, shuriken, and even small rocks as weapons. Light throwing weapons involve the use of practiced technique instead of raw strength, and provide many classes additional options at range",
        "attribute": "Dexterity",
        "value": null,
        "rank_notes": {
            "Untrained": "You deal half damage with light thrown weapons",
            "Rank F": "You deal regular damage with light thrown weapons"
        }
    },
    {
        "type": "skill",
        "name": "Weapon Mastery Longblades",
        "description": "Longblade Mastery involves the effective use of longblade weapons. If you\u2019re looking to maximize the damage and flexibility of a longsword, katana, scimitar, or greatsword, you want to put points in Longblade Mastery",
        "attribute": "Strength",
        "value": null,
        "rank_notes": {
            "Untrained": "You deal half damage with long blades",
            "Rank F": "You deal regular damage with long blades",
            "Rank A": "You can perform improvised physical arts with longblades"
        }
    },
    {
        "type": "skill",
        "name": "Weapon Mastery Polearms",
        "description": "Polearm Mastery involves the effective use of polearms. If you\u2019re looking to maximize the damage and flexibility of a spear, glaive, pike, or javelin, you want to put points in Polearm Mastery",
        "attribute": "Strength",
        "value": null,
        "rank_notes": {
            "Untrained": "You deal half damage with polearms",
            "Rank F": "You deal regular damage with polearms"
        }
    },
    {
        "type": "skill",
        "name": "Weapon Mastery Shields",
        "description": "Shield Weapon Mastery involves the effective use as shields as weapons. If you want to add some offensive options to your sword and board fighting style, or even dual wield shields, you want to put points in Shield Mastery",
        "attribute": "Strength",
        "value": null,
        "rank_notes": {
            "Untrained": "You deal half damage with shields",
            "Rank F": "You deal regular damage with shields",
            "Rank A": "You can perform improvised physical arts with shields",
            "Rank 5": "You can wield shields in your main hand"
        }
    },
    {
        "type": "skill",
        "name": "Weapon Mastery Shortblades",
        "description": "Shortblade Mastery involves the effective use of stabbing weapons. If you\u2019re looking to maximize the damage and flexibility of a knife, dagger, kris, or parrying dagger, you want to put points in Shortblade Mastery",
        "attribute": "Precision",
        "value": null,
        "rank_notes": {
            "Untrained": "You deal half damage with short blades",
            "Rank F": "You deal regular damage with short blades",
            "Rank A": "You can perform improvised physical arts with short blades"
        }
    },
    {
        "type": "skill",
        "name": "Weapon Mastery Unarmed",
        "description": "Unarmed Combat Mastery involves the effective use of your own body as a weapon. If you\u2019re looking to maximize the damage and flexibility of punches, kicks, and open palm strikes, you want to put points in Unarmed Combat Mastery",
        "attribute": "Dexterity",
        "value": null,
        "rank_notes": {
            "Untrained": "You deal half damage with unarmed techniques",
            "Rank F": "You deal regular damage with unarmed techniques"
        }
    },
    {
        "type": "clazz",
        "name": "Ice Duelist",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Cryomancer",
        "flavor_text": "Skating gracefully on the ice, she applies the finishing touches to the goblins, now tasteful frozen sculptures, and then continues deeper into their lair, followed by a cold tailwind.",
        "description": "The Cryomancer is one of 8 offensive elemental mages. Harnessing the merciless aspect of ice, the Cryomancer is a flexible class that deals both single target and AOE damage, but especially excels at controlling the battlefield with crowd control spells. She can create spears of ice to impale enemies or freeze dozens of enemies solid. The Cryomancer provides a powerful defense with the power of ice and cold, and has plenty of offensive options to finish a fight.",
        "num_requirements": 2,
        "full_requirements": [
            "        Ice Mastery A",
            "        Destruction Magic A or Cloth Armor Mastery A"
        ],
        "branches": [
            "Arctic",
            "Chilling",
            "Snow"
        ],
        "passive": {
            "Frostbite": "For every round an enemy is affected by a condition applied by one of your spells, they gain a stack of Frostbite. When you inflict ice magic damage on a target, you may choose to consume all stacks of Frostbite on that target. Your ice magic damage is increased by 50% for every stack of Frostbite consumed in this manner for that instance of ice magic damage. Frostbite is not a condition, and does not require concentration"
        },
        "abilities": [
            "Ice Spear",
            "Glacial Crash",
            "Shatter",
            "Aurora Beam",
            "Flash Freeze",
            "Freezing Wind",
            "Hypothermia",
            "Heart of Ice",
            "Ice Crafting",
            "Extinguish",
            "Ice Block",
            "Frozen  Arena"
        ]
    },
    {
        "type": "clazz",
        "name": "Luxomancer",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Martial Artist",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Symbiote",
        "flavor_text": "\u201cHe\u2019s far too humble for his own good. Always in the background, trying his best to avoid the spotlight. Doesn\u2019t speak a word, except when he\u2019s casting one of his spells. But without those spells, this team would be nothing. Hell, we probably would have died on our first mission. Kid won\u2019t admit it, but he\u2019s the backbone of the squad. Everyone might look to me for leadership, but not before I look to him for assurance.\u201d",
        "description": "The Symbiote is a standard part of many mage cadres, as an intermediate level mage with a mastery of buff magic. Buff spells allow this class to assist their allies without having to attack their enemies and put themselves in harms way. As long as allies have enough composure to handle the strain of multiple buff spells, this class can turn the party into ruthless killing machines or steadfast and unbreakable defenders. As the entry level class for buff magic, this class contains a wide variety of buffing effects and the ability to maintain those effects for an extended period of time.",
        "num_requirements": 2,
        "full_requirements": [
            "        Buff Magic Rank A",
            "        Cloth Armor Rank A"
        ],
        "branches": [
            "Fiery Soul",
            "Stone Body",
            "Fluid Mind"
        ],
        "passive": {
            "Eternal Bond": "When an ally you can see has a buff\u2019s duration expire on them for a buff spell that you originally casted, you may recast the spell if they are in range as a free reaction. Mana costs are halved for spells cast this way."
        },
        "abilities": [
            "Strengthen Soul",
            "Empower Soul",
            "Bolster Soul",
            "Strengthen Body",
            "Empower Body",
            "Bolster Body",
            "Strengthen Mind",
            "Power Spike",
            "Bolster Speed"
        ]
    },
    {
        "type": "clazz",
        "name": "Corrupter",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Conjurer",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Controller",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Arcanist",
        "flavor_text": "\u201cMagic can regenerate lost limbs and necrotic organs. It can send messages across time and space, teleport us to unfathomably bizarre worlds, help us build entire cities in just a few days, and give us glimpses into both the future and the past. And yet here we are, killing each other with it. What a farce.\u201d",
        "description": "The Arcanist is the entry level destruction mage. For those mages who do not wish to pigeonhole themselves in one element, this class provides damaging spells which can utilize all 8, although it sacrifices some of the special strengths of those classes. The class\u2019s passive also grants the user some extra flexibility as far as targeting their spells is concerned, which works well with the class\u2019s overall emphasis on both single-target and multi-target/AOE damage. A third branch provides some extra utility, rounding the class out as an excellent first class for a new mage character. Functionally the class is designed to be simple and straightforward, acting as a segway to more complicated mage classes.",
        "num_requirements": 2,
        "full_requirements": [
            "        Destruction Magic Rank A",
            "        Cloth Armor Rank A"
        ],
        "branches": [
            "Zapping",
            "Blasting",
            "Arcane"
        ],
        "passive": {
            "Focus Fire": "When you cast a damaging spell attack that targets a single enemy, you may have the spell become a 15 ft square AOE instead, decreasing the spell\u2019s effectiveness by 25%. Alternatively, when you cast a damaging spell attack that is AOE, you may have the spell become single-target instead, increasing the spell\u2019s effectiveness by 25%."
        },
        "abilities": [
            "Magic Dart",
            "Magic Bomb",
            "Magic Primer"
        ]
    },
    {
        "type": "clazz",
        "name": "Abjurer",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Diviner",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Enchanter",
        "flavor_text": "I watched on as he carefully inscribed his runes upon animal bones, knit together leather with magical seals, brushed the eerie skin tone paints upon a wooden, lifeless face, all while deftly avoiding the ritual circle he had encased his work inside of, and I lamented. For this doll, this macabre mockery of the young master\u2019s image, might soon move with enchanted grace and intelligence. But it would never love him as the boy did, only imitate.",
        "description": "The Enchanter is an entry level mage that specializes in the magical school of Enchantment, using magical runes and inscriptions to apply effects to objects and equipment. Such mages are a mainstay of many armies, using their spells to augment the power of weapons and armor as well as reinforcing walls and defensive structures. They are also effective on a smaller scale, assisting party members by providing buff-like effects without taxing buff limit. This class provides a good number of entry level offensive, defensive, and utility effects for the aspiring party mage.",
        "num_requirements": 2,
        "full_requirements": [
            "        Enchantment Magic A",
            "        Cloth Armor A"
        ],
        "branches": [
            "Personal",
            "Structural",
            "Minutiae"
        ],
        "passive": {
            "Perpetual Runology": "You may have enchantment spells you cast that require concentration continue without your concentration at half effectiveness when your concentration breaks or when you choose not to concentrate on the spell when you cast it."
        },
        "abilities": [
            "Modify Weapon",
            "Reforge Armor",
            "Alter Jewelry",
            "Reconstruct Barrier",
            "Rebuild Floor",
            "Secure Building",
            "Mint Coinage",
            "Enhance Vehicle",
            "Empower Ammo"
        ]
    },
    {
        "type": "clazz",
        "name": "Illusionist",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Healer",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Summoner",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Transmuter",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Archaeomancer",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Amplifier",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Evolutionist",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Inventor",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Bioengineer",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Necromancer",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Pyromancer",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Aquamancer",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Aeromancer",
        "flavor_text": "\u201cWhen I quit the Academy to become an adventurer, they told me I\u2019d be successful as long as I remembered to go where the wind blows. But then the wind kept blowing me straight towards trouble, so I figured I\u2019d take the wheel; now, the wind blows where I go.\u201d",
        "description": "The Aeromancer is one of 8 offensive elemental mages. Harnessing the whimsical aspect of air, the Aeromancer values speed, creativity, and taking the initiative. Unlike other mages who plant themselves in the backlines, the Aeromancer uses its high mobility to literally fly across the battlefield, controlling wind to speed allies and slow enemies while inflicting damage through wind blasts and tornados. An adept Aeromancer never stays in one spot, abusing its speed and range to maximum effect to kite and whittle down even the staunchest foes.",
        "num_requirements": 2,
        "full_requirements": [
            "        Air Magic A",
            "        Destruction Magic A or Cloth Armor Mastery A"
        ],
        "branches": [
            "Gale",
            "Gust",
            "Breeze"
        ],
        "passive": {
            "Winds of War": "For every 5 feet you move using a Move Action or dash ability, gain a stack of Winds of War. When you inflict air magic damage on a target, you may choose to consume all stacks of Winds of War. Your air magic damage is increased by 5% for every stack of Winds of War consumed in this manner for that instance of air magic damage."
        },
        "abilities": [
            "Wind Slash",
            "Sky Uppercut",
            "Vicious Cyclone",
            "Vicious Hurricane",
            "Aeroblast",
            "Whisk Away",
            "Buffeting Storm",
            "Take Flight",
            "Tailwind",
            "Blowback",
            "Rotation Barrier",
            "Summon Wyvern"
        ]
    },
    {
        "type": "clazz",
        "name": "Terramancer",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Dynamancer",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Noxomancer",
        "flavor_text": "Why is it that children are always afraid of the dark? It\u2019s not something their parents teach them, after all. Is it a natural human fear of the unknown and the unseen? Or is there something about darkness itself that should be feared?",
        "description": "The Noxomancer is one of 8 offensive elemental mages. Harnessing the sinister aspect of dark, the Noxomancer is an aggressive class that deals both single target and AOE damage, but especially excels at stacking conditions on enemies, especially curses. He can inflict a variety of debilitating effects from blindness to fear, all while piling on damage. A small suite of utility spells allows the Noxomancer to take advantage of a variety of situations. Overall, the Noxomancer\u2019s slow and steady damage output is a force to be reckoned with.",
        "num_requirements": 2,
        "full_requirements": [
            "        Dark Magic A",
            "        Destruction Magic A or Cloth Armor Mastery A"
        ],
        "branches": [
            "Devastation",
            "Affliction",
            "Obfuscation"
        ],
        "passive": {
            "Neverending Nightmare": "Whenever a non-curse condition that was inflicted by you ends (in any manner, including cleanse) on an enemy in sight, they gain a curse."
        },
        "abilities": [
            "Shadow Bolt",
            "Darkbomb",
            "Corruption",
            "Defile",
            "Shriek",
            "Spreading Madness",
            "Siphon Soul",
            "Treachery",
            "Fiendish Circle"
        ]
    },
    {
        "type": "clazz",
        "name": "Gladiator",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Warrior",
        "flavor_text": "We were lost in the heat of battle, our once advantageous position shattered like glass. Acrid, fetid smoke, tinged with the flavors of blood and bile, filled our lungs and threatened to steal our lives even as we were cut down by the dozens. We were green recruits in a war far too brutal for the most hardened of veterans. And it was his cry, that glorious call to arms, which saved us.",
        "description": "The Warrior is by nature a specialist. On the outside, he appears to be a run of the mill fighter that you might expect to see as a city guardsman or a caravanserai. However, the Warrior has made the simple act of waging war into a carefully measured process. The Warrior efficiently slays masses of foes while protecting his squad; he fells giant beasts while holding a defensive line; he is a centerpiece of calm when the rest of the team panics during an ambush. The warrior has simple and effective options for single and multi-target attacks, straightforward defensive techniques, and special warcries that provide buffs or apply conditions to large groups.",
        "num_requirements": 2,
        "full_requirements": [
            "        Any melee weapon mastery skill at Rank A",
            "        Any armor mastery skill at Rank A (but not Cloth Armor Mastery)"
        ],
        "branches": [
            "Assault",
            "Protect",
            "Warcry"
        ],
        "passive": {
            "Warleader": "You gain 25% increased physical damage for each buff active on you. On your turn, you may end any buff on you of your choice as a free action to empower an ally who can hear you, increasing their next attack\u2019s damage by 25%."
        },
        "abilities": [
            "Spill Blood",
            "Cut Down",
            "Hack and Slash",
            "Summary Execution",
            "Shields Up",
            "Reinforce Armor",
            "Take Cover",
            "Paragon of Victory",
            "\u201cCharge!\u201d",
            "\u201cFight me!\u201d",
            "\u201cOvercome!\u201d",
            "\u201cKill them all!\u201d"
        ]
    },
    {
        "type": "clazz",
        "name": "Warlord",
        "flavor_text": "I could feel the scream trapped in my throat and could not tear my eyes away from the grisly spectacle before me. Blood dripped from the corpses pinned to the walls, and the sound of each drop threatened madness. The guilty and innocent lay here; eviscerated, torn to shreds, filled with holes. In a brief moment of poignant horror, I wondered how I would explain to the children. And I questioned what kind of man would lust for such senseless violence.",
        "description": "The Warlord is a fighter that understands the value of flexibility. Adept at fighting at close range with a variety of melee abilities and controlling longer ranges with a ranged weapon of their choice, the Warlord dominates the battlefield by abusing range advantages against less prepared foes. Diving in close against archers and mages, kiting other fighters, harrying enemies as they approach, this class can reliably put down a constant stream of damage and never wastes turns getting into position due to good mobility. The Warlord is rewarded, however, for switching between ranged and melee attacks frequently, forcing enemies to keep up with constantly changing tactics.",
        "num_requirements": 2,
        "full_requirements": [
            "        Any Melee Weapon A (but not Unarmed Mastery)",
            "        Any Ranged Weapon A"
        ],
        "branches": [
            "Close Range",
            "Long Range",
            "Weapon Swap"
        ],
        "passive": {
            "Calculated Aggression": "When you successfully deal physical damage with a melee weapon to a target, your next ranged attack becomes empowered for 50% increased physical damage. When you successfully deal physical damage with a ranged weapon to a target, your next melee attack becomes empowered for 50% increased physical damage. Calculated Aggression can trigger at most once per turn and the empowered effect does not stack."
        },
        "abilities": [
            "Pivot and Slash",
            "Knock Aside",
            "Crippling Blow",
            "Advancing Fire",
            "Hookshot",
            "Stopping Shot",
            "Weapon Swap: Roll",
            "Weapon Swap: Quaff",
            "Weapon Swap: Attack"
        ]
    },
    {
        "type": "clazz",
        "name": "Skald",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Assassin",
        "flavor_text": "Leaping down from the rafters, he lands soundlessly behind the two guards and slips daggers between their ribs before they can react, then turns and sneaks into the King\u2019s quarters, his footsteps masked by the monarch\u2019s snores.",
        "description": "The Assassin has always been a career of necessity. When a sword is too direct and a fireball too flashy, the dagger has always served as an inconspicuous tool to end someone\u2019s life. The Assassin excels at its use, as well as finding its way on top of its prey without being detected. With an excess of frontloaded damage, and the necessary abilities to prepare for a kill, the Assassin always tries to end a fight with the first blow. This class has access to abilities to increase its damage and critical strike chance, as well as various tools to track and sneak up on prey, and close in quickly.",
        "num_requirements": 2,
        "full_requirements": [
            "        Sneak A",
            "        Shortblades Mastery A"
        ],
        "branches": [
            "Skulk",
            "Preparation",
            "Execution"
        ],
        "passive": {
            "Assassinate": "If you attack an uninjured enemy with a shortblade, double all damage for that attack."
        },
        "abilities": [
            "Vanish",
            "Maneuver",
            "Pursue",
            "Stalk",
            "Focus",
            "Sharpen",
            "Haste",
            "Bloodlust",
            "Backstab",
            "Pounce",
            "Skyfall",
            "Massacre"
        ]
    },
    {
        "type": "clazz",
        "name": "Sentinel",
        "flavor_text": "\u201cThere is a place where civilization gives way to twisting undergrowth and unknown shores. Where good and evil just barely begin to blur together. A place where brave heroics fail and terror dominates the heart. This is the place where he stands guard. Waiting for the end.\u201d",
        "description": "The Sentinel is a fighter class that has mastered the use of shields as weapons. Dual wielding bladed shields with specialized chain systems attached to their wristguards, the Sentinel has redefined the art of shield combat with innovative new techniques. Being able to double down on the defensive aspects of shields, the Sentinel also brings vicious new attacking opportunities and a wealth of utility and mobility. This class bides its time playing defensively in order to release energy in a burst of explosive movements and attacks in later rounds. The chains on his shields allow for easy shield tossing and dragging himself and opponents where he pleases, and opens up his effective range and target selection. While dual wielding is technically optional with this class, choosing to hold two shields maximizes the abilities this class provides. In order to help these specialized shields mesh with other classes, the Sentinel treats all shields that have implicit damage as axes, longblades, blunt weapons, and heavy throwing weapons as well. The default range for a Sentinel\u2019s shield chain is 30 ft, and can be picked up from range using the chains as a free action.",
        "num_requirements": 2,
        "full_requirements": [
            "        Armor: Shields A",
            "        Weapons: Shields 5"
        ],
        "branches": [
            "Dauntless",
            "Stalwart",
            "Tenacious"
        ],
        "passive": {
            "Perfect Shield": "While you are not in Shield stance, when you block an attack, gain a Shield stack. At the end of your turn, you may expend all Shield stacks to gain that many special reactions and enter Shield stance until the beginning of your next turn. You may use special reactions gained this way as normal reactions or to cast any Sentinel ability. Sentinel abilities you cast this way have their stamina cost halved."
        },
        "abilities": [
            "Crossguard Guillotine",
            "Parallel Shields",
            "Chain Rush"
        ]
    },
    {
        "type": "clazz",
        "name": "Soldier",
        "flavor_text": "They teach you a whole lot about keeping yourself together in Basic. How to swing your sword so you don\u2019t injure your wrist or shoulder. How to brace yourself for an impact against your shield. How to keep moving so a random archer doesn\u2019t end your career early. And most importantly, how to strike first, so they die before you do. They don\u2019t really talk about what to do after you\u2019ve killed a man, though. And you\u2019ve got to kill a lot of men before you learn the meaning of being a soldier.",
        "description": "The Soldier is a fighter who wields sword and shield, but boasts an impressive level of mobility as well. Trained with more modern techniques of striking quickly and focusing on survival, this class provides a multitude of options for blocking or dodging incoming attacks, and fighting in a responsive, calculated style that wouldn\u2019t normally be expected of a fighter. The Soldier fights on the front lines like other fighters, but isn\u2019t restricted to heavy armor, and utilizes strategy over raw power to whittle down opponents.",
        "num_requirements": 2,
        "full_requirements": [
            "        Longblades Mastery A",
            "        Shield Armor Mastery A"
        ],
        "branches": [
            "Skirmish",
            "Safeguard",
            "Sprint"
        ],
        "passive": {
            "Defensive Footwork": "When you use your reaction to use a block ability and successfully avoid/reduce damage from an incoming attack, gain a special reaction until the beginning of your next turn which can only be used for a dash reaction ability. When you use your reaction to use a dash reaction ability and successfully avoid/reduce damage from an incoming attack, gain a special reaction until the beginning of your next turn which can only be used for a block reaction ability. Special reactions provided by Defensive Footwork have their mana and stamina costs halved. Defensive Footwork can activate at most once per round, and refreshes at the beginning of each of your turns."
        },
        "abilities": [
            "Fleetfoot Blade",
            "Steadfast Strikes",
            "Biding Blade",
            "Sever The Head",
            "Intercept",
            "Shield Bash",
            "Protective Sweep",
            "Long Live The King",
            "Dodge Roll",
            "Double Time",
            "Tactical Withdrawal",
            "Vigor of Battle"
        ]
    },
    {
        "type": "clazz",
        "name": "Air Duelist",
        "flavor_text": "\u201cI used to think I was the best. I could hit a goblin off its warg from 300 feet away. I used to split my first arrow with my second at the shooting range at school. But I had a rude awakening when I met her. She could shoot dragons out of the sky against the winds created by their beating wings. Her arrows whistled like mystical birdsong. I shot for sport; she created art.\u201d",
        "description": "The Air Duelist is one of many spellblade variants that focuses on one element and one weapon. This class wields a bow as well as powerful air magic. By interlacing shots from her bow with precise wind strikes, the Air Duelist maximizes its action economy. Her individual spells are weaker than a dedicated air mage\u2019s, but her weapon provides increased flexibility and effectiveness at longer ranges, and his offensive output can surpass a regular duelist\u2019s with efficient usage of physical and magical arts. Her spells are primarily buffing and damaging in nature, with all the additional support and utility that air magic tends to provide, and there is a heavy emphasis on forced movement and mobility.",
        "num_requirements": 2,
        "full_requirements": [
            "        Bow Mastery A",
            "        Air Magic A"
        ],
        "branches": [
            "Dueling",
            "Casting",
            "Buffing"
        ],
        "passive": {
            "Whirlwind Quiver": "Once per turn, when you deal air magic damage to a target with a spell, gain one Whirlwind Arrow special ammunition. You may have up to 2 Whirlwind Arrows at a time, this special ammunition can not be recovered, and they expire at the end of combat. When you use a Whirlwind Arrow to make an attack with a bow, you may do so as a free action (you still pay any other costs)."
        },
        "abilities": [
            "Gale Shot",
            "Zephyr Shot",
            "Storm Shot",
            "Wind Strike",
            "Cutting Winds",
            "Harassing Whirlwind",
            "Mistral Bow",
            "Arc of Air",
            "Bow of Hurricanes"
        ]
    },
    {
        "type": "clazz",
        "name": "Sniper",
        "flavor_text": "At 30 seconds to midnight, I reconfirmed my target, still sipping wine on the veranda. At 26 seconds, I drew my longbow, custom crafted for this single shot. I planned to shatter it and toss the remains in the nearby river afterwards. At 18 seconds, I finished applying the oils to the ammo I\u2019d use. And at 7 seconds, I finally lined up the shot, and synced the rhythm of breath and heart to my countdown. 5\u20264\u20263\u20262\u2026",
        "description": "The Sniper delivers death from afar. Unlike archers who use shortbows and crossbows for medium range engagements, firing dozens of arrows to slay their target, the Sniper relies on single, extremely powerful and accurate shots from extreme ranges. The firing rate of the average longbow tends to be lower, but the range and damage output easily make up for it. The Sniper expands upon the longbow\u2019s strengths by preparing carefully for each shot. He spots his target, tracks their movement, the way they dodge, the weak points in their armor. And finally, when he is ready to take the shot, he has already stacked all the cards in his favor.",
        "num_requirements": 2,
        "full_requirements": [
            "        Bow Mastery A",
            "        Light Armor Mastery A"
        ],
        "branches": [
            "Shooting",
            "Aiming",
            "Improvising"
        ],
        "passive": {
            "Spotter": "At any time, you may mark an enemy target you can see as Spotted. While you have a Spotted target, you gain 1 stack of Spotting whenever you take a Major action that does not involve dealing damage or moving. You can also use your Major action to track your target, gaining 2 stacks of Spotting. You have a maximum limit of 8 stacks of Spotting. You lose all stacks of Spotting when a Spotted target dies, or when you switch the mark to a new target. When you attack a Spotted target with a ranged attack from a longbow, you expend all stacks of Spotting, and deal 25% increased damage per stack expended this way."
        },
        "abilities": [
            "Piercing Shot",
            "Kill Shot",
            "Shrapnel  Shot",
            "Rapid Shot",
            "Distance Shooter",
            "Precision Shooter",
            "Analytical Shooter",
            "Professional Shooter",
            "Swift Sprint",
            "Swift Shot",
            "Bola Shot",
            "Evasive Maneuvers"
        ]
    },
    {
        "type": "clazz",
        "name": "Arcane Archer",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Marksman",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Rifleman",
        "flavor_text": "\u201cDANGER! MISHANDLING OF FIREARM CAN RESULT IN SERIOUS INJURY OR DEATH. You are now the proud owner of an Achak Industries firearm, which comes with certain responsibilities which the Sultanate of Kraithan requires our company to inform you of. Do not point a firearm at anyone or anything you do not intend to fire at. Always assume a firearm is loaded. Achak Industries is not liable for any harm that comes to any law-abiding citizens as a result of improper or reckless use of our equipment. Do not even think of suing us; our lawyers are better than yours and also have guns. Thank you for your patronage.\u201d",
        "description": "The Rifleman is the entry level bullet weapon class. The use of firearms is difficult for multiple reasons, which the Rifleman helps remedy: firearms require a special action called a Reload Action, which takes two Major Actions, to reload their ammunition, and firearms have an inherent misfire rate that forces a player to roll everytime they attack to see if their gun doesn\u2019t just fall apart. To make up for these weaknesses, the average firearm has improved damage capabilities thanks to the secondary fire, an alternative to regular autoattacks. The Rifleman has abilities to minimize misfire, improve damage and speed, and abuse secondary fire and ammunition types to great effect, and acts as an excellent first step to any character who wishes to use firearms for the long term. Damage is high and range is medium compared to other ranged options, and firearms combine many of the unique strengths of both crossbows and bows, often piercing and pushing enemies back.",
        "num_requirements": 2,
        "full_requirements": [
            "        Bullet Weapons Rank A",
            "        Light Armor Rank A"
        ],
        "branches": [
            "Operation",
            "Assembly",
            "Maintenance"
        ],
        "passive": {
            "Silver Bullet": "At the beginning of your turn, select a bullet currently chambered in a firearm in your inventory. It becomes a silver bullet, this class\u2019s unique special ammunition (if the bullet chosen is already special ammunition, it retains its other properties). When you create a silver bullet, you may choose an additional effect for the ammunition from the list below:\nAn attack with this ammunition ignores AC\nAn attack with this ammunition ignores MR\nAn attack with this ammunition cannot miss\nAn attack with this ammunition gains an extra damage die"
        },
        "abilities": [
            "Bodyshot",
            "Iron Sights",
            "Quick Reload"
        ]
    },
    {
        "type": "clazz",
        "name": "Bard",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Dancer",
        "flavor_text": "\u201cDance, when you're broken open. Dance, if you've torn the bandage off. Dance in the middle of the fighting. Dance in your blood. Dance when you're perfectly free.\u201d",
        "description": "The Dancer is one of many classes that evolves from the simple non-combat art of dancing. Combining their love for dance with the natural rhythm and furor of combat, the Dancer is able to move between enemies and allies while maintaining the fluid movements of their many forms. Dancing while moving costs additional stamina, but the Dancer can save on stamina costs by being an intelligent choreographer and moving through their many dances in a specific order. Most dances either provide allies with vigor and strength or confuse allies with bewitching and undulating movement.",
        "num_requirements": 2,
        "full_requirements": [
            "        Dancing A",
            "        Light Armor Mastery A"
        ],
        "branches": [
            "Sway",
            "Strut",
            "Shimmy"
        ],
        "passive": {
            "Dance The Night Away": "You may cast dance abilities alongside your regular Move Action if you expend twice as much stamina. If you do, your Move Action does not provoke opportunity attacks."
        },
        "abilities": [
            "Belly Dance",
            "Swing",
            "Jive",
            "Tango",
            "Waltz",
            "Boogie",
            "Foxtrot",
            "Moonwalk",
            "Ballet"
        ]
    },
    {
        "type": "clazz",
        "name": "Lightning Duelist",
        "flavor_text": "One second, the two strangers were calmly watching each other from opposite sides of the raucous tavern; the next second, we heard a clap of thunder, and the smaller one had closed the gap in the blink of an eye. Everything was suddenly quiet, but for the slightest hum of energy and tension. We all held our breath even as the hair on the backs of our necks stood on end, and we prayed that the stranger\u2019s sword would stay in its scabbard.",
        "description": "The Lightning Duelist is one of many spellblade variants that focuses on one element and one weapon. This class wields a rapier in one hand and volatile lightning magic in the other. By seamlessly weaving together rapier lunges and jabs with lightning magic spells, the Lightning Duelist has excellent action economy. His individual spells are weaker than a dedicated lightning mage\u2019s, but his weapon provides increased flexibility and effectiveness at shorter ranges, and his offensive output can surpass a regular duelist\u2019s with efficient usage of physical and magical arts. His spells are primary buffing and damaging in nature, with all of the random, violent flavor that lightning spells tend to have, and there is a heavy emphasis on mobility and flexibility of aggressive attack patterns.",
        "num_requirements": 2,
        "full_requirements": [
            "        Lightning Mastery A",
            "        Fine Weapons Mastery A"
        ],
        "branches": [
            "Dueling",
            "Casting",
            "Buffing"
        ],
        "passive": {
            "Battle Current": "Whenever you deal lightning magic damage to a target with a spell, you become empowered, and you may have the next attack you make with a rapier occur a second time at no cost. You may choose new targets for the second rapier attack. Battle Current does not stack with itself, but can occur multiple times per turn, and it does not count as a buff or require concentration."
        },
        "abilities": [
            "Lightning Lunge",
            "Blade Storm",
            "Shocking Parry",
            "Flash of Swords",
            "Shock Tendrils",
            "Ball Lightning",
            "Thunder Blast",
            "Arc Lightning",
            "Taser Blade",
            "Sword of Lightning",
            "Plasma Saber",
            "Lightning Coil Cuirass"
        ]
    },
    {
        "type": "clazz",
        "name": "Lasher",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Fire Duelist",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Dark Duelist",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Water Duelist",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Viking",
        "flavor_text": "",
        "description": "",
        "num_requirements": 2,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Chain Master",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Pinpoint Monk",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Tinkerer",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Ki Monk",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Golem Master",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Transfusionist",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Morphologist",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Upgrade Alchemist",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Reconstructionist",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Modifier",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Lifedrinker",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Champion",
        "flavor_text": "\u201cThis one\u2019s the Spear of the Frozen Throne! Papa got it after looting the lair of a lich up north! And this one\u2019s the Blade of Sunlight! It shoots beams when in the hands of a hero! And here\u2019s the Bow of True Death! I\u2019m not allowed to touch it because Papa says it\u2019s cursed. Pretty cool, huh? C\u2019mon, Papa\u2019s got even cooler stuff in the attic!\u201d",
        "description": "The Champion is a fighter that has devoted his life to the mastery of as many weapons as possible. Just like how a mage might study for years to master a wide variety of spells, the Champion trains for years to master a wide variety of both melee and ranged weapons. The Champion has high strength to swing around greatsword and halberds but also has high dexterity to deftly handle whips and rapiers. The class swaps weapons easily, adapting to the situation, and is especially good at showing off the specific strengths and flairs of each type of weapon. The Champion may only require 3 weapon types to unlock, but is further rewarded for mastering more weapons over the course of their adventuring career.",
        "num_requirements": 1,
        "full_requirements": [
            "        Any 3 Weapon Masteries Rank A"
        ],
        "branches": [
            "Type A Weapons",
            "Type B Weapons",
            "Type C Weapons"
        ],
        "passive": {
            "Master of Arms": "Once per turn, you may freely swap weapons in both hands. After you do, you may make a free autoattack with an extra damage die on the weapon and with the following additional effects, based on weapon type:\nAxe - Cleave reaches an additional space from your target\nBlunt - The weapon\u2019s implicit condition cannot be resisted\nLongblade - The weapon keeps its additional damage die for the rest of the round\nPolearm - Reach is extended to 15 ft for the rest of the round\nShield - Blocking allows you to repeat this autoattack for the rest of the round as long as a shield remains equipped\nHeavy Throwing Weapon - This attack creates a shockwave around the target, dealing its damage to enemies adjacent to your target as well\nBow - This attack pushes the target 20 ft away from you\nBullets - This attack causes a muzzle blast to deal damage to enemies adjacent to you as well\nCrossbow - This attack penetrates enemies to travel its full length\nFine - This attack ignores AC and MR\nUnarmed - This attack repeats twice more\nLight Throwing Weapons - This attack cannot miss\nShortblade - This attack has +20% critical strike chance\nImprovised - This attack has 2 more extra damage dice"
        },
        "abilities": [
            "Slice and Dice",
            "Skull Bash",
            "Piercing Blow",
            "Arsenal of Power",
            "Precision Strike",
            "Fan The Hammer",
            "Painful Blow",
            "Arsenal of Finesse",
            "Disarming Blow",
            "Throat Slitter",
            "Parry and Draw",
            "Weapon Juggling"
        ]
    },
    {
        "type": "clazz",
        "name": "Captain",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Bladerunner",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Thief",
        "flavor_text": "WANTED: The craven criminal who continues to harry our humble hamlet! The unnamed, unknown, unscrupulous usurper of the rightfully received revenues of our most righteous regime! This wanton mobster, whether man or woman or what have you, will with certainty maintain a masterful circumvention of our most muddled constabulary! The government guarantees a generous guerdon, gifted to the group who swiftly seizes this serpentine scofflaw!",
        "description": "The Thief is a career of daring exploits and mischief. Stealing from the rich and poor, the strong and weak, the Thief preys upon the riches of others for their own personal gain. With excellent abilities to sneak past watchful eyes and a knack for knifeplay, the Thief augments its meager combat ability with excellent stealing and sneaking abilities. This class switches between focusing on stealing and focusing on sneaking and adapts to the situation at hand, fluidly sifting through a bag of both offensive and defensive tricks, and is effective at critical strikes when stealth fails and combat breaks out.",
        "num_requirements": 3,
        "full_requirements": [
            "        Steal A",
            "        Sneak A",
            "        Shortblade Mastery A"
        ],
        "branches": [
            "Predator",
            "Pilfer",
            "Prowl"
        ],
        "passive": {
            "Hit and Run": "At the beginning of combat, enter either Hit Stance or Run Stance, and you may switch at the beginning of each of your turns. When you enter Hit Stance, drain 20 stamina from a target in melee range. During Hit Stance, your attacks have \u201cOn Hit: Drain 10 health.\u201d When you enter Run Stance, become Hidden and dash up to 15 ft in any direction. During Run Stance, your movement does not provoke opportunity attacks or trigger traps, and you gain +20 move speed."
        },
        "abilities": [
            "Cloak and Dagger",
            "Blade in the Dark",
            "Frenetic Assault",
            "Unavoidable Casualties",
            "Snatch and Grab",
            "Charm and Disarm",
            "Purloin Powers",
            "Grand Thievery",
            "Infiltrate",
            "Dodge the Law",
            "Smokescreen",
            "Phantom Thief"
        ]
    },
    {
        "type": "clazz",
        "name": "Assault Trooper",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Groveguard",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Bodyguard",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Warper",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Ranger",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Paladin",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Duelist",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Barrager",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Blade Lord",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Pegasus Knight",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Bladesinger",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Shadowdancer",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Ambusher",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Eldritch Knight",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Mistguard",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Daggerspell",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Dragonslayer",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Reaper",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Firewheeler",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Harrier",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Horizon Stalker",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Mirror Mage",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Steam Mage",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Woodsman",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Herald",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Soulbinder",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Card Master",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Warlock",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Arcane Trickster",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Magic Gunner",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Battle Architect",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Bomber",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Visionary",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Dragon Caller",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Demonologist",
        "flavor_text": "",
        "description": "",
        "num_requirements": 3,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Tempest",
        "flavor_text": "",
        "description": "",
        "num_requirements": 4,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Evangelist",
        "flavor_text": "\u201cTo think that there would be somebody foolish enough to willingly choose darkness. You should realize that darkness is not such a simple thing. The shadow opposite light. The night opposite day. Right and wrong. Good and evil. Order and chaos. Reason and irrationality. Look at it. Savor it. Remember it well. This is the source of your power. Your initial impulses. Your first dive. Your original self. If you can\u2019t handle it, it\u2019s the end for you. Prepare yourself.\u201d",
        "description": "Evangelist brings together the most powerful parts of ice and dark magic, casting high powered AOE spells with ease and causing widespread destruction. It also applies the typical conditions that ice and dark are capable of, but goes a step further with some unique curse abilities, including some that work with ice spells. However, the most integral part of the class is the passive, allowing the Evangelist to turn any damaging spell into a powerful and dangerous steroid. Evangelist is designed to be the final step for an ice or dark mage, and thus has a lot of extra power and complexity in its spells, but the passive also grants some extra synergy with other mages, allowing you to recontextualize your spell list into a list of possible augmentations.",
        "num_requirements": 4,
        "full_requirements": [
            "        Ice Mastery Rank A",
            "        Dark Mastery Rank A",
            "        Enchantment Magic Rank A",
            "        Destruction Magic Rank A"
        ],
        "branches": [
            "Gelidus Ouranos",
            "Nivis Obscurans",
            "Magia Ensis"
        ],
        "passive": {
            "Magia Erebea": "When you cast a damaging spell attack, instead of releasing the spell, you may absorb its energy to enchant your soul. You may only do so with one spell at a time; activating this passive with a new spell when you already have it active will end the previous effect to allow you to absorb the new spell and gain its effects. While enchanted this way, you lose 10 maximum health per turn. Maximum health lost this way is restored after a long rest and is not considered a condition. You may release Magia Erebea as a free reaction; otherwise, it continues until your maximum health reaches one. Magia Erebea is neither spell nor buff. While under the effects of Magia Erebea, you gain the following effects, based on the absorbed spell:\nYour spell attacks gain on hit damage die equal to the damage die of the absorbed spell (if the spell has multiple modes resulting in multiple possible damage die configurations, take the mode with the lowest potential maximum damage)\nYour spell attacks inflict any conditions that the absorbed spell would inflict as an on hit effect\nYour spell attacks have their range extended by an amount equal to the range of the absorbed spell\nYou may have your spell attacks have their damage type changed to any element that the absorbed spell has\nYou become elementally aspected to the elements of the absorbed spell"
        },
        "abilities": [
            "Krystalline Basileia",
            "Iaculatio Orcus",
            "Frigerans Barathrum",
            "Anthos Pagetou Khilion Eton",
            "Actus Noctis Erebeae",
            "Supplementum Pro Armationem"
        ]
    },
    {
        "type": "clazz",
        "name": "Night Lord",
        "flavor_text": "",
        "description": "",
        "num_requirements": 4,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Ninja",
        "flavor_text": "",
        "description": "",
        "num_requirements": 4,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Voidwalker",
        "flavor_text": "",
        "description": "",
        "num_requirements": 4,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Gatekeeper",
        "flavor_text": "",
        "description": "",
        "num_requirements": 4,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Demon Hunter",
        "flavor_text": "\u201cThere will never be peace between humanity and Hell. We create these demons; they\u2019re born of our own twisted hearts and blackened souls. Folks ask me what\u2019s the worst I\u2019ve seen while on the job; I don\u2019t have the heart to tell them that those memories have nothing to do with demons. It makes an old, melodramatic coot like me want to turn my guns on the ones I\u2019ve sworn to protect, sometimes. But as long as there\u2019s still one good person left on this earth...Well, I can tolerate any number of demons for just one angel.\u201d",
        "description": "The Demon Hunter has a thankless job. A master of light and lightning magic, and armed with demon slaying weapons, he dives into the fray against the foulest creatures in the multiverse. Sometimes persisting for weeks amongst their kind, doling out holy death in an almost reckless manner; in reality, the Demon Hunter specializes in the simple act of survival against beings who have lived for centuries and mastered every dark art in the book. This class understands well the balance between maintaining a careful defensive manner and exploiting brilliant yet narrow offensive opportunities. The class\u2019s passive provides ample defensive options to allow the user to spend their action economy on attacking instead, which in turn grants them further use of their passive. With powerful light and lightning spells similar to the Cleric\u2019s, but with a focus on defense, and deadly ranged attacks, the Demon Hunter represents a pinnacle of efficiency, a maelstrom of human willpower, and a nightmare to every demon that crosses his path.",
        "num_requirements": 4,
        "full_requirements": [
            "        Light Mastery Rank A",
            "        Lightning Mastery Rank A",
            "        Bow, Crossbow, or Bullet Weapons Rank A",
            "        Light Armor Rank A"
        ],
        "branches": [
            "Slayer",
            "Exorcism",
            "Humanity"
        ],
        "passive": {
            "Evil\u2019s Bane": "At the beginning of each turn, gain a stack of Hunter. You also gain a Hunter stack when you successfully deal 100 damage in a single round, but only once per round (this effect refreshes at the beginning of your turn). Lose all stacks of Hunter after combat ends. You may expend a Hunter stack as a free reaction at any time to perform one of the following:\nGain an additional reaction this round\nCleanse a condition of your choice on yourself\nHeal for 5d10 health\nIgnore all effects from enemy fields until the beginning of your next turn"
        },
        "abilities": [
            "Demonbane Blast",
            "Consecrated Carnage",
            "Banishing Bolt",
            "Lifesteal Elegy",
            "Hunter\u2019s Guile",
            "Essence Scatter"
        ]
    },
    {
        "type": "clazz",
        "name": "Raider",
        "flavor_text": "",
        "description": "",
        "num_requirements": 4,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Kickboxer",
        "flavor_text": "",
        "description": "",
        "num_requirements": 4,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Ravager",
        "flavor_text": "",
        "description": "",
        "num_requirements": 4,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Cleric",
        "flavor_text": "",
        "description": "",
        "num_requirements": 4,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Brawler",
        "flavor_text": "",
        "description": "",
        "num_requirements": 4,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Hemoplague",
        "flavor_text": "",
        "description": "",
        "num_requirements": 4,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Corpselight",
        "flavor_text": "",
        "description": "",
        "num_requirements": 4,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Auramancer",
        "flavor_text": "",
        "description": "",
        "num_requirements": 4,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Synergist",
        "flavor_text": "",
        "description": "",
        "num_requirements": 4,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Master Alchemist",
        "flavor_text": "",
        "description": "",
        "num_requirements": 5,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "clazz",
        "name": "Elementalist",
        "flavor_text": "",
        "description": "",
        "num_requirements": 8,
        "full_requirements": [],
        "branches": [],
        "passive": {},
        "abilities": []
    },
    {
        "type": "ability",
        "name": "Ice Spear",
        "clazz": "Cryomancer",
        "branch": "Arctic",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "10 mana",
        "rng": "30 ft",
        "duration": "Instant",
        "description": [
            "You form a spear of ice and fire it at a nearby target. Deal 6d8 ice magic damage to a target in range. The ice spear passes through any enemies along its path, dealing half damage."
        ],
        "tags": [
            "Spell",
            "attack",
            "ranged",
            "ice",
            "destruction",
            "damage",
            "single-target",
            "multi-target"
        ]
    },
    {
        "type": "ability",
        "name": "Glacial Crash",
        "clazz": "Cryomancer",
        "branch": "Arctic",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "30 mana",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You cause spears of ice to erupt around you. Enemies within 5 ft of you take 6d8 ice magic damage and are Frozen. Enemies within 10 ft of you take 4d8 ice magic damage and are Slowed. Enemies within 15 ft of you take 2d8 damage."
        ],
        "tags": [
            "Spell",
            "attack",
            "ice",
            "destruction",
            "damage",
            "self-target",
            "condition",
            "control",
            "Slow",
            "Frozen",
            "AOE"
        ]
    },
    {
        "type": "ability",
        "name": "Shatter",
        "clazz": "Cryomancer",
        "branch": "Arctic",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "50 mana",
        "rng": "30 ft",
        "duration": "Instant",
        "description": [
            "You shatter an enemy encased in ice. Deal 10d8 ice magic damage to a target within range who is Frozen. Their Frozen condition ends, and they are Slowed. Then, this spell\u2019s effect repeat for an adjacent Frozen target. A target cannot be damaged by this spell more than once per cast."
        ],
        "tags": [
            "Spell",
            "attack",
            "ice",
            "destruction",
            "damage",
            "single-target",
            "conditional",
            "Frozen",
            "Slow",
            "repeatable"
        ]
    },
    {
        "type": "ability",
        "name": "Aurora Beam",
        "clazz": "Cryomancer",
        "branch": "Arctic",
        "tier": 4,
        "action": "1 Major Action",
        "cost": "X mana",
        "rng": "60 ft",
        "duration": "Instant",
        "description": [
            "You emit a powerful beam of ice. Deal Xd8 ice magic damage to all targets in a line, where X is the amount of mana expended on this spell divided by 5. You may choose to concentrate on this spell further, and if you do, you may use a major action to repeat this spell for no mana cost, at half its previous damage. If this spell consumes at least 5 stacks of Frostbite, refund half of the mana cost. If this attack consumes at least 10 stacks of Frostbite, refund the full mana cost."
        ],
        "tags": [
            "Spell",
            "attack",
            "ice",
            "destruction",
            "damage",
            "AOE",
            "line",
            "modal",
            "continuous",
            "concentration",
            "gain mana"
        ]
    },
    {
        "type": "ability",
        "name": "Flash Freeze",
        "clazz": "Cryomancer",
        "branch": "Chilling",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "15 mana",
        "rng": "30 ft",
        "duration": "1 minute",
        "description": [
            "You freeze a target solid. Apply Frozen to a target in range, and apply Slow to any enemies adjacent to your target. Applies a stack of your passive on cast, even if resisted."
        ],
        "tags": [
            "Spell",
            "attack",
            "ice",
            "condition",
            "control",
            "Frozen",
            "Slow",
            "single target"
        ]
    },
    {
        "type": "ability",
        "name": "Freezing Wind",
        "clazz": "Cryomancer",
        "branch": "Chilling",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "35 mana",
        "rng": "60 ft cone",
        "duration": "Instant",
        "description": [
            "You conjure a cone of icy wind. Enemies in a 60 ft cone in front of you are Slowed. If an enemy is hit by this spell, and already is Slowed or has a stack of your passive on them, they are Frozen instead."
        ],
        "tags": [
            "Spell",
            "attack",
            "ice",
            "conjuration",
            "control",
            "Frozen",
            "Slow",
            "AOE",
            "cone"
        ]
    },
    {
        "type": "ability",
        "name": "Hypothermia",
        "clazz": "Cryomancer",
        "branch": "Chilling",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "70 mana",
        "rng": "30 ft",
        "duration": "Instant",
        "description": [
            "You drop a target\u2019s body temperature, slowing their metabolism. A target within range becomes Slowed, loses its Major action, Minor action, and reaction, and loses all Evasion. This spell requires concentration."
        ],
        "tags": [
            "Spell",
            "attack",
            "ice",
            "condition",
            "control",
            "Slow",
            "action loss",
            "evasion loss",
            "single-target",
            "concentration"
        ]
    },
    {
        "type": "ability",
        "name": "Heart of Ice",
        "clazz": "Cryomancer",
        "branch": "Chilling",
        "tier": 4,
        "action": "1 Major Action",
        "cost": "100 mana",
        "rng": "Self",
        "duration": "1 hour",
        "description": [
            "You drape yourself in an icy aura. For the duration of this spell, enemies who move into a space within 30 feet of you become Slowed. Adjacent enemies who attack you become Frozen. Attacks from enemies more than 30 ft away grant you 40% evasion for that attack. Allies who are adjacent to you have all types of damage they deal converted to ice magic damage, and inflict Frostbite on-hit (limited to once per turn). You may use your reaction to cast any ice spell while this buff is active."
        ],
        "tags": [
            "Spell",
            "ice",
            "buff",
            "condition",
            "Slow",
            "Frozen",
            "self-target",
            "on-hit",
            "add evasion",
            "ally buff",
            "concentration"
        ]
    },
    {
        "type": "ability",
        "name": "Ice Crafting",
        "clazz": "Cryomancer",
        "branch": "Snow",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "5 mana",
        "rng": "50 ft",
        "duration": "10 minutes",
        "description": [
            "You create sheets of ice and snow. Cover the ground in a target space in your choice of either ice or snow. Ice spaces force creatures to make Balance checks or fall prone. Snow spaces count as difficult terrain. When you cast this spell, you can repeat it for as many spaces within range as desired, expending 5 more mana for every additional space. You can also create a pillar of ice or snow, with a height of up to 10 ft, in any space for an additional 5 mana."
        ],
        "tags": [
            "Spell",
            "smite-target",
            "conjuration",
            "ice",
            "modal",
            "repeatable"
        ]
    },
    {
        "type": "ability",
        "name": "Extinguish",
        "clazz": "Cryomancer",
        "branch": "Snow",
        "tier": 2,
        "action": "1 Reaction",
        "cost": "20 mana",
        "rng": "100 ft",
        "duration": "Instant",
        "description": [
            "You take advantage of a mage casting a spell, freezing his mana. As a reaction to a target in range casting a spell, you may counter that spell. That target becomes Silenced until the end of their next turn."
        ],
        "tags": [
            "Spell",
            "counterspell",
            "condition",
            "defensive",
            "Silence",
            "control",
            "ice",
            "single-target"
        ]
    },
    {
        "type": "ability",
        "name": "Ice Block",
        "clazz": "Cryomancer",
        "branch": "Snow",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "40 mana",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You surround yourself in an icy armor, and manipulate a shield of ice. Increase your AC by 20, and increase your general MR by 30% until the beginning of your next turn. While you have this buff, you may use your reaction to completely block one attack on you or an ally within 30 ft, for no additional mana."
        ],
        "tags": [
            "Spell",
            "defensive",
            "buff",
            "AC increase",
            "MR increase",
            "block",
            "self-target",
            "single-target"
        ]
    },
    {
        "type": "ability",
        "name": "Frozen  Arena",
        "clazz": "Cryomancer",
        "branch": "Snow",
        "tier": 4,
        "action": "1 Major Action",
        "cost": "60 mana",
        "rng": "1000 ft",
        "duration": "1 minute",
        "description": [
            "You create an arena surrounded in ice. Create a 200 ft cube zone centered on a point within range. Within this zone, all enemies have the following: they are revealed; they cannot leave the zone unless you allow them as a free reaction; if they have at least 1 stack of Frostbite, they have their Frostbite doubled at the beginning of each turn. Any entity that dies with at least 1 stack of Frostbite has its Frostbite stacks transferred to another entity of your choice within the zone."
        ],
        "tags": [
            "Spell",
            "ice",
            "AOE",
            "zone",
            "cube",
            "on-death",
            "concentration"
        ]
    },
    {
        "type": "ability",
        "name": "Strengthen Soul",
        "clazz": "Symbiote",
        "branch": "Fiery Soul",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "10 mana",
        "rng": "50 ft",
        "duration": "1 minute",
        "description": [
            "You strengthen an ally\u2019s conviction and confidence. Target ally in range gains a buff that increases their damage by 50% for the duration. When an ally gains this buff, they may use their reaction to make an autoattack."
        ],
        "tags": [
            "Spell",
            "buff",
            "increase damage"
        ]
    },
    {
        "type": "ability",
        "name": "Empower Soul",
        "clazz": "Symbiote",
        "branch": "Fiery Soul",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "20 mana",
        "rng": "50 ft",
        "duration": "1 minute",
        "description": [
            "You empower an ally\u2019s willpower and forcefulness. Target ally in range gains a buff that causes their attacks to ignore 20% MR and evasion for the duration. You may expend any amount of additional mana when you cast this spell to add to the percentage MR and evasion ignored by twice the amount of additional mana spent."
        ],
        "tags": [
            "Spell",
            "buff",
            "modal"
        ]
    },
    {
        "type": "ability",
        "name": "Bolster Soul",
        "clazz": "Symbiote",
        "branch": "Fiery Soul",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "30 mana",
        "rng": "50 ft",
        "duration": "1 minute",
        "description": [
            "You bolster an ally\u2019s focus and precision. Target ally in range gains a buff that grants +20% critical strike chance and +100% critical damage modifier for the duration. As a free reaction to attacking an enemy, an ally with this buff may end the buff early to make the triggering attack a critical hit that cannot be reacted to."
        ],
        "tags": [
            "Spell",
            "buff",
            "modal",
            "increase critical strike chance",
            "increase critical damage modifier"
        ]
    },
    {
        "type": "ability",
        "name": "Strengthen Body",
        "clazz": "Symbiote",
        "branch": "Stone Body",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "10 mana",
        "rng": "50 ft",
        "duration": "1 minute",
        "description": [
            "You strengthen an ally\u2019s attention and constitution. Target ally in range gains a buff that increases their AC and Evasion by 40% for the duration. You may cast this spell as a reaction for an additional 10 mana."
        ],
        "tags": [
            "Spell",
            "buff",
            "increase AC",
            "increase Evasion",
            "modal"
        ]
    },
    {
        "type": "ability",
        "name": "Empower Body",
        "clazz": "Symbiote",
        "branch": "Stone Body",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "20 mana",
        "rng": "50 ft",
        "duration": "1 minute",
        "description": [
            "You suffuse an ally\u2019s body with protective magic. Target ally in range gains a buff that grants +20% general MR and +20% MR for an element of your choice for the duration. You may cast this spell as a reaction for an additional 10 mana."
        ],
        "tags": [
            "Spell",
            "buff",
            "defensive",
            "increase MR",
            "modal"
        ]
    },
    {
        "type": "ability",
        "name": "Bolster Body",
        "clazz": "Symbiote",
        "branch": "Stone Body",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "30 mana",
        "rng": "50 ft",
        "duration": "1 minute",
        "description": [
            "You bolster an ally\u2019s natural defenses against conditions. Target ally in range gains a buff that grants +20% general CR and +20% CR for a condition of your choice for the duration. You may cast this spell as a reaction for an additional 10 mana."
        ],
        "tags": [
            "Spell",
            "buff",
            "defensive",
            "increase CR",
            "modal"
        ]
    },
    {
        "type": "ability",
        "name": "Strengthen Mind",
        "clazz": "Symbiote",
        "branch": "Fluid Mind",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "10 mana",
        "rng": "50 ft",
        "duration": "1 hour",
        "description": [
            "You strengthen an ally\u2019s instincts and proficiency. Target ally in range gains a buff that grants +30 to all skill checks for the duration. The target may consume 10 minutes of this buff\u2019s duration to reroll a skill check and take the new result while this buff is active."
        ],
        "tags": [
            "Spell",
            "buff",
            "skill boost"
        ]
    },
    {
        "type": "ability",
        "name": "Power Spike",
        "clazz": "Symbiote",
        "branch": "Fluid Mind",
        "tier": 2,
        "action": "1 Minor Action",
        "cost": "15 mana",
        "rng": "50 ft",
        "duration": "Instant",
        "description": [
            "You empower a buff effect at the cost of its duration. Target buff effect in range that you originally granted has its effectiveness increased by 50% and its current duration cut in half (always rounded down to the nearest 10 second, 10 minute, or 6 hour interval as applicable for minute, hour, and day long buffs)."
        ],
        "tags": [
            "Spell",
            "utility"
        ]
    },
    {
        "type": "ability",
        "name": "Bolster Speed",
        "clazz": "Symbiote",
        "branch": "Fluid Mind",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "30 mana",
        "rng": "50 ft",
        "duration": "1 minute",
        "description": [
            "You bolster an ally\u2019s quickness and endurance. Target ally in range gains a buff that grants +30 move speed for the duration. The target may consume 10 seconds of this buff\u2019s duration to dash 30 ft in any direction as a minor action or reaction."
        ],
        "tags": [
            "Spell",
            "buff",
            "increase speed"
        ]
    },
    {
        "type": "ability",
        "name": "Magic Dart",
        "clazz": "Arcanist",
        "branch": "Zapping",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "10 mana",
        "rng": "70 ft",
        "duration": "Instant",
        "description": [
            "You fire bolts of pure magic at one or more enemies. Create 3 magic darts of any elements and divide them as you choose amongst 1, 2, or 3 enemies. Each dart deals d12 magic damage of its chosen element."
        ],
        "tags": [
            "Spell",
            "attack",
            "destruction",
            "single-target",
            "multi-target",
            "modal"
        ]
    },
    {
        "type": "ability",
        "name": "Magic Bomb",
        "clazz": "Arcanist",
        "branch": "Blasting",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "20 mana",
        "rng": "70 ft",
        "duration": "Instant",
        "description": [
            "You create a small explosive ball of mana. Deal 3d12 magic damage of a chosen element type in one of the following AOE shapes of your choice:",
            "A 25 ft cube",
            "A 45 ft cross"
        ],
        "tags": [
            "Spell",
            "attack",
            "destruction",
            "AOE",
            "square",
            "cross",
            "modal"
        ]
    },
    {
        "type": "ability",
        "name": "Magic Primer",
        "clazz": "Arcanist",
        "branch": "Arcane",
        "tier": 1,
        "action": "1 Minor Action",
        "cost": "15 mana",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You charge mana to augment your next spell with raw power. Your next spell attack\u2019s damage increases by 30% and will be affected by your critical strike chance and critical damage modifier."
        ],
        "tags": [
            "Spell",
            "empower",
            "destruction",
            "self-target",
            "damage increase"
        ]
    },
    {
        "type": "ability",
        "name": "Modify Weapon",
        "clazz": "Enchanter",
        "branch": "Personal",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "10 mana",
        "rng": "Touch",
        "duration": "1 minute",
        "description": [
            "You temper a weapon with runes of strengthening or weakening. Choose one:",
            "Target weapon in range gains, \u201cOn Hit: Deal 4d10 physical damage.\u201d",
            "Target weapon in range gains, \u201cWhile equipped, deal 50% decreased physical damage.\u201d"
        ],
        "tags": [
            "Spell",
            "enchantment",
            "modal",
            "concentration"
        ]
    },
    {
        "type": "ability",
        "name": "Reforge Armor",
        "clazz": "Enchanter",
        "branch": "Personal",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "20 mana",
        "rng": "Touch",
        "duration": "1 minute",
        "description": [
            "You temper armor with runes of strengthening or weakening. Choose one:",
            "Target armor in range has its implicit AC, Evasion, MR, and CR increased by 50%.",
            "Target armor in range loses all AC, Evasion, MR, and CR."
        ],
        "tags": [
            "Spell",
            "enchantment",
            "modal",
            "concentration"
        ]
    },
    {
        "type": "ability",
        "name": "Alter Jewelry",
        "clazz": "Enchanter",
        "branch": "Personal",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "30 mana",
        "rng": "Touch",
        "duration": "1 minute",
        "description": [
            "You affix runes to an accessory for a variety of effects. Choose one:",
            "Target ring in range gains, \u201cOn Hit: Deal 2d20 magic damage of a chosen type.\u201d",
            "Target ring in range gains, \u201cAt the beginning of your turn, lose 40 mana and stamina.\u201d",
            "Target belt in range gains, \u201cYou have elemental resistance against 2 chosen types.\u201d",
            "Target belt in range gains, \u201cYou have elemental weakness against 2 chosen types.\u201d",
            "Target necklace in range gains, \u201cAt the beginning of your turn, heal 30 health.\u201d",
            "Target necklace in range gains, \u201cAt the beginning of your turn, lose 30 health.\u201d",
            "You may spend an additional 20 mana to choose a second effect for a type of accessory not previously chosen. You may then spend another additional 10 mana to choose a third effect for the last accessory type not previously chosen."
        ],
        "tags": [
            "Spell",
            "enchantment",
            "modal",
            "concentration"
        ]
    },
    {
        "type": "ability",
        "name": "Reconstruct Barrier",
        "clazz": "Enchanter",
        "branch": "Structural",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "10 mana",
        "rng": "Touch",
        "duration": "1 minute",
        "description": [
            "You rebuild a wall or door with runes of locking or breaking. Choose one:",
            "Target wall in range becomes unbreakable, and all windows and doors in that wall become magically locked.",
            "Target wall in range crumbles and weakens to become easily breakable, and all windows and doors in that wall become unlocked.",
            "After choosing an effect, you may choose to spend 1 minute to cast this spell as a minor ritual, extending the duration to 1 hour, or you may spend 10 minutes to cast this spell as a major ritual, extending the duration to 24 hours."
        ],
        "tags": [
            "Spell",
            "enchantment",
            "utility",
            "minor ritual",
            "major ritual",
            "modal",
            "concentration"
        ]
    },
    {
        "type": "ability",
        "name": "Rebuild Floor",
        "clazz": "Enchanter",
        "branch": "Structural",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "20 mana",
        "rng": "Touch",
        "duration": "1 minute",
        "description": [
            "You reconstruct the floor or ceiling to various effect. Choose one:",
            "The surface becomes difficult terrain.",
            "The surface becomes fragile, crumbling underneath the weight of entities walking over it.",
            "The surface becomes slick, granting entities doubled move speed.",
            "The surface becomes unbreakable.",
            "After choosing an effect, you may choose to spend 1 minute to cast this spell as a minor ritual, extending the duration to 1 hour, or you may spend 10 minutes to cast this spell as a major ritual, extending the duration to 24 hours."
        ],
        "tags": [
            "Spell",
            "enchantment",
            "utility",
            "minor ritual",
            "major ritual",
            "modal",
            "concentration"
        ]
    },
    {
        "type": "ability",
        "name": "Secure Building",
        "clazz": "Enchanter",
        "branch": "Structural",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "30 mana",
        "rng": "Touch",
        "duration": "1 minute",
        "description": [
            "You magically ward a building or some number of rooms in a building against enemy magic. Target building in range has any number of its rooms or the entire building gain the following effects: scrying and teleportation magic in or out of the warded area fails; you know if anyone casts a spell inside the warded area and what spell was cast; you know the positions and true magic signatures of all entities within the warded area. You may choose to spend 1 minute to cast this spell as a minor ritual, extending the duration to 1 hour, or you may spend 10 minutes to cast this spell as a major ritual, extending the duration to 24 hours."
        ],
        "tags": [
            "Spell",
            "enchantment",
            "utility",
            "defense",
            "minor ritual",
            "major ritual",
            "modal",
            "concentration"
        ]
    },
    {
        "type": "ability",
        "name": "Mint Coinage",
        "clazz": "Enchanter",
        "branch": "Minutiae",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "10 mana",
        "rng": "Touch",
        "duration": "You stamp a variety of runes on the face of a coin. While touching a target coin, choose one:",
        "description": [
            "Inscribe a magical telepathic message of up to 100 words or 10 images that can be heard/seen by anyone who picks up the coin.",
            "Inscribe a magical access point that allows you to telepathically communicate freely with anyone holding the coin.",
            "Inscribe a magical tracker that allows you to always know the coin\u2019s position and if/when it changes owners.",
            "Inscribe a magical storage space that grants the wielder of the coin +1 buff limit and +1 concentration limit.",
            "Inscribe a restorative rune that grants the wielder of the coin 5% health, mana, and stamina regeneration.",
            "Inscribe a rune of luck that grants the wielder of the coin +5 to all skill checks.",
            "When you cast this spell, you may choose to expend an additional 5 mana to choose a second effect for the coin\u2019s opposite face. An entity can only benefit from one coin made by this ability at a time."
        ],
        "tags": [
            "Spell",
            "enchantment",
            "modal"
        ]
    },
    {
        "type": "ability",
        "name": "Enhance Vehicle",
        "clazz": "Enchanter",
        "branch": "Minutiae",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "20 mana",
        "rng": "Touch",
        "duration": "24 hours",
        "description": [
            "You power up or power down a vehicle. Choose one:",
            "Target vehicle in range has its move speed doubled and no longer requires a system to propel it forward (horses, engines) for the duration.",
            "Target vehicle becomes immotile through its regular means (wheels lock, sails fail, etc) for the duration.",
            "When you cast this spell, you may choose to expend an additional 10 mana to affect another target Vehicle with a new choice, and you may do this any number of times. Concentration is held once for all instances of this spell within one cast."
        ],
        "tags": [
            "Spell",
            "enchantment",
            "utility",
            "modal",
            "concentration"
        ]
    },
    {
        "type": "ability",
        "name": "Empower Ammo",
        "clazz": "Enchanter",
        "branch": "Minutiae",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "30 mana",
        "rng": "Touch",
        "duration": "24 hours",
        "description": [
            "You bless any type of ammo with empowering runes. Target set of up to 10 pieces of ammunition becomes special ammo for the duration, gaining, \u201cAttacks with this ammo have 50% increased damage and inflict a random condition chosen from the following list: Slow, Immobilize, Cripple, Stun, Blind, Confuse, Sleep, Silence.\u201d"
        ],
        "tags": [
            "Spell",
            "enchantment",
            "utility",
            "modal",
            "concentration"
        ]
    },
    {
        "type": "ability",
        "name": "Wind Slash",
        "clazz": "Aeromancer",
        "branch": "Gale",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "10 mana",
        "rng": "100 ft",
        "duration": "Instant",
        "description": [
            "You fire a fast moving blade of air. Deal 6d8 air magic damage to a target in range and up to 2 enemies adjacent to your target. This attack cannot miss, cannot be blocked, and bypasses barriers and walls."
        ],
        "tags": [
            "Spell",
            "attack",
            "ranged",
            "air",
            "destruction",
            "single-target",
            "multi-target",
            "ignore barriers/walls/blocks",
            "no-miss"
        ]
    },
    {
        "type": "ability",
        "name": "Sky Uppercut",
        "clazz": "Aeromancer",
        "branch": "Gale",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "25 mana",
        "rng": "100 ft",
        "duration": "Instant",
        "description": [
            "You release an upwards draft of air. Deal 8d8 air magic damage to a target in range. The target is then Knocked Up and inflicted with 50% air vulnerability until this condition ends."
        ],
        "tags": [
            "Spell",
            "attack",
            "ranged",
            "air",
            "destruction",
            "single-target",
            "control",
            "condition",
            "knock up",
            "vulnerability"
        ]
    },
    {
        "type": "ability",
        "name": "Vicious Cyclone",
        "clazz": "Aeromancer",
        "branch": "Gale",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "40 mana",
        "rng": "100 ft",
        "duration": "1 minute",
        "description": [
            "You conjure a violent twister that buffets your foes with slashing winds. Create a 15 foot square Cyclone centered on a space in range. It reaches up 100 ft as well. When it initially appears it deals 6d8 air magic damage to all enemies in its AOE. If an enemy begins its turn in the AOE, they take 4d8 air magic damage, and if they are Knocked Up, they remain Airborne. When you cast this spell, you may increase the AOE size by 5 ft for every additional 20 mana you expend."
        ],
        "tags": [
            "Spell",
            "attack",
            "air",
            "destruction",
            "conjuration",
            "AOE",
            "square",
            "conditional",
            "knock up",
            "modal",
            "concentration"
        ]
    },
    {
        "type": "ability",
        "name": "Vicious Hurricane",
        "clazz": "Aeromancer",
        "branch": "Gale",
        "tier": 4,
        "action": "1 Major Action",
        "cost": "80 mana",
        "rng": "100 ft",
        "duration": "1 minute",
        "description": [
            "You conjure a violent hurricane that persistently damages and knocks up enemies. At the end of each of your turns, deal 10d8 air magic damage to all enemies in range and they are all Knocked Up. While you concentrate on this spell, your air spells ignore all MR and you can cast any air spell you know as a reaction."
        ],
        "tags": [
            "Spell",
            "attack",
            "air",
            "destruction",
            "conjuration",
            "AOE",
            "square",
            "knock up",
            "ignore MR",
            "concentration"
        ]
    },
    {
        "type": "ability",
        "name": "Aeroblast",
        "clazz": "Aeromancer",
        "branch": "Gust",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "15 mana",
        "rng": "100 ft",
        "duration": "Instant",
        "description": [
            "You release a powerful blast of air that sends people flying. Push a target in range 20 ft in a direction of your choice. When you cast this spell, you may choose to expend 4 stacks of Winds of War to additionally knock the target prone."
        ],
        "tags": [
            "Spell",
            "attack",
            "ranged",
            "air",
            "control",
            "utility",
            "conjuration",
            "knock prone",
            "push",
            "modal"
        ]
    },
    {
        "type": "ability",
        "name": "Whisk Away",
        "clazz": "Aeromancer",
        "branch": "Gust",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "20 mana",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You fire a gust of air behind you to quickly reposition yourself. Dash up to 50 ft in any direction including upwards and downwards"
        ],
        "tags": [
            "Spell",
            "air",
            "utility",
            "conjuration",
            "dash"
        ]
    },
    {
        "type": "ability",
        "name": "Buffeting Storm",
        "clazz": "Aeromancer",
        "branch": "Gust",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "50 mana",
        "rng": "Battlefield",
        "duration": "1 minute",
        "description": [
            "You maintain powerful winds to impede foes and assist allies. While you concentrate on this spell, powerful winds decrease enemy movement speed by 20 and increase ally movement speed by 20. Additionally, while you concentrate on this spell, you may spend 5 mana to push any target 10 ft in any direction as a Minor Action."
        ],
        "tags": [
            "Spell",
            "air",
            "control",
            "conjuration",
            "modal",
            "concentration"
        ]
    },
    {
        "type": "ability",
        "name": "Take Flight",
        "clazz": "Aeromancer",
        "branch": "Gust",
        "tier": 4,
        "action": "1 Major Action",
        "cost": "60 mana",
        "rng": "Touch",
        "duration": "1 minute",
        "description": [
            "You provide yourself or an ally the ability to fly without restrictions. Target willing entity in range gains a buff that converts all of their movement speed into flying speed, grants 20% evasion, and increases the range of their attacks by 50%."
        ],
        "tags": [
            "Spell",
            "air",
            "buff",
            "gain evasion",
            "gain range",
            "concentration"
        ]
    },
    {
        "type": "ability",
        "name": "Tailwind",
        "clazz": "Aeromancer",
        "branch": "Breeze",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "15 mana",
        "rng": "Touch",
        "duration": "1 minute",
        "description": [
            "You provide an aiding tailwind to increase an ally\u2019s speed. Target willing entity in range gains the following buff: Gain +20 movement speed; can end this buff as a reaction to dash 20 ft in any direction."
        ],
        "tags": [
            "Spell",
            "air",
            "utility",
            "conjuration",
            "buff",
            "modal"
        ]
    },
    {
        "type": "ability",
        "name": "Blowback",
        "clazz": "Aeromancer",
        "branch": "Breeze",
        "tier": 2,
        "action": "1 Reaction",
        "cost": "20 mana",
        "rng": "100 ft",
        "duration": "Instant",
        "description": [
            "You counter a spell and muddle the caster\u2019s senses. As a reaction to a target in range casting a spell, you may counter that spell. Until the end of the target\u2019s next turn, their non-melee abilities have their range halved."
        ],
        "tags": [
            "Spell",
            "air",
            "defensive",
            "counterspell",
            "conditional",
            "single-target",
            "condition",
            "range decrease"
        ]
    },
    {
        "type": "ability",
        "name": "Rotation Barrier",
        "clazz": "Aeromancer",
        "branch": "Breeze",
        "tier": 3,
        "action": "1 Reaction",
        "cost": "30 mana",
        "rng": "10 ft",
        "duration": "Instant",
        "description": [
            "You rotate the air surrounding you quickly, knocking down incoming projectiles. All non-melee, non-AOE attacks that target or affect a space within range are blocked."
        ],
        "tags": [
            "Spell",
            "air",
            "defensive",
            "conditional",
            "AOE",
            "block"
        ]
    },
    {
        "type": "ability",
        "name": "Summon Wyvern",
        "clazz": "Aeromancer",
        "branch": "Breeze",
        "tier": 4,
        "action": "1 Major Action",
        "cost": "100 mana",
        "rng": "50 ft",
        "duration": "1 hour",
        "description": [
            "You summon a wyvern borne of the skies. Summon a Wyvern with 100 HP, 50 flying speed, 20 AC, 50% evasion, 50% general MR, and an innate 100% vulnerability to attacks from bows and crossbows. It obeys your Commands; otherwise, it uses its Move Action to fly towards enemies and its Major Action to do a melee claw attack for 5d10 physical damage or a 30 ft cone breath attack for 10d8 air magic damage (33% recharge rate)."
        ],
        "tags": [
            "Spell",
            "air",
            "summoning",
            "minion"
        ]
    },
    {
        "type": "ability",
        "name": "Shadow Bolt",
        "clazz": "Noxomancer",
        "branch": "Devastation",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "10 mana",
        "rng": "40 ft",
        "duration": "Instant",
        "description": [
            "You amass dark energy and toss it at an enemy. Deal 3d10 dark magic damage to a target in range, and inflict the target with a curse for every 15 dark magic damage dealt this way."
        ],
        "tags": [
            "Spell",
            "attack",
            "ranged",
            "dark",
            "destruction",
            "condition",
            "Curse",
            "conditional",
            "single target"
        ]
    },
    {
        "type": "ability",
        "name": "Darkbomb",
        "clazz": "Noxomancer",
        "branch": "Devastation",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "30 mana",
        "rng": "40 ft",
        "duration": "Instant",
        "description": [
            "You release an orb of dark magic, primed to explode. Create a Darkbomb in an unoccupied space in range. You may have it detonate immediately to deal 3d10 dark magic damage and inflict a curse on every entity within 20 ft of the bomb. Alternatively, you may delay the explosion until the beginning of your next turn; if you do, it will deal 6d10 dark magic damage and inflict 2 curses on every entity within 20 ft of the bomb."
        ],
        "tags": [
            "Spell",
            "attack",
            "dark",
            "destruction",
            "condition",
            "Curse",
            "AOE",
            "modal"
        ]
    },
    {
        "type": "ability",
        "name": "Corruption",
        "clazz": "Noxomancer",
        "branch": "Devastation",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "40 mana",
        "rng": "40 ft",
        "duration": "1 minute",
        "description": [
            "You corrupt an enemy\u2019s body with dark energy. Deal 5d10 dark magic damage to a target and inflict them with a condition that causes them to gain a Curse and take 3d10 dark magic damage at the beginning of each turn and prevents Curses from expunging until the condition ends."
        ],
        "tags": [
            "Spell",
            "attack",
            "single-target",
            "dark",
            "destruction",
            "condition",
            "Curse",
            "concentration"
        ]
    },
    {
        "type": "ability",
        "name": "Defile",
        "clazz": "Noxomancer",
        "branch": "Affliction",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "15 mana",
        "rng": "40 ft",
        "duration": "1 minute",
        "description": [
            "You infuse an enemy with dark energy, weakening and cursing them. Select a target in range, and choose one of the following:",
            "Inflict a 30% Weaken for 1 minute",
            "Inflict a 20% Weaken for 1 minute, and inflict 1 curse",
            "Inflict a 10% Weaken for 1 minute, and inflict 2 curses"
        ],
        "tags": [
            "Spell",
            "attack",
            "dark",
            "condition",
            "Weakened",
            "Curse",
            "modal",
            "single target"
        ]
    },
    {
        "type": "ability",
        "name": "Shriek",
        "clazz": "Noxomancer",
        "branch": "Affliction",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "30 mana",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You release dark energy through your words, affecting the nervous system of nearby opponents. Enemies within 40 ft of you are Blinded and enemies within 20 ft of you are instead Feared."
        ],
        "tags": [
            "Spell",
            "attack",
            "dark",
            "condition",
            "control",
            "Blind",
            "Fear",
            "conditional",
            "AOE"
        ]
    },
    {
        "type": "ability",
        "name": "Spreading Madness",
        "clazz": "Noxomancer",
        "branch": "Affliction",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "50 mana",
        "rng": "40 ft",
        "duration": "1 minute",
        "description": [
            "You corrupt the mind of an enemy with infectious dark magic. Inflict a condition on a target in range that causes 50% of their targeted attacks to be redirected at one of their allies in range if possible. When an enemy with this condition deals damage to another enemy, they inflict the same condition on hit. When you break concentration on this ability, all copies of this condition end as well."
        ],
        "tags": [
            "Spell",
            "attack",
            "single-target",
            "multi-target",
            "dark",
            "condition",
            "control",
            "concentration"
        ]
    },
    {
        "type": "ability",
        "name": "Siphon Soul",
        "clazz": "Noxomancer",
        "branch": "Obfuscation",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "15 mana",
        "rng": "40 ft",
        "duration": "Instant",
        "description": [
            "You tear away magical effects on allies and enemies. Choose one of the following:",
            "Target entity in range loses a buff of your choice",
            "Target entity in range is cleansed of a condition of your choice",
            "You may choose to expend an additional 10 mana to use both options."
        ],
        "tags": [
            "Spell",
            "dark",
            "modal",
            "buff strip",
            "cleanse",
            "single-target",
            "multi-target"
        ]
    },
    {
        "type": "ability",
        "name": "Treachery",
        "clazz": "Noxomancer",
        "branch": "Obfuscation",
        "tier": 2,
        "action": "1 Reaction",
        "cost": "20 mana",
        "rng": "100 ft",
        "duration": "Instant",
        "description": [
            "You cause a mage to lose control of a spell during its casting. As a reaction to a target in range casting a spell, you may counter that spell. The target then expends 10 mana to deal 2d10 dark magic damage and inflict a curse on all of its allies within 10 ft of them."
        ],
        "tags": [
            "Spell",
            "dark",
            "single-target",
            "AOE",
            "destruction",
            "defensive",
            "counterspell",
            "condition",
            "Curse"
        ]
    },
    {
        "type": "ability",
        "name": "Fiendish Circle",
        "clazz": "Noxomancer",
        "branch": "Obfuscation",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "40 mana",
        "rng": "40 ft",
        "duration": "Instant",
        "description": [
            "You call upon imps from a dark realm. Summon an Imp with 50 HP and 40 speed. Imps follow your Command Actions; otherwise, they use their Move Action to move towards enemies, their Major Action to make a melee attack that deals 4d10 dark magic damage, and their Minor Action to drink any potions they are carrying. When you cast this spell, you may choose to concentrate on this spell in order to spend an additional 20 mana to summon an extra Imp, and you may do this up to two more times to have a maximum of 4 Imps at one time."
        ],
        "tags": [
            "Spell",
            "summoning",
            "dark",
            "minion",
            "conditional",
            "modal",
            "concentration"
        ]
    },
    {
        "type": "ability",
        "name": "Spill Blood",
        "clazz": "Warrior",
        "branch": "Assault",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "10 stamina",
        "rng": "Melee",
        "duration": "Instant",
        "description": [
            "You hack at an enemy, severing blood vessels. Deal 4d10 physical damage to a target in range. Inflict a d10 Bleed on the target. This Bleed\u2019s damage is amplified by your passive."
        ],
        "tags": [
            "Attack",
            "physical",
            "single-target",
            "melee",
            "condition",
            "Bleed"
        ]
    },
    {
        "type": "ability",
        "name": "Cut Down",
        "clazz": "Warrior",
        "branch": "Assault",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "20 stamina",
        "rng": "Melee",
        "duration": "Instant",
        "description": [
            "You deliver a wide slash to the enemy\u2019s frontlines, adjusting for their formation. Choose one of the following:",
            "Deal 3d10 damage to all enemies in a 10 ft cone, knocking them prone.",
            "Deal 3d10 damage to all enemies in a 25 ft horizontal line, knocking them back 10 ft",
            "If you have at least 3 buffs active on you, choose both options."
        ],
        "tags": [
            "Attack",
            "physical",
            "melee",
            "AOE",
            "cone",
            "horizontal line",
            "Knock Prone",
            "Knock Back",
            "modal",
            "conditional"
        ]
    },
    {
        "type": "ability",
        "name": "Hack and Slash",
        "clazz": "Warrior",
        "branch": "Assault",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "40 stamina",
        "rng": "Melee",
        "duration": "Instant",
        "description": [
            "You turn vigor into violence, attacking quickly. Deal 3d10 physical damage to a target in range. Then, you may sacrifice a buff on you to repeat this skill at no cost."
        ],
        "tags": [
            "Attack",
            "physical",
            "single-target",
            "melee",
            "repeatable",
            "sacrifice"
        ]
    },
    {
        "type": "ability",
        "name": "Summary Execution",
        "clazz": "Warrior",
        "branch": "Assault",
        "tier": 4,
        "action": "1 Major Action",
        "cost": "90 stamina",
        "rng": "Melee",
        "duration": "Instant",
        "description": [
            "You finish off weakened enemies. Deal 5d10 physical damage to all targets in range. This attack has lethality equal to each target\u2019s percentage of missing health (calculated after this ability\u2019s damage). You may sacrifice any number of buffs on you as you cast this ability to increase the base lethality of this attack by 10% per buff sacrificed this way."
        ],
        "tags": [
            "Attack",
            "physical",
            "multi-target",
            "melee",
            "sacrifice",
            "lethality",
            "missing health"
        ]
    },
    {
        "type": "ability",
        "name": "Shields Up",
        "clazz": "Warrior",
        "branch": "Protect",
        "tier": 1,
        "action": "1 Reaction",
        "cost": "15 stamina",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You toss up your shield or armguard to defend against an attack. Block an attack on you or an adjacent ally, reducing damage by 25%. Gain an additional 25% damage reduction for each buff you have."
        ],
        "tags": [
            "Block",
            "damage reduction",
            "self-target",
            "ally-target"
        ]
    },
    {
        "type": "ability",
        "name": "Reinforce Armor",
        "clazz": "Warrior",
        "branch": "Protect",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "25 stamina",
        "rng": "Self",
        "duration": "1 minute",
        "description": [
            "You strengthen your armor\u2019s natural defenses. Sacrifice any number of buffs active on you. Gain 25% increased AC, Evasion, or MR for each buff sacrificed this way for 1 minute. Recasting this ability while its buff is active will end your previous buff and start a new one."
        ],
        "tags": [
            "Buff",
            "concentration",
            "sacrifice",
            "increase AC",
            "increase Evasion",
            "increase MR"
        ]
    },
    {
        "type": "ability",
        "name": "Take Cover",
        "clazz": "Warrior",
        "branch": "Protect",
        "tier": 3,
        "action": "1 Reaction",
        "cost": "35 stamina",
        "rng": "30 ft",
        "duration": "Instant",
        "description": [
            "You dive and roll to rescue a comrade from danger. As a reaction to an attack on an allied target in range, immediately dash to them before the attack lands. Then, choose one of the following:",
            "Use your body as a shield. Your target gains 30 AC, and the attack will be redirected to both you and your target",
            "Tackle your target to the ground. You and your target gain 30% evasion, and both of you are knocked prone",
            "Drag them to safety. Dash an additional 20 ft in any direction, dragging your target with you, and your target loses their reaction if they still have one."
        ],
        "tags": [
            "Dash",
            "ally-target",
            "modal",
            "redirect",
            "knock prone",
            "increase AC",
            "increase Evasion"
        ]
    },
    {
        "type": "ability",
        "name": "Paragon of Victory",
        "clazz": "Warrior",
        "branch": "Protect",
        "tier": 4,
        "action": "1 Major Action",
        "cost": "100 stamina",
        "rng": "Self",
        "duration": "1 minute",
        "description": [
            "You become a powerful avatar of war. When you cast this ability, sacrifice any number of buffs on you. Gain the following effects, depending on the number of buffs sacrificed.",
            "5 Buffs - Gain immunity to physical damage",
            "10 Buffs - Gain all of the above in addition to immunity to conditions and crowd control.",
            "15 Buffs - Gain all of the above in addition to 50 ft of added speed and 100% increased damage"
        ],
        "tags": [
            "Buff",
            "concentration",
            "sacrifice",
            "Immunity",
            "add speed",
            "increase damage",
            "modal"
        ]
    },
    {
        "type": "ability",
        "name": "\u201cCharge!\u201d",
        "clazz": "Warrior",
        "branch": "Warcry",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "20 stamina",
        "rng": "---",
        "duration": "Instant",
        "description": [
            "You bellow a righteous cry, calling all to drive forward into battle. You and all allies who can hear you gain 50% increased damage until the end of your next turn. When you cast this ability, all allies who can hear you may use their reaction to move up to their speed in any direction."
        ],
        "tags": [
            "Buff",
            "multi-target",
            "self-target",
            "ally-target",
            "damage increase"
        ]
    },
    {
        "type": "ability",
        "name": "\u201cFight me!\u201d",
        "clazz": "Warrior",
        "branch": "Warcry",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "30 stamina",
        "rng": "---",
        "duration": "1 minute",
        "description": [
            "You bellow a belligerent cry, igniting your enemies\u2019 fury. All enemies who can hear you are Taunted for 1 minute. An enemy Taunted by this ability previously is Immune to this ability\u2019s Taunt. When you cast this ability, all enemies who can hear you break concentration."
        ],
        "tags": [
            "Condition",
            "Taunt",
            "multi-target",
            "break concentration"
        ]
    },
    {
        "type": "ability",
        "name": "\u201cOvercome!\u201d",
        "clazz": "Warrior",
        "branch": "Warcry",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "40 stamina",
        "rng": "---",
        "duration": "Instant",
        "description": [
            "You bellow an inspiring cry, encouraging everyone to persist. You and all allies who can hear you are cleansed of Fear, Stun, Paralysis, Confusion, Sleep, and Charm. Allies in a 1000 ft range who are in a downed state become immediately stabilized. When you cast this ability, all allies who can hear you may use their reaction to cleanse an additional condition on them of their choice."
        ],
        "tags": [
            "Cleanse",
            "Stabilize",
            "multi-target",
            "self-target",
            "ally-target"
        ]
    },
    {
        "type": "ability",
        "name": "\u201cKill them all!\u201d",
        "clazz": "Warrior",
        "branch": "Warcry",
        "tier": 4,
        "action": "1 Major Action",
        "cost": "70 stamina",
        "rng": "---",
        "duration": "Instant",
        "description": [
            "You bellow a powerful cry, cowing your enemies and announcing their coming deaths. All enemies who can hear you gain 50% physical damage vulnerability, lose natural elemental resistances, and become Feared. When you cast this ability, all enemies who can hear you are stripped of all buffs, and those buffs are distributed as you choose amongst you and all allies who can hear you."
        ],
        "tags": [
            "Condition",
            "multi-target",
            "Fear",
            "vulnerability",
            "buff stripping",
            "buff"
        ]
    },
    {
        "type": "ability",
        "name": "Pivot and Slash",
        "clazz": "Warlord",
        "branch": "Close Range",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "10 stamina",
        "rng": "Melee",
        "duration": "Instant",
        "description": [
            "You focus on your footwork while you attack, looking for an opening. Deal 4d10 physical damage to a target in range. You may dash up to 5 ft in any direction before or after this attack."
        ],
        "tags": [
            "Attack",
            "physical",
            "single-target",
            "melee",
            "modal",
            "dash"
        ]
    },
    {
        "type": "ability",
        "name": "Knock Aside",
        "clazz": "Warlord",
        "branch": "Close Range",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "20 stamina",
        "rng": "Melee",
        "duration": "Instant",
        "description": [
            "You slam your weapon into your opponent to push them. Deal 4d10 physical damage to a target in range, pushing them 10 ft in any direction except towards you."
        ],
        "tags": [
            "Attack",
            "physical",
            "single-target",
            "melee",
            "forced movement"
        ]
    },
    {
        "type": "ability",
        "name": "Crippling Blow",
        "clazz": "Warlord",
        "branch": "Close Range",
        "tier": 3,
        "action": "1 Reaction",
        "cost": "25 stamina",
        "rng": "Melee",
        "duration": "Instant",
        "description": [
            "You aim for an enemy\u2019s legs as they attempt to escape. As a reaction to an enemy attempt to move out of your reach, deal 4d10 physical damage to them, reduce their move speed to 0 for the turn, and inflict Crippled."
        ],
        "tags": [
            "Attack",
            "physical",
            "single-target",
            "melee",
            "Crippled"
        ]
    },
    {
        "type": "ability",
        "name": "Advancing Fire",
        "clazz": "Warlord",
        "branch": "Long Range",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "10 stamina",
        "rng": "Weapon",
        "duration": "Instant",
        "description": [
            "You fire at an enemy as you approach. Deal 4d10 physical damage to a target in range. You may dash up to 15 ft towards the target if your attack does not miss."
        ],
        "tags": [
            "Attack",
            "physical",
            "single-target",
            "ranged",
            "conditional",
            "modal",
            "dash"
        ]
    },
    {
        "type": "ability",
        "name": "Hookshot",
        "clazz": "Warlord",
        "branch": "Long Range",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "20 stamina",
        "rng": "Weapon",
        "duration": "Instant",
        "description": [
            "You fire at an enemy with a projectile and chain. Deal 4d10 physical damage to a target in range, then pull them 20 ft towards you."
        ],
        "tags": [
            "Attack",
            "physical",
            "single-target",
            "ranged",
            "forced movement"
        ]
    },
    {
        "type": "ability",
        "name": "Stopping Shot",
        "clazz": "Warlord",
        "branch": "Long Range",
        "tier": 3,
        "action": "1 Reaction",
        "cost": "25 stamina",
        "rng": "Weapon",
        "duration": "Instant",
        "description": [
            "You shoot an enemy with a heavy projectile designed to stop their progression. As a reaction to an enemy moving into range or moving towards you, deal 4d10 physical damage to that enemy, reduce their move speed to 0 for the turn, and inflict Crippled."
        ],
        "tags": [
            "Attack",
            "physical",
            "single-target",
            "ranged",
            "forced movement"
        ]
    },
    {
        "type": "ability",
        "name": "Weapon Swap: Roll",
        "clazz": "Warlord",
        "branch": "Weapon Swap",
        "tier": 1,
        "action": "1 Minor Action",
        "cost": "10 stamina",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You roll while swapping weapons. Dash up to 20 ft in any direction, then you may swap weapons in both hands."
        ],
        "tags": [
            "Modal",
            "dash"
        ]
    },
    {
        "type": "ability",
        "name": "Weapon Swap: Quaff",
        "clazz": "Warlord",
        "branch": "Weapon Swap",
        "tier": 2,
        "action": "1 Minor Action",
        "cost": "15 stamina",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You quickly down a potion while swapping weapons. Quaff a potion from your inventory, then you may swap weapons in both hands."
        ],
        "tags": [
            "Modal"
        ]
    },
    {
        "type": "ability",
        "name": "Weapon Swap: Attack",
        "clazz": "Warlord",
        "branch": "Weapon Swap",
        "tier": 3,
        "action": "1 Minor Action",
        "cost": "20 stamina",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You swap weapons and make a quick attack. Swap weapons in both hands, then you may make an autoattack with each weapon currently equipped if applicable."
        ],
        "tags": [
            "Modal",
            "attack",
            "physical",
            "melee",
            "ranged",
            "single-target"
        ]
    },
    {
        "type": "ability",
        "name": "Vanish",
        "clazz": "Assassin",
        "branch": "Skulk",
        "tier": 1,
        "action": "1 Minor Action",
        "cost": "10 stamina",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You move quickly to avoid detection. You immediately become Hidden, and you may dash up to 10 ft in any direction. You may cast this ability as a reaction for 30 stamina."
        ],
        "tags": [
            "self-target",
            "Hidden",
            "buff",
            "dash",
            "modal"
        ]
    },
    {
        "type": "ability",
        "name": "Maneuver",
        "clazz": "Assassin",
        "branch": "Skulk",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "20 stamina",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You move quickly and can ascend sheer walls. Dash up to 40 ft. During your dash, you can also scale walls up to 40 ft."
        ],
        "tags": [
            "Dash",
            "modal"
        ]
    },
    {
        "type": "ability",
        "name": "Pursue",
        "clazz": "Assassin",
        "branch": "Skulk",
        "tier": 3,
        "action": "1 Reaction",
        "cost": "25 stamina",
        "rng": "100 ft",
        "duration": "Instant",
        "description": [
            "You follow quickly after a fleeing enemy. As a reaction to a target in range moving, you may move an equal distance towards the target. You then mark the target, increasing your critical damage modifier by 50% on the marked target. This mark can stack multiple times."
        ],
        "tags": [
            "Dash",
            "conditional",
            "reaction",
            "condition",
            "stackable"
        ]
    },
    {
        "type": "ability",
        "name": "Stalk",
        "clazz": "Assassin",
        "branch": "Skulk",
        "tier": 4,
        "action": "1 Major Action",
        "cost": "50 stamina",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You move quickly from shadow to shadow. Become Hidden. Then, while hidden, you may use this ability to dash up to 60 ft. At the end of your dash, if you make a successful Sneak check, you may repeat this ability at no cost."
        ],
        "tags": [
            "Dash",
            "conditional",
            "Sneak",
            "continuous"
        ]
    },
    {
        "type": "ability",
        "name": "Focus",
        "clazz": "Assassin",
        "branch": "Preparation",
        "tier": 1,
        "action": "1 Minor Action",
        "cost": "5 stamina",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You ready yourself for the kill. Your next attack gains an additional 30% critical strike chance. This buff is consumed even if you miss or all of your damage is blocked, and it does not stack with itself."
        ],
        "tags": [
            "self-target",
            "buff",
            "improve critical strike chance"
        ]
    },
    {
        "type": "ability",
        "name": "Sharpen",
        "clazz": "Assassin",
        "branch": "Preparation",
        "tier": 2,
        "action": "1 Minor Action",
        "cost": "15 stamina",
        "rng": "Self",
        "duration": "1 minute",
        "description": [
            "You prepare your blades for the kill. For this ability\u2019s duration, all of your d4 damage dice become d6 damage dice instead."
        ],
        "tags": [
            "self-target",
            "buff",
            "improve damage dice"
        ]
    },
    {
        "type": "ability",
        "name": "Haste",
        "clazz": "Assassin",
        "branch": "Preparation",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "50 stamina",
        "rng": "Self",
        "duration": "20 seconds",
        "description": [
            "You temporarily speed up your actions. During your next turn, you gain an additional Major action and Minor action. Also, until the end of your next turn, you may take any number of reactions."
        ],
        "tags": [
            "self-target",
            "buff",
            "action gain",
            "delayed effect"
        ]
    },
    {
        "type": "ability",
        "name": "Bloodlust",
        "clazz": "Assassin",
        "branch": "Preparation",
        "tier": 4,
        "action": "1 Minor Action",
        "cost": "100 stamina",
        "rng": "Self",
        "duration": "1 minute",
        "description": [
            "You become a spectre of whirling death. For this ability\u2019s duration, dealing a killing blow on an enemy resets your Move, Major, and Minor actions."
        ],
        "tags": [
            "self-target",
            "buff",
            "action reset",
            "concentration",
            "on-kill"
        ]
    },
    {
        "type": "ability",
        "name": "Backstab",
        "clazz": "Assassin",
        "branch": "Execution",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "10 stamina",
        "rng": "Melee",
        "duration": "Instant",
        "description": [
            "You attack from your enemy\u2019s blind spot. Deal 3d4 physical damage to a target in range. If you are Hidden, you roll max damage on all damage dice automatically."
        ],
        "tags": [
            "Attack",
            "physical",
            "conditional",
            "melee",
            "Hidden"
        ]
    },
    {
        "type": "ability",
        "name": "Pounce",
        "clazz": "Assassin",
        "branch": "Execution",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "15 stamina",
        "rng": "Melee",
        "duration": "Instant",
        "description": [
            "You quickly close in on your target before dealing the killing blow. Dash up to 15 ft towards a target, then deal 4d4 physical damage to a target in range."
        ],
        "tags": [
            "Attack",
            "melee",
            "physical",
            "dash"
        ]
    },
    {
        "type": "ability",
        "name": "Skyfall",
        "clazz": "Assassin",
        "branch": "Execution",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "30 stamina",
        "rng": "Melee",
        "duration": "Instant",
        "description": [
            "You bring death from above. You may cast this ability while falling on a target from at least 10 ft above it. Deal 8d4 physical damage to the target, with a 100% increased critical damage modifier."
        ],
        "tags": [
            "Attack",
            "physical",
            "conditional",
            "melee",
            "aerial",
            "empowered"
        ]
    },
    {
        "type": "ability",
        "name": "Massacre",
        "clazz": "Assassin",
        "branch": "Execution",
        "tier": 4,
        "action": "1 Major Action",
        "cost": "60 stamina",
        "rng": "Melee",
        "duration": "Instant",
        "description": [
            "You strike as a blur, killing many. Deal 16d4 physical damage, dividing your damage dice amongst any number of adjacent targets as you choose. For every damage die a target is hit by, that attack gains 5% Lethality. You roll for critical strike chance only once, for all dice."
        ],
        "tags": [
            "Attack",
            "physical",
            "melee",
            "single-target",
            "multi-target",
            "modal",
            "Lethal"
        ]
    },
    {
        "type": "ability",
        "name": "Crossguard Guillotine",
        "clazz": "Sentinel",
        "branch": "Dauntless",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "15 stamina",
        "rng": "Melee",
        "duration": "Instant",
        "description": [
            "You swing your bladed shields in an X shaped pattern. Deal 4d10 physical damage to a target in range. This attack can block all incoming attacks that it reacts to, and if this attack combos with a dash, the block will also block any attacks along the path of your dash as well as at the final destination. If you are dual wielding shields, you may expend any number of Shield stacks; this attack deals an additional Xd10 physical damage, where X is the number of Shield stacks spent, and also hits enemies diagonally to your target."
        ],
        "tags": [
            "Attack",
            "physical",
            "single-target",
            "melee",
            "multi-target",
            "conditional",
            "block",
            "shield",
            "modal"
        ]
    },
    {
        "type": "ability",
        "name": "Parallel Shields",
        "clazz": "Sentinel",
        "branch": "Stalwart",
        "tier": 1,
        "action": "1 Reaction",
        "cost": "20 stamina",
        "rng": "Melee",
        "duration": "Instant",
        "description": [
            "You manipulate two shields to maximize coverage or layer your defenses. For each shield currently equipped, block an attack on yourself or on an ally in an adjacent space. If this ability combos with a dash, you can split up the two blocks to occur at two different points along the dash.",
            "Alternatively, you may expend a Shield stack to layer the shields atop each other, blocking a single attack on yourself. This block is effective even against attacks that normally cannot be blocked, and an attack blocked this way cannot penetrate AC."
        ],
        "tags": [
            "Block",
            "self-target",
            "ally-target",
            "conditional",
            "modal"
        ]
    },
    {
        "type": "ability",
        "name": "Chain Rush",
        "clazz": "Sentinel",
        "branch": "Tenacious",
        "tier": 1,
        "action": "1 Minor Action",
        "cost": "15 stamina",
        "rng": "30 ft",
        "duration": "Instant",
        "description": [
            "You toss your shield and pull yourself to a new location with the chains. Toss your shield to a target space in range; if the space is occupied, push the entity in that space 5 ft away from you. If you are dual wielding shields, drop your other shield in your current space, then dash along your chain to the target space and pick up the shield there. As long as you do not use the shield at your original location for another action, you may dash along the chain back to that shield as a free reaction, picking the shield back up."
        ],
        "tags": [
            "Dash",
            "conditional",
            "modal",
            "shield"
        ]
    },
    {
        "type": "ability",
        "name": "Fleetfoot Blade",
        "clazz": "Soldier",
        "branch": "Skirmish",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "10 stamina",
        "rng": "Melee",
        "duration": "Instant",
        "description": [
            "You slash quickly at an enemy while staying mobile. Deal 4d10 physical damage to a target in range. If you cast a dash reaction ability, you may cast this ability as a free reaction at the beginning or end of your dash."
        ],
        "tags": [
            "Attack",
            "physical",
            "single-target",
            "melee",
            "longblade",
            "modal",
            "conditional"
        ]
    },
    {
        "type": "ability",
        "name": "Steadfast Strikes",
        "clazz": "Soldier",
        "branch": "Skirmish",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "20 stamina",
        "rng": "Melee",
        "duration": "Instant",
        "description": [
            "You attack relentlessly in between evasive moves. Deal 2d10 physical damage to a target in range. You may choose to concentrate on this ability when you cast it. If you do, you may use your Major Action to repeat this ability at no stamina cost, dealing 2d10 + Xd10 physical damage to a target in range, where X is the number of times you have hit with this ability since beginning concentration. Concentration on this ability ends immediately when you take at least 1 point of damage or recieve a condition."
        ],
        "tags": [
            "Attack",
            "physical",
            "single-target",
            "melee",
            "longblade",
            "concentration",
            "repeatable",
            "conditional"
        ]
    },
    {
        "type": "ability",
        "name": "Biding Blade",
        "clazz": "Soldier",
        "branch": "Skirmish",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "40 stamina",
        "rng": "Melee",
        "duration": "Instant",
        "description": [
            "You build energy while blocking to attack when the opening presents itself. Deal 5d10 physical damage to a target in range. If you cast a block reaction ability, you may cast this ability as a free reaction after your block, dealing 5d10 + X physical damage to a target in range, where X is half the blocked damage amount."
        ],
        "tags": [
            "Attack",
            "physical",
            "single-target",
            "melee",
            "longblade",
            "modal",
            "conditional"
        ]
    },
    {
        "type": "ability",
        "name": "Sever The Head",
        "clazz": "Soldier",
        "branch": "Skirmish",
        "tier": 4,
        "action": "1 Major Action",
        "cost": "50 stamina",
        "rng": "30 ft",
        "duration": "Instant",
        "description": [
            "You dive the enemy\u2019s backline with the goal of slaying their commander. Dash to a space adjacent to a target in range, marking the target and dealing 6d10 physical damage to it. While the target is marked, it loses its reaction and takes 50% increased damage from your attacks. The mark lasts until the beginning of your next turn or until you take at least 1 point of damage or gain a condition. Alternatively, you may end the mark early to dash up to 30 ft in any direction as a free reaction at any time."
        ],
        "tags": [
            "Attack",
            "physical",
            "single-target",
            "melee",
            "longblade",
            "modal",
            "mark",
            "damage boost",
            "dash"
        ]
    },
    {
        "type": "ability",
        "name": "Intercept",
        "clazz": "Soldier",
        "branch": "Safeguard",
        "tier": 1,
        "action": "1 Reaction",
        "cost": "10 stamina",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You toss your shield up to block an attack. Completely block one single-target attack on you as a reaction. If the attacker is in melee range, you may dash to any empty space that is still in melee range."
        ],
        "tags": [
            "Block",
            "self-target",
            "dash",
            "conditional",
            "shield"
        ]
    },
    {
        "type": "ability",
        "name": "Shield Bash",
        "clazz": "Soldier",
        "branch": "Safeguard",
        "tier": 2,
        "action": "1 Reaction",
        "cost": "30 stamina",
        "rng": "Melee",
        "duration": "Instant",
        "description": [
            "You preemptively counterattack before your enemy\u2019s attack lands. When an enemy in range targets you with an attack, deal 4d6 physical damage to that enemy. If you roll at least 18 on your damage dice for this ability, it also Stuns your target until the beginning of their next turn."
        ],
        "tags": [
            "Single-target",
            "attack",
            "physical",
            "melee",
            "shield",
            "conditional",
            "Stun",
            "condition"
        ]
    },
    {
        "type": "ability",
        "name": "Protective Sweep",
        "clazz": "Soldier",
        "branch": "Safeguard",
        "tier": 3,
        "action": "1 Reaction",
        "cost": "40 stamina",
        "rng": "5 ft",
        "duration": "Instant",
        "description": [
            "You spin your shield in a wide circle, protecting an entire area. Block all the effects of an incoming AOE attack for all spaces within range."
        ],
        "tags": [
            "Block",
            "AOE",
            "shield"
        ]
    },
    {
        "type": "ability",
        "name": "Long Live The King",
        "clazz": "Soldier",
        "branch": "Safeguard",
        "tier": 4,
        "action": "1 Major Action",
        "cost": "50 stamina",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You stand by an important ally, protecting them from harm. Until the beginning of your next turn, you may use any number of free reactions to redirect all attacks that would hit target adjacent ally to yourself, blocking 50% of the damage of those attacks. If the ally you targetted is not adjacent to you when they are attacked, you may dash to a space adjacent to them as a free reaction to such an attack, expending 5 stamina for every 5 ft traveled this way up to a limit of 50 ft."
        ],
        "tags": [
            "Block",
            "dash",
            "modal",
            "variable stamina cost",
            "redirect"
        ]
    },
    {
        "type": "ability",
        "name": "Dodge Roll",
        "clazz": "Soldier",
        "branch": "Sprint",
        "tier": 1,
        "action": "1 Minor Action or Reaction",
        "cost": "10 stamina",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You roll away or towards enemies. Dash up to 20 ft in any direction at any time. The max dash range extends to 30 ft if you use this ability as a reaction after using it as a minor action in the same round."
        ],
        "tags": [
            "Dash",
            "conditional"
        ]
    },
    {
        "type": "ability",
        "name": "Double Time",
        "clazz": "Soldier",
        "branch": "Sprint",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "20 stamina",
        "rng": "Self",
        "duration": "1 minute",
        "description": [
            "You speed up your pace in combat. Increase your move speed by +20 and convert all movement made during Move Actions to dashes."
        ],
        "tags": [
            "Buff",
            "move speed"
        ]
    },
    {
        "type": "ability",
        "name": "Tactical Withdrawal",
        "clazz": "Soldier",
        "branch": "Sprint",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "40 stamina",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You sprint out of a tactically unsound position. When you successfully resolve this ability, actions you take this turn do not trigger enemy reactions (although the initial cast of this ability can be reacted to). Dash up to 40 ft in any direction to a space that is not adjacent to an enemy."
        ],
        "tags": [
            "Dash",
            "conditional",
            "action denial"
        ]
    },
    {
        "type": "ability",
        "name": "Vigor of Battle",
        "clazz": "Soldier",
        "branch": "Sprint",
        "tier": 4,
        "action": "1 Minor Action",
        "cost": "50 stamina",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You build up speed as you deliver death. Until the beginning of your next turn, you gain 5 ft of additional move speed for every 5 damage you deal this round, and you gain 5% evasion for every 10 damage you deal this round. At the beginning of your next turn, any unused move speed you accumulated during the last round carries over to the new turn."
        ],
        "tags": [
            "Gain move speed",
            "gain evasion"
        ]
    },
    {
        "type": "ability",
        "name": "Gale Shot",
        "clazz": "Air Duelist",
        "branch": "Dueling",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "10 stamina",
        "rng": "150 ft",
        "duration": "Instant",
        "description": [
            "You fire at an enemy while making evasive maneuvers. Deal 4d8 physical damage to a target in range, then dash 10 ft in any direction"
        ],
        "tags": [
            "Attack",
            "ranged",
            "physical",
            "bow",
            "dash",
            "single-target"
        ]
    },
    {
        "type": "ability",
        "name": "Zephyr Shot",
        "clazz": "Air Duelist",
        "branch": "Dueling",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "25 stamina",
        "rng": "150 ft",
        "duration": "Instant",
        "description": [
            "You fire a series of several arrows at the enemy. Deal d8 physical damage to a target in range. This attack repeats 5 times, and you may change targets with each hit."
        ],
        "tags": [
            "Attack",
            "ranged",
            "physical",
            "bow",
            "single-target",
            "multi-target",
            "multi-hit"
        ]
    },
    {
        "type": "ability",
        "name": "Storm Shot",
        "clazz": "Air Duelist",
        "branch": "Dueling",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "30 stamina",
        "rng": "150 ft",
        "duration": "Instant",
        "description": [
            "You fire a rain of arrows from the skies. Deal 6d8 physical damage to all enemies in a 25 ft square centered on a space in range, Crippling them for 1 minute. Flying enemies take 100% increased damage from this ability, cannot evade this attack, and are additionally Knocked Prone."
        ],
        "tags": [
            "Attack",
            "ranged",
            "physical",
            "bow",
            "AOE",
            "square",
            "condition",
            "Cripple",
            "conditional",
            "no-miss",
            "Knock Prone"
        ]
    },
    {
        "type": "ability",
        "name": "Wind Strike",
        "clazz": "Air Duelist",
        "branch": "Casting",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "10 mana",
        "rng": "150 ft",
        "duration": "Instant",
        "description": [
            "You fire a powerful gust of air to blow enemies away. Deal 5d8 air magic damage to a target in range, pushing them 10 ft away from you."
        ],
        "tags": [
            "Spell",
            "attack",
            "ranged",
            "air",
            "destruction",
            "single-target",
            "control",
            "utility",
            "conjuration",
            "push."
        ]
    },
    {
        "type": "ability",
        "name": "Cutting Winds",
        "clazz": "Air Duelist",
        "branch": "Casting",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "25 mana",
        "rng": "150 ft",
        "duration": "Instant",
        "description": [
            "You conjure winds as sharp as blades to damage and knock down enemies. Deal 6d8 air magic damage to all entities in a 25 ft square centered on a space in range, knocking them all Prone."
        ],
        "tags": [
            "Spell",
            "attack",
            "ranged",
            "air",
            "destruction",
            "AOE",
            "square",
            "conjuration",
            "Knock Prone"
        ]
    },
    {
        "type": "ability",
        "name": "Harassing Whirlwind",
        "clazz": "Air Duelist",
        "branch": "Casting",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "40 mana",
        "rng": "150 ft",
        "duration": "1 minute",
        "description": [
            "You create a whirlwind around a target that constantly damages and pushes them. Deal 4d8 air magic damage to a target in range. While concentrating on this spell, for the spell\u2019s duration, the target takes 4d8 air magic damage and is pushed 20 ft in a direction of your choice at the beginning of each turn."
        ],
        "tags": [
            "Spell",
            "attack",
            "ranged",
            "air",
            "destruction",
            "control",
            "conjuration",
            "forced movement",
            "concentration"
        ]
    },
    {
        "type": "ability",
        "name": "Mistral Bow",
        "clazz": "Air Duelist",
        "branch": "Buffing",
        "tier": 1,
        "action": "1 Minor Action",
        "cost": "10 mana",
        "rng": "Self",
        "duration": "1 minute",
        "description": [
            "You use air magic to provide your bow with extra stopping power. For the spell\u2019s duration, when you hit a target with a bow attack, push the target 5 ft away from you as an on-hit effect."
        ],
        "tags": [
            "Spell",
            "air",
            "buff",
            "self-target",
            "on-hit",
            "bow",
            "push"
        ]
    },
    {
        "type": "ability",
        "name": "Arc of Air",
        "clazz": "Air Duelist",
        "branch": "Buffing",
        "tier": 2,
        "action": "1 Minor Action",
        "cost": "20 mana",
        "rng": "Self",
        "duration": "1 minute",
        "description": [
            "You envelop your bow in air magic energy. For the spell\u2019s duration, when you hit a target with a bow attack, deal an additional 2d8 air magic damage on hit."
        ],
        "tags": [
            "Spell",
            "air",
            "buff",
            "self-target",
            "on-hit",
            "bow",
            ""
        ]
    },
    {
        "type": "ability",
        "name": "Bow of Hurricanes",
        "clazz": "Air Duelist",
        "branch": "Buffing",
        "tier": 3,
        "action": "1 Minor Action",
        "cost": "30 mana",
        "rng": "Self",
        "duration": "1 minute",
        "description": [
            "Your bow becomes a thick arc of air magic. For the spell\u2019s duration, all damage that you would deal with bow attacks have their damage converted to air magic damage. While this buff is active, your bow attacks using special ammunition have 50% increased range."
        ],
        "tags": [
            "Spell",
            "air",
            "buff",
            "self-target",
            "on-hit",
            "bow",
            "damage convert",
            "increase range",
            "conditional"
        ]
    },
    {
        "type": "ability",
        "name": "Piercing Shot",
        "clazz": "Sniper",
        "branch": "Shooting",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "10 stamina",
        "rng": "200 ft",
        "duration": "Instant",
        "description": [
            "You fire an empowered arrow, skewering multiple enemies. Deal 5d8 physical damage to all enemy targets in a 200 ft line. Targets beyond the first one hit take half damage, unless they are Spotted."
        ],
        "tags": [
            "Attack",
            "ranged",
            "physical",
            "multi-target",
            ""
        ]
    },
    {
        "type": "ability",
        "name": "Kill Shot",
        "clazz": "Sniper",
        "branch": "Shooting",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "30 stamina",
        "rng": "200 ft",
        "duration": "Instant",
        "description": [
            "You fire a single, massive arrow with deadly accuracy. Deal 7d8 physical damage to a target in range. You may choose to expend any number of Spotting stacks to add 10% Lethality to the attack per stack."
        ],
        "tags": [
            "Attack",
            "ranged",
            "physical",
            "single-target",
            "modal",
            "Lethal"
        ]
    },
    {
        "type": "ability",
        "name": "Shrapnel  Shot",
        "clazz": "Sniper",
        "branch": "Shooting",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "45 stamina",
        "rng": "200 ft",
        "duration": "Instant",
        "description": [
            "You fire an arrow rigged to detonate, shooting deadly shrapnel from the arrowhead after initial impact. Deal 6d8 to a target in range. If the target is Spotted, this ability deals half as much damage taken by the target to all enemies within 20 ft of the target. If the target was killed by the initial hit, this ability deals damage equal to the damage taken by the target to all enemies within 20 ft of the target instead."
        ],
        "tags": [
            "Attack",
            "ranged",
            "physical",
            "single-target",
            "conditional",
            "AOE"
        ]
    },
    {
        "type": "ability",
        "name": "Rapid Shot",
        "clazz": "Sniper",
        "branch": "Shooting",
        "tier": 4,
        "action": "1 Major Action",
        "cost": "X stamina",
        "rng": "200 ft",
        "duration": "Instant",
        "description": [
            "You fire a heavy stream of arrows. Expend any amount of stamina in order to deal 2d8 physical damage to a target in range for every 10 stamina spent this way. If the target is Spotted, these hits gain the damage increase from consuming Spotting stacks without actually consuming them until the last hit."
        ],
        "tags": [
            "Attack",
            "ranged",
            "physical",
            "single-target",
            "multi-hit",
            "modal"
        ]
    },
    {
        "type": "ability",
        "name": "Distance Shooter",
        "clazz": "Sniper",
        "branch": "Aiming",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "15 stamina",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You fire specialized arrows which speed up as they fly. Your next ranged attack deals 2 additional damage for every 5 ft between you and your target."
        ],
        "tags": [
            "Buff",
            "self-target",
            "conditional",
            "ranged",
            "bow"
        ]
    },
    {
        "type": "ability",
        "name": "Precision Shooter",
        "clazz": "Sniper",
        "branch": "Aiming",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "30 stamina",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You fire specialized arrows which fly faster and punch through armor. Your next ranged attack ignores AC and MR, cannot miss, bypasses barriers and walls, cannot be blocked or redirected, and cannot be reacted to."
        ],
        "tags": [
            "Buff",
            "self-target",
            "ignore AC",
            "ignore MR",
            "ignore barriers/walls/blocks",
            "no-miss",
            "no-react",
            "bow"
        ]
    },
    {
        "type": "ability",
        "name": "Analytical Shooter",
        "clazz": "Sniper",
        "branch": "Aiming",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "55 stamina",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You aim carefully, scanning for a target\u2019s weak points. Your next ranged attack gains 20% critical strike chance and 50% critical damage modifier. When you cast this ability, you may choose to concentrate on it. While concentrating on this ability, you may use a Major Action to gain an additional 10% critical strike chance and 25% critical damage modifier on your next ranged attack. This ability cannot grant more than 100% critical strike chance or more than 200% critical damage modifier. Concentration on this ability ends immediately upon making an attack."
        ],
        "tags": [
            "Buff",
            "self-target",
            "stat improve",
            "critical",
            "concentration",
            "repeatable",
            "bow"
        ]
    },
    {
        "type": "ability",
        "name": "Professional Shooter",
        "clazz": "Sniper",
        "branch": "Aiming",
        "tier": 4,
        "action": "1 Major Action",
        "cost": "120 stamina",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You force your senses past their limit. If you have an enemy Spotted, when you cast this ability, you instantly gain max Spotting stacks. After casting this ability, you lose the benefits of the Spotter passive until your next long rest."
        ],
        "tags": [
            "Self-target",
            "bow"
        ]
    },
    {
        "type": "ability",
        "name": "Swift Sprint",
        "clazz": "Sniper",
        "branch": "Improvising",
        "tier": 1,
        "action": "1 Major Action or Reaction",
        "cost": "15 stamina",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You quickly spring to your feet and sprint from danger. Cleanse Slow, Immobilize, and Prone, then dash 10 ft in any direction. You may choose to expend a stack of Spotting to dash 25 ft instead."
        ],
        "tags": [
            "Dash",
            "modal",
            "cleanse"
        ]
    },
    {
        "type": "ability",
        "name": "Swift Shot",
        "clazz": "Sniper",
        "branch": "Improvising",
        "tier": 2,
        "action": "1 Minor Action or Reaction",
        "cost": "25 stamina",
        "rng": "200 ft",
        "duration": "Instant",
        "description": [
            "You flick your aim elsewhere and take a snap potshot. Deal 3d8 physical damage to a target in range, Stunning them until the end of the turn."
        ],
        "tags": [
            "Attack",
            "ranged",
            "physical",
            "single-target",
            "condition",
            "Stun"
        ]
    },
    {
        "type": "ability",
        "name": "Bola Shot",
        "clazz": "Sniper",
        "branch": "Improvising",
        "tier": 3,
        "action": "1 Major Action or Reaction",
        "cost": "35 stamina",
        "rng": "200 ft",
        "duration": "Instant",
        "description": [
            "You fire an arrow with a bola head. Deal 4d8 damage and inflict Slow on a target in range. You may choose to expend a stack of Spotting to inflict Immobilize instead."
        ],
        "tags": [
            "Attack",
            "ranged",
            "physical",
            "single-target",
            "condition",
            "Slow",
            "modal",
            "Immobilize"
        ]
    },
    {
        "type": "ability",
        "name": "Evasive Maneuvers",
        "clazz": "Sniper",
        "branch": "Improvising",
        "tier": 4,
        "action": "1 Major Action",
        "cost": "70 stamina",
        "rng": "Self",
        "duration": "1 minute",
        "description": [
            "You concentrate all your energy on avoiding attacks. Expend any number of Spotting stacks to gain 10% evasion per stack expended this way. While this buff is active, you may use your Reaction to cast any Sniper ability."
        ],
        "tags": [
            "Buff",
            "concentration",
            "add evasion",
            ""
        ]
    },
    {
        "type": "ability",
        "name": "Bodyshot",
        "clazz": "Rifleman",
        "branch": "Operation",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "10 stamina",
        "rng": "50 ft",
        "duration": "Instant",
        "description": [
            "You aim for center of mass. Fire your currently equipped firearm at an enemy in range, dealing an additional 3d12 physical damage. Your target then chooses to either fall prone or be pushed back 10 ft. If this attack is made with a silver bullet, your target must choose both.",
            "Secondary Fire: Fire your currently equipped firearm at an enemy in range, dealing an additional 2d12 physical damage. The target is inflicted with 10% physical vulnerability, which can stack up to 5 times. If this attack is made with a silver bullet, your target gains 2 stacks of this vulnerability."
        ],
        "tags": [
            "Attack",
            "physical",
            "single-target",
            "ranged",
            "firearm",
            "vulnerability",
            "knock prone",
            "forced movement",
            "modal"
        ]
    },
    {
        "type": "ability",
        "name": "Iron Sights",
        "clazz": "Rifleman",
        "branch": "Assembly",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "10 stamina",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You aim down your iron sights for increased accuracy. Your next firearm attack has +10% critical strike chance; it also has +100% critical damage modifier if it is made with a silver bullet."
        ],
        "tags": [
            "Buff",
            "conditional",
            "increase critical"
        ]
    },
    {
        "type": "ability",
        "name": "Quick Reload",
        "clazz": "Rifleman",
        "branch": "Maintenance",
        "tier": 1,
        "action": "1 Minor Action",
        "cost": "10 stamina",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You\u2019ve learned how to quickly load a new clip of ammo. Reload each firearm you have currently equipped. When you do, each firearm you have currently equipped gains a silver bullet in a chamber of your choice."
        ],
        "tags": [
            "Reload"
        ]
    },
    {
        "type": "ability",
        "name": "Belly Dance",
        "clazz": "Dancer",
        "branch": "Sway",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "10 stamina",
        "rng": "Touch",
        "duration": "1 minute",
        "description": [
            "You charm attackers with your sensual touch and dull their strikes. Inflict a 10% Weaken to a target in range for the duration. This Weaken can stack up to 4 times. This ability costs 10 less stamina if your last Move Action included a Step 3 dance ability."
        ],
        "tags": [
            "Attack",
            "condition",
            "Weaken",
            "stacking",
            "conditional",
            "dance",
            "Step 1"
        ]
    },
    {
        "type": "ability",
        "name": "Swing",
        "clazz": "Dancer",
        "branch": "Sway",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "15 stamina",
        "rng": "Touch",
        "duration": "Instant",
        "description": [
            "You force enemies to join you in dance. Push a target in range 20 ft in any direction. If the target hits other entities during its forced movement, it pushes them as well. This ability costs 15 less stamina if your last Move Action included a Step 1 dance ability."
        ],
        "tags": [
            "Attack",
            "push",
            "conditional",
            "dance",
            "Step 2"
        ]
    },
    {
        "type": "ability",
        "name": "Jive",
        "clazz": "Dancer",
        "branch": "Sway",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "20 stamina",
        "rng": "Touch",
        "duration": "Instant",
        "description": [
            "You confound enemies with swirling limb and step. Inflict Confusion on an enemy in range. While an enemy is Confused in this manner, you may choose a specific direction when they move or attack, and the chosen direction becomes 3 times as likely to be selected when they roll. This ability costs 20 less stamina if your last Move Action included a Step 2 dance ability."
        ],
        "tags": [
            "Attack",
            "condition",
            "Confuse",
            "modal",
            "dance",
            "Step 3"
        ]
    },
    {
        "type": "ability",
        "name": "Tango",
        "clazz": "Dancer",
        "branch": "Strut",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "10 stamina",
        "rng": "Touch",
        "duration": "Instant",
        "description": [
            "You join up with a partner, giving them time to recover while you guide their step. Cleanse 1 condition on yourself or cleanse 1 condition on an ally in range and push them 5 ft in any direction. This ability costs 10 less stamina if your last Move Action included a Step 1 dance ability."
        ],
        "tags": [
            "Cleanse",
            "push",
            "conditional",
            "dance",
            "Step 2"
        ]
    },
    {
        "type": "ability",
        "name": "Waltz",
        "clazz": "Dancer",
        "branch": "Strut",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "15 stamina",
        "rng": "Touch",
        "duration": "Instant",
        "description": [
            "You reinvigorate an ally with your beautiful dance moves. Heal 3d10 for a target in range and cleanse Poison, Bleed, and Burn. This ability costs 15 less stamina if your last Move Action included a Step 2 ability."
        ],
        "tags": [
            "Cleanse",
            "heal",
            "conditional",
            "dance",
            "Step 3"
        ]
    },
    {
        "type": "ability",
        "name": "Boogie",
        "clazz": "Dancer",
        "branch": "Strut",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "20 stamina",
        "rng": "Touch",
        "duration": "Instant",
        "description": [
            "You dance with an ally, energizing them. Dash up to your move speed, moving an ally in range with you (if you cast this ability as a Move Action, your movement becomes a dash instead). That ally gains an additional Major Action during their next turn. This ability costs 20 less stamina if your last Move Action included a Step 3 ability."
        ],
        "tags": [
            "Dash",
            "conditional",
            "dance",
            "Step 1"
        ]
    },
    {
        "type": "ability",
        "name": "Foxtrot",
        "clazz": "Dancer",
        "branch": "Shimmy",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "10 stamina",
        "rng": "Self",
        "duration": "1 minute",
        "description": [
            "You quickly step and weave across the dance hall. Gain 10% evasion and 10% general MR for the duration. This buff can stack up to 4 times. This ability costs 10 less stamina if your last Move Action included a Step 2 dance ability."
        ],
        "tags": [
            "Buff",
            "gain evasion",
            "gain MR",
            "dance",
            "Step 3"
        ]
    },
    {
        "type": "ability",
        "name": "Moonwalk",
        "clazz": "Dancer",
        "branch": "Shimmy",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "15 stamina",
        "rng": "Self",
        "duration": "1 minute",
        "description": [
            "You slide across the dance hall. Gain 10 movement speed. This buff can stack up to 4 times. This ability costs 15 less stamina if your last Move Action included a Step 3 dance ability."
        ],
        "tags": [
            "Buff",
            "gain move speed",
            "conditional",
            "dance",
            "Step 1"
        ]
    },
    {
        "type": "ability",
        "name": "Ballet",
        "clazz": "Dancer",
        "branch": "Shimmy",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "20 stamina",
        "rng": "Self",
        "duration": "1 minute",
        "description": [
            "Your mystical dance seems graceful on the outside, yet requires incredible athletics. Gain +10% general CR and +10% CR of a type of your choice. This buff can stack up to 2 times. This ability costs 20 less stamina if your last Move Action included a Step 1 dance ability."
        ],
        "tags": [
            "Buff",
            "gain CR",
            "conditional",
            "dance",
            "Step 2"
        ]
    },
    {
        "type": "ability",
        "name": "Lightning Lunge",
        "clazz": "Lightning Duelist",
        "branch": "Dueling",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "10 stamina",
        "rng": "Melee",
        "duration": "Instant",
        "description": [
            "You make a lunging strike at an enemy with your rapier. Dash up to 10 ft, then deal 4d8 physical damage to a target in range."
        ],
        "tags": [
            "Attack",
            "melee",
            "physical",
            "rapier",
            "dash",
            "single-target"
        ]
    },
    {
        "type": "ability",
        "name": "Blade Storm",
        "clazz": "Lightning Duelist",
        "branch": "Dueling",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "25 stamina",
        "rng": "Melee",
        "duration": "Instant",
        "description": [
            "You stab rapidly and repeatedly at an enemy with your rapier. Deal d8 physical damage to a target in range. This attack repeats 2-6 times."
        ],
        "tags": [
            "Attack",
            "melee",
            "physical",
            "rapier",
            "multi-hit",
            "single-target."
        ]
    },
    {
        "type": "ability",
        "name": "Shocking Parry",
        "clazz": "Lightning Duelist",
        "branch": "Dueling",
        "tier": 3,
        "action": "1 Reaction",
        "cost": "30 stamina",
        "rng": "Melee",
        "duration": "Instant",
        "description": [
            "You parry an enemy\u2019s strike and counter. As a reaction to an enemy in range attacking you with a weapon, fully block the attack with your rapier and counterattack, dealing 4d8 physical damage to that enemy. When you hit an enemy with this ability, you have a 50% chance of recovering half the stamina cost."
        ],
        "tags": [
            "Attack",
            "melee",
            "physical",
            "rapier",
            "single-target",
            "restore stamina",
            "reaction",
            "counter",
            "block"
        ]
    },
    {
        "type": "ability",
        "name": "Flash of Swords",
        "clazz": "Lightning Duelist",
        "branch": "Dueling",
        "tier": 4,
        "action": "1 Major Action",
        "cost": "70 stamina",
        "rng": "25 ft",
        "duration": "Instant",
        "description": [
            "You move and strike in a blur of deadly speed. Deal 8d8 physical damage to all enemies adjacent to you. Then, dash up to 25 ft to an empty space in range, dealing 4d8 physical damage to all enemies in spaces you pass through. Finally, deal 8d8 physical damage to all enemies adjacent to your dash\u2019s final destination. An enemy cannot be hit more than once with this ability per cast (Battle Current\u2019s activation counts as a separate cast)."
        ],
        "tags": [
            "Attack",
            "melee",
            "multi-target",
            "physical",
            "rapier",
            "dash"
        ]
    },
    {
        "type": "ability",
        "name": "Shock Tendrils",
        "clazz": "Lightning Duelist",
        "branch": "Casting",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "10 mana",
        "rng": "20 ft",
        "duration": "Instant",
        "description": [
            "You release tendril of energy in front of you. Deal 3d8 lightning magic damage to all enemy targets in a 20 ft line. Then at the end of your turn, this spell deals 3d8 damage to all targets in a 20 ft line with random direction."
        ],
        "tags": [
            "Spell",
            "attack",
            "lightning",
            "AOE",
            "line",
            "random"
        ]
    },
    {
        "type": "ability",
        "name": "Ball Lightning",
        "clazz": "Lightning Duelist",
        "branch": "Casting",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "25 mana",
        "rng": "20 ft",
        "duration": "1 minute",
        "description": [
            "You summon a ball of energy that erratically flies around attacking enemies. Summon a Ball Lightning object in an empty space in range. When summoned, it deals 4d8 lightning magic damage to all adjacent enemies. At the beginning of each of your turns, it travels 20 ft in a random direction (stopping when it hits a space it can\u2019t enter), then discharges, dealing 2d8 lightning magic damage to all adjacent targets."
        ],
        "tags": [
            "Spell",
            "attack",
            "lightning",
            "AOE",
            "summoning",
            "destruction",
            "random",
            "concentration"
        ]
    },
    {
        "type": "ability",
        "name": "Thunder Blast",
        "clazz": "Lightning Duelist",
        "branch": "Casting",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "40 mana",
        "rng": "100 ft",
        "duration": "Instant",
        "description": [
            "You call down a mighty bolt of thunder. Deal 8d8 lightning magic damage to all entities in a 20 ft square. Until the beginning of your next turn, random lightning strikes occur every turn in the target square, dealing 4d8 lightning magic damage to entities struck."
        ],
        "tags": [
            "Spell",
            "attack",
            "lightning",
            "AOE",
            "ground-target",
            "random"
        ]
    },
    {
        "type": "ability",
        "name": "Arc Lightning",
        "clazz": "Lightning Duelist",
        "branch": "Casting",
        "tier": 4,
        "action": "1 Major Action",
        "cost": "60 mana",
        "rng": "40 ft",
        "duration": "1 round",
        "description": [
            "You release a powerful bolt of lightning that bounces between targets. Deal 6d8 lightning magic damage to a target in range, marking them until the end of your next turn. Dealing physical damage to the marked target with a rapier causes a lightning bolt to fire from their bodies, dealing 6d8 lightning magic damage to them and cleansing their mark, as well as dealing 6d8 lightning magic damage to another random enemy within 40 ft and marking them until the end of your next turn."
        ],
        "tags": [
            "Spell",
            "attack",
            "ranged",
            "lightning",
            "single-target",
            "mark",
            "random",
            ""
        ]
    },
    {
        "type": "ability",
        "name": "Taser Blade",
        "clazz": "Lightning Duelist",
        "branch": "Buffing",
        "tier": 1,
        "action": "1 Minor Action",
        "cost": "10 mana",
        "rng": "Self",
        "duration": "1 minute",
        "description": [
            "You envelop your blade in an electric current. For the spell\u2019s duration, when you hit a target with a rapier attack, inflict a stack of Paralysis on the target."
        ],
        "tags": [
            "Spell",
            "lightning",
            "buff",
            "self-target",
            "on-hit",
            "condition",
            "Paralysis",
            "rapier"
        ]
    },
    {
        "type": "ability",
        "name": "Sword of Lightning",
        "clazz": "Lightning Duelist",
        "branch": "Buffing",
        "tier": 2,
        "action": "1 Minor Action",
        "cost": "20 mana",
        "rng": "Self",
        "duration": "1 minute",
        "description": [
            "You envelop your blade in lightning magic energy. For the spell\u2019s duration, when you hit a target with a rapier attack, deal an additional 2d8 lightning magic damage on hit."
        ],
        "tags": [
            "Spell",
            "lightning",
            "buff",
            "self-target",
            "on-hit",
            "rapier"
        ]
    },
    {
        "type": "ability",
        "name": "Plasma Saber",
        "clazz": "Lightning Duelist",
        "branch": "Buffing",
        "tier": 3,
        "action": "1 Minor Action",
        "cost": "30 mana",
        "rng": "Self",
        "duration": "1 minute",
        "description": [
            "Your blade becomes a thin sheet of lightning magic. All damage that you would deal with rapier attacks have their damage converted to lightning magic damage. While this buff is active, Battle Current empowered attacks recover 5, 10, or 15 stamina randomly."
        ],
        "tags": [
            "Spell",
            "lightning",
            "buff",
            "self-target",
            "damage convert",
            "rapier",
            "gain stamina"
        ]
    },
    {
        "type": "ability",
        "name": "Lightning Coil Cuirass",
        "clazz": "Lightning Duelist",
        "branch": "Buffing",
        "tier": 4,
        "action": "1 Minor Action",
        "cost": "80 mana",
        "rng": "Self",
        "duration": "1 minute",
        "description": [
            "You don magically conjured lightning armor. Whenever an adjacent enemy targets you with an attack, they are inflicted with a stack of Paralysis and take 2d8 lightning magic damage. Whenever you take damage, you may freely dash up to your speed in any direction. While this ability is active, you gain a stack of Lightning on every physical damage hit. You expend all stacks of Lightning when you cast a lightning spell attack, increasing lightning magic damage by 10% for each stack of Lightning expended this way, up to a limit of 20 stacks."
        ],
        "tags": [
            "Spell",
            "lightning",
            "buff",
            "self-target",
            "condition",
            "Paralysis",
            "stacking buff",
            "concentration",
            "dash"
        ]
    },
    {
        "type": "ability",
        "name": "Slice and Dice",
        "clazz": "Champion",
        "branch": "Type A Weapons",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "15 stamina",
        "rng": "Weapon",
        "duration": "Instant",
        "description": [
            "You hack at an enemy with your weapon. Deal 5d10 physical damage to a target in range. You may reroll any damage dice rolled with this attack, taking the second result. If this attack is made with an axe or sword, take the higher result instead."
        ],
        "tags": [
            "Attack",
            "physical",
            "single-target",
            "melee",
            "ranged",
            "axe",
            "blunt",
            "longblade",
            "polearm",
            "shield",
            "heavy throwing weapon",
            "modal",
            "conditional",
            "reroll"
        ]
    },
    {
        "type": "ability",
        "name": "Skull Bash",
        "clazz": "Champion",
        "branch": "Type A Weapons",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "25 stamina",
        "rng": "Weapon",
        "duration": "Instant",
        "description": [
            "You bash an enemy\u2019s head in with your weapon. Deal 6d10 physical damage to a target in range and Stun them until the end of their next turn. If this attack is made with a blunt weapon or shield, it also hits enemies adjacent to your target."
        ],
        "tags": [
            "Attack",
            "physical",
            "single-target",
            "melee",
            "ranged",
            "axe",
            "blunt",
            "longblade",
            "polearm",
            "shield",
            "heavy throwing weapon",
            "condition",
            "Stun",
            "conditional",
            "multi-target"
        ]
    },
    {
        "type": "ability",
        "name": "Piercing Blow",
        "clazz": "Champion",
        "branch": "Type A Weapons",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "35 stamina",
        "rng": "Weapon",
        "duration": "Instant",
        "description": [
            "You skewer your enemy. Deal 7d10 physical damage to a target in range. This attack pierces your target to hit an enemy behind them that is within 15 ft of the initial target for half damage. If this attack is made with a polearm or heavy throwing weapon, the second hit deals full damage instead."
        ],
        "tags": [
            "Attack",
            "physical",
            "single-target",
            "multi-target",
            "melee",
            "ranged",
            "axe",
            "blunt",
            "longblade",
            "polearm",
            "shield",
            "heavy throwing weapon",
            "conditional"
        ]
    },
    {
        "type": "ability",
        "name": "Arsenal of Power",
        "clazz": "Champion",
        "branch": "Type A Weapons",
        "tier": 4,
        "action": "1 Major Action",
        "cost": "80 stamina",
        "rng": "Weapon",
        "duration": "Instant",
        "description": [
            "You use every heavy weapon available to you to pound an enemy into submission. Swap weapons in both hands, then choose one of the following:",
            "With an axe equipped, deal 8d10 physical damage to a target in range, inflicting half your damage dealt as Bleed for 1 minute",
            "With a blunt weapon equipped, deal 8d10 physical damage to a target in range, inflicting a condition that decreases the target\u2019s move speed by half your damage dealt for 1 minute",
            "With a longblade equipped, deal 8d10 physical damage to a target in range, inflicting physical vulnerability equal to half your damage dealt for 1 minute (append a \u201c%\u201d to the value)",
            "With a polearm equipped, deal 8d10 physical damage to a target in range, inflicting AC loss equal to half your damage dealt for 1 minute",
            "With a shield equipped, deal 8d10 physical damage to a target in range, gaining AC equal to half you damage dealt for 1 minute",
            "With a heavy throwing weapon equipped, deal 8d10 physical damage to a target in range, and this attack does not consume special ammunition (unless it is special ammunition granted by a class ability)",
            "Then, you may concentrate on this ability. If you do, you may repeat it as a free action at no cost once per turn, choosing a new selection from the list above. Concentration ends when you exhaust the list."
        ],
        "tags": [
            "Attack",
            "physical",
            "single-target",
            "melee",
            "ranged",
            "axe",
            "blunt",
            "longblade",
            "polearm",
            "shield",
            "heavy throwing weapon",
            "conditional",
            "modal",
            "concentration",
            "condition",
            "Bleed",
            "Vulnerability"
        ]
    },
    {
        "type": "ability",
        "name": "Precision Strike",
        "clazz": "Champion",
        "branch": "Type B Weapons",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "15 stamina",
        "rng": "Weapon",
        "duration": "Instant",
        "description": [
            "You carefully strike for a precise point to pass through an enemy\u2019s armor. Deal 5d8 physical damage to a target in range. This attack cannot miss, cannot be blocked, ignores AC, and ignores magical defenses. If this attack is made with a fine weapon or unarmed combat, you may dash up to 20 ft before or after the attack."
        ],
        "tags": [
            "Attack",
            "physical",
            "single-target",
            "melee",
            "ranged",
            "bow",
            "crossbow",
            "bullet",
            "fine weapon",
            "unarmed",
            "light throwing weapon",
            "conditional",
            "modal",
            "dash"
        ]
    },
    {
        "type": "ability",
        "name": "Fan The Hammer",
        "clazz": "Champion",
        "branch": "Type B Weapons",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "25 stamina",
        "rng": "Weapon",
        "duration": "Instant",
        "description": [
            "You fire multiple attacks quickly at a single target. Deal 2d8 physical damage to a target in range, then repeat this for 3 more hits against the same target. This attack cannot be reacted to. If this attack is made with a crossbow or bullet weapon, this ability gains, \u201cOn Hit: Push target 10 ft.\u201d"
        ],
        "tags": [
            "Attack",
            "physical",
            "single-target",
            "melee",
            "ranged",
            "bow",
            "crossbow",
            "bullet",
            "fine weapon",
            "unarmed",
            "light throwing weapon",
            "multi-hit",
            "conditional",
            "forced movement"
        ]
    },
    {
        "type": "ability",
        "name": "Painful Blow",
        "clazz": "Champion",
        "branch": "Type B Weapons",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "35 stamina",
        "rng": "Weapon",
        "duration": "Instant",
        "description": [
            "You attack an enemy\u2019s weak points, dealing immense pain. Deal 6d8 physical damage to a target in range and inflict them with a 2d8 Bleed. If this attack is made with a bow or light throwing weapon, inflict the target with 50% physical vulnerability as well."
        ],
        "tags": [
            "Attack",
            "physical",
            "single-target",
            "melee",
            "ranged",
            "bow",
            "crossbow",
            "bullet",
            "fine weapon",
            "unarmed",
            "light throwing weapon",
            "conditional",
            "Bleed",
            "Vulnerability",
            "condition"
        ]
    },
    {
        "type": "ability",
        "name": "Arsenal of Finesse",
        "clazz": "Champion",
        "branch": "Type B Weapons",
        "tier": 4,
        "action": "1 Major Action",
        "cost": "80 stamina",
        "rng": "Weapon",
        "duration": "Instant",
        "description": [
            "You attack quickly with all of your fast weapons. Swap weapons in both hands, then choose one of the following:",
            "With a bow equipped, deal 7d10 physical damage to a target in range, inflicting evasion loss equal to half the damage dealt (append a \u201c%\u201d to the value)",
            "With a crossbow equipped, deal 7d10 physical damage to a target in range, pushing the target back a distance equal to half your damage dealt in feet",
            "With a bullet weapon equipped, deal 7d10 physical damage to a target in range; this attack has a chance of stunning equal to half your damage dealt as a percentage",
            "With a fine weapon equipped, deal 7d10 physical damage to a target in range, then dash up to half your damage dealt in any direction",
            "With unarmed combat, deal 7d10 physical damage to a target in range; this attack has a chance to combo equal to 10% of your damage dealt as a percentage",
            "With a light throwing weapon equipped, deal 7d10 physical damage to a target in range, and this attack does not consume special ammunition (unless it is special ammunition granted by a class ability)",
            "Then, you may concentrate on this ability. If you do, you may repeat it as a free action at no cost once per turn, choosing a new selection from the list above. Concentration ends when you exhaust the list."
        ],
        "tags": [
            "Attack",
            "physical",
            "single-target",
            "melee",
            "ranged",
            "bow",
            "crossbow",
            "bullet",
            "fine weapon",
            "unarmed",
            "light throwing weapon",
            "conditional",
            "modal",
            "combo",
            "dash",
            "condition",
            "Stun",
            "forced movement",
            "concentration"
        ]
    },
    {
        "type": "ability",
        "name": "Disarming Blow",
        "clazz": "Champion",
        "branch": "Type C Weapons",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "15 stamina",
        "rng": "Weapon",
        "duration": "Instant",
        "description": [
            "You slam your weapon home while also disarming your opponent. Deal 5d6 physical damage to a target in range. That target is disarmed and you may choose to kick the dropped item 30 ft in any direction. If this attack is made with an improvised weapon, you may pick up whatever the target dropped instead and make an autoattack with it if it is a weapon."
        ],
        "tags": [
            "Attack",
            "physical",
            "single-target",
            "melee",
            "shortblade",
            "improvised weapon",
            "conditional",
            "modal",
            "disarm"
        ]
    },
    {
        "type": "ability",
        "name": "Throat Slitter",
        "clazz": "Champion",
        "branch": "Type C Weapons",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "25 stamina",
        "rng": "Weapon",
        "duration": "Instant",
        "description": [
            "You aim for an enemy\u2019s weak points. Deal 6d6 physical damage to a target in range. This attack has your choice of either 15% critical strike chance or 150% critical damage modifier. If this attack is made with a shortblade, you may choose both."
        ],
        "tags": [
            "Attack",
            "physical",
            "single-target",
            "melee",
            "shortblade",
            "improvised weapon",
            "conditional",
            "modal"
        ]
    },
    {
        "type": "ability",
        "name": "Parry and Draw",
        "clazz": "Champion",
        "branch": "Type C Weapons",
        "tier": 3,
        "action": "1 Reaction",
        "cost": "30 stamina",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You ward off attacks as you switch weapons. As a reaction to an attack, block the attack fully with your currently equipped weapon or shield. Then, you may swap weapons in both hands."
        ],
        "tags": [
            "Block",
            "modal"
        ]
    },
    {
        "type": "ability",
        "name": "Weapon Juggling",
        "clazz": "Champion",
        "branch": "Type C Weapons",
        "tier": 4,
        "action": "1 Minor Action",
        "cost": "50 stamina",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You\u2019ve mastered the art of swapping weapons seamlessly while attacking with them. Concentrate on this ability; while you do, the weapon swap action is a free action, and Master of Arms can trigger up to twice per turn instead of once per turn. If you would swap to a weapon which would trigger a \u201cdraw weapon\u201d trigger, ignore the trigger while concentrating on this ability."
        ],
        "tags": [
            "Concentration"
        ]
    },
    {
        "type": "ability",
        "name": "Cloak and Dagger",
        "clazz": "Thief",
        "branch": "Predator",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "20 stamina",
        "rng": "Melee",
        "duration": "Instant",
        "description": [
            "You stab at an enemy behind the veil of stealth or with the sudden violence of a mugging. Deal 5d4 physical damage to a target in range. If you are in Hit Stance, this attack has +100% critical damage modifier. If you are in Run Stance, this attack has +20% critical strike chance."
        ],
        "tags": [
            "Attack",
            "physical",
            "melee",
            "conditional",
            "stance",
            "single-target"
        ]
    },
    {
        "type": "ability",
        "name": "Blade in the Dark",
        "clazz": "Thief",
        "branch": "Predator",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "25 stamina",
        "rng": "30 ft",
        "duration": "Instant",
        "description": [
            "You toss a knife from the shadows. Deal 4d4 physical damage to a target in range. If you entered Hit Stance this turn, you may dash to a space adjacent to your target after the attack, gaining 50% critical damage modifier until the end of your next turn. If you entered Run Stance this turn, this attack does not break your Hidden status, and you gain 10% critical strike chance until the end of your next turn."
        ],
        "tags": [
            "Attack",
            "physical",
            "ranged",
            "conditional",
            "stance",
            "Hidden",
            "buff",
            "modal",
            "single-target"
        ]
    },
    {
        "type": "ability",
        "name": "Frenetic Assault",
        "clazz": "Thief",
        "branch": "Predator",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "40 stamina",
        "rng": "Melee",
        "duration": "Instant",
        "description": [
            "You quickly stab with your dagger multiple times. Deal d4 physical damage to a target in range, repeated 3 times. If you are in Hit Stance, these hits have, \u201cOn Hit: Target loses your choice of 5 AC, 10% evasion, or 10% MR.\u201d If you are in Run Stance, you may dash up to 10 ft before each hit, and you may choose new targets for each hit."
        ],
        "tags": [
            "Attack",
            "physical",
            "melee",
            "conditional",
            "stance",
            "dash",
            "single-target",
            "multi-target"
        ]
    },
    {
        "type": "ability",
        "name": "Unavoidable Casualties",
        "clazz": "Thief",
        "branch": "Predator",
        "tier": 4,
        "action": "1 Reaction",
        "cost": "80 stamina",
        "rng": "Melee",
        "duration": "Instant",
        "description": [
            "You cut down the unsuspecting person who just happens to be in your way. As a reaction to stealing from an enemy, moving out of melee range of an enemy, or being attacked by an enemy in range, deal 20d4 physical damage to that enemy. If you are in Hit Stance, this attack gains 5% Lethality for every damage die that rolls its maximum. If you are in Run Stance, gain 5 stamina for every damage die that rolls its maximum. You may not attack an enemy who was hit by this ability during your next turn."
        ],
        "tags": [
            "Attack",
            "physical",
            "melee",
            "conditional",
            "stance",
            "Lethality",
            "recover stamina"
        ]
    },
    {
        "type": "ability",
        "name": "Snatch and Grab",
        "clazz": "Thief",
        "branch": "Pilfer",
        "tier": 1,
        "action": "1 Minor Action",
        "cost": "15 stamina",
        "rng": "Melee",
        "duration": "Instant",
        "description": [
            "You reach into a distracted enemy\u2019s bag and grab the first thing you touch. Steal a random item or up to 100 gp from the inventory of a target in range. If you are in Hit Stance, steal twice from the target. If you fail to steal an item because the target\u2019s inventory is empty, you may make an auto attack against the target with an equipped dagger as a free action."
        ],
        "tags": [
            "Conditional",
            "random",
            "modal",
            "attack",
            "physical",
            "dagger",
            "stance"
        ]
    },
    {
        "type": "ability",
        "name": "Charm and Disarm",
        "clazz": "Thief",
        "branch": "Pilfer",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "40 stamina",
        "rng": "Melee",
        "duration": "Instant",
        "description": [
            "You distract an enemy and snatch the weapon right out of an enemy\u2019s hand, or loosen the clasps on their armor so it falls free. A target in range becomes Confused until the beginning of their next turn. Then steal a weapon or armor piece that is equipped to that target. If you are in Hit Stance and steal a weapon this way, you may make an autoattack with that weapon as a free action before stowing or discarding it. If you are in Hit Stance and steal a piece of armor this way, the target\u2019s Confusion lasts until the end of their next turn instead."
        ],
        "tags": [
            "Conditional",
            "stance",
            "modal",
            "attack",
            "condition",
            "Confuse"
        ]
    },
    {
        "type": "ability",
        "name": "Purloin Powers",
        "clazz": "Thief",
        "branch": "Pilfer",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "50 stamina",
        "rng": "30 ft",
        "duration": "Instant",
        "description": [
            "Your deft stealing skills allow you to steal an enemy\u2019s magic effects. Choose one:",
            "Strip all buffs from all enemy targets in range, then gain those buffs yourself, or distribute them as you choose amongst allies within 30 ft.",
            "If you are in Hit Stance, cast this ability as a reaction to a spell that is cast within range. Counter that spell, then you may copy and cast it yourself, choosing new targets and paying stamina instead of mana."
        ],
        "tags": [
            "Buff strip",
            "buff",
            "modal",
            "conditional",
            "stance",
            "counterspell"
        ]
    },
    {
        "type": "ability",
        "name": "Grand Thievery",
        "clazz": "Thief",
        "branch": "Pilfer",
        "tier": 4,
        "action": "1 Minor Action",
        "cost": "60 stamina",
        "rng": "Melee",
        "duration": "Instant",
        "description": [
            "You dash forward with the intent of stealing everything you can get your hands on. Dash up to 30 ft in any direction. Then, steal a random item or up to 100 gp from the inventory of a target in range. If you are in Hit Stance, steal twice instead. Then make a Steal check with a DC of 10 + X where X is 10 times the number of times you have stolen with this ability. If your Steal check succeeds, repeat this ability as a free action with no cost."
        ],
        "tags": [
            "Conditional",
            "random",
            "stance",
            "repeatable"
        ]
    },
    {
        "type": "ability",
        "name": "Infiltrate",
        "clazz": "Thief",
        "branch": "Prowl",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "20 stamina",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You move quickly and quietly past doors and guards. Dash up to 40 ft in any direction. During this dash, you automatically unlock doors and windows and pass through magical barriers without harm. If you are in Run Stance, you may cast this ability as a Minor Action instead."
        ],
        "tags": [
            "Dash",
            "conditional",
            "modal",
            "stance"
        ]
    },
    {
        "type": "ability",
        "name": "Dodge the Law",
        "clazz": "Thief",
        "branch": "Prowl",
        "tier": 2,
        "action": "1 Reaction",
        "cost": "30 stamina",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You evade an attempt at capture and escape the hands of your pursuers. Cleanse Cripple, Immobilize, Prone, and Slow. Break any grapple or bindings you are in and temporarily ignore any condition or spell that would prevent you from moving freely until the end of your next turn. Then dash up to 30 ft in any direction. If you are in Run Stance, you may instead dash up to 40 ft in any direction and become Hidden after your dash."
        ],
        "tags": [
            "Cleanse",
            "dash",
            "conditional",
            "stance",
            "Hidden"
        ]
    },
    {
        "type": "ability",
        "name": "Smokescreen",
        "clazz": "Thief",
        "branch": "Prowl",
        "tier": 3,
        "action": "1 Major Action",
        "cost": "60 stamina",
        "rng": "Self",
        "duration": "1 minute",
        "description": [
            "You drop a smoke bomb and disappear. Drop a 35 ft square of thick smoke that enemies cannot see through. You and your allies remain Hidden while in this smoke, and can see through it. This smoke suppresses the field effects of your enemies that overlap with it, and enemies inside the smoke have -50% evasion and -50% MR. This smoke can be blown away by a strong wind. If you are in Run Stance, you may cast this ability as a reaction; if you do, the smoke blocks AOE attacks and effects within its spaces until the beginning of your next turn."
        ],
        "tags": [
            "Hidden",
            "conditional",
            "stance",
            "modal",
            "block"
        ]
    },
    {
        "type": "ability",
        "name": "Phantom Thief",
        "clazz": "Thief",
        "branch": "Prowl",
        "tier": 4,
        "action": "1 Major Action",
        "cost": "100 stamina",
        "rng": "Self",
        "duration": "1 minute",
        "description": [
            "You embody the legend of the master thief that you are, a spirit of freedom. Gain a buff that grants +100% Evasion, +100% crowd control CR, 1 additional Minor Action per turn, and 1 additional reaction per round, for the duration. If you enter Run stance while this buff is active, gain an additional Major Action."
        ],
        "tags": [
            "Buff",
            "conditional",
            "stance",
            "gain actions",
            "gain evasion",
            "gain CR"
        ]
    },
    {
        "type": "ability",
        "name": "Krystalline Basileia",
        "clazz": "Evangelist",
        "branch": "Gelidus Ouranos",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "40 mana",
        "rng": "200 ft",
        "duration": "Instant",
        "description": [
            "You cause an explosion of ice shards and dark energy. Deal 6d8 ice magic damage and 6d8 dark magic damage to all enemies in a 65 ft square centered on a space in range, then choose two additional effects from the following list:",
            "Inflict Frozen for 1 minute",
            "Inflict Slowed for 1 minute",
            "Inflict Blinded for 1 minute",
            "Inflict 2 curses",
            "Instead of choosing two effects from the above list, you may instead have this spell deal an additional 4d8 magic damage of either ice or dark.",
            "If you absorb this spell with Magia Erebea, you may have it be cast when you release Magia Erebea as long as it was absorbed for at least 2 turns. If you do release the spell in this way, you may select 3 conditions from the above list, or have the spell deal an additional 6d8 magic damage of either ice or dark."
        ],
        "tags": [
            "Spell",
            "attack",
            "destruction",
            "AOE",
            "square",
            "condition",
            "Frozen",
            "Slowed",
            "Blinded",
            "curse",
            "modal",
            "conditional",
            "dark",
            "ice"
        ]
    },
    {
        "type": "ability",
        "name": "Iaculatio Orcus",
        "clazz": "Evangelist",
        "branch": "Gelidus Ouranos",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "60 mana",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You cause spears of ice and darkness to fire from your hands in a wide arc. Deal 16d8 magic damage to all enemies in a 60 ft cone in front of you; the type of magic damage dealt and additional effects are dependant on each enemy\u2019s distance from you as follows:",
            "Within 10 ft: 4d8 ice magic damage and 12d8 dark magic damage, and the attack has 30% Lethality",
            "11 to 20 ft: 6d8 ice magic damage and 10d8 dark magic damage, and inflict a 30% Weaken",
            "21 to 40 ft: 8d8 ice magic damage and 8d8 dark magic damage",
            "41 to 50 ft: 10d8 ice magic damage and 6d8 dark magic damage, and inflict Slowed",
            "51 to 60 ft: 12d8 ice magic damage and 4d8 dark magic damage, and inflict Frozen",
            "If you absorb this spell with Magia Erebea, you may have it be cast when you release Magia Erebea as long as it was absorbed for at least 2 turns. If you do release the spell in this way, the cone\u2019s range extends to 120 ft, and the above list\u2019s effect ranges change to within 20 ft, 21 to 40, 41 to 80, 81 to 100, and 101 to 120 respectively."
        ],
        "tags": [
            "Spell",
            "attack",
            "destruction",
            "dark",
            "ice",
            "AOE",
            "cone",
            "conditional",
            "condition",
            "Lethality",
            "Weaken",
            "Slow",
            "Frozen",
            "modal"
        ]
    },
    {
        "type": "ability",
        "name": "Frigerans Barathrum",
        "clazz": "Evangelist",
        "branch": "Nivis Obscurans",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "50 mana",
        "rng": "200 ft",
        "duration": "Endless",
        "description": [
            "You overload the souls of your enemies with corrupting and chilling energy. All enemies in a 65 ft square centered on a space in range gain 2 of the following conditions of your choice:",
            "Each turn, their move speed and dash/teleport distance decreases by 10.",
            "Using a dash ability, teleport ability, or Move Action causes their move speed and dash/teleport distance to decrease by 10 after their movement ends.",
            "Each turn, they gain a curse.",
            "Making an attack causes them to gain a curse after their attack concludes.",
            "If you cast this spell with Magia Erebea active, you may select all 4 options from the above list."
        ],
        "tags": [
            "Spell",
            "dark",
            "ice",
            "condition",
            "control",
            "Curse",
            "AOE",
            "square",
            "modal",
            "conditional"
        ]
    },
    {
        "type": "ability",
        "name": "Anthos Pagetou Khilion Eton",
        "clazz": "Evangelist",
        "branch": "Nivis Obscurans",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "70 mana",
        "rng": "200 ft",
        "duration": "30 seconds",
        "description": [
            "You pull enemies together to set up for later spell attacks. Create a Flower on a space in range; it is immune to damage and conditions and resists all forced movement, but can be dispelled, and it lasts for 30 seconds. You may only have one Flower active at one time. If a damaging AOE spell you cast also hits the Flower, the damage for that spell is doubled and the Flower is dispelled. Enemies within 1000 ft of it roll a d6 at the beginning of their turns, causing the following effects:",
            "On a 1 or 2, the enemy gains a curse and is inflicted with Slowed and Confused",
            "On a 3 or 4, the enemy gains 2 curses, and may not move away from the Flower in any way",
            "On a 5 or 6, the enemy gains 3 curses, and must use its Move Action to move toward the Flower up to its move speed, even if already next to the Flower. The enemy loses any excess move speed that turn",
            "If you cast this spell with Magia Erebea active, enemies within 1000 ft of the Flower will roll the d6 twice, taking the higher result each time."
        ],
        "tags": [
            "Spell",
            "dark",
            "ice",
            "condition",
            "control",
            "Curse",
            "AOE",
            "field",
            "totem",
            "conditional",
            "Confused"
        ]
    },
    {
        "type": "ability",
        "name": "Actus Noctis Erebeae",
        "clazz": "Evangelist",
        "branch": "Magia Ensis",
        "tier": 1,
        "action": "Free Reaction",
        "cost": "X mana",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You exploit your enhanced body\u2019s new affinity for magic to store spells for quicker casting. You may only cast this ability while under the effects of Magia Erebea. When you cast a spell, you may pay an additional X mana, where X is the spell\u2019s mana cost. If you do, you absorb the spell being cast instead of releasing it. While a spell is absorbed in this manner, you may cast it as a Minor Action or reaction at half its mana cost. You may have multiple spells absorbed simultaneously in this manner. When Magia Erebea is released, all absorbed spells are dispelled."
        ],
        "tags": [
            "Conditional",
            "modal"
        ]
    },
    {
        "type": "ability",
        "name": "Supplementum Pro Armationem",
        "clazz": "Evangelist",
        "branch": "Magia Ensis",
        "tier": 2,
        "action": "Free Action",
        "cost": "None",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You reconfigure the mana which flows wildly through you. You may only cast this ability while under the effects of Magia Erebea. Magia Erebea gains the following effects until you release it:",
            "Maximum health loss per turn increases to 20",
            "Your unarmed and weapon attacks gain the absorbed spell\u2019s damage dice and conditions as on-hit damage and conditions, in a similar manner as your spells do",
            "Your move speed doubles and your Move Actions are teleports",
            "Your single-target attacks ignore AC, MR, and Evasion"
        ],
        "tags": [
            "Conditional"
        ]
    },
    {
        "type": "ability",
        "name": "Demonbane Blast",
        "clazz": "Demon Hunter",
        "branch": "Slayer",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "30 stamina",
        "rng": "60 ft",
        "duration": "Instant",
        "description": [
            "You fire projectiles primed with a blessing to exploit a demon\u2019s magical circuit and otherworldly energy. Deal 10d8 physical damage to a target in range; that target then loses 10% of their mana and stamina and loses health equal to the amount of mana and stamina they lost (or would lose if they do not have the stamina or mana to lose). If this attack is made against an entity of demonic origin, it deals double damage and the target loses twice as much health after their mana and stamina loss. You may cast this ability as a free action if you expend 2 Hunter stacks; if you do, this attack ignores AC, cannot be blocked, and bypasses magical barriers."
        ],
        "tags": [
            "Attack",
            "physical",
            "single-target",
            "bow",
            "crossbow",
            "firearm",
            "no block",
            "conditional",
            "modal"
        ]
    },
    {
        "type": "ability",
        "name": "Consecrated Carnage",
        "clazz": "Demon Hunter",
        "branch": "Slayer",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "40 stamina",
        "rng": "30 ft",
        "duration": "Instant",
        "description": [
            "You dive into danger and fire wildly in a circle, forcing hordes of demons back and to their knees. Dash up to 40 ft in any direction, then deal 8d8 physical damage to all targets in range, pushing them back until they are outside the range, then inflicting Crippled and a 30% Weaken. This attack has 20% increased damage for every enemy within range. Each enemy of demonic origin adds 40% increased damage instead, and is inflicted with a 50% Weaken instead. You may cast this ability as a free action if you expend 2 Hunter stacks; if you do, this attack ignores AC, cannot be blocked, and bypasses magical barriers."
        ],
        "tags": [
            "Attack",
            "physical",
            "multi-target",
            "condition",
            "Cripple",
            "Weaken",
            "conditional",
            "modal",
            "no-block",
            "bow",
            "crossbow",
            "firearm"
        ]
    },
    {
        "type": "ability",
        "name": "Banishing Bolt",
        "clazz": "Demon Hunter",
        "branch": "Exorcism",
        "tier": 1,
        "action": "1 Major Action",
        "cost": "40 mana",
        "rng": "60 ft",
        "duration": "Instant",
        "description": [
            "You fire a bolt of magical energy that tears away a demon\u2019s hold on the physical realm. Deal 6d8 lightning magic damage and 5d10 light magic damage to all enemies in a 35 ft square, centered on a space in range; this attack deals double damage and has 30% Lethality against entities of demonic origin. Allies, including yourself, that are caught in the blast will gain the lightning damage rolled as on-hit damage for their next attack and heal for the light damage rolled. This attack leaves behind a field of banishment; within this field, attacks against entities of demonic origin have 30% Lethality and all enemies have -20% MR and CR. The field lasts for 1 minute, but you may expend it as a free action, cleansing 1 condition on every ally, including yourself, that was within the field. You may cast this ability as a free action if you expend 2 Hunter stacks; if you do, this attack ignores MR, cannot be blocked, and bypasses magical barriers."
        ],
        "tags": [
            "Spell",
            "light",
            "lightning",
            "attack",
            "heal",
            "on-hit",
            "cleanse",
            "decrease MR",
            "decrease CR",
            "field",
            "Lethality",
            "destruction",
            "restoration",
            "conditional",
            "modal",
            "no block",
            "empower"
        ]
    },
    {
        "type": "ability",
        "name": "Lifesteal Elegy",
        "clazz": "Demon Hunter",
        "branch": "Exorcism",
        "tier": 2,
        "action": "1 Major Action",
        "cost": "50 mana",
        "rng": "30 ft",
        "duration": "Instant",
        "description": [
            "You fire waves of magical energy to sap strength from demons. Choose one:",
            "Deal 10d8 lightning magic damage to all enemies in range. Your next attack is empowered to deal additional light magic damage equal to half the damage dealt by this spell. If this attack hits at least 5 enemies, it also inflicts 2 stacks of Paralysis.",
            "Deal 9d10 light magic damage to all enemies in range. Heal for half the damage dealt. If this attack hits at least 5 enemies, it also cleanses 3 conditions.",
            "Entities of demonic origin take double damage from this spell and count as 3 enemies each. You may cast this ability as a free action if you expend 2 Hunter stacks; if you do, this attack ignores MR, cannot be blocked, and bypasses magical barriers."
        ],
        "tags": [
            "Spell",
            "light",
            "lightning",
            "attack",
            "AOE",
            "square",
            "heal",
            "condition",
            "Paralysis",
            "destruction",
            "restoration",
            "cleanse",
            "conditional",
            "modal"
        ]
    },
    {
        "type": "ability",
        "name": "Hunter\u2019s Guile",
        "clazz": "Demon Hunter",
        "branch": "Humanity",
        "tier": 1,
        "action": "1 Reaction",
        "cost": "30 stamina",
        "rng": "Self",
        "duration": "Instant",
        "description": [
            "You work tirelessly to defend others. As a reaction to an attack on you or an ally, dash up to 30 ft in any direction, blocking all incoming damage and effects in the spaces you travel through (including your original position and your destination) until the end of the turn. If this ability is used to block an attack from an entity of demonic origin, it redirects attacks with doubled damage back at the attacker instead of blocking. After casting this ability, your next attack gains 20% increased damage, which can stack up to 5 times. When you cast this ability, you may expend 1 Hunter stack; if you do, extend the range of the dash to 50 ft."
        ],
        "tags": [
            "Dash",
            "block",
            "AOE",
            "conditional",
            "modal",
            "redirect",
            "empower"
        ]
    },
    {
        "type": "ability",
        "name": "Essence Scatter",
        "clazz": "Demon Hunter",
        "branch": "Humanity",
        "tier": 2,
        "action": "1 Reaction",
        "cost": "40 mana",
        "rng": "100 ft",
        "duration": "Instant",
        "description": [
            "You counter a demonic spell. As a reaction to a target in range casting a spell, you may counter that spell and mark that target until the end of your next turn. A target marked this way takes 50% increased damage from your damaging spells and has -20% CR against your condition-inflicting spells. If this spell is used to counter a spell that would summon a demon, your reaction refreshes. If this spell is used to counter a spell cast by an entity of demonic origin, you are refunded half this spell\u2019s mana cost."
        ],
        "tags": [
            "Spell",
            "light",
            "lightning",
            "counterspell",
            "defensive",
            "mark",
            "conditional"
        ]
    }
];

// organize things in case they're useful
for (let i = 0; i < components.length; i++) {
    let component = components[i];
    if (!('type' in component)) {
        log('component missing type ' + component.name);
        continue;
    }

    if (component.type === 'attribute') {
        attributes.push(component);
    } else if (component.type === 'ability') {
        abilities.push(component);
    } else if (component.type === 'race') {
        races.push(component);
    } else if (component.type === 'clazz') {
        clazzes.push(component);
    } else if (component.type === 'skill') {
        skills.push(component);
    } else if (component.type === 'buff') {
        buffs.push(component);
    } else if (component.type === 'condition') {
        conditions.push(component);
    } else {
        log('unknown component type ' + component.name);
    }
}


const skill_to_attribute_map = {
    "Armor Mastery Cloth": "RES", "Armor Mastery Heavy": "TGH", "Armor Mastery Light": "REF",
    "Armor Mastery Shields": "TGH", "Artistry Acting": "APL", "Artistry Dancing": "APL", "Artistry Illustration": "APL",
    "Artistry Literature": "APL", "Artistry Music": "APL", "Artistry Sculpture": "APL", "Athletics Balance": "DEX",
    "Athletics Climbing": "AGI", "Athletics Force": "STR", "Athletics Movement": "AGI",
    "Athletics Pain Tolerance": "COM", "Beast Mastery Riding": "AGI", "Beast Mastery Taming": "WIS",
    "Combat Blocking": "TGH", "Combat Dodging": "REF", "Combat Grappling": "AGI",
    "Crafting Armorsmithing": "TGH", "Crafting Artificing": "RES", "Crafting Cooking": "APL",
    "Crafting Enchanting": "RES", "Crafting Fine Weapons": "REF", "Crafting Forgery": "PRE",
    "Crafting Leatherworking": "REF", "Crafting Jewelry": "FRT", "Crafting Heavy Weapons": "TGH",
    "Crafting Poisons": "FRT", "Crafting Potions": "FRT", "Crafting Ranged Weapons": "REF",
    "Crafting Shortblades": "PRE", "Crafting Tailoring": "RES", "Element Mastery Air": "AGI",
    "Element Mastery Dark": "FRT", "Element Mastery Earth": "RES", "Element Mastery Fire": "ATN",
    "Element Mastery Ice": "FRT", "Element Mastery Lightning": "ATN", "Gathering Forestry": "TGH",
    "Gathering Harvest": "AGI", "Gathering Herbology": "RES", "Gathering Hunting": "REF", "Gathering Mining": "TGH",
    "Gathering Skinning": "REF", "Item Use Appraisal": "WIS", "Item Use First Aid": "FRT", "Item Use Literacy": "INT",
    "Item Use Ropes": "WIS", "Interaction Deception": "APL", "Interaction Intent": "WIS",
    "Interaction Intimidation": "COM", "Interaction Leadership": "COM", "Interaction Persuasion": "APL",
    "Interaction Seduction": "APL", "Knowledge Arcana": "INT", "Knowledge Culture": "INT", "Knowledge History": "INT",
    "Knowledge Nature": "INT", "Magic Buffs": "FCS", "Magic Conjuration": "FCS", "Magic Control": "ATN",
    "Magic Defensive": "RES", "Magic Destruction": "ATN", "Magic Enchantment": "FCS", "Magic Mana Channeling": "COM",
    "Magic Restoration": "ATN", "Magic Summoning": "FCS", "Magic Transmutation": "FCS", "Magic Utility": "ATN",
    "Observation Listen": "WIS", "Observation Search": "WIS", "Stealth Disguise": "PRE", "Stealth Lockpicking": "PRE",
    "Stealth Sneak": "PRE", "Stealth Steal": "PRE", "Transportation Land Vehicles": "AGI", "Weapon Mastery Axes": "STR",
    "Weapon Mastery Bows": "DEX", "Weapon Mastery Bullets": "DEX", "Weapon Mastery Crossbows": "DEX",
    "Weapon Mastery Fine": "DEX", "Weapon Mastery Heavy Thrown Weapons": "STR", "Weapon Mastery Longblades": "STR",
    "Weapon Mastery Shields": "STR", "Weapon Mastery Shortblades": "PRE",
};


// ####################################################################################################################
// Roll

class Roll {
    constructor(character) {
        this.character = character;
        this.damages = {};
        this.multipliers = {};
        this.effects = [];
        this.crit = false;
    }

    add_damage(value, type) {
        if (type in this.damages) {
            this.damages[type] = this.damages[type] + '+' + value;
        } else {
            this.damages[type] = value;
        }
    }

    // TODO need the origin?
    add_multiplier(value, type, source) {
        if (!(type in this.multipliers)) {
            this.multipliers[type] = {};
        }

        if (!(source in this.multipliers[type])) {
            this.multipliers[type][source] = '%s'.format(value);
        } else {
            this.multipliers[type][source] = '%s+%s'.format(this.multipliers[type][source], value);
        }
    }

    add_effect(effect) {
        this.effects.push(effect);
    }

    get_multiplier_string(type) {
        const self = this;
        let multiplier_string = '1';

        let per_source_multipliers = {};
        if (type in self.multipliers) {
            Object.keys(self.multipliers[type]).forEach(function (source) {
                if (!(source in per_source_multipliers)) {
                    per_source_multipliers[source] = [];
                }

                per_source_multipliers[source].push(self.multipliers[type][source]);
            });
        }
        if ('all' in self.multipliers) {
            Object.keys(self.multipliers['all']).forEach(function (source) {
                if (!(source in per_source_multipliers)) {
                    per_source_multipliers[source] = [];
                }

                per_source_multipliers[source].push(self.multipliers['all'][source]);
            });
        }

        Object.keys(per_source_multipliers).forEach(function (source) {
            const source_multipliers = '1+' + per_source_multipliers[source].join('+');
            multiplier_string = multiplier_string + '*(%s)'.format(source_multipliers);
        });

        return multiplier_string;
    }

    roll() {
        const self = this;
        const rolls = {};

        Object.keys(self.damages).forEach(function(type) {
            let dmg_str = '(%s)'.format(self.damages[type]);

            dmg_str = '%s*(%s)'.format(dmg_str, self.get_multiplier_string(type));

            if (self.crit) {
                // TODO use the proper crit damage modifier
                dmg_str = '(%s)*2'.format(dmg_str);
            }

            rolls[type] = 'round(%s)'.format(dmg_str);
        });

        return rolls;
    }
}


// ########################################################
// Items

const ITEM_SLOTS = [
    'main_hand',
    'offhand',
    'head',
    'body',
    'hands',
    'feet',
    'neck',
    'left_ring',
    'right_ring',
    'belt',
];

class Item {
    constructor(name, type, rarity, slot, equip_conditions, unique, range, price, cantrips, notes, effects) {
        this.name = name;
        this.type = type;
        this.rarity = rarity;
        this.slot = slot;
        this.equip_conditions = equip_conditions;
        this.unique = unique;
        this.range = range;
        this.price = price;
        this.cantrips = cantrips;
        this.notes = notes;
        this.effects = effects;
    }
}

class Effect {
    constructor(type, effect) {
        this.type = type;
        this.apply = effect;
    }
}

function skill_condition(skill, rank) {
    return function(character) {
        return character.has_skill_req(skill, rank);
    };
}

function stat_effect(stat, mod) {
    return new Effect('stat', function(stat_to_test) {
        return stat_to_test === stat ? mod : 0
    });
}

function roll_damage(dmg, type) {
    return new Effect('roll', function(roll) {
        roll.add_damage(dmg, type);
    });
}

function roll_multiplier(value, type) {
    return new Effect('roll', function(roll) {
        roll.add_multiplier(value, type, 'self');
    })
}

function crit_effect(effect) {
    return new Effect('roll', function(roll) {
        if (roll.crit) {
            roll.add_effect(effect);
        }
    });
}


const ITEMS = [
    new Item(
        'Longbow of Stunning',
        'longbow',
        'Magic',
        '2Hand',
        [
            skill_condition('Weapons: Bows', 'F'),
        ],
        false,
        200,
        0,
        [],
        '',
        [
            crit_effect('Stun'),
        ]
    ),

    new Item(
        'Longbow of Flames',
        'longbow',
        'Magic',
        '2Hand',
        [
            skill_condition('Weapons: Bows', 'F'),
        ],
        false,
        250,
        0,
        [],
        '',
        [
            roll_damage('3d10', 'fire'),
        ]
    ),

    new Item(
        'Leather Cap of Serenity',
        'armor',
        'Magic',
        'head',
        [
            skill_condition('Armor: Light', 'F'),
        ],
        false,
        0,
        0,
        [],
        '',
        [
            stat_effect('evasion', 5),
            stat_effect('health regeneration', 10),
        ]
    ),

    new Item(
        "Hunter's Longcoat of Resistance",
        'armor',
        'Magic',
        'body',
        [
            skill_condition('Armor: Light', 'F'),
        ],
        false,
        0,
        0,
        [],
        '',
        [
            stat_effect('evasion', 20),
            stat_effect('magic resist', 10),
        ]
    ),

    new Item(
        "Viper's Gloves of Dodging",
        'armor',
        'Magic',
        'hands',
        [
            skill_condition('Armor: Light', 'F'),
        ],
        false,
        0,
        0,
        [],
        '',
        [
            stat_effect('evasion', 15),
            stat_effect('condition resist', 10),
        ]
    ),

    new Item(
        'Leather Sandals of Slickness',
        'armor',
        'Magic',
        'feet',
        [
            skill_condition('Armor: Light', 'F'),
        ],
        false,
        0,
        0,
        [],
        '',
        [
            stat_effect('evasion', 15),
            stat_effect('stamina regeneration', 10),
            stat_effect('ac', -10),
        ]
    ),

    new Item(
        'Cleansing Brooch of Mana Storage',
        'accessory',
        'Magic',
        'neck',
        [],
        false,
        0,
        0,
        [
            'Expend 30 mana as Major action to cleanse 1 condition on yourself. 30 excess mana releases when you use the cantrip.'
        ],
        '',
        []
    ),

    new Item(
        'Ring of Archery',
        'accessory',
        'magic',
        'ring',
        [],
        false,
        0,
        0,
        [],
        '',
        [
            new Effect('roll', function(roll) {
                if (roll.character.is_using('longbow') || roll.character.is_using('crossbow')) {
                    roll.add_multiplier(0.5, 'physical', 'self');
                }
            })
        ]
    ),

    new Item(
        'Energetic Ring of the Mind',
        'accessory',
        'magic',
        'ring',
        [],
        false,
        0,
        0,
        [],
        '',
        [
            stat_effect('stamina', 30),
            stat_effect('mana', 40),
        ]
    ),

    new Item(
        'Invigorated Belt of Greater Stamina',
        'accessory',
        'magic',
        'belt',
        [
            skill_condition('Armor: Light', 'F'),
        ],
        false,
        0,
        0,
        [],
        '',
        [
            stat_effect('stamina', 60),
            stat_effect('stamina regeneration', 15),
        ]
    ),

    new Item(
        'Resistant Hat of Dodging',
        'armor',
        'magic',
        'head',
        [
            skill_condition('Armor: Light', 'F'),
        ],
        false,
        0,
        0,
        [],
        '',
        [
            stat_effect('evasion', 20),
            stat_effect('magic resist', 10),
            stat_effect('ac', -10),
        ]
    ),

    new Item(
        "Viper's Vest of Dodging",
        'armor',
        'magic',
        'body',
        [
            skill_condition('Armor: Light', 'F'),
        ],
        false,
        0,
        0,
        [],
        '',
        [
            stat_effect('evasion', 20),
            stat_effect('condition resist', 10),
            stat_effect('ac', -10),
        ]
    ),

    new Item(
        "Viper's Gloves of Evasion",
        'armor',
        'magic',
        'hand',
        [
            skill_condition('Armor: Light', 'F'),
        ],
        false,
        0,
        0,
        [],
        '',
        [
            stat_effect('evasion', 20),
            stat_effect('condition resist', 10),
            stat_effect('ac', -10),
        ]
    ),

    new Item(
        "Mage’s Amulet of Cleansing",
        'accessory',
        'magic',
        'neck',
        [],
        false,
        0,
        0,
        ['Expend 30 mana as a Major Action to clease 1 condition on yourself'],
        '',
        [
            stat_effect('mana', 40),
        ]
    ),

    new Item(
        'Ring of Slaying',
        'accessory',
        'magic',
        'ring',
        [],
        false,
        0,
        0,
        [],
        '',
        [
            roll_multiplier(0.3, 'physical')
        ]
    ),

    new Item(
        "Beast’s Health of the Worker",
        'accessory',
        'magic',
        'belt',
        [
            skill_condition('Armor: Light', 'F'),
        ],
        false,
        0,
        0,
        [],
        '',
        [
            stat_effect('health', 40),
            stat_effect('stamina', 40),
        ]
    ),

    new Item(
        "Angel’s Longbow of Accuracy",
        'longbow',
        'magic',
        'main_hand',
        [
            skill_condition('Weapons: Bows', 'F'),
        ],
        false,
        0,
        0,
        [],
        '',
        [
            new Effect('roll', function(roll) {
                roll.add_damage('4d10', 'light');
            }),
            new Effect('roll', function(roll) {
                roll.add_effect('20% accuracy');
            }),
        ]
    ),

    new Item(
        "Slaying Featherfall Sneakers of Speedy Evasion",
        'armor',
        'rare',
        'feet',
        [
            skill_condition('Armor: Light', 'F'),
        ],
        false,
        0,
        0,
        [],
        'You take no fall damage',
        [
            stat_effect('evasion', 20),
            stat_effect('movement speed', 20),
            stat_effect('ac', -10),
            stat_effect('health', 40),
            roll_multiplier(0.3, 'physical'),
        ]
    ),
];


// ####################################################################################################################
// Character

class Character {
    constructor(game_object, who) {
        this.id = game_object.id;  // roll20 id for the character
        this.who = who;            // who an API call originated from, used to respond under their name

        this.name = getAttrByName(this.id, 'character_name');
        this.owner = getAttrByName(this.id, 'owner');
        this.gender = getAttrByName(this.id, 'gender');
        this.age = getAttrByName(this.id, 'age');
        this.height = getAttrByName(this.id, 'height');
        this.weight = getAttrByName(this.id, 'weight');
        this.eye_color = getAttrByName(this.id, 'eyes');
        this.hair_color = getAttrByName(this.id, 'hair');
        this.alignment = getAttrByName(this.id, 'alignment');
        this.race = getAttrByName(this.id, 'race');
        this.languages = this.csv_to_array(getAttrByName(this.id, 'languages'));
        this.items = this.get_items();

        // Fetched lazily, aka when requested
        this.attributes = {};
        this.stats = {};
    }

    csv_to_array(list) {
        const items = [];
        list.split(',').forEach(i => items.push(i.trim()));
        return items;
    }

    get_item_names() {
        const item_names = [];

        for (let i = 0; i < ITEM_SLOTS.length; i++) {
            const slot = ITEM_SLOTS[i];
            const item_name = getAttrByName(this.id, slot);
            if (item_name !== '') {
                item_names.push(item_name);
            }
        }

        return item_names;
    }

    get_items() {
        const item_names = this.get_item_names();

        // find the actual item for each given name
        const character_items = [];

        _.each(item_names, function(item_name) {
            for (let i = 0; i < ITEMS.length; i++) {
                if (ITEMS[i].name === item_name) {
                    character_items.push(ITEMS[i]);
                    return;
                }
            }

            log('Error, could not find item with name ' + item_name);
        });

        return character_items;
    }

    get_attribute(attr_tla) {
        if (attr_tla in this.attributes) {
            return this.attributes[attr_tla];
        }

        const attr_value = parseInt(getAttrByName(this.id, attr_tla), 10);
        this.stats[attr_tla] = attr_value;
        return attr_value;
    }

    get_stat(stat_name) {
        if (stat_name in this.stats) {
            return this.stats[stat_name];
        }

        const stat = get_stat(stat_name);
        const attr_value = this.get_attribute(stat.attr_tla);
        let stat_value = stat.value(attr_value);

        _.each(this.items, function(item) {
            for (let i = 0; i < item.effects.length; i++) {
                if (item.effects[i].type === 'stat') {
                    stat_value += item.effects[i].apply(stat.name);
                }
            }
        });

        this.stats[stat] = stat_value;
        return stat_value;
    }

    has_skill_req(skill, rank) {
        return true;
    }

    is_using(weapon_type) {
        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            if ((item.slot === 'main_hand' || item.slot === '2Hand') && item.type === weapon_type) {
                return true;
            }
        }

        return false;
    }
}
