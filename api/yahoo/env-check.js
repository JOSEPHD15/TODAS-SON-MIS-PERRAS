export default function handler(req, res) {
  const id = process.env.YAHOO_CLIENT_ID || '';
  const redirect = process.env.YAHOO_REDIRECT_URI || '';

  res.status(200).json({
    hasClientId: Boolean(id),
    clientIdStart: id.slice(0, 8),
    clientIdEnd: id.slice(-8),
    clientIdLength: id.length,
    redirectUri: redirect,
    hasSecret: Boolean(process.env.YAHOO_CLIENT_SECRET),
    hasRefreshToken: Boolean(process.env.YAHOO_REFRESH_TOKEN),
    hasLeagueKey: Boolean(process.env.YAHOO_LEAGUE_KEY)
  });
}
