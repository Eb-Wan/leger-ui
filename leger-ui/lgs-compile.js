import { copyFileSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'fs';
import { basename, dirname, resolve } from 'path';
import { projectDirectory, outputDirectory, compilerDirectory } from './leger-ui.js';

function lgsCompile(path) {
    const app = {};
    let str = "";
   
    const runner = readFileSync(compilerDirectory+"/lgs-runner.js", "utf8").replaceAll(/\s{2,}|\n|\/\/.*$/gm, "");
    const json = JSON.parse(readFileSync(projectDirectory+"/"+path, "utf8"));
    const router = json.router;

    compileDirectory(projectDirectory, app);

    for (const [key, value] of Object.entries(app)) {
        str += `"${key}": function(args = {}) { this._children = []; return \`<!-- \${this._path} -->${ value.replaceAll(/(?<!\\)\/\*[\s\S]*?\*\//gm, "").replaceAll(/\`/gm, "\`") }<!-- /\${this._path} -->\` }, `;
    }
    writeFileSync(`${outputDirectory}/${basename(path, ".json")}.js`, `export const app = { ${str.slice(0, -2)} }; const config = ${ JSON.stringify(json) }; ${ runner }`);
    
    if (!router) throw new Error("Router is not defined");
    if (!Array.isArray(router)) throw new Error("Router must be an array");
    router.forEach(e => renderRoute(e, `${outputDirectory}/${basename(path, ".json")}.js`));
    console.log(`LEGER-COMPILER : Done compiling ${basename(path, ".json")}.js`);

    return;
}

function compileDirectory(directory, app, prefix = "") {
    console.log(`LEGER-COMPILER : Compiling ${directory}`);
    readdirSync(directory).forEach(file => {
        if (statSync(`${directory}/${file}`).isDirectory()) compileDirectory(`${directory}/${file}`, app, prefix+file+"/");
        if (!file.includes(".lgs")) return;
        const contents = lgsToJsTemplate(readFileSync(`${directory}/${file}`, "utf8"));
        app[prefix + file] = minifyLGS(contents);
    });
}

async function renderRoute(routeElement, appPath) {
    try {
        const { App } = await import(`${resolve(appPath)}?t=${Date.now()}`);
        if (!routeElement.route) throw new Error("Route is not defined");
        if (!routeElement.path) throw new Error("Path is not defined");
        if (routeElement.include || Array.isArray(routeElement.include)) routeElement.include.forEach(e => {
            if (!existsSync(dirname(`${outputDirectory}/${e}`)))
                mkdirSync(dirname(`${outputDirectory}/${e}`), { recursive: true });
            copyFileSync(resolve(projectDirectory+"/"+e), `${outputDirectory}/${e}`);
        });
    
        if (!existsSync(dirname(`${outputDirectory}/${routeElement.route}`)))
            mkdirSync(dirname(`${outputDirectory}/${routeElement.route}`), { recursive: true });
    
        const app = new App(true);
        const str = app.renderDocument({ path: routeElement.path });
        writeFileSync(`${outputDirectory}/${routeElement.route}.html`, str);
        console.log(`LEGER-COMPILER : Done rendering ${routeElement.route}.html`);
    } catch (error) {
        console.error("LEGER-COMPILER : ERROR while rendering app :", error);
    }
}

function lgsToJsTemplate(lgs) {
    // This function will be used to convert LGS expression to JS template
    // It is not implemented yet
    // Support for JS template expressions will be kept as legacy
    // LGS expressions will just shorthands for JS
    return lgs;
}

function minifyLGS(lgs) {
    let depth = 0;
    let buffer = "";
    let processedLgs = "";

    for (let i = 0; i < lgs.length; i++) {
        buffer += lgs[i];
        if (buffer.includes("<pre>")) {
            processedLgs += buffer;
            buffer = "";
            depth++;
        } else if (depth > 0 && buffer.includes("</pre>")) {
            processedLgs += buffer.replaceAll(/\n/gm, "\\n").replaceAll(/\t/gm, "\\t").replaceAll(/\s/gm, "\\s");
            buffer = "";
            depth--;
        }
    }
    processedLgs += buffer;
    return processedLgs.replaceAll(/\s{2,}|\n/gm, "").replaceAll(/\\s/gm, " ");
}

export { lgsCompile };