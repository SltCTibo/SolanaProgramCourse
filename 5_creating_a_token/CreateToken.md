# Create a token

Tout d’abord générer une paire de clé:

```bash
solana-keygen new
```

Configurer Solana CLI sur la paire de clé générée à l’instant:

```bash
solana config set --keypair <fichier json généré>
```

Configurer le client sur le cluster devnet:

```bash
solana config set --url devnet
```

Airdrop des solana sur le wallet avec Solana faucet ou en ligne de commande:

```bash
solana airdrop 2 <wallet address>
```

Généré une autre adresse pour le mint:

```bash
solana-keygen new
```

Création du token:

```bash
spl-token create-token --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb --enable-metadata <mint address généré juste avant.json>
```

Pour la metadata du token, faire un lien avec un json, exemple de json:

```json
{
	"name": "Example Token",
	"symbol": "EXMPL",
	"description": "Example token for Solana Foundation Bootcamp",
	"image": "https://raw.githubusercontent.con/mikemaccana/token-command-line/main/lights.png"
}
```

Il faut juste que ce soit public et en raw.

La commande pour faire le lien:

```bash
spl-token initialize-metadata <mint address> 'Example' 'EXMPL' <link to the public raw json>
```

Créer un account pour store les tokens dans le personal account (la supply):

```bash
spl-token create-account <mint address>
```

Comment mint des tokens:

```bash
spl-token mint <mint address> <amount>
```