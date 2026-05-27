import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync } from 'fs';
import { basename, dirname, resolve } from 'path';
import { defined, preprocess } from './lgui-preprocessor.js';

async function compile(srcFile, outDir, params = {}) {
    try {

        const components = [];
        const compilerDir = resolve(dirname(process.argv[1]));
        const srcDir = dirname(srcFile);

        defined.appName = basename(srcFile).replaceAll(".lgui", ".js");
        Object.assign(defined, params);

        defined.projectDir = srcDir;
        defined.includes.push(srcFile);
        
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

        const app = minifyJS(`const _lgui_components = {${components.join()}};\n${ removeComments(readFileSync(compilerDir+"/../lib/lgui-runtime.js", "utf8"))}`);
        const appPath = outDir+"/"+(defined.appName ?? "app.js");
        writeFileSync(appPath, app);

        log("rendering project");

        const { LGUIElement } = await import(`${appPath}`);
        const root = new LGUIElement("/"+basename(srcFile));
        const pages = root.pages;
        let lang = root.lang;
        let head = root.head;

        if (!lang || typeof lang != "string") { info(`App lang not defined, using "en"`); lang = "en"; }
        if (!head || typeof head != "function") { info(`App head not defined, using default head`); head = defaultHead; }

        if (typeof pages != "object" || pages == null || Array.isArray(pages)) throw new Error (`LGUI entrypoint doesn't return a "pages" object`);

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

    } catch (err) {
        throw err;
    }

    log("done");
}

function log(message, level = "LOG") {
    console.log(`[ ${ level } ] ${ message }`);
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

export { compile };