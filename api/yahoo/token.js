async function exchangeCodeForToken(code) {
  const clientId = String(process.env.YAHOO_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.YAHOO_CLIENT_SECRET || '').trim();

  if (!clientId || !clientSecret) {
    throw new Error('Missing YAHOO_CLIENT_ID or YAHOO_CLIENT_SECRET');
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const body = new URLSearchParams();
  body.append('grant_type', 'authorization_code');
  body.append('redirect_uri', 'oob');
  body.append('code', String(code).trim());

  const response = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
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
    throw new Error(JSON.stringify(data));
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
            <h1>Missing code</h1>
            <p>Usa esta URL:</p>
            <pre>https://todas-son-mis-perras.vercel.app/api/yahoo/token?code=PEGA_AQUI_EL_CODE</pre>
          </body>
        </html>
      `);
    }

    const tokenData = await exchangeCodeForToken(code);

    res.setHeader('Content-Type', 'text/html');

    return res.status(200).send(`
      <html>
        <body style="font-family:Arial;background:#07101f;color:white;padding:30px">
          <h1>Yahoo Token OK ✅</h1>

          <p>Copia este REFRESH TOKEN y pégalo en Vercel como <b>YAHOO_REFRESH_TOKEN</b>:</p>

          <textarea style="width:100%;height:170px;background:#0b1220;color:white;border:1px solid #334155;border-radius:10px;padding:12px">${tokenData.refresh_token || ''}</textarea>

          <h3>Access Token temporal:</h3>

          <textarea style="width:100%;height:120px;background:#0b1220;color:white;border:1px solid #334155;border-radius:10px;padding:12px">${tokenData.access_token || ''}</textarea>

          <p style="color:#aaa">
            No pegues estos tokens en GitHub ni en el chat.
          </p>
        </body>
      </html>
    `);

  } catch (error) {
    res.setHeader('Content-Type', 'text/html');

    return res.status(500).send(`
      <html>
        <body style="font-family:Arial;background:#07101f;color:white;padding:30px">
          <h1>Token Error ❌</h1>
          <pre style="white-space:pre-wrap;background:#111827;color:#f87171;padding:15px;border-radius:10px">${String(error.message)}</pre>
        </body>
      </html>
    `);
  }
}
