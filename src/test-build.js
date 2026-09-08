const fs = require('fs');
const JSZip = require('jszip');
const E = require('./engine.js');

(async () => {
  const masterPath = '/root/.claude/uploads/ee7243a5-01e4-5a8a-a5ff-17055303bec5/84e94d18-Master_02.pptx';
  const masterData = fs.readFileSync(masterPath);

  // read the theme straight out of the master, exactly as the browser tool will
  const probe = await JSZip.loadAsync(masterData);
  const themeXml = await probe.file('ppt/theme/theme1.xml').async('string');
  const theme = E.parseTheme(themeXml);
  console.log('theme:', theme.name, JSON.stringify(theme.colors), JSON.stringify(theme.fonts));

  const scenes = E.TPL_ORDER.map(k => E.buildScene(k, E.TEMPLATES[k].defaultContent, theme));
  scenes.forEach((s,i) => {
    const gate = E.computeGate(s);
    const warn = gate.filter(r => r.status === 'warn');
    console.log(`slide ${i+1} ${E.TPL_ORDER[i].padEnd(9)} layout="${s.layoutName}" objs=${s.objs.length} gate=${warn.length ? 'WARN: '+warn.map(w=>w.title).join(', ') : 'all pass'}`);
  });

  const zip = await E.injectIntoMaster(JSZip, masterData, scenes);
  const buf = await zip.generateAsync({ type:'nodebuffer', compression:'DEFLATE' });
  fs.writeFileSync('out.pptx', buf);
  console.log('wrote out.pptx', (buf.length/1024/1024).toFixed(2), 'MB');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
