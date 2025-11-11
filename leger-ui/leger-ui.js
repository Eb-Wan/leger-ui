const fs = require("fs");
const path = require("path");

if (!process.argv[2] || !process.argv[2].includes(".lgs") || !fs.existsSync(process.argv[2])) exitError("Must be a path to an leger script file (lgs).");
if (process.argv[3] && !fs.existsSync(process.argv[3])) exitError("Output directory doesn't exists.");

const projectDirectory = path.dirname(process.argv[2]);
const outputDirectory = process.argv[3] ? process.argv[3] : path.dirname(process.argv[2]);

function executeScript (path) {
    
}

function exitFinished() {
    console.log(`\nLEGER-COMPILER : Done compiling ${process.argv[2]} !`)
    process.exit(0);
}
function exitError(message, error) {
    console.log("\nLEGER-COMPILER : "+message+"\n");
    if (error) console.log(error);
    process.exit(1);
}