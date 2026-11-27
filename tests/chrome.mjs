import {chromium} from 'playwright';
import {createServer} from 'node:http';
import assert from 'node:assert/strict';
import path from 'node:path';

const server = createServer((_,res)=>{
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
  res.end('<textarea></textarea><div contenteditable="true"><b>Je vien ici</b></div><input type="password">');
});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const dir=path.resolve('dist/chrome');
let browser;
try {
  browser=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:['--disable-extensions-except='+dir,'--load-extension='+dir]});
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:'+server.address().port);
  const host=page.locator('html > div');
  async function accept() {
    await host.waitFor({timeout:60000});
    await host.click();
    await page.keyboard.press('Enter');
  }
  const area=page.locator('textarea');
  for(const [before,after] of [['Je vien de finir','Je viens de finir'],['I am agree','I agree'],['Hola, la problema','Hola, el problema']]) {
    await area.fill(before);
    await accept();
    assert.equal(await area.inputValue(),after);
  }
  await area.fill('This is a speling mistake');
  await accept();
  assert.match(await area.inputValue(),/spelling/);
  await page.locator('b').click();
  await accept();
  assert.equal(await page.locator('b').textContent(),'Je viens ici');
  await page.locator('input').fill('Je vien ici');
  await page.waitForTimeout(600);
  assert.equal(await host.count(),0);
  console.log('Chrome : trois langues, orthographe, application au clavier, texte riche et mot de passe vérifiés.');
} finally {await browser?.close();server.close();}

