import { existsSync, readFileSync } from "fs";
import { projectDirectory, outputDirectory } from "./leger-ui.js";
import { lgsParser } from "./lgs-parsers.js";
import lgsFunctions from "./lgs-functions.js";

/**
 * Executes an LGS script
 * @param {string} path - Path to the script
 * @returns {object} - Results of the script ({ view, style, script })
 */

function lgsExecute(path, params = {}) {
    path = projectDirectory+"/"+path;
    
    if (!existsSync(path)) throw new Error(`Script ${path} doesn't exist.`)
    try {
        const parsed = lgsParser(readFileSync(path, "utf-8").replaceAll(/\/\*([\s\S]*?)\*\//gm, ""));
    
        return executeParsedLgs(parsed, params);
        
        function executeParsedLgs(parsed, params = {}) {
            const mem = { exports: {}, globals: {}, ...structuredClone(params) };
            for (const [ key, value ] of Object.entries(parsed)) {
                const func = lgsFunctions.find(f => f.id == key);
    
                if (func && func.func) func.func(value, mem);
                else if (typeof(value) == "object")mem[key] = executeParsedLgs(parsed[key], mem);
                else mem[key] = value;
            }
            
            const returned = {
                ...mem.exports ?? {},
                ...mem.globals ?? {},
                exports: {},
                globals: { ...mem.globals ?? {} }
            }

            return returned;
        }
    } catch (error) {
        throw error;
    }
}

/**
 * Replaces LGS expressions with their results
 * @param {string} string
 * @param {object} mem
 * @param {string} type
 * @returns {string}
*/

function lgsInterpolate(string, mem, type) {
    let styleImported = "";
    let scriptImported = ""
    
    // replace props ($$var;)
    let expression = findPropsExpression(string);
    while (expression) {
        expression = parseExpression(expression);
        string = string.replaceAll(expression.expression, getObjectValue(expression.key, mem) ?? "");
        expression = findPropsExpression(string);
    }
    
    // replace scripts ($/script;)
    expression = findScriptExpression(string);
    while (expression) {
        let result;
        expression = parseExpression(expression);

        const imports = mem.globals.imports ?? {};
        const path = imports[expression.key];
        if (!path) throw new Error(`Call to non-imported script "${expression.key}".`);

        if (expression.args["!bind"] == "true") result = lgsExecute(path, { ...expression.args, ...mem });
        else result = lgsExecute(path, { ...expression.args, globals: mem.globals, ...mem.globals });
        
        styleImported += result.style ?? "" +"\n";
        scriptImported += result.script ?? "" +"\n";
        result = result[type];
        string = string.replaceAll(expression.expression, result ?? "");
        expression = findScriptExpression(string);
    }

    // automatically add css and js if nothing is present
    if (type == "view") {
        if (!mem.exports.style) mem["exports"]["style"] = styleImported;
        if (!mem.exports.script) mem["exports"]["script"] = scriptImported;
    }

    return string;
    
    function findPropsExpression(string) {
        return extractExpression(string, /(?<!\\)\$\$/);
    }
    
    function findScriptExpression(string) {
        return extractExpression(string, /(?<!\\)\$\//);
    }
    function extractExpression(string, regex) {
        let index = string.search(regex);
        if (index == -1) return "";
        
        let extracted = "";
        let depth = 0;
        for (let i = 0; i < string.length; i++) {
            const current = string[index];
            extracted += current;
            index++;
            
            if (string.slice(index, index+2).match(regex)) depth++;
            if (current == ";"){
                if(depth <= 0) return extracted;
                else depth--;
            }
        }
        throw new Error("Missing semi-colon !");
    }
    
    function getObjectValue(key, obj) {
        let value = obj;
        key = key.split(".");
        key.forEach(e => value = (typeof(value) == "object" ? value[e] ?? "" : ""));
        return value;
    }
    
    function parseExpression(expression) {
        let parsingArgs = false;
        let identifier = expression.slice(0, 2);
        let key = "";
        let args = "";
        for (let index = 2; index < expression.length - 1; index++) {
            const current = expression[index];
            if (parsingArgs) args += current;
            else {
                if (current == " ") parsingArgs = true;
                else key += current;
            }
        }
        return { expression, id: identifier, key: key.trim(), args: parseArgs(args.trim()+";"), argsString: args };
    }
    
    function parseArgs(argString) {
        if (argString==";") return {};
        const args = {};
    
        let depth = 0;
        let key = "";
        let value = "";
        for (let index = 0; index < argString.length; index++) {
            const current = argString[index];
            
            if (depth == 0) key += current;
            else if (depth > 0) value += current;
            else throw new Error(`Error while parsing arguments "${argString}".`)
            
            if (index+1 >= argString.length) throw new Error(`Error while parsing arguments "${argString}".`);
            
            if (argString.slice(index+1, index+3) == "=\"") {
                if (depth == 0) index+=2;
                depth++;
            }
            if (argString.slice(index+1, index+3) == "\" ") {
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
}

export { lgsExecute, lgsInterpolate };