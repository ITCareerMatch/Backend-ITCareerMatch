/**
 * Middleware to protect internal endpoints
 * Only allow requests from localhost or internal services
 */
export function internalOnly(req, res, next) {
  const clientIp =
    req.ip ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.headers["x-forwarded-for"];

  // Allow localhost and 127.0.0.1
  const isLocalhost =
    clientIp === "127.0.0.1" ||
    clientIp === "::1" ||
    clientIp === "localhost" ||
    clientIp?.includes("127.0.0.1") ||
    clientIp?.includes("::1");

  // Also allow if X-Internal-Request header is present with valid token
  const internalToken = req.headers["x-internal-request"];
  const isValidInternalRequest =
    internalToken === process.env.INTERNAL_REQUEST_TOKEN;

  if (!isLocalhost && !isValidInternalRequest) {
    return res.status(403).json({
      success: false,
      message: "Access denied. This is an internal endpoint only.",
    });
  }

  next();
}

export default internalOnly;
