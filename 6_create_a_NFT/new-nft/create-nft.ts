import { createNft, fetchDigitalAsset, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata"; 
import { airdropIfRequired, getExplorerLink, getKeypairFromFile } from "@solana-developers/helpers";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { generateSigner, keypairIdentity, percentAmount, publicKey } from "@metaplex-foundation/umi";

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

console.log("Createing NFT...");

const mint = generateSigner(umi);

const transaction = await createNft(umi, {
    mint,
    name: "MyNft",
    uri: "https://raw.githubusercontent.com/SltCTibo/SolanaProgramCourse/main/6_create_a_NFT/nft-metadata.json",
    sellerFeeBasisPoints: percentAmount(0),
    collection: {
        key: collectionAddress,
        verified: false
    }
});

await transaction.sendAndConfirm(umi);

const createdNft = await fetchDigitalAsset(umi, mint.publicKey);

console.log(`🖼️ Created NFT! Address is ${getExplorerLink("address", createdNft.mint.publicKey, "devnet")}`)