import { existsSync, readFileSync } from "fs";
import { xmlParser } from "./xml-parser.js";
import { dirname, resolve } from "path";

const defined = {
    includes: [],
    exports: [],
    projectDir: "",
    currentDir: "",
    currentFile: ""
};

const commands = {
    define: (name, value) => {
        if (!name) error("No value name given");

        if (name[0] != "$", defined[name]) {
            console.error(`[ ERROR ] ${defined.currentFile} : Cannot redifine a constant`);
            process.exit(1);
        }
        defined[name] = value;
        return "";
    },
    print: (...names) => {
        if (names.length == 0) warn(`Empty print command`);
        return names.map(e => {
            if (defined[e]) return defined[e];
            warn(`Trying to print an undefined value`);
            return "";
        }).join();
    },
    log: (...values) => {
        if (names.length == 0) { warn(`Empty log command`); return ""; }
        console.log(...values);
        return "";
    },
    warn: (...values) => {
        if (names.length == 0) { warn(`Empty warn command`); return ""; }
        console.warn(...values);
        return "";
    },
    error: (...values) => {
        if (names.length == 0) { warn(`Empty error command`); return ""; }
        console.error(...values);
        return "";
    },
    include: (path, name) => {
        if (!path) error("No include path given");
        if (!name) error("No include name given");
        if (!name.match(/[a-zA-Z0-9_]/)) error(`Invalid include name`);

        path = path.replaceAll("\"", "\\\"");
        path = resolve(defined.currentDir+path);
        if (!existsSync(path)) error(`No such file "${ path }"`);
        path = path.replace(defined.projectDir, "");

        if (!defined.includes.includes(path)) defined.includes.push(path);
        return `const ${name} = _lgui.get("${path}");`;
    },
    export: (path) => {
        if (!defined.exports.includes(path)) defined.exports.push(path);
        return "";
    }
}

function preprocess(path) {
    let string = readFileSync(path, "utf8");
    defined.currentFile = path;
    defined.currentDir = dirname(path)+"/";

    string = removeComments(string);
    string = processCommands(string);

    // TODO : This next part is not finished
    // You need to turn the object returned by parseXML into a usable template

    string = processXMLTemplates(string);
    process.exit(0)

    // Find and parse LGUI elements

    return string;
}

function removeComments(string) {
    string = string.replaceAll(/\/\*[\s\S]*\*\//gm, "");
    return string.replaceAll(/\/\/.*$/gm, "");
}

function processCommands(string) {
    let match;
    
    while (match = string.match(/(?<!\\)#.+;/gm)) {
        const parsed = parseCommand(match[0].slice(1));
        const command = parsed.shift();
        if (!commands[command]) error(`Invalid command "${ command }"`);
        string = string.replace(match[0], commands[command](...parsed));
    }

    return string;
}
function parseCommand(string) {
    const parsingModes = {
        normal: 0,
        templateString: 1,
        staticString: 2
    };

    const command = [];
    let buffer = "";
    let current = "";
    let parsingMode = parsingModes.normal;

    for (let i = 0; i < string.length; i++) {
        current = string[i];

        if (parsingMode == parsingModes.staticString) {
            if (current == "\"") { pushBuffer(); parsingMode = parsingModes.normal; continue; }
            buffer += current;
            const match = string.match(/\$[a-zA-Z0-9$]+;/gm);
            if (match) buffer = buffer.replace(match[0], defined[match[0]] ?? "");

        } else if (parsingMode == parsingModes.templateString) {
            if (current == "'") { pushBuffer(); parsingMode = parsingModes.normal; continue; }
            buffer += current;

        } else {
            if (current == "\"") { pushBuffer(); parsingMode = parsingModes.templateString; }
            else if (current == "'") { pushBuffer(); parsingMode = parsingModes.staticString; }
            else if (current == " ") pushBuffer();
            else if (current == ";") pushBuffer();
            else buffer += current;
        }

        function pushBuffer() {
            command.push(buffer);
            buffer = "";
        }
    }

    return command;
}

function processXMLTemplates(string) {
    let match;
    while (match = findXMLTemplates(string)) {
        const parsed = xmlParser(match);
        console.log(parsed);
        if (parsed.length > 1) error("XML templates must only have one root element")
        const rendered = renderParsedXML(parsed);
        string = string.replace(`<>${ match }</>`, `function(attr) { return \`${ rendered }\` }`);
    }
    return string;
}
function findXMLTemplates(string) {
    const match = string.match(/(?<!\\)<>[\s\S]*<\/>/m);
    if (!match) return null;
    const index = match[0].match(/<\/>/m).index;
    return match[0].slice(2, index);
}

function renderParsedXML(parsed) {
    let string = "";

    parsed.map(node => {
        if (node.type == "element") return element.tagName.match(/^[A-Z]/) ? renderLGUIElement(element) : renderHTMLElement(element);
        else if (node.type == "text") return node.children;
        else return "";
    }).join("");

    return string;
}

function renderHTMLElement(element) {
    return `<${ element.tagName }${ renderElementAttributes(element.attributes) }>${ renderParsedXML(element.children) }</${ element.tagName }>`;
}
function renderElementAttributes(attributes) {
    if (!attributes || !Object.keys(attributes).length) return "";

    let string;

    if (attributes.ref)

    return " "+string;
}
function renderLGUIElement(element) {

}

function log(message, level = "LOG") {
    console.log(`[ ${ level } ] ${defined.currentFile} : ${ message }`);
}
function warn(message, level = "WARN") {
    console.warn(`[ ${ level } ] ${defined.currentFile} : ${ message }`);
}
function error(message, level = "ERROR") {
    console.error(`[ ${ level } ] ${defined.currentFile} : ${ message }`);
    process.exit(1);
}

export { preprocess, defined };