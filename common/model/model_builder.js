const fs = require('fs');
const pathModule = require('path');
const constantsModule = require('../constants');
const astparser = require('../util/ast/parser/astparser');
const codeProcessor = require('../core/transformation/preprecessor');
const flownodeFactory = require('../util/esgraph/flownodefactory');
const astParserCtrl = require('../../scenery/astParserCtrl');
const scopeCtrl = require('../../ns/scopeCtrl');
const namespace = require('../../ns/namespace');
const pointerCtrl = require('../../pta/pointerCtrl');
const objectCtrl = require('../../pta/objectCtrl');
const contextCtrl = require('../../pta/contextCtrl');

/**
 * Initializes the parse tree with unique node IDs
 * @param {String} scriptName (unique path name of the script)
 * @param {String} code (string of the code)
 * @param {String} language (options: js | nodejs)
 * @param {Bool} preprocessing: whether to do code preprocessing and transformation before analysis
 * @returns ast: constructed astnode
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

	// Define all ast intiialization functions
	// The Callbacks should have no context dependency, so that them can be computed on a same ast node and potentially parallel
	function initializeAstCallbacks(...registCallbacks) {
		let callbacks = [];
		// Initialize the AST Tags
		callbacks.push(function(node, parser){
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
		callbacks.push(function(node, parser){
			if(node && node.type){
				// If the node has a solid property with "BlockStatement", the scope name is belong to the BlockStatement node; Or otherwise, the scope name is belong to the node itself
				switch (node.type) {
					// Root node of a file
					case "Program":
						node._scopeName = node.value;
						break;
					/* Functions can be seen as two new scope
						** 1. The arguments and this pointers.(belone to the function node itself)
						** 2. The body of the function.(belone to the body)
					*/
					case "FunctionDeclaration":
						if (node.id) {
							node._scopeName = "func_"+node.id.name;
						} else {
							node._scopeName = "func_"+node._id;
						}
						if (node.body && node.body.type == "BlockStatement"){
							if (node.id) {
								node.body._scopeName = "func_body_"+node.id.name;
							} else {
								node.body._scopeName = "func_body_"+node._id;
							}
						}
						break;
					case "FunctionExpression":
						if (node.id) {
							node._scopeName = "func_"+node.id.name;
						} else {
							node._scopeName = "func_"+node._id;
						}
						if (node.body && node.body.type == "BlockStatement"){
							node.body._scopeName = "func_"+node._id;
						}
						break;
					case "ArrowFunctionExpression" :
						if (node.id) {
							node._scopeName = "func_"+node.id.name;
						} else {
							node._scopeName = "func_"+node._id;
						}
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
						if (node.id) {
							node._scopeName = "if_"+node.id.name;
						} else {
							node._scopeName = "if_"+node._id;
						}
						// If is a branching statement, so the node itself and branchs have different scope names
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
					// SwitchStatement can be seen as a branching statement, so the node itself and branchs have different scope names
					case "SwitchStatement":
						if (node.id) {
							node._scopeName = "switch_"+node.id.name;
						} else {
							node._scopeName = "switch_"+node._id;
						}
						break;
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
						if (node.id) {
							node._scopeName = "class_"+node.id.name;
						} else {
							node._scopeName = "class_"+node._id;
						}
						// Class Method and Constructor will be a Function
						break;
					// Objects
					case "ObjectExpression" :
						// Scope name for object's variable prpoperties
						if (node.id) {
							node._scopeName = "object_"+node.id.name;
						} else {
							node._scopeName = "object_"+node._id;
						}
						// Object Properties will be a ExpressionStatement, i.e. have been covered 
						break;
					case "YieldExpression" :
						node._scopeName = "yield_"+node._id;
						break;
					// Other BlockStatements(if a BlockStatement is not a child of a Function/Class/Loop/If/Else/Case, it should has its own scope)
					case "BlockStatement":
						if (node._scopeName == null){
							node._scopeName = "Block_"+node._id;
						}
						break;
					default:
						break;
				}
			}
		})
		// Initialize the scopeCtrl (Dependent on the Scope Names)
		// This will initialize the scopeCtrl with the scope names and ast Nodes, the Scope Tree cannot be defined here, it needs a customized AST traversal with stack recording
		callbacks.push(function(node, parser){
			if(node && node.type && node._scopeName){
				scopeCtrl.ScopeController.addScope(node, new scopeCtrl.ScopeNode(node._scopeName, node, null, new Set()));
			}
		})
		// Initialize the namespace
		callbacks.push(function(node, parser){
			if(node && node.type && node._scopeName){
				let scopeNode = scopeCtrl.ScopeController.getScope(node);
				// The namespace is initialized without name
				// The name will be conputed in Scope Tree traversal
				namespace.NamespaceController.addNameSpace(node, new namespace.NamespaceNode(undefined, node, scopeNode, null, new Set()));
			}
		})
		// Add user-customized callbacks
		for (let callback of registCallbacks){
			if (callback instanceof Function && callback.length == 2){
				callbacks.push(callback);
			} else {
				console.error("[-] RegisterCallbacks contains non-callback element: "+callback);
			}
		}
		return callbacks;
	}

	let astCallbacks = initializeAstCallbacks();

    await parser.traverseAST(ast, function(node){
        for (let i = 0; i < astCallbacks.length; i++) {
            astCallbacks[i](node, parser);
        }
    });
    
	return ast;
}

