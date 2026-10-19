import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const code=ts.transpileModule(fs.readFileSync(new URL('../src/lib/workforce-presentation.ts',import.meta.url),'utf8'),
  {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const compiled={exports:{}};
vm.runInNewContext(code,{module:compiled,exports:compiled.exports});
const {workforceWaitLabel,workforceNoTransferTitle}=compiled.exports;

test('a no-transfer result with a waiting fraud contact requires review, not reassurance',()=>{
  assert.equal(workforceNoTransferTitle({ACCOUNTS:0,CARDS:0,CREDIT:0,FRAUD:1}),'Files en attente : revue nécessaire');
  assert.equal(workforceNoTransferTitle({ACCOUNTS:0,CARDS:0,CREDIT:0,FRAUD:0}),'Aucun renfort nécessaire');
});

test('workforce waiting durations retain their units and handle rounding boundaries',()=>{
  assert.equal(workforceWaitLabel(43559),'12 h 5 min 59 s');
  assert.equal(workforceWaitLabel(0),'0 s');
  assert.equal(workforceWaitLabel(59.9),'1 min');
  assert.equal(workforceWaitLabel(3599.9),'1 h 0 min');
  assert.equal(workforceWaitLabel(undefined),'—');
});
