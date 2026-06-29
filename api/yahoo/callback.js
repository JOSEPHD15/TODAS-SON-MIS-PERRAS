async function exchangeCodeForToken(code) {
  const clientId = String(process.env.YAHOO_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.YAHOO_CLIENT_SECRET || '').trim();
  const redirectUri = String(process.env.YAHOO_REDIRECT_URI || '').trim();

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing YAHOO_CLIENT_ID, YAHOO_CLIENT_SECRET, or YAHOO_REDIRECT_URI');
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const body = new URLSearchParams();
  body.append('grant_type', 'authorization_code');
  body.append('redirect_uri', redirectUri);
  body.append('code', String(code).trim());

  const response = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: body.toString()
  });

  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error('Yahoo returned non-JSON response: ' + text);
  }

  if (!response.ok) {
    throw new Error('Yahoo token error: ' + JSON.stringify(data));
  }

  return data;
}

export default async function handler(req, res) {
  try {
    const code = req.query?.code;

    if (!code) {
      return res.status(400).send(`
        <html>
          <body style="font-family:Arial;background:#07101f;color:white;padding:30px">
            <h1>Missing code from Yahoo</h1>
            <p>Yahoo did not return an authorization code.</p>
          </body>
        </html>
      `);
    }

    const tokenData = await exchangeCodeForToken(code);

    res.setHeader('Content-Type', 'text/html');

    return res.status(200).send(`
      <html>
        <body style="font-family:Arial;background:#07101f;color:white;padding:30px">
          <h1>Yahoo Connected ✅</h1>

          <p>Copia este REFRESH TOKEN y pégalo en Vercel como <b>YAHOO_REFRESH_TOKEN</b>:</p>

          <textarea style="width:100%;height:170px;background:#0b1220;color:white;border:1px solid #334155;border-radius:10px;padding:12px">${tokenData.refresh_token || ''}</textarea>

          <h3>Access Token temporal:</h3>

          <textarea style="width:100%;height:120px;background:#0b1220;color:white;border:1px solid #334155;border-radius:10px;padding:12px">${tokenData.access_token || ''}</textarea>

          <p style="color:#aaa">
            IMPORTANTE: No pegues estos tokens en GitHub ni en el chat.
          </p>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('CALLBACK ERROR:', error);

    res.setHeader('Content-Type', 'text/html');

    return res.status(500).send(`
      <html>
        <body style="font-family:Arial;background:#07101f;color:white;padding:30px">
          <h1>Callback Error ❌</h1>
          <p>El callback recibió el code, pero falló al pedir tokens a Yahoo.</p>

          <h3>Error:</h3>
          <pre style="white-space:pre-wrap;background:#111827;color:#f87171;padding:15px;border-radius:10px">${String(error.message)}</pre>

          <p style="color:#aaa">
            Si ves invalid_client, revisa Client Secret. Si ves redirect_uri, revisa que Vercel y Yahoo tengan exactamente el mismo callback.
          </p>
        </body>
      </html>
    `);
  }
}
