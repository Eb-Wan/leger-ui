# Leger-UI Frontend Compiler

> Don't use this in production.

Leger-UI V2 is done. V2 brings many features and fixes. For example you can now create dynamic CSS and JS.

This version is still far from perfect, I'm working on version 3 to make it even better. There will be no documentation on this version exept the following code (and the many other things I have made and will keep as long as I can).

main.lgs

```
<import>
    <name>filename.lgs</name>
</import>

/* Declaring page1 */
<page1>
    <lang>en</lang>
    <head>
        <title>Title</title>
    </head>
    <view>
        /* Using imported script, passing text and fontSize as arguments */
        $/name text="Hellord !" fontSize="24px";
    </view>
</page1>

/* Declaring page2 */
<page2>
    <lang>en</lang>
    <head>
        <title>Page 1</title>
    </head>
    <view>
        <p>Example</p>
    </view>
    <style>
        p {
            font-size: 24px;
        }
    </style>
    <script>
        console.log("When compiling this file '$$text;' was passed in the arguments.")
    </script>
</page2>

/* Export will allow these declared pages to be exported to the parent scope, */
/* but since we already are at the highest level already, these will be written as HTML, CSS and JS files. */
<export>
    <page1>index</page1>
    <page2>page2</page2>
</export>
```

filename.lgs

```
<view>
    <p>$$text;</p>
</view>
<style>
    p {
        font-size: $$fontSize;;
    }
</style>
```

To compile these :
`node path/to/leger-ui.js -i path/to/main.lgs -o path/to/output-directory -a '{ "text":"Arguments" }'`

And it should work.