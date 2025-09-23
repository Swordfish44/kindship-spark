-- Create receipt_logs table for email tracking and idempotency
CREATE TABLE IF NOT EXISTS receipt_logs (
  id bigserial PRIMARY KEY,
  donation_pi text UNIQUE NOT NULL,
  donor_email text,
  organizer_email text,
  receipt_sent_at timestamptz,
  organizer_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS receipt_logs_receipt_sent_idx ON receipt_logs (receipt_sent_at);

-- Add missing columns to donations table for proper webhook handling
ALTER TABLE donations 
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'usd',
ADD COLUMN IF NOT EXISTS net_to_organizer_cents bigint,
ADD COLUMN IF NOT EXISTS refunded_cents bigint DEFAULT 0;