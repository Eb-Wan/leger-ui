function compileTemplate(xml) {
    const dom = parseTemplate(xml);
    const string = compileDOM(dom);
    return `function(args){return\`${string}\`}`;
}

class Node {
    constructor(name, parent) {
        this.nodeName = name;
        this.parent = parent;
        this.children = [];
        this.attributes = [];
    }
    setAttribute(name, value = true, type = "boolean") {
        const index = this.attributes.findIndex(e => e.name == name);
        if (index != -1) this.attributes[index] = { name, value, type };
        else this.attributes.push({ name, value, type });
    }
    setAttributeValue(value, type = "boolean") {
        if (this.attributes.length) {
            this.attributes[this.attributes.length-1].value = value;
            this.attributes[this.attributes.length-1].type = type;
        }
    }
    appendNode(node) {
        this.children.push(node);
    }
}

export function parseTemplate(xml) {
    let currentNode = new Node("#root");

    let currentMode = text;
    let previousModes = [ text ];

    let currentStringTerminator;
    let blockDepth = 0;
    let i = 0;
    let buffer = "";

    const dom = currentNode;

    for (i = 0; i < xml.length; i++) {
        currentMode(xml[i], xml[i-1] ?? "", xml[i+1] ?? "");
    }

    if (previousModes.length > 1) throw new Error("Unclosed tag or block"+previousModes.length);
    if (dom.nodeName != "#root") throw new Error("Opening tag without corresponding closing tag");

    return dom;

    function text(char) {
        if (currentNode.nodeName == "script" || currentNode.nodeName == "style") {
            buffer += char;
            if (buffer.endsWith(`</${currentNode.nodeName}>`)) {
                buffer = buffer.replace(`</${currentNode.nodeName}>`, "");
                pushTextNode();
                currentNode = currentNode.parent;
            }
        } else {
            if (char == "\\") switchMode(textEscape);
            else if (char == "<") { pushTextNode(); newNode(); switchMode(tag); }
            else if (char == "$") { pushTextNode(); switchMode(blockText); }
            else if (char == "/") switchMode(commentStart);
            else if (currentNode.nodeName == "pre") {
                if (char == "\s") buffer += "\\s";
                else if (char == "\t") buffer += "\\t";
                else if (char == "\n") buffer += "\\n";
                else buffer += char;
            }
            else buffer += char;
        }
    }
    function blockText(char) {
        if (char == "{") blockDepth++;
        else if (char == "}") blockDepth--;
        buffer += char;
        
        if (blockDepth == 0) {
            const blockNode = new Node("#block", currentNode);
            currentNode.children.push(blockNode);
            blockNode.value = buffer;
            buffer = "";
            previousMode();
        }
    }
    function textEscape(char) {
        buffer += `&#${ char.charCodeAt(0) };`;
        previousMode();
    }

    function tag(char) {
        if (char.match(/[a-zA-Z0-9_\-]/)) buffer += char;
        else {
            if (buffer) {
                if (!currentNode.nodeName) { currentNode.nodeName = buffer; buffer = ""; }
                else { currentNode.setAttribute(buffer); buffer = ""; }
            }
            if (char == ">") previousMode();
            else if (char == "/") { buffer = currentNode.nodeName; switchMode(tagEnd); }
            else if (char == "=") switchMode(assign);
            else if (!char.match(/\s/)) throw new Error("Syntax error in tag");
        }
    }
    function tagEnd(char) {
        if (!currentNode.nodeName) { currentNode = currentNode.parent; currentNode.children.pop(); }
        if (char.match(/[a-zA-Z0-9_\-]/)) buffer += char;
        else if (char == ">") {
            if (currentNode.nodeName == buffer) {
                buffer = "";
                currentNode = currentNode.parent;
                previousMode(2);
            }
            else throw new Error("Unexpected closing tag");
        }
        else throw new Error("Syntax error in tag");
    }
    function assign(char) {
        if (char == "\"" || char == "'") { currentStringTerminator = char; switchMode(string); }
        else if (char == "$") switchMode(block);
        else if (char.match(/[0-9]/)) switchMode(number);
        else throw new Error("Invalid attribute value");
    }
    function string(char) {
        if (char == "\\") switchMode(stringEscape);
        else if (char == currentStringTerminator) { currentNode.setAttributeValue(buffer, "string"); buffer = ""; previousMode(2); }
        else buffer += char;
    }
    function number(char, prevChar) {
        if (char.match(/[0-9abcdefx.]/i)) buffer += prevChar;
        else { buffer += prevChar; currentNode.setAttributeValue(eval(buffer).toString(), "number"); buffer = ""; i--; previousMode(2); }
    }
    function stringEscape(char) {
        buffer += "\\"+char;
        previousMode();
    }
    function block(char) {
        if (char == "{") blockDepth++;
        else if (char == "}") blockDepth--;
        buffer += char;
        
        if (blockDepth == 0) { currentNode.setAttributeValue(buffer.slice(1, -1), "block"); buffer = ""; previousMode(2); }
    }
    function commentStart(char, prevChar) {
        if (char == "/") { pushTextNode(); switchMode(inlineComment); }
        else if (char == "*") { pushTextNode(); switchMode(blockComment); }
        else { buffer += (prevChar+char); previousMode(); }
    }
    function inlineComment(char) {
        if (char == "\n") previousMode(2);
    }
    function blockComment(char) {
        buffer += char;
        if (buffer.endsWith("*/")) { buffer = ""; previousMode(2) }
    }

    function switchMode(newMode) {
        previousModes.push(currentMode);
        currentMode = newMode;
    }
    function previousMode(count = 1) {
        for (let i = 0; i < count; i++) {
            currentMode = previousModes.pop();
        }
    }
    function pushTextNode() {
        buffer = buffer.replaceAll(/\s{1,}/mg, " ").replaceAll("`", "\\`");
        if (buffer) {
            const textNode = new Node("#text", currentNode);
            textNode.value = buffer;
            buffer = "";
            currentNode.appendNode(textNode);
        }
    }
    function newNode() {
        currentNode = new Node("", currentNode);
        currentNode.parent.children.push(currentNode);
    }
}

