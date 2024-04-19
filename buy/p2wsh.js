const bip32 = require('@scure/bip32');
const randomBytes = require('randombytes');
const btc = require('@scure/btc-signer');
const { base64, hex } = require('@scure/base');
const {
  getAddressUtxo,
  hexToBytes,
  getCollectionTokens,
  getBuyingPSBT,
} = require('../utils');

const KEYS_TO_GENERATE = 2;
const NETWORK =
  process.env.NETWORK === 'mainnet' ? btc.NETWORK : btc.TEST_NETWORK;

const generateSegwitWallet = (keys) => {
  const ms = btc.p2ms(1, keys.map(key => key.publicKey));

  const p2tr = btc.p2wsh(ms, NETWORK);
  return { p2tr };
};

const generateRandomKeys = () => {
  const randomKeys = Array.from({ length: KEYS_TO_GENERATE }, () => {
    const keySeed = randomBytes(32);
    return bip32.HDKey.fromMasterSeed(keySeed, NETWORK.bip32);
  });

  return generateSegwitWallet(randomKeys);
};

const generateLocalKeys = () => {
  const seeds = process.env.KEYS.split(',');

  const localKeys = seeds.map((seed) => {
    console.log(`Seed: ${seed}`);
    const keySeed = hexToBytes(seed);
    return bip32.HDKey.fromMasterSeed(keySeed, NETWORK.bip32);
  });

  return generateSegwitWallet(localKeys);
};

(async () => {
  const { p2tr } = process.env.KEYS
    ? generateLocalKeys()
    : generateRandomKeys();

  console.log(p2tr.address);
  const utxos = await getAddressUtxo(p2tr.address);
  if (!utxos.length) {
    throw new Error(`No available balance in ${p2tr.address}`);
  }

  const confirmedUtxos = utxos.filter((utxo) => utxo.status.confirmed);
  if (!confirmedUtxos.length) {
    throw new Error('No available confirmed utxos');
  }

  const balance = confirmedUtxos.reduce((acum, u) => {
    acum += u.value;
    return acum;
  }, 0);

  console.log(`Current balance: ${balance} sats`);

  const { tokens } = await getCollectionTokens('gamestone');
  const availableTokens = tokens.filter((t) => t.listed);
  const tokenToBuy = availableTokens[0];

  console.log(
    `Token available for sale ${tokenToBuy.id} at ${tokenToBuy.listedPrice} sats. Prev: ${tokenToBuy.contentPreviewURI}`,
  );

  const params = {
    price: tokenToBuy.listedPrice,
    tokenId: tokenToBuy.id,
    buyerAddress: p2tr.address,
    buyerTokenReceiveAddress: process.env.RECEIVE_TOKEN_ADDRESS || p2tr.address,
    feerateTier: 'minimumFee',
    creatorTipsType: 'none',
    useUnconfirmedUTXO: false,
  };

  const psbt = await getBuyingPSBT(params);
  console.log(`PSBT: ${JSON.stringify(psbt)}`);

  if (psbt.error) {
    // bc1pf7sep0ayty38pz2cj7z8pncehl6d2tl45xntjtq3fvsw6n6qkm8q5sc7rd
    // Current balance: 77574 sats
    // Token available for sale 3d19c12db788dbd8f2ea0fe2704e4c8609fdb9619cc189824a203d2a16ed7691i1699 at 34000 sats. Prev: https://ord-mirror.magiceden.dev/preview/3d19c12db788dbd8f2ea0fe2704e4c8609fdb9619cc189824a203d2a16ed7691i1699
    // PSBT: {"error":"Buyer address has not enough utxos"}
    throw new Error(psbt.error);
  }
})();
