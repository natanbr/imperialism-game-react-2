// node sum.mjs <probe-out.json>. Score summary of a probe run: per seed the score at turns 15/25/40, the ratio to the frozen M4 player,
// workers at 15/25/40, and the health totals.
import { readFileSync } from 'node:fs';
const rows = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const M4 = { 1: [390, 468, 650], 2: [381, 471, 668], 3: [396, 471, 663], 4: [380, 473, 665] };
const CP = [15, 25, 40];
const sums = [0, 0, 0];
let minRatio = Infinity;
for (const seed of [1, 2, 3, 4]) {
  const mine = rows.filter(r => r.seed === seed && r.turn);
  const at = t => mine.find(r => r.turn === t);
  const scores = CP.map(t => at(t).score);
  scores.forEach((s, i) => { sums[i] += s; minRatio = Math.min(minRatio, s / M4[seed][i]); });
  // workers at the start of the next turn = after resolving turn t: use row t+1's workers, else count recruits
  const workersAfter = t => { const n = mine.find(r => r.turn === t + 1); const w = (n ?? at(t)).workers; return w.untrained + w.trained + w.expert; };
  const sick = mine.reduce((a, r) => a + r.sick, 0), starved = mine.reduce((a, r) => a + r.starved, 0), rej = mine.reduce((a, r) => a + r.rejected, 0);
  const recruits = mine.reduce((a, r) => a + (r.recruited ?? 0), 0);
  console.log(`seed ${seed}: ${scores.map((s, i) => `t${CP[i]} ${s}/${M4[seed][i]} (${(s / M4[seed][i]).toFixed(2)})`).join(' | ')} | workers t15 ${workersAfter(15)} t25 ${workersAfter(25)} t40 ${workersAfter(39)} | recruited ${recruits} sick ${sick} starved ${starved} refused ${rej}`);
}
console.log(`sums t15 ${sums[0]} t25 ${sums[1]} t40 ${sums[2]} | lowest ratio ${minRatio.toFixed(3)}`);
