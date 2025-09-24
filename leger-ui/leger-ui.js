const fs = require("fs");
const path = require("path");

if (!process.argv[2] || !process.argv[2].includes(".json") || !fs.existsSync(process.argv[2])) {
    console.error(`Must be a path to a JSON file.`);
    process.exit(1);
}
if (process.argv[3] && !fs.existsSync(process.argv[3])) {
    console.error("Output directory doesn't exists.");
} 

const compilerDir = path.dirname(process.argv[1]);
const config = JSON.parse(fs.readFileSync(compilerDir+"/leger-ui-config.json"));
const procedureCompiler = require("./compilers/leger-procedure-compiler.js");
const commandList = require("./leger-ui-commands.js");

let pageData = {
    importedCss: [],
    importedScripts: [],
    globalParams: [],
    variables: [],
    procedures: []
};

const projectDirectory = path.dirname(process.argv[2]);
const outputDirectory = process.argv[3] ? path.dirname(process.argv[3]) : path.dirname(process.argv[2]);
const projectFile = JSON.parse(fs.readFileSync(process.argv[2]));

const buildRegex = /\$[\.|\%|\:|\!]/;

if (fs.existsSync(outputDirectory+"/views")) fs.rmSync(outputDirectory+"/views", { recursive: true });
fs.mkdirSync(outputDirectory+"/views");
projectFile.pages.forEach(page => {
    pageData.globalParams = [{ id: "pageId", value: page.id }, ...projectFile.globalParams];
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

    
    // compile templates, variable and procedures into JS
    let pageJsContent = templateCompiler(pageData.importedScripts, projectDirectory)+"\n";
    pageData.variables.forEach(v => pageJsContent += `let ${v.id} = ${(isNaN(v.value) ? '"'+v.value+'"' : v.value) || ""};\n`);
    pageJsContent += procedureCompiler(pageData.procedures, projectDirectory);
    
    // compile CSS
    let pageCssContent = "";
    pageData.importedCss.forEach(c => pageCssContent += fs.readFileSync(projectDirectory+"/"+c.path, "utf-8")+"\n");
    
    if (pageCssContent.length > 0) pageContent = pageContent.replace("</head>", `<link href="./${page.id}.css" rel="stylesheet"></link></head>`);
    if (pageJsContent.length > 0) pageContent = pageContent.replace("</head>", `<script src="./${page.id}.js" defer></script><script src="./leger-js-functions.js" defer></script></head>`);
    pageContent = pageContent.replace(/(\s)\1+|\n/g, "");

    // write files
    fs.writeFileSync(outputDirectory+"/views/"+page.id+".html", pageContent, "utf-8");
    fs.copyFileSync(compilerDir+"/leger-js-functions.js", outputDirectory+"/views/leger-js-functions.js");
    if (pageCssContent.length > 0) fs.writeFileSync(outputDirectory+"/views/"+page.id+".css", pageCssContent, "utf-8");
    if (pageJsContent.length > 0) fs.writeFileSync(outputDirectory+"/views/"+page.id+".js", pageJsContent, "utf-8");

    pageData = {
        importedScripts: [],
        importedCss: [],
        globalParams: [],
        variables: [],
        procedures: []
    };
});
process.exit(0);

function templateCompiler(templates, projectDirectory) {
    try {
        let compiledTemplates = "";
        templates.forEach((t, index) => {
            let template = fs.readFileSync(projectDirectory+"/"+t.path, "utf-8").replace(/(\s)\1+|\n/g, "");
            if (template.includes("`")) throw new Error(`Template "${t.id}" contains backticks !`);

            // build
            let regex = buildRegex;
            let expressionIndex = template.search(regex);
            while(expressionIndex != -1) {
                const expression = extractExpression(expressionIndex, template);
                const result = resolveExpressionTemplate(expression, t.id);
                template = template.replaceAll(expression, result);
                expressionIndex = template.search(regex);
            }

            compiledTemplates += `${t.id}:\`${template}\`${index != templates.length - 1 ?",":""}`;
        });
        return `const templates = {${compiledTemplates}};`;
    } catch (error) {
        console.log("Error while compiling templates.", error);
        process.exit(1);
    }
}

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

function resolveExpressionTemplate(expression, id) {
    expression = parseExpression(expression);

    switch (expression.id) {
        case "$%":
            return resolveGlobalParam(expression.key);
        case "$:":
            return resolveCommand(expression.key, expression.args);
        case "$.":
            console.log("Warning: Imported scripts in template \"" + id + "\". Scripts are not rendered in templates.");
            return "";
        case "$!":
            console.log("Warning: Procedure declaration in template \"" + id + "\". Declaration are not used in templates.");
            return "";
    
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
    const globalParam = pageData.globalParams.find(p => p.id == key);
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