Ian's TODO list

* Don't add offhand weapon mods to auto-attacks with main hand, and vice versa
* Don't add offhand weapon to normal abilities, unless the "offhand" parameter is specified (or something of that nature)
* Condition resist rolls against specific conditions

* Item handling
    * Document constructing items in the api webpage
    * Add handling for buff/enchant effectiveness, even if it does nothing
    * Add handling for specific condition resists
    * Add handling for combo chance, even if it does nothing
    * Put all handlers for item construction into one giant dictionary and then process them by longest keys first.
      Should also help prevent accidental duplicate keys

* Figure out buff effectiveness from items automatically
* Do rolls for combo chance automatically
