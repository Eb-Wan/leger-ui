import { xmlParser } from "./xml-parser.js";

console.log(xmlParser(`
    test
    <a class="test" id={ qsdqsd + kkqskdks }></a>
`));