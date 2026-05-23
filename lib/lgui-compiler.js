import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, cpSync } from 'fs';
import { basename, dirname, resolve } from 'path';
import { defined, preprocess } from './lgui-preprocessor.js';

const parsedArgs = parseArgs(process.argv);

function compile(srcFile, outDir, params) {
    const compilerDir = dirname(process.argv[1]);
    defined.projectDir = resolve(dirname(srcFile));

    defined.includes.push(srcFile.replace(defined.projectDir, ""));
    
    for (let i = 0; i < defined.includes.length; i++) {
        preprocess(defined.includes[i]);
    }

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

function exitError(message, error) {
    console.log("LGUI-COMPILER : "+message+"\n");
    if (error) console.log(error);
    process.exit(1);
}

function main(parsedArgs) {
    if (parsedArgs.flags.includes("-h") | parsedArgs.flags.includes("--help")) {
        console.log("-h --help, \n-c clear output directory before recompiling,\n-i /path/to/entry.lgui,\n-o /path/to/output/directory,\n-a '{ prop: \"prop\" }'")
        process.exit(0);
    }
    if (!parsedArgs.flaggedArgs["-i"]) exitError("No LGUI entrypoint given.");
    if (!parsedArgs.flaggedArgs["-i"].includes(".lgui") ||
        !existsSync(parsedArgs.flaggedArgs["-i"])) {
        exitError("Must be a path to an LGUI file.");
    }
    
    if (!parsedArgs.flaggedArgs["-o"]) exitError("No output directory given.");
    if (parsedArgs.flaggedArgs["-o"] && !existsSync(parsedArgs.flaggedArgs["-o"])) {
        exitError("Output directory doesn't exists.");
    }

    const params = { ...JSON.parse(parsedArgs.flaggedArgs["-a"] ? parsedArgs.flaggedArgs["-a"] : "{}") };
    const outDir = parsedArgs.flaggedArgs["-o"];
    const srcFile = parsedArgs.flaggedArgs["-i"];
    
    compile(srcFile, outDir, params);
}

main(parsedArgs);