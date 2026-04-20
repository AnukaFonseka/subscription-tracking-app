# Supabase Keep-Alive Setup

## Problem

Supabase free tier pauses projects after **7 days of inactivity**. Once paused, the project's DNS stops resolving and all API calls fail until the project is manually resumed via the Supabase dashboard.

### What we tried first (didn't work)

A GitHub Actions workflow was set up on April 8, 2025 to ping the Supabase REST API with a `GET` request every Thursday and Saturday:

```yaml
curl -X GET "$SUPABASE_URL/rest/v1/payments?select=id&limit=1"
```

This ran successfully on April 10 and April 12, but the project still paused before April 17. The April 17 run failed with:

```
curl: (6) Could not resolve host: <project-id>.supabase.co
```

**Root cause:** Supabase's free tier does not count anonymous `GET` requests as "activity" for pause prevention. The project was already paused by the time the workflow ran.

The original cron `30 18 * * 6,4` also had a bug — the comment said "Sunday and Friday" but it actually ran on **Thursday (4) and Saturday (6)**.

---

## Solution

### 1. Create a `keepalive` table in Supabase

Run this in the Supabase SQL editor:

```sql
create table keepalive (
  id int primary key,
  last_ping timestamptz
);

insert into keepalive (id, last_ping) values (1, now());
```

Disable RLS on this table (it contains no sensitive data) or add a policy that allows the service role key to update it.

### 2. GitHub Actions workflow

File: `.github/workflows/keep_alive.yml`

The workflow now uses a **POST upsert** to the `keepalive` table instead of a GET read. A write operation is far more likely to register as real activity in Supabase's inactivity tracking.

**Schedule:** Every Monday, Thursday, and Sunday at 18:30 UTC — maximum gap between pings is **3 days**, well within any inactivity threshold.

**Required GitHub secrets:**

| Secret | Value |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL, e.g. `https://<id>.supabase.co` |
| `SUPABASE_KEY` | Your Supabase `service_role` key (not the `anon` key) |

The `--fail` flag on curl ensures the job exits with a non-zero code if Supabase returns an HTTP error, making failures visible in GitHub Actions.

---

## How to test manually

You do not need to wait a week to verify the setup works. Use either method:

### Option A — Trigger the workflow manually

1. Go to your GitHub repo → **Actions** tab
2. Select **Keep Supabase Alive** from the left sidebar
3. Click **Run workflow** → **Run workflow**
4. Watch the job logs — it should complete in under 5 seconds with no errors

### Option B — Run the curl command locally

Replace the placeholders and run this in your terminal:

```bash
curl --fail -X POST "https://<your-project-id>.supabase.co/rest/v1/keepalive" \
  -H "apikey: <your-service-role-key>" \
  -H "Authorization: Bearer <your-service-role-key>" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d '{"id": 1, "last_ping": "now()"}'
```

Expected: an empty `200 OK` or `201 Created` response with no error output.

### Verify the ping was recorded

After either method, go to the Supabase dashboard → **Table Editor** → `keepalive` table. The `last_ping` column on row `id=1` should show the current timestamp.

If `last_ping` updated, the write reached the database and the project is considered active.

---

## Cron schedule reference

```
30 18 * * 1,4,0
│  │  │ │ └── Days: Monday (1), Thursday (4), Sunday (0)
│  │  │ └──── Month: every month
│  │  └────── Day of month: every day
│  └───────── Hour: 18 UTC
└──────────── Minute: 30
```

Next scheduled runs (from any given week): Sunday, Monday, Thursday — then repeats.
