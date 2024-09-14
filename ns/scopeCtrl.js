class ScopeCtrl{
    constructor(){
        this.scope = new Map();
    }

    setScope(key, value){
        this.scope[key] = value;
    }

    getScope(key){
        return this.scope[key];
    }

    // setScope(key, value){
    //     this.scope[key] = value;
    // }

    // getScope(key){
    //     return this.scope[key];
    // }
}