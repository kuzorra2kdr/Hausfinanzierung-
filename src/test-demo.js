const fs=require('fs'), JSZip=require('jszip'), E=require('./engine.js');
(async()=>{
  const mp='/root/.claude/uploads/ee7243a5-01e4-5a8a-a5ff-17055303bec5/84e94d18-Master_02.pptx';
  const md=fs.readFileSync(mp);
  const theme=E.parseTheme(await (await JSZip.loadAsync(md)).file('ppt/theme/theme1.xml').async('string'));
  const demo=JSON.parse(fs.readFileSync('demo-content.json','utf8'));
  const opts={footer:{left:'intern',middle:'AI & Data Delivery Hub',right:'StoryCraft · Demo'}};
  const scenes=demo.map((d,i)=>E.buildScene(d.template,d.content,theme,opts,i,demo.length));
  let bad=0;
  scenes.forEach((s,i)=>{
    const w=E.computeGate(s).filter(r=>r.status==='warn');
    if(w.length){bad++;console.log(`  ${i+1} ${demo[i].template.padEnd(10)} WARN: ${w.map(x=>x.title+' — '+x.detail).join(' | ')}`);}
    else console.log(`  ${i+1} ${demo[i].template.padEnd(10)} objs=${String(s.objs.length).padStart(3)} pass`);
  });
  const zip=await E.injectIntoMaster(JSZip,md,scenes,null);
  fs.writeFileSync('demo.pptx', await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
  console.log(`\n${bad} mit WARN | demo.pptx geschrieben`);
})().catch(e=>{console.error('FAIL',e);process.exit(1);});
