from unittest import TestCase

from sentra_mantra_integrations.rme_bridge.sources.readonly_db import ReadOnlyDBSource


class FakeCursor:
	description = (("id",), ("name",))

	def __init__(self):
		self.sql = None

	def execute(self, sql):
		self.sql = sql

	def fetchall(self):
		return [(1, "Ayu"), (2, "Bima")]

	def close(self):
		pass


class FakeConnection:
	def __init__(self):
		self.cursor_instance = FakeCursor()
		self.closed = False

	def cursor(self):
		return self.cursor_instance

	def close(self):
		self.closed = True


class TestReadOnlyDBSource(TestCase):
	def test_fetches_rows_with_select_only(self):
		conn = FakeConnection()
		source = ReadOnlyDBSource(
			driver="mysql",
			table_map={"patient": "patients"},
			limit=2,
			connection_factory=lambda: conn,
		)

		rows = source.fetch("patient")

		self.assertEqual(rows, [{"id": 1, "name": "Ayu"}, {"id": 2, "name": "Bima"}])
		self.assertEqual(conn.cursor_instance.sql, "select * from `patients` limit 2")
		self.assertTrue(conn.closed)

	def test_rejects_unsafe_table_identifier(self):
		source = ReadOnlyDBSource(
			driver="mysql",
			table_map={"patient": "patients; drop table patients"},
			connection_factory=FakeConnection,
		)

		with self.assertRaisesRegex(ValueError, "Unsafe RME table identifier"):
			source.fetch("patient")
