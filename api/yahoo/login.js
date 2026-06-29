export default async function handler(req, res) {
  const clientId = String(process.env.YAHOO_CLIENT_ID || '').trim();
  const redirectUri = String(process.env.YAHOO_REDIRECT_URI || '').trim();

  if (!clientId || !redirectUri) {
    return res.status(500).send('Missing YAHOO_CLIENT_ID or YAHOO_REDIRECT_URI');
  }

  const scope = 'openid profile email fspt-r';

  const authUrl =
    'https://api.login.yahoo.com/oauth2/request_auth' +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    '&response_type=code' +
    `&scope=${encodeURIComponent(scope)}` +
    '&language=en-us';

  res.writeHead(302, { Location: authUrl });
  res.end();
}
