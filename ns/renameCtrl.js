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
    constructor(pointer, astNode) {
        this.pointer = pointer;
        this.astNode = astNode;
    }
}

class NamespacePointerCollector {
    constructor() {
        this.pointerPool = new Map();
    }
    // Notice: for the var style pointer have function-level namespace, we need to remain the pointer use & define priority
    addPointer(namespaceNode, pointer, astNode) {
        if (!this.pointerPool.has(namespaceNode)) {
            this.pointerPool.set(namespaceNode, []);
        }
        this.pointerPool.get(namespaceNode).push(new ASTPointer(pointer, astNode));
    }
    getPointers(namespaceNode) {
        return this.pointerPool.get(namespaceNode);
    }
    hasPointers(namespaceNode) {
        return this.pointerPool.has(namespaceNode);
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

    renameObjects(namespaceNode) {
        
    }

    renamePointers(namespaceNode) {
        
    }
}

module.exports = {
    RenameControllor: new RenameCtrl(),
    // NamespaceUsingObjects : objectUsingCollector,
    NamespaceUsingPointers: pointerUsingCollector,
    // NamespaceDefObjects: objectDefCollector,
    NamespaceDefPointers: pointerDefCollector,
    NameMap: nameMap,
}