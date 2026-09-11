import { describe, expect, it } from "vitest";
import { calculateUsage } from "./usage";
describe("calculateUsage",()=>{it("calculates throughput and per-token estimates",()=>{expect(calculateUsage({inputTokens:1_000_000,outputTokens:500_000,durationMs:11_000,ttftMs:1_000,inputPricePerMillion:2,outputPricePerMillion:6})).toEqual({totalTokens:1_500_000,tokensPerSecond:50_000,estimatedInputCost:2,estimatedOutputCost:3,estimatedTotalCost:5})});it("handles missing usage",()=>{expect(calculateUsage({durationMs:0,inputPricePerMillion:1,outputPricePerMillion:1}).totalTokens).toBe(0)})});
