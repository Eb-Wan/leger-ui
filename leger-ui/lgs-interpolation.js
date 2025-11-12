const lgsExecute = require("./lgs-execute.js");

/**
 * Replaces LGS expressions with their results
 * @param {string} string
 * @returns {string}
 */

function interpolateLgs(string, mem) {
    // loop until no expressions are left
    // if expression begins with $ replace with mem property content
    // if expression begins with / read path and execute new script and
    // replace expression with correct result
    // else replace with empty string and throw warning
    return string;
}

module.exports = interpolateLgs;