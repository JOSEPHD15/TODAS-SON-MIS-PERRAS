export default async function handler(req, res) {
  const clientId = process.env.YAHOO_CLIENT_ID;
  const redirectUri = process.env.YAHOO_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).send('Missing YAHOO_CLIENT_ID or YAHOO_REDIRECT_URI');
  }

  const authUrl =
    'https://api.login.yahoo.com/oauth2/request_auth' +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    '&response_type=code' +
    '&language=en-us';

  res.writeHead(302, { Location: authUrl });
  res.end();
}
