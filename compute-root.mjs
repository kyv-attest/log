// Daily Merkle root over the issuer's published attestations. Self-contained
// (Node >= 20, no deps). Logic mirrors kyv-attest/kyv exactly:
// leaf = sha256(canonical(attestation minus log_inclusion)); pairs are
// sha256(left||right) over raw bytes; odd layers duplicate the last node.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const SOURCE = process.env.KYV_SOURCE_URL ?? "https://foundr.ventures/.well-known/attestations.json";

function canonicalize(v) {
  if (v === null || typeof v === "number" || typeof v === "boolean" || typeof v === "string") {
    return JSON.stringify(v);
  }
  if (Array.isArray(v)) return `[${v.map(canonicalize).join(",")}]`;
  const keys = Object.keys(v).filter((k) => v[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(v[k])}`).join(",")}}`;
}
const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const pair = (l, r) => sha256(Buffer.concat([Buffer.from(l, "hex"), Buffer.from(r, "hex")]));

function merkleRoot(leaves) {
  if (leaves.length === 0) return sha256("");
  let layer = [...leaves];
  while (layer.length > 1) {
    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      next.push(pair(layer[i], i + 1 < layer.length ? layer[i + 1] : layer[i]));
    }
    layer = next;
  }
  return layer[0];
}

const date = new Date().toISOString().slice(0, 10);
const outPath = `roots/${date}.json`;
if (existsSync(outPath)) {
  console.log(`${outPath} already exists — idempotent exit`);
  process.exit(0);
}
let doc;
if (SOURCE.startsWith("/") || SOURCE.startsWith("./")) {
  // local-path mode, for issuers testing before their endpoint is live
  const { readFileSync } = await import("node:fs");
  doc = JSON.parse(readFileSync(SOURCE, "utf8"));
} else {
  const res = await fetch(SOURCE, { headers: { "user-agent": "kyv-attest-log/0.1" } }).catch(() => null);
  if (!res || res.status !== 200) {
    console.log(`source not available (${res ? res.status : "unreachable"}) — exiting quietly`);
    process.exit(0);
  }
  doc = await res.json();
}
const leaves = (doc.attestations ?? []).map((a) => {
  const { log_inclusion, ...rest } = a;
  return sha256(canonicalize(rest));
});
mkdirSync("roots", { recursive: true });
writeFileSync(
  outPath,
  `${JSON.stringify({ date, algo: "sha256-merkle-v0", source: SOURCE, leaf_count: leaves.length, leaves, root: merkleRoot(leaves) }, null, 2)}\n`,
);
console.log(`wrote ${outPath} (${leaves.length} leaves)`);
