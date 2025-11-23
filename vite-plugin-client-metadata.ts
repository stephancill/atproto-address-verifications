import { writeFileSync } from "fs";
import { join } from "path";
import { loadEnv } from "vite";
import type { Plugin } from "vite";

interface ClientMetadata {
  client_id: string;
  client_name: string;
  client_uri: string;
  logo_uri?: string;
  tos_uri?: string;
  policy_uri?: string;
  redirect_uris: string[];
  scope: string;
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
  application_type: string;
  dpop_bound_access_tokens: boolean;
}

function generateClientMetadata(mode: string = "development") {
  // Load environment variables from .env, .env.local, etc.
  const env = loadEnv(mode, process.cwd(), "");

  const baseUrl = env.VITE_APP_BASE_URL || "http://127.0.0.1:5173";
  const clientName = env.VITE_APP_NAME || "Atproto Address Verifications";
  const logoUri = env.VITE_APP_LOGO_URI;
  const tosUri = env.VITE_APP_TOS_URI;
  const policyUri = env.VITE_APP_POLICY_URI;

  const metadata: ClientMetadata = {
    client_id: `${baseUrl}/client-metadata.json`,
    client_name: clientName,
    client_uri: baseUrl,
    ...(logoUri && { logo_uri: logoUri }),
    ...(tosUri && { tos_uri: tosUri }),
    ...(policyUri && { policy_uri: policyUri }),
    redirect_uris: [`${baseUrl}/callback`],
    scope: "atproto transition:generic",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
    application_type: "web",
    dpop_bound_access_tokens: true,
  };

  const publicDir = join(process.cwd(), "public");
  const outputPath = join(publicDir, "client-metadata.json");

  // Ensure public directory exists
  try {
    writeFileSync(outputPath, JSON.stringify(metadata, null, 2), "utf-8");
    console.log(`✓ Generated client-metadata.json at ${outputPath}`);
  } catch (error) {
    console.error("Failed to generate client-metadata.json:", error);
  }
}

export function clientMetadataPlugin(): Plugin {
  return {
    name: "client-metadata",
    configResolved(config) {
      // Generate metadata after config is resolved (env vars are loaded)
      generateClientMetadata(config.mode);
    },
    configureServer(server) {
      // Regenerate on server start with the correct mode
      generateClientMetadata(server.config.mode);

      // Watch for env file changes
      server.watcher.on("change", (file) => {
        if (file.includes(".env")) {
          generateClientMetadata(server.config.mode);
        }
      });
    },
  };
}
