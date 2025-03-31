import { existsSync, readFileSync } from "node:fs";
import { arch, homedir } from "node:os";
import path from "node:path";

function isPackage(): boolean {
  return existsSync(path.join(process.cwd(), "package.json"));
}

let name, version, repository;
if (isPackage()) {
  const pkg = JSON.parse(
    readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
  );
  name = pkg.name;
  version = pkg.version;
  repository
    = typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url;
}

type Arch = "x64" | "arm64" | "x86";

/**
 * Get the operating system architecture
 * @returns "x64" | "arm64" | "x86"
 * @throws {Error} If the architecture is not supported
 */
export function getArch(): Arch {
  switch (arch()) {
    case "x64": {
      return "x64";
    }
    case "arm64": {
      return "arm64";
    }
    case "ia32": {
      return "x86";
    }
    case "x32": {
      return "x86";
    }
    case "x86": {
      return "x86";
    }
    default: {
      throw new Error(`Unsupported architecture: ${arch()}`);
    }
  }
}

export const PLATFORM = process.platform;
export const ARCH = getArch();
export const HOMEDIR = homedir();
export const IS_PKG = isPackage();
export const PKG_NAME = name;
export const PKG_VERSION = version;
export const PKG_REPO = repository;
