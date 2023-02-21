// Geometric objects

import BoundingBox from './bbox';

/**
 * A bézier path containing a set of path commands similar to a SVG path.
 * Paths can be drawn on a context using `draw`.
 * @exports opentype.Path
 * @class
 * @constructor
 */
function Path() {
    this.commands = [];
    this.fill = 'black';
    this.stroke = null;
    this.strokeWidth = 1;
}

function roundDecimal(float, places) {
    return +(Math.round(float + 'e+' + places) + 'e-' + places);
}

function optimizeCommands(commands) {
    // separate subpaths
    let subpaths = [[]];
    for (let i = 0; i < commands.length; i += 1) {
        const subpath = subpaths[subpaths.length - 1];
        const cmd = commands[i];
        const firstCommand = subpath[0];
        const secondCommand = subpath[1];
        const previousCommand = subpath[subpath.length - 1];
        subpath.push(cmd);
        if (cmd.type === 'Z') {
            // When closing at the same position as the path started,
            // remove unnecessary line command
            if (
                firstCommand.type === 'M' &&
                secondCommand.type === 'L' &&
                previousCommand.type === 'L' &&
                previousCommand.x === firstCommand.x &&
                previousCommand.y === firstCommand.y
            ) {
                subpath.shift();
                subpath[0].type = 'M';
            }

            if (i + 1 < commands.length) {
                subpaths.push([]);
            }
        } else if (cmd.type === 'L') {
            // remove lines that lead to the same position as the previous command
            if (previousCommand.x === cmd.x && previousCommand.y === cmd.y) {
                subpath.pop();
            }
        }
    }
    commands = [].concat.apply([], subpaths); // flatten again
    return commands;
}

/**
 * Returns options merged with the default options for outputting SVG data
 * @param {object} options (optional)
 */
function defaultSVGOutputOptions(options) {
    // accept number for backwards compatibility
    // and in that case set flipY to false
    if (parseInt(options) === options) {
        options = { decimalPlaces: options, flipY: false };
    }
    const defaultOptions = {
        decimalPlaces: 2,
        optimize: true,
        flipY: true
    };
    const newOptions = Object.assign({}, defaultOptions, options);
    return newOptions;
}
/**
 * @param  {number} x
 * @param  {number} y
 */
Path.prototype.moveTo = function(x, y) {
    this.commands.push({
        type: 'M',
        x: x,
        y: y
    });
};

/**
 * @param  {number} x
 * @param  {number} y
 */
Path.prototype.lineTo = function(x, y) {
    this.commands.push({
        type: 'L',
        x: x,
        y: y
    });
};

/**
 * Draws cubic curve
 * @function
 * curveTo
 * @memberof opentype.Path.prototype
 * @param  {number} x1 - x of control 1
 * @param  {number} y1 - y of control 1
 * @param  {number} x2 - x of control 2
 * @param  {number} y2 - y of control 2
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 */

/**
 * Draws cubic curve
 * @function
 * bezierCurveTo
 * @memberof opentype.Path.prototype
 * @param  {number} x1 - x of control 1
 * @param  {number} y1 - y of control 1
 * @param  {number} x2 - x of control 2
 * @param  {number} y2 - y of control 2
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 * @see curveTo
 */
Path.prototype.curveTo = Path.prototype.bezierCurveTo = function(x1, y1, x2, y2, x, y) {
    this.commands.push({
        type: 'C',
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2,
        x: x,
        y: y
    });
};

/**
 * Draws quadratic curve
 * @function
 * quadraticCurveTo
 * @memberof opentype.Path.prototype
 * @param  {number} x1 - x of control
 * @param  {number} y1 - y of control
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 */

/**
 * Draws quadratic curve
 * @function
 * quadTo
 * @memberof opentype.Path.prototype
 * @param  {number} x1 - x of control
 * @param  {number} y1 - y of control
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 */
Path.prototype.quadTo = Path.prototype.quadraticCurveTo = function(x1, y1, x, y) {
    this.commands.push({
        type: 'Q',
        x1: x1,
        y1: y1,
        x: x,
        y: y
    });
};

/**
 * Closes the path
 * @function closePath
 * @memberof opentype.Path.prototype
 */

/**
 * Close the path
 * @function close
 * @memberof opentype.Path.prototype
 */
Path.prototype.close = Path.prototype.closePath = function() {
    this.commands.push({
        type: 'Z'
    });
};

/**
 * Add the given path or list of commands to the commands of this path.
 * @param  {Array} pathOrCommands - another opentype.Path, an opentype.BoundingBox, or an array of commands.
 */
Path.prototype.extend = function(pathOrCommands) {
    if (pathOrCommands.commands) {
        pathOrCommands = pathOrCommands.commands;
    } else if (pathOrCommands instanceof BoundingBox) {
        const box = pathOrCommands;
        this.moveTo(box.x1, box.y1);
        this.lineTo(box.x2, box.y1);
        this.lineTo(box.x2, box.y2);
        this.lineTo(box.x1, box.y2);
        this.close();
        return;
    }

    Array.prototype.push.apply(this.commands, pathOrCommands);
};

/**
 * Calculate the bounding box of the path.
 * @returns {opentype.BoundingBox}
 */
