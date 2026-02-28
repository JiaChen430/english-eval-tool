import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/** PATCH /api/notebook/[id] — update a notebook entry (e.g., mark mastered, increment attempts) */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();

    const allowedFields = ['mastered', 'attempt_count', 'last_attempted_at'];
    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('error_notebook')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Notebook PATCH error:', error);
      return NextResponse.json({ error: 'Failed to update entry.' }, { status: 500 });
    }

    return NextResponse.json({ entry: data });
  } catch (err) {
    console.error('Notebook PATCH error:', err);
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
}

/** DELETE /api/notebook/[id] — remove a notebook entry */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  const { error } = await supabaseAdmin.from('error_notebook').delete().eq('id', id);

  if (error) {
    console.error('Notebook DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete entry.' }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
