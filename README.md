# English Eval

An AI-powered English expression evaluation web app. Paste your English text, receive a score and corrections, practice targeted exercises, and track errors in your personal notebook.

## Features

| Feature | Description |
|---|---|
| **Evaluate** | Paste text → get a 0–100 score, corrected version, and errors grouped by category (Grammar, Vocabulary, Naturalness, Punctuation) |
| **Practice** | AI-generated fill-in-the-blank and multiple-choice exercises for each error — 70% pass threshold |
| **Error Notebook** | Failed exercises are automatically saved to Supabase for later review |
| **Review Mode** | Re-practice notebook errors; passing (≥70%) marks them as mastered |

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **AI**: Anthropic Claude API (`claude-opus-4-6`)
- **Deployment**: Vercel

## Project Structure

```
english-eval/
├── app/
│   ├── layout.tsx              # Root layout + Navigation
│   ├── page.tsx                # Home — text input & evaluation results
│   ├── practice/page.tsx       # Practice exercises from latest evaluation
│   ├── notebook/page.tsx       # Error notebook (view, filter, delete)
│   ├── review/page.tsx         # Review & master notebook errors
│   └── api/
│       ├── evaluate/route.ts   # POST — evaluate text + generate exercises
│       └── notebook/
│           ├── route.ts        # GET (list) + POST (save failed exercises)
│           └── [id]/route.ts   # PATCH (update) + DELETE
├── components/
│   └── Navigation.tsx          # Top navigation bar
├── lib/
│   ├── types.ts                # Shared TypeScript types
│   └── supabase.ts             # Supabase admin client (server-side)
└── supabase/
    └── migrations/
        └── 001_init.sql        # Database schema
```

## Setup

### 1. Clone & Install

```bash
git clone <repo-url>
cd english-eval
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

| Variable | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com/) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API → `service_role` key |

### 3. Database Migration

Run the SQL migration in your Supabase project:

1. Go to your Supabase project → **SQL Editor**
2. Open and paste the contents of `supabase/migrations/001_init.sql`
3. Click **Run**

Or use the Supabase CLI:

```bash
supabase db push
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push to GitHub
2. Import the repo in [vercel.com](https://vercel.com)
3. Add the three environment variables in Vercel project settings
4. Deploy

## How It Works

### Evaluation Flow

```
User input → POST /api/evaluate
  → Claude: score + corrected text + errors
  → Claude: exercises for each error
  → Display results + store in localStorage
  → "Practice" button navigates to /practice
```

### Practice Flow

```
/practice reads localStorage
  → Show exercises (fill-in-blank / multiple-choice)
  → User submits answers
  → Calculate score
  → Save failed exercises → POST /api/notebook
  → Show pass/fail result
```

### Review Flow

```
/review fetches GET /api/notebook?mastered=false
  → Re-show stored exercises
  → User submits answers
  → If ≥70% correct → PATCH /api/notebook/:id { mastered: true }
```

## API Reference

### `POST /api/evaluate`

**Body**: `{ text: string }` (max 5000 chars)

**Response**:
```json
{
  "evaluation": {
    "score": 72,
    "correctedText": "…",
    "errors": [
      {
        "id": "err1",
        "category": "grammar",
        "original": "I goed to store",
        "corrected": "I went to the store",
        "explanation": "…"
      }
    ]
  },
  "exercises": [
    {
      "errorId": "err1",
      "error": { … },
      "exercise": {
        "type": "fill-in-blank",
        "sentence": "Yesterday I ___ to the store.",
        "answer": "went"
      }
    }
  ]
}
```

### `GET /api/notebook`

Query params: `?mastered=true|false` (optional)

### `POST /api/notebook`

**Body**: `{ originalText, correctedText, failedExercises: ExerciseItem[] }`

### `PATCH /api/notebook/:id`

**Body**: any subset of `{ mastered, attempt_count, last_attempted_at }`

### `DELETE /api/notebook/:id`

## License

MIT
