# About this environment

This session runs in a Linux container. `/workspace` is the project folder,
volume-mounted from the host, which may have the same files open under a different path.

- The user occasionally recreates the container, such as for an image update. `/workspace`
  (whose `node_modules` is a container-only volume) and `~` carry over; the rest, such as
  system packages, comes from the image.
- No display; browsers run headless.
- Ports reach the host only when the user forwards one (`orca forward <port>`, on the host),
  and only for servers listening on `0.0.0.0` rather than `localhost`.
