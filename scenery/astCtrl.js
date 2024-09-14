const moduleBuilder = require('../common/model/model_builder');
const SourseReader = require('../common/core/io/sourcereader');
const config = require('./config');

// Ast Pool : All target files' ASTs
class AstPool {
    constructor() {
        this.pool = new Map();
    }

    getAstPool(){
        return this.pool;
    }

    setAst(ast, astName) {
        this.pool.set(astName, ast);
    }

    modifyAST(ast, astName) {
        if (this.pool.has(astName)) {
            this.pool.set(astName, ast);
        }
    }

    addAst(ast, astName) {
        if (this.pool.has(astName)) {  
            return;
        }
        this.pool.set(astName, ast);
    }

    getAst(astName) {
        return this.pool.get(astName);
    }

    deleteAst(astName) {
        this.pool.delete(astName);
    }

    // Construct JS into AST from a file
    async constructAst(astPath, rootPth) {
        // let scriptName = astPath.replace('.js', '').split('/').pop();
        let scriptName = astPath.replace(rootPth, "");
        let code = SourseReader.getSourceFromFile(astPath);
        let ast = await moduleBuilder.initializeModelsFromSource(scriptName, astPath, code, config, false);
        await this.addAst(ast, scriptName);
    }

    // Construct All JS into ASTs from a directory
    async constructAstDir(dirPath) {
        let targetFiles = config.getJsFiles(dirPath);
        for(const targetFile of targetFiles) {
            await this.constructAst(targetFile, dirPath);
        }
    }

    dumpAstPool() {
        // let mapObj = Object.fromEntries(this.pool);
        // return JSON.stringify(mapObj, null, 4)
        let mapObj = new Map();
        for (let [astName, ast] of this.pool) {
            mapObj.set(astName, JSON.stringify(ast, null, 4));
        }
        return mapObj;
    }
}

// Ast SingleTon, contains All ast tree of js files.
function getAstPool() {
    var delegate = null;
    function astPoolInstance () {
        if (delegate == null) {
            delegate = new AstPool();
        }
        return delegate;
    }
    return astPoolInstance;
}

let astPoolSigleTon = getAstPool();


module.exports = {
    getAstPool: astPoolSigleTon
};