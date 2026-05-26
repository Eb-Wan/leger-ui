import { existsSync, readFileSync, statSync, writeFileSync, mkdirSync, cpSync } from 'fs';
import { basename, dirname, resolve } from 'path';
import { defined, preprocess } from './lgui-preprocessor.js';

const parsedArgs = parseArgs(process.argv);

async function compile(srcFile, outDir, params = {}) {
    const components = [];
    const compilerDir = resolve(dirname(process.argv[1]));

    if (!existsSync(outDir)) error("output directory doesn't exists");
    if (!statSync(outDir).isDirectory()) error("output path isn't a directory");
    outDir = resolve(outDir);
    let srcDir = resolve(dirname(srcFile));

    defined.appName = basename(srcFile).replaceAll(".lgui", ".js");
    Object.assign(defined, params);

    defined.projectDir = resolve(dirname(srcFile));
    defined.includes.push(resolve(srcFile.replace(defined.projectDir, "")));
    
    log("preprocessing project");
    for (let i = 0; i < defined.includes.length; i++) {
        components.push(`"${defined.includes[i].replace(defined.projectDir, "")}": function () {${preprocess(defined.includes[i])}}`);
    }

    log("compiling project");
    defined.exports.forEach(path => {
        let createdPath = outDir;
        const splittedPath = path.split("/").slice(1, -1);
        splittedPath.forEach(e => {
            createdPath += "/"+e;
            if (!existsSync(createdPath)) mkdirSync(createdPath);
        });
        cpSync(srcDir+path, outDir+path, { recursive: true });
    });

    const app = minifyJS(`const _lgui_components = {${components.join()}};\n${ removeComments(readFileSync(compilerDir+"/lgui-runtime.js", "utf8"))}`);
    const appPath = outDir+"/"+(defined.appName ?? "app.js");
    writeFileSync(appPath, app);

    log("rendering project");

    try {
        const { LGUIElement } = await import(`${appPath}`);
        const root = new LGUIElement("/"+basename(srcFile));
        const pages = root.pages;
        let lang = root.lang;
        let head = root.head;

        if (!lang || typeof lang != "string") { info(`App lang not defined, using "en"`); lang = "en"; }
        if (!head || typeof head != "function") { info(`App head not defined, using default head`); head = defaultHead; }

        if (typeof pages != "object" || pages == null || Array.isArray(pages)) error(`LGUI entrypoint doesn't return a "pages" object`);

        for (const [key, value] of Object.entries(pages)) {
            let filename = key[0] == "/" ? key : "/" + key;
            if (filename == "/") filename = "/index.html";
            if (!filename.endsWith(".html")) filename += ".html";

            const content = `<body>${root.onrender({ path: value })}</body>`;
            const page = `<!DOCTYPE html><html lang="${ root.lang }"><head>${ head(root) }</head>${content}`;
            writeFileSync(outDir+filename, page);
        }

        function defaultHead(args) {
            return `<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${ args.title ?? "Leger-ui app" }</title><script src="${ defined.appName }" type="module"></script>`;
        }

    } catch (err) { error("Failed to compile app : "+err.message); }

    log("done");
    process.exit(0);
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

function log(message, level = "LOG") {
    console.log(`[ ${ level } ] ${ message }`);
}
function warn(message, level = "WARN") {
    console.warn(`[ ${ level } ] ${ message }`);
}
function error(message, level = "ERROR") {
    console.error(`[ ${ level } ] ${ message }`);
    process.exit(1);
}

function minifyJS(js) {
    let depth = 0;
    let buffer = "";
    let processedJs = "";

    for (let i = 0; i < js.length; i++) {
        buffer += js[i];
        if (buffer.includes("<pre>")) {
            processedJs += buffer;
            buffer = "";
            depth++;
        } else if (depth > 0 && buffer.includes("</pre>")) {
            processedJs += buffer.replaceAll(/\n/gm, "\\n").replaceAll(/\t/gm, "\\t").replaceAll(/\s/gm, "\\s");
            buffer = "";
            depth--;
        }
    }
    processedJs += buffer;
    return processedJs.replaceAll(/[\r\t\f\v ]{2,}/gm, "").replaceAll(/\n/gm, "").replaceAll(/\\s/gm, " ");
}
function removeComments(string) {
    string = string.replaceAll(/\/\*[\s\S]*\*\//gm, "");
    return string.replaceAll(/\/\/.*$/gm, "");
}

main(parsedArgs);