"use strict";

import Engine from "./engine.js"

// Initialization
var engineInstance = new Engine();
await engineInstance.initialize();
engineInstance.resize();
window.addEventListener('resize', engineInstance.resize);

engineInstance.render();