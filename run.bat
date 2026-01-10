@ECHO OFF
SETLOCAL

SET ROOT_DIR=%~dp0
SET BUILD_DIR=%ROOT_DIR%\build
IF NOT EXIST "%BUILD_DIR%\index.html" (
    ECHO index.html does not exist, build first
    EXIT /b 1
)

PUSHD %BUILD_DIR%
CALL emrun index.html
POPD

@ECHO ON