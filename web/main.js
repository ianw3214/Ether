"use strict";

import Engine from "./engine.js"

// Initialization
var engineInstance = new Engine();
await engineInstance.initialize();
engineInstance.resize();
window.addEventListener('resize', engineInstance.resize);

function render() {
    engineInstance.startFrame();
    engineInstance.render(0, 0);
    engineInstance.endFrame();

    requestAnimationFrame(render);
}

requestAnimationFrame(render);
