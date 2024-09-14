const astparser = require('../common/util/ast/parser/astparser');
const constantsModule = require('../common/constants');

// AST Parser SingleTon. This is a global singleton to get the astParser with target language(For now, js only)
function getAstParser() {
    var delegate = null;
    async function astParserInstance (astParserString = "default") {
        if (astParserString == "default") {
            // get a default ast parser
            if (delegate == null) {
                delegate = await astparser.getParser(constantsModule.LANG.js);
                return delegate;
            } else {
                return delegate;
            }
        } else if (delegate == null) {
            // TODO : Check the astParser is valid or not(for now it cannot be checked for it's Class must be an Object)
            delegate = await astparser.getParser(constantsModule.LANG.js);
        } else {
            console.warn("astParser changed!");
            delegate = await astparser.getParser(astParserString);
        }
        return delegate;
    }
    return astParserInstance;
}
let astParserSingleTon = getAstParser();

module.exports = {
    getOrSetAstParser:astParserSingleTon,
};