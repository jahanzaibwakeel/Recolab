ALTER TABLE model_versions
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS governance_notes TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'model_versions_approval_status_check'
  ) THEN
    ALTER TABLE model_versions
      ADD CONSTRAINT model_versions_approval_status_check
      CHECK (approval_status IN ('pending','approved','rejected'));
  END IF;
END $$;

UPDATE model_versions
SET approval_status = CASE
  WHEN status = 'active' THEN 'approved'
  WHEN status = 'archived' THEN 'approved'
  WHEN status = 'failed' THEN 'rejected'
  ELSE approval_status
END
WHERE approval_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_model_versions_governance ON model_versions(approval_status, status, created_at DESC);
