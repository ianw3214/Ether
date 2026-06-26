"use strict";

import Engine from "./engine.js"

// Initialization
var engineInstance = new Engine();
await engineInstance.initialize();
engineInstance.resize();
window.addEventListener('resize', engineInstance.resize);

const renderObj = engineInstance.createRenderObject(0, 0);
const renderObj2 = engineInstance.createRenderObject(100, 0);

function render() {
    engineInstance.startFrame();
    engineInstance.render(renderObj);
    engineInstance.render(renderObj2);
    engineInstance.endFrame();

    requestAnimationFrame(render);
}

requestAnimationFrame(render);
