/**
 * Parse LGS string into objects.
 * @param {string} lgs - lgs string to be parsed
 * @returns {object}
 */

function lgsParser(lgs) {
    let parsedLgs = {};
    let parsingTag = false;
    let parsingAttributes = false;
    let key = "";
    let attributes = "";
    let value = "";

    for (let i = 0; i < lgs.length; i++) {
        const char = lgs[i];
        if (key && !parsingTag) {
            value += char;
            if (value.includes(`</${key}>`)) {
                value = value.replace(`</${key}>`, "");
                parsedLgs[key] = { value, attributes: parseAttributes(attributes) };
                key = "";
                value = "";
            }
        }
        
        if (char == ">" && parsingTag) {
            parsingTag = false;
            parsingAttributes = false;
            key = key.trim();
            attributes = attributes.trim();
        }
        if (parsingTag && !parsingAttributes && char == " ") parsingAttributes = true;
        if (parsingTag && !parsingAttributes) key += char;
        if (parsingTag && parsingAttributes) attributes += char;
        if (char == "<" && !key && !parsingTag) parsingTag = true;
    }
    
    for (const [key, value] of Object.entries(parsedLgs)) {
        if (key != "view" && key != "script" && key != "style" && key != "head" && key != "lang") {
            const parsed = lgsParser(value.value);
            parsedLgs[key] = { value: Object.keys(parsed).length != 0 ? parsed : value,  };
        }
    }

    return parsedLgs;
}

function parseAttributes(str) {
    const attributes = {};
    let attribute = str.match(/([0-9a-zA-Z_-]+)=\"([^"]*)\"/);
    while (attribute) {
        let value = attribute[2];
        if (value.match(/^[0-9]+$/)) value = parseFloat(value);
        attributes[attribute[1]] = value;
        str = str.replace(attribute[0], "");
        attribute = str.match(/([0-9a-zA-Z_-]+)=(\"[^"]*\")/);
    }
    return attributes;
}

module.exports = { lgsParser };