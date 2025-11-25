class Component {
    url = "";
    lgs = undefined;
    
    constructor(url) {
        this.url = url;
        this.lgs = fetch(this.url).then(res=>res.text())
        .then(t=>this.lgs=t)
        .catch(err => console.error("Failed to load lgs", err));
    }
    async render(target, params) {
        try {
            await this.lgs;
            const html = await _execLgs(this.lgs ?? "", params);
            target.innerHTML = html.replaceAll(/.*script.*/img, "p");
        } catch (error) {
            console.error("Failed to render component : "+error.message);
        }
    }
}

const _execLgs = async (lgs, params = {}) => {
    const lgsFunctions = [
        { id: "export", func: localExport },
        { id: "global", func: globalExport },
        { id: "import", func: importLgs },
        { id: "view", func: view },
        { id: "style", func: style },
        { id: "script", func: script }
    ];

    if (typeof(params) != "object") throw new Error("Typeof render params must be object");
    if (Array.isArray(params)) return params.map(p => {
        const res = lgsExecute(lgs, p);
        return `<style>${res.globals.style ?? ""}</style>` + res.globals.view ?? "";
    }).join("");
    else {
        const res = lgsExecute(lgs, params);
        return `<style>${res.globals.style ?? ""}</style>` + res.globals.view ?? "";
    }

    function lgsExecute(lgs, params = {}) {
        try {
            const parsed = lgsParser(lgs.replaceAll(/\/\*([\s\S]*?)\*\//gm, ""));

            return executeParsedLgs(parsed);
            
            function executeParsedLgs(parsed, importedMem = {}) {
                const mem = { exports: {}, globals: {}, ...params, ...importedMem };
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

    function lgsParser(lgs) {
        let parsedLgs = {};
        let parsingTag = false;
        let parsingAttributes = false;
        let key = "";
        let attributes = "";
        let value = "";

        for (let i = 0; i < lgs.length; i++) {
            const char = lgs[i];
            if (key && !parsingTag) {
                value += char;
                if (value.includes(`</${key}>`)) {
                    value = value.replace(`</${key}>`, "");
                    parsedLgs[key] = value;
                    key = "";
                    value = "";
                }
            }
            
            if (char == ">" && parsingTag) {
                parsingTag = false;
                parsingAttributes = false;
                key = key.trim();
                attributes = attributes.trim();
            }
            if (parsingTag && !parsingAttributes && char == " ") parsingAttributes = true;
            if (parsingTag && !parsingAttributes) key += char;
            if (parsingTag && parsingAttributes) attributes += char;
            if (char == "<" && !key && !parsingTag) parsingTag = true;
        }
        
        for (const [key, value] of Object.entries(parsedLgs)) {
            if (key != "view" && key != "script" && key != "style" && key != "head" && key != "lang") {
                const parsed = lgsParser(value);
                parsedLgs[key] = Object.keys(parsed).length != 0 ? parsed : value;
            }
        }

        return parsedLgs;
    }

    function lgsInterpolate(string, params) {
        if (typeof(params) != "object") throw new Error("Typeof render params must be object");

        let styleImport = "";
        let scriptImport = "";
        
        const varRegex = /(?<!\\)\$\$[^;]+;/;
        const scriptRegex = /(?<!\\)\$\/[^;]+;/;
        
        let expression = string.match(varRegex);
        while (expression) {
            expression = parseExpression(expression[0]);
            string = string.replaceAll(expression.expression, getObjectValue(expression.key, params));
            expression = string.match(varRegex);
        }
    
        // expression = string.match(scriptRegex);
        // while (expression) {
        //     let result;
        //     expression = parseExpression(expression[0]);
    
        //     if (expression.args["!bind"] == "true") result = lgsExecute(expression.key, { ...expression.args, ...mem });
        //     else result = lgsExecute(expression.key, expression.args);
            
        //     styleImport += result.style+"\n";
        //     scriptImport += result.script+"\n";
        //     result = result[type];
            
        //     string = string.replaceAll(expression.expression, result);
        //     expression = string.match(scriptRegex);
        // }
    
        return string;
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

    function localExport(list, mem) {
        if (typeof(list) != "object") throw new Error("Export can only contain tags");
        for (const [ key, value ] of Object.entries(list)) {
            mem.exports[key] = mem[value];
        }
    }
    function globalExport(list, mem) {
        if (typeof(list) != "object") throw new Error("Global can only contain tags");
        for (const [ key, value ] of Object.entries(list)) {
            mem.globals[key] = mem[value];
        }
    }
    function importLgs(list, mem) {
        if (typeof(list) != "object") throw new Error("Import can only contain tags");
        for (const [ key, value ] of Object.entries(list)) {
            if (!mem.globals.imports) mem.globals.imports = {};
            if (!mem.globals.imports[key]) mem.globals.imports[key] = value;
        }
    }
    function view(lgs, mem) {
        mem["globals"]["view"] = lgsInterpolate(lgs, mem, "view");
    }
    function style(lgs, mem) {
        mem["globals"]["style"] = lgsInterpolate(lgs, mem, "style");
    }
    function script(lgs, mem) {
        mem["globals"]["script"] = lgsInterpolate(lgs, mem, "script");
    }
}