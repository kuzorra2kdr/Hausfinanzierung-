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
function mixWhite(hex, w){
  var n = parseInt(hex,16), r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  function m(c){ return Math.round(c*(1-w) + 255*w); }
  return ((1<<24) + (m(r)<<16) + (m(g)<<8) + m(b)).toString(16).slice(1).toUpperCase();
}
function darken(hex, f){
  var n = parseInt(hex,16), r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  return ((1<<24) + (Math.round(r*f)<<16) + (Math.round(g*f)<<8) + Math.round(b*f)).toString(16).slice(1).toUpperCase();
}
// Every role maps to the master's theme where one exists, so a master update
// pulls the deck along. Tints and text-safe variants are derived, not frozen.
function paletteFor(theme){
  var c = theme.colors;
  return {
    ink:            { role:'tx1',     hex:c.tx1 },
    onAccent:       { role:'bg1',     hex:c.bg1 },
    accent:         { role:'tx2',     hex:c.tx2 },
    accentDark:     { role:null,      hex:darken(c.tx2, 0.82) },
    accent2:        { role:'accent1', hex:c.accent1 },
    accent2Dark:    { role:null,      hex:darken(c.accent1, 0.55) },
    soft:           { role:null,      hex:'4B525C' },
    line:           { role:null,      hex:'D9DCE0' },
    surface:        { role:null,      hex:'F5F6F7' },
    surfaceAccent:  { role:null,      hex:mixWhite(c.tx2, 0.94) },
    surfaceAccent2: { role:null,      hex:mixWhite(c.accent1, 0.90) },
    accentLine:     { role:null,      hex:mixWhite(c.tx2, 0.72) },
    accent2Line:    { role:null,      hex:mixWhite(c.accent1, 0.62) }
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
// One deterministic title fit, used identically by preview and export.
// This replaces the four measuring engines of v58 that raced each other.
var TITLE_LEADING = 1.12;
function fitTitleSize(text, widthIn, maxHeightIn){
  var sizes = [40,36,32,28,26,24], s = String(text||'');
  for(var i=0;i<sizes.length;i++){
    var fs = sizes[i];
    var perLine = Math.floor(widthIn*72 / (fs*0.52));
    var lines = Math.max(1, Math.ceil(s.length / Math.max(perLine,1)));
    var h = lines * fs * TITLE_LEADING / 72;
    if(lines<=2 && h<=maxHeightIn) return { size:fs, lines:lines, h:h };
  }
  return { size:24, lines:2, h:2*24*TITLE_LEADING/72 };
}
// Header block: title placeholder + subtitle. Returns where content may start.
function header(c, P, objs){
  var f = fitTitleSize(c.title, G.TITLE.w, 1.02);
  var boxH = Math.max(G.TITLE.h, f.h * 1.10);
  objs.push(T('title', G.TITLE.x, G.TITLE.y, G.TITLE.w, boxH,
    c.title, f.size, {bold:true, color:P.ink, leading:TITLE_LEADING, placeholder:'title'}));
  var y = G.TITLE.y + boxH + 0.04;
  if(c.subtitle){
    objs.push(T('sub', G.TITLE.x, y, colW(11), 0.40, c.subtitle, 13, {color:P.soft, leading:1.25}));
    y += 0.52;
  }
  return Math.max(G.CONTENT_TOP, y);
}
function noteBar(objs, P, text, top, id){
  if(!text) return top;
  var h = 0.62;
  var y = G.CONTENT_BOTTOM - h;
  objs.push(Bx((id||'note')+'Bg', colX(0), y, colW(12), h, {fill:P.surface, line:P.line, lineW:1, radius:0.1}));
  objs.push(Bx((id||'note')+'Mark', colX(0), y, 0.06, h, {fill:P.accent, decor:true}));
  objs.push(T((id||'note')+'Txt', colX(0)+0.26, y+0.06, colW(12)-0.5, h-0.12, text, 11.5, {color:P.ink, valign:'mid', leading:1.3}));
  return y - 0.24;
}
function toneFill(tone, P){
  if(tone==='accent') return { bg:P.surfaceAccent, line:P.accentLine, ink:P.ink, kicker:P.accentDark, icon:P.accent };
  if(tone==='accent2') return { bg:P.surfaceAccent2, line:P.accent2Line, ink:P.ink, kicker:P.accent2Dark, icon:P.accent2Dark };
  if(tone==='dark') return { bg:P.ink, line:P.ink, ink:P.onAccent, kicker:P.onAccent, icon:P.onAccent };
  return { bg:P.surface, line:P.line, ink:P.ink, kicker:P.soft, icon:P.accent };
}
var STEP_ICONS = ['users','layers','target','check'];

var TEMPLATES = {
  cover: {
    label:'Cover', layout:'Leer',
    build:function(c,P){
      var objs = [
        T('eyebrow', colX(0), 1.15, colW(7), 0.3, c.eyebrow, 11.5, {bold:true, color:P.accent}),
        T('title', colX(0), 1.62, colW(7), 1.15, c.title, 54, {bold:true, color:P.ink}),
        Bx('rule', colX(0), 3.02, 0.7, 0.05, {fill:P.accent2}),
        T('lead', colX(0), 3.35, colW(6), 0.9, c.lead, 15, {color:P.ink, leading:1.35}),
        T('meta', colX(0), 4.55, colW(6), 0.3, (c.meta||[]).join('   ·   '), 11.5, {color:P.soft}),
        Bx('panel', colX(7), 1.62, colW(5), 3.52, {fill:P.accent, radius:0.18}),
        Bx('mark', colX(7)+0.45, 2.0, 0.8, 0.8, {fill:P.onAccent, radius:0.16}),
        T('markTxt', colX(7)+0.45, 2.0, 0.8, 0.8, c.panelMark, 22, {bold:true, color:P.accent, align:'center', valign:'mid'}),
        T('panelStrong', colX(7)+0.45, 3.02, colW(5)-0.9, 0.5, c.panelStrong, 19, {bold:true, color:P.onAccent}),
        T('panelText', colX(7)+0.45, 3.62, colW(5)-0.9, 0.9, c.panelText, 13, {color:P.onAccent, leading:1.35})
      ];
      return { objs:objs };
    }
  },

  summary: {
    label:'Summary', layout:'Nur Titel',
    build:function(c,P){
      var objs = [], top = header(c,P,objs);
      objs.push(Bx('badge', colX(0), top, colW(2), 1.5, {fill:P.accent, radius:0.14}));
      objs.push(T('badgeNum', colX(0), top+0.12, colW(2), 0.95, c.badgeNum, 46, {bold:true, color:P.onAccent, align:'center'}));
      objs.push(T('badgeLbl', colX(0), top+1.62, colW(2), 0.9, c.badgeLabel, 11.5, {color:P.soft, leading:1.3}));
      var items = c.items||[], n = items.length||1;
      var listX = colX(2.4), listW = colW(9.6);
      var rowH = (G.CONTENT_BOTTOM - top) / n;
      items.forEach(function(it,i){
        var y = top + i*rowH;
        if(i>0) objs.push(Bx('sep'+i, listX, y-0.02, listW, 0.012, {fill:P.line, decor:true}));
        objs.push(T('n'+i, listX, y+0.14, 0.42, 0.3, it.n, 12, {bold:true, color:it.emphasis?P.accent:P.soft}));
        objs.push(T('s'+i, listX+0.58, y+0.10, listW-0.58, 0.32, it.strong, 14, {bold:true, color:P.ink}));
        objs.push(T('p'+i, listX+0.58, y+0.46, listW-0.58, rowH-0.56, it.text, 11.5, {color:P.soft, leading:1.3}));
      });
      return { objs:objs };
    }
  },

  statement: {
    label:'Statement', layout:'Nur Titel',
    build:function(c,P){
      var objs = [], top = header(c,P,objs);
      var lw = colW(6);
      objs.push(T('eyebrow', colX(0), top, lw, 0.28, String(c.eyebrow||'').toUpperCase(), 10.5, {bold:true, color:P.accent}));
      objs.push(T('head', colX(0), top+0.42, lw, 0.78, c.headline, 30, {bold:true, color:P.ink, leading:1.12}));
      objs.push(T('headAcc', colX(0), top+1.24, lw, 1.15, c.headlineAccent, 30, {bold:true, color:P.accent, leading:1.12}));
      objs.push(T('text', colX(0), top+2.62, lw, 1.1, c.text, 13.5, {color:P.ink, leading:1.4}));
      var proofs = c.proofs||[], n = proofs.length||1;
      var ph = (G.CONTENT_BOTTOM - top - (n-1)*0.18) / n;
      proofs.forEach(function(p,i){
        var tone = toneFill(p.muted ? 'default' : 'accent', P);
        var y = top + i*(ph+0.18), x = colX(6.4), w = colW(5.6);
        objs.push(Bx('pc'+i, x, y, w, ph, {fill:tone.bg, line:tone.line, lineW:1, radius:0.1, peerGroup:'proof'}));
        objs.push(Bx('pm'+i, x, y, 0.07, ph, {fill:p.muted?P.line:P.accent, decor:true}));
        objs.push(Ic('pi'+i, STEP_ICONS[i%STEP_ICONS.length], x+0.28, y+0.2, 0.3, tone.icon));
        objs.push(T('pb'+i, x+0.72, y+0.18, w-0.95, 0.32, p.b, 13, {bold:true, color:P.ink}));
        objs.push(T('pt'+i, x+0.72, y+0.56, w-0.95, ph-0.7, p.text, 11.5, {color:P.soft, leading:1.3}));
      });
      return { objs:objs };
    }
  },

  flow4: {
    label:'Prozess', layout:'Nur Titel',
    build:function(c,P){
      var objs = [], top = header(c,P,objs);
      var bottom = noteBar(objs, P, c.note, top, 'note');
      var steps = c.steps||[], n = steps.length||1, span = G.COLS/n;
      var h = bottom - top;
      steps.forEach(function(st,i){
        var x = colX(i*span), w = colW(span), tone = toneFill(st.tone, P);
        objs.push(Bx('sc'+i, x, top, w, h, {fill:tone.bg, line:tone.line, lineW:1, radius:0.12, peerGroup:'step'}));
        objs.push(Bx('sn'+i, x+0.24, top+0.22, 0.42, 0.42, {fill:st.tone==='dark'?P.onAccent:P.ink, radius:0.21}));
        objs.push(T('snt'+i, x+0.24, top+0.22, 0.42, 0.42, st.n, 12, {bold:true, color:st.tone==='dark'?P.ink:P.onAccent, align:'center', valign:'mid'}));
        objs.push(Ic('si'+i, STEP_ICONS[i%STEP_ICONS.length], x+w-0.62, top+0.26, 0.34, tone.icon));
        objs.push(T('sk'+i, x+0.24, top+0.86, w-0.48, 0.26, String(st.kicker||'').toUpperCase(), 9.5, {bold:true, color:tone.kicker}));
        objs.push(T('sh'+i, x+0.24, top+1.18, w-0.48, 0.6, st.h3, 15, {bold:true, color:tone.ink, leading:1.15}));
        objs.push(T('sp'+i, x+0.24, top+1.86, w-0.48, h-2.1, st.text, 11, {color:st.tone==='dark'?P.onAccent:P.soft, leading:1.3}));
        if(i < n-1) objs.push(T('ar'+i, x+w, top+h/2-0.16, G.GUTTER, 0.32, '›', 17, {color:P.soft, align:'center', valign:'mid'}));
      });
      return { objs:objs };
    }
  },

  grid3: {
    label:'Drei Karten', layout:'Nur Titel',
    build:function(c,P){
      var objs = [], top = header(c,P,objs);
      var bottom = G.CONTENT_BOTTOM;
      if(c.callout){
        var cy = G.CONTENT_BOTTOM - 0.66;
        objs.push(Bx('coBg', colX(0), cy, colW(12), 0.66, {fill:P.surfaceAccent2, line:P.accent2Line, lineW:1, radius:0.33}));
        objs.push(Bx('coB', colX(0)+0.14, cy+0.12, 0.42, 0.42, {fill:P.accent2Dark, radius:0.21}));
        objs.push(T('coBt', colX(0)+0.14, cy+0.12, 0.42, 0.42, c.calloutBubble||'AI', 10.5, {bold:true, color:P.onAccent, align:'center', valign:'mid'}));
        objs.push(T('coTxt', colX(0)+0.74, cy, colW(12)-0.95, 0.66, c.callout, 13, {bold:true, color:P.ink, valign:'mid'}));
        bottom = cy - 0.26;
      }
      var cards = c.cards||[], n = cards.length||1, span = G.COLS/n, h = bottom - top;
      cards.forEach(function(cd,i){
        var x = colX(i*span), w = colW(span), tone = toneFill(cd.tone, P);
        objs.push(Bx('c'+i, x, top, w, h, {fill:tone.bg, line:tone.line, lineW:1, radius:0.12, peerGroup:'card'}));
        objs.push(Ic('ci'+i, STEP_ICONS[i%STEP_ICONS.length], x+0.3, top+0.3, 0.36, tone.icon));
        objs.push(T('ck'+i, x+0.3, top+0.86, w-0.6, 0.26, String(cd.kicker||'').toUpperCase(), 9.5, {bold:true, color:tone.kicker}));
        objs.push(T('ch'+i, x+0.3, top+1.2, w-0.6, 0.72, cd.h3, 17, {bold:true, color:tone.ink, leading:1.15}));
        objs.push(T('cp'+i, x+0.3, top+2.04, w-0.6, h-2.3, cd.text, 12, {color:cd.tone==='dark'?P.onAccent:P.soft, leading:1.35}));
      });
      return { objs:objs };
    }
  },

  visionFactors: {
    label:'Prinzip', layout:'Nur Titel',
    build:function(c,P){
      var objs = [], top = header(c,P,objs);
      var bottom = noteBar(objs, P, c.note, top, 'note');
      var h = bottom - top;
      var tx = colX(0), tw = colW(5);
      objs.push(Bx('tile', tx, top, tw, h, {fill:P.surfaceAccent2, line:P.accent2Line, lineW:1, radius:0.14}));
      objs.push(Bx('pill', tx+0.3, top+0.3, 2.5, 0.34, {fill:P.accent2Dark, radius:0.17}));
      objs.push(T('pillT', tx+0.3, top+0.3, 2.5, 0.34, c.tilePill, 9.5, {bold:true, color:P.onAccent, align:'center', valign:'mid'}));
      objs.push(T('pre', tx+0.3, top+0.86, tw-0.6, 0.26, c.tilePre, 10, {bold:true, color:P.soft}));
      objs.push(T('tileH', tx+0.3, top+1.2, tw-0.6, 0.9, c.tileH3, 22, {bold:true, color:P.ink, leading:1.15}));
      objs.push(T('tileP', tx+0.3, top+2.24, tw-0.6, h-2.5, c.tileText, 12.5, {color:P.soft, leading:1.35}));
      var fx = colX(5.4), fw = colW(6.6);
      var factors = c.factors||[], n = factors.length||1;
      var fh = (h - (n-1)*0.16) / n;
      factors.forEach(function(f,i){
        var y = top + i*(fh+0.16), tone = toneFill(f.tone==='accent2'?'accent2':'default', P);
        objs.push(Bx('f'+i, fx, y, fw, fh, {fill:tone.bg, line:tone.line, lineW:1, radius:0.1, peerGroup:'factor'}));
        objs.push(Ic('fi'+i, STEP_ICONS[i%STEP_ICONS.length], fx+0.28, y+0.26, 0.34, tone.icon));
        objs.push(T('fh'+i, fx+0.78, y+0.22, fw-1.05, 0.34, f.h4, 14, {bold:true, color:P.ink}));
        objs.push(T('fp'+i, fx+0.78, y+0.62, fw-1.05, fh-0.8, f.text, 11.5, {color:P.soft, leading:1.3}));
      });
      return { objs:objs };
    }
  },

  techGrid: {
    label:'Baukasten', layout:'Nur Titel',
    build:function(c,P){
      var objs = [], top = header(c,P,objs);
      var h = G.CONTENT_BOTTOM - top;
      var kpis = c.kpis||[], cellW = colW(3.4), gapX = 0.24, cellH = (h-0.22)/2;
      kpis.slice(0,4).forEach(function(k,i){
        var col = i%2, row = Math.floor(i/2);
        var x = colX(col*3.6), y = top + row*(cellH+0.22), tone = toneFill(k.tone, P);
        objs.push(Bx('k'+i, x, y, cellW, cellH, {fill:tone.bg, line:tone.line, lineW:1, radius:0.1, peerGroup:'kpi'+row}));
        objs.push(T('kn'+i, x+0.26, y+0.18, cellW-0.5, 0.62, k.num, 32, {bold:true, color:k.tone==='accent2'?P.accent2Dark:P.accent}));
        objs.push(T('kh'+i, x+0.26, y+0.86, cellW-0.5, 0.3, k.h3, 13, {bold:true, color:P.ink}));
        objs.push(T('kp'+i, x+0.26, y+1.2, cellW-0.5, cellH-1.36, k.text, 10.5, {color:P.soft, leading:1.3}));
      });
      var rx = colX(7.6), rw = colW(4.4);
      objs.push(Bx('rBg', rx, top, rw, h, {fill:P.surface, line:P.line, lineW:1, radius:0.12}));
      objs.push(Bx('rPill', rx+0.28, top+0.28, 2.6, 0.34, {fill:P.accent2Dark, radius:0.17}));
      objs.push(T('rPillT', rx+0.28, top+0.28, 2.6, 0.34, c.rightPill, 9.5, {bold:true, color:P.onAccent, align:'center', valign:'mid'}));
      objs.push(T('rH', rx+0.28, top+0.8, rw-0.56, 0.62, c.rightH3, 17, {bold:true, color:P.ink, leading:1.15}));
      var lines = c.lines||[], n = lines.length||1;
      var ly = top+1.62, lh = (h-1.8)/n;
      lines.forEach(function(l,i){
        var y = ly + i*lh;
        objs.push(Ic('li'+i, STEP_ICONS[i%STEP_ICONS.length], rx+0.28, y+0.04, 0.3, P.accent));
        objs.push(T('lb'+i, rx+0.72, y, rw-1.0, 0.3, l.b, 12.5, {bold:true, color:P.ink}));
        objs.push(T('lt'+i, rx+0.72, y+0.34, rw-1.0, lh-0.46, l.text, 10.5, {color:P.soft, leading:1.3}));
      });
      return { objs:objs };
    }
  },

  layers: {
    label:'Architektur', layout:'Nur Titel',
    build:function(c,P){
      var objs = [], top = header(c,P,objs);
      var bottom = noteBar(objs, P, c.note, top, 'note');
      var uses = c.uses||[], n = uses.length||1, span = G.COLS/n, useH = 1.05;
      uses.forEach(function(u,i){
        var x = colX(i*span), w = colW(span);
        objs.push(Bx('u'+i, x, top, w, useH, {fill:P.surface, line:P.line, lineW:1, radius:0.1, peerGroup:'use'}));
        objs.push(T('ut'+i, x+0.15, top, w-0.3, useH, u, 13, {bold:true, color:P.ink, align:'center', valign:'mid'}));
      });
      var y2 = top + useH + 0.3;
      var barH = Math.min(1.15, (bottom - y2 - 0.3)/2);
      objs.push(Bx('struct', colX(0), y2, colW(12), barH, {fill:P.accent, radius:0.12}));
      objs.push(T('structT', colX(0)+0.35, y2, colW(12)-0.7, barH, c.structure, 14, {bold:true, color:P.onAccent, align:'center', valign:'mid', leading:1.25}));
      var y3 = y2 + barH + 0.3;
      objs.push(Bx('base', colX(0), y3, colW(12), barH, {fill:P.surfaceAccent2, line:P.accent2, lineW:1, radius:0.12}));
      objs.push(T('baseT', colX(0)+0.35, y3, colW(12)-0.7, barH, c.base, 13, {bold:true, color:P.accent2Dark, align:'center', valign:'mid', leading:1.25}));
      return { objs:objs };
    }
  },

  kpiMosaic: {
    label:'KPI-Mosaik', layout:'Nur Titel',
    build:function(c,P){
      var objs = [], top = header(c,P,objs);
      var h = G.CONTENT_BOTTOM - top;
      var bigH = h*0.58, lx = colX(0), lw = colW(5);
      var b = c.big||{};
      objs.push(Bx('big', lx, top, lw, bigH, {fill:P.accent, radius:0.14}));
      objs.push(T('bigL', lx+0.32, top+0.26, lw-0.64, 0.26, b.label, 10, {bold:true, color:P.onAccent}));
      objs.push(T('bigV', lx+0.32, top+0.62, lw-0.64, 1.15, b.value, 60, {bold:true, color:P.onAccent}));
      objs.push(T('bigP', lx+0.32, top+bigH-0.92, lw-0.64, 0.8, b.text, 12, {color:P.onAccent, leading:1.3}));
      var cards = c.cards||[], cy = top + bigH + 0.22, ch = h - bigH - 0.22;
      cards.slice(0,1).forEach(function(cd,i){
        var tone = toneFill(cd.tone==='accent2'?'accent2':'default', P);
        objs.push(Bx('sc'+i, lx, cy, lw, ch, {fill:tone.bg, line:tone.line, lineW:1, radius:0.12}));
        objs.push(T('scL'+i, lx+0.32, cy+0.2, lw-0.64, 0.24, cd.label, 10, {bold:true, color:P.soft}));
        objs.push(T('scV'+i, lx+0.32, cy+0.5, lw-0.64, 0.6, cd.value, 30, {bold:true, color:P.accent2Dark}));
        objs.push(T('scP'+i, lx+0.32, cy+1.14, lw-0.64, ch-1.3, cd.text, 11, {color:P.soft, leading:1.3}));
      });
      var rx = colX(5.4), rw = colW(6.6), halfW = (rw-0.22)/2, halfH = (h-0.22)/2;
      var rest = cards.slice(1).concat(c.tiles||[]);
      rest.slice(0,4).forEach(function(item,i){
        var col = i%2, row = Math.floor(i/2);
        var x = rx + col*(halfW+0.22), y = top + row*(halfH+0.22);
        var isTile = item.value === undefined;
        var tone = toneFill(isTile ? 'accent2' : 'default', P);
        objs.push(Bx('r'+i, x, y, halfW, halfH, {fill:tone.bg, line:tone.line, lineW:1, radius:0.12, peerGroup:'mos'+row}));
        if(isTile){
          objs.push(Ic('ri'+i, STEP_ICONS[i%STEP_ICONS.length], x+0.28, y+0.26, 0.34, tone.icon));
          objs.push(T('rb'+i, x+0.28, y+0.74, halfW-0.56, 0.3, item.b, 13, {bold:true, color:P.ink}));
          objs.push(T('rp'+i, x+0.28, y+1.1, halfW-0.56, halfH-1.26, item.text, 11, {color:P.soft, leading:1.3}));
        } else {
          objs.push(T('rl'+i, x+0.28, y+0.22, halfW-0.56, 0.24, item.label, 10, {bold:true, color:P.soft}));
          objs.push(T('rv'+i, x+0.28, y+0.52, halfW-0.56, 0.6, item.value, 30, {bold:true, color:P.accent}));
          objs.push(T('rt'+i, x+0.28, y+1.16, halfW-0.56, halfH-1.32, item.text, 11, {color:P.soft, leading:1.3}));
        }
      });
      return { objs:objs };
    }
  }
};
var TPL_ORDER = ['cover','summary','statement','flow4','grid3','visionFactors','techGrid','layers','kpiMosaic'];

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
    var arr=groups[g];
    if(arr.length<2) return;
    function spread(f){ var v=arr.map(f); return Math.max.apply(null,v)-Math.min.apply(null,v); }
    // A row of peers must share top and height; a stacked column must share
    // left and width. Pick the axis the group is actually laid out along.
    var isRow = spread(function(o){return o.x;}) > spread(function(o){return o.y;});
    var d1 = isRow ? spread(function(o){return o.y;}) : spread(function(o){return o.x;});
    var d2 = isRow ? spread(function(o){return o.h;}) : spread(function(o){return o.w;});
    if(d1>0.01||d2>0.01) alignWarn={dy:d1,dh:d2,axis:isRow?'Reihe':'Spalte'};
  });
  rows.push(alignWarn
    ? {status:'warn', title:'Peers nicht bündig', detail:alignWarn.axis+': Kanten Δ '+alignWarn.dy.toFixed(2)+'", Maße Δ '+alignWarn.dh.toFixed(2)+'".'}
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
      + '<p:spPr>'+xfrm(o)+'</p:spPr>'
      + '<p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" anchor="t"><a:noAutofit/></a:bodyPr><a:lstStyle/>'
      + String(o.value).split('\n').map(function(line){
          return '<a:p><a:pPr algn="l"><a:lnSpc><a:spcPct val="'+Math.round((o.leading||1.2)*100000)+'"/></a:lnSpc></a:pPr>'
            + '<a:r><a:rPr lang="de-DE" sz="'+Math.round(o.fontSize*100)+'" b="1" dirty="0"/>'
            + '<a:t xml:space="preserve">'+xesc(line)+'</a:t></a:r></a:p>';
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
