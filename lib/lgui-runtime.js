class LGUIElement {
    #parent;
    #app;
    #args;
    #children = [];
    #instanceOf;
    #path;

    constructor(elementPath, parent, args) {

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

    _update() {
        if (typeof document == "undefined") throw new Error(`${this.#instanceOf} : Cannot update component without the DOM "${ elementPath }"`);
        // const container = this.getContainer();
        const focusPath = window.getElPath(document.activeElement, container);
        this.#children.forEach(e => this._app.functionCallRecursive(e, "onunmount"));
        this.#children = [];
        container.innerHTML = container.innerHTML.replace(RegExp(`<!-- ${this.#path} -->[\\s\\S]*<!-- /${this.#path} -->`, "gm"), `<!-- ${this.#path} -->${this.onrender(this.#args)}<!-- /${this.#path} -->`);
        container.querySelector(focusPath)?.focus();
        this.#children.forEach(e => this._app.functionCallRecursive(e, "onmount"));
    }
    _get(elementPath) {
        const instance = this;
        const element = _lgui_components[elementPath];
        if (!element) throw new Error(`${this.#instanceOf} : LGUI not such element "${ elementPath }"`);
        element.toString = (args) => instance._use(elementPath, args);
        return element;
    }
    _use(elementPath, args) {
        const instance = new LGUIElement(elementPath, this, args);
        this.#children.push(instance);
        return instance;
    }
    toString() {
        return `<!-- ${this._path} -->${this.onrender(this._args)}<!-- /${this._path} -->`;
    }
}