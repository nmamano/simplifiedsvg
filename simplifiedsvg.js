(function() {

var primitiveReqAttributes = {
  point: ['x','y'],
  segment: ['x1','y1','x2','y2'],
  ray: ['x1','y1','x2','y2'],
  line: ['x1','y1','x2','y2'],
  arrow: ['x1','y1','x2','y2'],
  double_arrow: ['x1','y1','x2','y2'],
  rectangle: ['xmin','ymin','xmax','ymax'],
  circle: ['x','y','radius']
}

var defaultOptAttributes = {
  color: 'black',
  fill_color: 'none',
  thickness: 3,
  opacity: 1,
  dash_style: 'solid',
  linecap: 'round',
  arrow_head_size: 3
}

//precondition: the primitive is in canonical format
function validate(prim) {

  //validate parameters
  const userSpaceSize = 100;
  const minThickness = 1;
  const maxThickness = 10;
  const minArrowHeadSize = 1;
  const maxArrowHeadSize = 10;
  const minOpacity = 0;
  const maxOpacity = 1;
  const minCoord = 0;
  const maxCoord = userSpaceSize;
  const minRadius = 0.0001;
  const maxRadius = 2*userSpaceSize;
  const dashStyleChoices = ['solid','dashed','dotted'];
  const linecapChoices = ['butt','round'];
  const coordAttrs = ['x','y','x1','y1','x2','y2','xmin','ymin','xmax','ymax'];

  //validate internal auxiliary functions
  function logValidationError(msg) {
    console.error("Validation error: "+msg+". The primitive is not drawn. Primitive: ",prim);
  }
  function logValidationWarning(msg) {
    console.error("Validation warning: "+msg+". The primitive is still drawn. Primitive: ",prim);
  }
  function validateNumAttr(attr, value, range_min, range_max) {
    if (isNaN(value)) {
      logValidationError("attribute '"+attr+"' in primitive '"+prim.primitive+"' has value "+
          value.toString()+", which  is not a number");
      return false;
    }
    if (value < range_min || value > range_max) {
      logValidationError("attribute '"+attr+"' in primitive '"+prim.primitive+"' has value "+
          value.toString()+", which is not in range ["+range_min.toString()+","+range_max.toString()+"]");
      return false;
    }
    return true;
  }
  function validateChoiceAttr(attr, value, choices) {
    if (!choices.includes(value)) {
      logValidationError("attribute '"+attr+"' in primitive '"+prim.primitive+"' has value '"+
          value+"', which is not among the valid options "+choices);
      return false;
    }
    return true;
  }
  function validateColorAttr(attr, value) {
    const s = new Option().style;
    s.color = value; //this assignment happens only if css accepts 'value' as color attribute
    if (s.color === '') {
      logValidationError("attibute '"+attr+"' in primitive '"+prim.primitive+"' has value '"+
          value+"', which is not a valid color");
      return false;
    }
    return true;
  }

  //1. check that the json object has a valid primitive type
  if (!('primitive' in prim)) {
    logValidationError("primitive object does not have the 'primitive' attribute");
    return false;
  }  
  if (!(prim.primitive in primitiveReqAttributes)) {
    logValidationError("value '"+prim.primitive+"' for 'primitive' attribute is not a known primitive");
    return false;
  }
  //2. check that it has all the required attributes, and they all have valid values
  for (let i = 0; i < primitiveReqAttributes[prim.primitive].length; i++) {
    const attr = primitiveReqAttributes[prim.primitive][i];
    if (!(attr in prim)) {
      logValidationError("missing required attribute '"+attr+"' in '"+prim.primitive+"' primitive");
      return false;
    }
    const value = prim[attr];
    if (coordAttrs.includes(attr)) {
      if (!validateNumAttr(attr, value, minCoord, maxCoord)) return false;
    } else if (attr === 'radius') {
      if (!validateNumAttr(attr, value, minRadius, maxRadius)) return false;
    } else {
      throw new Error("attribute '"+attr+"' is in the required list but is not considered in validation");
    }
  }
  //3. check that any optional attribute that is present has valid values
  for (const attr in defaultOptAttributes) {
    if (attr in prim) {
      const value = prim[attr];
      switch(attr) {
        case 'color':       
          if (!validateColorAttr(attr, value)) return false;
          break;
        case 'fill_color':
          if (value === 'none') continue;
          if (!validateColorAttr(attr, value)) return false;
          break;
        case 'thickness':
          if (!validateNumAttr(attr, value, minThickness, maxThickness)) return false;
          break;
        case 'arrow_head_size':
          if (!validateNumAttr(attr, value, minArrowHeadSize, maxArrowHeadSize)) return false;
          break;
        case 'opacity':
          if (!validateNumAttr(attr, value, minOpacity, maxOpacity)) return false;
          break;
        case 'dash_style':
          if (!validateChoiceAttr(attr, value, dashStyleChoices)) return false;
          break;
        case 'linecap':
          if (!validateChoiceAttr(attr, value, linecapChoices)) return false;
          break;
        default:
          throw new Error("attribute '"+attr+"' is in the optional list but is not considered in validation");      
      }
    }
  }
  //4. warn about extraneous attributes
  for (const attr in prim) {
    if (attr !== 'primitive' && !primitiveReqAttributes[prim.primitive].includes(attr) && !(attr in defaultOptAttributes)) {
      logValidationWarning("ignoring attribute '"+attr+"' in primitive '"+prim.primitive+"' that is not a required nor optional attribute");
    }
  }
  //5. primitive specific checks
  switch (prim.primitive) {
    case 'segment':
    case 'ray':
    case 'line':
    case 'arrow':
    case 'double_arrow':
      if (prim.x1 === prim.x2 && prim.y1 === prim.y2) {
        logValidationError("the two endpoints (x1,y1) and (x2,y2) of a '"+prim.primitive+"' primitive must be different");
        return false;
      }
      break;
    case 'rectangle':
      if (prim.xmin >= prim.xmax || prim.ymin >= prim.ymax) {
        logValidationError("the width and height of a '"+prim.primitive+"' primitive must be positive");
        return false;
      }
      break;
  }
  return true;
}


//precondition: the primitive is in canonical format & validated
function drawPrimitiveOn(prim, svgCanvas) {

  //draw internal auxiliary functions
  function drawSegment(x0, y0, x1, y1, thickness, color) {
    svgCanvas.line(x0, y0, x1, y1).stroke({ width: thickness, color: color, linecap: 'round'});
  }
  function drawArrow(x0, y0, x1, y1, thickness, color, arrow_head_size){
    var body = svgCanvas.line(x0, y0, x1, y1);
    body.stroke({ width: thickness, color: color, linecap: 'butt'});
    body.marker('end', 5, 10, function(add) {
      add.path("M 0 0 L 10 5 L 0 10 z"); //isoceles triangle
      this.attr({
        viewBox: "0 0 10 10",
        refX: "5", refY: "5",
        markerUnits: "userSpaceOnUse",
        markerWidth: arrow_head_size, markerHeight: arrow_head_size,
        orient: "auto-start-reverse"
      })
      this.fill(color);
    });
  }
  function drawCircle(x, y, rad, thickness, color, fill_color) {
    var circ = svgCanvas.circle(2*rad).center(x,y);
    circ.attr({
      fill:fill_color,
      'stroke-width': thickness,
      stroke: color
    });
  }
  function drawRect(xmin, ymin, xmax, ymax, thickness, color, fill_color) {
    console.assert(xmin < xmax && ymin < ymax);
    let rw = xmax-xmin;
    let rh = ymax-ymin;
    let rect = svgCanvas.rect(rw,rh).move(xmin,ymin);
    rect.attr({
      fill: fill_color,
      'stroke-width': thickness,
      stroke: color
    });
  }

  //move point (x, y) in direction (vx, vy) until it is beyond the visible region
  function moveBeyondVisible(x, y, vx, vy) {
    function isVisible(x,y) {
      return x >= 0 && x <= 100 && y >= 0 && y <= 100;
    }
    while (isVisible(x,y)) {
      [x,y] = [x+vx, y+vy];
      [vx,vy] = [vx*10, vy*10]; //increase step size
    }
    return [x,y];
  }
  
  //the thickness attribute ranges from 1 to 10
  //this function maps it to the ranges [0.23, 5] in user space (grows non-linearly)
  function userSpaceThickness(thickAttr) {
    return thickAttr*0.2 + thickAttr*thickAttr*0.03;
  }

  //the arrow head size attribute ranges from 1 to 10
  //this function maps it to the ranges [2.4, 10.5] in user space (grows non-linearly)
  function userSpaceArrowSize(arrowSizeAttr) {
    return 2 + arrowSizeAttr*0.35 + arrowSizeAttr*arrowSizeAttr*0.05;
  }

  //pick non-provided optional attributes from the defaults
  const color = prim.color || defaultOptAttributes.color;
  const fill_color = prim.fill_color || defaultOptAttributes.fill_color;
  const thickness = userSpaceThickness(prim.thickness || defaultOptAttributes.thickness);
  const opacity = prim.opacity || defaultOptAttributes.opacity;
  const dash_style = prim.dash_style || defaultOptAttributes.dash_style;
  const linecap = prim.linecap || defaultOptAttributes.linecap;
  const arrow_head_size = userSpaceArrowSize(prim.arrow_head_size || defaultOptAttributes.arrow_head_size);

  // shorthands for brevity (some may be undefined, depending on the primitive)
  let [x,y,x1,y1,x2,y2] = [prim.x, prim.y, prim.x1, prim.y1, prim.x2, prim.y2];
  switch(prim.primitive) {
    case "segment":
      drawSegment(x1, y1, x2, y2, thickness, color);
      break;
    case "ray":
    case "line":
      let [vx, vy] = [x2 - x1, y2 - y1];
      [x2, y2] = moveBeyondVisible(x2, y2, vx, vy);
      if (prim.primitive === 'line') {
        [x1, y1] = moveBeyondVisible(x1, y1, -vx, -vy);
      }
      drawSegment(x1, y1, x2, y2, thickness, color);
      break;
    case "arrow":
      drawArrow(x1, y1, x2, y2, thickness, color, arrow_head_size);
      break;
    case "double_arrow":
      drawArrow(x1, y1, x2, y2, thickness, color, arrow_head_size);
      drawArrow(x2, y2, x1, y1, thickness, color, arrow_head_size);
      break;
    case "rectangle":
      drawRect(prim.xmin, prim.ymin, prim.xmax, prim.ymax, thickness, color, fill_color);
      break;    
    case "circle":
      drawCircle(x, y, prim.radius, thickness, color, fill_color);
      break;
    default:
      throw new Error("drawing primitive is not any of the specified cases");
  }
}


//canonical format: all attributes and values are lowercase and have no white spaces
function toCanonicalFormat(prim) {

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
  
  var canonPrim = prim;
  changeAttrsToLowercase(canonPrim);
  for (const attr in canonPrim) {
    if (typeof canonPrim[attr] === 'string') {
      canonPrim[attr] = canonPrim[attr].replace(/\s/g,'').toLowerCase();
    }
  }
  return canonPrim;
}


//main loop to format/parse/draw all the primitives in the list
function drawPrimitivesOn(primList, svgCanvas) {
  console.log("simplifiedsvg: redering");
  svgCanvas.clear();
  primList.forEach(prim => {
    prim = toCanonicalFormat(prim);
    if (validate(prim)) drawPrimitiveOn(prim, svgCanvas);
  });
}


//parse string into list of JSON objects
function jsonListParse(text) {
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

out$.primitivesAsSVG = (primList, xmin=0, ymin=0, xmax=100, ymax=100) => {
  if (xmin !== 0 || ymin !== 0 || xmax !== 100 || ymax !== 100) {
    console.log('cropping not supported yet');
  }
  if (typeof primList === 'string') primList = jsonListParse(primList);
  var svgObj = SVG();
  svgObj.viewbox(0,0,100,100);
  drawPrimitivesOn(primList, svgObj);
  //to convert 'svgObj' from js object to XML document, we add it to a new div and then return its first child
  var newDiv = document.createElement("div");
  svgObj.addTo(newDiv);
  var svgXml = newDiv.firstElementChild;
  return svgXml;
};

out$.exportPrimitives = (primList, format, fileName, xmin=0, ymin=0, xmax=100, ymax=100) => {
  var svgXml = primitivesAsSVG(primList, xmin, ymin, xmax, ymax);
  var exportOpts = {backgroundColor: 'white', scale: 8, encoderOptions: 1};
  if (format.toLowerCase() == 'png') saveSvgAsPng(svgXml, fileName, exportOpts);
  else if (format.toLowerCase() == 'svg') saveSvg(svgXml, fileName, exportOpts);
  else console.error("Exporting error: format should be 'png' or 'svg'");
};

})();