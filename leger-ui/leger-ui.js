import { existsSync, writeFileSync } from "fs";
import { dirname, basename } from "path";
import { lgsExecute } from "./lgs-interpreter.js";

if (!process.argv[2] || !process.argv[2].includes(".lgs") ||
    !existsSync(process.argv[2])) {
    exitError("Must be a path to an leger script file (lgs).");
}
    
if (process.argv[3] && !existsSync(process.argv[3])) {
    exitError("Output directory doesn't exists.");
}

const projectDirectory = dirname(process.argv[2]);
const outputDirectory = process.argv[3] ? process.argv[3] : dirname(process.argv[2]);

try {
    const results = lgsExecute(basename(process.argv[2]));

    for (const [ key, value ] of Object.entries(results)) {

        // Create the head of the page here
        const regex = /(\s)\1+|\n/gm;
        if (value.view) writeFileSync(`${outputDirectory}/${key}.html`, value.view.replaceAll(regex, ""));
        if (value.style) writeFileSync(`${outputDirectory}/${key}.css`, value.style.replaceAll(regex, ""));
        if (value.script) writeFileSync(`${outputDirectory}/${key}.js`, value.script.replaceAll(regex, ""));
    }

    exitFinished();
} catch (error) {
    exitError(error.message ?? "An error occured", error)
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

export { projectDirectory, outputDirectory };
