const lodash = require("lodash");
const ptaCtrl = require("../scenery/ptaCtrl");

// Normal Context definition
class ContextObject {
    constructor(maxLength){
        if (!maxLength){
            maxLength = ptaCtrl.contextConfig.maxlength;
        }
        this.contextContainer = new Array();
        this.maxLength = maxLength;
    }
    addContext(context){
        if (this.contextContainer.length >= this.maxLength){
            this.contextContainer.shift();
        }
        this.contextContainer.push(context);
    }
    getContextContainer(){
        return this.contextContainer;
    }
    getContext(){
        let contextString = "";
        for (let i = 0; i < this.contextContainer.length; i++){
            let curr = this.contextContainer[i];
            if ((curr instanceof String) == false){
                curr = JSON.stringify(curr, null, 0);
            }
            if (i != 0){
                contextString += " -> ";
            }
            contextString += curr;
        }
    }
}

// Make sure that the context is unique
class ContextInstance {
    constructor(contextObject){
        if (!contextObject){
            this.delegator = ContextControllor.getContextObject("");
        }
        this.delegator = contextObject;
    }
    getContext(){
        return this.delegator.getContext();
    }
    setContext(contextObject){
        this.delegator = contextObject;
    }
    addContext(context){
        let newContextObject = lodash.cloneDeep(this.delegator);
        newContextObject.addContext(context);
        if (ContextControllor.hasContextObject(newContextObject)){
            this.delegator = ContextControllor.getContextObject(newContextObject.getContext());
        } else {
            ContextCtrl.addContext(newContextObject);
            this.delegator = newContextObject;
        }
    }
}

// Controllor of all the context objects
class ContextCtrl {
    constructor(){
        this.contextObjectPool = new Map();
        this.contextObjectPool.set("", new ContextObject());
    }
    addContextObject(contextObject){
        let contextObjectStr = contextObject.getContext();
        if (this.contextObjectPool.has(contextObjectStr) == false){
            this.contextObjectPool.set(contextObjectStr, contextObject);
        }
    }
    getContextObject(contextObjectStr){
        if (!contextObjectStr || this.contextObjectPool.has(contextObjectStr) == false){
            return this.contextObjectPool.get("");
        }
        return this.contextObjectPool.get(contextObjectStr);
    }
    getContextObjectPool(){
        return this.contextObjectPool;
    }
    hasContextObject(contextObject){
        let contextObjectStr = contextObject.getContext();
        return this.contextObjectPool.has(contextObjectStr);
    }
}

ContextControllor = new ContextCtrl();

// Controllor of Context Instance
class ContextInstanceCtrl {
    constructor(){
        this.contextInstancePool = new Map();
        this.contextInstancePool.set("", new ContextInstance());
    }
    addContextInstance(contextInstance){
        let contextInstanceStr = contextInstance.getContext();
        if (this.contextInstancePool.has(contextInstanceStr) == false){
            this.contextInstancePool.set(contextInstanceStr, contextInstance);
        }
    }
    getContextInstance(contextInstanceStr){
        if (!contextInstanceStr || this.contextInstancePool.has(contextInstanceStr) == false){
            return this.contextInstancePool.get("");
        }
        return this.contextInstancePool.get(contextInstanceStr);
    }
    getContextInstancePool(){
        return this.contextInstancePool;
    }
    hasContextInstance(contextInstance){
        let contextInstanceStr = contextInstance.getContext();
        return this.contextInstancePool.has(contextInstanceStr);
    }
}

let ContextInstanceControllor = new ContextInstanceCtrl();

module.exports = {
    ContextInstance : ContextInstance,
    ContextControllor: ContextControllor,
    ContextInstanceControllor: ContextInstanceControllor,
    ContextObject: ContextObject,
}