/**
 * Activity Log (module-level state for serverless)
 */

export interface ActivityEntry {
  timestamp: string;
  triggerId: string;
  flight: string;
  status: string;
  conditionMet: boolean;
  txHash?: string;
}

const recentActivity: ActivityEntry[] = [];

export function logActivity(entry: ActivityEntry) {
  recentActivity.unshift(entry);
  if (recentActivity.length > 50) recentActivity.pop();
}

export function getActivity(): ActivityEntry[] {
  return recentActivity;
}
