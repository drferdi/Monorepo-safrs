-- Clay mascot becomes the default avatar style. Users still on the old implicit
-- default ("robot") are moved to the new default; explicit "organic" choices stay.
ALTER TABLE "user" ALTER COLUMN "avatarStyle" SET DEFAULT 'clay';
UPDATE "user" SET "avatarStyle" = 'clay' WHERE "avatarStyle" = 'robot';
