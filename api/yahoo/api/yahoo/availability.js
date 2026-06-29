async function getAccessToken() {
  const clientId = process.env.YAHOO_CLIENT_ID;
  const clientSecret = process.env.YAHOO_CLIENT_SECRET;
  const refreshToken = process.env.YAHOO_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Yahoo env variables');
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });

  const response = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }

  return data.access_token;
}

function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function deepFindPlayers(obj, found = []) {
  if (!obj || typeof obj !== 'object') return found;

  if (obj.player && Array.isArray(obj.player)) {
    found.push(obj.player);
  }

  for (const key of Object.keys(obj)) {
    deepFindPlayers(obj[key], found);
  }

  return found;
}

function extractText(value) {
  if (value === null || value === undefined) return null;

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const result = extractText(item);
      if (result) return result;
    }
  }

  if (typeof value === 'object') {
    if (value.full) return value.full;
    if (value.display_position) return value.display_position;
    if (value.status) return value.status;
    if (value.percent_owned) return extractText(value.percent_owned);
    if (value.value) return String(value.value);

    for (const key of Object.keys(value)) {
      const result = extractText(value[key]);
      if (result) return result;
    }
  }

  return null;
}

function parseYahooPlayer(playerArray) {
  let player = {
    name: null,
    status: null,
    percentOwned: null,
    ownerTeamName: null,
    rawStatus: null
  };

  for (const item of playerArray) {
    if (!item || typeof item !== 'object') continue;

    if (item.name) {
      player.name = item.name.full || extractText(item.name);
    }

    if (item.status) {
      player.rawStatus = extractText(item.status);
    }

    if (item.percent_owned) {
      player.percentOwned = extractText(item.percent_owned);
    }

    if (item.ownership) {
      const ownershipString = JSON.stringify(item.ownership).toLowerCase();

      if (ownershipString.includes('waivers')) {
        player.status = 'WAIVERS';
      } else if (
        ownershipString.includes('freeagents') ||
        ownershipString.includes('free_agents') ||
        ownershipString.includes('free agent')
      ) {
        player.status = 'AVAILABLE';
      } else if (ownershipString.includes('team')) {
        player.status = 'OWNED';
      }

      const possibleTeamName = extractText(item.ownership);
      if (possibleTeamName) {
        player.ownerTeamName = possibleTeamName;
      }
    }
  }

  if (!player.status) {
    const raw = String(player.rawStatus || '').toUpperCase();

    if (raw === 'W') {
      player.status = 'WAIVERS';
    } else if (raw === 'FA') {
      player.status = 'AVAILABLE';
    } else {
      player.status = 'UNKNOWN';
    }
  }

  return player;
}

async function searchYahooPlayer(accessToken, leagueKey, playerName) {
  const search = encodeURIComponent(playerName);

  const url =
    `https://fantasysports.yahooapis.com/fantasy/v2/league/${leagueKey}` +
    `/players;search=${search}` +
    `/ownership,percent_owned` +
    `?format=json`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }

  const allPlayers = deepFindPlayers(data);
  const parsed = allPlayers.map(parseYahooPlayer);
  const target = normalizeName(playerName);

  const exact = parsed.find(p => normalizeName(p.name) === target);

  if (exact) return exact;

  const partial = parsed.find(p => {
    const yahooName = normalizeName(p.name);
    return yahooName.includes(target) || target.includes(yahooName);
  });

  return partial || {
    name: playerName,
    status: 'UNKNOWN',
    percentOwned: null,
    ownerTeamName: null
  };
}

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Use POST' });
    }

    const leagueKey = process.env.YAHOO_LEAGUE_KEY;

    if (!leagueKey) {
      return res.status(500).json({ error: 'Missing YAHOO_LEAGUE_KEY' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const names = body.names || [];

    if (!Array.isArray(names)) {
      return res.status(400).json({ error: 'names must be array' });
    }

    const accessToken = await getAccessToken();

    const result = {};

    for (const name of names) {
      try {
        const yahooPlayer = await searchYahooPlayer(accessToken, leagueKey, name);

        result[name] = {
          yahooName: yahooPlayer.name,
          status: yahooPlayer.status,
          percentOwned: yahooPlayer.percentOwned,
          ownerTeamName: yahooPlayer.ownerTeamName
        };
      } catch (err) {
        result[name] = {
          yahooName: name,
          status: 'ERROR',
          error: err.message
        };
      }
    }

    res.status(200).json(result);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message
    });
  }
}
