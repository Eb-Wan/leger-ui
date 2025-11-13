import { existsSync, writeFileSync } from "fs";
import { dirname, basename } from "path";
import { lgsExecute } from "./lgs-interpreter.js";

const parsed = parseArgs(process.argv);

if (parsed.flags.includes("-h") | parsed.flags.includes("--help")) {
    console.log("-h, --help, -i /path/to/entry.lgs, -o /path/to/output/folder, -a '{ prop: \"prop\" }'")
    process.exit(0);
}

if (!parsed.flaggedArgs["-i"]) exitError("No entry script given.");
if (!parsed.flaggedArgs["-i"].includes(".lgs") ||
    !existsSync(parsed.flaggedArgs["-i"])) {
    exitError("Must be a path to an leger script file (lgs).");
}
    
if (parsed.flaggedArgs["-o"] && !existsSync(parsed.flaggedArgs["-o"])) {
    exitError("Output directory doesn't exists.");
}

const params = { ...JSON.parse(parsed.flaggedArgs["-a"] ? parsed.flaggedArgs["-a"] : "{}") };
const projectDirectory = dirname(parsed.flaggedArgs["-i"]);
const outputDirectory = parsed.flaggedArgs["-o"] ? parsed.flaggedArgs["-o"] : dirname(parsed.flaggedArgs["-i"]);

try {
    const results = lgsExecute(basename(parsed.flaggedArgs["-i"]), params);

    for (const [ key, value ] of Object.entries(results)) {
        const regex = /(\s)\1+|\n/gm;
        if (value.style) writeFileSync(`${outputDirectory}/${key}.css`, value.style.replaceAll(regex, ""));
        if (value.script) writeFileSync(`${outputDirectory}/${key}.js`, value.script.replaceAll(regex, ""));
        if (value.view) {
            const lang = value.lang ? value.lang : "en";
            const head = value.head ? value.head : "";
            const styleImport = value.style ? `<link rel="stylesheet" href="${key}.css">` : "";
            const scriptImport = value.script ? `<script src="${key}.js" delay></script>` : "";
            const html = `<!DOCTYPE html><html lang="${lang}"><head>${head}${styleImport}${scriptImport}</head><body>${value.view}</body></html>`
            writeFileSync(`${outputDirectory}/${key}.html`, html.replaceAll(regex, ""));
        }
    }

    exitFinished();
} catch (error) {
    exitError(error.message ?? "An error occured", error)
}

function exitFinished() {
    console.log(`\nLEGER-COMPILER : Done executing ${parsed.flaggedArgs["-i"]} !`)
    process.exit(0);
}
function exitError(message, error) {
    console.log("\nLEGER-COMPILER : "+message+"\n");
    if (error) console.log(error);
    process.exit(1);
}

function parseArgs(array) {
    const parsedArgs = {
        flags: [],
        args: [],
        flaggedArgs: {}
    };
    let previousArg = "";
    array.forEach(arg => {
        if (arg[0] == "-") parsedArgs.flags.push(arg);
        else {
            if (previousArg[0] == "-") parsedArgs.flaggedArgs[previousArg] = arg;
            else parsedArgs.args.push(arg);
        }
        previousArg = arg;
    });
    return parsedArgs;
}

export { projectDirectory, outputDirectory };
