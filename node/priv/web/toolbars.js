function Action(label, iconPath, fn) {
    this.label = label;
    this.iconPath = iconPath;
    this.fn = fn;

    this.render = function(toolbar) {

        var imgId = "action_" + label;
        toolbar.append('<img id="' + imgId + '" src="' + this.iconPath + '"/>');
        
        // Because 'this' is the HTML element inside the function below,
        // we have to use a reference
        var fn = this.fn;
        jQuery("#" + imgId).click(function() {
            fn();
        });
    }
}

function delete_geom() {
    for (i in Interaction.selected) {
        geom_doc.removeByPath(Interaction.selected[i]);
        SceneJS.withNode(Interaction.selected[i]).parent().remove({node: Interaction.selected[i]});
    }
    Interaction.unselect();
}


function create_primitive(type, keys) {
    var geometryParams = {};
    for (i in keys) {
        geometryParams[keys[i]] = null;
    }
    geom_doc.add(new GeomNode({
        type: type,
        prototype: true,
        parameters: geometryParams}));
}

function create_transform(type, keys) {
    if (Interaction.selected.length != 1)  {
        alert("no object selected!");
        return;
    }
    var transformParams = {};
    for (i in keys) {
        transformParams[keys[i]] = null;
    }
    
    var path = Interaction.selected[0];

    geom_doc.addTransformToNodeWithPath(
        path,
        new Transform({
            type: type,
            prototype: true,
            parameters: transformParams
        }));
}

function add_to_scene(path, tesselation) {
    tesselation["type"] = "geometry";
    SceneJS.withNode("geom").add("node", {type: "material",
                                          id: path,
                                          emit: 0,
                                          baseColor:      { r: 0.5, g: 1.0, b: 0.0 },
                                          specularColor:  { r: 0.9, g: 0.9, b: 0.9 },
                                          specular:       0.9,
                                          shine:          100.0,
                                          nodes: [tesselation]});
    Interaction.pickable(path);
}


function boolean(type) {
    if (Interaction.selected.length != 2)  {
        alert("must have 2 object Interaction.selected!");
        return;
    }
    var doFn = function() {
        var geometry = {type: type,
                        parameters: {
                            a: Interaction.selected[0],
                            b: Interaction.selected[1]
                        }};
        
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
                    success: function(tesselation) {
                        var node1 = geom_doc.findByPath(Interaction.selected[0]);
                        var node2 = geom_doc.findByPath(Interaction.selected[1]);
                        geom_doc.remove(node1);
                        geom_doc.remove(node2);
                        geometry["path"] = path;
                        var boolNode = new GeomNode(geometry, node1, node2);
                        geom_doc.add(boolNode);

                        SceneJS.withNode(Interaction.selected[0]).parent().remove({node: Interaction.selected[0]});
                        SceneJS.withNode(Interaction.selected[1]).parent().remove({node: Interaction.selected[1]});
                        Interaction.unselect();
                        
                        add_to_scene(path, tesselation);
                    }
                });
            }
        })};
    var undoFn = function() {
        throw Error("not implemented");
    }
    var cmd = new Command(doFn, undoFn);
    command_stack.execute(cmd);
}

