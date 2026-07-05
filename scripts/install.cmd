@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo termlink needs Node.js on your PATH. Install it from https://nodejs.org and rerun this script.
  exit /b 1
)

rem Copied into a stable location rather than run in place -- this folder is
rem usually a throwaway extraction under Downloads, and the installed command
rem would silently break the moment that gets cleaned up.
if defined TERMLINK_INSTALL_DIR (set "INSTALL_DIR=%TERMLINK_INSTALL_DIR%") else set "INSTALL_DIR=%LOCALAPPDATA%\termlink"
if exist "%INSTALL_DIR%" rmdir /s /q "%INSTALL_DIR%"
xcopy /e /i /q /y dist "%INSTALL_DIR%\dist" >nul
if errorlevel 1 exit /b 1
xcopy /e /i /q /y node_modules "%INSTALL_DIR%\node_modules" >nul
if errorlevel 1 exit /b 1

rem Windows can't execute a shebang file, so instead of install.sh's symlink
rem the installed command is a .cmd shim that hands the bundle to node. The
rem bundle must stay next to node_modules for require('node-pty') to resolve.
if defined TERMLINK_BIN_DIR (set "BIN_DIR=%TERMLINK_BIN_DIR%") else set "BIN_DIR=%LOCALAPPDATA%\termlink\bin"
if not exist "%BIN_DIR%" mkdir "%BIN_DIR%"
> "%BIN_DIR%\termlink.cmd" echo @node "%INSTALL_DIR%\dist\index.js" %%*

echo Installed termlink to %INSTALL_DIR% (shim at %BIN_DIR%\termlink.cmd)
echo This extracted folder can now be deleted -- termlink no longer needs it.

echo ;%PATH%; | findstr /i /c:";%BIN_DIR%;" >nul
if errorlevel 1 (
  echo %BIN_DIR% isn't on your PATH yet. Add it via Settings ^> System ^> About ^>
  echo Advanced system settings ^> Environment Variables, then open a new
  echo terminal and run 'termlink'.
) else (
  echo Run 'termlink' to start.
)
