open_div = '            <div class="sheet-inventory-page">\n'
close_div = '            </div>\n\n'

header = """                <div class="sheet-row sheet-sub-header">
                    <div class="sheet-col-1-15 sheet-center sheet-small-label">Qty</div>
                    <div class="sheet-col-6-15 sheet-center sheet-small-label">Name</div>
                    <div class="sheet-col-7-15 sheet-center sheet-small-label">Description</div>
                    <div class="sheet-col-1-15 sheet-center sheet-small-label">Use</div>
                </div>

"""

section = """                <div class="sheet-inventory-row">
                    <div class="sheet-row sheet-grey-row">
                        <div class="sheet-col-1-15">
                            <input type="number" name="attr_inventoryqty%s" value="1" min="0" step="1">
                        </div>
                        <div class="sheet-col-6-15">
                            <input type="text" name="attr_inventoryname%s">
                        </div>
                        <div class="sheet-col-7-15">
                            <input type="text" name="attr_inventorydescription%s">
                        </div>
                        <div class="sheet-col-1-15 sheet-center">
                            <button class="sheet-skill-roll" type="roll" name="roll_item" value="!barbs create_effect $@{character_name}$ @{inventoryname%s};@{inventorydescription%s}"></button>
                        </div>
                    </div>
                </div>
"""


def main():
    html = ''
    for page_num in range(0, 8):
        html += open_div
        html += header

        for section_num in range(1, 11):
            index = page_num * 10 + section_num
            html += section % (index, index, index, index, index)

        html += close_div

    with open('../../data/inventory.html', 'w') as f:
        f.write(html)


if __name__ == '__main__':
    main()
