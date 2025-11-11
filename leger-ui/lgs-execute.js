const lgsParser = require("./lgs-parser.js");
const lgsFunctions = require("./lgs-functions.js");

/**
 * Executes an LGS script
 * @param {string} path - Path to the script
 * @returns {object} - Results of the script
 */

function executeLgs(path) {
    const mem = {
        declarations: {},
        results: {}
    };
    const parsed = lgsParser(fs.readFileSync(process.argv[2], "utf-8"));

    for (const [key, value] of Object.entries(parsed)) {
        const func = lgsFunctions.find(f => f.id == key);
        
    }

    return mem.results;
}