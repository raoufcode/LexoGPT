(() => {
  const api = globalThis.browser ?? chrome;
  const defaults = {enabled:true, mode:'auto', style:true};
  let prefs = {...defaults}, field, version = 0, timer, composing = false;
  let running = false, pending = false, expanded = false, current = 0;
  const host = document.createElement('div');
  host.style.cssText = 'all:initial!important;position:fixed!important;right:16px!important;bottom:16px!important;z-index:2147483647!important';
  const shadow = host.attachShadow({mode:'closed'});
  const css = document.createElement('style');
  css.textContent = `
    *{box-sizing:border-box} section{font:14px/1.45 system-ui,sans-serif;color:#1b2926;background:white;border:1px solid #bdd3cb;border-radius:14px;padding:14px;width:min(390px,92vw);max-height:80vh;overflow:auto;box-shadow:0 5px 25px #172e2530}
    button{font:inherit;border:1px solid #adc9bd;border-radius:8px;background:white;color:#174b3b;padding:5px 9px;cursor:pointer}
    button:focus-visible{outline:3px solid #349e83}button:hover{background:#e8f5ed}.badge,.choice{background:#145642;color:white}.badge:hover,.choice:hover{background:#21694e}
    .badge{font:600 14px system-ui;padding:8px 13px;border-radius:25px}
    header,footer,.options{display:flex;align-items:center;justify-content:space-between;gap:8px}.options{justify-content:flex-start;flex-wrap:wrap}
    .variants{display:grid}.variant{display:grid;gap:3px;width:100%;text-align:left;background:#f4f8f5;color:#193e30;overflow-wrap:anywhere}.variant:hover{background:#dfefe5}.variant strong{font-size:12px}.variant:focus-visible{outline-offset:1px}
    small{color:#53665e}p{overflow-wrap:anywhere;margin:7px 0 12px}footer{margin-top:14px}
  `;
  shadow.append(css);
  const panel = document.createElement('div');
  shadow.append(panel);
  shadow.addEventListener('mousedown', e => e.preventDefault());
  function hide() { host.remove(); }
  function eligible(el) {
    if (!(el instanceof HTMLElement) || el.closest('[inert],[spellcheck="false"],[contenteditable="false"]')) return false;
    if (/(?:password|cc-|one-time-code)/i.test(el.getAttribute('autocomplete') || '')) return false;
    return !el.disabled && !el.readOnly && (el instanceof HTMLTextAreaElement ||
      (el instanceof HTMLInputElement && ['text','search'].includes(el.type)) || el.isContentEditable);
  }
  function snapshot() {
    if (!field?.isConnected || !eligible(field)) return;
    let node, value, cursor;
    if (field.isContentEditable) {
      const sel = getSelection();
      node = sel.focusNode;
      if (!node || node.nodeType !== Node.TEXT_NODE || !field.contains(node) || !eligible(node.parentElement)) return;
      value = node.data;
      cursor = sel.focusOffset;
    } else {
      value = field.value;
      cursor = field.selectionEnd ?? value.length;
    }
    // Prefer the surrounding paragraph. Bound the work even on a very long line.
    let start = Math.max(0, cursor - 1200, value.lastIndexOf('\n', Math.max(0,cursor-1)) + 1);
    const newline = value.indexOf('\n', cursor);
    let end = Math.min(value.length, cursor + 600, newline < 0 ? value.length : newline);
    if (start && /\p{L}/u.test(value[start-1])) while (start < cursor && /\p{L}/u.test(value[start])) start++;
    if (end < value.length && /\p{L}/u.test(value[end])) while (end > cursor && /\p{L}/u.test(value[end-1])) end--;
    return {field,node,start,text:value.slice(start,end)};
  }
  function valid(s) {
    return field === s.field && field.isConnected && eligible(field) &&
      (!s.node || field.contains(s.node)) &&
      (s.node ? s.node.data : field.value).slice(s.start,s.start+s.text.length) === s.text;
  }
  function apply(s, hit, choice) {
    if (!valid(s)) return schedule();
    expanded = false;
    const start = s.start + hit.start, end = start + hit.original.length;
    field.focus({preventScroll:true});
    if (s.node) {
      const range = document.createRange();
      range.setStart(s.node,start);
      range.setEnd(s.node,end);
      getSelection().removeAllRanges();
      getSelection().addRange(range);
    } else field.setSelectionRange(start,end);
    // A native editing transaction lets the editor receive input and supports Undo.
    if (!document.execCommand('insertText',false,choice) && !s.node && valid(s)) {
      field.setRangeText(choice,start,end,'end');
      field.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertReplacementText',data:choice}));
    }
    schedule();
  }
  function button(label, action, cls) {
    const el = document.createElement('button');
    el.type = 'button'; el.textContent = label;
    if (cls) el.className = cls;
    el.addEventListener('click',action);
    return el;
  }
  function render(s, {hits,lang}) {
    if (!hits?.length) { hide(); return; }
    current = Math.min(current,hits.length-1);
    panel.replaceChildren();
    const redraw = () => render(s,{hits,lang});
    if (!expanded) {
      panel.append(button('Lexo · ' + hits.length + (hits.length===1?' suggestion':' suggestions'), () => {expanded=true; redraw(); panel.querySelector('.choice')?.focus();}, 'badge'));
    } else {
      const box = document.createElement('section'), head = document.createElement('header'), word = document.createElement('p');
      const title = document.createElement('strong'), meta = document.createElement('small');
      const hit = hits[current];
      title.textContent = hit.kind;
      meta.textContent = 'Lexo · ' + lang.toUpperCase();
      head.append(title,meta); word.textContent = '« ' + hit.original + ' »';
      const options = document.createElement('div');
      options.className = 'options';
      if (hit.kind === 'Formulation') {
        options.classList.add('variants');
        const labels = ['Direct', 'Nuancé', 'Soutenu'];
        hit.choices.forEach((choice, i) => {
          const option = button('', () => apply(s,hit,choice), 'choice variant');
          const tone = document.createElement('strong');
          tone.textContent = labels[i];
          option.append(tone, document.createTextNode(choice));
          options.append(option);
        });
      } else {
        options.append(...hit.choices.map(c => button(c,() => apply(s,hit,c),'choice')));
      }
      const foot = document.createElement('footer');
      const page = document.createElement('small');
      page.textContent = (current+1)+' / '+hits.length;
      foot.append(page);
      if (hits.length>1) foot.append(button('Suivante',() => {current=(current+1)%hits.length;redraw();}));
      foot.append(button('Réduire',() => {expanded=false;redraw();panel.querySelector('button').focus();}));
      box.append(head,word,options,foot); panel.append(box);
    }
    if (!host.isConnected) document.documentElement.append(host);
  }
  async function scan() {
    if (running) { pending=true; return; }
    const s = snapshot(), id = version;
    if (!prefs.enabled || composing || !s || s.text.trim().length<2) return;
    running=true;
    try {
      const result = await api.runtime.sendMessage({type:'check',text:s.text,hint:field.closest('[lang]')?.lang || '',mode:prefs.mode,style:prefs.style});
      if (id===version && valid(s) && result) render(s,result);
    } catch { hide(); }
    finally { running=false; if (pending) {pending=false; clearTimeout(timer);timer=setTimeout(scan,0);} }
  }
  function schedule() {
    version++; clearTimeout(timer); pending=false; hide(); current=0;
    if (prefs.enabled && field && !composing) timer=setTimeout(scan,320);
  }
  function activate(target) {
    if (target===host) return;
    const next = eligible(target) ? target : null;
    if (field!==next) {field=next;expanded=false;}
    schedule();
  }
  document.addEventListener('focusin',e=>activate(e.target),true);
  document.addEventListener('focusout',e=>{if (e.relatedTarget!==host && e.target===field) activate(null);},true);
  document.addEventListener('input',e=>{if(e.target!==host) activate(e.target);},true);
  document.addEventListener('compositionstart',()=>{composing=true;schedule();},true);
  document.addEventListener('compositionend',()=>{composing=false;schedule();},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape' && host.isConnected){version++;expanded=false;hide();field?.focus();}},true);
  api.storage.onChanged.addListener((changes,area)=>{
    if(area==='local') for(const key of Object.keys(defaults)) if(key in changes) prefs[key]=changes[key].newValue ?? defaults[key];
    schedule();
  });
  api.storage.local.get(defaults).then(value=>{prefs=value;activate(document.activeElement);});
})();

