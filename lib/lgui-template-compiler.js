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
    setAttribute(name, value = true) {
        const index = this.attributes.findIndex(e => e.name == name);
        if (index != -1) this.attributes[index] = { name, value };
        else this.attributes.push({ name, value });
    }
    setAttributeValue(value) {
        if (this.attributes.length) this.attributes[this.attributes.length-1].value = value;
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

    let buffer = "";

    const dom = currentNode;

    for (let i = 0; i < xml.length; i++) {
        currentMode(xml[i]);
    }

    return dom;


    function text(char) {
        if (currentNode.nodeName == "script" || currentNode.nodeName == "style") {
            buffer += char;
            if (buffer.endsWith(`</${currentNode.nodeName}>`)) {
                buffer = buffer.replace(`</${currentNode.nodeName}>`, "");
                pushTextNode();
            }
        } else {
            if (char == "\\") switchMode(textEscape);
            else if (char == "<") { pushTextNode(); newNode(); switchMode(tag); }
            else if (char == "$") { pushTextNode(); switchMode(blockText); }
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
            previousMode(2);
        }
    }
    function textEscape(char) {
        buffer += `&#${ char.charCodeAt(0) };`;
        previousMode();
    }

    function tag(char) {
        if (char.match(/[a-zA-Z0-9_]/)) buffer += char;
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
        if (char.match(/[a-zA-Z0-9_]/)) buffer += char;
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
    }
    function string(char) {
        if (char == "\\") switchMode(stringEscape);
        else if (char == currentStringTerminator) { currentNode.setAttributeValue(buffer); buffer = ""; previousMode(2); }
        else buffer += char;
    }
    function number(char) {
        if (char.match(/[0-9abcdefx.]/i)) buffer += char;
        else { currentNode.setAttributeValue(eval(buffer).toString()); buffer = ""; previousMode(2); }
    }
    function stringEscape(char) {
        buffer += "\\"+char;
        previousMode();
    }
    function block(char) {
        if (char == "{") blockDepth++;
        else if (char == "}") blockDepth--;
        buffer += char;
        
        if (blockDepth == 0) {
            currentNode.setAttributeValue(`$${buffer}`);            
            buffer = "";
            previousMode(2);
        }
    }

    function switchMode(newMode) {
        previousModes.push(currentMode);
        currentMode = newMode;
    }
    function previousMode(count = 1) {
        for(let i = 0; i < count; i++) {
            currentMode = previousModes.pop();
        }
    }
    function pushTextNode() {
        buffer = buffer.replaceAll(/\s{1,}/mg, " ");
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
            const args = element.attributes.map(e => `${e.name}:${renderValue(e.value)}`);
            string += `\${${element.nodeName}._instantiate({${ args.join(", ")}})}`;
        }
        else if (element.nodeName[0].match(/[a-z]/)) {
            const voidElements = [ "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr" ];
            const tagContents = [element.nodeName];
            element.attributes.forEach(e => tagContents.push(`${e.name}="${e.value}"`));
            if (voidElements.includes(element.nodeName)) string += `<${tagContents.join(" ")}>`;
            else {
                const innerHTML = compileDOM(element);
                string += `<${tagContents.join(" ")}>${ innerHTML }</${element.nodeName}>`;
            }
        }
    });

    return string.trim();
}

function renderValue(value) {
    if (typeof value == "string") return `"${value}"`;
    else if (typeof value == "number" || typeof value == "boolean") return value;
}

export { compileTemplate };