const scopeCtrl = require('./scopeCtrl');
class NamespaceNode {
    constructor(spaceName, astnode, scopeNode, parent, children){
        if (!spaceName){
            spaceName = "undfined";
        }
        this.spaceName = spaceName;
        if (!astnode){
            astnode = null;
        }
        this.astnode = astnode;
        if (!scopeNode){
            scopeNode = new scopeCtrl.ScopeNode();
        }
        if (!parent){
            parent = null;
        }
        this.parent = parent;
        if (!children){
            children = new Set();
        }
        this.children = children;
    }
    addChild(child){
        this.children.add(child);
    }
    removeChild(child){
        this.children.delete(child);
    }
    hasChild(child){
        return this.children.has(child);
    }
    getChildren(){
        return this.children;
    }
    getParent(){
        return this.parent;
    }
    setParent(parent){
        if (this.parent != null && this.parent != parent){
            console.warn("You are trying to changing the parant. Parent of " + this.spaceName + " is already set: " + JSON.stringify(this.parent, null, 0));
        }
        this.parent = parent;
    }
    getSpaceName(){
        return this.spaceName;
    }
    setSpaceName(name){
        this.spaceName = name;
    }
    getAstNode(){
        return this.astnode;
    }
    setAstNode(astnode){
        if (this.astnode != astnode){
            console.warn("You are trying to changing the astnode. Astnode of " + this.spaceName + " is already set: " + JSON.stringify(this.astnode, null, 0));
        }
        this.astnode = astnode;
    }
    getScopeNode(){
        return this.scopeNode;
    }
    setScopeNode(scopeNode){
        if (this.scopeNode != scopeNode){
            console.warn("You are trying to changing the scopeNode. scopeNode of " + this.spaceName + " is already set: " + JSON.stringify(this.scopeNode, null, 0));
        }
        this.scopeNode = scopeNode;
    }
}

class NamespaceCtrl{
    constructor(){
        this.namespacePool = new Map();
    }

    setNameSpace(astNode, namespaceNode){
        // this.namespacePool[astNode] = namespaceNode;
        this.namespacePool.set(astNode, namespaceNode);
    }

    addNameSpace(astNode, namespaceNode){
        if(this.namespacePool.has(astNode) == true){
            console.warn("namespace already exists: "+JSON.stringify(astNode, null, 0));
        }
        this.setNameSpace(astNode, namespaceNode);
    }

    getNameSpace(astNode){
        if(this.namespacePool.has(astNode) == false){
            this.setNameSpace(astNode, new NamespaceNode());
        }
        return this.namespacePool.get(astNode);
    }

    hasNameSpace(astNode){
        return this.namespacePool.has(astNode);
    }

    getNameSpacePool(){
        return this.namespacePool;
    }
}

module.exports = {
    NamespaceController: new NamespaceCtrl(),
    NamespaceNode: NamespaceNode
};