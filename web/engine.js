"use strict";

const canvas = document.querySelector("canvas");

const QUAD_VERTICES = new Float32Array([
    -1.0, -1.0,
    1.0, -1.0,
    1.0,  1.0,
    -1.0, -1.0,
    1.0,  1.0,
    -1.0,  1.0,
]);

// --------------------------------------------
export default class Engine {
    constructor() {
        this.device = undefined;
        this.context = undefined;
        this.canvasFormat = undefined;

        this.vertexBuffer = undefined;
        this.quadBindGroup = undefined;
        this.quadPipeline = undefined;
    }

    async initialize() {
        if (!navigator.gpu)
        {
            throw new Error("WebGPU not supported on this browser");
        }
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter)
        {
            throw new Error("No appropriate GPUAdapter found");
        }
        this.device = await adapter.requestDevice();

        this.context = canvas.getContext("webgpu");
        this.canvasFormat = navigator.gpu.getPreferredCanvasFormat();
        this.context.configure({
            device: this.device,
            format: this.canvasFormat,
        });

        // Create & initialize vertex buffer
        this.vertexBuffer = this.device.createBuffer({
            label : "Quad vertices",
            size : QUAD_VERTICES.byteLength,
            usage : GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.vertexBuffer, 0, QUAD_VERTICES);
        const vertexBufferLayout = {
            arrayStride : 8,
            attributes : [{
                format : "float32x2",
                offset : 0,
                shaderLocation : 0,
            }]
        };
        const screenUniformArray = new Float32Array([960, 720]);
        const screenUniformBuffer = this.device.createBuffer({
            label: "Screen Resolution Uniform",
            size: screenUniformArray.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(screenUniformBuffer, 0, screenUniformArray);

        const uniformArray = new Float32Array([0, 0]);
        const uniformBuffer = this.device.createBuffer({
            label : "Quad World Position Uniform",
            size : uniformArray.byteLength,
            usage : GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })
        this.device.queue.writeBuffer(uniformBuffer, 0, uniformArray);

        // Quad shader
        const quadShaderModule = this.device.createShaderModule({
            label : "Quad shader",
            code : `
                struct VertexInput {
                    @location(0) pos : vec2f,
                };

                @group(0) @binding(0) var<uniform> screenResolution: vec2f;
                @group(0) @binding(1) var<uniform> worldPosition : vec2f;

                @vertex
                fn vertexMain(input : VertexInput) -> @builtin(position) vec4f {
                    let worldPos = worldPosition + input.pos;
                    return vec4f(worldPos / screenResolution, 0.0, 1.0);
                }

                @fragment
                fn fragmentMain() -> @location(0) vec4f {
                    return vec4f(1, 0, 0, 1);
                }
            `
        })

        // Bind groups
        const quadBindGroupLayout = this.device.createBindGroupLayout({
            label: "Quad Bind Group Layout",
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: {}
            }, {
                binding: 1,
                visibility: GPUShaderStage.VERTEX,
                buffer: {}
            }]
        });
        this.quadBindGroup = this.device.createBindGroup({
            label: "Quad Bind Group",
            layout: quadBindGroupLayout,
            entries: [{
                binding: 0,
                resource: { buffer: screenUniformBuffer }
            }, {
                binding: 1,
                resource: { buffer: uniformBuffer }
            }]
        });

        // Pipeline
        const pipelineLayout = this.device.createPipelineLayout({
            label: "Quad Pipeline Layout",
            bindGroupLayouts: [ quadBindGroupLayout ],
        });
        this.quadPipeline = this.device.createRenderPipeline({
            label: "Quad Pipeline",
            layout: pipelineLayout,
            vertex: {
                module: quadShaderModule,
                entryPoint: "vertexMain",
                buffers: [vertexBufferLayout]
            },
            fragment: {
                module: quadShaderModule,
                entryPoint: "fragmentMain",
                targets: [{
                    format: this.canvasFormat
                }]
            }
        });
    }

    render() {
        const encoder = this.device.createCommandEncoder();

        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: this.context.getCurrentTexture().createView(),
                loadOp: "clear",
                clearValue: { r : 0, g : 0, b : 0, a : 1 },
                storeOp: "store",
            }],
        });

        pass.setPipeline(this.quadPipeline);
        pass.setVertexBuffer(0, this.vertexBuffer);
        pass.setBindGroup(0, this.quadBindGroup);

        pass.draw(QUAD_VERTICES.length / 2);

        pass.end();
        this.device.queue.submit([encoder.finish()]);
    }
}