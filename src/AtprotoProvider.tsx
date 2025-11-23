import {
  BrowserOAuthClient,
  type OAuthSession,
} from "@atproto/oauth-client-browser";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React, { createContext, useContext, useEffect, useRef } from "react";
import { createAtprotoClient } from "./atproto";

interface AtprotoContextType {
  client: BrowserOAuthClient | null;
  session: OAuthSession | null;
  isLoading: boolean;
  signIn: (handle: string) => Promise<void>;
  signOut: () => Promise<void>;
  restoreSession: (sub: string) => Promise<OAuthSession>;
}

const AtprotoContext = createContext<AtprotoContextType | null>(null);

export const useAtproto = () => {
  const context = useContext(AtprotoContext);
  if (!context) {
    throw new Error("useAtproto must be used within AtprotoProvider");
  }
  return context;
};

interface AtprotoProviderProps {
  children: React.ReactNode;
}

// Query keys
const QUERY_KEYS = {
  client: ["atproto", "client"] as const,
  session: ["atproto", "session"] as const,
};

export const AtprotoProvider: React.FC<AtprotoProviderProps> = ({
  children,
}) => {
  const queryClient = useQueryClient();
  const eventListenerRef = useRef<((event: CustomEvent) => void) | null>(null);

  // Initialize the OAuth client (runs once on mount)
  const { data: client } = useQuery({
    queryKey: QUERY_KEYS.client,
    queryFn: async () => {
      const oauthClient = await createAtprotoClient();

      if (!oauthClient) {
        // Redirect happened, component will unmount
        return null;
      }

      return oauthClient;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Initialize session (depends on client)
  const { data: session, isLoading } = useQuery({
    queryKey: QUERY_KEYS.session,
    queryFn: async () => {
      if (!client) {
        return null;
      }

      // Initialize the client - this will restore any existing session
      // or handle OAuth callback if we're returning from authorization
      const result = await client.init();

      if (result) {
        const { session: restoredSession, state } = result;

        if (state != null) {
          console.log(
            `${restoredSession.sub} was successfully authenticated (state: ${state})`
          );
          // Log full session to debug scopes (cast to any to bypass TS check if needed)
          console.log("Full Session Data:", restoredSession);
        } else {
          console.log(
            `${restoredSession.sub} was restored (last active session)`
          );
        }

        return restoredSession;
      }

      return null;
    },
    enabled: !!client,
    staleTime: 5 * 60 * 1000, // Consider session fresh for 5 minutes
  });

  // Set up event listener for session deletion
  useEffect(() => {
    if (!client) return;

    const handleSessionDeleted = (
      event: CustomEvent<{
        sub: string;
        cause: Error;
      }>
    ) => {
      const { sub, cause } = event.detail;
      console.error(
        `Session for ${sub} is no longer available (cause: ${cause})`
      );

      // Invalidate the session query to trigger refetch/removal
      queryClient.setQueryData(
        QUERY_KEYS.session,
        (currentSession: OAuthSession | null) => {
          if (currentSession?.sub === sub) {
            return null;
          }
          return currentSession;
        }
      );
    };

    client.addEventListener("deleted", handleSessionDeleted as EventListener);
    eventListenerRef.current = handleSessionDeleted as (
      event: CustomEvent
    ) => void;

    return () => {
      if (eventListenerRef.current) {
        client.removeEventListener(
          "deleted",
          eventListenerRef.current as EventListener
        );
      }
    };
  }, [client, queryClient]);

  // Sign in mutation
  const signInMutation = useMutation({
    mutationFn: async (handle: string) => {
      // Get the current query state
      const queryState = queryClient.getQueryState(QUERY_KEYS.client);

      // Wait for client to be ready if it's still loading
      if (queryState?.status === "pending") {
        await queryClient.fetchQuery({
          queryKey: QUERY_KEYS.client,
          staleTime: Infinity,
        });
      }

      // Get the current client from cache
      const currentClient = queryClient.getQueryData<BrowserOAuthClient | null>(
        QUERY_KEYS.client
      );

      if (!currentClient) {
        const currentError = queryState?.error;
        if (currentError) {
          throw new Error(
            `OAuth client initialization failed: ${currentError instanceof Error ? currentError.message : String(currentError)}`
          );
        }
        throw new Error(
          "OAuth client not initialized. Please wait for initialization to complete."
        );
      }

      await currentClient.signIn(handle, {
        state: "atproto-signin",
        scope: "atproto transition:generic",
      });
      // Note: This will never resolve because the user gets redirected
    },
  });

  // Sign out mutation
  const signOutMutation = useMutation({
    mutationFn: async () => {
      if (!client || !session) {
        return;
      }

      // The client doesn't have a direct signOut method in the docs,
      // but we can delete the session from the store
      // For now, we'll just clear our local state
      // The session will be removed from the store when it expires
      queryClient.setQueryData(QUERY_KEYS.session, null);
    },
  });

  // Restore session mutation
  const restoreSessionMutation = useMutation({
    mutationFn: async (sub: string) => {
      if (!client) {
        throw new Error("OAuth client not initialized");
      }

      const restoredSession = await client.restore(sub);
      queryClient.setQueryData(QUERY_KEYS.session, restoredSession);
      return restoredSession;
    },
  });

  return (
    <AtprotoContext.Provider
      value={{
        client: client ?? null,
        session: session ?? null,
        isLoading,
        signIn: signInMutation.mutateAsync,
        signOut: signOutMutation.mutateAsync,
        restoreSession: restoreSessionMutation.mutateAsync,
      }}
    >
      {children}
    </AtprotoContext.Provider>
  );
};
