class Component {
    url = "";
    
    constructor(url) {
        this.url = url;
    }
    async render(target, params) {
        try {
            const res = await fetch(url);
            if (!res.ok) this.#handleErr(res);
            target.innerHTML = _execLgs(await res.body(), params).replaceAll(/.*script.*/img, "p");
        } catch (error) {
            console.log("Failed to render component : "+error.message);
        }
    }
    #handleErr(res) {
        console.log("Failed to render component");
    }
}

const _fetch = async () => {
    
}

const _replaceNode = () => {

}

const _execLgs = async (lgs, params) => {
    if (typeof(params) != "object") throw new Error("Typeof render params must be object");
    if (Array.isArray(params)) return params.map(p => lgsInterpolate(lgs, p));
    else return lgsInterpolate(lgs, params);

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
}