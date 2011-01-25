var command_stack = new CommandStack();
var geom_doc = new GeomDocument();

function create_geom_command(prototype, geometry) {
    
    var doFn = function() {
        $.ajax({
            type: "POST",
            url: "/geom/",
            contentType: "application/json",
            data: JSON.stringify(geometry),
            success: function(nodeData){
                var path = nodeData.path;
                $.ajax({
                    type: "GET",
                    url: path,
                    success: function(nodeData) {
                        geom_doc.remove(prototype);
                        geom_doc.add(new GeomNode({
                            type: geometry.type,
                            path: path,
                            parameters: geometry.parameters}));
                        /* FIXME: The picking doesn't seem to work unless there is an 
                           extra node above the geometry node? */
                        nodeData['type'] = 'geometry';
                        SceneJS.withNode("geom").add("node", {type: "material",
                                                              id: path,
                                                              emit: 0,
                                                              baseColor:      { r: 0.5, g: 1.0, b: 0.0 },
                                                              specularColor:  { r: 0.9, g: 0.9, b: 0.9 },
                                                              specular:       0.9,
                                                              shine:          100.0,
                                                              nodes: [nodeData]});

                        Interaction.pickable(path);
                    }
                });
            }
        });
    };
    var undoFn = function() {
        throw Error("not implemented");
    }
    return new Command(doFn, undoFn);
}


function GeomDocumentRenderer() {
    this.update = function() {

        $('#geom-model-doc').html('');
        var geomNodeRenderer = function(geomNode) {

            var paramsArr = [];
            for (key in geomNode.parameters) {
                paramsArr.push({key: key,
                                value: geomNode.parameters[key],
                                prototype: geomNode.prototype
                               });
            }
            var template = '<table>{{#paramsArr}}<tr><td>{{key}}</td><td>{{^prototype}}{{value}}{{/prototype}}{{#prototype}}<input id="{{key}}" type="text">{{/prototype}}</td></tr>{{/paramsArr}}</table>';
            var paramsTable = $.mustache(template, {paramsArr : paramsArr});
            
            var template = '<table><tr><td>{{type}}</td></tr><tr><td>{{{paramsTable}}}</td></tr>{{#prototype}}<tr><td><input id="modal-ok" type="submit" value="Ok"/><input id="modal-cancel" type="submit" value="Cancel"/></td></tr>{{/prototype}}</table>';
            var view = {type: geomNode.type,
                        prototype: geomNode.prototype,
                        paramsTable: paramsTable};
            var nodeTable = $.mustache(template, view);

            $('#geom-model-doc').append(nodeTable);

            $('#modal-ok').click(function() {
                if (geomNode.prototype) {
                    var parameters = {};
                    for (key in geomNode.parameters) {
                        parameters[key] = parseFloat($('#' + key).val());
                    }
                    var cmd = create_geom_command(geomNode, {type: geomNode.type,
                                                             parameters: parameters});
                    command_stack.execute(cmd);
                }
            });
            $('#modal-cancel').click(function() {
                geom_doc.remove(geomNode);
            });
        }
        geom_doc.iterate(geomNodeRenderer);
    }
}

var geom_doc_renderer = new GeomDocumentRenderer();

geom_doc.addListener(function(event) {
    geom_doc_renderer.update();
});

