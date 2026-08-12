import { expect,test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { canonicalizeEvaluationResult,evaluateRequest } from "../src/calculus.ts";
import { validateReachableGraphs } from "../src/calculus.ts";

const root=join(import.meta.dir,"..");
const load=(name:string)=>JSON.parse(readFileSync(join(root,"testdata",name),"utf8"));

test("every structured Calculus envelope matches the shared JCS digest",()=>{
 const corpus=JSON.parse(readFileSync(join(root,"resources","conformance","structured-calculus.json"),"utf8")) as {vectors:Array<{id:string;fixture?:string;recipe_fixture?:string;recipe?:Record<string,unknown>;operation:string;arguments:Record<string,unknown>;expected_jcs_sha256:string}>};
 for(const vector of corpus.vectors){const request=vector.fixture?{bundle:load(vector.fixture),arguments:vector.arguments}:{recipe:vector.recipe_fixture?load(vector.recipe_fixture):vector.recipe!,arguments:vector.arguments};const envelope=evaluateRequest(vector.operation,request);const digest=createHash("sha256").update(canonicalizeEvaluationResult(envelope)).digest("hex");expect(digest,vector.id).toBe(vector.expected_jcs_sha256);}
});

test("reachable graph analysis prunes parameters without activation sites",()=>{
  const parameters=Array.from({length:64},(_,index)=>({id:`toggle_${index}`,kind:"toggle",name:"Unused"}));
  expect(validateReachableGraphs({parameters,ingredients:[],method:{sequence:[]},"x-adversary":{kind:"toggle_is",parameter:"toggle_0",enabled:true}})).toEqual([]);
});

test("reachable graph analysis deduplicates equivalent activation regions",()=>{
  const parameters=Array.from({length:14},(_,index)=>({id:`toggle_${index}`,kind:"toggle",name:"Toggle"}));
  const conditions=parameters.map((parameter)=>({kind:"any",conditions:[
    {kind:"toggle_is",parameter:parameter.id,enabled:true},
    {kind:"toggle_is",parameter:parameter.id,enabled:false},
  ]}));
  expect(validateReachableGraphs({parameters,ingredients:[{id:"always",name:"Always",activation:{kind:"all",conditions}}],method:{sequence:[]}})).toEqual([]);
});
