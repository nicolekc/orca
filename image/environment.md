# About this environment

This session runs in a Linux container. `/workspace` is the project folder,
volume-mounted from the host, which may have the same files open under a different path.

- Kept when the container is recreated: `/workspace` (its `node_modules` is a
  container-only volume) and `~`.
- Reset: everything outside `/workspace` and `~`, such as system packages.
- No display; browsers run headless.
- Ports reach the host only when the user forwards one (`orca forward <port>`, on the host),
  and only for servers listening on `0.0.0.0` rather than `localhost`.
