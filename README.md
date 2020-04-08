# Simplified SVG

Draw JSON objects representing geometric primitives (lines, circles, ...) on the browser in SVG format. Export the result in SVG or PNG format.

## Sandbox / Demo

See what it is about:
http://nmamano.com/simplifiedsvgsandbox/

## Installation / Usage / API

**Dependencies:** [SVG.js](https://github.com/svgdotjs/svg.js) (always) and [saveSvgAsPng.js](https://github.com/exupero/saveSvgAsPng) (only if exporting the drawings).

Include the `simplifiedsvg.js` script in your page along with the dependencies.
For example, see how the scripts are included (from CDNs) in `index.html`.

**API:** `simplifiedsvg.js` adds two functions to the global namespace:
- `primitivesAsSVG(primitiveList)` 
- `exportPrimitives(primitiveList, format, fileName)`

Both generate a SVG drawing of the geometric primitives specified in `primitiveList`. The first returns an `XML` document (something like `<svg ... </svg>`) ready to be displayed in the browser. The second saves it in the file system. The `format` parameter can be `"png"` or `"svg"`. See `sandbox.js` for an instance of how these functions are called.

Both functions have four optional parameters with default values  `xmin = 0, ymin = 0, xmax = 100, ymax = 100` to allow to get only a subregion of the drawing.

**Coordinate system:** the "user space" (the space where the primitives "exist", independent of the size of the display), is a `100x100` square. The origin (point `(0,0)`) is at the top-left corner, so **`y` grows downwards**.

## Syntax for primitives
The `primitiveList` parameter should be an array of JSON objects, or a string containing the representation of one or more such objects.
Each JSON object corresponds to one geometric primitive, such as 
```
 {primitive: 'point', x: 1, y: 1, color: 'red'}
```
A JSON object must follow the rules described below to be **valid**.
Every valid primitive in the list is drawn in order. Later primitives hide previous ones if they overlap. For invalid primitives, nothing is drawn and at least one meaningful error is logged in the console.

Primitives have **required** and **optional** attributes. Both types are specified as attributes in the JSON object. Attributes and values are case insensitive. The attribute-value pairs are categorized as follows.

### 1. The primitive type
The object must contain the `primitive` attribute with a value specifying the type, which must match one of names listed below. Otherwise, the instruction is invalid.

### 2. Required attributes
Each primitive has specific required attributes that must be in the object for it to be a valid primitive. Here is the list of all the primitives and their required attributes:
```
    point: x, y
    segment: x1, y1, x2, y2
    ray: x1, y1, x2, y2
    line: x1, y1, x2, y2
    arrow: x1, y1, x2, y2
    double_arrow: x1, y1, x2, y2
    rectangle: xmin, ymin, xmax, ymax
    circle: x, y, radius
```
The **coordinates in all primitives must be between `0` and `100`**. Decimals values are OK. Primitives with two endpoints must have different endpoints.

### 3. Optional attributes
There are optional attributes mostly dealing with cosmetic aspects like color. Since most optional attributes are relevant to several primitives, they are generic instead of being tied to a specific primitive, but some simply have no effect on certain primitives.
If an optional parameter is not given, a default value is given. Here is the list of optional attributes and their defaults:
```
  color: black
  fill_color: none
  thickness: 3
  opacity: 1
  dash_style: solid
  linecap: round
  arrow_head_size: 3
```
By design choice to keep the module stateless and the instructions self-contained, the default values cannot be modified.

Here are the syntax rules for the optional attributes:
- `color`: string representing a color in any format commonly accepted by CSS (e.g, common english names).
- `fill_color`: same as above, or the special string `'none'`.
- `thickness`: decimal in range `[1, 10]`
- `opacity`: decimal in range `[0, 1]`
- `dash_style`: one of `'solid'` / `'dashed'` / `'dotted'`
- `linecap`: one of `'butt'` (flat) / `'round'`
- `arrow_head_size`: decimal in range `[1, 10]`

### 4. Unknown attributes
Any attribute in the object that is none of the above. These are ignored and do not make the instruction invalid, but are logged as a warning in the console.