function transform(parameters, type) {
    if (Interaction.selected.length != 1)  {
        alert("must have 1 object selected!");
        return;
    }
    parameters["type"] = type;
    parameters["path"] = Interaction.selected[0];

    $.ajax({
        type: "POST",
        url: "/geom/",
        contentType: "application/json",
        data: JSON.stringify(parameters),
        success: function(nodeData){
            var path = nodeData.path;
            $.ajax({
                type: "GET",
                url: path,
                success: function(nodeData) {
                    SceneJS.withNode(Interaction.selected[0]).parent().remove({node: Interaction.selected[0]});
                    Interaction.unselect();

                    /* FIXME: The picking doesn't seem to work unless there is an 
                       extra node above the geometry node? */
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
}


function open_dialog(parameters, okFn) {

    $( "#dialog:ui-dialog" ).dialog( "destroy" );

    function checkFloat( o, n) {
        var result = true;
            try {
                if (o.val().length == 0) {
                    result = false;
                }
                if (isNaN(parseFloat(o.val()))) {
                    result = false;
                }
            } catch(e) {
                result = false;
	    }
        if (result == false) {
            o.addClass( "ui-state-error" );
        }
        return result;
    }

    var form = "<form><fieldset>";
    
    for (i in parameters) {
        var parameter = parameters[i];
        var field = '<label for="' + parameter.name + '">' + parameter.label + '</label><input type="text" name="' + parameter.name + '" id="dialog-' + parameter.name + '" class="text ui-widget-content ui-corner-all"/><br/>';
        form += field;
    }
    form += '</fieldset></form>';
    $("#dialog").html(form);

    $( "#dialog" ).dialog({
	autoOpen: false,
	width: 250,
	height: 300,
	modal: true,
	buttons: {
	    Ok : function() {


		var bValid = true;
		for (i in parameters) {
                    var input = $("#dialog-" + parameters[i].name);
                    input.removeClass( "ui-state-error" );
                    bValid = bValid & checkFloat(input);
                }
                
		if ( bValid ) {
                    var result =  {};
                    for (i in parameters) {
                        var parameter = parameters[i];
                        result[parameter.name] = parseFloat($("#dialog-" + parameter.name).val());
                    }
                    
                    okFn(result);
		    $( this ).dialog( "close" );
		}
	    },
	    Cancel : function() {
		$( this ).dialog( "close" );
	    }
	},
	close: function() {
	}
    });

    $("#dialog" ).dialog( "open" );
}

$(document).ready(function() {

    /*
     * Edit
     */
    new Action("delete", "images/trash.png", 
               function(parameters) { delete_geom(); }).render($("#edit"));
    
    /*
     * Primitives
     */
    new Action("cuboid", "images/cuboid.png", 
               function() { create_primitive("cuboid",  ["width", "depth", "height"]); }).render($("#primitives"));
    new Action("sphere", "images/sphere.png", 
               function(parameters) { create_primitive("sphere", ["radius"]); }).render($("#primitives"));
    new Action("cylinder", "images/cylinder.png", 
               function(parameters) { create_primitive("cylinder", ["radius", "height"]); }).render($("#primitives"));
    new Action("cone", "images/cone.png", 
               function(parameters) { create_primitive("cone", ["bottom_radius", "top_radius", "height"]); }).render($("#primitives"));
     new Action("wedge", "images/wedge.png", 
                function(parameters) { create_primitive("wedge", ["x1", "x2", "y", "z"]); }).render($("#primitives"));
    new Action("torus", "images/torus.png", 
               function(parameters) { create_primitive("torus", ["r1", "r2"]); }).render($("#primitives"));

    /*
     * Booleans
     */
    new Action("union", "images/union.png", 
               function(parameters) { boolean("union"); }).render($("#boolean"));
    new Action("subtract", "images/diff.png", 
               function(parameters) { boolean("subtract"); }).render($("#boolean"));
    new Action("intersect", "images/intersect.png", 
               function(parameters) { boolean("intersect"); }).render($("#boolean"));
    
    /*
     * Transformations
     */
    new Action("translate", "images/translate.png", 
               function(parameters) { create_transform("translate", ["dx", "dy", "dz"]); }).render($("#transforms"));
    /*new Action("scale", "images/scale.png", 
               [{name: "x", label: "X"},
                {name: "y", label: "Y"},
                {name: "z", label: "Z"},
                {name: "factor", label: "Factor"},],
               function(parameters) { transform(parameters, "scale"); }).render($("#transforms"));
    new Action("rotate", "images/rotate.png", 
               [{name: "x", label: "Position X"},
                {name: "y", label: "Position Y"},
                {name: "z", label: "Position Z"},
                {name: "vx", label: "Axis X"},
                {name: "vy", label: "Axis Y"},
                {name: "vz", label: "Axis Z"},
                {name: "angle", label: "Angle (deg)"},],
               function(parameters) { transform(parameters, "rotate"); }).render($("#transforms"));*/


});

