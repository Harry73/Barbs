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
   any reminders, and Apply buttons.
3. Anyone can click **Apply damage / healing / effect**. It applies to the clicker's targets, else the tokens that
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

The **effects panel** in the top right shows the selected token's effects (or your character's): green border for
buffs, red for conditions, remaining duration as a badge. Hover for details, left-click to edit, right-click to
remove. Effects that come from equipped items can't be removed there; unequip the item.

**Hands.** Physical abilities use the main-hand weapon: its scaling, its effects, and its type for checks like "your
next bow attack". With a weapon in each hand, physical weapon abilities get **Main / Off / Dual** buttons on the
Abilities tab. Dual wielding rolls the ability once with both weapons' effects applied, scaling from whichever weapon's
stat is higher, and weapon-type checks passing if either weapon matches (the Roll20 API's `dual_wield`). The Weapons
section gets a **Dual wield** button that attacks with each weapon, one card per weapon. Holding a shield in each hand
counts as dual wielding shields for the Sentinel's extra options, which only appear in dialogs when it's true.

There's no to-hit roll in Barbs; the defender dodges instead. Clicking **Apply damage** on a targeted attack rolls each
target's Evasion, once per hit, lowered by the attack's Accuracy and any "reduce evasion" affix; dodged hits deal
nothing. Areas, drains, and attacks that can't miss skip the roll, and shift-clicking Apply skips it for a GM ruling.
Then, if the target has a block, the attack's Unblockable Chance is rolled to see whether it applies. Lethality is
rolled per hit when the attack is made and called out on the card, and Lifesteal heals the attacker for a share of the
damage that actually lands, after defenses. Conditions work the same way: applying one rolls the target's Condition
Resist (lowered by the attack's "reduce CR", raised by CR against that condition) and skips it if they resist.

Attack cards that also inflict conditions have a combined **Apply** button: for each target, it applies the damage
(rolling Evasion), then, only if at least one hit landed, the card's conditions and on-hit statuses (each rolling
Condition Resist). A target who dodges gets nothing. The separate buttons are still there for one-off cases.

## Passives

Adding a character's first ability in a class also adds that class's passive (from the Classes compendium). Passives
show on the Abilities tab with whatever their automation tracks (`src/passives/catalog.ts`, keyed `"Class/Passive"`):

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
rotation 0 it faces down, and it turns with the token. Line spells from a caster with mirrors out are traced off them
(`src/rules/reflection.ts`): the front reflects with range reset, a Convex mirror's back splits the beam at ±45°, a
Plane mirror's back blocks, and a twice-redirected beam dispels the next mirror it hits. Each target remembers which
bounce hit it, so Alter Course (+50% per redirect) and Helix Beam (element flips per redirect) apply per target.

## Effects and roll modifiers

Every ActiveEffect has Barbs data (Barbs tab in the effect config):

- **Category**: buff (counts against Buff Limit, removed when Downed), condition (resistible), or other.
- **Single use**: deleted after the first roll it modifies (Assassin's Focus).
- **Block %**: the next attack applied to the bearer is reduced by this much (100 = fully blocked), then the effect is
  removed. Block abilities (Shields Up, Intercept, Rapid Shields) create one; cast them before the attack's damage is
  applied. Every hit of a multi-hit attack counts as that one attack; drains and DoT ticks aren't blocked.
- **Pulse**: damage the bearer deals to creatures within a radius at the start of each of their turns (Fiery Temper).
  The combat tracker posts it as a card already targeting everyone in range.
- **Roll modifiers**, applied when the effect's actor makes a matching roll: extra damage, damage multiplier %,
  crit chance, crit damage %, penetration, accuracy, lethality, lifesteal, unblockable chance, on-hit statuses (optionally with a chance: `stunned 25`, or a DoT amount: `burned:10 30`), a lasting on-hit AC shred (for as long as the effect granting it lasts, like Serrated Arrow's 1 minute), "this attack only" reductions to the target's AC, CR, or Evasion (equipment's reduce AC/CR/evasion: nothing is left on the target), stacking vulnerability, buff strip and forced movement reminders, converting a
  percent of physical damage into Bleed (Serrated Arrow), or a note. Each can be limited to a roll type (physical,
  magic, psychic, healing) and a weapon category ("bow attacks deal +2d8 air"), or to any ranged / any melee weapon,
  and marked "On crit". On-crit damage and multipliers apply to each hit that crits; the rest apply once if any hit
  crits.
- Damage formulas can use `@distance`: the distance in feet to each target, measured when damage is applied
  (Distance Shooter).

Multipliers are grouped by effect: modifiers from the same effect add, different effects multiply.

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

Granted and inflicted effects are **template** effects on the same item or actor (tick "Template" on the Barbs tab;
templates never apply by themselves), or inline in ability automation (`EffectSpec.triggers`). Trigger damage isn't
an attack (no Evasion, blocks, or on-hit reactions), and chains stop two levels deep. Each action posts its own
message with undo. Lightning Coil Cuirass, Accursed Armor, and Heart of Ice retaliate through triggers.

Stat buffs use the core Changes tab instead, in the "initial" phase. The Stats tab shows every one of these, laid out
like the Roll20 sheet's: core stats, then misc combat stats, multipliers, penetration, damage reduction, and condition
resistances. Use these for always-on gear affixes; use roll modifiers for conditional ones ("bow attacks", "on hit"). Its key field is a searchable picker over every key below
(`src/effects/change-keys.ts`): type any words from the label or group ("fire pen", "stun cr") and pick from the menu,
so you don't need to remember the paths. A full `system.` path plus Enter sets a key that isn't listed:

| Key | Meaning |
|---|---|
| `system.attributes.<attr>.bonus` | e.g. +5 STR |
| `system.stats.<stat>.bonus` | flat, e.g. +40 AC |
| `system.stats.<stat>.multiplier` | percent, e.g. +30 for "AC increased by 30%" |
| `system.elementResist.<element>` | extra MR % against one element |
| `system.damageReduction` | general damage reduction % |
| `system.vulnerability.<type\|magic\|all>` | percent increased damage taken (-100 = immune) |
| `system.conditionImmunity.<status>` | non-zero: can't be given that condition (Dragonblood) |
| `system.combat.<stat>` | accuracy, lethality, minion lethality, lifesteal, unblockable chance, crit damage, combo chance, minion damage, enchant effectiveness, concentration bonus, reach, range |
| `system.damageMultiplier.<type\|all\|allMagic\|healing>` | always-on increased damage % |
| `system.penetration.<type\|allMagic>` | always-on penetration % (`physical` is armor penetration) |
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
