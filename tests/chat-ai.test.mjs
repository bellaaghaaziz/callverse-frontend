import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
function compile(file,imports={}) {
 const source=fs.readFileSync(new URL('../src/'+file,import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const compiledModule={exports:{}};
 vm.runInNewContext(code,{module:compiledModule,exports:compiledModule.exports,require:name=>imports[name]||require(name)});
 return compiledModule.exports;
}
const presentation=compile('lib/presentation.ts');
const ChatThread=compile('components/ChatThread.tsx',{'@/lib/presentation':presentation}).default;
const message=(id,aiGenerated)=>({id,conversationId:'test',sender:'ADVISOR',content:'Réponse '+id,sentAt:'2026-10-18T09:00:00Z',aiGenerated});
for(const role of ['CUSTOMER','ADVISOR','SUPERVISOR'])test('AI attribution remains visible on every adjacent message for '+role,()=>{
 const ai=renderToStaticMarkup(React.createElement(ChatThread,{role,messages:[message(1,true),message(2,true)]}));
 assert.equal((ai.match(/aria-label="Message rédigé par l&#x27;assistant IA"/g)||[]).length,2);
 assert(!ai.includes('Vous'));
 const human=renderToStaticMarkup(React.createElement(ChatThread,{role,messages:[message(1,false)]}));
 assert(!human.includes('Assistant IA'));
});
test('workforce adapter reads the Spring camelCase contract and retains decision caveats',()=>{
 const {adaptWorkforce}=compile('lib/ai.ts');
 const result=adaptWorkforce({type:'REASSIGN',fromPool:'CARDS',toPool:'ACCOUNTS',count:1,reason:'Test',caveats:['SLA neutre'],decisionId:7,generatedAt:'2026-10-18T09:00:00Z',requiresApproval:true,expectedGain:{}});
 assert.equal(result.fromPool,'CARDS');assert.equal(result.toPool,'ACCOUNTS');assert.equal(result.caveats[0],'SLA neutre');assert.equal(result.decisionId,7);assert.equal(result.requiresApproval,true);
});
