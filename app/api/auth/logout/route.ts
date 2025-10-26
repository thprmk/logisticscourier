// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ message: 'Logout successful' });
  
  // Clear the token cookie by setting its maxAge to a past time
  response.cookies.set('token', '', { 
    httpOnly: true, 
    path: '/', 
    maxAge: -1 
  });

  return response;
}