/**
 * Initializes the scope and namespace with constructed ast tree
 * @param ast: constructed astnode
 * @returns {void}
 */
async function initializeScopeAndNamespace(ast) {
	var parser = await astParserCtrl.getOrSetAstParser();
	// Initialize the tree relations of Scope and Namespace
	let parentScopeAstNode = null;
	await parser.traverseASTWithEnterAndExit(ast, function(node){
        if (node && node.type && node._scopeName){
			// Update ScopeCtrl
			let scopeController = scopeCtrl.ScopeController;
			let scopeNode = scopeController.getScope(node);
			if (scopeNode){
				// Update parent
				let parentScopeNode = null;
				if (parentScopeAstNode) {
					parentScopeNode = scopeController.getScope(parentScopeAstNode);
				}
				scopeNode.setParent(parentScopeNode);
				// Update parent's children
				if (parentScopeNode) {
					parentScopeNode.addChild(scopeNode);
				}
			}
			// Update NamespaceCtrl
			let namespaceController = namespace.NamespaceController;
			let namespaceNode = namespaceController.getNameSpace(node);
			if (namespaceNode){
				// Update parent
				let parentNSNode = null;
				if (parentScopeAstNode) {
					parentNSNode = namespaceController.getNameSpace(parentScopeAstNode);
				}
				namespaceNode.setParent(parentNSNode);
				// Update parent's children
				if (parentNSNode) {
					parentNSNode.addChild(namespaceNode);
				}
				// Update spaceName
				let parentSpaceName = null;
				if (parentScopeAstNode) {
					parentSpaceName = namespaceController.getNameSpace(parentScopeAstNode).getSpaceName();
				}
				let currScopeName = scopeNode.getScopeName();
				let spaceName = parentSpaceName ? parentSpaceName + "::" + currScopeName : currScopeName;
				namespaceNode.setSpaceName(spaceName);
			}
			// Update global variable
			parentScopeAstNode = node;
		}
    }, function(node){
		if (node && node.type && node._scopeName){
			let scopeController = scopeCtrl.ScopeController;
			let scopeNode = scopeController.getScope(node);
			let tmpParentScopeAstNode = scopeNode.getParent();
			if (tmpParentScopeAstNode) {
				parentScopeAstNode = tmpParentScopeAstNode.getAstNode();
			} else {
				parentScopeAstNode = null;
			}
		}
	});
}

function dumpAst(ast, outputFile) {
	"use strict"
    fs.writeFileSync(outputFile, JSON.stringify(ast, null, 4), 'utf8');
} 

module.exports = {
    initializeModelsFromSource: initializeModelsFromSource,
	initializeScopeAndNamespace: initializeScopeAndNamespace,
	dumpAst: dumpAst,
};