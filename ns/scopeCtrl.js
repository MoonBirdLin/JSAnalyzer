class ScopeNode {
    constructor(name, astnode, parent, children){
        if (!name){
            // console.warn("You are trying to create a scope node without a name");
            name = "undfined";
        }
        this.scopeName = name;
        if (!astnode){
            // console.warn("You are trying to create a scope node without an astnode");
            astnode = null;
        }
        this.astnode = astnode;
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
            console.warn("You are trying to changing the parant. Parent of " + this.scopeName + " is already set: " + JSON.stringify(this.parent, null, 0));
        }
        this.parent = parent;
    }
    getScopeName(){
        return this.scopeName;
    }
    setScopeName(name){
        this.scopeName = name;
    }
    getAstNode(){
        return this.astnode;
    }
    setAstNode(astnode){
        if (this.astnode != astnode){
            console.warn("You are trying to changing the astnode. Astnode of " + this.scopeName + " is already set: " + JSON.stringify(this.astnode, null, 0));
        }
        this.astnode = astnode;
    }
}

class ScopeCtrl{
    constructor(){
        this.scopePool = new Map();
    }

    setScope(astNode, scopeNode){
        // this.scopePool[astNode] = scopeNode;
        this.scopePool.set(astNode, scopeNode);
    }

    addScope(astNode, scopeNode){
        if(this.scopePool.has(astNode) == true){
            console.warn("scope already exists: "+JSON.stringify(astNode, null, 0));
        }
        this.setScope(astNode, scopeNode);
    }

    getScope(astNode){
        if(this.scopePool.has(astNode) == false){
            this.setScope(astNode, new ScopeNode());
        }
        return this.scopePool.get(astNode);
    }
    hasScope(astNode){
        return this.scopePool.has(astNode);
    }
}

module.exports = {
    ScopeController: new ScopeCtrl(),
    ScopeNode: ScopeNode
};