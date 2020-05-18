# Barbs Character Sheet

Barbs is a custom tabletop RPG made by a friend of mine. This is a character sheet and set of API scripts for use
on Roll20.net for Barbs. The game itself, along with the sheet and API scripts are still a work in progress.

The sheet is reliant on the API. This is a frowned-upon practice, but many actions are far to complex, or impossible,
to implement directly in the character sheet. As a result, you will often see buttons in the character sheet simply
make an API call, assuming that the API call will do and show whatever is necessary.

## Notes

The `barbs_character_sheet` folder contains everything for the Roll20 sheet. It contains the HTML and CSS for the
character shee itself. There is also a mockup, which shows the original design I was going for. The character sheet
is based heavily on the DnD 5e character sheet, so there are many similarities between the two.

The JavaScript API scripts are also in this folder. `barbs.js` is the main script that handles API calls.
`components.js` holds many definitions of components from the rulebook - character races, stats, skills classes, etc.

# Barbs Rulebook

## Original rulebook parsing

The Barbs rulebook is a large, hand-typed document. Since this isn't conducive to a programmatic system, the
`src/parsing/` folder holds a bunch of Python code that can parse the rulebook into objects. `parse.py` is the entry
point for this code. The rulebook is read from `data/data.txt`, which is normally a copy-pasted version of the real
rulebook. This script generates a few things:

* `data/skills_to_attribute.json` - A mapping of skills to scaling attributes. This tells us what attribute to add to a
   skill check. This is copied and hardcoded into a sheet worker in the character sheet.
* `data/skills.txt` - JS code for an enum of the skills. This is copied and hardcoded into the`components.js` API
   script.
* `data/components.json` - A json blob of all components in the game. This is copied and hardcoded into
   the `components.js` API script.
* `rulebook/` - This directory contains all the same components from `data/components.json`. Here, however, we have a
  file per component type, rather than one massive blob for all. This is the source information for the website.

## Website

The doc we currently use for the Barbs rulebook is slow to load and formatting is inconsistent. In an attempt to
rectify that, I created a website for the rulebook. The files in `rulebook/` are the source information for the website.
The page itself is based on a collection of templates in `html/templates/`. Sections of the rulebook webpage are filled
in based on the data in the `rulebook/` files, with formatting defined by the various templates.

`website.py` is a script to assist in managing the rulebook website. It presents users with a simple UI with four
buttons. Their usages are described below:

* "Validate rulebook" - goes through the `rulebook/` files and performs checks
* "Generate rulebook website HTML" - reads the `rulebook/` and `html/templates/` files and builds the HTML page for the
  rulebook website.
* "View local" - opens the generated rulebook HTML so that the user can inspect it locally before updating the
  actual server.
* "Update website" - copies the generated rulebook HTML to the server running the website and restarts the server.

There is a hope that the files in `rulebook/` will one day become the source of truth for the Barbs rulebook, rather
than the doc we currently use. The current pattern of things is to copy the doc into `data/data.txt`, run `parse.py`,
run `website.py`, and use the GUI to update and deploy the rulebook website. If we trust the `rulebook/` files, we can
drop the `data.txt` and parsing steps.

## Generate website.exe

``` bash
pyinstaller --onefile website.pyw --windowed
```
