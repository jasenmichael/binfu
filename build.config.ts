import { readdir, rm } from "node:fs/promises";
import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  hooks: {
    "build:done": async function () {
      const files = await readdir("dist");
      for (const file of files) {
        if (file.startsWith("cli") && file !== "cli.mjs") {
          await rm(`dist/${file}`);
        }
      }
    },
  },
});
