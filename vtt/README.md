# Barbs for Foundry VTT

A Foundry VTT (v14) game system for Barbs, replacing the old Roll20 character sheet and API scripts.

The big change from Roll20: there's no server-side script doing the work. Actors know their own attributes, items, and
effects, and rolls are built on the client from that data. Buffs and conditions are ActiveEffects that live on the
actor, so they survive reloads (the Roll20 `persistent_effects` list was wiped on every API restart).

## Layout

```
src/                TypeScript sources, bundled by Vite into dist/barbs.mjs
  barbs.ts          Entry point: registers models, sheets, statuses, initiative, socket
  config.ts         Rules data: attributes, stat formulas, skill ranks, statuses, modifier kinds
  data/             TypeDataModels for actors, items, and ActiveEffects
  documents/        Actor document class (rolls, rests)
  abilities/        Ability automation: catalog.ts (per-ability entries), use.ts (executor)
  rolls/attack.ts   Attack/heal roll builder (the old Roll20 `Roll` object)
  rules/            Pure rules math (damage, crits, reduction, death) with no Foundry deps
  effects/apply.ts  Applying damage, healing, and effects to a target
  chat/card.ts      Ability/attack chat cards and their Apply buttons
  chat/undo.ts      Undo records on messages and reversing them
  passives/         Class passives: catalog.ts (per-passive automation), index.ts (granting, resources)
  summons.ts        Creating and dismissing summoned creatures (on the GM's client)
  socket.ts         Relays target-side and GM-only actions to the GM's client
  sheets/           Character, item, and effect config sheets (ApplicationV2 + Handlebars)
  fvtt-types.d.ts   Type-level registration with fvtt-types; keep in sync with barbs.ts
static/             Copied as-is into dist/: system.json, templates, styles, lang
scripts/
  build-packs.ts    ../rulebook/*.json -> dist/packs (compendiums)
  smoke.ts          Headless model checks against Foundry's own common/ code
  link-foundry.ts   Symlinks dist/ into Foundry's Data/systems/barbs
```

`../rulebook/*.json` stays the source of truth for skills, races, classes, abilities, buffs, and conditions. Nothing
is copied by hand; the pack builder and `config.ts` read it directly.

## Development

```sh
npm install
npm run build      # code + compendium packs into dist/
npm run link       # once: symlink dist/ to Foundry's systems/barbs
npm run watch      # rebuild code/templates on change (then F5 in Foundry)
npm run live       # live tests in a real Foundry client (see below)
npm run typecheck
npm run smoke      # model math + validates every compendium entry
npm run todo       # lists abilities and passives with no automation entry yet
```

Notes:

