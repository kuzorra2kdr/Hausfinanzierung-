/* StoryCraft Engine — shared by the browser tool and the Node test harness.
   Grid + templates + icons + OOXML slide generation + master injection. */
(function(root){
"use strict";

// ---------- canvas + grid (values read off the corporate master) ----------
var G = {
  W: 13.3333, H: 7.5,
  MARGIN: 0.52, GUTTER: 0.31, COLS: 12,
  TITLE: { x:0.52, y:0.44, w:12.28, h:0.79 },
  CONTENT_TOP: 1.62, CONTENT_H: 5.36
};
G.CONTENT_BOTTOM = G.CONTENT_TOP + G.CONTENT_H;
G.COLW = (G.W - 2*G.MARGIN - (G.COLS-1)*G.GUTTER) / G.COLS;
// Safe area as the master defines it: side margins from the content placeholders,
// top from the title, bottom from the footer band.
G.SAFE = { left:G.MARGIN, right:G.W-G.MARGIN, top:0.44, bottom:7.06 };
function colX(c){ return G.MARGIN + c*(G.COLW+G.GUTTER); }
function colW(span){ return span*G.COLW + (span-1)*G.GUTTER; }

// ---------- theme defaults (overwritten when a master is loaded) ----------
var DEFAULT_THEME = {
  name: 'Deutsche Telekom – Circle (06/2021)',
  colors: { tx1:'000000', bg1:'FFFFFF', tx2:'E20074', bg2:'A3A3A3',
            accent1:'32B9AF', accent2:'A4DEEE', accent3:'ECCCBF',
            accent4:'F0E68C', accent5:'00A8E6', accent6:'6E648C' },
  fonts: { major:'TeleNeo Office ExtraBold', minor:'TeleNeo Office' }
};

// Palette roles used by the templates. Each entry is a THEME ROLE, so the
// exported XML can reference the master's theme instead of a frozen hex.
function paletteFor(theme){
  var c = theme.colors;
  return {
    ink:      { role:'tx1',     hex:c.tx1 },
    accent:   { role:'tx2',     hex:c.tx2 },
    accent2:  { role:'accent1', hex:c.accent1 },
    muted:    { role:'bg2',     hex:c.bg2 },
    onAccent: { role:'bg1',     hex:c.bg1 },
    surface:  { role:null,      hex:'F5F6F7' },
    line:     { role:null,      hex:'D9DCE0' }
  };
}

// ---------- icons: one descriptor, three renderers (SVG, OOXML, gate) ----------
var ICONS = {
  check: [ {op:'line',x1:4,y1:12.5,x2:9.5,y2:18}, {op:'line',x1:9.5,y1:18,x2:20,y2:6} ],
  'arrow-right': [ {op:'line',x1:3.5,y1:12,x2:18,y2:12}, {op:'line',x1:12,y1:6,x2:18.5,y2:12}, {op:'line',x1:12,y1:18,x2:18.5,y2:12} ],
  target: [ {op:'circle',cx:12,cy:12,r:8.5}, {op:'circle',cx:12,cy:12,r:5}, {op:'circle',cx:12,cy:12,r:1.6} ],
  'trending-up': [ {op:'line',x1:3,y1:17,x2:9,y2:11}, {op:'line',x1:9,y1:11,x2:13,y2:15}, {op:'line',x1:13,y1:15,x2:21,y2:7}, {op:'line',x1:15,y1:7,x2:21,y2:7}, {op:'line',x1:21,y1:7,x2:21,y2:13} ],
  layers: [ {op:'line',x1:12,y1:3,x2:21,y2:8}, {op:'line',x1:21,y1:8,x2:12,y2:13}, {op:'line',x1:12,y1:13,x2:3,y2:8}, {op:'line',x1:3,y1:8,x2:12,y2:3}, {op:'line',x1:4,y1:12.5,x2:12,y2:17}, {op:'line',x1:12,y1:17,x2:20,y2:12.5}, {op:'line',x1:4,y1:16,x2:12,y2:20.5}, {op:'line',x1:12,y1:20.5,x2:20,y2:16} ],
  users: [ {op:'circle',cx:9,cy:8,r:3.1}, {op:'circle',cx:17,cy:9.4,r:2.5}, {op:'rect',x:3.4,y:13.6,w:11.2,h:7.2,rx:3.6}, {op:'rect',x:14.6,y:14.4,w:7.6,h:5.8,rx:2.9} ]
};
function iconName(n){ return ICONS[n] ? n : 'check'; }
function svgFor(name, hex){
  var inner = (ICONS[name]||ICONS.check).map(function(op){
    if(op.op==='line') return '<line x1="'+op.x1+'" y1="'+op.y1+'" x2="'+op.x2+'" y2="'+op.y2+'"/>';
    if(op.op==='circle') return '<circle cx="'+op.cx+'" cy="'+op.cy+'" r="'+op.r+'"/>';
    if(op.op==='rect') return '<rect x="'+op.x+'" y="'+op.y+'" width="'+op.w+'" height="'+op.h+'" rx="'+(op.rx||0)+'"/>';
    return '';
  }).join('');
  return '<svg viewBox="0 0 24 24" fill="none" stroke="#'+hex+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+inner+'</svg>';
}

// ---------- object constructors ----------
function T(id,x,y,w,h,value,fontSize,o){
  o = o||{};
  return { id:id, type:'text', x:x, y:y, w:w, h:h, value:value==null?'':String(value), fontSize:fontSize,
    bold:!!o.bold, color:o.color||{role:'tx1',hex:'000000'}, align:o.align||'left',
    valign:o.valign||'top', leading:o.leading||1.2, mono:!!o.mono, placeholder:o.placeholder||null };
}
function Bx(id,x,y,w,h,o){
  o = o||{};
  return { id:id, type:'box', x:x, y:y, w:w, h:h, fill:o.fill, line:o.line||null,
    lineW:o.lineW||0, radius:o.radius||0, peerGroup:o.peerGroup||null, decor:!!o.decor };
}
function Ic(id,name,x,y,size,color){ return { id:id, type:'icon', name:iconName(name), x:x, y:y, w:size, h:size, color:color }; }

// ---------- templates: content in, objects out ----------
var TEMPLATES = {
  cover: {
    label:'Cover', layout:'Leer',
    defaultContent:{
      eyebrow:'AI & DATA DELIVERY HUB',
      title:'Von der Chat-Antwort\nzur Boardroom-Folie',
      subtitle:'Ein Raster ersetzt geratene Koordinaten. Dieselbe Objektliste füllt HTML-Vorschau und PowerPoint.',
      badge:['12 SPALTEN','0,52" RAND','0,31" GUTTER','MASTER-GEBUNDEN']
    },
    build:function(c,P){
      return { objs:[
        T('eyebrow', colX(0), G.MARGIN+0.1, colW(7), 0.28, c.eyebrow, 11, {bold:true, color:P.accent}),
        T('title', colX(0), 1.05, colW(8), 1.6, c.title, 34, {bold:true, color:P.ink, leading:1.15}),
        Bx('rule', colX(0), 2.90, 0.62, 0.04, {fill:P.accent2}),
        T('sub', colX(0), 3.15, colW(7), 1.0, c.subtitle, 14, {color:P.ink}),
        Bx('panel', colX(8), G.CONTENT_TOP, colW(4), G.CONTENT_H, {fill:P.accent, radius:0.16}),
        Ic('panelIcon', 'layers', colX(8)+0.45, G.CONTENT_TOP+0.55, 0.8, P.onAccent),
        T('panelTxt', colX(8)+0.45, G.CONTENT_TOP+1.75, colW(4)-0.9, 2.6, (c.badge||[]).join('\n'), 13, {bold:true, color:P.onAccent, leading:2.1})
      ]};
    }
  },
  agenda: {
    label:'Agenda', layout:'Nur Titel',
    defaultContent:{ title:'Agenda', items:[
      {label:'Ausgangslage und Zielbild'},
      {label:'Diagnose: Freihand statt Raster'},
      {label:'Raster-Engine im Test'},
      {label:'Rollout im Unternehmen'} ]},
    build:function(c,P){
      var objs = [ T('title', G.TITLE.x, G.TITLE.y, G.TITLE.w, G.TITLE.h, c.title, 40, {bold:true, color:P.ink, placeholder:'title'}) ];
      var items = c.items||[], n = items.length||1;
      var stepH = Math.min(1.3, G.CONTENT_H/Math.max(n,1));
      items.forEach(function(it,i){
        var y = G.CONTENT_TOP + i*stepH;
        objs.push(Bx('num'+i, colX(0), y, 0.62, 0.62, {fill:P.accent, radius:0.31}));
        objs.push(T('numTxt'+i, colX(0), y, 0.62, 0.62, String(i+1).padStart(2,'0'), 14, {bold:true, color:P.onAccent, align:'center', valign:'mid'}));
        objs.push(T('lbl'+i, colX(0)+0.86, y, colW(12)-1.04, 0.62, it.label, 17, {color:P.ink, valign:'mid'}));
      });
      return { objs:objs };
    }
  },
  kpi: {
    label:'Kennzahlen', layout:'Nur Titel',
    defaultContent:{
      title:'Was die Engine leistet',
      lead:'Qualität entsteht nicht durch Nachbessern am Bildschirm, sondern durch ein Raster, das Abweichungen gar nicht erst zulässt.',
      kpis:[
        {value:'21', label:'Layouts des Unternehmensmasters bleiben verknüpft', icon:'layers'},
        {value:'12', label:'Spalten, direkt aus der Master-Geometrie abgeleitet', icon:'target'},
        {value:'0', label:'Nacharbeit an Rändern und Abständen', icon:'check'} ]},
    build:function(c,P){
      var objs = [
        T('title', G.TITLE.x, G.TITLE.y, G.TITLE.w, G.TITLE.h, c.title, 40, {bold:true, color:P.ink, placeholder:'title'}),
        T('lead', colX(0), G.CONTENT_TOP, colW(12), 0.75, c.lead, 16, {color:P.ink})
      ];
      var kpis = c.kpis||[], n = kpis.length||1, span = G.COLS/n;
      var kpiY = G.CONTENT_TOP + 1.05, kpiH = 3.1;
      kpis.forEach(function(k,i){
        var x = colX(i*span), w = colW(span);
        objs.push(Bx('card'+i, x, kpiY, w, kpiH, {fill:{role:null,hex:'F5F6F7'}, line:P.line, lineW:1, radius:0.12, peerGroup:'kpi'}));
        if(k.icon){
          objs.push(Bx('ibadge'+i, x+0.3, kpiY+0.34, 0.62, 0.62, {fill:P.onAccent, line:P.line, lineW:1, radius:0.31}));
          objs.push(Ic('icon'+i, k.icon, x+0.46, kpiY+0.50, 0.30, P.accent));
        }
        objs.push(T('val'+i, x+0.3, kpiY+1.28, w-0.6, 0.7, k.value, 36, {bold:true, color:P.accent}));
        objs.push(T('lbl'+i, x+0.3, kpiY+2.12, w-0.6, 0.8, k.label, 12, {color:P.ink, leading:1.35}));
      });
      return { objs:objs };
    }
  },
  split: {
    label:'Vergleich', layout:'Nur Titel',
    defaultContent:{
      title:'Freihand vs. Raster-Engine',
      left:{ label:'Freihand — Ist-Zustand', icon:'trending-up', items:['Koordinaten pro Objekt geschätzt','Ränder wandern von Folie zu Folie','Kein Kontrast- oder Abstands-Check','Kein Bezug zum Unternehmensmaster'] },
      right:{ label:'Raster-Engine — Zielbild', icon:'check', items:['12-Spalten-Raster aus dem Master','Vorlagen bekommen Inhalt, keine Koordinaten','Gate prüft Rand, Überlappung, Kontrast','Export bleibt mit dem Master verknüpft'] } },
    build:function(c,P){
      var objs = [ T('title', G.TITLE.x, G.TITLE.y, G.TITLE.w, G.TITLE.h, c.title, 40, {bold:true, color:P.ink, placeholder:'title'}) ];
      [ {sc:0, d:c.left, tint:P.muted}, {sc:6, d:c.right, tint:P.accent2} ].forEach(function(col){
        var x = colX(col.sc), w = colW(6), d = col.d||{};
        objs.push(Bx('rule'+col.sc, x, G.CONTENT_TOP, w, 0.04, {fill:col.tint}));
        objs.push(Ic('hIcon'+col.sc, d.icon, x, G.CONTENT_TOP+0.3, 0.34, col.tint));
        objs.push(T('head'+col.sc, x+0.5, G.CONTENT_TOP+0.28, w-0.5, 0.4, d.label, 16, {bold:true, color:P.ink}));
        var rowY = G.CONTENT_TOP+1.05, rowH = 0.95;
        (d.items||[]).forEach(function(item,i){
          objs.push(T('b'+col.sc+i, x, rowY+i*rowH, w, rowH-0.1, '– '+item, 13, {color:P.ink, leading:1.3}));
        });
      });
      return { objs:objs };
    }
  },
  timeline: {
    label:'Prozess', layout:'Nur Titel',
    defaultContent:{ title:'Rollout-Prozess', steps:[
      {label:'Master verankern', icon:'layers'},
      {label:'Content statt Koordinaten', icon:'users'},
      {label:'Vorschau redigieren', icon:'trending-up'},
      {label:'Export bleibt verknüpft', icon:'check'} ]},
    build:function(c,P){
      var objs = [ T('title', G.TITLE.x, G.TITLE.y, G.TITLE.w, G.TITLE.h, c.title, 40, {bold:true, color:P.ink, placeholder:'title'}) ];
      var steps = c.steps||[], n = steps.length||1;
      var segW = colW(12)/n, nodeSize = 1.1;
      var blockH = nodeSize + 0.24 + 0.8;
      var nodeY = G.CONTENT_TOP + (G.CONTENT_H - blockH)/2;
      objs.push(Bx('track', colX(0)+nodeSize/2, nodeY+nodeSize/2-0.02, colW(12)-nodeSize, 0.04, {fill:P.line, decor:true}));
      steps.forEach(function(s,i){
        var cx = colX(0) + segW*(i+0.5);
        objs.push(Bx('node'+i, cx-nodeSize/2, nodeY, nodeSize, nodeSize, {fill:P.accent2, radius:nodeSize/2, peerGroup:'steps'}));
        objs.push(Ic('nicon'+i, s.icon, cx-nodeSize*0.25, nodeY+nodeSize*0.25, nodeSize*0.5, P.onAccent));
        objs.push(T('nlbl'+i, cx-segW/2+0.12, nodeY+nodeSize+0.24, segW-0.24, 0.8, s.label, 14, {color:P.ink, align:'center', leading:1.3}));
      });
      return { objs:objs };
    }
  },
  closing: {
    label:'Abschluss', layout:'Leer',
    defaultContent:{ title:'Bereit zum Testen', subtitle:'Gleiches Raster, gleicher Master, gleicher Export.', cta:'Content-JSON anpassen und exportieren' },
    build:function(c,P){
      return { objs:[
        T('title', colX(0), G.CONTENT_TOP+0.3, colW(8), 0.85, c.title, 34, {bold:true, color:P.ink}),
        T('sub', colX(0), G.CONTENT_TOP+1.35, colW(7), 0.6, c.subtitle, 16, {color:P.ink}),
        Bx('cta', colX(0), G.CONTENT_TOP+2.3, 5.1, 0.62, {fill:P.accent, radius:0.31}),
        T('ctaTxt', colX(0)+0.3, G.CONTENT_TOP+2.3, 5.1-0.6, 0.62, c.cta, 13, {bold:true, color:P.onAccent, valign:'mid'}),
        Bx('badge', colX(9), G.CONTENT_TOP+0.9, 2.0, 2.0, {fill:P.accent2, radius:1.0}),
        Ic('badgeIcon', 'check', colX(9)+0.65, G.CONTENT_TOP+0.9+0.65, 0.7, P.onAccent)
      ]};
    }
  }
};
var TPL_ORDER = ['cover','agenda','kpi','split','timeline','closing'];

function buildScene(tplKey, content, theme){
  var P = paletteFor(theme || DEFAULT_THEME);
  var scene = TEMPLATES[tplKey].build(content, P);
  scene.layoutName = TEMPLATES[tplKey].layout;
  scene.template = tplKey;
  return scene;
}

// ---------- quality gate (pure geometry, no DOM) ----------
function rectsOverlap(a,b){
  var ox = Math.min(a.x+a.w,b.x+b.w) - Math.max(a.x,b.x);
  var oy = Math.min(a.y+a.h,b.y+b.h) - Math.max(a.y,b.y);
  return (ox>0 && oy>0) ? ox*oy : 0;
}
function relLum(hex){
  hex = String(hex).replace('#','');
  var n = parseInt(hex,16), rgb = [(n>>16)&255,(n>>8)&255,n&255];
  function f(c){ c/=255; return c<=0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); }
  return 0.2126*f(rgb[0]) + 0.7152*f(rgb[1]) + 0.0722*f(rgb[2]);
}
function contrastRatio(h1,h2){
  var l1=relLum(h1), l2=relLum(h2), a=Math.max(l1,l2), b=Math.min(l1,l2);
  return (a+0.05)/(b+0.05);
}
function computeGate(scene){
  var rows = [], objs = scene.objs;
  var boxes = objs.filter(function(o){ return o.type==='box'; });
  var texts = objs.filter(function(o){ return o.type==='text'; });

  var worst = 0;
  objs.filter(function(o){ return o.type!=='icon' && !o.placeholder; }).forEach(function(o){
    var over = Math.max(0, (o.x+o.w)-G.SAFE.right, G.SAFE.left-o.x, (o.y+o.h)-G.SAFE.bottom, G.SAFE.top-o.y);
    if(over>worst) worst = over;
  });
  rows.push(worst>0.01
    ? {status:'warn', title:'Satzspiegel verletzt', detail:'Ein Element verlässt den Master-Satzspiegel um Δ '+worst.toFixed(2)+'".'}
    : {status:'pass', title:'Satzspiegel eingehalten', detail:'Alles bleibt im Satzspiegel des Unternehmensmasters.'});

  // Containment is intentional design (badge on a card, track behind nodes);
  // only partial overlaps of sibling shapes are a defect.
  function contains(a,b){
    return a.x<=b.x+0.01 && a.y<=b.y+0.01 && a.x+a.w>=b.x+b.w-0.01 && a.y+a.h>=b.y+b.h-0.01;
  }
  // Texts count too: a rule struck through a headline is the defect that
  // box-vs-box checking never sees.
  var collidable = objs.filter(function(o){
    return (o.type==='box' || o.type==='text') && !o.decor && !o.placeholder;
  });
  var maxOv = 0;
  for(var i=0;i<collidable.length;i++) for(var j=i+1;j<collidable.length;j++){
    var A = collidable[i], B = collidable[j];
    if(contains(A,B) || contains(B,A)) continue;
    var ov = rectsOverlap(A,B);
    if(ov>maxOv) maxOv = ov;
  }
  rows.push(maxOv>0.005
    ? {status:'warn', title:'Überlappung erkannt', detail:'Zwei Flächen überschneiden sich um Δ '+maxOv.toFixed(2)+' in².'}
    : {status:'pass', title:'Keine Überlappung', detail:'Flächen berühren sich höchstens an der Kante.'});

  var groups = {}, alignWarn = null;
  boxes.forEach(function(o){ if(o.peerGroup){ (groups[o.peerGroup]=groups[o.peerGroup]||[]).push(o); } });
  Object.keys(groups).forEach(function(g){
    var arr=groups[g], ys=arr.map(function(o){return o.y;}), hs=arr.map(function(o){return o.h;});
    var dy=Math.max.apply(null,ys)-Math.min.apply(null,ys), dh=Math.max.apply(null,hs)-Math.min.apply(null,hs);
    if(dy>0.01||dh>0.01) alignWarn={dy:dy,dh:dh};
  });
  rows.push(alignWarn
    ? {status:'warn', title:'Peers nicht bündig', detail:'Oberkanten Δ '+alignWarn.dy.toFixed(2)+'", Höhen Δ '+alignWarn.dh.toFixed(2)+'".'}
    : {status:'pass', title:'Peers schließen bündig ab', detail:'Gleiche Oberkante und Höhe je Gruppe.'});

  var worstRatio = 99;
  texts.forEach(function(t){
    var bg = 'FFFFFF';
    boxes.forEach(function(b){
      if(t.x>=b.x-0.01 && t.y>=b.y-0.01 && (t.x+t.w)<=(b.x+b.w+0.01) && (t.y+t.h)<=(b.y+b.h+0.01)) bg = b.fill.hex;
    });
    var ratio = contrastRatio(t.color.hex, bg);
    var large = t.fontSize>=18 || (t.bold && t.fontSize>=14);
    if(ratio < (large?3:4.5) && ratio<worstRatio) worstRatio = ratio;
  });
  rows.push(worstRatio<99
    ? {status:'warn', title:'Kontrast zu niedrig', detail:'Schwächster Text erreicht nur '+worstRatio.toFixed(1)+':1 (nötig 4,5:1).'}
    : {status:'pass', title:'Kontrast ausreichend', detail:'Alle Textfarben erreichen den WCAG-Mindestwert.'});

  return rows;
}

// ---------- OOXML generation ----------
var EMU = 914400;
function emu(inch){ return Math.round(inch*EMU); }
function xesc(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/\r/g,'');
}
// A color is {role, hex}: prefer the master's theme role so the deck follows
// the corporate theme; fall back to a literal hex when there is no role.
function fillClr(c){
  if(c && c.role) return '<a:schemeClr val="'+c.role+'"/>';
  return '<a:srgbClr val="'+((c&&c.hex)||'000000')+'"/>';
}
function xfrm(o){
  return '<a:xfrm><a:off x="'+emu(o.x)+'" y="'+emu(o.y)+'"/><a:ext cx="'+emu(Math.max(o.w,0.01))+'" cy="'+emu(Math.max(o.h,0.01))+'"/></a:xfrm>';
}
function geomFor(o){
  if(o.radius && o.radius>0){
    var adj = Math.round(Math.min(0.5, o.radius/Math.min(o.w,o.h))*100000);
    return '<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val '+adj+'"/></a:avLst></a:prstGeom>';
  }
  return '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>';
}
function boxXml(o,id){
  var ln = o.lineW ? '<a:ln w="'+Math.round(o.lineW*12700)+'"><a:solidFill>'+fillClr(o.line||o.fill)+'</a:solidFill></a:ln>' : '<a:ln><a:noFill/></a:ln>';
  return '<p:sp><p:nvSpPr><p:cNvPr id="'+id+'" name="'+xesc(o.id||('Form '+id))+'"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>'
    + '<p:spPr>'+xfrm(o)+geomFor(o)+'<a:solidFill>'+fillClr(o.fill)+'</a:solidFill>'+ln+'</p:spPr>'
    + '<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="de-DE"/></a:p></p:txBody></p:sp>';
}
function runsXml(o){
  var lines = String(o.value==null?'':o.value).split('\n');
  var algn = o.align==='center' ? 'ctr' : (o.align==='right' ? 'r' : 'l');
  return lines.map(function(line){
    var pPr = '<a:pPr algn="'+algn+'"><a:lnSpc><a:spcPct val="'+Math.round((o.leading||1.2)*100000)+'"/></a:lnSpc></a:pPr>';
    if(line === '') return '<a:p>'+pPr+'<a:endParaRPr lang="de-DE" sz="'+Math.round(o.fontSize*100)+'"/></a:p>';
    return '<a:p>'+pPr+'<a:r><a:rPr lang="de-DE" sz="'+Math.round(o.fontSize*100)+'" b="'+(o.bold?1:0)+'" dirty="0">'
      + '<a:solidFill>'+fillClr(o.color)+'</a:solidFill>'
      + '<a:latin typeface="'+(o.bold?'+mj-lt':'+mn-lt')+'"/></a:rPr>'
      + '<a:t xml:space="preserve">'+xesc(line)+'</a:t></a:r></a:p>';
  }).join('');
}
function textXml(o,id){
  var anchor = o.valign==='mid' ? 'ctr' : 't';
  // A title marked as placeholder inherits position and styling from the layout,
  // so it stays a real PowerPoint title (outline, master-driven formatting).
  if(o.placeholder === 'title'){
    return '<p:sp><p:nvSpPr><p:cNvPr id="'+id+'" name="Titel '+id+'"/>'
      + '<p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>'
      + '<p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>'
      + String(o.value).split('\n').map(function(line){
          return '<a:p><a:r><a:rPr lang="de-DE" dirty="0"/><a:t xml:space="preserve">'+xesc(line)+'</a:t></a:r></a:p>';
        }).join('')
      + '</p:txBody></p:sp>';
  }
  return '<p:sp><p:nvSpPr><p:cNvPr id="'+id+'" name="'+xesc(o.id||('Text '+id))+'"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>'
    + '<p:spPr>'+xfrm(o)+'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>'
    + '<p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" anchor="'+anchor+'"><a:noAutofit/></a:bodyPr>'
    + '<a:lstStyle/>'+runsXml(o)+'</p:txBody></p:sp>';
}
function strokeShape(id,name,x,y,w,h,geom,color,flipV){
  return '<p:sp><p:nvSpPr><p:cNvPr id="'+id+'" name="'+xesc(name)+'"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>'
    + '<p:spPr><a:xfrm'+(flipV?' flipV="1"':'')+'><a:off x="'+emu(x)+'" y="'+emu(y)+'"/><a:ext cx="'+emu(Math.max(w,0.008))+'" cy="'+emu(Math.max(h,0.008))+'"/></a:xfrm>'
    + geom + '<a:noFill/>'
    + '<a:ln w="19050" cap="rnd"><a:solidFill>'+fillClr(color)+'</a:solidFill><a:round/></a:ln></p:spPr>'
    + '<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="de-DE"/></a:p></p:txBody></p:sp>';
}
function iconXml(o, startId){
  var ops = ICONS[o.name]||ICONS.check, s = o.w/24, out = [], id = startId;
  ops.forEach(function(op,k){
    if(op.op==='line'){
      var X1=o.x+op.x1*s, Y1=o.y+op.y1*s, X2=o.x+op.x2*s, Y2=o.y+op.y2*s;
      out.push(strokeShape(id++, o.name+'-l'+k, Math.min(X1,X2), Math.min(Y1,Y2),
        Math.abs(X2-X1), Math.abs(Y2-Y1),
        '<a:prstGeom prst="line"><a:avLst/></a:prstGeom>', o.color, (Y2<Y1)!==(X2<X1) ? true : false));
    } else if(op.op==='circle'){
      var cx=o.x+op.cx*s, cy=o.y+op.cy*s, r=op.r*s;
      out.push(strokeShape(id++, o.name+'-c'+k, cx-r, cy-r, r*2, r*2,
        '<a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom>', o.color, false));
    } else if(op.op==='rect'){
      var rw=op.w*s, rh=op.h*s;
      var adj = op.rx ? Math.round(Math.min(0.5, (op.rx*s)/Math.min(rw,rh))*100000) : 0;
      var geom = op.rx
        ? '<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val '+adj+'"/></a:avLst></a:prstGeom>'
        : '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>';
      out.push(strokeShape(id++, o.name+'-r'+k, o.x+op.x*s, o.y+op.y*s, rw, rh, geom, o.color, false));
    }
  });
  // One group per icon, so it moves and scales as a single object in PowerPoint.
  var gx = emu(o.x), gy = emu(o.y), gw = emu(o.w), gh = emu(o.h);
  var xml = '<p:grpSp><p:nvGrpSpPr><p:cNvPr id="'+(id++)+'" name="Piktogramm '+xesc(o.name)+'"/>'
    + '<p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'
    + '<p:grpSpPr><a:xfrm><a:off x="'+gx+'" y="'+gy+'"/><a:ext cx="'+gw+'" cy="'+gh+'"/>'
    + '<a:chOff x="'+gx+'" y="'+gy+'"/><a:chExt cx="'+gw+'" cy="'+gh+'"/></a:xfrm></p:grpSpPr>'
    + out.join('') + '</p:grpSp>';
  return { xml: xml, nextId: id };
}
function buildSlideXml(scene){
  var id = 2, parts = [];
  scene.objs.forEach(function(o){
    if(o.type==='box'){ parts.push(boxXml(o,id++)); }
    else if(o.type==='text'){ parts.push(textXml(o,id++)); }
    else if(o.type==='icon'){ var r = iconXml(o,id); parts.push(r.xml); id = r.nextId; }
  });
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
    + '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"'
    + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
    + ' xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
    + '<p:cSld><p:spTree>'
    + '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'
    + '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'
    + parts.join('')
    + '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>';
}

