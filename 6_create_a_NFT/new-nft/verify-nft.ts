import { findMetadataPda, mplTokenMetadata, verifyCollectionV1 } from "@metaplex-foundation/mpl-token-metadata"; 
import { airdropIfRequired, getExplorerLink, getKeypairFromFile } from "@solana-developers/helpers";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { keypairIdentity, publicKey } from "@metaplex-foundation/umi";

const connection = new Connection(clusterApiUrl("devnet"));

// If no file given, it will get it from the id.json already generated with the solana CLI
const user = await getKeypairFromFile();

await airdropIfRequired(connection, user.publicKey, 1 * LAMPORTS_PER_SOL, 0.5 * LAMPORTS_PER_SOL);

console.log("Loaded user: ", user.publicKey.toBase58());

const umi = createUmi(connection.rpcEndpoint);
umi.use(mplTokenMetadata());

// Copy of user to create a umi user
const umiUser = umi.eddsa.createKeypairFromSecretKey(user.secretKey);
umi.use(keypairIdentity(umiUser));

console.log("Set up Umi instance for user: ", umiUser.publicKey.toString());

const collectionAddress = publicKey("FuhXpSkuivgfKdQCv83me2KqUNmuPzMURM5YHJUMc9Sp");

const nftAddress = publicKey("9SpB6otTG2FQXruweufuj22M1p99W5bv1oVrfkdaSNma");

const transaction = verifyCollectionV1(umi, {
    metadata: findMetadataPda(umi, { mint: nftAddress }),
    collectionMint: collectionAddress,
    authority: umi.identity
});

transaction.sendAndConfirm(umi);

console.log(`✅ NFT ${nftAddress} verified as member of collection ${collectionAddress}! See Explorer at ${getExplorerLink("address", nftAddress, "devnet")}`)