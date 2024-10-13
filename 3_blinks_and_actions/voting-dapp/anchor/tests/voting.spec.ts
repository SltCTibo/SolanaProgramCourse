import * as anchor from '@coral-xyz/anchor'
import {Program} from '@coral-xyz/anchor'
import {PublicKey} from '@solana/web3.js'
import {Voting} from '../target/types/voting'
import { beforeAll, describe, expect, it } from '@jest/globals'
import { startAnchor } from 'solana-bankrun'
import { BankrunProvider } from 'anchor-bankrun'

const IDL = require('../target/idl/voting.json');

const votingAddress = new PublicKey("7CxmsWgVb2qKF42NADvv6dEut7xMZppH8dwriPkoShxY");

describe('Voting', () => {

  let provider = anchor.AnchorProvider.env();
  anchor.setProvider(anchor.AnchorProvider.env())
  let votingProgram: Program<Voting> = anchor.workspace.Voting as Program<Voting>;

  beforeAll(async () => {

    // const context = await startAnchor("", [{ name: "voting", programId: votingAddress}], [])
    // const provider = new BankrunProvider(context);

    // votingProgram = new Program<Voting>(
    //   IDL,
    //   provider,
    // )
  })

  it('Initialize Poll', async () => {

    await votingProgram.methods.initializePoll(
      new anchor.BN(1),
      "What is the best one ?",
      new anchor.BN(1728832281),
      new anchor.BN(1760361081)
    ).rpc();

    const [pollAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8)],
      votingAddress,
    )

    const poll = await votingProgram.account.poll.fetch(pollAddress);

    console.log(poll);

    expect(poll.pollId.toNumber()).toEqual(1);
    expect(poll.description).toEqual("What is the best one ?");
    expect(poll.pollStart.toNumber()).toBeLessThan(poll.pollEnd.toNumber())

  })

  it('Initialize Candidate', async () => {
    await votingProgram.methods.initializeCandidate(
      "Sandwich",
      new anchor.BN(1),
    ).rpc();

    await votingProgram.methods.initializeCandidate(
      "Poire",
      new anchor.BN(1),
    ).rpc();

    const [sacAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from("Sandwich")],
      votingAddress
    );

    const sac = await votingProgram.account.candidate.fetch(sacAddress);

    console.log(sac);

    const [palAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from("Poire")],
      votingAddress
    );

    const pal = await votingProgram.account.candidate.fetch(palAddress);

    console.log(pal);

    expect(sac.candidateVotes.toNumber()).toEqual(0);
    expect(pal.candidateVotes.toNumber()).toEqual(0);
  })

  it('Vote', async () => {
    await votingProgram.methods.vote(
      "Sandwich",
      new anchor.BN(1),
    ).rpc();

    const [sacAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from("Sandwich")],
      votingAddress
    );

    const sac = await votingProgram.account.candidate.fetch(sacAddress);

    console.log(sac);

    expect(sac.candidateVotes.toNumber()).toEqual(1);
    // await votingProgram.methods.vote(
    //   "Sandwich au caca",
    //   new anchor.BN(1),
    // ).rpc();

    // await votingProgram.methods.vote(
    //   "Poire à lavement",
    //   new anchor.BN(1),
    // ).rpc();


  })
})
