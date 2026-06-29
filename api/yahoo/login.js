async function exchangeCodeForToken(code) {
  const clientId = process.env.YAHOO_CLIENT_ID;
  const clientSecret = process.env.YAHOO_CLIENT_SECRET;
  const redirectUri = process.env.YAHOO_REDIRECT_URI;

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code
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

  return data;
}

export default async function handler(req, res) {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).send('Missing code from Yahoo');
    }

    const tokenData = await exchangeCodeForToken(code);

    res.setHeader('Content-Type', 'text/html');

    res.send(`
      <html>
        <body style="font-family:Arial;background:#07101f;color:white;padding:30px">
          <h1>Yahoo Connected ✅</h1>

          <p>Copia este REFRESH TOKEN y pégalo en Vercel Environment Variables:</p>

          <textarea style="width:100%;height:160px">${tokenData.refresh_token || ''}</textarea>

          <h3>Access Token temporal:</h3>

          <textarea style="width:100%;height:120px">${tokenData.access_token || ''}</textarea>

          <p style="color:#aaa">
            IMPORTANTE: El refresh token va en Vercel como YAHOO_REFRESH_TOKEN.
            No lo pegues en GitHub ni en tu index.html.
          </p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error(error);
    res.status(500).send('Yahoo callback error: ' + error.message);
  }
}
