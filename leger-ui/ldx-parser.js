/**
 * Parse LGS string into objects.
 * @param {string} lgs - lgs string to be parsed
 * @returns {object}
 */

function ldxParser(lgs) {
    const tagRegex = /<([a-zA-Z0-9_-]+) *(.*) *>/;
    const closingTagRegex = /<\/([a-zA-Z0-9_-]+)>/;
    const selfClosingTagRegex = /<([a-zA-Z0-9_-]+) *(.*) *\/>/;
    const parsed = [];

    const Actions = {
        FindTag: 0,
        GetTag: 1,
        GetAttributes: 2,
        GetContents: 3,
    }

    let currentAction = Actions.GetTag;
    let buffer = "";
    let currentElement = {};
    let depth = 0;
    lgs.split("").forEach(c => {
        buffer += c;
        switch(currentAction) {
            case Actions.GetTag :
                parseSelfClosingTag();
                parseTag();
                break;
            case Actions.GetContents:
                parseContents();
                break;
            default:
                break;
        }
    });

    function parseTag() {
        let match = buffer.match(tagRegex);
        if (!match) return;
        currentElement.tagName = match[1];
        currentElement.attributes = parseAttributes(match[2]);
        currentAction = Actions.GetContents;
        currentElement.contents = "";
        buffer = "";
    }
    function parseSelfClosingTag() {
        let match = buffer.match(selfClosingTagRegex);
        if (!match) return;
        currentElement.tagName = match[1];
        currentElement.attributes = parseAttributes(match[2]);
        parsed.push(structuredClone(currentElement));
        currentAction = Actions.GetTag;
        buffer = "";
        currentElement = {};
    }
    function parseContents() {
        let match = buffer.match(closingTagRegex);

        if (!match) {
            match = buffer.match(tagRegex);
            if (!match) return;
            if (match[1] == currentElement.tagName) depth++;
            currentElement.contents += buffer;
            buffer = "";
            return;
        }
        if (!currentElement.contents) currentElement.contents = "";
        if (match[1] != currentElement.tagName) {
            currentElement.contents += buffer;
            buffer = "";
        } else if (depth > 0) {
            depth--;
            currentElement.contents += buffer;
            buffer = "";
        } else {
            currentElement.contents += buffer.replace(closingTagRegex, "");
            
            let contents;
            if (
                currentElement.tagName != "num" && currentElement.tagName != "str" &&
                currentElement.tagName != "bool" && currentElement.tagName != "func" &&
                currentElement.tagName != "style" && currentElement.contents
            ) contents = ldxParser(currentElement.contents);
            
            if (contents && contents.length > 0) currentElement.contents = contents;
            
            parsed.push(structuredClone(currentElement));
            currentAction = Actions.GetTag;
            buffer = "";
            currentElement = {};
        }
    }
    function parseAttributes(str) {
        if (!str) return;
        const attributes = {};
        let attribute = str.match(/([0-9a-zA-Z_-]+)=\"([^"]*)\"/);
        while (attribute) {
            let value = attribute[2];
            if (value.match(/^[0-9]+$/)) value = parseFloat(value);
            attributes[attribute[1]] = value;
            str = str.replace(attribute[0], "");
            attribute = str.match(/([0-9a-zA-Z_-]+)=\"([^"]*)\"/);
        }
        return attributes;
    }
    return parsed;
}

module.exports = { ldxParser };