import { copyFileSync, existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'fs';
import { basename, dirname, resolve } from 'path';
import { projectDirectory, outputDirectory, compilerDirectory } from './leger-ui.js';

function lgsCompile(path) {
    const app = {};
    let str = "";
   
    const runner = readFileSync(compilerDirectory+"/lgs-runner.js", "utf8").replaceAll(/\s{2,}|\n|\/\/.*$/gm, "");
    const json = JSON.parse(readFileSync(projectDirectory+"/"+path, "utf8"));
    const router = json.router;

    readdirSync(projectDirectory).forEach(file => {
        if (!file.includes(".lgs")) return;
        const contents = lgsToJsTemplate(readFileSync(`${projectDirectory}/${file}`, "utf8"));
        app[file] = contents.replaceAll(/\s{2,}|\n/gm, "");
    });

    for (const [key, value] of Object.entries(app)) {
        str += `"${key}": function(args) { this._children = []; return \`<!-- \${this._path} -->${ value.replaceAll(/\/\*[\s\S]*?\*\//gm, "").replaceAll(/\`/gm, "\`") }<!-- /\${this._path} -->\` }, `;
    }
    writeFileSync(`${outputDirectory}/${basename(path, ".json")}.js`, `export const app = { ${str.slice(0, -2)} }; ${ runner }`);
    
    if (!router) throw new Error("Router is not defined");
    if (!Array.isArray(router)) throw new Error("Router must be an array");
    router.forEach(e => compileRoute(e, `${outputDirectory}/${basename(path, ".json")}.js`));
    console.log(`\nLEGER-COMPILER : Done compiling ${basename(path, ".json")}.js`);

    return;
}

async function compileRoute(routeElement, appPath) {
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
    console.log(`\nLEGER-COMPILER : Done compiling ${routeElement.route}.html`);
}

function lgsToJsTemplate(lgs) {
    return lgs;
}

export { lgsCompile };