const constantsModule = require('../../../constants');

/**
 * Get parser for a given language
 * @param {String} language
 */
async function getParser(language){
	"use strict";
	var parser;
	if(language == constantsModule.LANG.js || language == constantsModule.LANG.nodejs){
		parser =  require('./jsparser');
	} 
	else {
		parser = null;
	}
	return parser;

}

/**
 * Creates an abstract syntax tree from code string
 * @param {String} code (string of the code)
 * @param {String} language (options: js | nodejs)
 * @param {Object} [options] Option object
 * @returns {Object} AST
 */
async function createASTFromSource(code, language, options){

	try {
		var parser = await getParser(language);
		if(parser) {
			return await parser.parseAST(code, options);
		}
		console.log("[-] parser not found.");
		return null;
	}
	catch(err){
		console.log("[-] parser error.");
		constantsModule.verboseMode && console.log(err);
		return null;
	}

}

module.exports = {
	createASTFromSource: createASTFromSource,
    getParser: getParser,
};