/** Rough timings: run with `bun run bench`. */
import { GMap, gk, type Options } from "../src";

const n = Number(process.argv[2] ?? 100_000);
const keys = Array.from({ length: n }, (_, i) => i);
for (let i = n - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [keys[i], keys[j]] = [keys[j]!, keys[i]!];
}

function time(label: string, f: () => void) {
  const start = performance.now();
  f();
  const ms = performance.now() - start;
  console.log(`${label.padEnd(28)} ${ms.toFixed(0).padStart(6)} ms`);
}

function run(name: string, options: Options<number>) {
  let map = GMap.empty<number, number>(options);
  time(`${name} insert`, () => {
    for (const k of keys) map = map.set(k, k);
  });
  time(`${name} get`, () => {
    for (const k of keys) if (map.get(k) !== k) throw new Error("bad");
  });
  time(`${name} iterate`, () => {
    let c = 0;
    for (const _ of map) c++;
    if (c !== n) throw new Error("bad");
  });
  time(`${name} delete`, () => {
    for (const k of keys) map = map.delete(k);
  });
  console.log();
}

console.log(`n = ${n}\n`);
for (const k of [2, 4, 8, 16, 32]) run(`k=${k}`, { k });
run("gk k=8", gk({ k: 8 }));

time("Map (mutable, reference)", () => {
  const m = new Map<number, number>();
  for (const k of keys) m.set(k, k);
  for (const k of keys) m.get(k);
  for (const k of keys) m.delete(k);
});
