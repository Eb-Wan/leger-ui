/**
 * Parse XML string into objects.
 * @param {string} xml - XML string to be parsed
 * @returns {object}
 */

function xmlParser(xml) {
    const dom = [];
    return dom;
}

function tokenizeXML() {
    const tokens = [];
    const specialRegex = /[{}]/;
    const numberRegex = /[0-9.abcdex]/;
    const identifierRegex = /[a-zA-Z0-9_]/;

    const depth = [];
    let buffer = "";
    let currentFunc = text;
    let previousMode = text;

    for (let i = 0; i < xml.length; i++) {
        currentFunc(xml[i], xml[i-1] ?? "");
    }

    return tokens;


    function text(char) {
        if (char == "\\") { switchMode(escape); }
        else if (char == "<") { pushToken("text"); switchMode(tag); }
        else if (char == "{") { pushToken("text"); switchMode(slot); }
        else buffer += prevChar;
    }
    function tag(char) {
        if (char == "\\") switchMode(escape);
        else if (char.match(identifierRegex)) switchMode(modes.identifier);
        else if (char.match("\"")) switchMode(modes.string);
        else if (char.match(/[0-9]/)) switchMode(modes.number);
        else if (char.match(operatorRegex)) switchMode(modes.operator);
        else if (char.match("{")) switchMode(modes.slot);
    }
    function identifier(char, prevChar) {
        if (!char.match(numberRegex)) { pushToken("string"); switchMode(previousMode); }
        else buffer += char;
    }
    function string(char) {
        if (char == "\\") { pushToken("string"); switchMode(escape); }
        else if (char == "\"") { pushToken("string"); switchMode(previousMode); }
        else buffer += char;
    }
    function number(char) {
        if (!char.match(numberRegex)) { pushToken("number"); switchMode(previousMode); }
        else buffer += char;
    }
    function escape(char) {
        buffer += `&#${ char.charCodeAt(0) };`;
        switchMode(previousMode);
    }

    function switchMode(type) {
        previousMode = currentMode;
        currentMode = newMode;
    }
    function pushToken(type) {
        tokens.push([ type, buffer ]);
        buffer = "";
    }
}

export { xmlParser };

// function xmlParser(xml) {
//     const nodes = [];
//     const tagRegex = /<([^>]*)>/m;

//     // "text <p>test</p>"
//     // find tag
//     // if no tag push content as text node and return

//     let match;
//     while (match = xml.match()) {
//         if (match[0].match(/<!--[\s\S]*-->/m)) { xml.replace(match[0], ""); continue; }
        
//         if (match.index) {
//             xml = xml.replace(xml.slice(0, index), "");
//             nodes.push(xml.slice(0, index));
//             continue;

//         } if (match[0][match[0].length - 1] == "/") {
//             nodes.push(parseSelfClosingTag(match[0]));
//             xml = xml.replace(match[0], "");
//             continue;

//         } else {
//             const closingTag = xml.match(new RegExp(`<\\/${ match[1] }>`, "m"));
//             if (!closingTag) throw new Error(`Tag "${ match[1] }" without closing tag`);
//             const tag = xml.slice(0, closingTag[0].length);
//             nodes.push(parseTag(tag));
//             xml = xml.replace(tag, "");
//             continue;

//         }
//     }

//     // index != 0 push text into text node
//     // handle element node

//     return nodes.filter(node => {
//         // Cleanup
//         return true;
//     });
// }

// function parseSelfClosingTag(tag) {
//     tag = tag.slice(1, -2);
//     let tagName = tag.match(/^[a-zA-Z0-9_-]*\s/m);
//     if (!tagName) throw new Error("Invalid self closing tag name");
//     let attributes = tagName.replace(tagName[0], "");
//     tagName = tagName[0].slice(0, -1);
//     attributes = parseAttributes(attributes);

//     return { type: "element", tagName, attributes }
// }
// function parseTag(tag) {

// }
// function parseAttributes(attributes) {

// }

