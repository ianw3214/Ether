import { spriteShader } from "./shaders.js";
import { resizeCanvasToDisplaySize } from "./resize.js";

function ortho(left, right, bottom, top) {
    const lr = 1 / (left - right);
    const bt = 1 / (bottom - top);

    return new Float32Array([
        -2 * lr, 0, 0, 0,
        0, -2 * bt, 0, 0,
        0, 0, 1, 0,
        (left + right) * lr, (top + bottom) * bt, 0, 1,
    ]);
}

function modelMatrix2D(x, y, scale, rotation) {
    const c = Math.cos(rotation);
    const s = Math.sin(rotation);

    return new Float32Array([
        c * scale,  s * scale, 0, 0,
        -s * scale,  c * scale, 0, 0,
        0,          0,         1, 0,
        x,          y,         0, 1,
    ]);
}

async function loadTexture(device, url) {
    const response = await fetch(url);
    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);

    const texture = device.createTexture({
        size: [imageBitmap.width, imageBitmap.height],
        format: "rgba8unorm",
        usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    device.queue.copyExternalImageToTexture(
        { source: imageBitmap },
        { texture: texture },
        [imageBitmap.width, imageBitmap.height]
    );
    return texture;
}


export class Renderer {
    constructor(gpu) {
        this.device = gpu.device;
        this.context = gpu.context;
        this.format = gpu.format;

        this.pipeline = this.createPipeline();

        this.cameraBuffer = this.device.createBuffer({
            size: 64, // mat4x4<f32>
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        this.bindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [{
                binding: 0,
                resource: {
                buffer: this.cameraBuffer,
                },
            }],
        });

        this.modelBuffer = this.device.createBuffer({
            size: 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        this.modelBindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(1),
            entries: [{
                binding: 0,
                resource: {
                buffer: this.modelBuffer,
                },
            }],
        });

        // Quad centered at origin (1x1 size)
        const vertices = new Float32Array([
            // position      // uv
            -0.5, -0.5,      0.0, 1.0,
            0.5, -0.5,      1.0, 1.0,
            0.5,  0.5,      1.0, 0.0,
            -0.5,  0.5,      0.0, 0.0,
        ]);
        const indices = new Uint16Array([
            0, 1, 2,
            2, 3, 0,
        ]);
        this.vertexBuffer = this.device.createBuffer({
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(this.vertexBuffer, 0, vertices);
        this.indexBuffer = this.device.createBuffer({
            size: indices.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(this.indexBuffer, 0, indices);
        this.indexCount = indices.length;
    }

    async init() {
        this.sampler = this.device.createSampler({
            magFilter: "linear",
            minFilter: "linear",
        });

        this.texture = await loadTexture(this.device, "sprite.png");

        this.materialBindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(2),
            entries: [
                { binding: 0, resource: this.texture.createView() },
                { binding: 1, resource: this.sampler },
            ],
        });
    }

    static async create(gpu) {
        const renderer = new Renderer(gpu);
        await renderer.init();
        return renderer;
    }

    createPipeline() {
        const shaderModule = this.device.createShaderModule({
            code: spriteShader,
        });

        return this.device.createRenderPipeline({
            layout: "auto",
                vertex: {
                    module: shaderModule,
                    entryPoint: "vs_main",
                    buffers: [
                        {
                            arrayStride: 16, // 4 floats * 4 bytes
                            attributes: [
                                {
                                    shaderLocation: 0,
                                    offset: 0,
                                    format: "float32x2",
                                },
                                {
                                    shaderLocation: 1,
                                    offset: 8,
                                    format: "float32x2",
                                },
                            ],
                        },
                    ],
                },
                fragment: {
                    module: shaderModule,
                    entryPoint: "fs_main",
                    targets: [{ format: this.format }],
                },
                primitive: {
                    topology: "triangle-list",
                },
            }
        );
    }

    render() {
        // --- 1) Resize canvas backing store if needed ---
        const canvas = this.context.canvas;
        const dpr = window.devicePixelRatio || 1;
        const width = Math.floor(canvas.clientWidth * dpr);
        const height = Math.floor(canvas.clientHeight * dpr);

        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        // --- 2) Build 2D orthographic camera ---
        const aspect = canvas.width / canvas.height;
        const size = 1.0; // zoom level (world units)

        const left   = -size * aspect;
        const right  =  size * aspect;
        const bottom = -size;
        const top    =  size;

        const lr = 1 / (left - right);
        const bt = 1 / (bottom - top);

        const viewProj = new Float32Array([
            -2 * lr, 0,        0, 0,
            0,      -2 * bt,  0, 0,
            0,       0,       1, 0,
            (left + right) * lr,
            (top + bottom) * bt,
            0,
            1,
        ]);

        // Upload camera matrix
        this.device.queue.writeBuffer(
            this.cameraBuffer,
            0,
            viewProj
        );

        const time = performance.now() * 0.001;

        const model = modelMatrix2D(
            Math.sin(time) * 0.5,  // x movement
            0.0,
            1.0,
            time                  // rotation
        );

        this.device.queue.writeBuffer(
            this.modelBuffer,
            0,
            model
        );

        // --- 3) Begin frame ---
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
        pass.setBindGroup(0, this.bindGroup);
        pass.setBindGroup(1, this.modelBindGroup);
        pass.setBindGroup(2, this.materialBindGroup);

        pass.setVertexBuffer(0, this.vertexBuffer);
        pass.setIndexBuffer(this.indexBuffer, "uint16");
        pass.drawIndexed(this.indexCount);

        pass.end();

        this.device.queue.submit([encoder.finish()]);
    }

}
