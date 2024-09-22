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
const renameCtrl = require('../../ns/renameCtrl');

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
						node._scopeName = node.value.replace(/\.js$/, "").replace("\\", "_").replace("/", "_");
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
					// Try contains the parent-scope of Try-catch-finally
					// Catch-Finally has different scopes for itself and its body
					case "TryStatement":
						node._scopeName = "try_"+node._id;
						// node.block._scopeName = "try_"+node._id;
						node.block._isTryBlock = true;
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
					// Methods
					case "MethodDefinition" :
						// Scope name for object's variable prpoperties
						if (node.key && node.key.type && node.key.type == "Identifier") {
							if (node.static) {
								node._scopeName = "method_static_def_"+node.key.name;
							} else {
								node._scopeName = "method_def_"+node.key.name;
							}
						} else {
							if (node.static) {
								node._scopeName = "method_static_def_"+node._id;
							} else {
								node._scopeName = "method_def_"+node._id;
							}
						}
						// Object Properties will be a ExpressionStatement, i.e. have been covered 
						break;
					case "YieldExpression" :
						node._scopeName = "yield_"+node._id;
						break;
					// Other BlockStatements(if a BlockStatement is not a child of a Function/Class/Loop/If/Else/Case, it should has its own scope)
					case "BlockStatement":
						if (!node._isTryBlock && node._scopeName == null){
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
				let newNameSpace = new namespace.NamespaceNode(undefined, node, scopeNode, null, new Set());
				namespace.NamespaceController.addNameSpace(node, newNameSpace);
				// Add Root Namespaces
				if (node.type == "Program") {
					namespace.NamespaceController.addRootNameSpace(newNameSpace);
				}
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
				let spaceName = parentSpaceName ? parentSpaceName + "$$" + currScopeName : currScopeName;
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

/**
 * Rename all varaibles with namespaces
 * @returns {void}
 */
async function renameVariables(rootAstNode) {
	// Namespace controllor
	const namespaceController = namespace.NamespaceController;
	// Rename controllors
	const renameControllor = renameCtrl.RenameControllor;
	const namespaceUsingPointers = renameCtrl.NamespaceUsingPointers;
	const namespaceDefPointers = renameCtrl.NamespaceDefPointers;
	const nameMap = renameCtrl.NameMap;
	const nameSpaceRenameCtrl = renameCtrl.NameSpaceRenameCtrl
	// AST parser
	var parser = await astParserCtrl.getOrSetAstParser();

	// compute the current nodes
	let currentNodes = new Set();
	parser.traverseAST(rootAstNode, function(node){
		currentNodes.add(node);
	});

	// pre-process for static methods and fields (Could not be done in for the methods and fields relate to the objects' usage)
	// for (const rootNSNode of namespaceController.getRootNameSpaces()){
	// 	const astNode = rootNSNode.getAstNode();
	// 	parser.traverseASTWithFlag(astNode, function(node){
	// 		switch (node.type) {
	// 			case "ClassBody" : {
	// 				const body = node.body;
	// 				for (let i = 0; i < body.length; i++) {
	// 					const bodyNode = body[i];
	// 					if (bodyNode.type === "MethodDefinition") {
	// 						if (bodyNode.static == true) {
	// 							let declId = bodyNode.key;
	// 							if (declId && declId.type && declId.type == "Identifier") {
	// 								declId.name = "static_"+declId.name;
	// 							}
	// 						}
	// 					} else if (bodyNode.type === "Property") {
	// 						if (bodyNode.static == true) {
	// 							let declId = bodyNode.key;
	// 							if (declId && declId.type && declId.type == "Identifier") {
	// 								declId.name = "static_"+declId.name;
	// 							}
	// 						}
	// 					}
	// 				}
	// 			}
	// 		}
	// 	});
	// }

	// Initialize the used and defined of each namespace
	let classOrObjectFields = new Set();
	let classOrObjectMethods = new Set();
	let shouldNotBeRenamed = new Set();
	let processedSpecialCases = new Set();

	// Compute the used and defined of each namespace
	for (const [astNode, namespaceNode] of namespaceController.getNameSpacePool()) {
		if (!currentNodes.has(astNode)) {
			continue;
		}
		// Define
		parser.traverseASTWithFlag(astNode, function(node){
			// usage functions:
			function parsePattern(node, originNode) {
				// Baisic Pattern: BindingPattern(ArrayPattern | ObjectPattern), AssignmentPattern
				// Recursion ending : Indentifier
				/* Special Types:
					1. RestElement : For ArrayPattern (ArrayPatternElement can be AssignmentPattern | Identifier | BindingPattern | RestElement | null)
					2. Property : For ObjectPattern (ObjectPattern contains properties which are Property)
				*/
				/* 
				There are two ways to run recursion:
					1. Recursion with traverseASTWithFlag API, just traverse the ast, and stop on some node
					2. Actively call parsePattern on some special node and it's sub-nodes (such as AssignmentPattern should only traverse the left node only)
				*/
				parser.traverseASTWithFlag(node, function(node){
					switch (node.type) {
						case "Identifier" : {
							namespaceDefPointers.addPointer(namespaceNode, node.name, node, node);
							// break;
							return true;
						}
						case "ObjectPattern" : {
							// go into sub-nodes
							break;
						}
						case "ArrayPattern" : {
							// go into sub-nodes
							break;
						}
						case "AssignmentPattern" : {
							// Process left only
							let leftVar = node.left;
							parseParam(leftVar, originNode);
							// sub-nodes has been processed
							return true;
						}
						case "RestElement" : {
							// go into sub-nodes
							break;
						}
						case "Property" : {
							// Process value only
							let value = node.value;
							parseParam(value, originNode);
							// sub-nodes has been processed
							return true;
						}
						default:
							break;
					}
					return false;
				});
			}
			function parseParam(node, originNode) {
				if (node && node.type && node.type == "Identifier") {
					namespaceDefPointers.addPointer(namespaceNode, node.name, originNode, node);
				} else {
					parsePattern(node, originNode);
				}
			}
			if (node && node.type){
				switch (node.type) {
					// Normal Declaration
					case "VariableDeclaration" :{
						for (decl of node.declarations){
							if (decl && decl.type == "VariableDeclarator"){
								let declId = decl.id;
								if (declId) parsePattern(declId, node);
							}
						}
						// Sub-nodes has been processed
						return true;
					}
					// For a catch
					case "CatchClause" : {
						let param = node.param;
						if (param) parseParam(param, node);
						// Sub-nodes has been processed
						return true;
					}
					// For a function
					case "FunctionExpression" : 
					case "ArrowFunctionExpression":
					case "FunctionDeclaration" :{
						if (node._scopeName && node != astNode) {
							// In a new scope
							// Function define
							let declId = node.id;
							if (declId && declId.type && declId.type == "Identifier") {
								// namespaceDefPointers.addPointer(namespaceNode, "funcDecl_"+declId.name, node, declId);
								namespaceDefPointers.addPointer(namespaceNode, declId.name, node, declId);
							} else {
								if (declId != null) {
									// namespaceDefPointers.addPointer(namespaceNode, "funcDecl_"+declId._id, node, declId);
									namespaceDefPointers.addPointer(namespaceNode, declId._id, node, declId);
								}
							}
							return true;
						}
						// current function args define
						for (const param of node.params) {
						    parseParam(param, node)
						}
						// Sub-nodes has been processed
						return true;
					}
					// For an object
					case "ObjectExpression" : {
						// an object cannot become a pointer
						if (node._scopeName && node != astNode){
							// In a new scope
							return true;
						}
						for (const nnode of node.properties) {
							if (nnode.type == "Property") {
								classOrObjectFields.add(nnode);
							} else {
								classOrObjectMethods.add(nnode);
							}
						}
						// This pointer
						namespaceDefPointers.addPointer(namespaceNode, "this", node, node);
						break;
					}
					// For a class
					case "ClassExpression":
					case "ClassDeclaration": {
						if (node._scopeName && node != astNode) {
							// In a new scope
							// class define
							let declId = node.id;
							if (declId && declId.type && declId.type == "Identifier") {
								// namespaceDefPointers.addPointer(namespaceNode, "classDecl_"+declId.name, node, declId);
								namespaceDefPointers.addPointer(namespaceNode, declId.name, node, declId);
							} else {
								if (declId != null) {
									// namespaceDefPointers.addPointer(namespaceNode, "classDecl_"+declId._id, node, declId);
									namespaceDefPointers.addPointer(namespaceNode, declId._id, node, declId);
								}
							}
							return true;
						}
						// This pointer
						namespaceDefPointers.addPointer(namespaceNode, "this", node, node);
						// if (node != astNode) 
						// 	return true;
						break;
					}
					case "ClassBody" : {
						for (const nnode of node.body) {
							if (nnode.type == "Property") {
								classOrObjectFields.add(nnode);
							} else {
								classOrObjectMethods.add(nnode);
							}
						}
						break;
					}
					// There is some special cases of Property
						// Classes' fields will be a Property node
						// Objects' properties will be a Property node
					case "Property": {
						// Parse class or object fields
						if (!classOrObjectFields.has(node)) {
							return true;
						}
						if (node.key && node.key.type && node.key.type == "Identifier"){
							parsePattern(node.key, node);
							return true;
						}
						// go into sub-nodes
						break;
					}
					// For a method definition
					case "MethodDefinition":
						if (node._scopeName && node != astNode) {
							// In a new scope
							// Method define
							let declId = node.key;
							if (declId && declId.type && declId.type == "Identifier") {
								// namespaceDefPointers.addPointer(namespaceNode, "methodDecl_"+declId.name, node, declId);
								namespaceDefPointers.addPointer(namespaceNode,""+declId.name, node, declId);
							} else {
								if (declId != null) {
									// namespaceDefPointers.addPointer(namespaceNode, "methodDecl_"+declId._id, node, declId);
									namespaceDefPointers.addPointer(namespaceNode, declId._id, node, declId);
								} else {
									// namespaceDefPointers.addPointer(namespaceNode, "methodDecl_"+node._id, node, declId);
									// namespaceDefPointers.addPointer(namespaceNode, node._id, node, declId);
								}
							}
							return true;
						}
						// Sub-nodes has been processed
						return true;
					default:{
						// Important! The use and define are for each scope
						if (node._scopeName && node != astNode) {
							// In a new scope
							return true;
						}
						break;
					}
				}
			}
			return false;
		});
		// Use
		// The class methods and fields cannot be renamed
		// The object properties cannot be renamed
		for (const nnode of classOrObjectFields) {
			shouldNotBeRenamed.add(nnode);
		}
		for (const nnode of classOrObjectMethods) {
			parser.traverseAST(nnode, function(node){
				if (node && node.type && (node.type == "Identifier" || node.type == "Property")) {
					shouldNotBeRenamed.add(node);
				}
			});
			// shouldNotBeRenamed.add(nnode.key);
		}
		parser.traverseASTWithFlag(astNode, function(node){
			function parseCases(node, originNode) {
				switch (node.type) {
					case "Identifier" :{
						// All using will be an Identifier
						namespaceUsingPointers.addPointer(namespaceNode, node.name, originNode, node);
						return true;
					}
					case "ThisExpression" : {
						namespaceUsingPointers.addPointer(namespaceNode, "this", originNode, node);
						return true;
					}
					case "MemberExpression" : {
						// only process object without property
						// the field cannot be renamed for it's related to object
						parseCases(node.object, originNode)
						return true;
					}
					default : {
						if (shouldNotBeRenamed.has(node)) {
							return true;
						}
						// Important! The use and define are for each scope
						if (node._scopeName && node != astNode) {
							// In a new scope
							return true;
						}
						break;
					}
				}
				return false;
			}
			if (node && node.type){
				// Important! The use and define are for each scope
				if (node._scopeName && node != astNode) {
					// Parse new scope
					switch (node.type) {
						case "FunctionExpression" : 
						case "ArrowFunctionExpression":
						case "FunctionDeclaration" :{
							// Function define
							let declId = node.id;
							if (declId && declId.type && declId.type == "Identifier") {
								namespaceUsingPointers.addPointer(namespaceNode, declId.name, node, declId);
								processedSpecialCases.add(declId);
							} else {
								if (declId != null) {
									namespaceUsingPointers.addPointer(namespaceNode, declId._id, node, declId);
									processedSpecialCases.add(declId);
								}
							}
							break;
						}
						// For a class
						case "ClassExpression":
						case "ClassDeclaration": {
							// class define
							let declId = node.id;
							if (declId && declId.type && declId.type == "Identifier") {
								namespaceUsingPointers.addPointer(namespaceNode, declId.name, node, declId);
								processedSpecialCases.add(declId);
							} else {
								if (declId != null) {
								    namespaceUsingPointers.addPointer(namespaceNode, declId._id, node, declId);
									processedSpecialCases.add(declId);
								}
							}
							break;
						}
						// For a method definition
						case "MethodDefinition": {
							// Method define
							let declId = node.key;
							if (declId && declId.type && declId.type == "Identifier") {
								namespaceUsingPointers.addPointer(namespaceNode, declId.name, node, declId);
								processedSpecialCases.add(declId);
							} else {
								if (declId != null) {
									namespaceUsingPointers.addPointer(namespaceNode, declId._id, node, declId);
									processedSpecialCases.add(declId);
								} else {
									// namespaceUsingPointers.addPointer(namespaceNode, node._id, node, declId);
									// processedSpecialCases.add(declId);
								}
							}
							break;
						}
						default : {
							break;
						}
					}
					return true;
				} else if (processedSpecialCases.has(node)) {
					return true;
				}
				return parseCases(node, node);
			}
			return false;
		});
	}
	let fullShouldNotBeRenamed = new Set();
	for (const nnode of shouldNotBeRenamed) {
		fullShouldNotBeRenamed.add(nnode);
		parser.traverseASTWithFlag(nnode, function (node){
			switch (node.type) {
				case "Identifier" :
				case "MethodDefinition":
				{
					fullShouldNotBeRenamed.add(node);
					return true;
				}
				default:
					break;
			}
			return false;
		});
	}
	
	// Construct NameSpaceRenameCtrl with Namespace Tree
	let rootNameSpace = namespaceController.getNameSpace(rootAstNode);
	// Notice : there was a bug that I missed the renameVariables is a inter-module analysis, so I computed on all rootNameSpaces for each module. Now I patched it with a accessable Set, but it is still a time-consuming operation.
	// Todo : Refact this part to a inter-module analysis.(Make the renameCtrl.*(such asrenameControllor, namespaceUsingPointers, and so on) local to each module)
	// for (const rootNameSpace of namespaceController.getRootNameSpaces()){
		let queue = new Array();
		queue.push(rootNameSpace);
		while (queue.length > 0) {
			let namespaceNode = queue.shift();
			let defPointers = namespaceDefPointers.getPointers(namespaceNode);
			if (!namespaceNode.hasParent()) {
				// root namespace
				for (const defPointer of defPointers) {
					if (fullShouldNotBeRenamed.has(defPointer.astNode) || fullShouldNotBeRenamed.has(defPointer.defASTNode)) {
						continue;
					}
					const newName = namespaceDefPointers.makeNewName(namespaceNode, defPointer);
					nameSpaceRenameCtrl.addNamespace(namespaceNode, defPointer.pointer, newName);
				}
			} else {
			    const parentNameSpace = namespaceNode.getParent();
				let shouldNotBeCopied = new Set();
				for (const defPointer of defPointers) {
					if (fullShouldNotBeRenamed.has(defPointer.astNode) || fullShouldNotBeRenamed.has(defPointer.defASTNode)) {
						oldName = defPointer.pointer;
						shouldNotBeCopied.add(oldName);
					}
				}
				// Copy all pointerNames from parent
				// Todo: This is a memory for run time performance strategy. Maybe can be optized with pre-computed potentially used pointer.
				for (const [oldName, newName] of nameSpaceRenameCtrl.getNamespace(parentNameSpace)) {
					// if (shouldNotBeCopied.has(oldName)){
					// 	continue;
					// }
					nameSpaceRenameCtrl.addNamespace(namespaceNode, oldName, newName)
				}
				// Update all pointer name as current Namespace's pointer name
				for (const defPointer of defPointers) {
					if (fullShouldNotBeRenamed.has(defPointer.astNode) || fullShouldNotBeRenamed.has(defPointer.defASTNode)) {
						continue;
					}
				    const newName = namespaceDefPointers.makeNewName(namespaceNode, defPointer);
					nameSpaceRenameCtrl.addNamespace(namespaceNode, defPointer.pointer, newName);
				}
			}
			
			for (const child of namespaceNode.children) {
				queue.push(child);
			}
		}
	// }
	
	// Rename all variables
	// We can use a asynchronous method to rename all variables, since we have computed all name mapping in each namespace node
	function constructOneNamespace(nameSpaceNode) {
		return new Promise(async function (resolve, reject){
		    try {
				// let pointers = namespaceUsingPointers.getPointers(nameSpaceNode);
				for (const usingPointer of namespaceUsingPointers.getPointers(nameSpaceNode)) {
					if (fullShouldNotBeRenamed.has(usingPointer.astNode) || fullShouldNotBeRenamed.has(usingPointer.defASTNode)) {
						// For the fields/methods/properties, we should not rename them
						// await renameControllor.renameOnePointer(nameSpaceNode, usingPointer, false);
					} else {
						await renameControllor.renameOnePointer(nameSpaceNode, usingPointer, true);
					}
				}
				resolve();
			} catch (e) {
				console.error(e);
			}

		})
	}
	let promiseList = new Array();
	for (const namespaceNode of namespaceController.getAllNameSpaces()){
	    promiseList.push(constructOneNamespace(namespaceNode));
	}
	await Promise.all(promiseList);

}

function dumpAst(ast, outputFile) {
	"use strict"
    fs.writeFileSync(outputFile, JSON.stringify(ast, null, 4), 'utf8');
} 

module.exports = {
    initializeModelsFromSource: initializeModelsFromSource,
	initializeScopeAndNamespace: initializeScopeAndNamespace,
	renameVariables:renameVariables,
	dumpAst: dumpAst,
};