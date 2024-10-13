import { BN, Program } from "@coral-xyz/anchor";
import { ActionGetResponse, ActionPostRequest, ACTIONS_CORS_HEADERS, createPostResponse } from "@solana/actions"
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { Voting } from "anchor/target/types/voting";

const IDL = require("@/../anchor/target/idl/voting.json");

export const OPTIONS = GET;

export async function GET(request: Request) {
  const actionMetadata: ActionGetResponse = {
    icon: "https://pbs.twimg.com/media/GR5oX8nbkAAhSlc.png",
    title: "Vote for your next school mascot",
    description: "Vote between Poire à lavement and Sandwich au caca.",
    label: "",
    links: {
      actions: [
        {
          label: "Vote for Poire à Lavement",
          href: "/api/vote?candidate=Poire",
          type: "post"
        },
        {
          label: "Vote for Sandwich au caca",
          href: "/api/vote?candidate=Sandwich",
          type: "post"
        }]
    }
  };

  return Response.json(actionMetadata, { headers: ACTIONS_CORS_HEADERS });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  let candidate = url.searchParams.get("candidate");

  if (candidate !== "Poire" && candidate !== "Sandwich") {
    return new Response("Invalid candidate", { status: 400, headers: ACTIONS_CORS_HEADERS});
  }

  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  
  const program: Program<Voting> = new Program(IDL, {connection});

  const body: ActionPostRequest = await request.json();
  let voter;

  try {
    voter = new PublicKey(body.account);
  } catch (e: any) {
    return new Response("Invalid account", { status: 400, headers: ACTIONS_CORS_HEADERS});
  }

  const instruction = await program.methods.vote(candidate, new BN(1))
    .accounts({
      signer: voter,
    })
    .instruction();

  const blockhash = await connection.getLatestBlockhash();

  const transaction = new Transaction({
    feePayer: voter,
    blockhash: blockhash.blockhash,
    lastValidBlockHeight: blockhash.lastValidBlockHeight
  }).add(instruction);

  const response = await createPostResponse({
    fields: {
      transaction: transaction,
      type: "transaction"
    }
  });

  console.log("response: ", response)

  return Response.json(response, { headers: ACTIONS_CORS_HEADERS });
}
