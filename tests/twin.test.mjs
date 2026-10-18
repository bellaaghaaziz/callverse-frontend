import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function load(fetch=async()=>[]) {
 const source=fs.readFileSync(new URL('../src/lib/twin.ts',import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const module={exports:{}};
 vm.runInNewContext(code,{module,exports:module.exports,URLSearchParams,require:name=>{assert.equal(name,'./api');return{apiFetch:fetch};}});
 return module.exports;
}
test('twin calls only authenticated backend routes and preserves strategy and seed',async()=>{
 const calls=[];const {twinApi}=load(async(...args)=>{calls.push(args);return[];});
 const signal=new AbortController().signal;
 await twinApi.scenarios(signal);await twinApi.compare('scenario/one',signal);await twinApi.run('scenario/one','RL_PPO_V1',7,signal);
 assert.deepEqual(calls.map(c=>c[0]),['/scenarios','/twin-runs?scenarioId=scenario%2Fone','/twin-runs']);
 assert.equal(calls[2][1].method,'POST');assert.equal(calls[2][1].signal,signal);
 assert.deepEqual(JSON.parse(calls[2][1].body),{scenarioId:'scenario/one',strategyCode:'RL_PPO_V1',seed:7});
 assert(calls.every(c=>!c[1].headers));
});
test('twin comparison averages complete runs per strategy and counts each seed once',()=>{
 const {summarizeTwinRuns}=load();
 const run=(strategy,seed,value,status='COMPLETED')=>({strategyCode:strategy,seed,status,kpis:{totalConversations:value,slaRatio:value/100,abandonRatio:.2,avgWaitSeconds:value,p95WaitSeconds:value*2}});
 const summary=JSON.parse(JSON.stringify(summarizeTwinRuns([run('STATIC_FIFO',7,20),run('STATIC_FIFO',8,40),run('STATIC_FIFO',7,20),run('THRESHOLD',7,90,'FAILED'),{strategyCode:'RL_PPO_V1',seed:7,status:'RUNNING',kpis:null}])));
 assert.equal(summary.length,1);assert.deepEqual(summary[0].seeds,[7,8]);
 assert(Math.abs(summary[0].kpis.slaRatio-.3)<1e-12);assert.equal(summary[0].kpis.avgWaitSeconds,30);assert.equal(summary[0].kpis.totalConversations,30);
});
test('twin uses French percentages and correctly rolls rounded waits into the next minute',()=>{
 const {twinPercent,twinWait}=load();assert.match(twinPercent(.4259),/42,6/);assert.equal(twinWait(59.6),'1:00');assert.equal(twinWait(201.2),'3:21');assert.equal(twinWait(0),'0:00');
});
