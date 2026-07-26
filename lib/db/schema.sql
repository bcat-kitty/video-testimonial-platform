-- Debrief schema. Two tables. Apply once with: npm run db:setup
-- Requires Postgres 13+ (for gen_random_uuid). Neon, Supabase, RDS, and local
-- all qualify. Running this again is safe: everything is IF NOT EXISTS.

-- A testimonial someone actually submitted. `approved` is the only publish
-- gate: nothing reaches the public API until you flip it in the admin.
CREATE TABLE IF NOT EXISTS testimonials (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              varchar(255) NOT NULL,
  role              varchar(255) NOT NULL,
  company           varchar(255),
  company_url       text,
  linkedin_url      text,
  -- Never exposed by the public API. Used to match a submission to its request.
  email             varchar(320),
  headshot_url      text,
  video_url         text,
  video_transcript  text,
  situation_before  text,
  what_changed      text,
  recommendation    text,
  category          varchar(50),
  approved          boolean NOT NULL DEFAULT false,
  featured          boolean NOT NULL DEFAULT false,
  -- True when the submission matched a request you sent, so you know it is really them.
  verified_customer boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- A request you sent out. The token in the emailed link points back here, which
-- is how a submission gets verified and how you know who has not replied yet.
-- Status is derived, not stored: cancelled > responded > pending.
CREATE TABLE IF NOT EXISTS testimonial_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token          varchar(64) NOT NULL UNIQUE,
  email          varchar(320) NOT NULL,
  name           varchar(255),
  category       varchar(50),
  custom_message text,
  sent_at        timestamptz NOT NULL DEFAULT now(),
  last_resent_at timestamptz,
  resend_count   integer NOT NULL DEFAULT 0,
  responded_at   timestamptz,
  testimonial_id uuid REFERENCES testimonials(id) ON DELETE SET NULL,
  cancelled_at   timestamptz
);

CREATE INDEX IF NOT EXISTS testimonial_requests_email_idx ON testimonial_requests (email);
CREATE INDEX IF NOT EXISTS testimonial_requests_token_idx ON testimonial_requests (token);
