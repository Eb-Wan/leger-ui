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
        this.#path = parent._path+"_"+parent._children.length;

        const component = components[this.#instanceOf];
        if (!component) throw new Error("No component " + this.#instanceOf);
        for (const [key, value] of Object.entries(component)) {
            this[key] = value.bind(this);
            this[key].toString = (args) => `app.getInstance('${this.#path}').${key}({ event${ args ? ", "+Object.keys(args).map(e => e+": "+args[e]).join(", ") : ""} })`;
        }

        if (!this.onrender && !this.main) throw new Error(`Component ${ path } has no onrender methods nor main template`);
        if (!this.onrender) this.onrender = this.main;
        if (typeof this.onmount == "function") this.onmount();
        if (typeof this.oncompile == "function" && app._globals.compiling === true) this.oncompile();
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
    use(path, args = {}) {
        const instance = new Component(path, this, this.#app, args);
        this.#children.push(instance);
        return instance;
    }
    update() {
        if (typeof document == "undefined") throw new Error("Cannot update component without the DOM");
        const container = this.getContainer();
        const focusPath = window.getElPath(document.activeElement, container);
        this.#children = [];
        this.#children.forEach(e => this._app.functionCallRecursive(e, "onunmount"));
        container.innerHTML = container.innerHTML.replace(RegExp(`<!-- ${this.#path} -->[\\s\\S]*<!-- /${this.#path} -->`, "gm"), `<!-- ${this.#path} -->${this.onrender(this.#args)}<!-- /${this.#path} -->`);
        container.querySelector(focusPath)?.focus();
        this._app.functionCallRecursive(this, "ondone");
    }
    get(path) {
        const component = components[path];
        if (!component) throw new Error("No component " + path);
        const methods = {};
        for (const [key, value] of Object.entries(component)) {
            methods[key] = value.bind(this);
            methods[key].toString = (args) => `app.getInstance('${this.#path}').${key}({ event${ args ? ", "+Object.keys(args).map(e => e+": "+args[e]).join(", ") : ""} })`;
        }
        return methods;
    }
    def(name, value) {
        if (typeof this[name] != "undefined") return "";
        if (typeof value === "function") {
            value = value.bind(this);
            value.toString = (args) => `app.getInstance('${this.#path}').${name}({ event${ args ? ", "+Object.keys(args).map(e => e+": "+args[e]).join(", ") : ""} })`;
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
    ref (name) {
        const id = this.#path+"_"+name;
        if (typeof this[name] == "undefined") Object.defineProperty(this, name, { get: () => document.getElementById(id) });
        return id;
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
    toString() {
        return `<!-- ${this._path} -->${this.onrender(this._args)}<!-- /${this._path} -->`;
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
        const instance = new Component(path, this, this, this._globals);
        this.#head = (instance);
    }
    set _globals(props) {
        this.#globals = { ...this.#globals, ...props };
    }

    renderDocument (compiling) {
        this._globals.compiling = compiling === true;
        this.#children = [];
        const instance = new Component(this.#globals.root, this, this);
        this.#children = [instance];
        
        const defaultHead = `<title>${ this.#globals.title || "Leger-UI app" }</title><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="${ this.#globals.cssSrc || "style.css" }"><script src="${ this.#globals.appSrc || "app.js" }" type="module"></script>`;
        const head = this.#head && this.#head.onrender ? this.#head.onrender(this.#globals) : defaultHead;

        const body = instance.onrender();
        
        const document = `<!DOCTYPE html><html lang="${ this.#globals.lang || "en" }"><head>${ head }</head><body><!-- _0 -->${ body }<!-- /_0 --></body></html>`;
        return document;
    }
    functionCallRecursive(component, name) {
        if (typeof component[name] == "function") component[name]();
        for (let i = 0; i < component._children.length; i++) {
            this.functionCallRecursive(component._children[i], name);
        }
    }
    getInstance(pathToInstance) {
        if (!pathToInstance) return this.#children[0];
        pathToInstance = pathToInstance.split("_").slice(1);
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
        window.getElPath = (el, container) => {
            const stack = [];
            while (el.parentElement != null) {
                if ( el.hasAttribute('id') && el.id != '' ) stack.unshift(el.nodeName.toLowerCase() + '#' + el.id);
                else stack.unshift(el.nodeName.toLowerCase() + ':nth-child(' + (Array.from(el.parentElement.children).findIndex(e => e == el) + 1) + ')');
                el = el.parentElement;
                if (el.parentElement == container) break;
            }

            if (stack.length == 0) return "";
            else if (stack[stack.length - 1].includes("#")) return stack[stack.length - 1];
            return stack.join(" > ");
        };
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