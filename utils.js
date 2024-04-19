const network = process.env.NETWORK !== 'mainnet' ? 'testnet' : '';
const MEMPOOL_API = `https://mempool.space/${network ? network + '/' : ''}api`;
const MAGIC_EDEN = `https://api-mainnet.magiceden.dev`;

function hexToBytes(hex) {
  let bytes = [];
  for (let c = 0; c < hex.length; c += 2)
    bytes.push(parseInt(hex.substr(c, 2), 16));
  return Uint8Array.from(bytes);
}

async function getAddressUtxo(address) {
  const response = await fetch(`${MEMPOOL_API}/address/${address}/utxo`);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  const responseData = await response.json();
  return responseData;
}

async function getCollectionTokens(token = 'gamestone') {
  const params = {
    limit: 100,
    offset: 0,
    sortBy: 'priceAsc',
    minPrice: 0,
    maxPrice: 0,
    collectionSymbol: token,
    disablePendingTransactions: true,
  };
  const response = await fetch(
    `${MAGIC_EDEN}/v2/ord/btc/tokens?${new URLSearchParams(params)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ME_API_KEY}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  const responseData = await response.json();
  return responseData;
}

async function getBuyingPSBT(params) {
  console.log(`Buy parameters: ${JSON.stringify(params, null, 3)}`);
  const response = await fetch(
    `${MAGIC_EDEN}/v2/ord/btc/psbt/buying?${new URLSearchParams(params)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ME_API_KEY}`,
      },
    },
  );

  const responseData = await response.json();
  return responseData;
}

module.exports = {
  getAddressUtxo,
  hexToBytes,
  getCollectionTokens,
  getBuyingPSBT,
};
