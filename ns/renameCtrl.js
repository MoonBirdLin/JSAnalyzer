const { has } = require('lodash');
const namespace = require('./namespace');
const scopeCtrl = require('./scopeCtrl');

// class NamespaceObjectCollector {
//     constructor() {
//         this.objectPool = new Map();
//     }
//     addObject(namespaceNode, object) {
//         if (!this.objectPool.has(namespaceNode)) {
//             this.objectPool.set(namespaceNode, []);
//         }
//         this.objectPool.get(namespaceNode).push(object);
//     }
//     getObjects(namespaceNode) {
//         return this.objectPool.get(namespaceNode);
//     }
//     hasObjects(namespaceNode) {
//         return this.objectPool.has(namespaceNode);
//     }
// }

class ASTPointer{
    // pointer: the variable
    // astNode: original defination or usage astnode; 
        // eg: VariableDeclaration but not VariableDeclarator
    constructor(pointer, astNode, defASTNode) {
        this.pointer = pointer;
        this.astNode = astNode;
        this.defASTNode = defASTNode;
    }
}

class NameSpaceRenameCtrl {
    constructor(verbose=false) {
        this.nsRenamePool = new Map();
        this.verbose = verbose;
    }
    addNamespace(namespaceNode, oldName, newName) {
        if (!this.nsRenamePool.has(namespaceNode)) {
            this.nsRenamePool.set(namespaceNode, new Map());
        }
        let currentMap = this.nsRenamePool.get(namespaceNode);
        if (this.verbose && currentMap.has(oldName)) {
            console.warn("Warning: namespace "+namespaceNode.getSpaceName()+" already has "+oldName+" renamed to "+currentMap.get(oldName));
        }
        currentMap.set(oldName, newName);
    }
    getNamespace(namespaceNode) {
        if (!this.hasNamespace(namespaceNode)) {
            return new Map();
        }
        return this.nsRenamePool.get(namespaceNode);
    }
    hasNamespace(namespaceNode) {
        return this.nsRenamePool.has(namespaceNode);
    }
    getNamespaceMappingInstance(namespaceNode, oldName) {
        try {
            return this.nsRenamePool.get(namespaceNode).get(oldName);
        } catch (e) {
            // console.error("Error: namespace "+namespaceNode.getSpaceName()+" does not have "+oldName);
            return oldName;
        }
    }
}

class NamespacePointerCollector {
    constructor() {
        this.pointerPool = new Map();
    }
    // Notice: for the var style pointer have function-level namespace, we need to remain the pointer use & define priority
    addPointer(namespaceNode, pointer, astNode, defASTNode) {
        if (!this.pointerPool.has(namespaceNode)) {
            this.pointerPool.set(namespaceNode, []);
        }
        this.pointerPool.get(namespaceNode).push(new ASTPointer(pointer, astNode, defASTNode));
    }
    getPointers(namespaceNode) {
        if (!this.hasPointers(namespaceNode)) {
            return [];
        }
        return this.pointerPool.get(namespaceNode);
    }
    hasPointers(namespaceNode) {
        return this.pointerPool.has(namespaceNode);
    }
    makeNewName(namespaceNode, pointer) {
        return namespaceNode.getSpaceName()+"$$"+pointer.pointer;
    }
}

class NameMap {
    constructor() {
        this.nameMap = new Map();
    }
    setName(newName, oldName) {
        this.nameMap.set(newName, oldName);
    }
    getName(newName) {
        if (!hasName(newName)) {
            return null;
        }
        return this.nameMap.get(newName);
    }
    hasName(newName) {
        return this.nameMap.has(newName);
    }
    getNameMap() {
        return this.nameMap;
    }
}

// let objectUsingCollector = new NamespaceObjectCollector();
let pointerUsingCollector = new NamespacePointerCollector();
// let objectDefCollector = new NamespaceObjectCollector();
let pointerDefCollector = new NamespacePointerCollector();
let nameMap = new NameMap();

class RenameCtrl {
    constructor() {
        // this.objectUsingCollector = objectUsingCollector;
        this.pointerUsingCollector = pointerUsingCollector;
        // this.objectDefCollector = objectDefCollector;
        this.pointerDefCollector = pointerDefCollector;
        this.nameMap = nameMap;
    }

    async renameOnePointer(namespaceNode, pointer, shouldNameWithRoot = true) {
        let newName = ""
        try {
            newName = await nameSpaceRenameCtrl.getNamespaceMappingInstance(namespaceNode, pointer.pointer);
        } catch (error) {
            newName = await this.pointerDefCollector.makeNewName(namespaceNode, pointer);
        }
        // Important: There are some identifiers cannot be renamed!
        if (newName == undefined || newName == null || newName == "") {
            // newName = pointer.pointer
            // The undefined but used variables will be defaultly defined in root scope.
            if (shouldNameWithRoot) {
                newName = namespaceNode.getSpaceName().split("$$")[0]+"$$"+pointer.pointer;
            } else {
                newName = pointer.pointer;
            }
        }
        this.nameMap.setName(newName, pointer.pointer);
        function renameAstNode(node, newname) {
            switch (node.type) {
                case 'Identifier': {
                    node.name = newname;
                    break;
                }
                case 'ClassExpression':
                case 'ClassDeclaration': {
                    if (node.id != null) {
                        node.id.name = newname;
                    } else {
                        node._rename = {
                            type: 'Identifier',
                            name: newname
                        }
                    }
                    break;
                }
                case 'ThisExpression': {
                    // node._rename = {
                    //     type: 'Identifier',
                    //     name: newname
                    // };
                    node.type = 'Identifier';
                    node.name = newname;
                    break;
                }
                default:
                    break;
            }
        };
        renameAstNode(pointer.defASTNode, newName);
    }

    static 
}
let nameSpaceRenameCtrl = new NameSpaceRenameCtrl()
module.exports = {
    RenameControllor: new RenameCtrl(),
    // NamespaceUsingObjects : objectUsingCollector,
    NamespaceUsingPointers: pointerUsingCollector,
    // NamespaceDefObjects: objectDefCollector,
    NamespaceDefPointers: pointerDefCollector,
    NameMap: nameMap,
    NameSpaceRenameCtrl: nameSpaceRenameCtrl,
}