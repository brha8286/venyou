-- Drop poc_phone and poc_email (consolidated to single phone/email per contact)
-- Drop tags (added by contacts_tags migration but removed from schema)
ALTER TABLE "contacts"
  DROP COLUMN IF EXISTS "poc_phone",
  DROP COLUMN IF EXISTS "poc_email",
  DROP COLUMN IF EXISTS "tags";
