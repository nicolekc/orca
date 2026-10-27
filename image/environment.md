# About this environment

This session runs in a Linux container. `/workspace` is the project folder, on persistent
storage mounted from elsewhere. In code, docs and commits, refer to a file by its path in
its git repo (`src/app.ts`), not by an absolute path.

- The container is occasionally recreated from its image (such as for an image update),
  like moving to a new dev environment with the same `/workspace` and `~`. Treat it as a
  normal system. If something set up earlier is missing, that's likely why; suggest to the
  user which tools or dependencies may need reinstalling or reconfiguring.
- No display; browsers run headless.
- Ports reach the host only when the user forwards one (`orca forward <port>`, on the host),
  and only for servers listening on `0.0.0.0` rather than `localhost`.
