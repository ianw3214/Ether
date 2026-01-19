export async function initWebGPU(canvas) {
    if (!navigator.gpu) {
        throw new Error("WebGPU not supported");
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw new Error("Failed to get GPU adapter");
    }

    const device = await adapter.requestDevice();

    const context = canvas.getContext("webgpu");
    const format = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
        device,
        format,
        alphaMode: "opaque",
    });

    return { device, context, format };
}

export function clearScreen(gpu, r, g, b, a) {
    const encoder = gpu.device.createCommandEncoder();

    const pass = encoder.beginRenderPass({
        colorAttachments: [{
            view: gpu.context.getCurrentTexture().createView(),
            clearValue: { r, g, b, a },
            loadOp: "clear",
            storeOp: "store",
        }],
    });

    pass.end();

    gpu.device.queue.submit([encoder.finish()]);
}
