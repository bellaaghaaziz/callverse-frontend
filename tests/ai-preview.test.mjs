import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function route(fetch, key = "test-key") {
  const compiledModule = {exports:{}};
  const source = fs.readFileSync(new URL("../src/app/api/ai-preview/route.ts", import.meta.url), "utf8");
  vm.runInNewContext(ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, {
    module:compiledModule, exports:compiledModule.exports, require:()=>({NextResponse:{json:Response.json}}),
    process:{env:{AI_PREVIEW_KEY:key}}, fetch, AbortSignal, Number,
  });
  return compiledModule.exports;
}
const request = body => new Request("http://localhost/api/ai-preview", {method:"POST",headers:{"Authorization":"Bearer demo","Content-Type":"application/json"},body:JSON.stringify(body)});
test("AI preview stays disabled without its server key", async()=>{
  const api=route(()=>{throw new Error("unexpected outbound request");},"");
  assert.equal((await api.POST(request({feature:"suggestion"}))).status,503);
});
test("AI preview refuses unauthenticated requests before calling upstream", async()=>{
  const api=route(()=>{throw new Error("unexpected outbound request");});
  assert.equal((await api.GET(new Request("http://localhost/api/ai-preview"))).status,401);
});
test("AI preview excludes customers and reserves workforce for supervisors", async()=>{
  for(const role of ["CUSTOMER","ADVISOR"]){
    let calls=0;
    const api=route(async()=>{calls++;return Response.json({role});});
    assert.equal((await api.POST(request({feature:"workforce"}))).status,403);
    assert.equal(calls,1);
  }
});
test("AI preview preserves backend conversation access denial", async()=>{
  let calls=0;
  const api=route(async()=>++calls===1?Response.json({role:"ADVISOR"}):Response.json({}, {status:403}));
  assert.equal((await api.POST(request({feature:"suggestion",conversationId:"10000000-0000-4000-8000-000000000001"}))).status,403);
  assert.equal(calls,2);
});
test("AI preview forwards workforce only to its fixed service path", async()=>{
  const calls=[];
  const api=route(async(url,options)=>{calls.push({url,options});return Response.json(calls.length===1?{role:"SUPERVISOR"}:{type:"NONE"});});
  const state={queues:{ACCOUNT:0}};
  assert.equal((await api.POST(request({feature:"workforce",strategy:"STATIC_FIFO",state}))).status,200);
  assert.equal(calls[1].url,"http://127.0.0.1:8001/ai/workforce/decide?strategy=STATIC_FIFO");
  assert.equal(calls[1].options.headers["x-preview-key"],"test-key");
  assert.deepEqual(JSON.parse(calls[1].options.body),state);
});

test("advisor preview authenticates the AI service and cannot execute live banking tools", async()=>{
  const calls=[];
  const api=route(async(url,options)=>{
    calls.push({url,options});
    const responses=[{role:"ADVISOR"},{id:"10000000-0000-4000-8000-000000000001",customerId:"20000000-0000-4000-8000-000000000001"},
      {messages:[{sender:"CUSTOMER",content:"Write to test@example.com, card 1234567890123456",sentAt:"2026-10-18T12:00:00Z"}]},
      {tenureMonths:12,segment:"MASS"},{reply:"Proposal"}];
    return Response.json(responses[calls.length-1]);
  });
  assert.equal((await api.POST(request({feature:"suggestion",conversationId:"10000000-0000-4000-8000-000000000001"}))).status,200);
  const sent=JSON.parse(calls[4].options.body);
  assert.equal(sent.mode,"SIMULATION");
  assert.equal(calls[4].options.headers["x-ai-key"],"test-key");
  assert.ok(!sent.message.includes("test@example.com"));
  assert.ok(!sent.message.includes("1234567890123456"));
  assert.equal(calls.length,5);
});
