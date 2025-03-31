/* eslint-disable no-console */
// import { Binary, defineBinfuConfig } from "binfu";

import { execSync } from "node:child_process";

console.log("Installing dependencies and building binfu");
execSync("cd ../../ && pnpm build");
console.log("Installing binfu in project");
execSync("pnpm i");
const { Binary, defineBinfuConfig } = await import("../../dist/index.mjs");

const config = defineBinfuConfig({
  name: "port-claim",
  // url: "https://github.com/jasenmichael/port-claim/releases/download/v3.0.0/port-claim-linux-x64.tar.gz",
  // url: "{{repo}}/releases/download/v{{version}}/{{name}}-{{platform}}-{{arch}}.tar.gz",
  winExe: true,
  platformOverrides: {
    win32: {
      url: "{{repo}}/releases/download/v{{version}}/{{name}}-windows-{{arch}}.tar.gz",
    },
    darwin: {
      url: "{{repo}}/releases/download/v{{version}}/{{name}}-mac-{{arch}}.tar.gz",
    },
  },

});

const binary = new Binary(config);

// await binary.install(config);

console.log(binary.config());

// await binary.run({ args: ["--help"] });
