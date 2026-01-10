#include <iostream>

#include <emscripten/emscripten.h>

extern "C" {

EMSCRIPTEN_KEEPALIVE
void tick()
{
    static int frame = 0;
    std::cout << "Frame " << frame++ << '\n';
}

}

int main(int argc, char* argv[])
{
    std::cout << "Hello from C++ WebAssembly!\n";
    return 0;
}