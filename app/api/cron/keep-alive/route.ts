import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    // 1. Protect the route so only your automated cron job can run it
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    // 2. Connect to Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables are missing.');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. The Ping: Make the smallest possible database query
    // We just ask for the ID of 1 single row from the 'bookings' table
    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .limit(1);

    if (error) {
      // If bookings table doesn't exist or isn't accessible, we just ignore the error.
      // The fact that it tried to run a query is enough activity for Supabase!
      console.warn('Query returned an error, but activity was still registered:', error.message);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Supabase heartbeat successful', 
      time: new Date().toISOString() 
    });

  } catch (error) {
    console.error('Keep-alive ping failed:', error);
    return NextResponse.json({ success: false, error: 'Ping failed' }, { status: 500 });
  }
}
