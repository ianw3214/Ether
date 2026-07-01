"use strict";

import Engine from "./engine.js"
import Game from "./game.js"

// Initialization
var engineInstance = new Engine();
await engineInstance.initialize();
engineInstance.resize();
window.addEventListener('resize', engineInstance.resize);

// Game initialization
var gameInstance = new Game(engineInstance);

let lastRender = 0;

function render(timestamp) {
    const delta = timestamp - lastRender;

    gameInstance.update(delta);

    engineInstance.startFrame();
    gameInstance.render(engineInstance);
    engineInstance.endFrame();

    lastRender = timestamp;
    requestAnimationFrame(render);
}

requestAnimationFrame(render);
