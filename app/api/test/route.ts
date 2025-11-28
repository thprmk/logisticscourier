import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'API test successful' });
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    return NextResponse.json({ message: 'API test successful', received: data });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}