function compileDOM(dom) {
    let string = "";

    dom.children.forEach(element => {
        if (element.nodeName == "#text") string += element.value;
        else if (element.nodeName == "#block") string += "$"+element.value;
        else if (element.nodeName[0].match(/[A-Z]/)) {
            const args = element.attributes.map(renderComponentAttribute);
            string += `\${${element.nodeName}._instantiate({${ args.join(", ")}})}`;
        }
        else if (element.nodeName[0].match(/[a-z]/)) {
            const voidElements = [ "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr" ];
            const tagContents = [element.nodeName];

            const refAttributeIndex = element.attributes.findIndex(e => e.name == "_ref");
            const idAttributeIndex = element.attributes.findIndex(e => e.name == "id");
            if (refAttributeIndex != -1) {
                const name = element.attributes[refAttributeIndex].value;
                const type = element.attributes[refAttributeIndex].type;
                if (idAttributeIndex != -1) throw new Error ("Cannot have _ref attribute and an id attribute")
                if (type == "block") element.attributes[refAttributeIndex] = { name: "id", value: "${this._ref("+name+")}", type: "string" };
                else element.attributes[refAttributeIndex] = { name: "id", value: "${this._ref('"+name+"')}", type: "string" };
            }

            element.attributes.forEach(e => tagContents.push(renderHtmlAttribute(e)));
            if (voidElements.includes(element.nodeName)) string += `<${tagContents.join(" ")}>`;
            else {
                const innerHTML = compileDOM(element);
                string += `<${tagContents.join(" ")}>${ innerHTML }</${element.nodeName}>`;
            }
        }
    });

    return string.trim();
}

function renderHtmlAttribute(attribute) {
    if (attribute.type == "string") return `${attribute.name}="${attribute.value}"`;
    else if (attribute.type == "number") return `${attribute.name}="${attribute.value}"`;
    else if (attribute.type == "block") return `${attribute.name}="\${${attribute.value}}"`;
    else if (attribute.type == "boolean") return `${attribute.name}="${attribute.value}"`;
}
function renderComponentAttribute(attribute) {
    if (attribute.type == "string") return `"${attribute.name}":"${attribute.value}"`;
    else if (attribute.type == "number") return `"${attribute.name}":${attribute.value}`;
    else if (attribute.type == "block") return `"${attribute.name}":(${attribute.value})`;
    else if (attribute.type == "boolean") return `"${attribute.name}":${attribute.value}`;
}

export { compileTemplate };