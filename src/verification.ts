import {
  type TypedDataDomain,
  type Address,
  type Chain,
  toBytes,
  concat,
  toHex,
  fromBytes,
  slice,
  createPublicClient,
  http,
} from "viem";

export const EIP_712_ATPROTO_DOMAIN = {
  name: "Atproto Verify Ethereum Address",
  version: "1.0.0",
  // Fixed salt to minimize collisions (generated randomly)
  salt: "0xc17864bd52a2ad9ca178ee6d6122db20dad1e67d2e99eb8d7cfbcde8fc05d7c8",
} as const satisfies TypedDataDomain;

// Using ERC-7930 Interoperable Address format
export const EIP_712_ATPROTO_VERIFICATION_CLAIM = [
  {
    name: "did",
    type: "string",
  },
  {
    name: "address",
    type: "bytes",
  },
  {
    name: "blockHash",
    type: "bytes32",
  },
] as const;

// Helper to get the types object for wagmi/viem
export const VERIFICATION_TYPES = {
  VerificationClaim: EIP_712_ATPROTO_VERIFICATION_CLAIM,
} as const;

/**
 * Encodes an address into ERC-7930 Interoperable Address format (v1)
 * Format: Version(2) | ChainType(2) | ChainRefLen(1) | ChainRef(var) | AddrLen(1) | Addr(var)
 */
export function encodeInteroperableAddress(
  address: Address,
  chainId: number
): `0x${string}` {
  // Version 0x0001
  const version = toBytes(1, { size: 2 }); // Big-endian 0x0001

  // ChainType for EIP-155 (CAIP-2) is typically 0x0000 in examples (needs verification if standard changes)
  // Using 0x0000 as per ERC-7930 example for "eip155" namespace
  const chainType = toBytes(0, { size: 2 });

  // ChainReference (Chain ID) - Variable length, but typically compact for small IDs
  // Simple serialization for integer chain ID
  const chainRefBytes = toBytes(chainId);
  const chainRefLen = toBytes(chainRefBytes.length, { size: 1 });

  // Address bytes
  const addressBytes = toBytes(address);
  const addressLen = toBytes(addressBytes.length, { size: 1 });

  const encoded = concat([
    version,
    chainType,
    chainRefLen,
    chainRefBytes,
    addressLen,
    addressBytes,
  ]);

  return toHex(encoded);
}

/**
 * Decodes an ERC-7930 Interoperable Address
 */
export function decodeInteroperableAddress(encoded: string | Uint8Array): {
  chainId: number;
  address: Address;
} {
  const bytes = typeof encoded === "string" ? toBytes(encoded) : encoded;

  // Validate version (first 2 bytes) -> 0x0001
  // Skip ChainType (next 2 bytes)

  const chainRefLen = bytes[4];
  const chainRefStart = 5;
  const chainRefEnd = chainRefStart + chainRefLen;
  const chainRefBytes = slice(bytes, chainRefStart, chainRefEnd);
  const chainId = Number(fromBytes(chainRefBytes, "number")); // Simplistic decoding for now

  const addrLenIndex = chainRefEnd;
  const addrLen = bytes[addrLenIndex];
  const addrStart = addrLenIndex + 1;
  const addrEnd = addrStart + addrLen;
  const addrBytes = slice(bytes, addrStart, addrEnd);
  const address = toHex(addrBytes) as Address;

  return { chainId, address };
}

/**
 * Verifies a verification claim signature
 */
export async function verifyVerificationClaim(
  did: string,
  interoperableAddress: Uint8Array | string,
  blockHash: Uint8Array | string,
  signature: Uint8Array | string
): Promise<boolean> {
  const interoperableAddrBytes =
    typeof interoperableAddress === "string"
      ? toBytes(interoperableAddress)
      : interoperableAddress;
  const blockHashBytes =
    typeof blockHash === "string" ? toBytes(blockHash) : blockHash;
  const signatureBytes =
    typeof signature === "string" ? toBytes(signature) : signature;

  try {
    // Decode address and chainId from the interoperable address
    const { chainId, address } = decodeInteroperableAddress(
      interoperableAddrBytes
    );

    // Dynamically import chains to avoid large bundle size
    const chains = await import("viem/chains");

    // Find the chain definition
    const chain = (Object.values(chains) as unknown as Chain[]).find(
      (c) => c.id === chainId
    );

    if (!chain) {
      console.error(`Chain ID ${chainId} not supported or found`);
      return false;
    }

    const client = createPublicClient({
      chain,
      transport: http(),
    });

    const valid = await client.verifyTypedData({
      address,
      domain: EIP_712_ATPROTO_DOMAIN,
      types: VERIFICATION_TYPES,
      primaryType: "VerificationClaim",
      message: {
        did,
        address: toHex(interoperableAddrBytes), // typed data expects hex for bytes
        blockHash: toHex(blockHashBytes),
      },
      signature: toHex(signatureBytes),
    });
    return valid;
  } catch (err) {
    console.error("Verification failed:", err);
    return false;
  }
}
