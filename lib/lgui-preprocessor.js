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
        if (!name) error("No value name given");

        if (name[0] != "$", defined[name]) {
            console.error(`[ ERROR ] ${defined.currentFile} : Cannot redefine a constant`);
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
        
        path = resolve(defined.currentDir+path);
        if (!path.includes(defined.projectDir)) error(`Include path is outside the project root directory`);

        path = path.replaceAll("\"", "\\\"");
        if (!defined.includes.includes(path)) defined.includes.push(path);
        if (!existsSync(path)) error(`No such file "${ path }"`);
        path = path.replace(defined.projectDir, "");

        return `const ${name} = this._get("${path}");`;
    },
    export: (path) => {
        if (!path) error("Empty export command");
        
        path = resolve(defined.currentDir+path);
        if (!existsSync(path)) error(`No such file or directory "${ path }"`);
        if (!path.includes(defined.projectDir)) error(`Export path is outside the project root directory`);
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
        error(err.message);
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