// ---------- master parsing ----------
function parseTheme(themeXml){
  var theme = { name:'', colors:{}, fonts:{} };
  var nm = themeXml.match(/name="([^"]*)"/);
  theme.name = nm ? nm[1] : '';
  var cs = themeXml.match(/<a:clrScheme[\s\S]*?<\/a:clrScheme>/);
  if(cs){
    ['dk1','lt1','dk2','lt2','accent1','accent2','accent3','accent4','accent5','accent6'].forEach(function(role){
      var m = cs[0].match(new RegExp('<a:'+role+'>([\\s\\S]*?)</a:'+role+'>'));
      if(m){
        var c = m[1].match(/(?:srgbClr val="|lastClr=")([0-9A-Fa-f]{6})/);
        if(c) theme.colors[role] = c[1].toUpperCase();
      }
    });
  }
  // slide-context names via the standard colour map
  var c = theme.colors;
  theme.colors = {
    tx1:c.dk1||'000000', bg1:c.lt1||'FFFFFF', tx2:c.dk2||'E20074', bg2:c.lt2||'A3A3A3',
    accent1:c.accent1||'32B9AF', accent2:c.accent2||'A4DEEE', accent3:c.accent3||'ECCCBF',
    accent4:c.accent4||'F0E68C', accent5:c.accent5||'00A8E6', accent6:c.accent6||'6E648C'
  };
  var fs = themeXml.match(/<a:fontScheme[\s\S]*?<\/a:fontScheme>/);
  if(fs){
    var mj = fs[0].match(/<a:majorFont>\s*<a:latin typeface="([^"]*)"/);
    var mn = fs[0].match(/<a:minorFont>\s*<a:latin typeface="([^"]*)"/);
    theme.fonts = { major: mj?mj[1]:'', minor: mn?mn[1]:'' };
  }
  return theme;
}
function parseLayoutName(layoutXml){
  var m = layoutXml.match(/<p:cSld[^>]*name="([^"]*)"/);
  return m ? m[1] : '';
}

