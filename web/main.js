import createModule from "../build/engine.js";
import { createWebGPUContext } from "./webgpu/context.js";
import { Renderer } from "./webgpu/renderer.js";

const canvas = document.getElementById("gfx");

let engine = null;
let renderer = null;
let lastTime = 0;

function frame(time) {
    const dt = (time - lastTime) / 1000.0;
    lastTime = time;

    engine._engine_tick(dt);
    renderer.render();

    requestAnimationFrame(frame);
}

async function start() {
    const gpu = await createWebGPUContext(canvas);
    renderer = new Renderer(gpu);

    engine = await createModule();
    engine._engine_init();

    lastTime = performance.now();
    requestAnimationFrame(frame);
}

start();
