const fs = require("fs");
const lgsParser = require("./lgs-parser.js");
const lgsFunctions = require("./lgs-functions.js");

/**
 * Executes an LGS script
 * @param {string} path - Path to the script
 * @returns {object} - Results of the script ({ view, style, script })
 */

function executeLgs(path) {
    if (!fs.existsSync(path)) throw new Error(`Script ${path} doesn't exist.`)
    try {
        const parsed = lgsParser(fs.readFileSync(path, "utf-8"));
        const mem = { variables : {} };
    
        executeParsedLgs(parsed);
        
        function executeParsedLgs(parsed) {
            for (const [ key, value ] of Object.entries(parsed)) {
                const func = lgsFunctions.find(f => f.id == key);
    
                if (func && func.func) func.func(value, mem);
                else if (typeof parsed[key] == "object") executeParsedLgs(parsed[key]);
                else mem.variables[key] = value;
            }
        }
    
        return {
            view: mem.view ?? {},
            style: mem.style ?? {},
            script: mem.script ?? {}
        };
    } catch (error) {
        throw error;
    }
}

module.exports = executeLgs;