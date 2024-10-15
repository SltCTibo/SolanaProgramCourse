import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { TokenLottery } from '../target/types/token_lottery';
import { describe, it, beforeAll } from '@jest/globals';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as sb from "@switchboard-xyz/on-demand";
import SwitchboardIDL from "./ondemand-idl.json";

describe('tokenLottery', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(anchor.AnchorProvider.env());

  const wallet = provider.wallet as anchor.Wallet;

  const program = anchor.workspace.TokenLottery as Program<TokenLottery>;

  let switchboardProgram = new anchor.Program(SwitchboardIDL as anchor.Idl, provider);;
  const rngKp = anchor.web3.Keypair.generate();


  async function buyTicket() {
    const buyTicketTx = await program.methods.buyTicket()
      .accounts({
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .instruction();

      const computeIx = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
        units: 300000
       });
   
       const priorityIx = anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
         microLamports: 1
       });

      const blockashWithContext = await provider.connection.getLatestBlockhash();
      const tx = new anchor.web3.Transaction(
        {
          feePayer: provider.wallet.publicKey,
          blockhash: blockashWithContext.blockhash,
          lastValidBlockHeight: blockashWithContext.lastValidBlockHeight,
        }
      ).add(buyTicketTx)
      .add(computeIx)
      .add(priorityIx);

      const signature = await anchor.web3.sendAndConfirmTransaction(
        provider.connection, tx, [wallet.payer], { skipPreflight: true }
      )

      console.log("Your transaction signature: ", signature);
  }

  it('should test token lottery', async () => {
    const slot = await provider.connection.getSlot();
    const endSlot = slot + 20;

    const initConfigTx = await program.methods.initializeConfig(
      new anchor.BN(slot),
      new anchor.BN(endSlot),
      new anchor.BN(10000),
    ).instruction();

    const blockashWithContext = await provider.connection.getLatestBlockhash();

    const tx = new anchor.web3.Transaction({
      feePayer: provider.wallet.publicKey,
      blockhash: blockashWithContext.blockhash,
      lastValidBlockHeight: blockashWithContext.lastValidBlockHeight,
    }).add(initConfigTx)
  
    console.log('Your transaction signature', tx);

    const signature = await anchor.web3.sendAndConfirmTransaction(provider.connection, tx, [wallet.payer], { skipPreflight: true});
    console.log('Your transaction signature: ', signature);

    const initLotteryTx = await program.methods.initializeLottery().accounts({
      tokenProgram: TOKEN_PROGRAM_ID
    }).instruction();

    const tx2 = new anchor.web3.Transaction({
      feePayer: provider.wallet.publicKey,
      blockhash: blockashWithContext.blockhash,
      lastValidBlockHeight: blockashWithContext.lastValidBlockHeight
    }).add(initLotteryTx);

    const initLotterySignature = await anchor.web3.sendAndConfirmTransaction(provider.connection, tx2, [wallet.payer], { skipPreflight: true});
    console.log("Your initLottery transaction signature: ", initLotterySignature);

    await buyTicket();
    await buyTicket();
    await buyTicket();
    await buyTicket();
    await buyTicket();
    await buyTicket();
    await buyTicket();

    const queue = new anchor.web3.PublicKey("A43DyUGA7s8eXPxqEjJY6EBu1KKbNgfxF8h17VAHn13w");

    const queueAccount = new sb.Queue(switchboardProgram, queue);

    try {
      await queueAccount.loadData();
    } catch (error) {
      console.error("Error", error);
      process.exit(1);
    }

    const [randomness, createRandomnessIx] = await sb.Randomness.create(switchboardProgram, rngKp, queue);

    const createRandomnessTx = await sb.asV0Tx({
      connection: provider.connection,
      ixs: [createRandomnessIx],
      payer: wallet.publicKey,
      signers: [wallet.payer, rngKp],
    });

    const blockhashContext = await provider.connection.getLatestBlockhashAndContext();

    const createRandomnessSignature = await provider.connection.sendTransaction(createRandomnessTx)
    await provider.connection.confirmTransaction({
      signature: createRandomnessSignature,
      blockhash: blockhashContext.value.blockhash,
      lastValidBlockHeight: blockhashContext.value.lastValidBlockHeight
    })

    console.log('createRandomnessSignature', createRandomnessSignature);

    let confirmed = false

    while (!confirmed) {
      try {
        const confirmedRandomness = await provider.connection.getSignatureStatuses([createRandomnessSignature]);
        const randomnessStatus = confirmedRandomness.value[0];
        if (randomnessStatus?.confirmations != null && randomnessStatus.confirmationStatus === 'confirmed') {
          confirmed = true
        }
      } catch (error) {
        console.log('Error', error);
      }
    }

    const sbCommitIx = await randomness.commitIx(queue);

    const commitIx = await program.methods.commitRandomness()
      .accounts({
        randomnessAccount: randomness.pubkey,
      }).instruction();

    const commitComputeIx = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit(
      {
        units: 100000,
      }
    );

    const commitPriorityIx = anchor.web3.ComputeBudgetProgram.setComputeUnitPrice(
      {
        microLamports: 1,
      }
    );

    const commitBlockhashWithContext = await provider.connection.getLatestBlockhash();
    const commitTx = new anchor.web3.Transaction({
      feePayer: provider.wallet.publicKey,
      blockhash: commitBlockhashWithContext.blockhash,
      lastValidBlockHeight: commitBlockhashWithContext.lastValidBlockHeight,
    }).add(commitComputeIx)
    .add(commitPriorityIx)
    .add(sbCommitIx)
    .add(commitIx);

    const commitSignature = await anchor.web3.sendAndConfirmTransaction(
      provider.connection, commitTx, [wallet.payer]
    )
  
    console.log("commitSignature: ", commitSignature);

    const sbRevealIx = await randomness.revealIx();
    const revealWinnerIx = await program.methods.revealWinner()
      .accounts({
        randomnessAccount: randomness.pubkey,
      }).instruction();

    const revealBlockhashWithContext = await provider.connection.getLatestBlockhash();

    const revealTx = new anchor.web3.Transaction(
      {
        feePayer: provider.wallet.publicKey,
        blockhash: revealBlockhashWithContext.blockhash,
        lastValidBlockHeight: revealBlockhashWithContext.lastValidBlockHeight
      }
    ).add(sbRevealIx)
    .add(revealWinnerIx);

    let currentSlot = 0;
    while (currentSlot < endSlot) {
      const slot = await provider.connection.getSlot();
      if (slot > currentSlot) {
        currentSlot = slot;
        console.log('Current lot', currentSlot);
      }
    }

    const revealSignature = await anchor.web3.sendAndConfirmTransaction(
      provider.connection, revealTx, [wallet.payer]
    )

    console.log("reveal winner signature: ", revealSignature);

    const claimIx = await program.methods.claimWinnings()
      .accounts({
        tokenProgram: TOKEN_PROGRAM_ID
      }).instruction();

    const claimBlockhashWithContext = await provider.connection.getLatestBlockhash();
    const claimTx = new anchor.web3.Transaction({
      feePayer: provider.wallet.publicKey,
      blockhash: claimBlockhashWithContext.blockhash,
      lastValidBlockHeight: claimBlockhashWithContext.lastValidBlockHeight,
    }).add(claimIx);

    const claimSignature = await anchor.web3.sendAndConfirmTransaction(
      provider.connection, claimTx, [wallet.payer], {skipPreflight: true}
    );

    console.log("claimSignature", claimSignature);
  
    }, 300000);
});
