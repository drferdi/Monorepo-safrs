"""Read-only database source for legacy RME pulls.

The connector only emits SELECT statements. Credentials are read from env vars
or injected by tests; never store or print passwords here.
"""

from __future__ import annotations

import os
import re
from typing import Any

from sentra_mantra_integrations.rme_bridge.sources.base import Source

IDENTIFIER_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$")


class ReadOnlyDBSource(Source):
	kind = "readonly_db"

	def __init__(
		self,
		driver: str | None = None,
		host: str | None = None,
		port: int | str | None = None,
		database: str | None = None,
		user: str | None = None,
		password: str | None = None,
		table_map: dict[str, str] | None = None,
		limit: int | None = None,
		connection_factory=None,
		connection_label: str | None = None,
	) -> None:
		self.driver = (driver or os.getenv("MANTRA_RME_DB_DRIVER") or "mysql").lower()
		self.host = host or os.getenv("MANTRA_RME_DB_HOST")
		self.port = int(port or os.getenv("MANTRA_RME_DB_PORT") or self._default_port())
		self.database = database or os.getenv("MANTRA_RME_DB_NAME")
		self.user = user or os.getenv("MANTRA_RME_DB_USER")
		self.password = password or os.getenv("MANTRA_RME_DB_PASSWORD")
		self.table_map = table_map or self._table_map_from_env()
		self.limit = int(limit) if limit is not None else None
		self.connection_factory = connection_factory
		self.connection_label = connection_label or self._connection_label()

	def _default_port(self) -> int:
		if self.driver in {"postgres", "postgresql"}:
			return 5432
		return 3306

	@staticmethod
	def _table_map_from_env() -> dict[str, str]:
		out = {}
		for entity in ("patient", "visit"):
			value = os.getenv(f"MANTRA_RME_TABLE_{entity.upper()}")
			if value:
				out[entity] = value
		return out

	def _connection_label(self) -> str:
		parts = [self.driver]
		if self.host:
			parts.append(self.host)
		if self.database:
			parts.append(self.database)
		return ":".join(parts)

	def _connect(self):
		if self.connection_factory:
			return self.connection_factory()
		if not all([self.host, self.database, self.user]):
			raise ValueError("RME DB connection env vars are incomplete.")
		if self.driver in {"mysql", "mariadb"}:
			import pymysql

			return pymysql.connect(
				host=self.host,
				port=self.port,
				user=self.user,
				password=self.password,
				database=self.database,
				cursorclass=pymysql.cursors.Cursor,
				read_timeout=30,
				write_timeout=30,
			)
		if self.driver in {"postgres", "postgresql"}:
			import psycopg2

			return psycopg2.connect(
				host=self.host,
				port=self.port,
				user=self.user,
				password=self.password,
				dbname=self.database,
				connect_timeout=30,
			)
		raise ValueError(f"Unsupported RME DB driver: {self.driver}")

	def _table_for(self, entity: str) -> str:
		table = self.table_map.get(entity, entity)
		if not IDENTIFIER_RE.match(table):
			raise ValueError(f"Unsafe RME table identifier: {table}")
		return table

	def _quote_identifier(self, identifier: str) -> str:
		quote = '"' if self.driver in {"postgres", "postgresql"} else "`"
		return ".".join(f"{quote}{part}{quote}" for part in identifier.split("."))

	def _select_sql(self, entity: str) -> str:
		table = self._quote_identifier(self._table_for(entity))
		sql = f"select * from {table}"
		if self.limit is not None:
			sql = f"{sql} limit {int(self.limit)}"
		return sql

	def fetch(self, entity: str) -> list[dict[str, Any]]:
		conn = self._connect()
		try:
			cursor = conn.cursor()
			try:
				cursor.execute(self._select_sql(entity))
				columns = [column[0] for column in cursor.description]
				return [self._row_to_dict(columns, row) for row in cursor.fetchall()]
			finally:
				close = getattr(cursor, "close", None)
				if close:
					close()
		finally:
			close = getattr(conn, "close", None)
			if close:
				close()

	@staticmethod
	def _row_to_dict(columns: list[str], row) -> dict[str, Any]:
		if isinstance(row, dict):
			return dict(row)
		return dict(zip(columns, row, strict=False))

	def describe(self) -> dict:
		return {
			"kind": self.kind,
			"driver": self.driver,
			"connection_label": self.connection_label,
			"tables": dict(self.table_map),
		}
