class LgsTemplate {
    template = "";

    constructor(template) {
        this.template = template;
    }

    render(params) {
        if (typeof(params) != "object") throw new Error("Typeof render params must be object");
        if (Array.isArray(params)) return params.map(p => this.#lgsInterpolate(p));
        else return this.#lgsInterpolate(params);
    }

    #lgsInterpolate(params) {
        if (typeof(params) != "object") throw new Error("Typeof render params must be object");

        let styleImport = "";
        let scriptImport = "";
        
        const varRegex = /(?<!\\)\$\$[^;]+;/;
        const scriptRegex = /(?<!\\)\$\/[^;]+;/;
        
        let expression = string.match(varRegex);
        while (expression) {
            expression = this.#parseExpression(expression[0]);
            string = string.replaceAll(expression.expression, this.#getObjectValue(expression.key, params));
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

    #getObjectValue(key, obj) {
        let value = obj;
        key = key.split(".");
        key.forEach(e => value = (typeof(value) == "object" ? value[e] ?? "" : ""));
        return value;
    }

    #parseExpression(expression) {
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
        return { expression, id: identifier, key: key.trim(), args: this.#parseArgs(args.trim()+";"), argsString: args };
    }

    #parseArgs(argString) {
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