export const triangleShader = `
@vertex
fn vs_main(@builtin(vertex_index) vi: u32)
    -> @builtin(position) vec4<f32> {

    var positions = array<vec2<f32>, 3>(
        vec2<f32>( 0.0,  0.5),
        vec2<f32>(-0.5, -0.5),
        vec2<f32>( 0.5, -0.5)
    );

    let p = positions[vi];
    return vec4<f32>(p, 0.0, 1.0);
}

@fragment
fn fs_main() -> @location(0) vec4<f32> {
    return vec4<f32>(0.9, 0.2, 0.2, 1.0);
}
`;
