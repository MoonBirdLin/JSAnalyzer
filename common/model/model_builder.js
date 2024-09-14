const fs = require('fs');
const pathModule = require('path');
const constantsModule = require('../constants');
const astparser = require('../util/ast/parser/astparser');
const codeProcessor = require('../core/transformation/preprecessor');
const flownodeFactory = require('../util/esgraph/flownodefactory');
const astParserCtrl = require('../../scenery/astParserCtrl');

/**
 * Initializes the parse tree with unique node IDs
 * @param {String} scriptName (unique path name of the script)
 * @param {String} code (string of the code)
 * @param {String} language (options: js | nodejs)
 * @param {Bool} preprocessing: whether to do code preprocessing and transformation before analysis
 * @returns {void}
 */
async function initializeModelsFromSource(scriptName, scriptPath, code, language, preprocessing = false){
	// "use strict";
	var parser = await astParserCtrl.getOrSetAstParser();
	var options = null; // fall back to default parser options
	console.log('[-] parsing script: '+ scriptName);
	var ast = await astparser.createASTFromSource(code, parser, options);
	if( !ast )
	{
		console.log("[-] exiting CPG generation, as parser error occured.");
		return scriptName;
	}

	// esmangle passes break the pipeline [disabled]
	// preprocessing = false;

	/* if(typeof preprocessing === 'undefined'){
		// do the code preprocessing by default
		preprocessing = true;
	}*/


	if(preprocessing){
		let inputScript = scriptPath;
		let outputScript = inputScript.replace(/\.js$/, "") + '.prep.js';
		
		let result = await codeProcessor.startPasses(inputScript, ast, outputScript);
		
		if(result && result.success){

			// change the input to the new processed script
			ast = result.ast;	
			scriptPath = outputScript;

		}

	}


	if(ast && ast.type == "Program"){
		ast.value = scriptName;
		ast.kind = language; // store the lang
 	}

	// Initialize the AST Tags
    await parser.traverseAST(ast, function(node){
        if(node && node.type){
            let _id = flownodeFactory.count;
            if(_id in flownodeFactory.generatedExitsDict){
                 flownodeFactory.count= flownodeFactory.count + 1; 
                 _id = flownodeFactory.count    
            }
            // This will add a new property "_id" to the AST node
            node._id = _id;
            flownodeFactory.count= flownodeFactory.count + 1;
			// Add a new property "_name" to the AST node
			if(node.type == "FunctionDeclaration") {
				// For function without Name, we make it func+_id
				node._name = "func_"+node.id.name;
			} else if (node.type == "FunctionExpression") {
				node._name = "func_"+node._id;
			} else if (node.type == "VariableDeclarator" && node.id.type == "Identifier"){
				node.id._name = "var+"+node._id;
			} else {
				// pass
			}
        }
    });
    // add ast to scope
	// await scopeCtrl.addPageScopeTree(ast);

	// console.log('[-] finished adding node ids to AST');

	// console.log('[-] indexing LoCs to nodes');
	// let scriptFileName = scriptName.split('/').pop();
	// await graphBuilder.generateLineToMapIndex(ast, scriptFileName);
	// console.log('[-] finished indexing LoCs');
	return ast;
}

function dumpAst(ast, outputFile) {
	"use strict"
    fs.writeFileSync(outputFile, JSON.stringify(ast, null, 4), 'utf8');
} 

module.exports = {
    initializeModelsFromSource: initializeModelsFromSource,
	dumpAst: dumpAst,
};