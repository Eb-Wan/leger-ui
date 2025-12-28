import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { basename, dirname, resolve } from 'path';
import { projectDirectory, outputDirectory, compilerDirectory } from './leger-ui.js';

function ldxCompile(path) {
    const app = {};
    let str = "";
   
    const runner = readFileSync(compilerDirectory+"/ldx-runner.js", "utf8").replaceAll(/\s{2,}|\n|\/\/.*$/gm, "");
    const json = JSON.parse(readFileSync(projectDirectory+"/"+path, "utf8"));
    const router = json.router;

    readdirSync(projectDirectory).forEach(file => {
        if (!file.includes(".ldx")) return;
        const contents = readFileSync(`${projectDirectory}/${file}`, "utf8");
        app[file] = contents.replaceAll(/\s{2,}|\n/gm, "");
    });

    for (const [key, value] of Object.entries(app)) {
        str += `"${key}": function(args) { this._children = []; return \`<!-- \${this._path} -->${ value.replaceAll(/\`/gm, "\`") }<!-- /\${this._path} -->\` }, `;
    }

    writeFileSync(`${outputDirectory}/${basename(path, ".json")}.js`, `export const app = { ${str.slice(0, -2)} }; ${ runner }`);
    
    if (!router) throw new Error("Router is not defined");
    if (!Array.isArray(router)) throw new Error("Router must be an array");
    router.forEach(e => compileRoute(e, `${outputDirectory}/${basename(path, ".json")}.js`));
    return;
}

async function compileRoute(routeElement, appPath) {
    const { LdxAppElement } = await import(resolve(appPath));

    if (!routeElement.route) throw new Error("Route is not defined");
    if (!routeElement.path) throw new Error("Path is not defined");

    const appTree = new LdxAppElement();

    if (!existsSync(dirname(`${outputDirectory}/${routeElement.route}.html`)))
        mkdirSync(dirname(`${outputDirectory}/${routeElement.route}.html`), { recursive: true });
    const str = appTree.use(routeElement.path)();
    writeFileSync(`${outputDirectory}/${routeElement.route}.html`, str);
}

export { ldxCompile };