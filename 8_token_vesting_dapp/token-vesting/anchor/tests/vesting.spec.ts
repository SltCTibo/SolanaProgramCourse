import * as anchor from '@coral-xyz/anchor'
import {Program, BN} from '@coral-xyz/anchor'
import {Keypair, PublicKey} from '@solana/web3.js'
import {Vesting} from '../target/types/vesting'
import { describe, it, expect, beforeAll } from '@jest/globals'
import { BanksClient, Clock, ProgramTestContext, startAnchor } from 'solana-bankrun'
import { BankrunProvider } from 'anchor-bankrun'
import IDL from "../target/idl/vesting.json"
import { SYSTEM_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/native/system'
import { createMint, mintTo, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'

describe('Vesting', () => {
  const companyName = "company name"

  let beneficiary: Keypair;
  let context: ProgramTestContext;
  let provider: BankrunProvider;
  let program: Program<Vesting>;
  let banksClient: BanksClient;
  let employer: Keypair;
  let mint: PublicKey;
  let beneficiaryProvider: BankrunProvider;
  let program2: Program<Vesting>;
  let vestingAccountKey: PublicKey;
  let treasuryTokenAccountKey: PublicKey;
  let employeeAccountKey: PublicKey;

  let vestingAddress = new PublicKey(IDL.address);

  beforeAll(async () => {
    beneficiary = new anchor.web3.Keypair();

    context = await startAnchor("", [
      { name: "vesting", programId: vestingAddress }
    ], [{
      address: beneficiary.publicKey,
      info: {
        lamports: 1_000_000_000,
        data: Buffer.alloc(0),
        owner: SYSTEM_PROGRAM_ID,
        executable: false
      }
    }]);

    provider = new BankrunProvider(context);

    program = new Program<Vesting>(IDL as Vesting, provider);

    banksClient = context.banksClient;

    employer = provider.wallet.payer;

    // @ts-expect-error - Type error in spl-token-bankrun dependency
    mint = await createMint(banksClient, employer, employer.publicKey, null, 2);

    beneficiaryProvider = new BankrunProvider(context);
    beneficiaryProvider.wallet = new NodeWallet(beneficiaryProvider.wallet.payer);

    program2 = new Program<Vesting>(IDL as Vesting, beneficiaryProvider);

    [vestingAccountKey] = PublicKey.findProgramAddressSync(
      [ Buffer.from(companyName) ],
      program.programId
    );

    [treasuryTokenAccountKey] = PublicKey.findProgramAddressSync(
      [ Buffer.from("vesting_treasury"), Buffer.from(companyName)],
      program.programId
    );

    [employeeAccountKey] = PublicKey.findProgramAddressSync(
      [ Buffer.from("employee_vesting"), beneficiary.publicKey.toBuffer(), vestingAccountKey.toBuffer()],
      program.programId
    );
  })

  it('Should create a vesting account', async () => {
    const tx = await program.methods.createVestingAccount(companyName)
      .accounts({
        signer: employer.publicKey,
        mint: mint,
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .rpc({ commitment: "confirmed"});

      const vestingAccountData = await program.account.vestingAccount.fetch(vestingAccountKey, "confirmed");
      console.log("Create vesting Account: ", vestingAccountData);
  })

  it("Should fund the treasury token amount", async () => {
    const amount = 10_000 * 10 ** 9;
    const mintTx = await mintTo(
      // @ts-expect-error - Type error in spl-token-bankrun dependency
      banksClient,
      employer,
      mint,
      treasuryTokenAccountKey,
      employer,
      amount
    );
    console.log('Mint treasury Token Account: ', mintTx)
  })

  it("should create employee vesting account", async () => {
    const tx2 = await program.methods.createEmployeeAccount(new BN(0), new BN(100), new BN(100), new BN(0))
      .accounts({
        beneficiary: beneficiary.publicKey,
        vestingAccount: vestingAccountKey,
      })
      .rpc({ commitment: "confirmed"});

      console.log("Create Employee acount tx: ", tx2);
      console.log('Employee Account: ', employeeAccountKey.toBase58())
  })

  it("should claim the employee's vested tokens", async () => {
    const currentClock = await banksClient.getClock();
    context.setClock(
      new Clock(
        currentClock.slot,
        currentClock.epochStartTimestamp,
        currentClock.epoch,
        currentClock.leaderScheduleEpoch,
        currentClock.unixTimestamp
      )
    )
    const tx3 = await program2.methods.claimTokens(companyName)
    .accounts({
      tokenProgram: TOKEN_PROGRAM_ID
    })
    .rpc({ commitment: 'confirmed'});
    console.log("Claim tokens Tx: ", tx3);
  })
})
