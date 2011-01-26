function Transform() {
    if (!arguments[0].type) {
        throw new Error("type is not defined");
    }

    this.prototype = arguments[0].prototype;
    this.type = arguments[0].type;
    this.parameters = arguments[0].parameters;
}

Transform.prototype.json = function() {
    return JSON.stringify({type: this.type,
                           parameters: this.parameters});
}

function GeomNode() {

    if (!arguments[0].type) {
        throw new Error("type is not defined");
    }

    this.prototype = arguments[0].prototype;
    this.type = arguments[0].type;
    this.path = arguments[0].path;
    this.parameters = arguments[0].parameters;
    this.parent = undefined;
    this.transforms = [];

    this.children = [];
    for (var i = 1; i < arguments.length; ++i) {
        arguments[i].parent = this;
        this.children.push(arguments[i]);
    }

    // TODO: Move test for multiple prorotype transforms from doc
    // into this class
    
    this.json = function() {
        // No need to do somethign special with parameters if they are not 
        // defined, as JSON.stringigy simply ignores those fields
        return JSON.stringify({type: this.type,
                               parameters: this.parameters,
                               transforms: this.transforms.map(function(tx) {
                                   return JSON.parse(tx.json());
                               })});
    }
    
}