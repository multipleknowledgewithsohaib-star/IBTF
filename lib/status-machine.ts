export const statuses = [
  "Uploaded",
  "Validation Failed",
  "Validated",
  "Business Decision Required",
  "Halted",
  "Eligible for Payment",
  "Draft Batch",
  "Submitted for Approval",
  "Returned for Amendment",
  "Approved",
  "Rejected",
  "Sent to Bank",
  "Sent for Processing",
  "Bank Confirmation Pending",
  "Reconciliation Exception",
  "Processed Successfully",
  "Cancelled",
] as const;

export type WorkflowStatus = (typeof statuses)[number];

const transitions: Partial<Record<WorkflowStatus, readonly WorkflowStatus[]>> = {
  Uploaded: ["Validated", "Validation Failed", "Cancelled"],
  "Validation Failed": ["Uploaded", "Cancelled"],
  Validated: ["Business Decision Required", "Eligible for Payment", "Cancelled"],
  "Business Decision Required": ["Eligible for Payment", "Halted"],
  Halted: ["Business Decision Required", "Cancelled"],
  "Eligible for Payment": ["Draft Batch", "Cancelled"],
  "Draft Batch": ["Submitted for Approval", "Cancelled"],
  "Submitted for Approval": ["Approved", "Returned for Amendment", "Rejected"],
  "Returned for Amendment": ["Submitted for Approval", "Cancelled"],
  Approved: ["Sent to Bank", "Sent for Processing", "Cancelled"],
  "Sent to Bank": ["Bank Confirmation Pending"],
  "Sent for Processing": ["Bank Confirmation Pending", "Reconciliation Exception"],
  "Bank Confirmation Pending": ["Processed Successfully", "Reconciliation Exception"],
  "Reconciliation Exception": ["Bank Confirmation Pending", "Processed Successfully", "Cancelled"],
};

export function canTransition(from: WorkflowStatus, to: WorkflowStatus): boolean {
  return transitions[from]?.includes(to) ?? false;
}

export function assertTransition(from: WorkflowStatus, to: WorkflowStatus): void {
  if (!canTransition(from, to)) throw new Error(`Invalid status transition: ${from} -> ${to}`);
}
