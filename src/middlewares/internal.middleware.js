export function internalOnly(req, res, next) {
  const clientIp =
    req.ip ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.headers["x-forwarded-for"];

  const isLocalhost =
    clientIp === "127.0.0.1" ||
    clientIp === "::1" ||
    clientIp === "localhost" ||
    clientIp?.includes("127.0.0.1") ||
    clientIp?.includes("::1");

  if (isLocalhost) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const internalApiKey = authHeader?.replace("Bearer ", "").trim();
  const isValidApiKey =
    internalApiKey && internalApiKey === process.env.INTERNAL_API_KEY;

  if (isValidApiKey) {
    return next();
  }

  const internalToken = req.headers["x-internal-request"];
  const isValidInternalRequest =
    internalToken && internalToken === process.env.INTERNAL_API_KEY;

  if (isValidInternalRequest) {
    return next();
  }

  // Access denied
  return res.status(401).json({
    success: false,
    message: "Unauthorized. Invalid or missing internal API key.",
  });
}

export default internalOnly;
