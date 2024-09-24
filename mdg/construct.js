const fs = require('fs');
const path = require('path');
const esprima = require('esprima');
const astCtrl = require('../scenery/astCtrl');
const astParserCtrl = require('../scenery/astParserCtrl');
const { exit } = require('process');
const { error } = require('console');

async function processModule(ast, currModuleName){
    let imports = [];
    let exports = [];
    let parser = await astParserCtrl.getOrSetAstParser();
    parser.traverseAST(ast, function (node) {
        // Find all require statements
        if (node && node.type && node.type === 'CallExpression') {
            const calleeName = node.callee.name;
            if (calleeName) {
                const arr = calleeName.split('$$');
                if (arr[arr.length - 1] == 'require'){
                    const moduleName = node.arguments[0].value; // 获取 require 的模块名称
                    imports.push(moduleName);
                }
            }
        }

        // 查找 module.exports 语句
        if (node && node.type && node.type === 'AssignmentExpression' &&
            node.left.object && node.left.object.name && node.left.property && node.left.property.name
            ) {
                let arr = node.left.object.name.split('$$');
                if (arr[arr.length - 1] === 'module' && node.left.property.name === 'exports') {
                    if (node.right.type === 'Identifier') {
                        exports.push(currModuleName+'$$Variable$$'+node.right.name); // 记录导出的对象
                    } else if (node.right.type === 'FunctionExpression' || node.right.type === 'ArrowFunctionExpression') {
                        exports.push(currModuleName+'$$function$$'+String(node.right._id)); // 记录导出的函数
                    } else {
                        exports.push(currModuleName+'$$uncatched_object$$'+String(node.id)); // 记录导出的非函数对象
                    }
                }
                
            }
        }
    );
    return [imports, exports];
}

class ModuleDependencyGraph {
    constructor() {
        this.moduleDependencyGraph = new Map();
        
    }
    async initialize() {
        await this.constructMDG();
    }
    async constructMDG(inputAstPool = null) {
        let astpool = inputAstPool;
        if (astpool == null) {
            astpool = astCtrl.getAstPool();
        }
        if (astpool.size == 0) {
            console.error('AST pool is empty');
            exit(1);
        }
        for (let [name, ast] of astpool.getAstPool()) {
            let [imports, exports] = await processModule(ast, name);
            this.moduleDependencyGraph.set(name, {imports, exports});
        }
        // console.log('MDG constructed');
    }
    
    dumpMDG() {
        let mapObj = Object.fromEntries(this.moduleDependencyGraph);
        return JSON.stringify(mapObj, null, 4)
    }
    
}

function getMDG() {
    var delegate = null;
    function mdgInstance () {
        if (delegate == null) {
            delegate = new ModuleDependencyGraph();
        }
        return delegate;
    }
    return mdgInstance;
}

let moduleDependencyGraphSingleTon = getMDG();

module.exports = {
    getMDG: moduleDependencyGraphSingleTon,
};