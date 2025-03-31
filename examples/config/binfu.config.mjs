import { defineBinfuConfig } from "binfu";

export default defineBinfuConfig({
  name: "port-claim",
  url: "{{repo}}/releases/download/v{{version}}/{{name}}-{{platform}}-{{arch}}.tar.gz",
  platformOverrides: {
    win32: {
      url: "{{repo}}/releases/download/v{{version}}/{{name}}-windows-{{arch}}.tar.gz",
    },
    darwin: {
      url: "{{repo}}/releases/download/v{{version}}/{{name}}-mac-{{arch}}.tar.gz",
    },
  },
});
