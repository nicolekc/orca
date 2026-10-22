// Builds orca into one self-contained file for a platform:
//   bun cli/build.ts <darwin-arm64|darwin-x64|linux-arm64|linux-x64> <outfile> <version>
// Used by the Makefile. A script rather than `bun build` flags because the dashboard needs the
// Tailwind plugin, and Ink imports React DevTools (development only), which has to be
// replaced with an empty module.

import tailwind from "bun-plugin-tailwind";

const [platform, outfile, version] = Bun.argv.slice(2);
if (!platform || !outfile || !version) throw new Error("usage: bun cli/build.ts <platform> <outfile> <version>");

const result = await Bun.build({
  entrypoints: ["cli/orca.ts"],
  compile: { target: `bun-${platform}` as Bun.Build.CompileTarget, outfile },
  // React's production build: faster, and without development warnings meant for us, not users
  define: { ORCA_VERSION: JSON.stringify(version), "process.env.NODE_ENV": JSON.stringify("production") },
  plugins: [
    tailwind, // the dashboard's styles
    {
      name: "no-devtools",
      setup(build) {
        build.onResolve({ filter: /^react-devtools-core$/ }, () => ({ path: "devtools", namespace: "empty" }));
        build.onLoad({ filter: /.*/, namespace: "empty" }, () => ({ contents: "export default {};", loader: "js" }));
      },
    },
  ],
});
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
