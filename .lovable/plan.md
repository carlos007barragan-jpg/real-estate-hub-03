

# Fix KPI Panel Metrics to Match Dashboard Data

## Problem
The KPI panel metrics don't align with what's actually trackable and what the dashboard already shows:
- **Daily Tasks** currently queries tasks by `due_date` range, but should count **completed tasks today** (matching the "Tasks Done Today" section)
- **Upcoming Appointments** is fine — shows appointments scheduled for today
- **Appointments Set** currently counts appointments **created today**, but should count appointments **completed** from the lead page (status = 'completed', completed today)

## Changes (single file: `src/components/AgentKPIPanel.tsx`)

### 1. Daily Tasks query
Change from querying by `due_date` to querying tasks where `status = 'completed'` and `completed_at` falls within today. This correlates with the "Tasks Done Today" dashboard section.

### 2. Appointments Set query  
Change from counting appointments created today to counting appointments where `status = 'completed'` and the completion happened today (using `updated_at` within today's range since there's no dedicated `completed_at` on appointments). This reflects appointments actually done from the lead page.

### 3. Upcoming Appointments query
Keep as-is — appointments with `appointment_date` today. This correlates with the Upcoming Appointments widget.

## Summary of metric definitions after fix
| Metric | Source | Filter |
|--------|--------|--------|
| Outbound Calls | `call_logs` | created today |
| Daily Tasks | `tasks` | `status = 'completed'`, `completed_at` today |
| Upcoming Appointments | `appointments` | `appointment_date` today |
| Appointments Set | `appointments` | `status = 'completed'`, `updated_at` today |

