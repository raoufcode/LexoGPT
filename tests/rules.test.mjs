import test from 'node:test';
import assert from 'node:assert/strict';
import {language,ruleMatches} from '../src/rules.mjs';
test('détection sur texte court, repli et langue hors couverture',()=>{
  for(const [s,lang] of [['Je vien de Paris','fr'],['I am agree','en'],['Hola, muchas gracias','es'],['123','fr']]) assert.equal(language(s),lang);
  assert.equal(language('Beispiel',{isReliable:true,languages:[{language:'de'}]}),'de');
});
test('accords, bornes Unicode, casse et positions UTF-16',()=>{
  const s='📝 Je vien. Je viendrai. Éje vien. JE VIEN.';
  const hits=ruleMatches(s,'fr');
  assert.deepEqual(hits.map(h=>h.choices[0]),['Je viens','JE VIENS']);
  for(const h of hits) assert.equal(s.slice(h.start,h.start+h.original.length),h.original);
});
test('reformulations facultatives et règles indépendantes par langue',()=>{
  assert.equal(ruleMatches('In order to help','en')[0].choices[0],'To help');
  assert.equal(ruleMatches('In order to help','en',false).length,0);
  assert.equal(ruleMatches('la problema','es')[0].choices[0],'el problema');
  assert.equal(ruleMatches('la problema','fr').length,0);
});


test('trois lectures, même date, même nom et modifications bornées à la phrase',()=>{
  const text = 'Bonjour. Je vous écris pour vous demander si Léa viendra le 12 mai. Merci !';
  const [hit] = ruleMatches(text,'fr');
  assert.equal(text.slice(hit.start,hit.start+hit.original.length),hit.original);
  assert.equal(new Set(hit.choices).size,3);
  for(const choice of hit.choices) assert.ok(choice.endsWith('si Léa viendra le 12 mai'));
  assert.deepEqual(ruleMatches("Dans le but d’aider",'fr')[0].choices,['Pour aider','Afin d’aider','En vue d’aider']);
});
test('combine plusieurs tournures, conserve la négation et couvre les trois langues',()=>{
  const [hit]=ruleMatches('Je la trouve qu’elle ne fonctionne pas assez bien et manque d’elegance et de proposition.','fr');
  assert.match(hit.choices[1],/pourrait mieux fonctionner et gagnerait à diversifier/);
  assert.deepEqual(ruleMatches('Le dossier est prêt.','fr'),[]);
  assert.ok(ruleMatches('In order to help, do not delete file X','en')[0].choices.every(s=>s.endsWith('do not delete file X')));
  assert.ok(ruleMatches('Le escribo para saber si Marta viene','es')[0].choices.every(s=>s.endsWith('si Marta viene')));
});
