class Component {
    #parent;
    #app;
    #args;
    #children = [];
    #instanceOf;
    #path;
    constructor(path, parent, app, args = {}) {
        this.#instanceOf = path;
        this.#parent = parent;
        this.#app = app;
        this.#args = args;
        this.#path = parent._path ? parent._path+"."+parent._children.length : parent._children.length.toString();

        this.#include(path);
    }

    get _args() {
        return this.#args;
    }
    get _app() {
        return this.#app;
    }
    get _children() {
        return this.#children;
    }
    get _parent() {
        return this.#parent;
    }
    get _path() {
        return this.#path;
    }
    get _instanceOf() {
        return this.#instanceOf;
    }

    #include(path) {
        const component = components[path];
        if (!component) throw new Error("No component " + path);
        for (const [key, value] of Object.entries(component)) {
            this[key] = value.bind(this);
            this[key].toString = () => `app.getInstance('${this.#path}').${key}({ event })`;

        }
    }
    use(path, args = {}) {
        const instance = new Component(path, this, this.#app, args);
       
        if (!instance.onrender && !instance.main) throw new Error(`Component ${ path } has no onrender methods nor main template`);
        if (!instance.onrender) instance.onrender = instance.main;
        if (typeof instance.onmount == "function")  instance.onmount();
        this.#children.push(instance);
        return `<!-- ${instance._path} -->${instance.onrender(args)}<!-- /${instance._path} -->`;
    }
    update() {
        if (typeof document == "undefined") return;
        let container = this.getContainer();
        this.#children.forEach(e => this._app.functionCallRecursive(e, "onunmount"));
        container.innerHTML = container.innerHTML.replace(RegExp(`<!-- ${this.#path} -->[\\s\\S]*<!-- /${this.#path} -->`, "gm"), `<!-- ${this.#path} -->${this.onrender(this.#args)}<!-- /${this.#path} -->`);
    }
    get(path) {
        const component = components[path];
        if (!component) throw new Error("No component " + path);
        for (const [key, value] of Object.entries(component)) {
            component[key] = value.bind(this);
        }
        return component;
    }
    def(name, value) {
        if (typeof this[name] != "undefined") return "";
        if (typeof value === "function") {
            value = value.bind(this);
            value.toString = () => `app.getInstance('${this.#path}').${name}(event)`;
        }
        this[name] = value;
        return "";
    }
    set (name, value, triggerRender = true) {
        if (typeof this[name] == "undefined") return "";
        this[name] = value;
        if (triggerRender === true) this.update();
        return "";
    }
    getContainer() {
        if (typeof document == "undefined") return null;
        let container = document.body;
        let length = document.body.innerHTML.length;
        for (const element of this.#parent.getContainer().querySelectorAll("*")) {
            if (element.innerHTML.includes(`<!-- ${this.#path} -->`) && element.innerHTML.length < length){
                container = element;
                length = container.innerHTML.length;
            }
        }
        return container;
    }
};

export class App {
    #children = [];
    #globals;
    #head;
    
    constructor(path, globals = {}) {
        this.#globals = { root: path, ...globals };
    }
    get _children() {
        return this.#children;
    }
    get _globals() {
        return this.#globals;
    }
    get _head() {
        return this.#head;
    }

    get _path() {
        return "";
    }

    set _head(path) {
        const component = components[path];
        if (!component) throw new Error("No component " + path);
        const method = component["main"];
        if (typeof method != "function") throw new Error(`Component ${path} has no main function or template`);
        return method.bind(this);
    }
    set _globals(props) {
        this.#globals = { ...this.#globals, ...props };
    }

    renderDocument () {
        const instance = new Component(this.#globals.root, this, this);
        if (!instance.onrender && !instance.main) throw new Error(`Component ${ path } has no onrender methods nor main template`);
        if (!instance.onrender) instance.onrender = instance.main;
        this.#children.push(instance);

        const body = instance.onrender();
        
        const defaultHead = `<title>${ this.#globals.title || "Leger-UI app" }</title><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="${ this.#globals.cssSrc || "style.css" }"><script src="${ this.#globals.appSrc || "app.js" }" type="module"></script>`;
        const head = this.#head ? this.#head(this.#globals) : defaultHead;
        
        const document = `<!DOCTYPE html><html lang="${ this.#globals.lang || "en" }"><head>${ head }</head><body><!-- 0 -->${ body }<!-- /0 --></body></html>`;
        return document;
    }
    functionCallRecursive(component, name) {
        if (typeof component[name] == "function") component[name]();
        for (let i = 0; i < component._children.length; i++) {
            this.functionCallRecursive(component._children[i], name);
        }
    }
    getInstance(pathToInstance) {
        if (!pathToInstance) return this.#children;
        pathToInstance = pathToInstance.split(".");
        let component = this;
        for (let i = 0; i < pathToInstance.length; i++) {
            component = component._children[pathToInstance[i]];
            if (!component) return null;
        }
        return component;
    }
    getContainer() {
        if (typeof document == "undefined") return null;
        return document.body;
    }
}

if (typeof document != "undefined" && typeof components != "undefined") {
    document.addEventListener("DOMContentLoaded", function() {
        let pageRoute = window.location.pathname.slice(1);
        if (!pageRoute) pageRoute = "index";
        pageRoute = config.router.find(e => e.route == pageRoute);
        if (!pageRoute) {
            pageRoute = config.router.find(e => e.route == "404");
            if (!pageRoute) throw new Error("No 404 page defined in the router");
        }
        pageRoute = pageRoute.path;
        if (pageRoute) {
            const appInstance = new App(pageRoute, config.globals);
            window.app = appInstance;
            appInstance.renderDocument();
            appInstance.functionCallRecursive(appInstance._children[0], "onload");
        }
    });
}