-- RESTRICT is checked immediately, so when a user or workspace is deleted the
-- usage_reservations cascade (whose trigger was created first) fires while the
-- usage_ledger rows still exist and the delete fails. NO ACTION is checked at
-- end of statement, after the ledger rows have cascaded away, and still forbids
-- deleting a reservation that a live ledger row points at.
ALTER TABLE "usage_ledger" DROP CONSTRAINT "usage_ledger_reservation_id_fkey";
ALTER TABLE "usage_ledger" ADD CONSTRAINT "usage_ledger_reservation_id_fkey"
  FOREIGN KEY ("reservation_id") REFERENCES "usage_reservations"("id")
  ON DELETE NO ACTION ON UPDATE CASCADE;