Path.prototype.getBoundingBox = function() {
    const box = new BoundingBox();

    let startX = 0;
    let startY = 0;
    let prevX = 0;
    let prevY = 0;
    for (let i = 0; i < this.commands.length; i++) {
        const cmd = this.commands[i];
        switch (cmd.type) {
            case 'M':
                box.addPoint(cmd.x, cmd.y);
                startX = prevX = cmd.x;
                startY = prevY = cmd.y;
                break;
            case 'L':
                box.addPoint(cmd.x, cmd.y);
                prevX = cmd.x;
                prevY = cmd.y;
                break;
            case 'Q':
                box.addQuad(prevX, prevY, cmd.x1, cmd.y1, cmd.x, cmd.y);
                prevX = cmd.x;
                prevY = cmd.y;
                break;
            case 'C':
                box.addBezier(prevX, prevY, cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
                prevX = cmd.x;
                prevY = cmd.y;
                break;
            case 'Z':
                prevX = startX;
                prevY = startY;
                break;
            default:
                throw new Error('Unexpected path command ' + cmd.type);
        }
    }
    if (box.isEmpty()) {
        box.addPoint(0, 0);
    }
    return box;
};

/**
 * Draw the path to a 2D context.
 * @param {CanvasRenderingContext2D} ctx - A 2D drawing context.
 */
Path.prototype.draw = function(ctx) {
    ctx.beginPath();
    for (let i = 0; i < this.commands.length; i += 1) {
        const cmd = this.commands[i];
        if (cmd.type === 'M') {
            ctx.moveTo(cmd.x, cmd.y);
        } else if (cmd.type === 'L') {
            ctx.lineTo(cmd.x, cmd.y);
        } else if (cmd.type === 'C') {
            ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
        } else if (cmd.type === 'Q') {
            ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
        } else if (cmd.type === 'Z') {
            ctx.closePath();
        }
    }

    if (this.fill) {
        ctx.fillStyle = this.fill;
        ctx.fill();
    }

    if (this.stroke) {
        ctx.strokeStyle = this.stroke;
        ctx.lineWidth = this.strokeWidth;
        ctx.stroke();
    }
};

/**
 * Convert the Path to a string of path data instructions
 * See http://www.w3.org/TR/SVG/paths.html#PathData
 * @param  {object|number} [options={decimalPlaces:2, optimize:true}] - Options object (or amount of decimal places for floating-point values for backwards compatibility)
 * @return {string}
 */
Path.prototype.toPathData = function(options) {
    // set/merge default options
    options = defaultSVGOutputOptions(options);

    function floatToString(v) {
        if (Math.round(v) === roundDecimal(v, options.decimalPlaces)) {
            return '' + roundDecimal(v, options.decimalPlaces);
        } else {
            return roundDecimal(v, options.decimalPlaces).toFixed(options.decimalPlaces);
        }
    }

    function packValues() {
        let s = '';
        for (let i = 0; i < arguments.length; i += 1) {
            const v = arguments[i];
            if (v >= 0 && i > 0) {
                s += ' ';
            }

            s += floatToString(v);
        }

        return s;
    }

    let commandsCopy = this.commands;
    if (options.optimize) {
        // apply path optimizations
        commandsCopy = JSON.parse(JSON.stringify(this.commands)); // make a deep clone
        commandsCopy = optimizeCommands(commandsCopy);
    }

    let flipY = options.flipY;
    if (flipY === true) {
        const tempPath = new Path();
        tempPath.extend(commandsCopy);
        const boundingBox = tempPath.getBoundingBox();
        flipY = boundingBox.y1 + boundingBox.y2;
    }
    let d = '';
    for (let i = 0; i < commandsCopy.length; i += 1) {
        const cmd = commandsCopy[i];
        if (cmd.type === 'M') {
            d += 'M' + packValues(
                cmd.x,
                flipY === false ? cmd.y : flipY - cmd.y
            );
        } else if (cmd.type === 'L') {
            d += 'L' + packValues(
                cmd.x,
                flipY === false ? cmd.y : flipY - cmd.y
            );
        } else if (cmd.type === 'C') {
            d += 'C' + packValues(
                cmd.x1,
                flipY === false ? cmd.y1 : flipY - cmd.y1,
                cmd.x2,
                flipY === false ? cmd.y2 : flipY - cmd.y2,
                cmd.x,
                flipY === false ? cmd.y : flipY - cmd.y
            );
        } else if (cmd.type === 'Q') {
            d += 'Q' + packValues(
                cmd.x1,
                flipY === false ? cmd.y1 : flipY - cmd.y1,
                cmd.x,
                flipY === false ? cmd.y : flipY - cmd.y
            );
        } else if (cmd.type === 'Z') {
            d += 'Z';
        }
    }

    return d;
};

/**
 * Convert the path to an SVG <path> element, as a string.
 * @param  {number} [decimalPlaces=2] - The amount of decimal places for floating-point values
 * @return {string}
 */
Path.prototype.toSVG = function(decimalPlaces) {
    let svg = '<path d="';
    svg += this.toPathData(decimalPlaces);
    svg += '"';
    if (this.fill && this.fill !== 'black') {
        if (this.fill === null) {
            svg += ' fill="none"';
        } else {
            svg += ' fill="' + this.fill + '"';
        }
    }

    if (this.stroke) {
        svg += ' stroke="' + this.stroke + '" stroke-width="' + this.strokeWidth + '"';
    }

    svg += '/>';
    return svg;
};

/**
 * Convert the path to a DOM element.
 * @param  {number} [decimalPlaces=2] - The amount of decimal places for floating-point values
 * @return {SVGPathElement}
 */
Path.prototype.toDOMElement = function(decimalPlaces) {
    const temporaryPath = this.toPathData(decimalPlaces);
    const newPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    newPath.setAttribute('d', temporaryPath);

    return newPath;
};

export default Path;
