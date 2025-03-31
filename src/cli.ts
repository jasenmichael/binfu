#!/usr/bin/env node

import { Command } from "commander";
import { consola } from "consola";

import { description, name, version } from "../package.json";
import { Binary, loadBinfuConfig } from "./index.ts";

const program = new Command()
  .name(name)
  .description(description)
  .version(version)
  // .addHelpText("after", "usage")
  .allowExcessArguments(true)
  .allowUnknownOption(true)
  .arguments("[install|uninstall|update|run]");

const options = [
  {
    flag: "-c, --config [path]",
    description:
      "Config file path Default: ./binfu.config{.json,.js,.mjs,.cjs,.ts}",
  },
  {
    flag: "-n, --name [name]",
    description: "Name of the binary",
  },
  {
    flag: "-u, --url [url]",
    description: "Url of the binary",
  },
  {
    flag: "-i, --installDirectory [path]",
    description: "Install directory",
  },
  // {
  //   flag: "-d, --developerCommand [command]",
  //   description: "Developer command"
  // },
  // {
  //   flag: "-r, --rename [rename]",
  //   description: "Rename the binary"
  // }
];

for (const option of options) {
  program.option(option.flag, option.description);
}

program.action(async (command, args, { rawArgs }) => {
  const fileConfig = await loadBinfuConfig(args.config || undefined);
  delete args.config;
  const config = { ...fileConfig, ...args };
  const binary = new Binary(config);

  switch (command) {
    case "install": {
      await binary.install();
      break;
    }
    case "uninstall": {
      binary.uninstall();
      break;
    }
    case "update": {
      await binary.update();
      break;
    }
    case "run": {
      const commandArgs = rawArgs.includes("--")
        ? rawArgs.slice(rawArgs.indexOf("--") + 1)
        : [];
      await binary.run({ args: commandArgs });
      break;
    }
    default: {
      if (binary.exists()) {
        const commandArgs = rawArgs.includes("--")
          ? rawArgs.slice(rawArgs.indexOf("--") + 1)
          : rawArgs.slice(2);
        await binary.run({ args: commandArgs });
      }
      else {
        consola.error("Invalid command");
      }
      break;
    }
  }
});

program.parse();
