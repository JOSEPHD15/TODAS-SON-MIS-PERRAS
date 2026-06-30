async function getAccessToken() {
  const clientId = String(process.env.YAHOO_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.YAHOO_CLIENT_SECRET || '').trim();
  const refreshToken = String(process.env.YAHOO_REFRESH_TOKEN || '').trim();

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

export default async function handler(req, res) {
  try {
    const accessToken = await getAccessToken();

    const url =
      'https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games;game_codes=mlb/leagues?format=json';

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    });

    const text = await response.text();

    res.setHeader('Content-Type', 'application/json');

    if (!response.ok) {
      return res.status(response.status).send(text);
    }

    return res.status(200).send(text);

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
