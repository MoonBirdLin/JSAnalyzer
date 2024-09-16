const fs = require('fs');
const pathModule = require('path');
const constantsModule = require('../constants');
const astparser = require('../util/ast/parser/astparser');
const codeProcessor = require('../core/transformation/preprecessor');
const flownodeFactory = require('../util/esgraph/flownodefactory');
const astParserCtrl = require('../../scenery/astParserCtrl');

// Define all ast intiialization functions
function initializeAstCallbacks() {
	let callbacks = [];
	// Initialize the AST Tags
	callbacks.push(function(node){
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
	// Initialize the Scope Names (Dependent on the AST Tags)
	// This is a huge FMS(Finate State Machine) to initialize the scope names
	callbacks.push(function(node){
	    if(node && node.type){
			// If the node has a solid property with "BlockStatement", the scope name is belong to the BlockStatement node; Or otherwise, the scope name is belong to the node itself
            switch (node.type) {
				// Root node of a file
				case "Program":
                    node._scopeName = node.value;
                    break;
                // Functions
				case "FunctionDeclaration":
					if (node.body && node.body.type == "BlockStatement"){
						if (node.id) {
							node.body._scopeName = "func_"+node.id.name;
						} else {
							node.body._scopeName = "func_"+node._id;
						}
					}
                    break;
                case "FunctionExpression":
					if (node.body && node.body.type == "BlockStatement"){
						node.body._scopeName = "func_"+node._id;
					}
                    break;
				case "ArrowFunctionExpression" :
					if (node.body && node.body.type == "BlockStatement"){
						node.body._scopeName = "func_"+node._id;
					} else if (node.body && node.body.type == "ExpressionStatement"){
						// If there is no function body, the scope belongs to the parent node
						// get a new _id for the new block statement
						let new_id = flownodeFactory.count;
						if(new_id in flownodeFactory.generatedExitsDict){
							flownodeFactory.count= flownodeFactory.count + 1; 
							new_id = flownodeFactory.count    
						}
						flownodeFactory.count= flownodeFactory.count + 1;
						// create a new block statement
						newBlockStatement = {
							type: "BlockStatement",
							body: [node.body],
							_id: new_id,
							_isAddedBlockStatement: true
						}
						node.body = newBlockStatement;
						node.body._scopeName = "func_"+node._id;
					}
                    break;
				// Control-flow Structures
				// True-False Branches has different scopes
				case "IfStatement":
					if (node.consequent){
						// Create a new block statement for the consequent, if the consequent is not a block statement
						if (node.consequent.type != "BlockStatement") {
							// get a new _id for the new block statement
							let new_id = flownodeFactory.count;
							if(new_id in flownodeFactory.generatedExitsDict){
								flownodeFactory.count= flownodeFactory.count + 1; 
								new_id = flownodeFactory.count    
							}
							flownodeFactory.count= flownodeFactory.count + 1;
							// create a new block statement
							newBlockStatement = {
								type: "BlockStatement",
								body: [node.consequent],
								_id: new_id,
								_isAddedBlockStatement: true
							}
							node.consequent = newBlockStatement;
						}
						node.consequent._scopeName = "if_true_"+node._id;
					}
					if (node.alternate){
						// Create a new block statement for the alternate, if the alternate is not a block statement
						if (node.alternate.type != "BlockStatement") {
							// get a new _id for the new block statement
							let new_id = flownodeFactory.count;
							if(new_id in flownodeFactory.generatedExitsDict){
								flownodeFactory.count= flownodeFactory.count + 1; 
								new_id = flownodeFactory.count    
							}
							flownodeFactory.count= flownodeFactory.count + 1;
							// create a new block statement
							newBlockStatement = {
								type: "BlockStatement",
								body: [node.alternate],
								_id: new_id,
								_isAddedBlockStatement: true
							}
							node.alternate = newBlockStatement;
						}
						node.alternate._scopeName = "if_else_"+node._id;
					}
					break;
				// SwitchCases are the namespaces for a SwitchStatement
				case "SwitchCase" :
					// Each SwitchCase has its own scope
					if (node.consequent){
					    node._scopeName = "switchcase_"+node._id;
					}
					break;
				// Loops have different scopes for itself and its body(condition and body)
				case "ForStatement":
				case "ForInStatement":
				case "ForOfStatement":
				case "WhileStatement":
				case "DoWhileStatement":
					node._scopeName = "loop_"+node._id;
					if (node.body){
					    if (node.body.type != "BlockStatement") {
							// get a new _id for the new block statement
							let new_id = flownodeFactory.count;
							if(new_id in flownodeFactory.generatedExitsDict){
								flownodeFactory.count= flownodeFactory.count + 1; 
								new_id = flownodeFactory.count
							}  
							flownodeFactory.count= flownodeFactory.count + 1;
							// create a new block statement
							newBlockStatement = {
								type: "BlockStatement",
								body: [node.body],
								_id: new_id,
								_isAddedBlockStatement: true
							}
							node.body = newBlockStatement;
						}
						node.body._scopeName = "loop_body_"+node._id;
					}
					break;
                // Try-Catch-Finally has different scopes for itself and its body
				case "TryStatement":
					node.block._scopeName = "try_"+node._id;
					if (node.finalizer) {
						node.finalizer._scopeName = "finally_"+node._id;
					}
					break;
				case "CatchClause":
					node.body._scopeName = "catch_"+node._id;
					break;
				// Classes
				case "ClassExpression":
				case "ClassDeclaration":
					// Scope name for class's variable prpoperties
					node._scopeName = "class_"+node._id;
					// Class Method and Constructor will be a Function
					break;
				// Objects
				case "ObjectExpression" :
					// Scope name for object's variable prpoperties
					node._scopeName = "object_"+node._id;
					// Object Properties will be a ExpressionStatement, i.e. have been covered 
					break;
				case "YieldExpression" :
					node._scopeName = "yield_"+node._id;
					break;
				// Other BlockStatements
				case "BlockStatement":
					if (node._scopeName == null){
					    node._scopeName = "Uncatched_block_"+node._id;
					}
					break;
				default:
                    break;
            }
		}
	})
	return callbacks;
}

let astCallbacks = initializeAstCallbacks();

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

    await parser.traverseAST(ast, function(node){
        for (let i = 0; i < astCallbacks.length; i++) {
            astCallbacks[i](node);
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