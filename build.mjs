import {mkdir, copyFile, readFile, writeFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {zipSync} from 'fflate';

for (const target of ['chrome','firefox']) {
  const out = path.join('dist',target);
  await mkdir(path.join(out,'dict'),{recursive:true});
  await mkdir(path.join(out,'licenses'),{recursive:true});
  const manifest = {
    manifest_version:3, name:'LexoGPT', version:'1.1.0',
    description:'Corrections et reformulations en français, anglais et espagnol, sur votre appareil.',
    permissions:['storage'], action:{default_title:'Lexo · Préférences',default_popup:'popup.html'},
    content_scripts:[{matches:['http://*/*','https://*/*'],js:['content.js'],all_frames:true}],
    background:target==='chrome'?{service_worker:'background.js'}:{scripts:['background.js']}
  };
  if (target==='firefox') manifest.browser_specific_settings={gecko:{id:'lexogpt@raoufcode.github.io',strict_min_version:'140.0',data_collection_permissions:{required:['none']}}};
  await writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
  await build({entryPoints:['src/background.mjs'],bundle:true,platform:'browser',target:'es2022',outfile:path.join(out,'background.js')});
  for(const name of ['content.js','popup.html','popup.js']) await copyFile('src/'+name,path.join(out,name));
  for (const lang of ['fr','en','es']) {
    const pkg='node_modules/dictionary-'+lang+'/';
    for (const ext of ['aff','dic']) await copyFile(pkg+'index.'+ext,path.join(out,'dict',lang+'.'+ext));
    await copyFile(pkg+'license',path.join(out,'licenses','dictionary-'+lang+'.txt'));
    await copyFile(pkg+'readme.md',path.join(out,'licenses','dictionary-'+lang+'-sources.md'));
  }
  for(const [pkg,name] of [['nspell','license'],['is-buffer','LICENSE']]) await copyFile('node_modules/'+pkg+'/'+name,path.join(out,'licenses',pkg+'.txt'));
  const entries = {};
  for(const file of await readdir(out,{recursive:true,withFileTypes:true})) {
    if (!file.isFile()) continue;
    const full = path.join(file.parentPath,file.name);
    entries[path.relative(out,full).split(path.sep).join('/')] = new Uint8Array(await readFile(full));
  }
  await writeFile('dist/LexoGPT-'+target+'.zip',zipSync(entries));
}

