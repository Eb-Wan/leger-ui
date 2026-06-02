import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { compileTemplate } from "./lgui-template-compiler.js";

const preprocessorData = {
    includes: [],
    exports: [],
    projectDir: "",
    currentDir: "",
    currentFile: "",
    defined: {}
};

function clearPreprocessorData() {
    preprocessorData.includes = [];
    preprocessorData.exports = [];
    preprocessorData.projectDir = "";
    preprocessorData.currentDir = "";
    preprocessorData.currentFile = "";
    preprocessorData.defined = {};
}

const commands = {
    define: (name, value) => {
        if (!name) throw new Error(`${preprocessorData.currentFile} (#define) : No value name given`);
        if (preprocessorData.defined[name] && name[0] != "$") throw new Error(`${preprocessorData.currentFile} (#define) : Cannot redefine a constant`);
        preprocessorData.defined[name] = value;
        return "";
    },
    print: (...names) => {
        if (names.length == 0) warn(`${preprocessorData.currentFile} (#print) : No names given`);
        return names.map(e => {
            if (preprocessorData.defined[e]) return preprocessorData.defined[e];
            warn(`${preprocessorData.currentFile} (#print) : Undefined value`);
            return "";
        }).join();
    },
    log: (...values) => {
        if (names.length == 0) { warn(`${preprocessorData.currentFile} (#log) : No values given`); return ""; }
        console.log(...values);
        return "";
    },
    warn: (...values) => {
        if (names.length == 0) { warn(`${preprocessorData.currentFile} (#warn) : No values given`); return ""; }
        console.warn(...values);
        return "";
    },
    error: (...values) => {
        if (names.length == 0) { warn(`${preprocessorData.currentFile} (#error) : No values given`); return ""; }
        console.error(...values);
        return "";
    },
    include: (path, name) => {
        if (!path) throw new Error(`${preprocessorData.currentFile} (#include) : No path given`);
        if (!name) throw new Error(`${preprocessorData.currentFile} (#include) : No name given`);
        if (!name.match(/[a-zA-Z0-9_]/)) throw new Error(`${preprocessorData.currentFile} (#include) : Invalid name`);
        
        path = resolve(preprocessorData.currentDir+path);
        if (!path.includes(preprocessorData.projectDir)) throw new Error(`${preprocessorData.currentFile} (#include) : Include path is outside the project root directory`);

        path = path.replaceAll("\"", "\\\"");
        if (!preprocessorData.includes.includes(path)) preprocessorData.includes.push(path);
        if (!existsSync(path)) throw new Error(`${preprocessorData.currentFile} (#include) : No such file "${ path }"`);
        path = path.replace(preprocessorData.projectDir, "");

        return `const ${name} = this._get("${path}");`;
    },
    export: (path) => {
        if (!path) throw new Error(`${preprocessorData.currentFile} (#export) : No path given`);
        
        path = resolve(preprocessorData.currentDir+path);
        if (!existsSync(path)) throw new Error(`${preprocessorData.currentFile} (#export) : No such file or directory "${ path }"`);
        if (!path.includes(preprocessorData.projectDir)) throw new Error(`${preprocessorData.currentFile} (#export) : Export path is outside the project root directory`);
        path = path.replace(preprocessorData.projectDir, "");

        if (!preprocessorData.exports.includes(path)) preprocessorData.exports.push(path);
        return "";
    }
}

function preprocess(path) {
    let file = readFileSync(path, "utf8")+"\n";
    let str = file;
    preprocessorData.currentFile = path;
    preprocessorData.currentDir = dirname(path)+"/";

    let buffer = "";
    let currentMode = normal;
    let currentStringTerminator;
    let currentDepth = 0;

    try {
        for (let i = 0; i < file.length; i++) {
            currentMode(file[i], file[i-1] ?? "");
        }
    } catch (err) {
        return ["", `${preprocessorData.currentFile} : ${ err.message }`];
    }

    return [str];

    function normal(char, prevChar) {
        if (char == "/" && prevChar == "/") switchMode(lineComment);
        else if (prevChar == "/" && char == "*") switchMode(blockComment);
        else if (char == "\"" || char == "'" || char == "`") { currentStringTerminator = char; switchMode(string) }
        else if (prevChar == "<" && char == ">") switchMode(template);
        else if (char == "{" || char == "(" || char == "[") currentDepth++;
        else if (char == "}" || char == ")" || char == "]") currentDepth--;
        else if (char == "#") switchMode(preprocessorCommand);
    }
    function template(char) {
        buffer += char;
        if (buffer.endsWith("</>")) {
            str = str.replace("<>"+buffer, compileTemplate(buffer.slice(0, -3)));
            buffer = "";
            switchMode(normal);
        }
    }
    function string(char, prevChar) {
        if (char == currentStringTerminator && prevChar != "\\") switchMode(normal);
    }
    function lineComment(char) {
        if (char == "\n") {
            str = str.replace("//"+buffer+"\n", "");
            buffer = "";
            switchMode(normal);
        }
        else buffer += char;
    }
    function blockComment(char, prevChar) {
        if (prevChar == "*" && char == "/") {
            str = str.replace("/*"+buffer+"/", "");
            buffer = "";
            switchMode(normal);
        }
        else buffer += char;
    }
    function preprocessorCommand(char) {
        if (char == ";") {
            str = str.replace("#"+buffer+";", processCommand(buffer));
            buffer = "";
            switchMode(normal);
        } else {
            buffer += char;
            if (char == "\"" || char == "'") { currentStringTerminator = char; switchMode(preprocessorString) };
        }
    }
    function preprocessorString(char, prevChar) {
        buffer += char;
        if (char == currentStringTerminator && prevChar != "\\") switchMode(preprocessorCommand);
    }

    function switchMode(newMode) {
        currentMode = newMode;
    }
}

function processCommand(string) {
    const parsed = parseCommand(string);
    const command = parsed.shift();
    if (!commands[command]) throw new Error(`${preprocessorData.currentFile} : Invalid preprocessor command "#${ command }"`);
    return commands[command](...parsed);
}

function parseCommand(str) {
    const command = [];
    let buffer = "";
    let currentMode = normal;

    for (let i = 0; i < str.length; i++) {
        currentMode(str[i], str[i-1]);
    }
    if (buffer) pushBuffer();

    return command;

    function normal(char) {
        if (char == " " && buffer) pushBuffer();
        else if (char == "\"" || char == "'") switchMode(string);
        else buffer += char;
    }
    function string(char, prevChar) {
        if ((char == "\"" || char == "'") && prevChar != "\\") { pushBuffer(); switchMode(normal) }
        else buffer += char;
    }
    function pushBuffer() {
        command.push(buffer);
        buffer = "";
    }
    function switchMode(newMode) {
        currentMode = newMode;
    }
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

export { preprocess, preprocessorData, clearPreprocessorData };