var canvas;
var gl;
var points = [];
var triangleSize = 1;
var rotationAngle;
var vertices = [];
var colors =[];
var shape;
var number_of_tessellation = 4;
var question = 1;


window.onload = function init() {
    var canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    this.firstPart()

};


function calculateAndRender(vertices, type, count) {
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    // Associate out shader variables with our data buffer
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    render(type, count);
}


function render(type, count) {

    var checkboxTessellated = document.getElementById("tessellated");

    gl.clear(gl.COLOR_BUFFER_BIT);
    if (type == 'WIREFRAME') {
        if (checkboxTessellated.checked) {
            for (let index = 0; index < count; index += 3) {
                gl.drawArrays(gl.LINE_LOOP, index, 3);
            }
        } else {
            gl.drawArrays(gl.LINE_LOOP, 0, count);
        }

    } else if (type == 'FILLED') {
        if (shape == 3) {
            // for triangles (3 vertices) gl.TRIANGLES used
            gl.drawArrays(gl.TRIANGLES, 0, count);
        } else {
            var checkboxTessellated = document.getElementById("tessellated");
            if (checkboxTessellated.checked) {
                gl.drawArrays(gl.TRIANGLES, 0, count);
            } else {
                // for polygons (more than 3 vertices) TRIANGLE_FAN used
                // e.g squares has 4 points vertices, abcd 
                // first it draws abc then with an edge it combines d point
                gl.drawArrays(gl.TRIANGLE_FAN, 0, count);
            }
        }
    }
}


function calculatePolygonVertices(edgeNumber) {
    var radius = 1 // in WebGL coordinate system is between -1 and 1. so radius is 1
    var verts = []
    var angle = (2 * Math.PI) / edgeNumber
    for (var i = 0; i < edgeNumber; i++) {
        x = Math.cos(2 * Math.PI * i / edgeNumber)
        y = Math.sin(2 * Math.PI * i / edgeNumber)
        verts.push(vec2(x, y))
    }
    return verts
}


function triangleVertices() {
    var sideLength = 1.4 * triangleSize;
    rotationAngle = $("#rotationAngle").val() * Math.PI / 180;
    return vertices = [
        vec2(0, sideLength / Math.sqrt(3)), // left-down corner
        vec2(-sideLength / 2, -sideLength / (2 * Math.sqrt(3))), // center-up corner
        vec2(sideLength / 2, -sideLength / (2 * Math.sqrt(3)))
    ];
}

function twistVector(vector) {
    var x = vector[0],
        y = vector[1],
        dist = Math.sqrt(x * x + y * y),
        sinAng = Math.sin(dist * rotationAngle),
        cosAng = Math.cos(dist * rotationAngle);
    return vec2(x * cosAng - y * sinAng, x * sinAng + y * cosAng);
}

function tessellate(vertices_gonna_tessellate, calculateRotation) {
    var center = vec2(0, 0)
    var allVertices = []
    if (shape == 3) {
        allVertices = allVertices.concat(divideTriangle(vertices_gonna_tessellate[0], vertices_gonna_tessellate[1], vertices_gonna_tessellate[2], number_of_tessellation, calculateRotation))
    } else {
        for (let i = 0; i < vertices_gonna_tessellate.length; i++) {

            if (i == vertices_gonna_tessellate.length - 1) {
                allVertices = allVertices.concat(divideTriangle(center, vertices_gonna_tessellate[i], vertices_gonna_tessellate[0], number_of_tessellation, calculateRotation))
            } else {
                allVertices = allVertices.concat(divideTriangle(center, vertices_gonna_tessellate[i], vertices_gonna_tessellate[i + 1], number_of_tessellation, calculateRotation))
            }
        }
    }
    return allVertices;
}

function divideTriangle(a, b, c, tessellation_number, isRotation) {
    if (tessellation_number === 0) {
        if (isRotation) {
            return [
                twistVector(a), twistVector(b), twistVector(c)
            ]
        } else {
            return [a, b, c];
        }
    } else {
        //bisect the sides
        var ab = mix(a, b, 0.5);
        var ac = mix(a, c, 0.5);
        var bc = mix(b, c, 0.5);

        --tessellation_number;

        var first = divideTriangle(ab, bc, ac, tessellation_number, isRotation);
        var second = divideTriangle(a, ab, ac, tessellation_number, isRotation);
        var third = divideTriangle(c, ac, bc, tessellation_number, isRotation);
        var fourth = divideTriangle(b, bc, ab, tessellation_number, isRotation);

        var concat_array = first.concat(second).concat(third).concat(fourth)
        return concat_array

    }
}

// ########## TESSELLATION CHECKBOX CHANGED FUNCTION #############
$(function () {
    $('#tessellated').change(function () {
        var checkboxTessellated = $(this).prop('checked')

        if (checkboxTessellated) {
            if (question == 1) {
                var tessellatedVertices = tessellate(vertices, false)
                calculateAndRender(tessellatedVertices, 'WIREFRAME', tessellatedVertices.length)
            } else if (question == 2) {
                var tessellatedVertices = tessellate(vertices, true)
                calculateAndRender(tessellatedVertices, 'FILLED', tessellatedVertices.length)
            } else if (question == 3) {
                var tessellatedVertices = tessellate(vertices, false)
                calculateAndRender(tessellatedVertices, 'WIREFRAME', tessellatedVertices.length)
            }

        } else {
            switch (question) {
                case 1:
                case 3:
                    calculateAndRender(vertices, 'WIREFRAME', shape)
                    break;
                case 2:
                case 5:
                    // reseting because from non-tessellated to tessellated rotation make sense twisting calculating
                    // but from tessellated to non-tessellated converting doesnt make sense
                    resetRotationAngleValues()
                    if (shape == 3) {
                        vertices = triangleVertices()
                    } else {
                        vertices = calculatePolygonVertices(shape)
                    }

                    calculateAndRender(vertices, 'FILLED', shape)
                    break;

                default:
                    break;
            }
        }
    })
})

