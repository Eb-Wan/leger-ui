import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { compileTemplate } from "./lgui-template-compiler.js";

const defined = {
    includes: [],
    exports: [],
    projectDir: "",
    currentDir: "",
    currentFile: ""
};

const commands = {
    define: (name, value) => {
        if (!name) throw new Error(`${defined.currentFile} (#define) : No value name given`);
        if (name[0] != "$", defined[name]) throw new Error(`${defined.currentFile} (#define) : Cannot redefine a constant`);
        defined[name] = value;
        return "";
    },
    print: (...names) => {
        if (names.length == 0) warn(`${defined.currentFile} (#print) : No names given`);
        return names.map(e => {
            if (defined[e]) return defined[e];
            warn(`${defined.currentFile} (#print) : Undefined value`);
            return "";
        }).join();
    },
    log: (...values) => {
        if (names.length == 0) { warn(`${defined.currentFile} (#log) : No values given`); return ""; }
        console.log(...values);
        return "";
    },
    warn: (...values) => {
        if (names.length == 0) { warn(`${defined.currentFile} (#warn) : No values given`); return ""; }
        console.warn(...values);
        return "";
    },
    error: (...values) => {
        if (names.length == 0) { warn(`${defined.currentFile} (#error) : No values given`); return ""; }
        console.error(...values);
        return "";
    },
    include: (path, name) => {
        if (!path) throw new Error(`${defined.currentFile} (#include) : No path given`);
        if (!name) throw new Error(`${defined.currentFile} (#include) : No name given`);
        if (!name.match(/[a-zA-Z0-9_]/)) throw new Error(`${defined.currentFile} (#include) : Invalid name`);
        
        path = resolve(defined.currentDir+path);
        if (!path.includes(defined.projectDir)) throw new Error(`${defined.currentFile} (#include) : Include path is outside the project root directory`);

        path = path.replaceAll("\"", "\\\"");
        if (!defined.includes.includes(path)) defined.includes.push(path);
        if (!existsSync(path)) throw new Error(`${defined.currentFile} (#include) : No such file "${ path }"`);
        path = path.replace(defined.projectDir, "");

        return `const ${name} = this._get("${path}");`;
    },
    export: (path) => {
        if (!path) throw new Error(`${defined.currentFile} (#export) : No path given`);
        
        path = resolve(defined.currentDir+path);
        if (!existsSync(path)) throw new Error(`${defined.currentFile} (#export) : No such file or directory "${ path }"`);
        if (!path.includes(defined.projectDir)) throw new Error(`${defined.currentFile} (#export) : Export path is outside the project root directory`);
        path = path.replace(defined.projectDir, "");

        if (!defined.exports.includes(path)) defined.exports.push(path);
        return "";
    }
}

function preprocess(path) {
    let string = readFileSync(path, "utf8");
    defined.currentFile = path;
    defined.currentDir = dirname(path)+"/";

    try {
        string = removeComments(string);
        string = processCommands(string);
        string = processXMLTemplates(string);
        string = processLGUIElements(string);
        string = string.trim();
    } catch (err) {
        throw new Error(`${defined.currentFile} : ${ error.message }`);
    }

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
        if (!commands[command]) throw new Error(`${defined.currentFile} : Invalid command "#${ command }"`);
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
        const rendered = compileTemplate(match);
        string = string.replace(`<>${ match }</>`, rendered);
    }
    return string;

    function findXMLTemplates(string) {
        const match = string.match(/(?<!\\)<>[\s\S]*<\/>/m);
        if (!match) return null;
        const index = match[0].match(/<\/>/m).index;
        return match[0].slice(2, index);
    }
}
function processLGUIElements(string) {
    return string;
}

function log(message, level = "LOG") {
    console.log(`[ ${ level } ] ${ message }`);
}
function warn(message, level = "WARN") {
    console.warn(`[ ${ level } ] ${ message }`);
}
function error(message, level = "ERROR") {
    console.error(`[ ${ level } ] ${ message }`);
}

export { preprocess, defined };