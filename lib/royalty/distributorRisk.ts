export type DistributorRiskLevel = "low" | "medium" | "high";

export type DistributorRiskResult = {
  distributor: string;
  level: DistributorRiskLevel;
  notes: string;
};

export function getDistributorRisk(
  distributor: string | null
): DistributorRiskResult {
  if (distributor === null) {
    return {
      distributor: "Unknown",
      level: "medium",
      notes: "Unknown distributor; metadata risk unknown.",
    };
  }

  const d = distributor.toLowerCase();

  if (d.includes("distrokid")) {
    return {
      distributor,
      level: "high",
      notes: "High risk of missing performer claims and legacy registrations.",
    };
  }

  if (d.includes("tunecore")) {
    return {
      distributor,
      level: "medium",
      notes: "Older releases may have incomplete metadata.",
    };
  }

  if (d.includes("cd baby") || d.includes("cdbaby")) {
    return {
      distributor,
      level: "medium",
      notes: "Legacy catalog may require manual reconciliation.",
    };
  }

  return {
    distributor,
    level: "low",
    notes: "No elevated distributor risk detected.",
  };
}
