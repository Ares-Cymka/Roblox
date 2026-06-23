/**
 * Bot API authentication helper.
 *
 * External bot agents authenticate using a shared secret in the
 * Authorization header: `Bearer <BOT_API_SECRET>`.
 *
 * If BOT_API_SECRET is not configured, bot endpoints are disabled.
 */
export function isBotAuthorized(request: Request): boolean {
  const secret = process.env.BOT_API_SECRET?.trim();
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  if (!auth) return false;

  const [scheme, token] = auth.split(" ");
  return scheme === "Bearer" && token === secret;
}
