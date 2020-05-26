# Simplified SVG

Draw geometric primitives (lines, circles, ...) on the browser in SVG format. Export the result in SVG or PNG format. The geometric primitives are specified in JSON format. 

## Sandbox / Demo

See what it is about:
http://nmamano.com/simplifiedsvg/

## Installation / Usage / API

**Dependencies:** [SVG.js](https://github.com/svgdotjs/svg.js) (always) and [saveSvgAsPng.js](https://github.com/exupero/saveSvgAsPng) (only if exporting the drawings).

**Installation:** Include the `simplifiedsvg.js` script in your page along with the dependencies.
For example, see file `index.html` to see how the scripts are included in the sandbox (from CDNs).

**API:** `simplifiedsvg.js` adds two functions to the outer namespace:
- `primitivesAsSVG(primitiveList)` 
- `exportPrimitives(primitiveList, format, fileName)`

Both generate a SVG drawing of the geometric primitives specified in `primitiveList`. The first returns an `XML` document (something like `<svg ... </svg>`) ready to be displayed in the browser. The second saves it in the file system. The `format` parameter can be `"png"` or `"svg"`. See `sandbox.js` for an instance of how these functions are called.

Both functions have four optional parameters with default values  `xmin = 0, ymin = 0, xmax = 100, ymax = 100` to allow to get only a subregion of the drawing.

**Coordinate system:** the "user space" (the space where the primitives "exist", independent of the size of the display), is a `100x100` square. The origin (point `(0,0)`) is at the top-left corner, so **`y` grows downwards**.

## Syntax for primitives
The `primitiveList` parameter should be an array of JSON objects. It can also be a string containing the representation of one or more such objects.
Each JSON object corresponds to one geometric primitive, such as 
```
 {primitive: 'point', x: 1, y: 1, color: 'red'}
```
A JSON object must follow the rules described below to be **valid**.
Every valid primitive in the list is drawn, in order. Later primitives are drawn on top of previous ones. For invalid primitives, nothing is drawn and at least one meaningful error is logged in the console.

Primitives have **required** and **optional** attributes. Both types are specified as attributes in the JSON object. Attributes and values are case insensitive. The attributes are categorized as follows.

### 1. The primitive type
The object must contain the `primitive` attribute with a value specifying the type, which must match one of names listed below. Otherwise, the instruction is invalid.

### 2. Required attributes
Each primitive has specific required attributes that must be in the object for it to be valid. Here is the list of all the primitives and their required attributes:
```
    point: x, y
    segment: x1, y1, x2, y2
    ray: x1, y1, x2, y2
    line: x1, y1, x2, y2
    arrow: x1, y1, x2, y2
    double_arrow: x1, y1, x2, y2
    rectangle: xmin, ymin, xmax, ymax
    circle: x, y, radius
    triangle: x1, y1, x2, y2, x3, y3
```
The **coordinates in all primitives must be between `0` and `100`**. Decimals values are OK.

### 3. Optional attributes
There are optional attributes for things like cosmetic aspects.
If an optional parameter is not given, the default values below are used.

- `color: "black"`. The color for 1D primitives and for the boundary of 2D primitives. A string representing a color in a format commonly accepted by CSS (e.g, common english names) or `"none"`.
- `fill_color: "none"`. The color for the inside of 2D primitives. Same format as above.
- `opacity: 1`. A number between 0 (transparent) and 1 (opaque).
- `stroke_width: 0.7`. The thickness of the lines (and points)
- `stroke_dash: 0`. Establishes the length of the dashes in a dashed line (`- - -`). A `0` means solid line. Small values can be used to create dotted lines.
- `linecap: "butt"`. Style for line endpoints. `"butt"` means flat. It can also be `"round"`.
- `arrow_head_size: 3.5`. Only relevant for arrows.
- `rotation: 0`. A number between 0 and 360.

The names are borrowed from SVG when possible for consistency, but it is not a 1-to-1 match. By design choice to keep the primitives self-contained, the default values cannot be modified.

### 4. Unknown attributes
Any attribute in the object that is none of the above. These are ignored and do not make the instruction invalid, but are logged as a warning in the console.


# To-do Notes

## Current To-do list before version 1.0:

- use it in the knight's tour project and link it from the README
- add browser support notes to the README

## Maybe future features:

- text primitive
- layer optional attribute (to override sequential drawing order)

## Maybe future features (sandbox):

- stylize invalid primitives in the input box with cursive
(see https://stackoverflow.com/questions/142527/highlight-text-inside-of-a-textarea)
- add cropping options to the interactive demo
