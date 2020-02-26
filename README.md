# Barbs Character Sheet

Barbs is a custom tabletop RPG made by a friend of mine. This is a character sheet and set of API scripts for use
on Roll20.net for Barbs. The game itself, along with the sheet and API scripts are still a work in progress.

The sheet is reliant on the API. This is a frowned-upon practice, but many actions are far to complex, or impossible,
to implement directly in the character sheet. As a result, you will often see buttons in the character sheet simply
make an API call, assuming that the API call will do and show whatever is necessary.

## Notes

The `barbs_character_sheet` folder contains the HTML and CSS for the character sheet itself. There is also a mockup,
which shows the original design I was going for. The character sheet is based heavily on the DnD 5e character sheet,
so there are many similarities between the two.

The `scripts` folder contains JavaScript API scripts. `barbs.js` is the main script that handles API calls.
`components.js` holds many definitions of components from the rulebook - character races, stats, skills classes, etc.

The Barbs rulebook is a large, hand-typed document. Since this isn't conducive to a programmatic system, the `src`
folder holds a bunch of Python code that can parse the rulebook into a couple giant json blobs. `convert.py` is the
entry point for this code. It will read the rulebook from the `data/data.txt` and write the json blobs to other
files in the `data/` directory. One blob is the `skills_to_attribute` map, which is hardcoded into a sheet worker in
the character sheet. The other is simply a list of all components that make up the game. The resulting list is
hardcoded into the `components.js` API script, and is referenced in a few places in the API scripts.
