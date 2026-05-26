import { watch } from "fs";
import { spawn } from "child_process";
import { dirname, resolve } from "path";

const parsedArgs = parseArgs(process.argv);

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

function main(parsedArgs) {
    const projectDirectory = resolve(dirname(parsedArgs.flaggedArgs["-i"]));
    const outputDirectory = resolve(parsedArgs.flaggedArgs["-o"]);
    if (parsedArgs.flags.includes("--dev")) {
        
        if (!outputDirectory.trim().match(/^[A-Za-z0-9\/.~_-\s]+$/)) {
            console.error("Output directory contains illegal characters")
            process.exit(1);
        }
        watchProject();
        const server = spawn(process.argv[0], [resolve(dirname(process.argv[1]))+"/node_modules/http-server/bin/http-server", "-c-1"], { cwd: outputDirectory });
        parsedArgs.flags.push("-w");
    
        server.stdout.on('data', (data) => {
            console.log(`Server stdout: ${data}`);
        });
        server.stderr.on('data', (data) => {
            console.error(`Server stderr: ${data}`);
        });
        server.on('exit', (code) => {
            console.log(`Server process exited with code ${code}`);
        });
    } else if (parsedArgs.flags.includes("-w")) watchProject();

    compile();
    
    function watchProject() {
        console.log(`Watching "${ projectDirectory }" for changes`);

        let watcher = watch(projectDirectory, { recursive: true }, onUpdate);
        
        function onUpdate() {
            compile();
            watcher.close();
            setTimeout(() => {
                watcher = watch(projectDirectory, { recursive: true }, onUpdate);
            }, 1000);
        }
    }
}


function compile() {
    const compiler = spawn (process.argv[0], [dirname(process.argv[1])+"/lib/lgui-compiler.js", ...process.argv.slice(2)]);

    compiler.stdout.on('data', (data) => {
        console.log(data.toString().slice(0, -1));
    });
    compiler.stderr.on('data', (data) => {
        console.error(data.toString().slice(0, -1));
    });
    compiler.on('exit', (code) => {
        console.log(`Compiler exited with code ${code}`);
    });
    compiler.on("error", (code) => {
        console.log(`Compiler exited with code ${code}`);
    });

}

main(parsedArgs);