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
  assert.equal(ruleMatches('In order to help','en')[0].choices[0],'To');
  assert.equal(ruleMatches('In order to help','en',false).length,0);
  assert.equal(ruleMatches('la problema','es')[0].choices[0],'el problema');
  assert.equal(ruleMatches('la problema','fr').length,0);
});

