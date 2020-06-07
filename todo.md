Ian's TODO list

* Check that hidden stats that we roll a d100 for won't try to use a negative cs
* Un-over-engineer crits. Just do a d100, and put the crit chance in the text output, i.e.:
    Crit (40% chance): <d100 result>
* Put an optional button in rolls. This can open the door for some cool things
    * button in list effects response, that lets you select one from the list and remove it
    * button on that ability where you have to select which rolls to keep

* Item handling
    * Make decent classifications for item affixes
        Damage, damage multiplier, stat bonus, initiative bonus, concentration bonus, skill bonus
        chance to inflict condition, crit damage mod, on crit damage, on crit multiplier,
        uncategorized effect, uncategorized on crit effect. What about other hidden stats?
        What about condition resists? What about buff/enchant efficiency?
    * Make back-end processing for turning some json structure into a JS item.
    * Make front-end UI for creating an item.
    * Join the two, make some way to print out the item in human format and the item in API-JS format.

* Figure out buff effectiveness from items automatically
* Do rolls for combo chance automatically
