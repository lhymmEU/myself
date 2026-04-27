import type { FeatureModule } from "@/lib/core/types";
import { vaultTools } from "./tools";

export const vaultModule: FeatureModule = {
  name: "vault",
  description:
    "Secure secret storage with post-quantum encryption (XChaCha20-Poly1305 + scrypt + SHA3)",
  tools: vaultTools,
  eventHandlers: {},
  availableIn: ["local", "cloud"],
};
