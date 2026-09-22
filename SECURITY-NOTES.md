# Security notes

This document lists the behaviour an endpoint-protection product (EDR) can
observe in Open PDF Studio, and what was deliberately removed so that
behaviour no longer occurs.

## Removed in 2.9.0

| Removed | Why |
|---|---|
| Virtual printer ("Open PDF Printer") | Installing it wrote a `.ps1` file to `%TEMP%` and ran it via `Start-Process -Verb RunAs -WindowStyle Hidden` with `-ExecutionPolicy Bypass`, deleting the file afterwards. That combination is indistinguishable from a malware dropper, whatever it is used for. |
| PowerShell printer enumeration | The print dialog started `powershell.exe` (`Get-CimInstance Win32_Printer`) on open. It now calls `EnumPrintersW` in-process. |
| Global PrtScn hotkey | Registering a system-wide key is indistinguishable from a keylogger to an EDR. The in-app "Annotate clipboard screenshot" action remains and needs no hook. |
| `keyring` dependency | Loaded `vaultcli.dll` (Windows Credential Manager) for an accounts feature that was already disabled in this build. |

After these changes the application starts **no PowerShell process at all**, on
any code path.

## What an EDR will still observe, and why

- **`RegisterRawInputDevices` at startup.** Called by Tauri's windowing layer
  (`tao`), not by this application, so the window receives mouse and keyboard
  events. The flags are `RIDEV_DEVNOTIFY` only; `RIDEV_INPUTSINK` is **not**
  set, so no input is received while the window is not focused. Every
  Tauri and Electron application on Windows does this.
- **Child processes.** `pdfium-worker.exe` (a PDF rendering worker, several
  instances) ships next to the main binary and is started at launch. PDF
  rendering runs there so a malformed file cannot take down the editor.
- **`reg query`** (read-only) to check whether the application is the default
  `.pdf` handler, and `cmd /C start` to open a file or a settings page in the
  user's default application.
- **High entropy / "probably packed".** The executable embeds the user
  interface, PDFium and the OCR data; the NSIS installer is LZMA-compressed.
  Nothing is packed with a runtime packer.

## Network

- No listening port by default. The local MCP link (127.0.0.1) is off unless
  the user enables it in Preferences → General.
- Outbound: the update check against the GitHub release, and — only when the
  user has entered an API key — the AI provider they chose.

## Code signing

Release binaries are signed only when the build has signing credentials
configured. A build without them is unsigned, which on a managed network is
normally reason enough to block it. Check the release you are evaluating.

## For a security review

The source is public and the releases are built by GitHub Actions from a
commit in this repository, so any release can be traced back to the exact
source it was built from.
