export const spriteShader = `
struct Camera {
  viewProj : mat4x4<f32>
};

struct Model {
  model : mat4x4<f32>
};

@group(0) @binding(0)
var<uniform> camera : Camera;

@group(1) @binding(0)
var<uniform> model : Model;

@group(2) @binding(0)
var spriteTexture : texture_2d<f32>;

@group(2) @binding(1)
var spriteSampler : sampler;

struct VertexInput {
  @location(0) position : vec2<f32>,
  @location(1) uv       : vec2<f32>,
};

struct VertexOutput {
  @builtin(position) position : vec4<f32>,
  @location(0) uv             : vec2<f32>,
};

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
  var out : VertexOutput;

  let local = vec4<f32>(input.position, 0.0, 1.0);
  out.position = camera.viewProj * model.model * local;
  out.uv = input.uv;

  return out;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
  return textureSample(spriteTexture, spriteSampler, input.uv);
}
`;
