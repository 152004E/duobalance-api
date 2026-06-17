-- Split User.name into firstName + lastName

-- Add nullable columns first
ALTER TABLE "User" ADD COLUMN "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN "lastName" TEXT DEFAULT '';

-- Copy existing data: move name to firstName, lastName stays empty
UPDATE "User" SET "firstName" = "name";

-- Make firstName NOT NULL (all rows have data now)
ALTER TABLE "User" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "lastName" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "lastName" SET NOT NULL;

-- Drop old column
ALTER TABLE "User" DROP COLUMN "name";
