import { build } from 'esbuild';
import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import path from 'node:path';
const dev=process.argv.includes('--dev');
const output=dev?'.dev':'dist';
const root=process.cwd(), target=path.resolve(output);
if(path.dirname(target)!==root || !['dist','.dev'].includes(path.basename(target)))throw Error('Unsafe build output');
await rm(target,{recursive:true,force:true});await mkdir(target,{recursive:true});
for(const name of ['assets','LICENSE','DATA_LICENSE'])await cp(name,path.join(output,name),{recursive:true});
await mkdir(path.join(output,'data'),{recursive:true});
for(const name of ['sheet-snapshot.json','site-details.json','site-introductions.json'])await cp('data/'+name,output+'/data/'+name);
let html=await readFile('index.html','utf8');
if(dev){
  await cp('js',output+'/js',{recursive:true});await cp('styles.css',output+'/styles.css');
  await build({entryPoints:['js/info/firebase-client.module.js','js/info/firebase-auth.module.js'],bundle:true,splitting:true,format:'esm',platform:'browser',target:['es2022'],outdir:output+'/js/info',chunkNames:'chunks/[name]-[hash]'});
}else{
  const result=await build({entryPoints:{app:'js/hub/app.module.js',styles:'styles.css'},bundle:true,splitting:true,format:'esm',platform:'browser',target:['es2022'],minify:true,metafile:true,outdir:output+'/assets',entryNames:'[name]-[hash]',chunkNames:'chunks/[name]-[hash]',legalComments:'linked'});
  const files=Object.keys(result.metafile.outputs);
  const entry=files.find(name=>result.metafile.outputs[name].entryPoint==='js/hub/app.module.js');
  const css=files.find(name=>name.endsWith('.css'));
  html=html.replace('js/hub/app.module.js',entry.slice(output.length+1)).replace('href="styles.css"','href="'+css.slice(output.length+1)+'"');
  await mkdir('test-results',{recursive:true});await writeFile('test-results/build-meta.json',JSON.stringify(result.metafile,null,2));
  const bytes=Object.values(result.metafile.outputs).reduce((sum,file)=>sum+file.bytes,0);
  console.log('Production JS/CSS: '+Math.round(bytes/1024)+' KiB uncompressed');
}
await writeFile(output+'/index.html',html);await writeFile(output+'/.nojekyll','');
// A real static 404 document; do not turn missing assets into successful HTML responses.
await writeFile(output+'/404.html','<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>페이지를 찾을 수 없어요 — 딱필모</title><body><main><h1>페이지를 찾을 수 없어요</h1><p>주소를 확인하거나 홈에서 다시 찾아보세요.</p><a href="https://topguna1.github.io/takpilmo/">딱필모 홈으로</a></main></body></html>');
console.log('Built '+output);
