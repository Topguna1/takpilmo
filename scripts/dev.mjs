import { spawn } from 'node:child_process';
const node=process.execPath;
const build=spawn(node,['scripts/build.mjs','--dev'],{stdio:'inherit'});
build.on('exit',code=>{if(code){process.exitCode=code;return;}const port=(process.argv.includes('--port') ? process.argv[process.argv.indexOf('--port')+1] : '4173');const server=spawn(node,['node_modules/serve/build/main.js','.dev','-l',port],{stdio:'inherit'});for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.kill(signal));server.on('exit',exit=>process.exitCode=exit||0);});
