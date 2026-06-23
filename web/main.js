"use strict";

import Engine from "./engine.js"

// Initialization
var engineInstance = new Engine();
await engineInstance.initialize();

engineInstance.render();