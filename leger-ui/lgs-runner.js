export class LgsAppElement {
    #parent;
    #id;
    #path;
    #lgs;
    #app;
    constructor(parent, lgsElement, app) {
        this.#parent = parent;
        this._children = [];
        this.#id = this.#parent ? this.#parent._children.length : 0;
        this.#path = this.calculatePath().join("-");
        
        this.#lgs = lgsElement;
        this.#app = app;
    }
    get _parent() {
        return this.#parent;
    }
    get _id() {
        return this.#id;
    }
    get _path() {
        return this.#path;
    }
    get _app() {
        return this.#app;
    }
    calculatePath() {
        if (!this.#parent) return [];
        const arr = this.#parent.calculatePath();
        arr.push(this.#id);
        return arr;
    }
    getContainerElement() {
        if (typeof document == "undefined") return null;
        if (!this.#parent) return document.body;
        let container = document.body;
        let length = document.body.innerHTML.length;
        for (const element of this.#parent.getContainerElement().querySelectorAll("*")) {
            if (element.innerHTML.includes(`<!-- ${this.#path} -->`) && element.innerHTML.length < length){
                container = element;
                length = container.innerHTML.length;
            }
        }
        return container;
    }
    use(pathToLgs) {
        const lgs = app[pathToLgs];
        if (!lgs) throw new Error("No lgs element found for path: " + pathToLgs);
        const lgsElement = new LgsAppElement(this, lgs, this.#app);
        this._children.push(lgsElement);
        const boundLgs = lgs.bind(lgsElement);
        boundLgs.toString = boundLgs;
        return boundLgs;
    }
    onload(callback) {
        if (typeof this._onload == "function") return "";
        this._onload = callback;
        return "";
    }
    onmount(callback) {
        if (typeof this._onmount == "function") return "";
        this._onmount = callback;
        return "";
    }
    onunmount(callback) {
        if (typeof this._onunmount == "function") return "";
        this._onunmount = callback;
        return "";
    }
    oncompile(callback) {
        if (typeof this._oncompile == "function") return "";
        this._oncompile = callback;
        return "";
    }
    def(name, value) {
        if (typeof this[name] != "undefined") return "";
        const protectedProperties = ["getPath", "use", "onload", "def"];
        if (protectedProperties.includes(name)) {
            console.error("Cannot define protected property: " + name);
            return "";
        }
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
        if (triggerRender === true) this.render();
        return "";
    }
    render() {
        if (typeof document == "undefined") return "";
        this._children.forEach(e => this.#app.onUnMountTrigger(e));

        let container = this.getContainerElement();
        if (document.body == container) {
            container = document.body;
            let length = container.length;
            for (const element of document.body.querySelectorAll("*")) {
                if (element.innerHTML.includes(`<!-- ${this.#path} -->`) && element.innerHTML.length < length){
                    container = element;
                    length = container.innerHTML.length;
                }
            }
        }
        container.innerHTML = container.innerHTML.replace(RegExp(`<!-- ${this.#path} -->[\\s\\S]*<!-- /${this.#path} -->`, "gm"), this.#lgs.call(this));
        this._children.forEach(e => this.#app.onMountTrigger(e));
    }
}

export class App {
    #head;
    #documentProps;
    #appTree;
    #compile;
    constructor(compile = false) {
        this.#appTree = new LgsAppElement(undefined, () => "", this);
        this.#documentProps = {};
        this.#compile = compile;
    }
    get appTree() {
        return this.#appTree;
    }
    get documentProps() {
        return this.#documentProps;
    }
    renderDocument(args) {
        this.#documentProps = { ...this.#documentProps, ...args };
        if (!args.path) throw new Error("Path is not defined");

        const body = args.path ? this.#appTree.use(args.path)() : "";
        if (this.#compile) this.onCompileTrigger(this.#appTree);
        
        const defaultHead = `<title>${ this.#documentProps.title || "Leger-UI app" }</title><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="${ this.#documentProps.cssSrc || "style.css" }"><script src="${ this.#documentProps.appSrc || "app.js" }" type="module"></script>`;
        const head = this.#head ? this.#head(this.#documentProps) : defaultHead;

        const document = `<!DOCTYPE html><html lang="${ this.#documentProps.lang || "en" }"><head>${ head }</head><body>${ body }</body></html>`;
        return document;
    }
    setDocumentProperties(props) {
        this.#documentProps = { ...this.#documentProps, ...props };
        return "";
    }
    setHeadComponent(component) {
        this.#head = this.appTree.use(component);
    }
    getInstance(pathToInstance) {
        if (!pathToInstance) return this.#appTree;
        pathToInstance = pathToInstance.split("-");
        let appTree = this.#appTree;
        for (let i = 0; i < pathToInstance.length; i++) {
            appTree = appTree._children[pathToInstance[i]];
            if (!appTree) return null;
        }
        return appTree;
    }
    onMountTrigger(appTree) {
        if (typeof appTree._onmount == "function") appTree._onmount();
        for (let i = 0; i < appTree._children.length; i++) {
            this.onMountTrigger(appTree._children[i]);
        }
    }
    onUnMountTrigger(appTree) {
        if (typeof appTree._onunmount == "function") appTree._onunmount();
        for (let i = 0; i < appTree._children.length; i++) {
            this.onUnMountTrigger(appTree._children[i]);
        }
    }
    onCompileTrigger(appTree) {
        if (typeof appTree._oncompile == "function") appTree._oncompile();
        for (let i = 0; i < appTree._children.length; i++) {
            this.onCompileTrigger(appTree._children[i]);
        }
    }
}

if (typeof document != "undefined" || typeof app != "object") {
    document.addEventListener("DOMContentLoaded", function() {
        let pageRoute = window.location.pathname.split(".")[0];
        if (pageRoute == "/") pageRoute = "index.lgs";
        pageRoute = pageRoute.replace(/^\/+|\/+$/g, "").split(".")[0]+".lgs";
        const app = new App();
        app.renderDocument({ path: pageRoute });
        window.app = app;
        onLoadTrigger(app.appTree);
        app.onMountTrigger(app.appTree);
    });
    function onLoadTrigger(appTree) {
        if (typeof appTree._onload == "function") appTree._onload();
        for (let i = 0; i < appTree._children.length; i++) {
            onLoadTrigger(appTree._children[i]);
        }
    }
}