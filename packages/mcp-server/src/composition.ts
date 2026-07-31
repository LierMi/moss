import * as erc from "@themoss/erc";
import * as kuru from "@themoss/protocol-kuru";
import * as pancakeswap from "@themoss/protocol-pancakeswap";
import * as siliconArbitration from "@themoss/protocol-silicon-arbitration";
import * as system from "@themoss/system";

/** Protocol modules selected by the default MCP CLI application. */
export const defaultProtocolModules = [
  system,
  erc,
  kuru,
  pancakeswap,
  siliconArbitration,
] as const;
