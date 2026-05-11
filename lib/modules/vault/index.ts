import type { FeatureModule } from "@/lib/core/types";

export const vaultModule: FeatureModule = {
  name: "vault",
  description:
    "Secure secret storage with post-quantum encryption (XChaCha20-Poly1305 + scrypt + SHA3)",
  eventHandlers: {},
  availableIn: ["local", "cloud"],
};
