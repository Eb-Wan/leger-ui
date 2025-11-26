import { existsSync, writeFileSync, readFileSync, cpSync } from "fs";
import { dirname, basename } from "path";
import { lgsExecute } from "./lgs-interpreter.js";

const parsedArgs = parseArgs(process.argv);

if (parsedArgs.flags.includes("-h") | parsedArgs.flags.includes("--help")) {
    console.log("-h, --help, -i /path/to/entry.lgs, -o /path/to/output/folder, -a '{ prop: \"prop\" }'")
    process.exit(0);
}

if (!parsedArgs.flaggedArgs["-i"]) exitError("No entry script given.");
if (!parsedArgs.flaggedArgs["-i"].includes(".lgs") ||
    !existsSync(parsedArgs.flaggedArgs["-i"])) {
    exitError("Must be a path to an leger script file (lgs).");
}
    
if (parsedArgs.flaggedArgs["-o"] && !existsSync(parsedArgs.flaggedArgs["-o"])) {
    exitError("Output directory doesn't exists.");
}

const params = { ...JSON.parse(parsedArgs.flaggedArgs["-a"] ? parsedArgs.flaggedArgs["-a"] : "{}") };
const compilerDir = dirname(process.argv[1]);
const projectDirectory = dirname(parsedArgs.flaggedArgs["-i"]);
const outputDirectory = parsedArgs.flaggedArgs["-o"] ? parsedArgs.flaggedArgs["-o"] : dirname(parsedArgs.flaggedArgs["-i"]);

try {
    const results = lgsExecute(basename(parsedArgs.flaggedArgs["-i"]), params);
    if (parsedArgs.flags.includes("-v")) console.log(results);
    if (outputDirectory != projectDirectory) cpSync(projectDirectory, outputDirectory, { recursive: true });

    for (const [ key, value ] of Object.entries(results)) {
        if (key == "exports" || key == "globals" || typeof(value) != "object") continue;
        const regex = /(\s)\1+|\n/gm;
        if (value.style) writeFileSync(`${outputDirectory}/${key}.css`, value.style.replaceAll(regex, ""));
        if (value.script) {
            value.script = readFileSync(compilerDir+"/lgs-lib.js", "utf-8") + value.script;
            writeFileSync(`${outputDirectory}/${key}.js`, value.script);
        }
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
    console.log(`\nLEGER-COMPILER : Done executing ${parsedArgs.flaggedArgs["-i"]} !`)
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
