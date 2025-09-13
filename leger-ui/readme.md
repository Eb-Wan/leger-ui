# Leger-UI Frontend Compiler

> This project is still in early development, it is not recommended to use in production.

Supra-ultra-blazingly fast frontend... because it's just vanilla HTML, CSS & JavaScript.

With the Leger-UI frontend compiler, you can design and manage projects in the same way you would with any other front-end framework, except that you compile your project into a lightweight vanilla website.

That has many qualities such as:

* **Simplicity**: You get a complete, dynamic frontend with just HTML, CSS & JavaScript. Just like the web was meant to be!
* **Compatibility**: Without heavy reliance on client-side JavaScript, you get better browser compatibility. Just like the web was meant to be!
* **Lightness**: When your website is stripped of unnecessary JavaScript, it suddenly gets much, much lighter. Just like the web was meant to be!
* **Reliability**: Less server, less problems. Just like the web was meant to be!
* **Efficiency**: Do I need to explain why this is? It's better for lower-end computers. Just like the web was meant to be!

---

## Basics of Leger-UI Scripting

A quick guide to Leger-UI script programming.

---

### Expression

An **expression** is code that will be replaced by a value during compilation.
It always starts with an identifier (such as `$.` or `$&`) and always ends with a `;`, with a key in between.

There are two types of expressions:

* **Simple expression** -> `$.navbar;`
* **Argumented expression** -> `$.navbar: title="My website";`

In these examples, the expressions will be replaced by the result of the `navbar` function.

Let's break down an argumented expression:

* `$.` is the **identifier** of the expression. It helps distinguish between functions (`$.`), parameters (`$$`, `$&`), commands (`$:`), etc.
* `navbar` is the **key**, which indicates which function, command, or parameter to evaluate.
* `title="My website"` is the **argument**. In this case, there is only one, but there can be as many as needed.
* `;` is the **end of the expression**.

---

### Function

A function is an expression identified by `$.` that will be replaced by its result.
Here's an example of a function called "navbar":

```html
<header>
    <div>My website</div>
</header>
```

This content will replace all `$.navbar;` expressions during compilation, so:

```
<body>
    $.navbar;
</body>
```

becomes:

```html
<body>
    <header>
        <div>My website</div>
    </header>
</body>
```

after compilation.

A function can be used anywhere, and as many times as needed, so:

```
<body>
    $.navbar;
    $.navbar;
    $.navbar;
    $.navbar;
</body>
```

becomes:

```html
<body>
    <header>
        <div>My website</div>
    </header>
    <header>
        <div>My website</div>
    </header>
    <header>
        <div>My website</div>
    </header>
    <header>
        <div>My website</div>
    </header>
</body>
```

after compilation.

---

### Parameter

A parameter is an expression identified by `$$` and replaced by the value of the argument with the same name.
Let's modify our "navbar" function:

```
<header>
    <div>$$title;</div>
</header>
```

In this example, the expression `$$title;` will be replaced with the content of the `"title"` argument.

So:

```
<body>
    $.navbar: title="My website";
</body>
```

becomes:

```html
<body>
    <header>
        <div>My website</div>
    </header>
</body>
```

And:

```
<body>
    $.navbar: title=My website";
    $.navbar: title="is";
    $.navbar: title="super";
    $.navbar: title="cool";
    $.navbar: title="yeah!";
</body>
```

becomes:

```html
<body>
    <header>
        <div>My website</div>
    </header>
    <header>
        <div>is</div>
    </header>
    <header>
        <div>super</div>
    </header>
    <header>
        <div>cool</div>
    </header>
    <header>
        <div>yeah!</div>
    </header>
</body>
```

after compilation.

---

### Command

A command is an expression identified by `$:`, which is replaced by its result.
See the [List of Commands](#list-of-commands) section to view all available commands.

For example, the `lorem` command returns Lorem Ipsum text. So:

```
$:lorem;
```

becomes:

```
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut ultricies enim. Donec accumsan feugiat aliquet. Nam rhoncus non massa in tristique. Quisque molestie est.
```

Another example is the `toUpperCase` command, which returns a string in uppercase. So:

```
$:toUpperCase: string="text";
```

becomes:

```
TEXT
```

It also works with parameters in arguments:

```
$:toUpperCase: string="$$event; at at $%time;";
```

becomes:

```
LUNCH AT 12:30 P.M.
```

---

### Global Parameter

A global parameter is an expression identified by `$%` that will be replaced by the value of the corresponding global parameter.

Globals parameters, **once declared**, are usable anywere in a project. You can declare a global variable either with the `define` command, or by adding it in your project file like so :

```json
"globalParam": [
    { "id":"apiUrl", "value":"https://api.example.com/" }
]
```

**Example:**

```
$:define: id="copyright", value="EB-Wan";
$:define: id="title", value="Title";
$:define: id="description", value="This is a page.";
$:define: id="lorem", value="$:lorem;";
<div>$%copyright;</div>
<div>$%title;</div>
<div>$%description;</div>
<div>$%lorem;</div>
```

becomes:

```html
<div>EB-Wan</div>
<div>Title</div>
<div>This is a page.</div>
<div>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut ultricies enim. Donec accumsan feugiat aliquet. Nam rhoncus non massa in tristique. Quisque molestie est.</div>
```

after compilation.

---

### Comments

A comment is a block of text that is **ignored by the compiler** and **won't appear in the final site**.
This is typically used to leave notes or temporarily disable part of the code.

A comment starts with `/*` and ends with `*/`.

**Example:**

```
/* $%copyright; is required */

<div>$%copyright;</div>
<div>$%title;</div>
<div>$%description;</div>
/* <div>$:date;</div> */

/* 
    $%title; and $%description; are also required.

    $:date; is optional.
*/
```

becomes:

```html
<div>EB-Wan</div>
<div>Title</div>
<div>This is a page.</div>
```

---

## Dynamic Concepts in Leger-UI Scripting

This is where the fun begins... In this section we will see how to make a dynamic page with Leger-UI Scripting.

### Procedures

A procedure is an exression identified by `$!`. Procedures will get converted into JavaScript functions. The procedure's arguments will define the function's content. For a full list of Procedures Commands see[List of Procedures Commands](#list-of-procedure-commands) section.

```
$!decrease variable="counter", sub="1", call="updateCounter";
$!increase variable="counter", add="1", call="updateCounter";

$!updateCounter element="counter", print="counter";

<button onClick="decrease()" id="setButton">-</button>
<button onClick="increase()" id="setButton">+</button>
<div>Counter is at : <span id="counter"></span></div>
```

---

## List of Commands

## List of Procedures Commands

---
