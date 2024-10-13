import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Favorites } from "../target/types/favorites";

describe("favorites", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Favorites as Program<Favorites>;

  it("Is initialized!", async () => {
    const user = provider.wallet.publicKey;

    const [favoritesPda, bump] = await anchor.web3.PublicKey.findProgramAddress([Buffer.from("favorites"), user.toBuffer()], program.programId);

    const number = new anchor.BN(42);
    const color = "blue";
    const hobbies = ["football", "video games", "developing"];

    const tx = await program.methods
      .setFavorites(number, color, hobbies)
      .accounts({
        user: user,
        favorites: favoritesPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Your transaction signature", tx);
  });

  it("Fetch favorites from the account", async () => {
    const user = provider.wallet.publicKey;

    const [favoritesPda, bump] = await anchor.web3.PublicKey.findProgramAddress([Buffer.from("favorites"), user.toBuffer()], program.programId);

    const favoritesAccount = await program.account.favorites.fetch(favoritesPda);

    console.log("Fetched favorites", {
      number: favoritesAccount.number.toString(),
      color: favoritesAccount.color,
      hobbies: favoritesAccount.hobbies
    });
  })
});
