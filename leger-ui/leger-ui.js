const fs = require("fs");
const path = require("path");
const lgsParse = require("./lgs-parser.js");

if (!process.argv[2] || !process.argv[2].includes(".lgs") || !fs.existsSync(process.argv[2])) exitError("Must be a path to an leger script file (lgs).");
if (process.argv[3] && !fs.existsSync(process.argv[3])) exitError("Output directory doesn't exists.");

const projectDirectory = path.dirname(process.argv[2]);
const outputDirectory = process.argv[3] ? process.argv[3] : path.dirname(process.argv[2]);

executeScript(process.argv[2]);

/**
 * Execute an LGS script
 * @param {string} path - Path to the script
 * @returns {object} - Results of the script
 */

function executeScript(path) {
    const parsed = lgsParse(fs.readFileSync(process.argv[2], "utf-8"));
}

function exitFinished() {
    console.log(`\nLEGER-COMPILER : Done executing ${process.argv[2]} !`)
    process.exit(0);
}
function exitError(message, error) {
    console.log("\nLEGER-COMPILER : "+message+"\n");
    if (error) console.log(error);
    process.exit(1);
}