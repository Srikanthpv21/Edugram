const TRUSTED_IMAGE_HOSTS = [/^picsum\.photos$/, /\.r2\.dev$/, /\.cloudflarestream\.com$/];

export function isTrustedImageHost(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && TRUSTED_IMAGE_HOSTS.some((re) => re.test(hostname));
  } catch {
    return false;
  }
}
