/**
 * Parse LGS string into object.
 * @param {string} lgs - LGS string to be parsed
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
                parsedLgs[key] = value;
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
            const parsed = lgsParser(value);
            parsedLgs[key] = Object.keys(parsed).length != 0 ? parsed : value;
        }
    }

    return parsedLgs;
}

module.exports = { lgsParser };