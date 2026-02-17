import { NextResponse } from "next/server";
import { getEvmAdapter, DERIVATION_PATHS } from "@/lib/agent/ethereum";

export async function GET() {
  const chain = "Ethereum";
  const contractId = process.env.NEXT_PUBLIC_contractId;

  if (!contractId) {
    return NextResponse.json(
      { error: "Contract ID not configured" },
      { status: 500 }
    );
  }

  try {
    const evm = getEvmAdapter(chain);
    const path = DERIVATION_PATHS[chain];
    const { address } = await evm.deriveAddressAndPublicKey(contractId, path);
    const { balance } = await evm.getBalance(address);

    return NextResponse.json({
      address,
      balance: Number(balance),
      chain,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get derived ETH account" },
      { status: 500 }
    );
  }
}
