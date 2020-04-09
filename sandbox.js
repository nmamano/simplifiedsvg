var inputFieldId = 'inputField';

//for persistance across refresh
function loadInputField() {
  if (localStorage.inputText && localStorage.inputText.length > 0) {
    console.log("sandbox: load settings");
    $('#'+inputFieldId).val(localStorage.inputText);
  }
}
function saveInputField() {
  console.log("sandbox: save settings");
  localStorage.inputText = $('#'+inputFieldId).val();
}

//wrappers around SimplifiedSVG calls
function exportSvg() {
  const primListText = document.getElementById(inputFieldId).value;
  exportPrimitives(primListText, "svg", "sandbox_drawing.svg");
}
function exportPng() {
  const primListText = document.getElementById(inputFieldId).value;
  exportPrimitives(primListText, "png", "sandbox_drawing.png");
}
function drawPrimitivesOnCanvas() {
  saveInputField();
  const primListText = document.getElementById(inputFieldId).value;
  const svgXml = primitivesToSvg(primListText);
  $('#drawCanvas').html(svgXml);
}

$(document).ready(function() {
  loadInputField();
  drawPrimitivesOnCanvas();
});
