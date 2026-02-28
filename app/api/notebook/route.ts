import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ExerciseItem, NotebookEntry } from '@/lib/types';

/** GET /api/notebook — fetch all notebook entries (newest first) */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const masteredParam = searchParams.get('mastered');

  let query = supabaseAdmin
    .from('error_notebook')
    .select('*')
    .order('created_at', { ascending: false });

  if (masteredParam !== null) {
    query = query.eq('mastered', masteredParam === 'true');
  }

  const { data, error } = await query;

  if (error) {
    console.error('Notebook GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch notebook.' }, { status: 500 });
  }

  return NextResponse.json({ entries: data as NotebookEntry[] });
}

/** POST /api/notebook — save one or more failed exercises */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { originalText, correctedText, failedExercises } = body as {
      originalText: string;
      correctedText: string;
      failedExercises: ExerciseItem[];
    };

    if (!failedExercises || failedExercises.length === 0) {
      return NextResponse.json({ message: 'No failed exercises to save.' });
    }

    const rows = failedExercises.map((item) => ({
      original_text: originalText,
      corrected_text: correctedText,
      error_category: item.error.category,
      error_description: item.error.explanation,
      error_original: item.error.original,
      error_corrected: item.error.corrected,
      exercise_type: item.exercise.type,
      exercise_data: item.exercise,
    }));

    const { data, error } = await supabaseAdmin
      .from('error_notebook')
      .insert(rows)
      .select();

    if (error) {
      console.error('Notebook POST error:', error);
      return NextResponse.json({ error: 'Failed to save to notebook.' }, { status: 500 });
    }

    return NextResponse.json({ saved: data });
  } catch (err) {
    console.error('Notebook POST error:', err);
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
}
