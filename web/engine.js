"use strict";

const canvas = document.querySelector("canvas");

const QUAD_VERTICES = new Float32Array([
    -0.5, -0.5,
    0.5, -0.5,
    0.5,  0.5,
    -0.5, -0.5,
    0.5,  0.5,
    -0.5,  0.5,
]);

// --------------------------------------------
async function loadImageBitmap(url) {
    const res = await fetch(url);
    const blob = await res.blob();
    return await createImageBitmap(blob, { colorSpaceConversion: "none" });
}

// --------------------------------------------
export default class Engine {
    constructor() {
        this.device = undefined;
        this.context = undefined;
        this.canvasFormat = undefined;

        this.vertexBuffer = undefined;
        this.quadBindGroupLayout = undefined;
        this.screenUniformBuffer = undefined;
        this.textureBindGroup = undefined;
        this.quadPipeline = undefined;

        this.encoder = undefined;
        this.pass = undefined;
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
        this.quadBindGroupLayout = this.device.createBindGroupLayout({
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
        const screenUniformArray = new Float32Array([960, 720]);
        this.screenUniformBuffer = this.device.createBuffer({
            label: "Screen Resolution Uniform",
            size: screenUniformArray.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.screenUniformBuffer, 0, screenUniformArray);

        // Quad shader
        const quadShaderModule = this.device.createShaderModule({
            label : "Quad shader",
            code : `
                struct VertexInput {
                    @location(0) pos: vec2f,
                };

                struct QuadInfo {
                    worldPosition: vec2f,
                    scale: vec2f,
                };

                struct VertexOutput {
                    @builtin(position) position: vec4f,
                    @location(0) texCoord: vec2f,
                };

                @group(0) @binding(0) var<uniform> screenResolution: vec2f;
                @group(0) @binding(1) var<uniform> quadInfo: QuadInfo;

                @vertex
                fn vertexMain(input : VertexInput) -> VertexOutput {
                    let worldPos = quadInfo.worldPosition + input.pos * quadInfo.scale;

                    var vertexOutput: VertexOutput;
                    vertexOutput.position = vec4f(worldPos / screenResolution * 2.0, 0.0, 1.0);
                    vertexOutput.texCoord = vec2f(input.pos.x + 0.5, 0.5 - input.pos.y);
                    return vertexOutput;
                }

                @group(1) @binding(0) var textureSampler: sampler;
                @group(1) @binding(1) var textureData: texture_2d<f32>;

                @fragment
                fn fragmentMain(fragmentInput: VertexOutput) -> @location(0) vec4f {
                    return textureSample(textureData, textureSampler, fragmentInput.texCoord);
                }
            `
        })

        // Texture
        const url = "../resources/test.png";
        const source = await loadImageBitmap(url);
        const texture = this.device.createTexture({
            label: url,
            format: "rgba8unorm",
            size: [source.width, source.height],
            usage: GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT,
        });
        this.device.queue.copyExternalImageToTexture(
            { source, flipY: true },
            { texture },
            { width: source.width, height: source.height }
        );
        const sampler = this.device.createSampler({
            addressModeU: "clamp-to-edge",
            addressModeV: "clamp-to-edge",
            magFilter: "nearest",
        });
        const textureBindGroupLayout = this.device.createBindGroupLayout({
            label: "Texture Bind Group Layout",
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                sampler: { type: "filtering" }
            }, {
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT,
                texture: { sampleType: "float", viewDimension: "2d" }
            }]
        });
        this.textureBindGroup = this.device.createBindGroup({
            label: "Texture Bind Group",
            layout: textureBindGroupLayout,
            entries: [{
                binding: 0,
                resource: sampler
            }, {
                binding: 1,
                resource: texture
            }]
        })

        // Pipeline
        const pipelineLayout = this.device.createPipelineLayout({
            label: "Quad Pipeline Layout",
            bindGroupLayouts: [ this.quadBindGroupLayout, textureBindGroupLayout ],
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

    resize() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
        canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
        this.context.configure({ device: this.device, format: this.canvasFormat, alphaMode: 'opaque' });
    }

    startFrame() {
        this.encoder = this.device.createCommandEncoder();
        this.pass = this.encoder.beginRenderPass({
            colorAttachments: [{
                view: this.context.getCurrentTexture().createView(),
                loadOp: "clear",
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
                storeOp: "store",
            }],
        });
        this.pass.setPipeline(this.quadPipeline);
    }

    endFrame() {
        this.pass.end();
        this.device.queue.submit([this.encoder.finish()]);
    }

    render(obj) {
        // const uniformArray = new Float32Array([x, y, 50, 50]);
        // this.device.queue.writeBuffer(obj.buffer, 0, obj.bufferValues);
        
        this.pass.setVertexBuffer(0, this.vertexBuffer);
        this.pass.setBindGroup(0, obj.bindGroup);
        this.pass.setBindGroup(1, this.textureBindGroup);    

        this.pass.draw(QUAD_VERTICES.length / 2);
    }

    createRenderObject(x, y) {
        // Quad uniform buffer
        const uniformArray = new Float32Array([x, y, 50, 50]);
        const quadUniformBuffer = this.device.createBuffer({
            label : "Quad World Position Uniform",
            size : uniformArray.byteLength,
            usage : GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })
        this.device.queue.writeBuffer(quadUniformBuffer, 0, uniformArray);

        // Quad vertex bind group
        const quadBindGroup = this.device.createBindGroup({
            label: "Quad Bind Group",
            layout: this.quadBindGroupLayout,
            entries: [{
                binding: 0,
                resource: { buffer: this.screenUniformBuffer }
            }, {
                binding: 1,
                resource: { buffer: quadUniformBuffer }
            }]
        });

        return {
            bufferValues: uniformArray,
            buffer: quadUniformBuffer,
            bindGroup: quadBindGroup,
        };
    }
}