export type SystemData = {
  health: {
    id: string;
    label: string;
    status: "ok" | "warn" | "bad" | "idle";
    detail: string;
  }[];
  tables: { name: string; count: number }[];
  alertRuns: {
    id: string;
    started_at: string;
    finished_at: string | null;
    status: string;
    users_processed: number;
    error_message: string | null;
  }[];
  machineLogs: {
    id: string;
    user_id: string;
    protocol: string;
    roaster_key: string;
    success: boolean;
    created_at: string;
    error_message: string | null;
    display_name: string;
  }[];
  machineSummary: {
    total: number;
    ok: number;
    fail: number;
    failRate: number | null;
  };
  billingIntegrity: {
    polarLinked: number;
    paidPlans: number;
    subscriptionRows: number;
    billableSubs: number;
    incompleteCheckout: number;
    orphanNote: string | null;
  };
  sessionGeo: {
    distinctIps: number;
    totalSessions: number;
  };
  generatedAt: string;
};
