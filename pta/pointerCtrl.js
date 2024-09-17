const contextCtrl = require('./contextCtrl');

// A pointer is a variable/field that can be point to a memory location
const PointerType = {
    VAR: "VAR",
    FIELD: "FIELD",
    LET : "LET",
    CONST: "CONST",
    // The portotype is a special pointer that points to a set of functions
    // And we have to create a new prototype for each class definition and each instance
    PROTOTYPE: "PROTOTYPE",
    UNDEFINED: "UNDEFINED"
}

// Each pointsToSet is a set of objectNodes that the pointer can point to
class PointsToSet {
    constructor(){
        this.pointsTo = new Set();
    }
    addPointTo(pointsTo){
        this.pointsTo.add(pointsTo);
    }
    addPointsTo(pointsToArray){
        for (pointTo of pointsToArray){
            this.addPointTo(pointsTo);
        }
    }
    getPointsTo(){
        return this.pointsTo;
    }
}

class PointerNode {
    constructor(pointerName, pointerType, nameSpaceNode, contextInstance, pointsToSet, objectNode){
        if (!pointerName) {
            pointerName = "undefined";
        }
        if (!pointerType) {
            pointerType = PointerType.UNDEFINED;
        }
        if (!nameSpaceNode) {
            nameSpaceNode = null;
        }
        if (!contextInstance) {
            contextInstance = contextCtrl.ContextInstanceControllor.getContextInstance();
        }
        if (!pointsToSet) {
            pointsToSet = new PointsToSet();
        }
        this.pointerName = pointerName;
        this.pointerType = pointerType;
        this.nameSpaceNode = nameSpaceNode;
        this.contextInstance = contextInstance;
        this.pointsToSet = pointsToSet;
        // For a field pointer, we need to know which ObjectNode it belongs to
        if (pointerType == PointerType.FIELD) {
            this.objectNode = objectNode;
        } else {
            this.objectNode = null;
        }
    }
    getPointerName(){
        if (this.nameSpaceNode) {
            return this.nameSpaceNode.getSpaceName() + "$$" + this.pointerName;
        }
        return this.pointerName;
    }
    setPointerName(pointerName){
        this.pointerName = pointerName;
    }
    getPointerType(){
        return this.pointerType;
    }
    setPointerType(pointerType){
        this.pointerType = pointerType;
    }
    getNameSpaceNode(){
        return this.nameSpaceNode;
    }
    setNameSpaceNode(nameSpaceNode){
        this.nameSpaceNode = nameSpaceNode;
    }
    getContextIntance(){
        return this.contextInstance;
    }
    setContextIntanc(contextInstance){
        this.contextInstance = contextInstance;
    }
    getPointsToSet(){
        return this.pointsToSet;
    }
    setPointsToSet(pointsToSet){
        this.pointsToSet = pointsToSet;
    }
    addPointTo(pointTo){
        this.pointsToSet.addPointsTo(pointTo);
    }
    addPointsTo(pointsToArray){
        this.pointsToSet.addPointsTo(pointsToArray);
    }
}

// The controller of pointers
class PointerCtrl{
    constructor(){
        this.pointerPool = new Map();
    }

    setPointer(pointerName, pointerNode){
        this.pointerPool.set(pointerName, pointerNode);
    }

    addPointer(pointerName, pointerNode){
        if(this.pointerPool.has(pointerName) == true){
            console.warn("pointer already exists: "+pointerName);
        }
        this.setPointer(pointerName, pointerNode);
    }

    getPointer(pointerName){
        if(this.pointerPool.has(pointerName) == false){
            this.setPointer(pointerName, new PointerNode());
        }
        return this.pointerPool.get(pointerName);
    }
}

// Record the definition and usage location of a pointer
class PointerLocation {
    constructor(pointerName, astNode) {
        this.pointerName = pointerName;
        this.astNode = astNode;
    }
    getPointerName(){
        return this.pointerName;
    }
    getAstNode(){
        return this.astNode;
    }
    setAstNode(astNode){
        this.astNode = astNode;
    }
    setPointerName(pointerName){
        this.pointerName = pointerName;
    }
}

class PointerLocationCtrl {
    constructor(){
        this.pointerLocPool = new Map();
    }
    setPointerLoc(pointerName, pointerLocs){
        this.pointerLocPool[pointerName] = pointerLocs;
        this.pointerLocPool.set(pointerName, pointerLocs);
    }
    addPointerLoc(pointerName, pointerLoc){
        if(this.pointerLocPool.has(pointerName) == false){
            this.pointerLocPool.set(pointerName, []);
        }
        
        this.pointerLocPool.get(pointerName).push(pointerLoc)
    }
    getPointerLoc(pointerName){
        if(this.pointerLocPool.has(pointerName) == false){
            return null;
        }
        return this.pointerLocPool.get(pointerName);
    }
    hasPointerLoc(pointerName){
        return this.pointerLocPool.has(pointerName);
    }
}

class OriginPointerAstNodeContainer {
    // Namespace -> pointerAstNode
    constructor(){
        this.pointerPool = new Map();
    }
    hasPointers(spaceName){
        return this.pointerPool.has(spaceName);
    }
    addPointer(spaceName, pointerAstNode){
        if (!this.hasPointers(spaceName)) {
            this.pointerPool.set(spaceName, new Set());
        }
        this.pointerPool.get(spaceName).add(pointerAstNode)
    }
    getPointers(spaceName){
        return this.pointerPool.get(spaceName);
    }
}

module.exports = {
    PointerController: new PointerCtrl(),
    PointerLocationController : new PointerLocationCtrl(),
    OriginPointerAstNodeContainer: new OriginPointerAstNodeContainer(),
    PointerLocation: PointerLocation,
    PointerNode: PointerNode,
    PointsToSet: PointsToSet,
    PointerType: PointerType
};