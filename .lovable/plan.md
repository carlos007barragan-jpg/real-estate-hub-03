
# Team Payouts: Replace Chart with Clean Summary List

## What Changes

The Team Payouts section on the Supreme Admin dashboard will switch from a bar chart to a clean, card-based list showing each agent with their name, total payout amount, and number of deals closed -- much easier to scan at a glance.

## How It Will Look

Each agent gets a row inside the card:

```text
+-----------------------------------------------+
| Team Payouts          [Weekly] [Monthly] [Yearly] |
+-----------------------------------------------+
| John Smith          3 deals closed    $12,500  |
| Sarah Lee           2 deals closed     $8,200  |
| Mike Johnson        1 deal closed      $4,000  |
+-----------------------------------------------+
```

- Agent name on the left
- Number of deals closed in the middle
- Total payout amount on the right (bold, green)
- If no data for the period, shows "No payout data for this period"

## Technical Details

### Data Changes (`fetchPayoutsData`)
- Update `PayoutData` interface to add a `deals` count field
- Track deal count per agent alongside the payout sum in the existing aggregation loop

### UI Changes (Team Payouts section, ~lines 1279-1293)
- Remove the `BarChart` / `ResponsiveContainer` / `CartesianGrid` / `XAxis` / `YAxis` / `Tooltip` / `Bar` components
- Replace with a simple list of rows, each showing the agent's name, deal count, and formatted payout amount
- Keep the existing period tabs (Weekly / Monthly / Yearly) exactly as they are
- Style using existing card/border utilities for consistency with the rest of the dashboard

Only `src/pages/Dashboard.tsx` needs to change -- no new files, no database changes.
