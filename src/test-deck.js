const fs=require('fs'), JSZip=require('jszip'), E=require('./engine.js');
(async()=>{
  const masterPath='/root/.claude/uploads/ee7243a5-01e4-5a8a-a5ff-17055303bec5/84e94d18-Master_02.pptx';
  const masterData=fs.readFileSync(masterPath);
  const probe=await JSZip.loadAsync(masterData);
  const theme=E.parseTheme(await probe.file('ppt/theme/theme1.xml').async('string'));
  const deck=JSON.parse(fs.readFileSync('deck-content.json','utf8'));
  const scenes=deck.map(d=>E.buildScene(d.template,d.content,theme));
  let bad=0;
  scenes.forEach((s,i)=>{
    const w=E.computeGate(s).filter(r=>r.status==='warn');
    if(w.length) bad++;
    console.log(`  ${String(i+1).padStart(2)} ${deck[i].template.padEnd(14)} objs=${String(s.objs.length).padStart(3)} layout="${s.layoutName}" ${w.length? 'WARN: '+w.map(x=>x.title+' ('+x.detail.replace(/^.*?Δ /,'Δ ').replace(/\.$/,'')+')').join(' | ') : 'alle pass'}`);
  });
  const zip=await E.injectIntoMaster(JSZip,masterData,scenes);
  fs.writeFileSync('deck.pptx', await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
  console.log(`\n${bad} von ${scenes.length} Folien mit WARN | deck.pptx geschrieben`);
})().catch(e=>{console.error('FAIL',e);process.exit(1);});
