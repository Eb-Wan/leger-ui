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
    let killServer = () => null;

    if (parsedArgs.flags.includes("--dev")) {
        if (!outputDirectory.trim().match(/^[A-Za-z0-9\/.~_-\s]+$/)) {
            console.error("Output directory contains illegal characters")
            process.exit(1);
        }
    
        const server = spawn ("npx", ["-y", "http-server", "-c-1"], { cwd: outputDirectory });
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
    
        if (server.pid) killServer = () => process.kill(server.pid);
        else killServer = () => null;
        
        function onUpdate() {
            compile();
            watcher.close();
            setTimeout(() => {
                watcher = watch(projectDirectory, { recursive: true }, onUpdate);
            }, 1000);
        }
    } else if (parsedArgs.flags.includes("-w")) {
        watch(projectDirectory, { recursive: true }, () => {
            // compile();
        });
    }
    // compile();
}

main(parsedArgs);