/* Puente – Icon-System (v0.9)
   Ersetzt Emoji-Zeichen durch einen einheitlichen SVG-Strichsatz.
   Die Views liefern weiterhin Emojis; hier werden sie beim Rendern getauscht,
   damit Datenmodell und Ansichten unverändert bleiben. */
(function(global){
  "use strict";

  const P = {
    doc:'<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/>',
    docText:'<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12.5h5M10 16h4"/>',
    docStack:'<path d="M6 3.5h8l4 4v10H6z"/><path d="M14 3.5v4h4"/><path d="M9.5 20.5h9a2 2 0 0 0 2-2V9.5"/>',
    clipboard:'<rect x="5" y="4.5" width="14" height="16.5" rx="2.5"/><path d="M9 5V3.2h6V5"/><path d="M9 11h6M9 15h4"/>',
    receipt:'<path d="M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4z"/><path d="M9 8.5h6M9 12.5h6"/>',
    pen:'<path d="M4 20h4L20 8l-4-4L4 16z"/><path d="m14.5 5.5 4 4"/>',
    home:'<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/>',
    compass:'<circle cx="12" cy="12" r="8.5"/><path d="m15.2 8.8-2.3 5.2-4 1.7 2.3-5.2z"/>',
    clip:'<path d="M16.5 8.2 9.8 14.9a2.4 2.4 0 0 0 3.4 3.4l7-7a4.4 4.4 0 0 0-6.2-6.2l-7.3 7.3"/>',
    hourglass:'<path d="M7 3.5h10M7 20.5h10"/><path d="M8.5 3.5v3c0 2 3.5 3.4 3.5 5.5s-3.5 3.5-3.5 5.5v3M15.5 3.5v3c0 2-3.5 3.4-3.5 5.5s3.5 3.5 3.5 5.5v3"/>',
    scales:'<path d="M12 5.5v15M7.5 20.5h9"/><path d="M4.5 9.5h15"/><path d="m8 9.5-3 6h6zM16 9.5l3 6h-6z"/>',
    mail:'<rect x="3.5" y="6" width="17" height="12" rx="2.2"/><path d="m4.2 8 7.8 5.2L19.8 8"/>',
    mailbox:'<path d="M4 10.5A3.5 3.5 0 0 1 7.5 7h9A3.5 3.5 0 0 1 20 10.5V18H4z"/><path d="M9 18V7M13 11h4"/>',
    mic:'<rect x="9" y="3.2" width="6" height="11" rx="3"/><path d="M5.5 12a6.5 6.5 0 0 0 13 0M12 18.5v2.3"/>',
    trash:'<path d="M5 7h14M9.5 7V4.8h5V7M7 7l1 13.2h8L17 7"/><path d="M11 11v6M13.5 11v6"/>',
    search:'<circle cx="11" cy="11" r="6.4"/><path d="m15.8 15.8 4.4 4.4"/>',
    lock:'<rect x="5" y="10" width="14" height="10" rx="2.4"/><path d="M8.5 10V7.6a3.5 3.5 0 0 1 7 0V10"/>',
    check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    checkCircle:'<circle cx="12" cy="12" r="8.5"/><path d="m8.2 12.3 2.6 2.6 5-5.4"/>',
    people:'<circle cx="8.6" cy="9" r="2.7"/><circle cx="16.2" cy="9.4" r="2.2"/><path d="M3.4 19.2c.9-3 2.8-4.5 5.2-4.5s4.3 1.5 5.2 4.5M15.2 14.9c2 .2 3.5 1.6 4.3 3.8"/>',
    person:'<circle cx="12" cy="8" r="3.4"/><path d="M5 20c1.2-3.6 4-5.3 7-5.3s5.8 1.7 7 5.3"/>',
    family:'<circle cx="7.5" cy="8" r="2.4"/><circle cx="16.5" cy="8" r="2.4"/><path d="M3 19c.7-2.8 2.3-4.2 4.5-4.2S11.3 16.2 12 19M12 19c.7-2.8 2.3-4.2 4.5-4.2S20.3 16.2 21 19"/>',
    grad:'<path d="m3.2 9.5 8.8-4 8.8 4-8.8 4z"/><path d="M7 11.6V16c2.6 2 7.4 2 10 0v-4.4"/>',
    idCard:'<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="11" r="2.1"/><path d="M14 10h4M14 14h4M6.2 16c.8-1.7 4.8-1.7 5.6 0"/>',
    printer:'<path d="M7 9.5V4h10v5.5"/><rect x="4" y="9.5" width="16" height="7" rx="2"/><path d="M7 14h10v6H7z"/>',
    card:'<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M6.5 14.5h4"/>',
    disk:'<path d="M5 4h11l3 3v13H5z"/><path d="M9 4v5h6V4M8.5 20v-6h7v6"/>',
    sliders:'<path d="M4 7h9M17.5 7H20M4 12h3M11.5 12H20M4 17h8M16.5 17H20"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="14.2" cy="17" r="2"/>',
    refresh:'<path d="M19.8 12a7.8 7.8 0 1 1-2.4-5.6"/><path d="M20 4.2v4.2h-4.2"/>',
    calendar:'<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.4V12l3.2 1.9"/>',
    euro:'<circle cx="12" cy="12" r="8.5"/><path d="M15.6 8.9a4.1 4.1 0 0 0-6 1.4c-1 2 .2 4.6 2.4 5.2 1.4.4 2.8 0 3.6-.9M7.6 11h5.6M7.6 13.4h4.8"/>',
    bank:'<path d="M4 10h16M12 3.8 4 9h16zM7.5 10v7M12 10v7M16.5 10v7M4 20.2h16"/>',
    chart:'<path d="M4 20h16M8 20v-7.5M12 20V6.5M16 20v-4.5"/>',
    pin:'<path d="M12 21s6.4-6 6.4-10.4A6.4 6.4 0 0 0 5.6 10.6C5.6 15 12 21 12 21Z"/><circle cx="12" cy="10.5" r="2.3"/>',
    puzzle:'<path d="M9 4.4h2.1a1.6 1.6 0 1 1 2.8 0H16a1 1 0 0 1 1 1v2.5a1.6 1.6 0 1 0 0 2.9V15a1 1 0 0 1-1 1h-2.6a1.6 1.6 0 1 0-2.8 0H9a1 1 0 0 1-1-1v-3H5.5a1.6 1.6 0 1 1 0-2.9H8V5.4a1 1 0 0 1 1-1Z"/>',
    hash:'<path d="M6 9.2h13M5 15h13M10.2 4.5 8.6 19.5M16 4.5l-1.6 15"/>',
    globe:'<circle cx="12" cy="12" r="8.5"/><path d="M3.6 9.8h16.8M3.6 14.2h16.8"/><path d="M12 3.6c2.3 2.4 3.3 5.3 3.3 8.4S14.3 18 12 20.4C9.7 18 8.7 15.1 8.7 12S9.7 6 12 3.6Z"/>',
    calculator:'<rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M8 8h8M8.4 12.4h.1M12 12.4h.1M15.6 12.4h.1M8.4 16.4h.1M12 16.4h.1M15.6 16.4h.1"/>',
    key:'<circle cx="8" cy="12" r="3.4"/><path d="M11.4 12H20l-1.6 2.2M16.6 12v2.6"/>',
    shield:'<path d="M12 3.4 19 6v6c0 4-3 7.1-7 8.6C8 19.1 5 16 5 12V6z"/>',
    building:'<rect x="5" y="3.5" width="14" height="17" rx="1.6"/><path d="M9 7.5h2M13 7.5h2M9 11h2M13 11h2M9 14.5h2M13 14.5h2M10 20.5v-3h4v3"/>',
    laptop:'<rect x="4" y="5" width="16" height="10" rx="2"/><path d="M2.5 18.5h19"/>',
    keyboard:'<rect x="3" y="6.5" width="18" height="11" rx="2"/><path d="M6.6 10h.1M10 10h.1M13.5 10h.1M17 10h.1M7 14h10"/>',
    camera:'<path d="M4 8.2h3l1.7-2.3h6.6L17 8.2h3v10.8H4z"/><circle cx="12" cy="13.6" r="3.5"/>',
    folder:'<path d="M3.5 6.8h6l2 2.5h9v10h-17z"/>',
    box:'<path d="m12 3.5 8 4v9l-8 4-8-4v-9z"/><path d="m4 7.5 8 4 8-4M12 11.5v9"/>',
    download:'<path d="M12 4v10m0 0-4-4m4 4 4-4M4 17v2.5h16V17"/>',
    upload:'<path d="M12 16V5.5m0 0-4 4m4-4 4 4M4 17v2.5h16V17"/>',
    speaker:'<path d="M5 9.4h3l4-3.4v12l-4-3.4H5z"/><path d="M15.6 9.2a4 4 0 0 1 0 5.6"/>',
    phone:'<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>',
    stop:'<rect x="6.5" y="6.5" width="11" height="11" rx="2.2"/>',
    warn:'<path d="M12 4.4 20.8 19.6H3.2z"/><path d="M12 10v4M12 17h.1"/>',
    question:'<circle cx="12" cy="12" r="8.5"/><path d="M9.9 9.6a2.2 2.2 0 1 1 2.8 2.3c-.7.2-1.1.8-1.1 1.5v.4M12 16.6h.1"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    plus:'<path d="M12 5.2v13.6M5.2 12h13.6"/>',
    minus:'<path d="M5.2 12h13.6"/>',
    external:'<path d="M7.5 16.5 17 7M9.2 7H17v7.8"/>',
    arrowRight:'<path d="M5 12h13m-5-5 5 5-5 5"/>',
    arrowLeft:'<path d="M19 12H6m5 5-5-5 5-5"/>',
    bolt:'<path d="M13.2 3 6 13.6h5.6L10.8 21 18 10.4h-5.6z"/>',
    bookmark:'<path d="M6.5 4h11v16.4l-5.5-4-5.5 4z"/>',
    square:'<rect x="5" y="5" width="14" height="14" rx="2.5"/>',
    dots:'<circle cx="5.2" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18.8" cy="12" r="1.5"/>',
    briefcase:'<rect x="3.5" y="7.5" width="17" height="12" rx="2.2"/><path d="M9 7.5V5.6h6v1.9M3.5 12.5h17"/>'
  };

  const MAP = {
    "🧭":"compass","📎":"clip","⏳":"hourglass","📄":"docText","📮":"mailbox","🏠":"home",
    "⚖️":"scales","⚖":"scales","🎙️":"mic","🎙":"mic","🎤":"mic","✉️":"mail","✉":"mail",
    "🗑️":"trash","🗑":"trash","🧹":"trash","🔎":"search","🔍":"search","🔒":"lock",
    "✅":"checkCircle","✓":"check","📑":"docStack","🤝":"people","🔥":"idCard",
    "🖨️":"printer","🖨":"printer","🖊️":"pen","🖊":"pen","✍️":"pen","✍":"pen","📝":"pen",
    "💳":"card","📇":"card","💾":"disk","⚙️":"sliders","⚙":"sliders",
    "🔄":"refresh","🔁":"refresh","↺":"refresh","📋":"clipboard","🧾":"receipt",
    "⏹":"stop","⌨️":"keyboard","⌨":"keyboard","👪":"family","👨‍👩‍👧‍👦":"family","🧒":"family",
    "🏛️":"bank","🏛":"bank","🏦":"bank","📅":"calendar","🕐":"clock","💶":"euro",
    "📬":"mailbox","📨":"mail","📧":"mail","⚠️":"warn","⚠":"warn",
    "👥":"people","🧑‍🤝‍🧑":"people","📂":"folder","📁":"folder","📦":"box","📷":"camera",
    "🧑‍💼":"briefcase","🪪":"idCard","📍":"pin","🔢":"hash","🧩":"puzzle","📊":"chart",
    "🔊":"speaker","📱":"phone","🎓":"grad","🧑‍🎓":"grad","📜":"receipt","🔑":"key",
    "🛡️":"shield","🛡":"shield","🌍":"globe","🧮":"calculator","💻":"laptop",
    "🙋":"person","👤":"person","📥":"download","➕":"plus","➖":"minus",
    "❓":"question","❌":"close","✕":"close","✖":"close","□":"square",
    "⋯":"dots","…":"dots","↗":"external","→":"arrowRight","←":"arrowLeft","⚡":"bolt","🔖":"bookmark","🏢":"building"
  };

  const KEYS = Object.keys(MAP).sort((a,b)=>b.length-a.length);
  const SRC = "(" + KEYS.map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|") + ")\\uFE0F?";
  const RE = new RegExp(SRC,"g");
  const HAS = new RegExp(SRC);
  const SKIP = {SCRIPT:1,STYLE:1,TEXTAREA:1,INPUT:1,SELECT:1,SVG:1,OPTION:1,PRE:1,TITLE:1};

  function markup(name, cls){
    const d = P[name]; if(!d) return "";
    return '<span class="ic '+(cls||"")+'" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">'+d+"</svg></span>";
  }

  /** Ersetzt Emojis unterhalb von root durch SVG-Icons. */
  function decorate(root){
    const node = root || document.body;
    if(!node || !node.ownerDocument) return;
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
      acceptNode(t){
        const p = t.parentNode;
        if(!p || SKIP[p.nodeName] || p.closest && p.closest("svg")) return NodeFilter.FILTER_REJECT;
        return HAS.test(t.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const hits = [];
    while(walker.nextNode()) hits.push(walker.currentNode);
    hits.forEach(textNode => {
      const parts = textNode.nodeValue.split(RE);
      const frag = document.createDocumentFragment();
      parts.forEach(part => {
        if(part === undefined) return;
        const name = MAP[part] || MAP[part.replace(/\uFE0F/g,"")];
        if(name && P[name]){
          const span = document.createElement("span");
          span.className = "ic";
          span.setAttribute("aria-hidden","true");
          span.innerHTML = '<svg viewBox="0 0 24 24" focusable="false">'+P[name]+"</svg>";
          frag.appendChild(span);
        } else if(part){
          frag.appendChild(document.createTextNode(part));
        }
      });
      textNode.parentNode.replaceChild(frag, textNode);
    });
  }

  /** Beobachtet nachgeladene Inhalte (Dialoge, Toasts) und ersetzt dort ebenfalls. */
  function observe(){
    if(!("MutationObserver" in window) || !document.body) return;
    const mo = new MutationObserver(list => {
      let touched = false;
      for(const m of list){ if(m.addedNodes && m.addedNodes.length){ touched = true; break; } }
      if(!touched) return;
      mo.disconnect();
      try { decorate(document.body); }
      finally { mo.observe(document.body,{childList:true,subtree:true}); }
    });
    mo.observe(document.body,{childList:true,subtree:true});
  }

  function start(){ decorate(document.body); observe(); }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  global.ICONS = { decorate, markup, observe, paths:P, map:MAP };
})(window);

