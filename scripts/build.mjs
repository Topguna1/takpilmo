import { build } from 'esbuild';
import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import path from 'node:path';
const dev=process.argv.includes('--dev');
const output=dev?'.dev':'dist';
const root=process.cwd(), target=path.resolve(output);
if(path.dirname(target)!==root || !['dist','.dev'].includes(path.basename(target)))throw Error('Unsafe build output');
await rm(target,{recursive:true,force:true});await mkdir(target,{recursive:true});
for(const name of ['assets','LICENSE','DATA_LICENSE'])await cp(name,path.join(output,name),{recursive:true});
// Render the canonical license files as HTML so static hosting displays them inline.
const escapeHtml = text => text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
await mkdir(path.join(output,'licenses'),{recursive:true});
for(const [slug,file,title] of [['content','DATA_LICENSE','콘텐츠 라이선스'],['source','LICENSE','소스 라이선스']]) {
  const text=await readFile(file,'utf8');
  await writeFile(path.join(output,'licenses',slug+'.html'),`<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — 딱필모</title><link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
<style>:root{color-scheme:light dark}body{margin:0;background:#f7f8fa;color:#172533;font:1rem/1.7 system-ui,sans-serif}main{max-width:76ch;margin:auto;padding:32px 20px 64px}a{color:#087b83}h1{font-size:clamp(1.5rem,5vw,2rem)}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}nav{display:flex;gap:20px;flex-wrap:wrap;border-top:1px solid #8b99a444;padding-top:20px;margin-top:32px}@media(prefers-color-scheme:dark){body{background:#141e25;color:#e3eaf0}a{color:#8edbe0}}</style></head>
<body><main><a href="../index.html#/">← 딱필모 홈</a><h1>${title}</h1><pre lang="en">${escapeHtml(text)}</pre><nav aria-label="라이선스"><a href="content.html">콘텐츠 라이선스</a><a href="source.html">소스 라이선스</a></nav></main></body></html>`);
}
await mkdir(path.join(output,'data'),{recursive:true});
for(const name of ['sheet-snapshot.json','site-details.json','site-introductions.json'])await cp('data/'+name,output+'/data/'+name);
let html=await readFile('index.html','utf8');
let adminHtml=await readFile('admin.html','utf8');
if(dev){
  await cp('js',output+'/js',{recursive:true});await cp('styles.css',output+'/styles.css');
  await build({entryPoints:['js/info/firebase-client.module.js','js/info/firebase-auth.module.js'],bundle:true,splitting:true,format:'esm',platform:'browser',target:['es2022'],outdir:output+'/js/info',chunkNames:'chunks/[name]-[hash]'});
}else{
  const result=await build({entryPoints:{app:'js/hub/app.module.js',admin:'js/admin/admin.module.js',styles:'styles.css'},bundle:true,splitting:true,format:'esm',platform:'browser',target:['es2022'],minify:true,metafile:true,outdir:output+'/assets',entryNames:'[name]-[hash]',chunkNames:'chunks/[name]-[hash]',legalComments:'linked'});
  const files=Object.keys(result.metafile.outputs);
  const entry=files.find(name=>result.metafile.outputs[name].entryPoint==='js/hub/app.module.js');
  const adminEntry=files.find(name=>result.metafile.outputs[name].entryPoint==='js/admin/admin.module.js');
  const css=files.find(name=>name.endsWith('.css'));
  html=html.replace('js/hub/app.module.js',entry.slice(output.length+1)).replace('href="styles.css"','href="'+css.slice(output.length+1)+'"');
  adminHtml=adminHtml.replace('js/admin/admin.module.js',adminEntry.slice(output.length+1)).replace('href="styles.css"','href="'+css.slice(output.length+1)+'"');
  await mkdir('test-results',{recursive:true});await writeFile('test-results/build-meta.json',JSON.stringify(result.metafile,null,2));
  const bytes=Object.values(result.metafile.outputs).reduce((sum,file)=>sum+file.bytes,0);
  console.log('Production JS/CSS: '+Math.round(bytes/1024)+' KiB uncompressed');
}
await writeFile(output+'/admin.html',adminHtml);
await writeFile(output+'/index.html',html);await writeFile(output+'/.nojekyll','');
// A real static 404 document; do not turn missing assets into successful HTML responses.
await writeFile(output+'/404.html','<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>페이지를 찾을 수 없어요 — 딱필모</title><body><main><h1>페이지를 찾을 수 없어요</h1><p>주소를 확인하거나 홈에서 다시 찾아보세요.</p><a href="https://topguna1.github.io/takpilmo/">딱필모 홈으로</a></main></body></html>');
console.log('Built '+output);
