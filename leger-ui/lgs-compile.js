import { copyFileSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'fs';
import { basename, dirname, resolve } from 'path';
import { projectDirectory, outputDirectory, compilerDirectory } from './leger-ui.js';
import { xmlParser } from './xml-parser.js';

function lgsCompile(path) {
    const app = {};
    const str = [];
   
    const runner = readFileSync(compilerDirectory+"/lgs-runner.js", "utf8").replaceAll(/[\r\t\f\v ]{2,}|\/\/.*$/gm, "").replaceAll(/\n/gm, " ");
    const json = JSON.parse(readFileSync(projectDirectory+"/"+path, "utf8"));
    const router = json.router;

    compileDirectory(projectDirectory, app);
    
    for (const [key, value] of Object.entries(app)) {
        str.push(`"${key}": { ${value} }`);
    }

    writeFileSync(`${outputDirectory}/${basename(path, ".json")}.js`, `export const components = { ${str.join(", ")} }; const config = ${ JSON.stringify(json) }; ${ runner }`);

    if (!router) throw new Error("Router is not defined");
    if (!Array.isArray(router)) throw new Error("Router must be an array");
    router.forEach(e => renderRoute(e, `${outputDirectory}/${basename(path, ".json")}.js`, json.globals));
    console.log(`LEGER-COMPILER : Done compiling ${basename(path, ".json")}.js`);

    return;
}

function compileDirectory(directory, app, prefix = "") {
    console.log(`LEGER-COMPILER : Compiling ${directory}`);
    readdirSync(directory).forEach(file => {
        if (statSync(`${directory}/${file}`).isDirectory()) compileDirectory(`${directory}/${file}`, app, prefix+file+"/");
        if (!file.includes(".lgs")) return;
        const contents = lgsToJs(readFileSync(`${directory}/${file}`, "utf8"));
        app[prefix + file] = minifyLGS(contents);
    });
}

async function renderRoute(routeElement, appPath, globals) {
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
    
        const app = new App(routeElement.path, globals);
        console.log(app.renderDocument());

        // TODO : FIX component path error "underfined.-1"

        // const str = app.renderDocument({ path: routeElement.path });
        // writeFileSync(`${outputDirectory}/${routeElement.route}.html`, str);
        console.log(`LEGER-COMPILER : Done rendering ${routeElement.route}.html`);
    } catch (error) {
        console.error(`LEGER-COMPILER : ERROR while rendering ${routeElement.route}.html :`, error);
    }
}

function lgsToJs(lgs) {
    lgs = xmlParser(lgs.replaceAll(/(?<!\\)\/\*[\s\S]*?\*\//gm, "").replaceAll(/\`/gm, "\\`"));

    lgs = lgs.map(e => {
        if (!e.attributes.name) throw new Error(`Unamed ${e.tagName} element`)
        if (lgs.filter(f => f.attributes.name == e.attributes.name).length > 1) throw new Error(`Element "${e.attributes.name}" redeclaration`);

        if (e.tagName == "template") return `${e.attributes.name}: function (args) { return \`${ e.contents }\` }`;
        else if (e.tagName == "script") return `${e.attributes.name}: function (args) { ${e.contents} }`;
        else throw new Error(`Invalid "${e.tagName}" element`);
    }).join(", ");

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
    return processedLgs.replaceAll(/[\r\t\f\v ]{2,}/gm, "").replaceAll(/\n/gm, " ").replaceAll(/\\s/gm, " ");
}

export { lgsCompile };