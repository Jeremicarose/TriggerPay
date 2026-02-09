/**
 * Attestation Generator
 *
 * Creates cryptographically signed attestations that prove
 * the agent observed a specific API response at a specific time.
 *
 * In production this runs inside a TEE (Shade Agent) where the
 * signing key is hardware-protected. For MVP we use a software
 * Ed25519 key pair.
 */

import { createHash } from "node:crypto";
import nacl from "tweetnacl";
import type { AttestationData } from "./near-client.js";

// Agent's signing key pair — loaded once at startup
let signingKeyPair: nacl.SignKeyPair | null = null;

/**
 * Initialise (or generate) the agent's Ed25519 key pair.
 * In a real TEE the private key would come from the enclave.
 */
export function initSigningKey(privateKeyHex?: string): void {
  if (privateKeyHex) {
    const seed = Buffer.from(privateKeyHex, "hex");
    signingKeyPair = nacl.sign.keyPair.fromSeed(seed);
  } else {
    // Generate ephemeral key for dev/demo
    signingKeyPair = nacl.sign.keyPair();
  }
}

/**
 * Return the agent's public key as a hex string.
 * This is what gets registered on-chain via set_agent_key().
 */
export function getPublicKeyHex(): string {
  if (!signingKeyPair) throw new Error("Signing key not initialised");
  return Buffer.from(signingKeyPair.publicKey).toString("hex");
}

/**
 * Build and sign an attestation for a given trigger + API response.
 */
export function createAttestation(
  triggerId: string,
  flightStatus: string,
  apiResponseBody: string,
  conditionMet: boolean
): AttestationData {
  if (!signingKeyPair) throw new Error("Signing key not initialised");

  const timestamp = Date.now() * 1_000_000; // nanoseconds to match NEAR

  // SHA-256 of the raw API response body
  const apiResponseHash = createHash("sha256")
    .update(apiResponseBody)
    .digest("hex");

  // Canonical message that gets signed:
  //   trigger_id | timestamp | api_response_hash | flight_status | condition_met
  const message = [
    triggerId,
    timestamp.toString(),
    apiResponseHash,
    flightStatus,
    conditionMet.toString(),
  ].join("|");

  const messageBytes = Buffer.from(message, "utf-8");
  const signatureBytes = nacl.sign.detached(messageBytes, signingKeyPair.secretKey);
  const signature = Buffer.from(signatureBytes).toString("hex");

  return {
    trigger_id: triggerId,
    timestamp,
    api_response_hash: apiResponseHash,
    flight_status: flightStatus,
    condition_met: conditionMet,
    signature,
  };
}
