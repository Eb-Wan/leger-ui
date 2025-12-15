import { existsSync, readFileSync } from "fs";
import { projectDirectory, outputDirectory } from "./leger-ui.js";
import { ldxParser } from "./ldx-parser.js";
import { ldxPreprocessor } from "./ldx-preprocessor.js";

function ldxCompile(path, params = {}) {
    const imports = [];
    parseLdxFile(path, params, imports);
    const preprocessedLdx = ldxPreprocessor(imports);

    console.log(JSON.stringify(preprocessedLdx));

    return {};

    // const router = imports.map(e => {
    //     if (!Array.isArray(e.contents)) return;
    //     return e.contents.find(e => e.tagName == "router");
    // })[0];

    // if (!router) throw new Error("No router defined");
    // if (router && !router.contents) throw new Error("A router was found but it is empty");

    // router.contents.forEach(e => {
    //     const routerPath = (e.attributes && e.attributes.path) ? e.attributes.path : undefined;
    //     compilePage(routerPath, e.contents, imports, parsedLdx);
    // });
}

function parseLdxFile(path, params = {}, imports) {
    const resolvedPath = projectDirectory+"/"+path;
    if (!existsSync(resolvedPath)) throw new Error(`Script ${resolvedPath} doesn't exist.`);

    let parsed = ldxParser(readFileSync(resolvedPath, "utf-8").replaceAll(/\/\*([\s\S]*?)\*\//gm, ""));
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

function compilePage(path, contents, imports, parsedLdx) {
    if (!path) throw new Error("Missing route path in router");

    // compile HTML
    const html = elementToHmtl().replaceAll(/\n/gm, "").replaceAll(/\s{2,}/gm, " ");
    console.log(html);

    // Mvp version, the router doesn't need to support directory creation

    // Compile JavaScript :
    //      Walk through the imported scripts
    //      Create init function for element 
    //          Get methods and assign as props
    //          Get vars and assign as props
    //      Window.onload
    //          querySelector("[l-id]").forEach -> execute init function
    //      Render as JS
    
    // Compile HTML :
    //      Walk through the imported scripts
    //      Find "router"
    //      ForEach Element in router
    //          If element imported assign l-id attribute
    //          Render as HTML

    // Compile CSS :
    //      Walk through the imported scripts
    //      Get all STYLE elements
    //      Compile as CSS

    function elementToHmtl() {
        let htmlStr = "";

        contents.forEach(e => {

            // Find imported element
            const importedElement = parsedLdx.find(i => i.tagName == "template" && i.attributes.name == (e.tagName ?? ""));
            if (importedElement) {
                importedElement.attributes.children = e.contents;
                // const imported = 
                e.contents = importedElement.attributes.path;
            }

            if (typeof e.contents == "string") htmlStr += `<${e.tagName}${attributesToString(e.attributes)}>${e.contents}</${e.tagName}>`;
            else if (Array.isArray(e.contents)) htmlStr += `<${e.tagName}${attributesToString(e.attributes)}>${elementToHmtl(e.contents)}</${e.tagName}>`
            else htmlStr += `<${e.tagName}${attributesToString(e.attributes)} />`
        });
        return htmlStr;
    }
    function attributesToString(att) {
        if (typeof att != "object") return "";
        let str = "";
        for (const [key, value] of Object.entries(att)) str += ` ${key}="${value}"`;
        return str;
    }
}

export { ldxCompile };