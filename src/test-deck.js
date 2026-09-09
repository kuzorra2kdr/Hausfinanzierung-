const fs=require('fs'), JSZip=require('jszip'), E=require('./engine.js');
(async()=>{
  const masterPath='/root/.claude/uploads/ee7243a5-01e4-5a8a-a5ff-17055303bec5/84e94d18-Master_02.pptx';
  const masterData=fs.readFileSync(masterPath);
  const probe=await JSZip.loadAsync(masterData);
  const theme=E.parseTheme(await probe.file('ppt/theme/theme1.xml').async('string'));
  const deck=JSON.parse(fs.readFileSync('deck-content.json','utf8'));
  const logoBytes=fs.readFileSync('logo.png');
  const opts={ logo:{w:360,h:96}, footer:{left:'intern', middle:'AI & Data Delivery Hub', right:'StoryCraft · Management Pitch'} };
  const scenes=deck.map((d,i)=>E.buildScene(d.template,d.content,theme,opts,i,deck.length));
  let bad=0;
  scenes.forEach((s,i)=>{
    const w=E.computeGate(s).filter(r=>r.status==='warn');
    if(w.length){bad++; console.log(`  ${i+1} ${deck[i].template} WARN: ${w.map(x=>x.title).join(', ')}`);}
  });
  console.log(bad? '' : '  alle 10 Folien pass');
  const zip=await E.injectIntoMaster(JSZip,masterData,scenes,{bytes:logoBytes, ext:'png'});
  fs.writeFileSync('deck.pptx', await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
  console.log('deck.pptx geschrieben');
})().catch(e=>{console.error('FAIL',e);process.exit(1);});
