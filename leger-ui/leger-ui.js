import { existsSync, watch } from "fs";
import { dirname, basename } from "path";
import { lgsCompile } from "./lgs-compile.js";
import { spawn } from "child_process";

const parsedArgs = parseArgs(process.argv);

if (parsedArgs.flags.includes("-h") | parsedArgs.flags.includes("--help")) {
    console.log("-h --help,\n--dev host dev server with HMR,\n-w watch for changes and recompile,\n-c clear output folder before recompiling,\n-i /path/to/entry.lgs,\n-o /path/to/output/folder,\n-a '{ prop: \"prop\" }'")
    process.exit(0);
}

if (!parsedArgs.flaggedArgs["-i"]) exitError("No JSON compile file given.");
if (!parsedArgs.flaggedArgs["-i"].includes(".json") ||
    !existsSync(parsedArgs.flaggedArgs["-i"])) {
    exitError("Must be a path to an JSON file.");
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

    let server = spawn ("npx", ["-y", "http-server", "-c-1"], { cwd: outputDirectory });
    parsedArgs.flags.push("-w");
    let watcher = watch(projectDirectory, { recursive: true }, onUpdate);

    server.stdout.on('data', (data) => {
        console.log(`Server stdout: ${data}`);
    });
    server.stderr.on('data', (data) => {
        console.error(`Server stderr: ${data}`);
    });
    server.on('close', (code) => {
        console.log(`Server process exited with code ${code}`);
    });

    function onUpdate() {
        compile();
        watcher.close();
        setTimeout(() => {
            watcher = watch(projectDirectory, { recursive: true }, onUpdate);
        }, 1000);
    }
} else if (parsedArgs.flags.includes("-w")) {
    watch(projectDirectory, { recursive: true }, () => {
        compile();
    });
}

compile();

function compile() {
    try {
        lgsCompile(basename(parsedArgs.flaggedArgs["-i"]), params);
    } catch (error) {
        exitError(error.message ?? "An error occured", error)
    }
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
