export const app = { "button.ldx": function(args) { this._children = []; return `${this.def("num", 0),this.def("count", () => this.num++)}<button onclick="${ this.count }">${ this.num }</button>` }, "head.ldx": function(args) { this._children = []; return `<!DOCTYPE><head><title>${ args.title }</title><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><script src="app.js" type="module"></script></head>` }, "index.ldx": function(args) { this._children = []; return `${this.def("counter", this.use("button.ldx")),this.def("users", this.use("users.ldx"))}${ this.use("head.ldx")({ title: "Index" }) }${ this.counter() }${ this.users() }` }, "user.ldx": function(args) { this._children = []; return `<li id="${ this._id }"><p>${ args.name }</p><p>${ args.email }</p></li>` }, "users.ldx": function(args) { this._children = []; return `${ this.def("user", this.use("user.ldx")) }${this.onload(() => {return fetch("https://jsonplaceholder.typicode.com/users").then(e => e.json()).then(e => def("users", e)).catch(e => console.log(e))})}<ul>${ (this.users && this.users.map) ? this.users.map(e => this.user(e)) : "" }</ul>` } }; 
export class LdxAppElement {
    constructor(parent) {
        this._parent = parent;
        this._children = [];
        this._id = this._parent ? this._parent._children.length : 0;
        this._path = this.getPath().join(".");
    }
    getPath() {
        if (!this._parent) return [];
        const arr = this._parent.getPath();
        arr.push(this._id);
        return arr;
    }
    use(pathToLdx) {
        console.log(pathToLdx);
        const ldx = app[pathToLdx];
        if (!ldx) throw new Error("No ldx element found for path: " + pathToLdx);
        const ldxElement = new LdxAppElement(this)
        this._children.push(ldxElement);
        ldx.toString = ldx.bind(ldxElement);
        return ldx.bind(ldxElement);
    }
    onload(callback) {
        this.onload = callback;
        return "";
    }
    def(name, value) {
        const protectedProperties = ["_parent", "_children", "_id", "getPath", "use", "onload", "def"];
        if (protectedProperties.includes(name)) {
            console.error("Cannot define protected property: " + name);
            return "";
        }
        if (typeof value === "function") {
            value = value.bind(this);
            value.toString = () => `window.getInstance('${this._path}', window.appTree).${name}()`;
        }
        this[name] = value;
        return "";
    }
}

export function getInstance(pathToInstance, appTree) {
    pathToInstance = pathToInstance.split(".");
    for (let i = 0; i < pathToInstance.length; i++) {
        appTree = appTree._children[pathToInstance[i]];
        if (!appTree) return null;
    }
    return appTree;
}

if (typeof document != "undefined") {
    document.addEventListener("DOMContentLoaded", function() {
        let pageRoute = window.location.pathname.split(".")[0];
        if (pageRoute == "/") pageRoute = "index.ldx";
        window.appTree = new LdxAppElement();
        window.appTree.use(pageRoute)();
        window.getInstance = getInstance;
    });
}