(function() {

  const userSpaceSize = 100;
  
  /*Attribute defintions
  - defValue: a default value, should be defined for optional attributes, and left undefined for required attributes 
  - isValid: a function to check if a value is valid
  - validDesc: a string explaining what a value must satisfy to pass 'isValid'
  */
  class AttrDef {
    constructor(defValue, isValid, validDesc) {
      this.defValue = defValue;
      this.isValid = isValid;
      this.validDesc = validDesc;
    }
  }
  var attrTypes = {
    numeric: (defValue, range_min, range_max) => new AttrDef(
      defValue,
      (value) => !isNaN(value) && value >= range_min && value <= range_max,
      `a number in the range [${range_min}, ${range_max}]`
    ),
    coord: () => attrTypes.numeric(undefined, 0, userSpaceSize),
    color: (defValue) => new AttrDef(
      defValue,
      (value) => {
        if (value === 'none') return true;
        const sty = new Option().style;
        sty.color = value; //this assignment only happens if css accepts 'value' as the color attribute
        return sty.color !== '';
      },
      `"none" or a color that css understands`
    ),
    choice: (defValue, choices) => new AttrDef(
      defValue,
      (value) => choices.includes(value),
      `one of ${choices}`
    )
  };
  
  var optionalAttributes = {
    color: attrTypes.color('black'),
    fill_color: attrTypes.color('none'),
    stroke_width: attrTypes.numeric(0.2, 0.0001, userSpaceSize),
    opacity: attrTypes.numeric(1, 0, 1),
    arrow_head_size: attrTypes.numeric(3.5, 0.0001, userSpaceSize),
    stroke_dash: attrTypes.numeric(0, 0, 10),
    linecap: attrTypes.choice('butt', ['butt', 'round', 'square']),
    rotation: attrTypes.numeric(0, 0, 360)
  }
  
  /*primitive defintions
  - reqAttrs: a dictionary of required attributes (names as keys, attribute definitions as values)
  - isValid: a function to check if an object with all the required attributes (individually validated) is valid
  It checks for things like both endpoints of a segment being different
  - validDesc: a string explaining what must happen for an object to pass 'isValid'
  - drawOn: a method to draw a valid json object on a svg canvas, using the DrawUtils functions.
  */
  class PrimitiveDef {
    constructor(reqAttrs, isValid, validDesc, drawOn) {
      this.reqAttrs = reqAttrs;
      this.isValid = isValid;
      this.validDesc = validDesc;
      this.drawOn = drawOn;
    }
  }
  
  var primitives = {};
  primitives.segment = new PrimitiveDef(
    {x1: attrTypes.coord(), y1: attrTypes.coord(), x2: attrTypes.coord(), y2: attrTypes.coord()},
    (obj) => obj.x1 != obj.x2 || obj.y1 != obj.y2,
    "the two points (x1,y1) and (x2,y2) must be different",
    (svgCanvas, obj) => {
      DrawUtils.drawSegment(svgCanvas, obj);
    }
  );
  //rays, lines, and _arrows are similar to segments, so we initialize them as copies and only change the drawing method
  primitives.ray = {...primitives.segment}; //spread syntax for deep copy
  primitives.ray.drawOn = (svgCanvas, obj) => {
    DrawUtils.drawRay(svgCanvas, obj);
  }
  primitives.line = {...primitives.segment};
  primitives.line.drawOn = (svgCanvas, obj) => {
    DrawUtils.drawLine(svgCanvas, obj);
  }
  primitives.arrow = {...primitives.segment};
  primitives.arrow.drawOn = (svgCanvas, obj) => {
    DrawUtils.drawArrow(svgCanvas, obj);
  }
  primitives.double_arrow = {...primitives.segment};
  primitives.double_arrow.drawOn = (svgCanvas, obj) => {
    DrawUtils.drawArrow(svgCanvas, obj);
    let [x1, y1, x2, y2] = [obj.x1, obj.y1, obj.x2, obj.y2];
    [obj.x1, obj.y1, obj.x2, obj.y2] = [x2, y2, x1, y1];
    DrawUtils.drawArrow(svgCanvas, obj);
  }
  primitives.rectangle = new PrimitiveDef(
    {xmin: attrTypes.coord(), ymin: attrTypes.coord(), xmax: attrTypes.coord(), ymax: attrTypes.coord()},
    (obj) => obj.xmin < obj.xmax || obj.ymin < obj.ymax,
    "the width and height of a rectangle primitive must be positive",
    (svgCanvas, obj) => {
      DrawUtils.drawRect(svgCanvas, obj);
    }
  );
  primitives.point = new PrimitiveDef(
    {x: attrTypes.coord(), y: attrTypes.coord()},
    (obj) => true,
    "",
    (svgCanvas, obj) => {
      obj.radius = 0.7;
      obj.fill_color = obj.color;
      DrawUtils.drawCircle(svgCanvas, obj);
    }
  );
  primitives.circle = new PrimitiveDef(
    {x: attrTypes.coord(), y: attrTypes.coord(), radius: attrTypes.numeric(undefined, 0.0001, 2*userSpaceSize)},
    (obj) => true,
    "",
    (svgCanvas, obj) => {
      DrawUtils.drawCircle(svgCanvas, obj);
    }
  );
  primitives.triangle = new PrimitiveDef(
    {x1: attrTypes.coord(), y1: attrTypes.coord(), x2: attrTypes.coord(), y2: attrTypes.coord(), x3: attrTypes.coord(), y3: attrTypes.coord()},
    (obj) => (obj.x1 != obj.x2 || obj.y1 != obj.y2) && (obj.x1 != obj.x3 || obj.y1 != obj.y3) && (obj.x3 != obj.x2 || obj.y3 != obj.y2),
    "the three points (x1,y1), (x2,y2), (x3,y3) must be different",
    (svgCanvas, obj) => {
      DrawUtils.drawTriangle(svgCanvas, obj);
    }
  )
  
  // Wrappers around SVG.js drawing functions
  var DrawUtils = {
  
    drawSegment: (svgCanvas, obj) => {
      var seg = svgCanvas.line(obj.x1, obj.y1, obj.x2, obj.y2);
      DrawUtils.addCommonAttr(seg, obj);
    },
    
    drawRay: (svgCanvas, obj) => {
      let [x1, y1, x2, y2] = [obj.x1, obj.y1, obj.x2, obj.y2];
      let [vx, vy] = [x2 - x1, y2 - y1];
      [x2, y2] = DrawUtils.moveBeyondVisible(x2, y2, vx, vy);  
      var ray = svgCanvas.line(x1, y1, x2, y2);
      let rot = obj.rotation;
      obj.rotation = 0;
      DrawUtils.addCommonAttr(ray, obj);
      ray.rotate(rot, x1, y1); //rotate over the origin
    },

    drawLine: (svgCanvas, obj) => {
      let [x1, y1, x2, y2] = [obj.x1, obj.y1, obj.x2, obj.y2];
      let [vx, vy] = [x2 - x1, y2 - y1];
      [x1, y1] = DrawUtils.moveBeyondVisible(x1, y1, -vx, -vy);  
      [x2, y2] = DrawUtils.moveBeyondVisible(x2, y2, vx, vy);  
      var ray = svgCanvas.line(x1, y1, x2, y2);
      let rot = obj.rotation;
      obj.rotation = 0;
      DrawUtils.addCommonAttr(ray, obj);
      ray.rotate(rot, (x1+x2)/2, (y1+y2)/2); //rotate over the origin
    },
  
    drawArrow: (svgCanvas, obj) => {
      var body = svgCanvas.line(obj.x1, obj.y1, obj.x2, obj.y2);
      body.marker('end', 5, 10, function(add) {
        add.path("M 0 0 L 10 5 L 0 10 z"); //isoceles triangle
        this.attr({
          viewBox: "0 0 10 10",
          refX: "5", refY: "5",
          markerUnits: "userSpaceOnUse",
          markerWidth: obj.arrow_head_size, markerHeight: obj.arrow_head_size,
          orient: "auto-start-reverse",
        });
        this.fill(obj.color);
      });
      DrawUtils.addCommonAttr(body, obj);
    },
  
    drawCircle: (svgCanvas, obj) => {
      var circ = svgCanvas.circle(2*obj.radius).center(obj.x,obj.y);
      DrawUtils.addCommonAttr(circ, obj);
    },
  
    drawRect: (svgCanvas, obj) => {
      console.assert(obj.xmin < obj.xmax && obj.ymin < obj.ymax);
      let rw = obj.xmax-obj.xmin;
      let rh = obj.ymax-obj.ymin;
      let rect = svgCanvas.rect(rw,rh).move(obj.xmin,obj.ymin);
      DrawUtils.addCommonAttr(rect, obj);
    },

    drawTriangle: (svgCanvas, obj) => {
      var poly = svgCanvas.polygon([[obj.x1,obj.y1], [obj.x2,obj.y2], [obj.x3,obj.y3]]);
      DrawUtils.addCommonAttr(poly, obj);
    },

    addCommonAttr: (figure, obj) => {
      figure.stroke({width: obj.stroke_width, color: obj.color, linecap: obj.linecap, dasharray: [obj.stroke_dash]});
      figure.attr({fill:obj.fill_color, opacity: obj.opacity});
      figure.rotate(obj.rotation);
    },

    //utility for drawing rays: moves (x,y) in direction (vx,vy) until it is beyond user space
    moveBeyondVisible: (x, y, vx, vy) => {
      isVisible = (x,y) => x >= 0 && x <= userSpaceSize && y >= 0 && y <= userSpaceSize;
      while (isVisible(x,y)) {
        [x,y] = [x+vx, y+vy];
        [vx,vy] = [vx*10, vy*10]; //increase step size
      }
      return [x,y];
    }
  }
  
  
  
  //checks if a json object satisfies the definition of geometric primitive
  //if it returns false, it logs at least one error
  //precondition: the object is in canonical format
  function validate(obj) {
  
    logValidationError = (msg) => {
      console.error("Validation error: "+msg+". The primitive is not drawn. Primitive: ",obj);
    }
    logValidationWarning = (msg) => {
      console.warn("Validation warning: "+msg+". The primitive is still drawn. Primitive: ",obj);
    }
  
    //1. check that the object has a valid primitive type
    if (!('primitive' in obj)) {
      logValidationError("object does not have the 'primitive' attribute");
      return false;
    }  
    if (!(obj.primitive in primitives)) {
      logValidationError("value '"+obj.primitive+"' for 'primitive' attribute is not a known primitive");
      return false;
    }
    //2. check that it has all the required attributes, and they all have valid values
    const primDef = primitives[obj.primitive];
    for (const attr in primDef.reqAttrs) {
      if (!(attr in obj)) {
        logValidationError("missing required attribute '"+attr+"' in '"+obj.primitive+"' primitive");
        return false;
      }
      const attrDef = primDef.reqAttrs[attr];
      const value = obj[attr];
      if (!attrDef.isValid(value)) {
        logValidationError("Attribute '"+attr+"' cannot have value '"+value+"'. Should be "+attrDef.validDesc);
        return false;
      }
    }
    //3. check that any optional attribute that is present has valid values
    for (const attr in optionalAttributes) {
      if (attr in obj) {
        const attrDef = optionalAttributes[attr];
        const value = obj[attr];
        if (!attrDef.isValid(value)) {
          logValidationError("Attribute '"+attr+"' cannot have value '"+value+"'. Should be "+attrDef.validDesc);
          return false;
        }
      }
    }
    //4. warn about extraneous attributes
    for (const attr in obj) {
      if (attr !== 'primitive' && !(attr in primDef.reqAttrs) && !(attr in optionalAttributes)) {
        logValidationWarning("ignoring attribute '"+attr+"' in primitive '"+obj.primitive+"' that is not a required nor optional attribute");
      }
    }
    //5. primitive specific checks
    if (!primDef.isValid(obj)) {
      logValidationError(primDef.validDesc);
      return false;
    }
    return true;
  }
  
  //canonical format for flat json objects: all attributes and values are
  //lowercase and have no white spaces. makes the code more robust for latter stages
  function toCanonicalFormat(obj) {
  
    //source: https://stackoverflow.com/a/12540603
    function changeAttrsToLowercase(obj) {
      var keys = Object.keys(obj);
      var n = keys.length;
      while (n--) {
        var key = keys[n];
        if (key !== key.toLowerCase()) {
          obj[key.toLowerCase()] = obj[key];
          delete obj[key];
        }
      }
    }
    
    var canonObj = obj;
    changeAttrsToLowercase(canonObj);
    for (const attr in canonObj) {
      if (typeof canonObj[attr] === 'string') {
        canonObj[attr] = canonObj[attr].replace(/\s/g,'').toLowerCase();
      }
    }
    return canonObj;
  }  
  
  
  //utility to parse a string into a list of flat JSON objects (does not handle nested objects)
  function parseStrAsFlatJsonList(text) {
    let res = [];
    let idxOpen = text.indexOf('{');
    while (idxOpen != -1) {
      let idxClose = text.indexOf('}', idxOpen);
      if (idxClose === -1) {
        console.warn("Parsing error: Skipping JSON object that wasn't closed: "+text.substr(idxOpen));
        return res;
      }
      let len = idxClose - idxOpen + 1;
      let jsonStr = text.substr(idxOpen, len);
      try {
        res.push(JSON.parse(jsonStr));
      } catch(err) {
        let pureJsonStr = jsonStr.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2": ');
        try { //in case the problem is the missing quotes around the attributes
          res.push(JSON.parse(pureJsonStr));
        } catch(err2) {
          console.warn("Parsing error: Skipping JSON object that couldn't be parsed: "+pureJsonStr);
          console.log(err);
        } 
      }
      idxOpen = text.indexOf('{', idxClose);
    }
    return res;
  }
  
  
  
  // API: only the following functions strating with 'out$.' are added to the outer scope
  const out$ = this || window;
  out$.primitivesToSvg = (primList, xmin=0, ymin=0, xmax=100, ymax=100) => {
    console.log("simplifiedsvg: parsing and drawing");
    if (typeof primList === 'string') primList = parseStrAsFlatJsonList(primList);
  
    var svgObj = SVG();
    svgObj.viewbox(0,0,userSpaceSize,userSpaceSize);
    for (let i = 0; i < primList.length; i++) {
      let prim = toCanonicalFormat(primList[i]);
      if (!validate(prim)) continue;
      //pick non-provided optional attributes from the defaults
      for (const attr in optionalAttributes) {
        if (!(attr in prim)) prim[attr] = optionalAttributes[attr].defValue;
      }
      primitives[prim.primitive].drawOn(svgObj, prim);
    }
    //cropping final image:
    svgObj.viewbox(xmin, ymin, xmax-xmin, ymax-ymin);
    //to convert 'svgObj' from js object to XML document, we add it to a new div and then return its first child
    var newDiv = document.createElement("div");
    svgObj.addTo(newDiv);
    var svgXml = newDiv.firstElementChild;
    return svgXml;
  };
  
  out$.exportPrimitives = (primList, format, fileName, xmin=0, ymin=0, xmax=100, ymax=100) => {
    var svgXml = primitivesToSvg(primList, xmin, ymin, xmax, ymax);
    var exportOpts = {backgroundColor: 'white', scale: 8, encoderOptions: 1};
    if (format.toLowerCase() == 'png') saveSvgAsPng(svgXml, fileName, exportOpts); //saveSvgAsPng from saveSvgAsPng.js
    else if (format.toLowerCase() == 'svg') saveSvg(svgXml, fileName, exportOpts); //saveSvg from saveSvgAsPng.js
    else console.error("Exporting error: format should be 'png' or 'svg'");
  };
  
  })();