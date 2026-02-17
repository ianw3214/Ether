import { triangleShader } from "./shaders.js";
import { resizeCanvasToDisplaySize } from "./resize.js";

export class Renderer {
    constructor(gpu) {
        this.device = gpu.device;
        this.context = gpu.context;
        this.format = gpu.format;

        this.pipeline = this.createPipeline();
    }

    createPipeline() {
        const shaderModule = this.device.createShaderModule({
            code: triangleShader,
        });

        return this.device.createRenderPipeline({
            layout: "auto",
                vertex: {
                module: shaderModule,
                entryPoint: "vs_main",
            },
            fragment: {
                module: shaderModule,
                entryPoint: "fs_main",
                targets: [{ format: this.format }],
            },
            primitive: {
                topology: "triangle-list",
            },
        });
    }

    render() {
        resizeCanvasToDisplaySize(this.context.canvas);

        const encoder = this.device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: this.context.getCurrentTexture().createView(),
                clearValue: { r: 0.1, g: 0.1, b: 0.15, a: 1.0 },
                loadOp: "clear",
                storeOp: "store",
            }],
        });

        pass.setPipeline(this.pipeline);
        pass.draw(3);
        pass.end();

        this.device.queue.submit([encoder.finish()]);
    }
}
