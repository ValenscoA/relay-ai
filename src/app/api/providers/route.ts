import { NextResponse } from "next/server";
import { providerSchema } from "@/lib/security";
import { encryptSecret } from "@/lib/crypto";
import { OpenAICompatibleProvider } from "@/providers/openai-compatible";

export async function POST(request:Request){try{const value=providerSchema.parse(await request.json());const adapter=new OpenAICompatibleProvider(value.baseUrl,value.apiKey,value.customHeaders);const result=await adapter.validateConnection();return NextResponse.json({...result,encryptedApiKey:encryptSecret(value.apiKey),maskedKey:`••••${value.apiKey.slice(-4)}`});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Invalid provider"},{status:400});}}
