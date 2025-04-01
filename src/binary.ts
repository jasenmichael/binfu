import type { ReadableStream } from "node:stream/web";

import { consola } from "consola";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import * as tar from "tar";

import {
  ARCH,
  HOMEDIR,
  PKG_NAME,
  PKG_REPO,
  PKG_VERSION,
  PLATFORM,
} from "./constants";
import { defaultInstallDirectory, defaultUrl } from "./utils";

export type Platform = "linux" | "macos" | "win32" | "darwin" | string;

export type ConfigBase = {
  /**
   * The url of the binary
   */
  url?: string;
  /**
   * The name of the binary downloaded
   *
   */
  name?: string;
  /**
   * Installation path for the binary. Defaults to:
   * - ./node_modules/.bin if package.json exists
   * - ./ (current directory) otherwise
   */
  installDirectory?: string;
  /**
   * If available, will be used instead of the binary path
   */
  developerCommand?: string;
  /**
   * The extension to append to the binary path
   */
  extension?: string;
  /**
   * The filename to replace the default filename with.
   * - Can be specified per platform (windows/linux/darwin)
   */
  rename?: string;
  /**
   * Platform-specific overrides
   */
  platformOverrides?: {
    [key in Platform]?: Partial<Omit<ConfigBase, "platformOverrides">>;
  };
  /**
   * Default is true, automatically adds the .exe extension for windows platforms
   * Set to false to disable the .exe extension for windows platforms
   */
  winExe?: boolean;
} | undefined;

export type ConfigPlatformOverrides = {
  [key in Platform]?: ConfigBase;
};

export type Config = ConfigBase;

export default class Binary {
  url: string;
  name: string;
  installDirectory: string;
  developerCommand?: string;
  binaryPath: string;
  // command: string;
  platform: Platform;
  arch: string;
  homeDir: string;
  pkgName: string;
  pkgVersion: string;
  pkgRepo: string;
  rename?: string;

  constructor(config: Config = {}) {
    if (config.winExe !== false && PLATFORM.includes("win")) {
      config.extension = ".exe";
    }

    if (config?.platformOverrides?.[PLATFORM]) {
      config = {
        ...config,
        ...config.platformOverrides[PLATFORM],
      };
    }

    this.url = config?.url
      ? config.url
          .replace("{{repo}}", PKG_REPO)
          .replace("{{name}}", PKG_NAME)
          .replace("{{platform}}", PLATFORM)
          .replace("{{arch}}", ARCH)
          .replace("{{version}}", PKG_VERSION)
      : defaultUrl(config?.name);

    this.name = config?.name ? config.name + (config?.extension || "") : PKG_NAME;

    if (!this.name) {
      throw new Error("name is required");
    }
    else if (!this.url) {
      throw new Error("url is required");
    }

    if (config?.rename)
      this.rename = config.rename;

    this.platform = PLATFORM;
    this.arch = ARCH;
    this.homeDir = HOMEDIR;

    this.pkgName = PKG_NAME;
    this.pkgVersion = PKG_VERSION;
    this.pkgRepo = PKG_REPO;

    // installDirectory
    this.installDirectory
      = config?.installDirectory?.replace("~/", HOMEDIR)
        || defaultInstallDirectory();

    if (!existsSync(this.installDirectory)) {
      mkdirSync(this.installDirectory, { recursive: true });
    }

    // binaryPath
    this.binaryPath = join(this.installDirectory, this.name);

    // developerCommand
    this.developerCommand = config?.developerCommand;
    if (!this.developerCommand)
      delete this.developerCommand;

    consola.debug("[DEBUG] config:\n", this.config());
  }

  exists(): boolean {
    return !!this.developerCommand || existsSync(this.binaryPath);
  }

  config(): { properties: Record<string, unknown>; methods: string[] } {
    return {
      properties: Object.fromEntries(
        Object.getOwnPropertyNames(this).map(name => [
          name,
          this[name as keyof this],
        ]),
      ),
      methods: Object.getOwnPropertyNames(Object.getPrototypeOf(this)).filter(
        name => name !== "constructor",
      ),
    };
  }

  /**
   * Installs the binary from the configured URL
   * @param fetchOptions - Options to pass to fetch
   * @returns Promise that resolves when installation is complete
   * @throws Error if download or extraction fails
   */
  async install(fetchOptions?: RequestInit): Promise<void> {
    if (this.exists()) {
      console.warn(`${this.name} is already installed, skipping installation.`);
      return;
    }

    if (!existsSync(this.installDirectory)) {
      mkdirSync(this.installDirectory, { recursive: true });
    }

    consola.info(`Downloading release from ${this.url}`);

    await fetch(this.url, fetchOptions)
      .then((res) => {
        if (!res.ok) {
          throw new Error(
            `Failed to download: ${res.status} ${res.statusText}`,
          );
        }
        if (!res.body) {
          throw new Error("Response body is null");
        }
        return new Promise((resolve, reject) => {
          const sink = Readable.fromWeb(res.body as ReadableStream<Uint8Array>).pipe(
            tar.x({ strip: 1, C: this.installDirectory }),
          );
          sink.on("finish", () => resolve(void 0));
          sink.on("error", err => reject(err));
        });
      })
      .then(() => {
        if (!existsSync(this.binaryPath)) {
          consola.error(
            `Please check the binary file matches the name ${this.name}`,
          );
          throw new Error(`${this.name} failed to install`);
        }

        // after install, rename if replaceFileName is provided
        const newBinaryPath = this.rename && join(
          this.installDirectory,
          this.rename,
        );

        if (newBinaryPath && existsSync(this.binaryPath)) {
          renameSync(this.binaryPath, newBinaryPath);
          this.binaryPath = newBinaryPath;
        }
      })
      .catch((error) => {
        consola.error(`Error fetching release: ${error.message}`);
        throw error;
      });
  }

  /**
   * Uninstalls the binary
   */
  uninstall() {
    if (this.developerCommand || !this.exists())
      return;
    unlinkSync(this.binaryPath);
  }

  /**
   * Updates the binary
   * @returns Promise that resolves when update is complete
   */
  async update() {
    // if not exists, install it
    if (!this.exists()) {
      await this.install();
      return;
    }

    // if exists, back it up
    renameSync(this.binaryPath, `${this.binaryPath}.bak`);

    try {
      await this.install();
      unlinkSync(`${this.binaryPath}.bak`);
    }
    catch (error: any) {
      if (existsSync(`${this.binaryPath}.bak`)) {
        renameSync(`${this.binaryPath}.bak`, this.binaryPath);
      }

      consola.error(`Error updating ${this.name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Runs the binary
   */
  async run({ args }: { args: string[] }): Promise<void> {
    if (!this.exists() && !this.developerCommand) {
      // const doIntstall = await consola
      //   .prompt(`${this.name} is not installed, would you like to install it? (y/N) `);
      // if (doIntstall) {
      //   await this.install();
      // }
      // else {
      //   throw new Error(`${this.name} is not installed`);
      // }
      throw new Error(`${this.name} is not installed`);
    }

    try {
      const options = {
        cwd: process.cwd(),
        stdio: "inherit" as const,
      };

      const command = this.developerCommand || this.binaryPath;
      const result = spawnSync(command, args, options);

      if (result.error) {
        throw result.error;
      }
    }
    catch (error: any) {
      consola.error(error.message);
      throw error;
    }
  }
}
