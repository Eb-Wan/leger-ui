/**
 * Parse LGS sting into object.
 * @param {string} lgs - LGS string to be parsed
 * @returns {object}
 */

function parseLgs(lgs) {
    let parsedLgs = {};
    let parsingTag = false;
    let propertyName = "";
    let propertyValue = "";

    for (let i = 0; i < lgs.length; i++) {
        const char = lgs[i];

        if (propertyName && !parsingTag) {
            propertyValue += char;
            if (propertyValue.includes(`</${propertyName}>`)) {
                propertyValue = propertyValue.replace(`</${propertyName}>`, "");
                parsedLgs[propertyName] = propertyValue;
                propertyName = "";
                propertyValue = "";
            }
        }

        if (char == ">" && parsingTag) parsingTag = false;
        if (parsingTag) propertyName += char;
        if (char == "<" && !propertyName && !parsingTag) parsingTag = true;
    }
    
    for (const [key, value] of Object.entries(parsedLgs)) {
        if (key != "view" && key != "script" && key != "style" && key != "head" && key != "lang") {
            const parsed = parseLgs(value);
            parsedLgs[key] = Object.keys(parsed).length != 0 ? parsed : value;
        }
    }

    return parsedLgs;
}

module.exports = parseLgs;