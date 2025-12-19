import { existsSync, writeFileSync, cpSync, readFileSync, readdirSync, rmSync, watch } from "fs";
import { dirname, basename, join } from "path";
import { ldxCompile } from "./ldx-compile.js";
import { spawn } from "child_process";

const parsedArgs = parseArgs(process.argv);

if (parsedArgs.flags.includes("-h") | parsedArgs.flags.includes("--help")) {
    console.log("-h --help,\n--dev host dev server with HMR,\n-w watch for changes and recompile,\n-c clear output folder before recompiling,\n-i /path/to/entry.lgs,\n-o /path/to/output/folder,\n-a '{ prop: \"prop\" }'")
    process.exit(0);
}

if (!parsedArgs.flaggedArgs["-i"]) exitError("No entry script given.");
if (!parsedArgs.flaggedArgs["-i"].includes(".ldx") ||
    !existsSync(parsedArgs.flaggedArgs["-i"])) {
    exitError("Must be a path to an leger script file (ldx).");
}
 
if (parsedArgs.flaggedArgs["-o"] && !existsSync(parsedArgs.flaggedArgs["-o"])) {
    exitError("Output directory doesn't exists.");
}

const params = { ...JSON.parse(parsedArgs.flaggedArgs["-a"] ? parsedArgs.flaggedArgs["-a"] : "{}") };
const compilerDirectory = dirname(process.argv[1]);
const projectDirectory = dirname(parsedArgs.flaggedArgs["-i"]);
const outputDirectory = parsedArgs.flaggedArgs["-o"] ? parsedArgs.flaggedArgs["-o"] : dirname(parsedArgs.flaggedArgs["-i"]);

if (parsedArgs.flags.includes("--dev")) {
    if (!outputDirectory.trim().match(/^[A-Za-z0-9\/.~_-\s]+$/)) {
        console.error("Output directory contains illegal characters")
        process.exit(1);
    }

    let server = spawn ("npx", ["-y", "http-server"], { cwd: outputDirectory });
    parsedArgs.flags.push("-w");
    watch(projectDirectory, { recursive: true }, () => {
        compile();
    });

    server.stdout.on('data', (data) => {
     console.log(`Server stdout: ${data}`);
    });
    server.stderr.on('data', (data) => {
        console.error(`Server stderr: ${data}`);
    });
    server.on('close', (code) => {
        console.log(`Server process exited with code ${code}`);
    });
} else if (parsedArgs.flags.includes("-w")) {
    watch(projectDirectory, { recursive: true }, () => {
        compile();
    });
}

compile();

function compile() {
    try {
        
        ldxCompile(basename(parsedArgs.flaggedArgs["-i"]), params);

        // if (parsedArgs.flags.includes("-v")) console.log(results);
        // if (outputDirectory != projectDirectory) {
        //     if (parsedArgs.flags.includes("-c")) {
        //         const files = readdirSync(outputDirectory);
        //         files.map(file => rmSync(join(outputDirectory, file), { recursive: true }));
        //     }
        //     cpSync(projectDirectory, outputDirectory, { recursive: true });
        // }
        // if (outputDirectory != projectDirectory) cpSync(projectDirectory, outputDirectory, { recursive: true });
    
        // for (const [ key, value ] of Object.entries(results)) {
        //     if (key == "exports" || key == "globals" || typeof(value) != "object") continue;
        //     const regex = /(\s)\1+|\n/gm;
        //     if (value.style) writeFileSync(`${outputDirectory}/${key}.css`, value.style.replaceAll(regex, ""));
        //     if (value.script) {
        //         value.script = readFileSync(compilerDirectory+"/lgs-lib.js", "utf-8") + value.script;
        //         writeFileSync(`${outputDirectory}/${key}.js`, value.script);
        //     }
        //     if (value.view) {
        //         const lang = value.lang ? value.lang : "en";
        //         const head = value.head ? value.head : "";
        //         const styleImport = value.style ? `<link rel="stylesheet" href="${key}.css">` : "";
        //         const scriptImport = value.script ? `<script src="${key}.js" defer></script>` : "";
        //         const html = `<!DOCTYPE html><meta name="viewport" content="width=device-width, initial-scale=1.0"><html lang="${lang}"><head>${head}${styleImport}${scriptImport}</head><body>${value.view}</body></html>`
        //         writeFileSync(`${outputDirectory}/${key}.html`, html.replaceAll(regex, ""));
        //     }
        // }
    
        exitFinished();
    } catch (error) {
        exitError(error.message ?? "An error occured", error)
    }
}

function exitFinished() {
    console.log(`\nLEGER-COMPILER : Done executing ${parsedArgs.flaggedArgs["-i"]} !`)
    if (!parsedArgs.flags.includes("-w")) process.exit(0);
}
function exitError(message, error) {
    console.log("\nLEGER-COMPILER : "+message+"\n");
    if (error) console.log(error);
    if (!parsedArgs.flags.includes("-w")) process.exit(1);
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

export { projectDirectory, outputDirectory, compilerDirectory };
