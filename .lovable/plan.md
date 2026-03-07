

# Agent Performance Dashboard System — Implementation Plan

## Overview

Build a comprehensive KPI-driven performance system with three tiers: **Daily Activity**, **Pipeline Performance**, and **Production KPIs**. Agents see their own progress with visual targets; Management sees a leaderboard with scoring.

## Current State

The dashboard already has:
- Top-level stat cards (calls, messages, leads, appointments, active users)
- Agent Performance table (admin/supreme_admin only) with daily/weekly/monthly toggle
- Today's tasks, past due tasks, upcoming appointments
- Charts (revenue, deals, showings, payouts)

What's missing:
- No defined **standards/targets** against which to measure
- No **scorecard/scoring system**
- No **agent self-view** of their own KPI progress
- No **pipeline conversion** tracking
- No **leaderboard** or ranking

## Architecture

### 1. Database: `performance_standards` table

Stores configurable targets (so Supreme Admins can adjust them from Settings).

```sql
CREATE TABLE performance_standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  metric_key text NOT NULL,        -- e.g. 'daily_calls', 'weekly_appointments', 'monthly_deals'
  category text NOT NULL,          -- 'activity', 'pipeline', 'production'
  period text NOT NULL,            -- 'daily', 'weekly', 'monthly'
  target_value integer NOT NULL,
  label text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, metric_key)
);
```

With RLS: org members can SELECT; supreme_admin can INSERT/UPDATE/DELETE.

Seed default values matching the user's spec (35 daily calls, 10 conversations, 2 daily appointments, 5 monthly deals, etc.).

### 2. New Component: `AgentKPIPanel` (Agent Self-View)

Visible to **all roles** at the top of the dashboard (replaces or sits above the current stat cards for agents).

Three collapsible sections:

**Daily Activity Progress** — circular/bar progress indicators:
- Calls Made: X / 35
- Conversations: X / 10 (calls with duration > 60s)
- Follow-ups: X / 20
- Appointments Set: X / 2

**Weekly Pipeline** — horizontal progress bars:
- New Leads Entered: X / 25
- Qualified Leads: X / 10
- Appointments Scheduled: X / 10
- Property Showings: X / 5
- Offers Submitted: X / 3

**Monthly Production** — large metric cards:
- Deals Closed: X / 5
- Commission Earned: $X

Each bar is color-coded: green (met/exceeded), yellow (50-99%), red (below 50%).

### 3. Scorecard System: `AgentScorecard` Component

Calculates a weekly score per agent:
- **Activity (40%)**: (actual / target) averaged across daily metrics, capped at 100%
- **Pipeline (30%)**: (actual / target) averaged across pipeline metrics
- **Closings (30%)**: (actual / target) for deals closed

Score tiers displayed as badges:
- 90-100: "Elite Producer" (green)
- 75-89: "Performing" (blue)
- 60-74: "Needs Coaching" (yellow)
- Below 60: "Performance Plan" (red)

### 4. Management Leaderboard: `AgentLeaderboard` Component

Supreme Admin / Admin only. Replaces or enhances the current Agent Performance table.

- Ranked list of agents by weekly score
- Columns: Rank, Agent, Score, Activity %, Pipeline %, Closings %, Status Badge
- Clickable rows expand to show detailed breakdowns
- Sortable by any column

Additional management metrics below the leaderboard:
- **Pipeline Conversion Rate**: leads → qualified → showing → offer → closed
- **Avg Lead Response Time**: time from lead creation to first call/SMS
- **Revenue per Agent**: from commission_entries

### 5. Settings: `PerformanceStandardsManager` Component

Added to Settings page, Supreme Admin only. Table of all standards with inline editing of target values.

### 6. Data Flow

All metric calculations reuse existing tables (call_logs, sms_logs, leads, appointments, tasks, lead_deals, commission_entries). No new data collection needed — just computed against the `performance_standards` targets.

"Conversations" = calls with `duration >= 60` (meaningful conversations).
"Follow-ups" = count from `follow_ups` table.
"Offers Submitted" = leads moving to an "Offer" pipeline stage (from lead_deals).
"Qualified Leads" = leads with pipeline_stage beyond "New Lead".

### 7. File Changes Summary

| File | Action |
|------|--------|
| Migration SQL | Create `performance_standards` table + seed defaults |
| `src/components/AgentKPIPanel.tsx` | New — agent self-view with progress bars |
| `src/components/AgentScorecard.tsx` | New — score calculation + badge |
| `src/components/AgentLeaderboard.tsx` | New — management ranked table |
| `src/components/PerformanceStandardsManager.tsx` | New — settings editor |
| `src/pages/Dashboard.tsx` | Add KPI panel for agents, leaderboard for admins |
| `src/pages/Settings.tsx` | Add performance standards tab for supreme_admin |

### 8. Implementation Order

1. Create `performance_standards` table with seed data
2. Build `AgentKPIPanel` — agent daily/weekly/monthly progress view
3. Build `AgentScorecard` — scoring logic
4. Build `AgentLeaderboard` — management view with scores and conversion metrics
5. Integrate into Dashboard (agents see KPI panel; admins see leaderboard)
6. Build `PerformanceStandardsManager` and add to Settings
7. Add lead response time calculation