- Needs Node 22.18 or newer: the scripts are TypeScript run directly by `node`.
- Works on macOS, Windows, and Linux. `link`, `smoke`, and `todo` default to Foundry's standard install and data
  locations for the platform (`scripts/foundry-paths.ts`); set `FOUNDRY_APP` (the app's `resources/app` folder) or
  `FOUNDRY_DATA` (the folder containing `systems/`) if yours are elsewhere. On Windows, `link` makes a directory
  junction, which doesn't need admin rights.
- Foundry locks compendium databases while a world using them is open. Close the world (back to setup) before
  `npm run packs` / `npm run build`; the pack builder refuses to run if it finds a pack locked.
  `npm run build:code` and `watch` don't touch packs.
- Foundry doesn't version system asset URLs, so after CSS changes players may need a hard refresh
  (Cmd+Shift+R) to see them.
- Changes to `static/system.json` need a Foundry restart (or at least returning to setup) to be picked up.
- TypeScript is pinned to 6.x because that's what fvtt-types is tested against. fvtt-types for v14 is still a
  beta, so expect the odd `as never` cast where its types fight back.

## Rules modelled so far

Where the rulebook and the old Roll20 implementation disagree, the rulebook wins.

- 20 attributes (-10 to +20, default -10), with `bonus` buckets effects can add to.
- Derived stats from the rulebook formulas. Each is `(formula(attr) + bonus) * (1 + multiplier%)`, with
  multipliers summed rather than compounded (matching the Roll20 API).
- Effects target `system.attributes.<key>.bonus`, `system.stats.<key>.bonus`, `system.stats.<key>.multiplier`, or
  `system.initiativeBonus` in the "initial" phase.
- Level = attribute points above -10 + skill points + ability AP (ability AP = tier).
- Skills are items; the sheet shows only the skills a character owns. Check = d100 + 5/point + attribute.
- Initiative: `1d100 + @agi + @initiativeBonus`. A combat round is 10 seconds.
- Short rest regenerates resources by their regen %, long rest refills them.
- Death saves subtract d100 from Downed Health (Patch 1.3).
- The rulebook's buffs/conditions replace Foundry's default status effects in the token HUD.
- Using an ability pays simple `<n> <resource>` costs automatically and posts the ability card.

## Combat flow

1. Target tokens (T), then use an ability or weapon from the sheet.
2. The card shows per-type damage (hover a row for the dice and multipliers), the crit roll for physical attacks,
   any reminders, what it applies on hit, and an **Apply** button (plus separate ones for healing, shielding, and drains).
3. Anyone can click **Apply**. It applies to the clicker's targets, else the tokens that
   were targeted when the card was posted, else their selected tokens. If they don't own the target, the GM's
   client does it (a GM must be online).
4. Damage is reduced on the target: AC (flat, scaled by armor penetration), MR + per-element MR (percent, minus
   magic penetration), psychic unreduced, then general damage reduction. At 0 health the target is Downed and loses
   its buffs; further damage comes out of Downed Health.
5. Conditions roll the target's Condition Resist first. Shift-click the button to skip that roll.
6. Every Barbs message that changed something has an undo arrow in its top-right corner (visible to the GM and the
   affected actor's owners). Undoing strikes the message through and removes its buttons:
   - **Ability/attack cards**: refunds the resource cost, removes self-buffs it created, restores single-use buffs
     it consumed. Damage/effects already applied to targets have their own messages to undo.
   - **Damage/healing**: reverses the health change as a delta (later hits aren't lost) and restores statuses and
     buffs it added or removed.
   - **Applied effects**: deletes the effect and restores anything it replaced.

Click a damage row on a card to expand its dice. Healing someone who is Downed wakes them only if the healing
exceeds their missing Downed Health; otherwise they're stabilized and wake after 1d4 turns.

The character sheet's **Actions** tab (where it opens) is where you play from: everything the character can do, with
the buttons to do it. Initiative and rests; a Death Save while Downed; attacks with each held weapon (and Dual wield),
with the ammo you have loaded; passives' counters, states, and buttons; abilities grouped into Major, Minor, Reactions,
Free, and Longer (minutes) by the action they take, sorted by class and tier; and usable items with how many are left.
Each ability shows its cost (red when you can't pay it), range, and duration, warns when you're not holding the weapon
it's used with, and expands to its description. Click its icon or name to use it. The filter box narrows everything by
name, class, or tag. The Abilities and Inventory tabs are for adding, removing, and equipping.

The **effects panel** in the top right shows the selected token's effects (or your character's): green border for
buffs, red for conditions, remaining duration as a badge. Hover for details, left-click to edit, right-click to
remove. Effects that come from equipped items can't be removed there; unequip the item.

**Hands.** Physical abilities use the main-hand weapon: its scaling, its effects, and its type for checks like "your
next bow attack". With a weapon in each hand, physical weapon abilities get **Main / Off / Dual** buttons on the
Actions tab. Dual wielding rolls the ability once with both weapons' effects applied, scaling from whichever weapon's
stat is higher, and weapon-type checks passing if either weapon matches (the Roll20 API's `dual_wield`). The Weapons
section gets a **Dual wield** button that attacks with each weapon, one card per weapon. Holding a shield in each hand
counts as dual wielding shields for the Sentinel's extra options, which only appear in dialogs when it's true.

There's no to-hit roll in Barbs; the defender dodges instead. Clicking **Apply** on a targeted attack rolls each
target's Evasion, once per hit, lowered by the attack's Accuracy and any "reduce evasion" affix; dodged hits deal
nothing. Areas, drains, and attacks that can't miss skip the roll, and shift-clicking Apply skips it for a GM ruling.
Then, if the target has a block, the attack's Unblockable Chance is rolled to see whether it applies. Lethality is
rolled per hit when the attack is made and called out on the card, and Lifesteal heals the attacker for a share of the
damage that actually lands, after defenses. Conditions work the same way: applying one rolls the target's Condition
Resist (lowered by the attack's "reduce CR", raised by CR against that condition) and skips it if they resist.

A card has one **Apply** button: for each target, it applies the damage (rolling Evasion), then, only if at least one
hit landed, everything the card inflicts: its conditions and buffs, passives' extra effects, and on-hit statuses (each
condition rolling Condition Resist). A target who dodges gets nothing. A card with no damage applies its effects to
every target. Shift-click skips the Evasion and Condition Resist rolls. Effects meant for one side (Buffeting Storm's
ally buff and enemy slow) go only to that side, by token disposition. "Half damage to the enemy behind" attacks
(Piercing Blow, Dual Shield Strike) scale by target order: target the main enemy first. Old cards' separate damage,
half, and effect buttons all do what Apply does now.

## Passives

Adding a character's first ability in a class also adds that class's passive (from the Classes compendium). Passives
are listed on the Abilities tab, and their controls are on the Actions tab, with whatever their automation tracks (`src/passives/catalog.ts`, keyed `"Class/Passive"`):

- **Resources** (Spotting, Ki, Hunter stacks, banked Healing Mana) with +/- controls; some gain each turn or reset at the
  end of combat or on a long rest. Ability dialogs can spend them (`choice.resource`), and costs can be paid in them.
- **States** (Thief stance, Aquamancer tide, Vastwood Sovereignty) that ability dialogs default to, and that can
  carry effects (Run Stance's +20 speed).
- **Actions** (Spot target, Psionic autoattack, spend a Hunter stack to heal).
- **Hooks** into rolls (Warleader, Assassinate, Spotter, Stress Headache), ability dialogs (Winds of War, Frostbite),
  after-use reactions (Ritual Dagger, Guiding Light), and extra card buttons (Reduce to Ashes).
- **Monk mastery**: each monk passive raises dU (d4 → d6 → ... → d20) and base combo chance; abilities tagged "combo"
  roll combo on their card.

## Summons

Summoning abilities create an NPC actor with the creature's stat block (fixed stats in the Stats tab), owned by the
caster's owners, with tokens placed next to the caster. Its actions are abilities on its sheet. It's created on the
GM's client (a GM must be online), carries a "Summoned" duration effect, and is removed when that expires or when the
summoning card is undone.

Mirror Mage mirrors are summons too, flagged as mirrors. A mirror's reflecting surface is its token's width; at
rotation 0 it faces right, and it turns with the token. Line spells from a caster with mirrors out are traced off them
(`src/rules/reflection.ts`): the front reflects with range reset, a Convex mirror's back splits the beam at ±45°, a
Plane mirror's back blocks, and a twice-redirected beam dispels the next mirror it hits. A beam that's redirected posts
a card per redirect ("Direct", "Redirect 1", ...), each a hit of its own on the creatures along that stretch, with its
numbers recalculated for that bounce: Alter Course's +50% per redirect, Helix Beam's element flip, and its condition
chance. A creature the beam crosses on the way out and on the way back is on two cards and is hit twice. Each card's
Apply uses its own targets, not whoever is targeted now; only the first carries the cast's cost and undo.

Scatter Shards fires three separately aimed shards (`shots` in the automation, `aimShots` in `src/abilities/area.ts`).
Each is aimed from the caster, reflects off mirrors like a beam, and hits the first creature in its path. If that's an
enemy, you aim its one bounce off them, with the range left on that stretch (so a Plane Mirror's range reset carries
over), and it hits the first creature along the bounce. Each shard rolls its own damage and posts its own card with its
path ("Goblin → Orc (redirect 1, +50%)"); Apply goes along the path in order and stops at the first creature it doesn't
hit, so a dodged shard never bounces. Right-click skips a bounce or the remaining shards.

## Effects and roll modifiers

Gear's affixes live on the item's main effect: **Edit bonuses** on an equipment sheet opens it (creating it, named
after the item, the first time). The item sheet lists what its effects do in plain English ("AC +5", "Damage
multiplier 20% physical, physical rolls", "You hit: restore 5 stamina", with a granted template's bonuses under its
trigger), with the full effect list collapsed below for extra effects and templates (`src/effects/bonuses.ts`).

Every ActiveEffect has Barbs data, set up on the Barbs tab (the first tab of the effect config, with settings in one
row, explanations on hover, and collapsible Bonuses and Triggers sections):

- **Category**: buff (counts against Buff Limit, removed when Downed), condition (resistible), or other.
- **Single use**: deleted after the first roll it modifies (Assassin's Focus).
- **Pulse**: damage the bearer deals to creatures within a radius at the start of each of their turns (Fiery Temper).
  The combat tracker posts it as a card already targeting everyone in range.
- **Bonuses**: one list of everything the effect gives, each row picked from a searchable list.
  - **Stat bonuses** (attributes, AC, Evasion, MR, CR, resists, vulnerability, immunities, skill bonuses, initiative,
    buff/enchant effectiveness, minion bonuses, concentration, Downed Health) are always on while the effect is
    active. They're stored as "stat" rows and become ordinary core changes when the effect is prepared.
  - **Attack bonuses** (extra damage, multipliers, penetration, crit chance/damage, accuracy, lethality, lifesteal,
    unblockable, combo chance, damage conversion, can't miss), **on-hit** bonuses (statuses with an optional chance:
    `stunned 25`, or a DoT amount: `burned:10 30`; a lasting AC shred; "this attack only" AC/CR/Evasion reductions;
    stacking vulnerability; Bleed conversion; buff strip and forced movement reminders), and **defense** bonuses
    (incoming damage, AC, Evasion, CR) are roll modifiers. Where they apply comes from where the effect lives: on a
    weapon, attacks with that weapon (and spells while it's held); anywhere else, every attack. Roll type, weapon
    category (or any ranged / melee), "On crit", and Conditions narrow them. On-crit damage and multipliers apply to
    each hit that crits; the rest apply once if any hit crits.
  - **Block the next attack (%)**: the next attack applied to the bearer is reduced by this much (100 = fully
    blocked), then the effect is removed. Block abilities (Shields Up, Intercept, Rapid Shields) create one; cast them
    before the attack's damage is applied. Every hit of a multi-hit attack counts as that one attack; drains and DoT
    ticks aren't blocked.
  - **Damage over time**: a formula and damage type the bearer takes at the start of each of their turns, bypassing
    AC and MR (Bleed, Burn, Poison).
- Damage formulas can use `@distance`: the distance in feet to each target, measured when damage is applied
  (Distance Shooter).

**Damage multipliers are grouped by the character they come from**, as in Roll20: everything from one character adds,
and different characters' multiply, which rewards teamwork. Your passives, your gear, and buffs you cast on yourself
share your pool (+25% from a passive and +25% from a ring is +50%, and five stacks of a +10% buff is +50%). An ally's
buff on you, or an enemy's Weaken, is that character's pool and multiplies with yours. An effect with no caster
(made by hand) counts as yours. Target-dependent ones ("double damage to demons") join their pool when damage is
applied. The Stats tab shows what you bring on your own and doesn't model other characters' pools.

**Conditions** (`src/rules/predicate.ts`, modeled on PF2e's predicates) limit a roll modifier to situations: a text
field where commas mean "and", `|` "or", `!` "not", and numbers compare. They're tested against "roll options",
plain facts about the situation (`src/rules/roll-options.ts`):

- the roll: `roll:physical`, `weapon:bow`, `weapon:ranged`, `ranged`/`melee`, `hand:dual`, `ability:tag:spell`,
  `ability:class:sniper`, `area`, `in-combat`
- the roller (`self:`) and each target (`target:`): `type:demon`, `status:prone`, `effect:rage`, `health:percent`,
  `buffs`, `level`; plus `target:mark:<name>` for effects the roller put on the target, and `target:distance`

Modifiers whose conditions mention the target are worked out per target when damage is applied ("double damage to
demons" is a 100% multiplier with `target:type:demon`). Abilities can declare the same through `AttackSpec.conditional`.

**Incoming** modifier types (damage taken, AC, AC %, Evasion, CR) sit on a defender's effects and change attacks
against them. Their conditions see the attack as `attack:…`, the attacker as `attacker:…` (including
`attacker:distance`), and `origin:attacker` when the effect came from the attacker ("from your spells"). Unyielding
Hunter (`attack:ranged`), Heart of Ice (`attacker:distance > 30`), and Essence Scatter's mark use them.

Creature types are a comma-separated field on every actor (Characteristics), read as `target:type:<type>`.

**Formula values** (`src/rules/formula.ts`): any number on a modifier or change can be a formula, like
`20 * @self.buffs`, `50 * @target.marks.pursued`, or `2d10 * @target.statuses.cursed`. `@self`, `@target`, and (for
incoming modifiers) `@attacker` carry `buffs`, `conditions`, `level`, `health.value/max/percent/missingPercent`, and
counts by id: `statuses.<id>`, `stacks.<effect>`, `marks.<effect or status>` (effects the roller put on them), and
`types.<type>`. Anything that reads `@target` (or `@distance`) is worked out per target when damage is applied. Changes
get `@self` through `BarbsActiveEffect`, which also evaluates the arithmetic core leaves as text for derived values.

**Triggers** (`src/triggers/index.ts`): effects can react to events, as "when → if → do" rows on the Barbs tab.

- When: you hit (each landed hit), you attack, you're attacked, you're hit (each landed hit), you take damage, you
  down an enemy, start/end of your turn, combat starts/ends.
- If: conditions (attacker-side events see the attack and `target:`; "you're attacked/hit/damaged" see the
  defender's view: `attack:`, `attacker:`, `attacker:distance`, `origin:attacker`), an optional % chance, and an
  optional once-per-turn/round limit.
- Do: restore health/stamina/mana to yourself, grant yourself an effect, inflict an effect on the other creature
  (rolling CR if it's a condition), damage the other creature, or post a reminder. Values are formulas with `@self`,
  `@other` (also `@target` / `@attacker` by role), and `@hit.damage` on hits.

Granted and inflicted effects are **template** effects on the same item or actor (templates never apply by
themselves), or inline in ability automation (`EffectSpec.triggers`). The easy way to make one is the edit button in a
Grant/Inflict trigger's Effect column: it creates the template next to the effect (or opens it, if it exists) and
links the trigger to it. A template's config says which effects grant it and has no Triggers section, item sheets
list templates under the effect that grants them, and renaming a template updates the triggers that name it
(`src/effects/templates.ts`). Trigger damage isn't
an attack (no Evasion, blocks, or on-hit reactions), and chains stop two levels deep. Triggers about your own attacks
(you attack, you hit, you down someone) follow the same scope as bonuses: on a weapon, only that weapon's attacks
(and spells while it's held); on ammunition, the shots it's fired with; anywhere else, everything. Each action posts its own
message with undo. Lightning Coil Cuirass, Accursed Armor, and Heart of Ice retaliate through triggers.

**Action buttons**: an effect's Actions section lists things it lets you do while you have it, shown as buttons on the
Actions tab under the action they take (Major, Minor, Reaction, Free). Like PF2e's stances, nothing is added to the
character: the tab lists the buttons of whatever is active, so they come and go with the effect. Underneath they're
trigger rows with the "You use it" event, a label, and an action type; rows with the same label are one button, run
in order ("spend 20 mana", then "grant Block"). A button shows while any of its rows' conditions hold, and "spend"
stops the rest when you can't afford it (`src/triggers/actions.ts`). Inflict and damage rows act on your one
targeted creature, and "grant to your target" gives a block or buff to whoever you've targeted, or yourself with no
one targeted. Other trigger actions that came with them work in ordinary triggers too: spend a resource, extend this
effect by N rounds (for an effect held by concentration, everything that concentration holds, through the GM), and
end the concentration this effect belongs to. Free reactions are listed with reactions.

**Stacks on one effect**: an effect can count stacks instead of being copied (`flags.barbs.stacks`). The "Add a
stack" action raises it (Value: how many; Type: the most it can have), the effect's own formulas read it as
`@effect.stacks`, `@self.stacks.<name>` counts it, and the effects panel shows it as ×N.

Abilities with buttons (`action()` in `src/abilities/helpers.ts`): Analytical Shooter (one buff; "Keep aiming" while
concentrating adds a stack worth +10% crit chance / +25% crit damage, capped at 100% / 200%, and attacking ends the
concentration), Impenetrable Mist (spend 20 mana to block, while concentrating), Ice Block (block once), Grand
Guardian (block once per round, twice if you were dual wielding shields when you cast it), Hold Person (spend 10 mana
to extend the Stun a round), Buffeting Storm (spend 5 mana to push), and the Arcane Archer buffs' "sacrifice" options
(Broadhead, Serrated, and Bruiser Arrow turn into their single-use version; Elusive, Persistent, and Unyielding Hunter
post the dash, cleanse, or prevented strip), Drag To Hell (a reaction pull while the chain lasts), and zones with
extra actions: a zone's `actions` are buttons on the caster's "Zone: <ability>" effect, so Whirlpool can be moved with
a Major Action and Banishing Bolt's field (now a real zone: -20% MR and CR for enemies inside) can be expended as a free
action, which removes it.

"You would take damage" triggers run after defenses and before health changes, and can change the damage: reduce it
by a percent, survive at N health (Critical Condition), redirect a percent of the incoming attack to whoever applied
the effect (Long Live The King), or reflect a percent back at the attacker (Self Defense Turret). Their conditions can
use `incoming:lethal` and `attacked`, and values `@incoming.damage`. Any trigger can be limited to firing only once,
or set to use up its effect when it fires.

A trigger can also require a skill check: its Check field, like `Armor Mastery: Shields vs @level / 2`, rolls that
check for the bearer (untrained skills roll with no rank) and only goes on if it meets the DC. Effects can be set to
**end with combat**, removed when the combat they were gained in ends.

**Concentration** (`src/concentration.ts`): abilities tagged "concentration" ask "Concentrate on it" (ticked by
default). Concentrating puts a "Concentrating: <ability>" effect on the caster (warning if that's over their
Concentration Limit); when the cast puts exactly one effect on the caster, that effect is the Concentrating effect
instead, so ending it ends the concentration. Everything the cast creates is linked to it: effects on the caster, effects applied from the
card to targets, and summons. Deleting the Concentrating effect, by hand, by undoing the cast, by failing a
concentration check, or by being Downed, ends all of them. When a concentrating creature takes damage, its
concentration check is rolled automatically (DC twice the damage; Pain Tolerance if they have it, otherwise d100 +
Focus, plus Concentration Bonus), and a failure drops all of it. Recasting an ability you're already concentrating on continues the same concentration.

**Zones** (`src/zones.ts`): an ability whose area has a `zone` leaves it on the map as a Region with a "Barbs zone"
behavior, which reacts when tokens enter, leave, or start/end their turn inside: damage (rolled like one of the
caster's spells), an effect (CR roll for conditions; "while inside" effects come off on leaving), and reminders. A
zone can also be difficult terrain, through core's movement cost behavior. It lasts as long as a "Zone: <ability>"
effect on the caster (the ability's duration, a zone's own duration, or the caster's concentration), and deleting
that effect, or undoing the cast, removes the region. Whirlpool, Tidal Wave, Fog, Smokescreen, and Nothing Sacred
use zones. (The "zone" behavior type is declared in `system.json`, so adding it needed a Foundry restart.)

**Usable items**: tick Usable on an equipment item to give it a Use button in the inventory. Using it heals and/or
restores stamina or mana, applies the item's Template effects to the user or the targeted creatures (conditions roll
CR), posts its note, and uses one up, through the same pipeline as an ability (a card, Apply buttons, undo). Items
ticked **Ammunition** apply their effects only to ranged physical attacks while equipped, and each hit of a ranged
attack uses one of the first equipped ammo with any left (given back on undo).

Stat bonuses end up as core changes in the "initial" phase; the core Changes tab is still there for raw edits, with
the same searchable key picker (`src/effects/change-keys.ts`). The Stats tab shows all of it, laid out like the Roll20
sheet's: core stats, then misc stats, multipliers, penetration, damage reduction, and condition resistances (attack
bonuses that apply to every attack count toward their rows). The stat keys: A full `system.` path plus Enter sets a key that isn't listed:

| Key | Meaning |
|---|---|
| `system.attributes.<attr>.bonus` | e.g. +5 STR |
| `system.stats.<stat>.bonus` | flat, e.g. +40 AC |
| `system.stats.<stat>.multiplier` | percent, e.g. +30 for "AC increased by 30%" |
| `system.elementResist.<element>` | extra MR % against one element |
| `system.damageReduction` | general damage reduction % |
| `system.vulnerability.<type\|magic\|all>` | percent increased damage taken (-100 = immune) |
| `system.conditionImmunity.<status>` | non-zero: can't be given that condition (Dragonblood) |
| `system.combat.<stat>` | minion damage, minion lethality, enchant effectiveness, concentration bonus, reach, range |
| `system.conditionResistBonus.<status>` | extra CR % against one condition |
| `system.skillBonuses.<skill>` | bonus to one skill's checks |
| `system.downedBonus` | extra Downed Health |
| `system.initiativeBonus` | added to initiative |

Weapons carry their blueprint's implicit crit chance and crit modifier (default 100%, i.e. crits double damage).
Effects on equipment apply to the owner only while the item is equipped. Roll modifiers on a weapon's effects are
that weapon's mods: they apply to physical attacks made with that weapon, and to non-physical rolls (spells) while
it's held. Effects on other gear (armor, rings) apply to every roll. Durations from the rulebook follow the
Roll20 convention: "1 minute" lasts until the end of the caster's turn 5 rounds later, and Foundry removes expired
effects automatically as combat advances.

## Automating an ability

Entries live in `src/abilities/classes/*.ts`, keyed `"Class/Ability"` exactly as in `rulebook/abilities.json`. They're
looked up by name when the ability is used, so characters that already own an ability pick up changes. The pieces
(all optional; see `src/abilities/types.ts`):

| Field | What it does |
|---|---|
| `choices` | Questions asked in a dialog before use (modes, extra mana, rituals, "Hit Stance?"). Cancel = no use. |
| `rolls` | Rolled once up front for random effects or hit counts (`{ effect: "1d100" }` → `ctx.rolls.effect`). |
| `cost` | Overrides the rulebook cost when it varies; may be several resources (Psion). |
| `area` | Place a square/circle/cone/line (or the whole battlefield) and target who's inside. Lines and cones aim from the caster; targets are ordered by distance, so the first in a line is `index 0`. |
| `attack` | Damage roll: dice and types (`dU` for monks), crit options, `hits`, `increase`, `ignoreAC`/`ignoreMR`, `trueDamage`, `targetScale`, distance `tiers`, `lifesteal`, `combo`. |
| `heal` | Healing roll; `self: true` heals the caster immediately. |
| `restore` / `gain` | Creature resources / passive resources (Ki) the caster recovers. |
| `shielding` | Temporary health for targets (button) or the caster (`self`). Doesn't stack: the larger value stays. |
| `drain` | Stamina/mana taken from targets and given to the caster. |
| `summon` / `summonActions` | A creature's stat block, and automation for its actions. |
| `self` / `target` | Effects for the caster (applied now) and for targets (Apply buttons on the card). |
| `notes` / `summarize` | Reminders for what isn't automated, and notes computed from the roll. |

Any field can be a function of the use context (`ctx`): `ctx.choices`, `ctx.targets` (actors targeted), `ctx.buffs`
(the caster's buff count), `ctx.rolls`, `ctx.result` (after the roll), and `ctx.scale()` / `ctx.dice()` for buff
effectiveness. Buff effectiveness comes from `system.buffEffectiveness` on the caster (e.g. gear with a +25 change);
each buff decides what scales (dice counts round down):

```ts
"Assassin/Focus": {
    self: (ctx) => [
        { category: "buff", singleUse: true, modifiers: [{ type: "critChance", rollType: "physical", value: ctx.scale(30) }] },
    ],
},
"Pyromancer/Fireball": {
    choices: [count("extra", "Extra damage dice (+5 mana each)")],
    cost: (ctx) => ({ resource: "mana", amount: 25 + 5 * Number(ctx.choices.extra) }),
    area: square(35),
    attack: (ctx) => spell(`${5 + Number(ctx.choices.extra)}d12`, "fire"),
},
```

Effect specs support rulebook durations ("1 minute"), turn-relative ones ("end of target's next turn", anchored to
that combatant), `maxStacks`, `cleanse`, start-of-turn damage (`dot`, which bypasses AC/MR), distance filters
(`within`/`beyond` the caster), and per-target `resolve`. Roll modifiers can also `convert` damage to another type
(Bow of Hurricanes) or add combo chance, and `system.skillBonus` adds to every skill check. Helpers in `src/abilities/helpers.ts` (`spell`, `strike`, `square`, `cone`, `line`, `around`, `status`,
`weaken`, `bleed`, `burn`, `stat`, `statPercent`, `vulnerable`, ...) keep entries close to the ability text.

`npm run smoke` resolves every entry under each of its choices and validates the effect data it produces.

Defender-side buckets added for these: `system.vulnerability.<type|magic|all>` (percent increased damage taken,
applied after AC/MR and before GDR) and `system.buffEffectiveness`.

## Live tests

`npm run live [filter]` runs `scripts/live/tests.js` inside a real Foundry client: it starts a headless Chrome with a
throwaway profile (`scripts/live/cdp.ts`, Chrome DevTools Protocol over Node's built-in WebSocket), joins the running
world as its GM (`FOUNDRY_USER`, `FOUNDRY_PASSWORD`, `FOUNDRY_URL` to override), and runs the tests there. It covers
what the smoke test can't: chat cards, their Apply buttons, sockets, the canvas. Each test gets a scratch scene with a
caster and two enemies with no defenses (so damage is exact), learns abilities from the compendium, casts them with the
dialog answered for it (`withChoices`), clicks card buttons, and checks health and effects. Aiming is driven by stubbing
`canvas.regions.placeRegion` to point at chosen tokens. Scenes and actors the tests make are deleted afterwards; their
chat messages are kept, to look at. Since `dist` is linked into Foundry, the page always runs the current build.
