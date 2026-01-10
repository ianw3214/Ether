@ECHO OFF
SETLOCAL

REM Ensure Emscripten environment is loaded
IF %EMSDK%=="" (
    ECHO Emscripten environment not detected
    ECHO Make sure you ran emsdk_env.bat
    EXIT /b 1
)

SET ROOT_DIR=%~dp0
SET BUILD_DIR=%ROOT_DIR%\build
IF NOT EXIST "%BUILD_DIR%" (
    MKDIR "%BUILD_DIR%"
)
PUSHD "%BUILD_DIR%"

CALL emcmake cmake ..

cmake --build . --config Release

POPD

@ECHO ON