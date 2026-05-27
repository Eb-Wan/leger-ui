import { rmSync, statSync, watch, existsSync } from "fs";
import { spawn } from "child_process";
import { dirname, resolve } from "path";
import { compile as lguiCompile } from "../lib/lgui-compiler.js";

function main(parsedArgs) {
    if (parsedArgs.flags.includes("-h") | parsedArgs.flags.includes("--help")) help();
    
    if (!parsedArgs.flaggedArgs["-i"]) exitError("No LGUI entrypoint given.");
    if (!parsedArgs.flaggedArgs["-i"].includes(".lgui") || !existsSync(parsedArgs.flaggedArgs["-i"])) {
        exitError("Must be a path to an LGUI file.");
    }
    
    if (!parsedArgs.flaggedArgs["-o"]) exitError("No output directory given.");
    if (parsedArgs.flaggedArgs["-o"] && !existsSync(parsedArgs.flaggedArgs["-o"])) exitError("Output directory doesn't exists.");

    const params = { ...JSON.parse(parsedArgs.flaggedArgs["-a"] ? parsedArgs.flaggedArgs["-a"] : "{}") };
    const outDir = resolve(parsedArgs.flaggedArgs["-o"]);
    const srcFile = resolve(parsedArgs.flaggedArgs["-i"]);
    const srcDir = dirname(parsedArgs.flaggedArgs["-i"]);

    if (!statSync(outDir).isDirectory()) error("output path isn't a directory");
    
    if (parsedArgs.flags.includes("--dev")) {
        if (!outDir.trim().match(/^[A-Za-z0-9\/.~_-\s]+$/)) exitError("Output directory contains illegal characters")
        watchProject();
        const server = spawn(process.argv[0], [resolve(dirname(process.argv[1]))+"/../node_modules/http-server/bin/http-server", "-c-1"], { cwd: outDir });
        parsedArgs.flags.push("-w");
    
        server.stdout.on('data', (data) => console.log(`[ SERVER LOG ] ${data}`));
        server.stderr.on('data', (data) => console.error(`[ SERVER ERROR ] ${data}`));
        server.on('exit', (code) => log(`Server exited with code ${code}`));
        server.on('error', (code) => log(`Server exited with code ${code}`));
    }
    else if (parsedArgs.flags.includes("-w")) watchProject();

    if (parsedArgs.flags.includes("-c")) rmSync(outDir+"/*", { recursive });
    

    compile(srcFile, outDir, params);
    
    function watchProject() {
        log(`Watching "${ srcDir }" for changes`);

        let watcher = watch(srcDir, { recursive: true }, onUpdate);
        
        function onUpdate() {
            compile(srcFile, outDir, params);
            watcher.close();
            setTimeout(() => {
                watcher = watch(srcDir, { recursive: true }, onUpdate);
            }, 1000);
        }
    }
}

function compile(srcFile, outDir, params) {
    try {
        lguiCompile(srcFile, outDir, params);
    }
    catch (err) {
        error(err.message);
    }
}

function parseArgs(argv) {
    const parsedArgs = {
        flags: [],
        args: [],
        flaggedArgs: {}
    };
    let previousArg = "";
    argv.forEach(arg => {
        if (arg[0] == "-") parsedArgs.flags.push(arg);
        else {
            if (previousArg[0] == "-") parsedArgs.flaggedArgs[previousArg] = arg;
            else parsedArgs.args.push(arg);
        }
        previousArg = arg;
    });
    return parsedArgs;
}

function help() {
    console.log(`
        -c : clear output directory before recompiling,
        -i : /path/to/entry.lgui,
        -o : /path/to/output/directory,
        -a : '{ prop: "prop" }',
        -w : watch project directory
        --dev : watch project directory and start dev server
        -h --help : show help message\n`);
    process.exit(0);
}

function log(message, level = "LOG") {
    console.log(`[ ${ level } ] ${ message }`);
}
function warn(message, level = "WARN") {
    console.warn(`[ ${ level } ] ${ message }`);
}
function error(message, level = "ERROR") {
    console.error(`[ ${ level } ] ${ message }`);
}
function exitError(message, level = "ERROR") {
    console.error(`[ ${ level } ] ${ message }`);
    process.exit(1);
}

main(parseArgs(process.argv));