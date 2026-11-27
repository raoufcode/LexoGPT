import {rewrites} from './rewrites.mjs';
const forms = {
  fr: {
    Grammaire: {
      'je vien': 'je viens', 'je voudrai que': 'je voudrais que', 'mes faute': 'mes fautes',
      'des meilleurs formulations': 'de meilleures formulations', 'les correction': 'les corrections',
      'tu peut': 'tu peux', 'il faut que je fait': 'il faut que je fasse',
      'ils sont aller': 'ils sont allés', 'je suis aller': 'je suis allé',
      'vous faîtes': 'vous faites', 'nous somme': 'nous sommes', 'sa me': 'ça me',
      'je voudrais lexo détecte': 'je voudrais que Lexo détecte'
    }
  },
  en: {
    Grammaire: {'he have': 'he has', 'she dont': 'she doesn’t', 'i am agree': 'I agree', 'could of been': 'could have been', 'these is': 'these are'}
  },
  es: {
    Grammaire: {'yo a sido': 'yo he sido', 'la problema': 'el problema', 'muchas gracias por tú ayuda': 'muchas gracias por tu ayuda', 'voy ha hacer': 'voy a hacer'}
  }
};
const clues = {
  fr: 'je mes le les des suis nous vous pour une avec dans que et bonjour',
  en: 'i the this that with for am she he have is are and hello order',
  es: 'yo el los las una estoy gracias para por con hoy hola que es'
};
export function language(text, native, hint = '') {
  if (native?.isReliable && native.languages?.length) return native.languages[0].language.split('-')[0];
  const words = new Set(text.toLowerCase().match(/\p{L}+/gu));
  const scores = Object.entries(clues).map(([id, list]) => [id, list.split(' ').filter(w => words.has(w)).length]).sort((a,b) => b[1]-a[1]);
  if (scores[0][1] > scores[1][1]) return scores[0][0];
  return hint.split('-')[0] || 'fr';
}
const rules = Object.fromEntries(Object.entries(forms).map(([id, groups]) => [id,
  Object.entries(groups).flatMap(([kind, pairs]) => Object.entries(pairs).map(([source, replacement]) => ({
    kind, replacement, pattern: new RegExp('(?<![\\p{L}\\p{N}_])' + source + '(?![\\p{L}\\p{N}_])', 'giu')
  })))
]));
export function ruleMatches(text, lang, style = true) {
  const hits = style ? rewrites(text,lang) : [];
  for (const {kind, pattern, replacement} of rules[lang] || []) {
    for (const match of text.matchAll(pattern)) {
      const original = match[0];
      const value = original === original.toUpperCase() ? replacement.toUpperCase() :
        original[0] === original[0].toUpperCase() ? replacement[0].toUpperCase() + replacement.slice(1) : replacement;
      hits.push({start: match.index, original, choices: [value], kind});
    }
  }
  return hits.sort((a,b) => a.start-b.start);
}

