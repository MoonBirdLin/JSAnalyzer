const contextCtrl = require('./contextCtrl');
// A pointer is a astnode that create a new object
const ObjectType = {
    FUNCTION: 'FUNCTION',
    CONSTOBJECT: 'CONSTOBJECT',
    NEWOBJECT: 'NEWOBJECT',
    PRIMITIVEOBJECT: 'PRIMITIVEOBJECT',
    ARRAY: 'ARRAY',
    REGEX: 'REGEX',
    UNDEFINED: 'UNDEFINED'
}

class ObjectNode {
    constructor(objectName, allocAstNode, type, prototypeNode, contextInstance, isPrototype = false) {
        if (!objectName) {
            objectName = null;
        }
        if (!allocAstNode) {
            allocAstNode = null;
        }
        if (!type) {
            type = ObjectType.UNDEFINED;
        }
        if (!prototypeNode) {
            prototypeNode = null;
        }
        if (!contextInstance) {
            contextInstance = contextCtrl.ContextInstanceControllor.getContextInstance();
        }
        this.objectName = objectName;
        this.allocAstNode = allocAstNode;
        this.type = type;
        this.prototypeNode = prototypeNode;
        this.contextInstance = contextInstance;
        this.isPrototype = isPrototype;
        // each field should be a pointer
        this.fields = new Set();
    }
    getObjectName() {
        return this.objectName;
    }
    getAllocAstNode() {
        return this.allocAstNode;
    }
    getType() {
        return this.type;
    }
    getPrototypeNode() {
        return this.prototypeNode;
    }
    getContextInstance() {
        return this.contextInstance;
    }
    getFields() {
        return this.fields;
    }
    isPrototype() {
        return this.isPrototype;
    }
    setObjectName(objectName) {
        this.objectName = objectName;
    }
    setAllocAstNode(allocAstNode) {
        this.allocAstNode = allocAstNode;
    }
    setType(type) {
        this.type = type;
    }
    setPrototypeNode(prototypeNode) {
        this.prototypeNode = prototypeNode;
    }
    setContextInstance(contextInstance) {
        this.contextInstance = contextInstance;
    }
    setIsPrototype(isPrototype) {
        this.isPrototype = isPrototype;
    }
    setFields(fields) {
        this.fields = fields;
    }
    addField(field) {
        this.fields.add(field);
    }
}

class ObjectCtrl {
    // Need to add an object of Object.prototype
    // Need to add an object of All UN-PRIMITIVEOBJECT
    constructor() {
        this.objectMap = new Map();
        this.objectMap.set('Object.prototype', new ObjectNode('Object.prototype', null, ObjectType.PRIMITIVEOBJECT, null, null, true));
        this.objectMap.set('Function.prototype', new ObjectNode('Function.prototype', null, ObjectType.PRIMITIVEOBJECT, null, null, true));
        this.objectMap.set('Array.prototype', new ObjectNode('Array.prototype', null, ObjectType.PRIMITIVEOBJECT, null, null, true));
        this.objectMap.set('Date.prototype', new ObjectNode('Date.prototype', null, ObjectType.PRIMITIVEOBJECT, null, null, true));
        this.objectMap.set('Map.prototype', new ObjectNode('Map.prototype', null, ObjectType.PRIMITIVEOBJECT, null, null, true));
        this.objectMap.set('Set.prototype', new ObjectNode('Set.prototype', null, ObjectType.PRIMITIVEOBJECT, null, null, true));
        this.objectMap.set('WeakMap.prototype', new ObjectNode('WeakMap.prototype', null, ObjectType.PRIMITIVEOBJECT, null, null, true));
        this.objectMap.set('WeakSet.prototype', new ObjectNode('WeakSet.prototype', null, ObjectType.PRIMITIVEOBJECT, null, null, true));
        // this.objectMap.set('String.prototype', new ObjectNode('String.prototype', null, ObjectType.PRIMITIVEOBJECT, null, null, true));
        // this.objectMap.set('Number.prototype', new ObjectNode('Number.prototype', null, ObjectType.PRIMITIVEOBJECT, null, null, true));
        // this.objectMap.set('Boolean.prototype', new ObjectNode('Boolean.prototype', null, ObjectType.PRIMITIVEOBJECT, null, null, true));
        // this.objectMap.set('RegExp.prototype', new ObjectNode('RegExp.prototype', null, ObjectType.PRIMITIVEOBJECT, null, null, true));
        // this.objectMap.set('Undefined.prototype', new ObjectNode('Undefined.prototype', null, ObjectType.PRIMITIVEOBJECT, null, null, true));
        // this.objectMap.set('Null.prototype', new ObjectNode('Null.prototype', null, ObjectType.PRIMITIVEOBJECT, null, null, true));
        // this.objectMap.set('BigInt.prototype', new ObjectNode('BigInt.prototype', null, ObjectType.PRIMITIVEOBJECT, null, null, true));
        // this.objectMap.set('Symbol.prototype', new ObjectNode('Symbol.prototype', null, ObjectType.PRIMITIVEOBJECT, null, null, true));
    }
    getObjectMap() {
        return this.objectMap;
    }
    setObjectMap(objectMap) {
        this.objectMap = objectMap;
    }
    addObject(objectName, allocAstNode, type, prototypeNode, contextInstance, isPrototype) {
        this.objectMap.set(objectName, new ObjectNode(objectName, allocAstNode, type, prototypeNode, contextInstance, isPrototype));
    }
    getObject(objectName) {
        if (!this.objectMap.has(objectName)) {
            return null;
        }
        return this.objectMap.get(objectName);
    }
    removeObject(objectName) {
        this.objectMap.delete(objectName);
    }
    hasObject(objectName) {
        return this.objectMap.has(objectName);
    }
}
// let ObjectControllor = new ObjectCtrl();

class OriginObjectAstNodeContainer {
    // Namespace -> ObjectAstNode
    constructor(){
        this.objectPool = new Map();
    }
    hasObjects(spaceName){
        return this.objectPool.has(spaceName);
    }
    addObjects(spaceName, objectAstNode){
        if (!this.hasPointers(spaceName)) {
            this.objectPool.set(spaceName, new Set());
        }
        this.objectPool.get(spaceName).add(objectAstNode);
    }
    getObjects(spaceName){
        if (!this.hasPointers(spaceName)) {
            return new Set();
        }
        return this.objectPool.get(spaceName);
    }
}

module.exports = {
    ObjectNode : ObjectNode,
    ObjectCtrl : ObjectCtrl,
    ObjectControllor : new ObjectCtrl(),
    OriginObjectAstNodeContainer : new OriginObjectAstNodeContainer()
}