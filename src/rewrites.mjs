/*
 * Each row supplies three editorial readings of the same construction.
 * Captures keep the writer's subject, names and other variable wording.
 */
const catalog = {
  fr: [
    [/je (?:la |le )?trouve qu['’](elle|il)/, ['à mon avis, $1', 'j’ai le sentiment qu’$1', 'il me semble qu’$1']],
    [/je voulais (?:juste |simplement )?vous (?:prévenir|informer) que /, ['je vous signale que ', 'je tenais à vous dire que ', 'je souhaite vous informer que ']],
    [/si (?:cela|ça) vous convient bien/, ['si cela vous va', 'si cela vous arrange', 'si cette option vous convient']],
    [/je vous serais reconnaissant(e?) (de |d['’])/, ['merci $2', 'je vous remercie par avance $2', 'je vous saurais gré $2']],
    [/je trouve que /, ['à mon avis, ', 'j’ai le sentiment que ', 'il me semble que ']],
    [/je n['’]aime pas (la |le |les |l['’])/, ['je n’apprécie pas $1', 'j’ai des réserves sur $1', 'j’émets des réserves sur $1']],
    [/ne fonctionne pas assez bien/, ['fonctionne mal', 'pourrait mieux fonctionner', 'ne donne pas entière satisfaction']],
    [/manque d['’][ée]l[ée]gance et de propositions?/, ['propose trop peu de variantes soignées', 'gagnerait à diversifier et à affiner ses propositions', 'offre un choix limité de formulations, souvent peu élégantes']],
    [/je (?:vous écris|me permets de vous écrire) pour vous demander si /, ['je voudrais savoir si ', 'j’aimerais savoir si ', 'je souhaiterais savoir si ']],
    [/je (?:vous écris|me permets de vous écrire) pour vous demander s['’]/, ['je voudrais savoir s’', 'j’aimerais savoir s’', 'je souhaiterais savoir s’']],
    [/je vous remercie (?:par avance|d['’]avance) pour/, ['merci d’avance pour', 'un grand merci d’avance pour', 'je vous remercie d’ores et déjà pour']],
    [/dans le but (de |d['’])/, ['pour', 'afin $1', 'en vue $1']],
    [/au jour d['’]aujourd['’]hui/, ['aujourd’hui', 'à ce jour', 'à l’heure actuelle']],
    [/il est nécessaire (de |d['’])/, ['il faut', 'il est important $1', 'il est indispensable $1']],
    [/je pense personnellement que /, ['je pense que ', 'à mon sens, ', 'je suis d’avis que ']],
    [/si j['’]ai bien compris/, ['si je comprends bien', 'si je vous suis bien', 'si mon interprétation est juste']],
    [/je ne suis pas (?:tout à fait|totalement) d['’]accord/, ['je partage en partie cet avis', 'j’ai quelques réserves', 'mon point de vue diffère sur certains points']]
  ],
  en: [
    [/in order to/, ['to', 'so as to', 'in an effort to']],
    [/at this point in time/, ['now', 'at the moment', 'at present']],
    [/due to the fact that/, ['because', 'given that', 'as']],
    [/I am writing to (?:ask|find out) (if|whether)/, ['I’d like to know $1', 'I was wondering $1', 'I would like to enquire $1']],
    [/I am not (?:entirely|fully) satisfied with/, ['I have concerns about', 'I have some reservations about', 'I am less than satisfied with']],
    [/in my personal opinion/, ['in my view', 'as I see it', 'from my perspective']],
    [/I would like to thank you for/, ['thank you for', 'many thanks for', 'I am grateful for']]
  ],
  es: [
    [/con el fin de/, ['para', 'con la idea de', 'con el propósito de']],
    [/en el día de hoy/, ['hoy', 'en esta jornada', 'en la jornada de hoy']],
    [/por el hecho de que/, ['porque', 'ya que', 'dado que']],
    [/le escribo para (?:preguntar|saber) si/, ['quisiera saber si', 'me gustaría saber si', 'desearía saber si']],
    [/desde mi punto de vista/, ['a mi juicio', 'a mi parecer', 'desde mi perspectiva']],
    [/no estoy del todo de acuerdo/, ['tengo algunas reservas', 'lo veo de otra manera', 'discrepo en algunos puntos']]
  ]
};
const compiled = Object.fromEntries(Object.entries(catalog).map(([lang, rows]) => [lang,
  rows.map(([pattern, variants]) => ({
    pattern: new RegExp('(?<![\\p{L}\\p{N}_])' + pattern.source +
      '(?!(?<=[\\p{L}\\p{N}_])[\\p{L}\\p{N}_])', 'giu'),
    variants
  }))
]));
export function rewrites(text, lang) {
  const hits = [];
  for (const sentence of text.matchAll(/[^.!?…\n]+/gu)) {
    const original = sentence[0].trim();
    if (!original || original.length > 500 || /https?:\/\/|www\.|\S@\S|[`«»“”"]/u.test(original)) continue;
    const spans = [];
    for (const {pattern, variants} of compiled[lang] || []) {
      for (const match of original.matchAll(pattern)) {
        spans.push({match, variants});
      }
    }
    spans.sort((a,b) => a.match.index-b.match.index || b.match[0].length-a.match[0].length);
    let end = 0;
    const readings = ['', '', ''];
    for (const {match, variants} of spans) {
      if (match.index < end) continue;
      const before = original.slice(end, match.index);
      const source = match[0];
      for (let i=0; i<readings.length; i++) {
        let value = variants[i].replace(/\$(\d)/g, (_,n) => match[n]);
        if (/\s$/.test(source) && !/\s$/.test(value)) value += ' ';
        if (lang === 'fr' && /['’]$/.test(source) && /(?:pour|faut)$/.test(value)) value += ' ';
        if (source===source.toUpperCase()) value=value.toUpperCase();
        else if (source[0]===source[0].toUpperCase()) value=value[0].toUpperCase()+value.slice(1);
        readings[i] += before + value;
      }
      end = match.index + source.length;
    }
    if (!end) continue;
    const choices = readings.map(s=>s+original.slice(end));
    hits.push({start:sentence.index+sentence[0].indexOf(original), original, choices, kind:'Formulation'});
  }
  return hits;
}
