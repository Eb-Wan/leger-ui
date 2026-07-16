import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync } from 'fs';
import { basename, dirname, resolve } from 'path';
import { preprocessorData, preprocess, clearPreprocessorData } from './lgui-preprocessor.js';

async function compile(srcFile, outDir, params = {}) {
    clearPreprocessorData();
    const components = [];
    const compilerDir = resolve(dirname(process.argv[1]));
    const srcDir = dirname(srcFile);
    let preprocessingError = false;

    preprocessorData.defined = structuredClone(params);

    preprocessorData.projectDir = srcDir;
    preprocessorData.includes.push(srcFile);
    
    log("Preprocessing project...");
    for (let i = 0; i < preprocessorData.includes.length; i++) {
        const preprocessed = preprocess(preprocessorData.includes[i]);
        if (preprocessed[1]) { preprocessingError = preprocessed[1]; break };
        components.push(`"${preprocessorData.includes[i].replace(preprocessorData.projectDir, "")}": function () {${ preprocessed[0] }}`);
    }

    if (preprocessingError) return preprocessingError;

    log("Compiling project...");
    preprocessorData.exports.forEach(path => {
        let createdPath = outDir;
        const splittedPath = path.split("/").slice(1, -1);
        splittedPath.forEach(e => {
            createdPath += "/"+e;
            if (!existsSync(createdPath)) mkdirSync(createdPath);
        });
        cpSync(srcDir+path, outDir+path, { recursive: true });
    });

    const app = minifyJS(`const _lgui_components = {${components.join()}};\n${ removeComments(readFileSync(compilerDir+"/../lib/lgui-runtime.js", "utf8"))}`);
    const appPath = outDir+"/app.js";
    writeFileSync(appPath, app);

    log("Rendering project...");

    try {
        const { root } = await import(`${appPath}?t=${Date.now()}`);
        const pages = root.pages;
        let lang = root.lang;
        let head = root.head;
    
        if (!lang || typeof lang != "string") { log(`App lang not defined, using "en"`); lang = "en"; }
        if (!head || typeof head != "function") { log(`App head not defined, using default head`); head = defaultHead; }
    
        if (typeof pages != "object" || pages == null || Array.isArray(pages)) return (`LGUI entrypoint doesn't return a "pages" object`);
    
        for (const [key, value] of Object.entries(pages)) {
            try {
                let filename = key[0] == "/" ? key : "/" + key;
                if (filename == "/") filename = "/index.html";
                if (!filename.endsWith(".html")) filename += ".html";
        
                const content = `<body>${root.onrender({ path: value })}</body>`;
                const page = `<!DOCTYPE html><html lang="${ lang }"><head>${ head(root) }</head>${content}`;
                writeFileSync(outDir+filename, page);
                resolve("Done rendering "+value);
            } catch (err) {
                console.error("[ ERROR ] "+err);
            }
        }
    
        function defaultHead(args) {
            return `<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${ args.title ?? "Leger-ui app" }</title><script src="app.js" type="module"></script>`;
        }
    }
    catch (err) {
        console.error("[ ERROR ] Error while rendering project :", err.message);
    }
}

function log(message, level = "LOG") {
    console.log(`[ ${ level } ] ${ message }`);
}

function minifyJS(js) {
    // TODO : encode <pre></pre> whispaces in the template compiler
    return js.replaceAll(/[\r\t\f\v ]{2,}/gm, "").replaceAll(/\n/gm, " ");
}
function removeComments(string) {
    string = string.replaceAll(/\/\*[\s\S]*\*\//gm, "");
    return string.replaceAll(/\/\/.*$/gm, "");
}

export { compile };