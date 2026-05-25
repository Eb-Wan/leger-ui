function compileTemplate(xml) {
    const tokens = tokenize(xml)
    const dom = buildDOM(tokens);
    const string = compileDOM(dom);
    return `function(args){return\`${string}\`}`;
}

function tokenize(xml) {
    const identifierRegex = /[a-zA-Z0-9_]/m;
    const numberRegex = /[0-9abcdex]/im;
    
    let blockDepth = 0;
    let buffer = "";
    let endChar = "";
    let currentMode = text;
    let previousModes = [ text ];

    const tokens = [];

    for (let i = 0; i < xml.length; i++) {
        currentMode(xml[i], xml[i-1] ?? "");
    }

    return tokens.map(e => {
        if (e[0] != "block" && e[1]) return [ e[0], e[1].replaceAll("`", "\\`") ];
        else return e;
    });

    function text(char) {
        if (char == "\\") switchMode(htmlEscape);
        else if (char == "<") {
            buffer = buffer.replaceAll(/\s{1,}/mg, " ").trim(); 
            if (buffer) pushToken("text");
            pushToken("<");
            switchMode(tag);
        }
        else if (char == "{") {
            buffer = buffer.replaceAll(/\s{1,}/mg, " ").trim(); 
            if (buffer) pushToken("text");
            blockDepth++;
            switchMode(block);
        }
        else buffer += char;
    }
    function tag(char) {
        if (char.match(identifierRegex)) buffer += char;
        else {
            if (buffer) pushToken("identifier");
            
            if (char == "\"" || char == "'") { endChar = char; switchMode(string); }
            else if (char == "=") pushToken("=");
            else if (char == "/") pushToken("/");
            else if (char == "{") { blockDepth++; switchMode(block); }
            else if (char == ">") { pushToken(">"); switchMode(text); }
            else if (char.match(/[0-9]/)) switchMode(number);
            else if (!char.match(/\s/)) throw new Error("Syntax error in template");
        }
    }
    function block(char) {
        if (char == "}") {
            blockDepth--;
            buffer = buffer.trim();
            if (blockDepth == 0) { pushToken("block"); previousMode(); }
        }
        else if (char == "{") blockDepth++;
        else if (char == "\"" || char == "'" || char == "`") { endChar = char; switchMode(blockString); }
        
        if (blockDepth) buffer += char;
    }
    function blockString(char) {
        if (char == "\\") { switchMode(stringEscape); }
        else if (char == endChar) { buffer += char; previousMode(); }
        else buffer += char;
    }
    function string(char) {
        if (char == "\\") { switchMode(stringEscape); }
        else if (char == endChar) { pushToken("string"); previousMode(); }
        else buffer += char;
    }
    function number(char) {
        if (!char.match(numberRegex)) { pushToken("number"); previousMode(); }
        else buffer += char;
    }
    function htmlEscape(char) {
        buffer += `&#${ char.charCodeAt(0) };`;
        previousMode();
    }
    function stringEscape(char) {
        buffer += "\\"+char;
        previousMode();
    }

    function switchMode(newMode) {
        previousModes.push(currentMode);
        currentMode = newMode;
    }
    function previousMode() {
        currentMode = previousModes.pop();
    }

    function pushToken(type) {
        if (buffer) tokens.push([ type, buffer ]);
        else tokens.push([ type ]);
        buffer = "";
    }
}

function buildDOM(tokens) {
    let currentNode = {
        tagName: "#root",
        children: []
    };
    let currentAttribute;
    let currentMode = normal;
    const dom = currentNode;

    for (let i = 0; i < tokens.length; i++) {
        currentMode(tokens[i]);
    }
    
    return dom;
    
    function normal(token) {
        if (token[0] == "text") currentNode.children.push({ tagName: "#text", value: token[1], parent: currentNode });
        else if (token[0] == "block") currentNode.children.push({ tagName: "#block", value: token[1], parent: currentNode });
        else if (token[0] == "<") currentMode = tagStart;
    }
    function tagStart(token) {
        if (token[0] == "identifier") {
            currentNode = { parent: currentNode, children: [] };
            currentNode.tagName = token[1];
            currentNode.parent.children.push(currentNode);
            currentMode = tag;
        }
        else if (token[0] == "/") currentMode = tagEnd;
        else throw new Error ("Invalid tag name");
    }
    function tag(token) {
        if (token[0] == ">") currentMode = normal;
        else if (token[0] == "identifier") {
            if (!currentNode.attributes) currentNode.attributes = {};
            currentAttribute = { name: token[1] };
            currentNode.attributes[token[1]] = true;
        }
        else if (token[0] == "=") {
            if (!currentAttribute) throw new Error ("Unexpected assignment");
            currentAttribute.operation = "assign";
        }
        else if (token[0] == "string") {
            if (!currentNode.attributes || currentAttribute.operation != "assign") throw Error ("Unexpected string");
            currentNode.attributes[currentAttribute.name] = token[1];
        }
        else if (token[0] == "block") {
            if (!currentNode.attributes || currentAttribute.operation != "assign") throw Error ("Unexpected block");
            currentNode.attributes[currentAttribute.name] = "${"+token[1]+"}";
        }
        else if (token[0] == "/") currentMode = selfClosingTagEnd;
        else throw new Error ("Unexpected block");
    }
    function tagEnd(token) {
        if (token[0] == "identifier" && token[1] != currentNode.tagName) throw new Error ("Unexpected closing tag");
        else if (token[0] == ">") {
            currentNode = currentNode.parent;
            currentMode = normal;
        }
        else if (token[0] != "identifier") throw new Error ("Invalid closing tag");
    }
    function selfClosingTagEnd(token) {
        if (token[0] == ">") {
            currentNode = currentNode.parent;
            currentMode = normal;
        }
        else throw new Error ("Invalid self closing tag");
    }
}

function compileDOM(dom) {
    let string = "";

    dom.children.forEach(element => {
        if (element.tagName == "#text") string += element.value;
        else if (element.tagName == "#block") string += "${"+element.value+"}";
        else if (element.tagName[0].match(/[A-Z]/)) {
            const args = [];
            if (Object.keys(element?.attributes || {}).length) {
                const attributes = [];
                for (const [key, value] of Object.entries(element.attributes)) {
                    attributes.push(`${key}:${renderValue(value)}`);
                }
                args.push(`{${ attributes.join() }}`);
            }

            string += `\${${element.tagName}.toString({${ args.join()}})}`;
        }
        else if (element.tagName[0].match(/[a-z]/)) {
            const voidElements = [ "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr" ];
            const tagContents = [element.tagName];
            if (Object.keys(element?.attributes || {}).length) {
                for (const [key, value] of Object.entries(element.attributes)) {
                    tagContents.push(`${key}="${value}"`);
                }
            }

            if (voidElements.includes(element.tagName)) string += `<${tagContents.join(" ")}>`;
            else {
                const innerHTML = compileDOM(element);
                string += `<${tagContents.join(" ")}>${ innerHTML }</${element.tagName}>`;
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