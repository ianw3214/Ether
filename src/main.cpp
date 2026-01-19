#include <iostream>

#include <emscripten/emscripten.h>

extern "C" {

EMSCRIPTEN_KEEPALIVE
void engine_init()
{
    std::cout << "Engine Initialization\n";
}

EMSCRIPTEN_KEEPALIVE
void engine_tick(float dt)
{
    static int frame = 0;
    std::cout << "Frame " << frame++ << " | dt = " << dt * 1000.f << "ms\n";
}

EMSCRIPTEN_KEEPALIVE
void engine_shutdown()
{
    std::cout << "Engine Shutdown\n";
}

}

int main(int argc, char* argv[])
{
    std::cout << "Hello from C++ WebAssembly!\n";
    return 0;
}