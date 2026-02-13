import { NextResponse } from 'next/server';

export async function GET() {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const browserbaseKey = process.env.BROWSERBASE_API_KEY;
  
  return NextResponse.json({
    anthropicKey: anthropicKey ? `${anthropicKey.substring(0, 15)}...${anthropicKey.substring(anthropicKey.length - 5)}` : 'NOT SET',
    browserbaseKey: browserbaseKey ? `${browserbaseKey.substring(0, 10)}...` : 'NOT SET',
    nodeEnv: process.env.NODE_ENV,
  });
}
