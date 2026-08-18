// Parses a plain CSS declaration string ("color:red;font-size:12px") into a
// React style object, so JSX can keep the same inline-style strings the
// original design used instead of hand-converting every rule to camelCase.
export function css(str) {
  const out = {};
  String(str || "").split(";").forEach((rule) => {
    const idx = rule.indexOf(":");
    if (idx < 0) return;
    const prop = rule.slice(0, idx).trim();
    const val = rule.slice(idx + 1).trim();
    if (!prop || !val) return;
    const camel = prop.startsWith("--")
      ? prop
      : prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = val;
  });
  return out;
}
