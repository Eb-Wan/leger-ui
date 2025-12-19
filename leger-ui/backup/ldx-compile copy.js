import { existsSync, readFileSync, writeFileSync } from "fs";
import { projectDirectory, outputDirectory, compilerDirectory } from "./leger-ui.js";
import { ldxParser } from "./ldx-parser.js";
import { ldxPreprocessor } from "./ldx-preprocessor.js";
import { stringifyProps } from "./ldx-props.js";

function ldxCompile(outputPath, params = {}) {
    let app = [];
    parseLdxFile(outputPath, params, app);
    app = ldxPreprocessor(app);

    // console.log(JSON.stringify(app));

    compileAppToHTML(app);
    compileAppToJS(outputPath, app);
    compileAppToCSS(outputPath, app);


    return {};
}

function parseLdxFile(path, params = {}, imports) {
    const resolvedPath = projectDirectory+"/"+path;
    if (!existsSync(resolvedPath)) throw new Error(`Script ${resolvedPath} doesn't exist.`);

    let parsed = ldxParser(readFileSync(resolvedPath, "utf-8").replaceAll(/\/\*([\s\S]*?)\*\//gm, ""));
    if (!parsed.length || parsed.length > 1) throw new Error("Only one element allowed at top level of a file");
    if (!imports.find(e => e.path == path)) imports.push({ path, contents: parsed});

    importTemplates(parsed, imports);
    
    return parsed;

    function importTemplates(ldx, imports) {
        const templates = ldx.filter(e => e.tagName == "template");
        templates.forEach(e => {
            if (!e.attributes || !e.attributes.path) throw new Error("Unamed template in "+ resolvedPath);
            if (imports.find(f => f.path == e.attributes.path)) return;
            if (e.attributes.path) parseLdxFile(e.attributes.path, params, imports);
        });

        ldx.forEach(e => {
            if (!e.contents || !Array.isArray(e.contents)) return;
            importTemplates(e.contents, imports);
        });
    }
}

function compileAppToHTML(app) {
    const router = app[0].contents.find(e => e.tagName == "router");

    if (!router) throw new Error("No router defined");
    if (router && !router.contents) throw new Error("A router was found but it is empty");

    router.contents.forEach(e => {
        const routePath = e.attributes.path;
        if (!routePath) throw new Error("Route has no defined path");

        const output = routePath;
        const element = e;
        element.props = app[0].props;
        compileRouteToHTML(output, element, app);
    });

    
    function compileRouteToHTML(outputPath, element, app) {
        // Mvp version, the router doesn't need to support directory creation
    
        const html = "<!DOCTYPE html> "+elementToHTML(element, app, element.props).replaceAll(/\s{2,}|\n/gm, "");
        writeFileSync(outputDirectory+"/"+outputPath+".html", html);
    
        function elementToHTML(element, app, props) {
            if (!Array.isArray(element.contents)) return `${element.contents}`;
            let htmlStr = "";
            element.contents.forEach(e => {
                replaceWithImported();
    
                if (typeof e.contents == "string") htmlStr += `<${e.tagName}${attributesToString(e.attributes)}>${e.contents}</${e.tagName}>`;
                else if (Array.isArray(e.contents)) htmlStr += `<${e.tagName}${attributesToString(e.attributes)}>${elementToHTML(e, app, e.props ?? props)}</${e.tagName}>`;
                else htmlStr += `<${e.tagName}${attributesToString(e.attributes)} />`;
                function replaceWithImported() {
                    if (!e.tagName[0].match(/[A-Z]/)) return;
                    const templateProp = props[e.tagName];
                    if (!templateProp) return;
                    const imported = app.find(e => e.path == templateProp.value);
                    if (!imported) return;
                    const importedElement = imported.contents[0];
                    importedElement.attributes["l-app-element-id"] = imported.path;
                    importedElement.props = imported.props;
                    const children = e.contents;
                    e = importedElement;
                    if (children) props.children = children;
                }
            });
            return htmlStr;
    
            function attributesToString(att) {
                if (typeof att != "object") return "";
                let str = "";
                for (const [key, value] of Object.entries(att)) str += ` ${key}="${value}"`;
                return str;
            }
        }
    }
}

function compileAppToJS(outputPath, app) {
    // const runner = readFileSync(compilerDirectory+"/"+"ldx-runner.js", "utf-8").replaceAll(/\/\/.*$/gm, "").replaceAll(/\s{2,}|\n/gm, "");
    
    const runner = readFileSync(compilerDirectory+"/"+"ldx-runner.js", "utf-8");
    const js = `const app = JSON.parse(\`${JSON.stringify(app).replaceAll("`", "\\`").replaceAll("\\", "\\\\")}\`); \n${runner}`;
    // const js = `const app = ${stringifyApp(app)}; \n${runner}`;
    writeFileSync(outputDirectory+"/"+outputPath.replace("ldx", "js"), js);

    // Returns app as a string
    function stringifyApp(app) {
        return "["+app.map(e => {
            return `{ path: "${e.path}", contents: [${stringifyContent(e.contents)}], props: {${stringifyProps(e.props)}} }`;
        }).join(", ")+"]";

        function stringifyContent(contents) {
            if (!Array.isArray(contents)) return escape(contents);
            return contents.map(e => {
                return `{ tagName: "${e.tagName}", contents }`;
            })
            function escape(value) {
                return value.replace("\"", "\\\"");
            };
        }
    }
}

function compileAppToCSS(outputPath, app) {
    
}

export { ldxCompile };

// Compile CSS :
//      Walk through the imported scripts
//      Get all STYLE elements
//      Compile as CSS