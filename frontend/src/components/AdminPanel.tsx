"use client";

/**
 * Admin Panel
 * 
 * Demo control surface for triggering flight cancellations
 * and forcing monitor cycles. This is the "visceral demo moment"
 * component - judges see ETH appear after clicking "Cancel Flight."
 */

import { useState, useEffect, useCallback } from "react";
import { runMonitorCycle, getMonitorActivity, getAllTriggers } from "@/lib/near/contract";
import type { TriggerView } from "@/types/contract";
import { useQueryClient } from "@tanstack/react-query";

interface ActivityEntry {
  
}