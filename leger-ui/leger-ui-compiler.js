if (!process.argv[2] || !process.argv[2].includes(".json")) {
    console.error(`Must be a path to a JSON file.`);
    process.exit(1);
}
const fs = require("fs");
const path = require("path");
const compilerDir = path.dirname(process.argv[1]);

const config = JSON.parse(fs.readFileSync(compilerDir+"/leger-ui-config.json"));
const templateCompiler = require("./compilers/leger-template-compiler.js");
const procedureCompiler = require("./compilers/leger-procedure-compiler.js");
const commandList = require("./leger-ui-commands.js");

let pageData = {
    importedScripts: [],
    globalParamsList: [],
    templates: [],
    variables: [],
    procedures: []
};

const projectDirectory = path.dirname(process.argv[2]);
const projectFile = JSON.parse(fs.readFileSync(process.argv[2]));

const buildRegex = /\$[\.|\%|\:|\!]/;

if (fs.existsSync(projectDirectory+"/build")) fs.rmSync(projectDirectory+"/build", { recursive: true });
fs.mkdirSync(projectDirectory+"/build");
projectFile.pages.forEach(page => {
    let pageContent = fs.readFileSync(projectDirectory+"/"+page.path, "utf-8");
    pageContent = pageContent.replaceAll(/\/\*([\s\S]*?)\*\//gm, "");
    
    // build
    let regex = buildRegex;
    let expressionIndex = pageContent.search(regex);
    while(expressionIndex != -1) {
        const expression = extractExpression(expressionIndex, pageContent);
        const result = resolveExpression(expression);
        pageContent = pageContent.replaceAll(expression, result);
        expressionIndex = pageContent.search(regex);
    }

    // compile CSS
    const pageCssContent = "";
    // compile templates, variable and procedures into JS
    let pageJSContent = templateCompiler(pageData.templates, projectDirectory)+"\n";
    pageData.variables.forEach(v => pageJSContent += `let ${v.id} = ${(isNaN(v.value) ? '"'+v.value+'"' : v.value) || ""};\n`);
    pageJSContent += procedureCompiler(pageData.procedures, projectDirectory);
    
    if (pageCssContent.length > 0) pageContent = pageContent.replace("</head>", `<link href="./${page.id}.css" rel="stylesheet"></link></head>`);
    if (pageJSContent.length > 0) pageContent = pageContent.replace("</head>", `<script src="./${page.id}.js" defer></script><script src="./leger-js-functions.js" defer></script></head>`);
    pageContent = pageContent.replace(/(\s)\1+|\n/g, "");

    // write files
    fs.writeFileSync(projectDirectory+"/build/"+page.id+".html", pageContent, "utf-8");
    fs.copyFileSync(compilerDir+"/leger-js-functions.js", projectDirectory+"/build/leger-js-functions.js");
    if (pageCssContent.length > 0) fs.writeFileSync(projectDirectory+"/build/"+page.id+".css", pageCSSContent, "utf-8");
    if (pageJSContent.length > 0) fs.writeFileSync(projectDirectory+"/build/"+page.id+".js", pageJSContent, "utf-8");

    pageData = {
        importedScripts: [],
        globalParamsList: [],
        templates: [],
        variables: [],
        procedures: []
    };
});
process.exit(0);


function extractExpression(index, pageContent) {
    let extracted = "";
    let depth = 0;
    while(1) {
        const current = pageContent[index];
        extracted += current;
        index++;
        
        if (pageContent.slice(index, index+2).match(buildRegex)) depth++;
        if (current == ";"){
            if(depth <= 0) break;
            else depth--;
        }
        if (index >= pageContent.length) throw new Error("Missing semi-colon !");
    }
    return extracted;
}

function resolveExpression(expression) {
    expression = parseExpression(expression);

    switch (expression.id) {
        case "$%":
            return resolveGlobalParam(expression.key);
        case "$:":
            return resolveCommand(expression.key, expression.args);
        case "$.":
            return resolveFunction(expression.key, expression.args);
        case "$!":
            return resolveProcedure(expression.key, expression.args);
    
        default:
            break;
    }
    throw new Error(`Unresolvable expression "${expression}" !`);
}

function parseExpression(expression) {
    let parsingArgs = false;
    let identifier = expression.slice(0, 2);
    let key = "";
    let args = "";
    for(let index = 2; index < expression.length - 1; index++) {
        const current = expression[index];
        if (parsingArgs) args += current;
        else {
            if (current == " ") parsingArgs = true;
            else key += current;
        }
    }
    return { id: identifier, key: key.trim(), args: parseArgs(args.trim()+";") };
}

function parseArgs(argString) {
    if (argString==";") return {};
    const args = {};

    let depth = 0;
    let key = "";
    let value = "";
    for(let index = 0; index < argString.length; index++) {
        const current = argString[index];
        
        if (depth == 0) key += current;
        else if (depth > 0) value += current;
        else throw new Error(`Error while parsing arguments "${argString}".`)
        if (index+1 >= argString.length) throw new Error(`Error while parsing arguments "${argString}".`);
        
        if (argString.slice(index+1, index+3) == "=\"") {
            if (depth == 0) index+=2;
            depth++;
        }
        if (argString.slice(index+1, index+3) == "\",") {
            depth--;
            if (depth == 0) {
                args[key.trim()] = value.trim();
                key = "";
                value = "";
                index+=2;
            }
        }
        if (argString.slice(index+1, index+3) == "\";") {
            depth--;
            if (depth == 0) {
                args[key.trim()] = value.trim();
                if (depth == 0) break;
            }
        }
    }
    return args;
}

function resolveFunction(key, params) {
    const id = pageData.importedScripts.find(f => f.id == key);
    if (!id) throw new Error(`Function "${key}" doesn't exists !`);
    let content = fs.readFileSync(projectDirectory+"/"+id.path, "utf-8")
    if (params) {
        for (const [key, value] of Object.entries(params)) {
            content = content.replaceAll("$$"+key+";", value);
        }
    }
    return content;
}

function resolveCommand(key, params) {
    const loadedCommand = commandList.find(c => c.id == key);
    if (!loadedCommand) throw new Error(`Command "${key}" does not exists !`);
    return loadedCommand.method(params, pageData);
}

function resolveGlobalParam(key, params) {
    const globalParam = pageData.globalParamsList.find(p => p.id == key);
    if (!globalParam) throw new Error(`Global param "${key}" does not exists !`);
    return globalParam.value;
}

function resolveProcedure(key, params) {
    pageData.procedures.push({ id:key, params});
    return "";
}

// function encodeEntities(str) {
//   const entities = {
//     "{": "&#123;",
//     "}": "&#125;",
//     "[": "&#91;",
//     "]": "&#93;",
//     ";": "&#59;",
//     ":": "&#58;",
//     ",": "&#44;",
//   };
//   return str.replace(/[{}[\];:,]/g, char => entities[char]);
// }

// function decodeEntities(str) {
//   const entities = {
//     "&#123;": "{",
//     "&#125;": "}",
//     "&#91;": "[",
//     "&#93;": "]",
//     "&#59;": ";",
//     "&#58;": ":",
//     "&#44;": ",",
//   };
//   return str.replace(/&#123;|&#125;|&#91;|&#93;|&#59;|&#58;|&#44;/g, entity => entities[entity]);
// }