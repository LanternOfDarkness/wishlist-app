import dns from "node:dns";
import net from "node:net";

/**
 * Guards against SSRF: only exact http(s) protocols are allowed, literal-IP
 * hosts and DNS-resolved hosts are checked against private/loopback/
 * link-local ranges, and redirects are re-validated hop by hop instead of
 * being followed blindly by `fetch`.
 */

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

const MAX_REDIRECTS = 3;

export class UnsafeUrlError extends Error {
  constructor(message = "URL is not allowed") {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

// A single blocklist covers both families: Node's net.BlockList transparently
// maps IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1) onto the IPv4
// subnets below when checked with family "ipv6".
const PRIVATE_ADDRESS_BLOCKLIST = new net.BlockList();

// IPv4: loopback, RFC1918 private ranges, link-local (incl. cloud metadata), unspecified.
PRIVATE_ADDRESS_BLOCKLIST.addSubnet("127.0.0.0", 8, "ipv4");
PRIVATE_ADDRESS_BLOCKLIST.addSubnet("10.0.0.0", 8, "ipv4");
PRIVATE_ADDRESS_BLOCKLIST.addSubnet("172.16.0.0", 12, "ipv4");
PRIVATE_ADDRESS_BLOCKLIST.addSubnet("192.168.0.0", 16, "ipv4");
PRIVATE_ADDRESS_BLOCKLIST.addSubnet("169.254.0.0", 16, "ipv4");
PRIVATE_ADDRESS_BLOCKLIST.addAddress("0.0.0.0", "ipv4");

// IPv6: unspecified, loopback, unique-local, link-local.
PRIVATE_ADDRESS_BLOCKLIST.addAddress("::", "ipv6");
PRIVATE_ADDRESS_BLOCKLIST.addAddress("::1", "ipv6");
PRIVATE_ADDRESS_BLOCKLIST.addSubnet("fc00::", 7, "ipv6");
PRIVATE_ADDRESS_BLOCKLIST.addSubnet("fe80::", 10, "ipv6");

function stripBrackets(host: string): string {
  return host.startsWith("[") && host.endsWith("]")
    ? host.slice(1, -1)
    : host;
}

/** Returns true for any literal IP address in a private/loopback/link-local range. */
export function isPrivateIpAddress(address: string): boolean {
  const host = stripBrackets(address);
  const family = net.isIP(host);

  if (family === 4) {
    return PRIVATE_ADDRESS_BLOCKLIST.check(host, "ipv4");
  }

  if (family === 6) {
    return PRIVATE_ADDRESS_BLOCKLIST.check(host, "ipv6");
  }

  return false;
}

/**
 * Validates that a URL uses http/https and does not point at a private,
 * loopback, or link-local address — checking the literal host and, for
 * hostnames, every DNS-resolved address (defeats DNS rebinding).
 */
export async function assertPublicHttpUrl(input: string | URL): Promise<URL> {
  const parsedUrl = typeof input === "string" ? new URL(input) : input;

  if (!ALLOWED_PROTOCOLS.has(parsedUrl.protocol)) {
    throw new UnsafeUrlError(`Protocol not allowed: ${parsedUrl.protocol}`);
  }

  const hostname = stripBrackets(parsedUrl.hostname);

  if (isPrivateIpAddress(hostname)) {
    throw new UnsafeUrlError(`Refusing to fetch private address: ${hostname}`);
  }

  // Only literal IPs are checked above; hostnames must also be resolved so a
  // DNS record pointing at a private address (or rebinding after the fact)
  // is caught too.
  if (net.isIP(hostname) === 0) {
    let addresses: { address: string }[];

    try {
      addresses = await dns.promises.lookup(hostname, { all: true });
    } catch {
      throw new UnsafeUrlError(`Unable to resolve host: ${hostname}`);
    }

    if (addresses.length === 0) {
      throw new UnsafeUrlError(`No addresses resolved for host: ${hostname}`);
    }

    for (const { address } of addresses) {
      if (isPrivateIpAddress(address)) {
        throw new UnsafeUrlError(
          `Refusing to fetch host resolving to private address: ${hostname} -> ${address}`,
        );
      }
    }
  }

  return parsedUrl;
}

/**
 * A drop-in `fetch` that blocks SSRF: it validates the URL (and, on each
 * redirect, the redirect target) before any request is made, and never lets
 * the underlying `fetch` follow a redirect automatically.
 */
export async function safeFetch(
  input: string | URL,
  init: RequestInit = {},
): Promise<Response> {
  let currentUrl = await assertPublicHttpUrl(input);

  for (let hop = 0; ; hop++) {
    const response = await fetch(currentUrl.href, {
      ...init,
      redirect: "manual",
    });

    const isRedirect = response.status >= 300 && response.status < 400;

    if (!isRedirect) {
      return response;
    }

    const location = response.headers.get("location");

    if (!location) {
      return response;
    }

    if (hop >= MAX_REDIRECTS) {
      throw new UnsafeUrlError("Too many redirects");
    }

    currentUrl = await assertPublicHttpUrl(new URL(location, currentUrl));
  }
}
