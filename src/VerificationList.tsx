import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Agent } from "@atproto/api";
import { useAtproto } from "./AtprotoProvider";
import {
  decodeInteroperableAddress,
  verifyVerificationClaim,
} from "./verification";
import { toHex, toBytes } from "viem";

interface VerificationRecord {
  uri: string;
  cid: string;
  value: {
    address: Uint8Array;
    signature: Uint8Array;
    blockHash: Uint8Array;
    createdAt: string;
  };
}

function VerificationRow({
  record,
  onDelete,
  isDeleting,
}: {
  record: VerificationRecord;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const { session } = useAtproto();
  const val = record.value;

  // Decode address synchronously (fast)
  let decoded = { address: "Error decoding", chainId: -1 };
  try {
    // Handle potential $bytes format if returned by API
    // @ts-ignore
    const addrBytes = val.address.$bytes
      ? // @ts-ignore
        toBytes(val.address.$bytes)
      : val.address;
    decoded = decodeInteroperableAddress(addrBytes);
  } catch (e) {
    console.error("Error decoding address:", e);
  }

  // Verify signature asynchronously
  const { data: isValid, isLoading: isVerifying } = useQuery({
    queryKey: ["verify-claim", record.uri],
    queryFn: async () => {
      if (!session?.sub) return false;
      return await verifyVerificationClaim(
        session.sub,
        val.address,
        val.blockHash,
        val.signature
      );
    },
    enabled: !!session?.sub,
    staleTime: Infinity, // Validity shouldn't change for immutable record
  });

  return (
    <tr>
      <td>{decoded.address}</td>
      <td>{decoded.chainId}</td>
      <td>
        {val.blockHash
          ? toHex(
              // @ts-ignore
              val.blockHash.$bytes
                ? // @ts-ignore
                  toBytes(val.blockHash.$bytes)
                : val.blockHash
            ).slice(0, 10) + "..."
          : "N/A"}
      </td>
      <td>{new Date(val.createdAt).toLocaleString()}</td>
      <td>
        {isVerifying ? (
          <span>Verifying...</span>
        ) : isValid ? (
          <span style={{ color: "green" }}>Valid</span>
        ) : (
          <span style={{ color: "red" }}>Invalid</span>
        )}
      </td>
      <td>
        <button onClick={onDelete} disabled={isDeleting}>
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </td>
    </tr>
  );
}

export function VerificationList() {
  const { session } = useAtproto();
  const queryClient = useQueryClient();

  const { data: records, isLoading } = useQuery({
    queryKey: ["verifications", session?.sub],
    queryFn: async (): Promise<VerificationRecord[]> => {
      if (!session) return [];

      const agent = new Agent(session);

      const res = await agent.com.atproto.repo.listRecords({
        repo: session.sub,
        collection: "org.chainagnostic.verification",
      });

      return res.data.records as unknown as VerificationRecord[];
    },
    enabled: !!session,
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ rkey }: { uri: string; rkey: string }) => {
      if (!session) throw new Error("No session");

      const agent = new Agent(session);

      await agent.com.atproto.repo.deleteRecord({
        repo: session.sub,
        collection: "org.chainagnostic.verification",
        rkey,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["verifications", session?.sub],
      });
    },
  });

  const handleDelete = (uri: string, rkey: string) => {
    if (confirm("Are you sure you want to delete this verification?")) {
      deleteMutation.mutate({ uri, rkey });
    }
  };

  if (!session) return null;

  return (
    <div style={{ marginTop: "2rem" }}>
      <h3>Your Verifications</h3>
      {isLoading ? (
        <p>Loading...</p>
      ) : !records?.length ? (
        <p>No verifications found.</p>
      ) : (
        <table
          border={1}
          cellPadding={8}
          style={{ borderCollapse: "collapse", width: "100%" }}
        >
          <thead>
            <tr>
              <th>Address</th>
              <th>Chain ID</th>
              <th>Block Hash</th>
              <th>Created At</th>
              <th>Validity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => {
              const rkey = record.uri.split("/").pop() || "";
              return (
                <VerificationRow
                  key={record.uri}
                  record={record}
                  onDelete={() => handleDelete(record.uri, rkey)}
                  isDeleting={
                    deleteMutation.isPending &&
                    deleteMutation.variables?.uri === record.uri
                  }
                />
              );
            })}
          </tbody>
        </table>
      )}
      <button
        onClick={() =>
          queryClient.invalidateQueries({
            queryKey: ["verifications", session?.sub],
          })
        }
        style={{ marginTop: "1rem" }}
      >
        Refresh List
      </button>
    </div>
  );
}
