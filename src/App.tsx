import { useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSignTypedData,
  usePublicClient,
} from "wagmi";
import { Agent } from "@atproto/api";
import { toBytes } from "viem";
import { useAtproto } from "./AtprotoProvider";
import {
  EIP_712_ATPROTO_DOMAIN,
  VERIFICATION_TYPES,
  encodeInteroperableAddress,
} from "./verification";
import { VerificationList } from "./VerificationList";

function App() {
  const account = useAccount();
  const { connectors, connect, status, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { signTypedDataAsync } = useSignTypedData();
  const publicClient = usePublicClient();

  const { session, isLoading: atprotoLoading, signIn, signOut } = useAtproto();
  const [handle, setHandle] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationUri, setVerificationUri] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle.trim()) return;

    setIsSigningIn(true);
    try {
      await signIn(handle.trim());
    } catch (error) {
      console.error("Sign in error:", error);
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setSignature(null);
      setVerificationUri(null);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const handleVerify = async () => {
    if (!account.address || !session || !publicClient) return;

    setIsVerifying(true);
    try {
      // Get latest block hash
      const block = await publicClient.getBlock();

      // Fallback block hash if pending
      const blockHashHex =
        block.hash ||
        "0x0000000000000000000000000000000000000000000000000000000000000000";

      // Encode address + chainId into ERC-7930 format
      const interoperableAddr = encodeInteroperableAddress(
        account.address,
        account.chainId || 1
      );

      const sig = await signTypedDataAsync({
        domain: EIP_712_ATPROTO_DOMAIN,
        types: VERIFICATION_TYPES,
        primaryType: "VerificationClaim",
        message: {
          did: session.sub,
          address: interoperableAddr,
          blockHash: blockHashHex,
        },
      });

      setSignature(sig);
      console.log("Signature:", sig);

      // Create Agent with the session
      const agent = new Agent(session);

      // Write the verification record to the user's repository
      const record = {
        $type: "org.chainagnostic.verification",
        address: toBytes(interoperableAddr),
        signature: toBytes(sig),
        blockHash: toBytes(blockHashHex),
        createdAt: new Date().toISOString(),
      };

      const res = await agent.com.atproto.repo.createRecord({
        repo: session.sub, // User's DID
        collection: "org.chainagnostic.verification",
        rkey: interoperableAddr.replace(/^0x/, ""), // Use address as deterministic rkey
        record: record,
        validate: false, // Skip client-side validation since we don't have the full lexicon loaded in agent
      });

      console.log("Verification record created:", res.data);
      setVerificationUri(res.data.uri);
    } catch (error) {
      console.error("Verification error:", error);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <>
      <div>
        <h2>Atproto Authentication</h2>

        {atprotoLoading ? (
          <div>Loading...</div>
        ) : session ? (
          <div>
            <div>
              <strong>Signed in as:</strong> {session.sub}
            </div>
            <button type="button" onClick={handleSignOut}>
              Sign Out
            </button>
          </div>
        ) : (
          <form onSubmit={handleSignIn}>
            <div>
              <label>
                Handle (e.g., example.bsky.social):
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="example.bsky.social"
                  disabled={isSigningIn}
                />
              </label>
            </div>
            <button type="submit" disabled={isSigningIn || !handle.trim()}>
              {isSigningIn ? "Signing in..." : "Sign In with Atproto"}
            </button>
          </form>
        )}
      </div>

      {session && <VerificationList />}

      <div>
        <h2>Ethereum Account</h2>

        <div>
          status: {account.status}
          <br />
          addresses: {JSON.stringify(account.addresses)}
          <br />
          chainId: {account.chainId}
        </div>

        {account.status === "connected" && (
          <>
            <button type="button" onClick={() => disconnect()}>
              Disconnect
            </button>

            {session && (
              <div style={{ marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={isVerifying}
                >
                  {isVerifying ? "Verifying..." : "Verify Address"}
                </button>
                {signature && (
                  <div
                    style={{
                      marginTop: "0.5rem",
                      wordBreak: "break-all",
                      fontSize: "0.8rem",
                    }}
                  >
                    <strong>Signature:</strong> {signature}
                  </div>
                )}
                {verificationUri && (
                  <div style={{ marginTop: "0.5rem", color: "green" }}>
                    <strong>Verified!</strong> Record URI: {verificationUri}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {account.status !== "connected" && (
        <div>
          <h2>Connect Wallet</h2>
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => connect({ connector })}
              type="button"
            >
              {connector.name}
            </button>
          ))}
          <div>{status}</div>
          <div>{error?.message}</div>
        </div>
      )}
    </>
  );
}

export default App;