// ---------- master injection ----------
// Writes the generated slides into the ORIGINAL master package, so the result
// keeps its theme, all layouts, fonts, footers and slide numbers.
async function injectIntoMaster(JSZip, masterData, scenes){
  var zip = await JSZip.loadAsync(masterData);

  // map layout name -> part name
  var layouts = {};
  var layoutFiles = Object.keys(zip.files).filter(function(p){ return /^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(p); });
  for(var i=0;i<layoutFiles.length;i++){
    var lx = await zip.file(layoutFiles[i]).async('string');
    layouts[parseLayoutName(lx)] = layoutFiles[i];
  }

  // drop the master file's own sample slides and their notes
  Object.keys(zip.files).forEach(function(p){
    if(/^ppt\/slides\/slide\d+\.xml$/.test(p) || /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/.test(p)
       || /^ppt\/notesSlides\//.test(p)) zip.remove(p);
  });

  var ct = await zip.file('[Content_Types].xml').async('string');
  ct = ct.replace(/<Override PartName="\/ppt\/slides\/slide\d+\.xml"[^>]*\/>/g, '')
         .replace(/<Override PartName="\/ppt\/notesSlides\/[^"]*"[^>]*\/>/g, '');

  var prels = await zip.file('ppt/_rels/presentation.xml.rels').async('string');
  prels = prels.replace(/<Relationship[^>]*Target="slides\/slide\d+\.xml"[^>]*\/>/g, '');
  var maxRid = 0;
  prels.replace(/Id="rId(\d+)"/g, function(_,n){ maxRid = Math.max(maxRid, parseInt(n,10)); return _; });

  var sldIds = [], ctAdds = [], relAdds = [];
  for(var s=0;s<scenes.length;s++){
    var scene = scenes[s], n = s+1;
    var layoutPart = layouts[scene.layoutName] || layouts['Leer'] || layoutFiles[0];
    var rid = 'rId' + (maxRid + 1 + s);

    zip.file('ppt/slides/slide'+n+'.xml', buildSlideXml(scene));
    zip.file('ppt/slides/_rels/slide'+n+'.xml.rels',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../'
      + layoutPart.replace('ppt/','') + '"/></Relationships>');

    ctAdds.push('<Override PartName="/ppt/slides/slide'+n+'.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>');
    relAdds.push('<Relationship Id="'+rid+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide'+n+'.xml"/>');
    sldIds.push('<p:sldId id="'+(256+s)+'" r:id="'+rid+'"/>');
  }

  zip.file('[Content_Types].xml', ct.replace('</Types>', ctAdds.join('')+'</Types>'));
  zip.file('ppt/_rels/presentation.xml.rels', prels.replace('</Relationships>', relAdds.join('')+'</Relationships>'));

  var pres = await zip.file('ppt/presentation.xml').async('string');
  pres = pres.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, '<p:sldIdLst>'+sldIds.join('')+'</p:sldIdLst>');
  zip.file('ppt/presentation.xml', pres);

  // Media that only the removed sample slides referenced would otherwise stay
  // behind as orphans, which PowerPoint reports as a damaged file.
  var relFiles = Object.keys(zip.files).filter(function(p){ return /\.rels$/.test(p); });
  var referenced = {};
  for(var r=0;r<relFiles.length;r++){
    var rx = await zip.file(relFiles[r]).async('string');
    (rx.match(/Target="[^"]*media\/[^"]+"/g)||[]).forEach(function(t){
      referenced[t.replace(/.*media\//,'').replace(/"$/,'')] = true;
    });
  }
  Object.keys(zip.files).forEach(function(p){
    var m = p.match(/^ppt\/media\/(.+)$/);
    if(m && !referenced[m[1]]) zip.remove(p);
  });

  return zip;
}

var API = { G:G, colX:colX, colW:colW, DEFAULT_THEME:DEFAULT_THEME, paletteFor:paletteFor,
  ICONS:ICONS, svgFor:svgFor, iconName:iconName, TEMPLATES:TEMPLATES, TPL_ORDER:TPL_ORDER,
  buildScene:buildScene, computeGate:computeGate, contrastRatio:contrastRatio,
  buildSlideXml:buildSlideXml, injectIntoMaster:injectIntoMaster,
  parseTheme:parseTheme, parseLayoutName:parseLayoutName };

if(typeof module !== 'undefined' && module.exports){ module.exports = API; }
root.StoryCraft = API;

})(typeof globalThis !== 'undefined' ? globalThis : this);
