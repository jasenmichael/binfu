import { loadConfig } from "c12";
import { join } from "node:path";

import type { Config } from "./binary.ts";

import {
  ARCH,
  IS_PKG,
  PKG_NAME,
  PKG_REPO,
  PKG_VERSION,
  PLATFORM,
} from "./constants";

export async function loadBinfuConfig(configPath?: string) {
  const { config } = await loadConfig({
    configFile: typeof configPath === "string" ? configPath : undefined,
    name: "binfu",
    dotenv: true,
    packageJson: true,
  });

  return config as Config;
}

/**
 * Define a binfu config
 * @param config - The config to define
 * @returns The config
 */
export function defineBinfuConfig(config: Config) {
  return config as Config;
}

export function defaultInstallDirectory() {
  return IS_PKG ? join(process.cwd(), "node_modules", ".bin") : process.cwd();
}

export function defaultUrl(name: string | undefined): string {
  return `${PKG_REPO}/releases/download/v${PKG_VERSION}/${
    name || PKG_NAME
  }-${PLATFORM}-${ARCH}.tar.gz`;
}