// export { xml };


// function xmlParser(xml) {
//     const tagRegex = /<([a-zA-Z0-9_-]+) *(.*) *>/;
//     const closingTagRegex = /<\/([a-zA-Z0-9_-]+)>/;
//     const selfClosingTagRegex = /<([a-zA-Z0-9_-]+) *(.*) *\/>/;
//     const parsed = [];

//     const Actions = {
//         FindTag: 0,
//         GetTag: 1,
//         GetAttributes: 2,
//         GetContents: 3,
//     }

//     let currentAction = Actions.GetTag;
//     let buffer = "";
//     let currentElement = {};
//     let depth = 0;
//     xml.split("").forEach(c => {
//         buffer += c;
//         switch(currentAction) {
//             case Actions.GetTag :
//                 parseSelfClosingTag();
//                 parseTag();
//                 break;
//             case Actions.GetContents:
//                 parseContents();
//                 break;
//             default:
//                 break;
//         }
//     });

//     function parseTag() {
//         let match = buffer.match(tagRegex);
//         if (!match) return;
//         currentElement.tagName = match[1];
//         currentElement.attributes = parseAttributes(match[2]);
//         currentAction = Actions.GetContents;
//         currentElement.contents = "";
//         buffer = "";
//     }
//     function parseSelfClosingTag() {
//         let match = buffer.match(selfClosingTagRegex);
//         if (!match) return;
//         currentElement.tagName = match[1];
//         currentElement.attributes = parseAttributes(match[2]);
//         parsed.push(structuredClone(currentElement));
//         currentAction = Actions.GetTag;
//         buffer = "";
//         currentElement = {};
//     }
//     function parseContents() {
//         let match = buffer.match(closingTagRegex);

//         if (!match) {
//             match = buffer.match(tagRegex);
//             if (!match) return;
//             if (match[1] == currentElement.tagName) depth++;
//             currentElement.contents += buffer;
//             buffer = "";
//             return;
//         }
//         if (!currentElement.contents) currentElement.contents = "";
//         if (match[1] != currentElement.tagName) {
//             currentElement.contents += buffer;
//             buffer = "";
//         } else if (depth > 0) {
//             depth--;
//             currentElement.contents += buffer;
//             buffer = "";
//         } else {
//             currentElement.contents += buffer.replace(closingTagRegex, "");
            
//             let contents;
//             if (contents && contents.length > 0) currentElement.contents = contents;
//             parsed.push(structuredClone(currentElement));
            
//             currentAction = Actions.GetTag;
//             buffer = "";
//             currentElement = {};
//         }
//     }
//     function parseAttributes(str) {
//         if (!str) return {};
//         const attributes = {};
//         let attribute;
//         while (attribute = (str.match(/([0-9a-zA-Z_-]+)=(\"[^"]*\")/) || str.match(/([0-9a-zA-Z_-]+)=(\${[\s\S]*})/) || str.match(/([0-9a-zA-Z_-]+)=(\S*)/) || str.match(/[0-9a-zA-Z_-]+/))) {
//             let value = attribute[2] ?? "true";

//             if (value.slice(0,2) == "${") {
//                 value = getTemplateObject(value);
//                 attribute[0] = attribute[0].replace(/=[\s\S]*$/, "="+value.slice(1, value.length-1));
//                 console.log(attribute[0]);
//             }
            
//             try { value = eval(value) } catch(err) { value="${"+value+"}" };
//             attributes[(attribute[1] ?? attribute[0])] = value;
//             str = str.replace(attribute[0], "");
//         }
//         return attributes;
//     }
//     return parsed;

//     function getTemplateObject(str) {
//         let depth = 1;
//         let value = "${";
//         let current = "";

//         for (let i = 2; i < str.length; i++) {
//             current = str[i];
//             if (current == "{") depth++;
//             else if (current == "}") depth--;
//             value += current;
//             if (depth == 0) break;
//         }

//         return `"${ value }"`;
//     }

// }

// export { xmlParser };