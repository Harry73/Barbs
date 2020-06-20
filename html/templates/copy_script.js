function copy_ability(element_id) {
    const element = document.getElementById(element_id);
    element.style.display = 'table';
    console.log(element);

    let body = document.body, range, sel;
    if (document.createRange && window.getSelection) {
        range = document.createRange();
        sel = window.getSelection();
        sel.removeAllRanges();
        try {
            range.selectNodeContents(element);
            sel.addRange(range);
            document.execCommand('copy');
        } catch (e) {
            range.selectNode(element);
            sel.addRange(range);
            document.execCommand('copy');
        }
    } else if (body.createTextRange) {
        range = body.createTextRange();
        range.moveToElementText(element);
        range.select();
        document.execCommand('copy');
    }

    element.style.display = 'none';
}