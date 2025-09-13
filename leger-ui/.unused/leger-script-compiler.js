const keywords = require("../leger-script-keywords.js");
const wordRegex = /[A-z\-\_\$\#\.]+[\s|\n]/;
// const functionRegex = /[A-z]+\s/;

function compiler(script) {
    let regex = wordRegex;
    let expressionIndex = script.search(regex);
    let compiledScript = "";
    while(expressionIndex != -1) {
        const expression = extractExpression(expressionIndex, script, "\n");
        const parsedExpression = parseExpression(expression);
        compiledScript += resolve(parsedExpression);
        script = script.replace(expression, "");
        break;
        // expressionIndex = script.search(regex);
    }
}

function extractExpression(index, expression, terminator) {
    let extracted = "";
    let depth = 0;
    let ignoringString = false;
    while(1) {
        const current = expression[index];
        if (current == "\"") ignoringString = !ignoringString;
        if (!ignoringString) {
            if (current == "{") depth++;
            if (current == "}") depth--;
            if(depth <= 0 && !ignoringString && current == terminator) break;
        }
        if (index >= expression.length) {
            if (depth > 0) throw new Error(`Unterminated string or block in ${ extracted } !`);
            else break;
        } else {
            extracted += current;
            index++;
        }
    }
    return extracted;
}

function parseExpression(expression) {
    console.log("parsing :", expression)

    let args = [];
    let currentArg = "";
    let i = 0;
    while(i < expression.length) {
        currentArg = extractExpression(i, expression, " ");
        i += currentArg.length + 1;
        args.push(currentArg);
        console.log(currentArg)
        currentArg = "";
    }
    return args;
}

function resolve(args) {
    if (!args[0]) throw new Error("Fatal error !")
    const method = keywords.find(v => v.id == args[0]);
    if (args[0][0] = "#") return keywords[1].method(args)+"\n";
    else if (method) return method(args)+"\n";
    else return keywords[0].method(args)+"\n";
}

module.exports = compiler;