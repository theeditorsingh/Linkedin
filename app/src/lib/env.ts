// Values pasted into dashboards (Vercel env vars) sometimes carry a leading BOM (U+FEFF)
// or stray whitespace. When such a value is used as an HTTP header — API keys, bearer
// tokens — the fetch layer throws "Cannot convert argument to a ByteString because the
// character at index 0 has a value of 65279...". API keys, tokens, and URLs are always
// printable ASCII, so strip everything outside 0x21-0x7E.
export function cleanKey(value: string | undefined | null): string {
  if (!value) return "";
  let out = "";
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 0x21 && code <= 0x7e) out += value[i];
  }
  return out;
}