// ########## ROTATION ANGLE CHANGED FUNCTION #############
$(function () {

    $('#rotationAngle').change(function () {
        rotationAngle = this.value * Math.PI / 180;
        $("#rotationAngleOutput").text(this.value); // sets rotation angle label
        var checkboxTessellated = document.getElementById("tessellated");

        if (checkboxTessellated.checked) {
            var tessellatedVertices = tessellate(vertices, true)
            calculateAndRender(tessellatedVertices, 'FILLED', tessellatedVertices.length)
        } else {
            if (question == 5) {
                var twistedPolygon = []
                for (let index = 0; index < vertices.length; index++) {
                    twistedPolygon.push(twistVector(vertices[index]))
                }
                calculateAndRender(twistedPolygon, 'FILLED', twistedPolygon.length)
            } else {
                vertices = [
                    twistVector(triangleVertices()[0]),
                    twistVector(triangleVertices()[1]),
                    twistVector(triangleVertices()[2])
                ]
                calculateAndRender(vertices, 'FILLED', shape)
            }

        }

    })
})


function firstPart() {
    shape = 3
    question = 1
    setRotationVisibility('collapse')
    setPolygonOptionsVisibility('collapse')
    resetRotationAngleValues()
    setTessellationCheckbox(false, false)
    vertices = triangleVertices()
    calculateAndRender(vertices, 'WIREFRAME', shape)
}

function secondPart() {
    shape = 3
    question = 2
    setRotationVisibility('visible')
    setPolygonOptionsVisibility('collapse')
    resetRotationAngleValues()
    setTessellationCheckbox(false, false)
    vertices = triangleVertices()
    calculateAndRender(vertices, 'FILLED', shape)
}


function thirdPart() {
    shape = 4
    question = 3
    setRotationVisibility('collapse')
    setPolygonOptionsVisibility('visible')
    resetRotationAngleValues()
    setTessellationCheckbox(false, true)
    vertices = calculatePolygonVertices(4) // default by square
    calculateAndRender(vertices, 'WIREFRAME', shape)
}


function fourthPart() {
    shape = 4 // default by square
    question = 4
    setRotationVisibility('collapse')
    setPolygonOptionsVisibility('visible')
    resetRotationAngleValues()
    setTessellationCheckbox(true, true)
    vertices = calculatePolygonVertices(shape)
    var tessellatedVertices = tessellate(vertices, false)
    calculateAndRender(tessellatedVertices, 'WIREFRAME', tessellatedVertices.length)
}


function fifthPart() {
    shape = 4 // default by square
    question = 5
    setRotationVisibility('visible')
    setPolygonOptionsVisibility('visible')
    resetRotationAngleValues()
    setTessellationCheckbox(false, false)
    vertices = calculatePolygonVertices(shape)
    calculateAndRender(vertices, 'FILLED', shape)
}

function resetRotationAngleValues() {
    document.getElementById("rotationAngle").value = 0
    document.getElementById("rotationAngleOutput").value = 0
    rotationAngle = 0
}

function setTessellationCheckboxDisable(disable) {
    $('#tessellated').prop('disabled', disable).change()
}

function setTessellationCheckbox(OnOff, disable) {
    $('#tessellated').prop('disabled', false).change()
    $('#tessellated').prop('checked', OnOff).change()
    $('#tessellated').prop('disabled', disable).change()

}

function setRotationVisibility(visibility) {
    document.getElementById("rotationSet").style.visibility = visibility
}

function setPolygonOptionsVisibility(visibility) {
    document.getElementById("polygonOptions").style.visibility = visibility
}

function drawPolygonWireframe(edgeNumber) {
    vertices = calculatePolygonVertices(edgeNumber)
    var checkboxTessellated = document.getElementById("tessellated");
    if (checkboxTessellated.checked) {
        var tessellatedVertices = tessellate(vertices, false)
        calculateAndRender(tessellatedVertices, 'WIREFRAME', tessellatedVertices.length)
    } else {
        calculateAndRender(vertices, 'WIREFRAME', edgeNumber)
    }
}

function drawPolygonFilled(edgeNumber) {
    vertices = calculatePolygonVertices(edgeNumber)
    var checkboxTessellated = document.getElementById("tessellated");
    if (checkboxTessellated.checked) {
        var tessellatedVertices = tessellate(vertices, false)
        calculateAndRender(tessellatedVertices, 'FILLED', tessellatedVertices.length)
    } else {
        calculateAndRender(vertices, 'FILLED', edgeNumber)
    }
}

function square() {
    shape = 4
    if (question == 5) {
        resetRotationAngleValues()
        drawPolygonFilled(shape)
    } else {
        drawPolygonWireframe(shape)
    }

}

function pentagon() {
    shape = 5
    if (question == 5) {
        resetRotationAngleValues()
        drawPolygonFilled(shape)
    } else {
        drawPolygonWireframe(shape)
    }
}

function hexagon() {
    shape = 6
    if (question == 5) {
        resetRotationAngleValues()
        drawPolygonFilled(shape)
    } else {
        drawPolygonWireframe(shape)
    }
}

function octagon() {
    shape = 8
    if (question == 5) {
        resetRotationAngleValues()
        drawPolygonFilled(shape)
    } else {
        drawPolygonWireframe(shape)
    }
}