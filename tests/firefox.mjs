import {firefox} from 'playwright';
import {createServer} from 'node:http';
import assert from 'node:assert/strict';
import path from 'node:path';

const server=createServer((req,res)=>{
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.end('<textarea></textarea>');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try {
  browser=await firefox.launchPersistentContext('',{headless:true});
  const page=await browser.newPage();
  await page.goto('about:debugging#/runtime/this-firefox');
  const picker=page.waitForEvent('filechooser');
  await page.getByRole('button',{name:/load temporary add-on/i}).click();
  await (await picker).setFiles(path.resolve('dist/firefox/manifest.json'));
  await page.getByText('LexoGPT',{exact:true}).first().waitFor();
  await page.goto('http://127.0.0.1:'+server.address().port);
  const area=page.locator('textarea');
  await area.fill('Je vien ici');
  await page.locator('html > div').click({timeout:60000});
  await page.keyboard.press('Enter');
  assert.equal(await area.inputValue(),'Je viens ici');
  console.log('Firefox : extension chargée, suggestion ouverte et correction appliquée.');
} finally {await browser?.close();server.close();}

