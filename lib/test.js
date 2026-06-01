import { parseTemplate } from "./lgui-template-compiler.js";

console.log(parseTemplate(`
    <p>test</p>
    <p class="test">\${test}</p>
    <p class="test">
        test
        <p></p>
    </p>
`));