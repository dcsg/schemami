import { expect,test } from "bun:test";
import { parse } from "@schemami/sdk";
import { evaluate } from "@schemami/sdk/calculus";
import { compare } from "@schemami/sdk/diff";

test("package export map exposes Core, admitted Calculus, and Diff",()=>{expect(parse).toBeFunction();expect(evaluate).toBeFunction();expect(compare).toBeFunction();});
