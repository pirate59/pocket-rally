import {readFile,readdir,access} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const config=JSON.parse(await readFile(resolve(root,'wrangler.jsonc'),'utf8'));
if(config.assets?.directory!=='./dist')throw new Error('Expected static assets in ./dist');
for(const file of ['dist/index.html','dist/style.css','dist/THREE-LICENSE.txt'])await access(resolve(root,file));
let count=0;
for(const file of await readdir(resolve(root,'dist'))){
 if(!file.endsWith('.mjs'))continue;
 const path=resolve(root,'dist',file),result=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});
 if(result.status!==0)throw new Error(result.stderr||'Syntax check failed: '+file);
 const source=await readFile(path,'utf8');
 for(const match of source.matchAll(/(?:from\s*|import\s*)['"](\.\.?\/[^'"]+)['"]/g))await access(resolve(dirname(path),match[1]));
 count++;
}
console.log(`Validated ${count} JavaScript modules, local imports and Cloudflare static assets. No compilation or database migration required.`);
