import nspell from 'nspell';
import {language, ruleMatches} from './rules.mjs';

const api = globalThis.browser ?? chrome;
const dictionaries = new Map();
function dictionary(lang) {
  if (!dictionaries.has(lang)) {
    const files = ['aff', 'dic'].map(async ext => {
      const response = await fetch(api.runtime.getURL('dict/' + lang + '.' + ext));
      if (!response.ok) throw Error('Dictionnaire indisponible');
      return response.text();
    });
    dictionaries.set(lang, Promise.all(files).then(([aff, dic]) => nspell(aff, dic)).catch(err => {
      dictionaries.delete(lang);
      throw err;
    }));
  }
  return dictionaries.get(lang);
}
async function check({text, hint, mode, style}) {
  let native;
  if (mode === 'auto') {
    try { native = await api.i18n.detectLanguage(text); } catch { /* Use the local clues. */ }
  }
  const lang = mode === 'auto' ? language(text, native, hint) : mode;
  if (!['fr', 'en', 'es'].includes(lang)) return {lang, hits: []};
  const hits = ruleMatches(text, lang, style);
  const spell = await dictionary(lang);
  const protectedText = text.replace(/(?:https?:\/\/|www\.)\S+|\S+@\S+/giu, s => ' '.repeat(s.length));
  let attempts = 0;
  for (const match of protectedText.matchAll(/[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu)) {
    const original = match[0], start = match.index;
    if (original.length < 3 || original.length > 24 || original === original.toUpperCase() ||
        /[\d_]/.test(text[start-1] || ' ') || /[\d_]/.test(text[start+original.length] || ' ')) continue;
    if (hits.some(h => h.kind !== 'Formulation' && start < h.start+h.original.length && start+original.length > h.start)) continue;
    const word = original.replaceAll('’', "'");
    if (spell.correct(word) || spell.correct(word.toLowerCase())) continue;
    const choices = spell.suggest(word).slice(0,3);
    if (choices.length) hits.push({start, original, choices, kind:'Orthographe'});
    if (++attempts >= 6) break;
  }
  return {lang, hits:hits.sort((a,b) => a.start-b.start).slice(0,12)};
}
api.runtime.onMessage.addListener((message, sender, reply) => {
  if (message?.type !== 'check' || typeof message.text !== 'string' || message.text.length > 2000) return false;
  check(message).then(reply, () => reply({error:true}));
  return true;
});

