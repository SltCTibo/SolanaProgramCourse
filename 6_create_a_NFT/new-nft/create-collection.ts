import { createNft, fetchDigitalAsset, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata"; 
import { airdropIfRequired, getExplorerLink, getKeypairFromFile } from "@solana-developers/helpers";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { generateSigner, keypairIdentity, percentAmount } from "@metaplex-foundation/umi";

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

const collectionMint = generateSigner(umi);

const transaction = await createNft(umi, {
    mint: collectionMint,
    name: "MyCollection",
    symbol: "MC",
    uri: "https://raw.githubusercontent.com/SltCTibo/SolanaProgramCourse/main/6_create_a_NFT/metadata.json", // should be a Json file (ex: github raw url)
    sellerFeeBasisPoints: percentAmount(0),
    isCollection: true
})

await transaction.sendAndConfirm(umi);

const createdCollectionNFT = await fetchDigitalAsset(umi, collectionMint.publicKey);

console.log(`Created collection 📦! Address is ${getExplorerLink("address", createdCollectionNFT.mint.publicKey, "devnet")}`);