import { BrowserOAuthClient } from "@atproto/oauth-client-browser";

export const createAtprotoClient = async () => {
  const baseUrl = import.meta.env.VITE_APP_BASE_URL;

  if (!baseUrl) {
    throw new Error(
      "VITE_APP_BASE_URL is not set. Please add it to your .env.local file."
    );
  }

  const clientId = `${baseUrl}/client-metadata.json`;
  console.log("Loading OAuth client with clientId:", clientId);

  return await BrowserOAuthClient.load({
    clientId,
    handleResolver: "https://bsky.social",
  });
};
