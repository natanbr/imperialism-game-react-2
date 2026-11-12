// Per-turn lines of a probe run: node show.mjs <probe-out.json> [seeds, e.g. 1,2]
import { readFileSync } from 'node:fs';
const rows = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const seeds = process.argv[3] ? process.argv[3].split(',').map(Number) : [1];
for (const r of rows) {
  if (!seeds.includes(r.seed)) continue;
  if (r.totalMade) { console.log('TOTAL', r.seed, JSON.stringify(r.totalMade), 'sold$', r.totalSold); continue; }
  const w = r.workers; const st = r.stock;
  const g = r.gathered || {};
  console.log(`s${r.seed} t${String(r.turn).padStart(2)} w ${w.untrained}/${w.trained}/${w.expert} lab ${r.labour} left ${r.labourLeft} cap ${r.cap} made ${r.unitsMade} ${JSON.stringify(r.producedNow)} cars ${r.cars} gath ${r.gatheredTotal} ${JSON.stringify(g)} | coal ${st.coal} iron ${st.ironOre} timb ${st.timber} cot ${st.cotton} wool ${st.wool} gr ${st.grain} fr ${st.fruit} lv ${st.livestock} cf ${st.cannedFood} clo ${st.clothing} fur ${st.furniture} lum ${st.lumber} stl ${st.steel} fab ${st.fabric} pap ${st.paper} | $${r.treasury} sc ${r.score} sick ${r.sick} rej ${r.rejected}`);
}
