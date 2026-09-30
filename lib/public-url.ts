function firstForwarded(value: string | null) {
  return value?.split(",")[0]?.trim() || "";
}

export function publicRequestUrl(req: Request, path: string) {
  const requestUrl = new URL(req.url);
  const forwardedHost = firstForwarded(req.headers.get("x-forwarded-host"));
  const host = forwardedHost || firstForwarded(req.headers.get("host"));
  const forwardedProto = firstForwarded(req.headers.get("x-forwarded-proto"));
  const protocol = forwardedProto === "http" || forwardedProto === "https"
    ? forwardedProto
    : requestUrl.protocol.replace(":", "");

  const origin = host ? `${protocol}://${host}` : requestUrl.origin;
  return new URL(path, origin);
}
