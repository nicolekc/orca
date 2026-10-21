# The node_modules volume

**Status:** open.

**Today:** `orca-start.sh` mounts a Docker named volume, `orca-<project>_node_modules`, over `/workspace/node_modules`. Native modules are compiled per operating system, so the Mac's macOS builds can't run in the Linux container and the reverse. The volume hides the Mac's copy inside the container, and the container's copy never reaches the Mac. It survives `docker rm`.

**Questions:**
- Does it need a name? An anonymous volume would be removed with the container (`docker rm -v`) or left orphaned; a named one survives recreation, which is why it was named. A volume tied to the project rather than the container name may fit the project-records design better.
- Should something built on the Mac show up in the container, or the reverse? Today neither sees the other's `node_modules`. Options range from keeping them separate (and installing on each side) to building only in the container.
- Only `/workspace/node_modules` is covered. Monorepos with nested `node_modules` folders, and other per-OS build output (Python `.venv`, compiled binaries), get no such separation.
