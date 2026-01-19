import createModule from "../build/engine.js";
import { initWebGPU, clearScreen } from "./webgpu.js";

const canvas = document.getElementById("gfx");

let gpu = null;
let engine = null;
let lastTime = 0;

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
}
window.addEventListener("resize", resizeCanvas);

function frame(time) {
    const dt = (time - lastTime) / 1000.0;
    lastTime = time;

    engine._engine_tick(dt);

    // Animate clear color
    const t = time * 0.001;
    clearScreen(
        gpu,
        0.5 + 0.5 * Math.sin(t),
        0.2,
        0.8,
        1.0
    );

    requestAnimationFrame(frame);
}

async function start() {
    resizeCanvas();

    gpu = await initWebGPU(canvas);
    console.log("WebGPU initialized");

    engine = await createModule();
    console.log("Engine loaded");

    engine._engine_init();

    lastTime = performance.now();
    requestAnimationFrame(frame);
}

start();
