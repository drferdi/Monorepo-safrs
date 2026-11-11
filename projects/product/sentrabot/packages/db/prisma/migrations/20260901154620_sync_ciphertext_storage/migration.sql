/*
  Warnings:

  - Added the required column `ciphertext` to the `sync_object_index` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
CREATE SEQUENCE sync_object_index_cursor_seq_seq;
ALTER TABLE "sync_object_index" ADD COLUMN     "ciphertext" TEXT NOT NULL,
ALTER COLUMN "cursor_seq" SET DEFAULT nextval('sync_object_index_cursor_seq_seq');
ALTER SEQUENCE sync_object_index_cursor_seq_seq OWNED BY "sync_object_index"."cursor_seq";
