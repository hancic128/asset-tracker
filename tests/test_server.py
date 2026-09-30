"""server.py 的单元测试（仅标准库 unittest）。

只覆盖不依赖网络的部分：口令哈希、字段强制转换、摘要构造。
HTTP 层留给端到端验证。
"""

import os
import tempfile
import unittest
from datetime import date, timedelta

import server


class PasswordTests(unittest.TestCase):
    def test_hash_is_salted_and_verifies(self):
        a = server.hash_password("hunter2")
        b = server.hash_password("hunter2")
        self.assertNotEqual(a, b, "同一口令两次哈希应因盐不同而不同")
        self.assertTrue(server.verify_password("hunter2", a))
        self.assertFalse(server.verify_password("hunter3", a))

    def test_malformed_hash_does_not_raise(self):
        self.assertFalse(server.verify_password("x", "not-a-hash"))


class CoerceTests(unittest.TestCase):
    def test_money_and_int_fields(self):
        self.assertEqual(server.coerce("amount", "12.5", server.NUMERIC_SUB), 12.5)
        self.assertEqual(server.coerce("period_days", "30", server.NUMERIC_SUB), 30)
        self.assertEqual(server.coerce("period_days", "", server.NUMERIC_SUB), 0)

    def test_booleans_become_0_or_1(self):
        self.assertEqual(server.coerce("remind_enabled", True, server.NUMERIC_SUB), 1)
        self.assertEqual(server.coerce("remind_enabled", None, server.NUMERIC_SUB), 0)

    def test_empty_strings_become_null(self):
        self.assertIsNone(server.coerce("start_date", "", server.NUMERIC_SUB))
        self.assertEqual(server.coerce("name", "  房租  ", server.NUMERIC_SUB), "房租")


class DigestTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self._old = server.DB_PATH
        server.DB_PATH = os.path.join(self.tmp, "t.db")
        server.init_db()

    def tearDown(self):
        server.DB_PATH = self._old
        for name in ("t.db", "t.db-wal", "t.db-shm"):
            try:
                os.remove(os.path.join(self.tmp, name))
            except OSError:
                pass
        os.rmdir(self.tmp)

    def _insert_sub(self, conn, name, end_iso, amount=100.0, remind=None, remind_on=False):
        now = server.now_iso()
        conn.execute(
            "INSERT INTO subscriptions (name, amount, end_date, remind_enabled, remind_date, status, created_at, updated_at)"
            " VALUES (?, ?, ?, ?, ?, 'active', ?, ?)",
            (name, amount, end_iso, 1 if remind_on else 0, remind, now, now),
        )

    def _insert_card(self, conn, name, expires_iso, remind=None, remind_on=False):
        now = server.now_iso()
        conn.execute(
            "INSERT INTO stored_value_cards (name, type, expires_at, remind_enabled, remind_date, status, created_at, updated_at)"
            " VALUES (?, 'amount', ?, ?, ?, 'active', ?, ?)",
            (name, expires_iso, 1 if remind_on else 0, remind, now, now),
        )

    def test_nothing_due_returns_none(self):
        with server.connect() as conn:
            far = (date.today() + timedelta(days=90)).isoformat()
            self._insert_sub(conn, "遥远的订阅", far)
            payload, _ = server.build_digest(conn)
        self.assertIsNone(payload)

    def test_due_subscription_appears_in_digest(self):
        with server.connect() as conn:
            soon = (date.today() + timedelta(days=2)).isoformat()
            self._insert_sub(conn, "房租", soon, 3300.0)
            payload, _ = server.build_digest(conn)
        self.assertIsNotNone(payload)
        self.assertEqual(payload["summary"]["upcoming_subscriptions_count"], 1)
        self.assertIn("房租", payload["body"])
        self.assertIn("订阅", payload["title"])
        # 通用接收端（蓝鸟等）依赖这四个字段；title/body 缺任一都会被判为「无可推内容」
        for key in ("title", "body", "event", "repo"):
            self.assertIn(key, payload)
            self.assertTrue(str(payload[key]).strip(), f"{key} 不能为空")

    def test_manual_reminder_fires_even_when_end_date_is_far(self):
        """订阅截止日在 90 天后，但用户把提醒日设在 3 天后 —— 必须进摘要。"""
        with server.connect() as conn:
            far = (date.today() + timedelta(days=90)).isoformat()
            remind = (date.today() + timedelta(days=3)).isoformat()
            self._insert_sub(conn, "年费会员", far, 199.0, remind=remind, remind_on=True)
            payload, _ = server.build_digest(conn)
        self.assertIsNotNone(payload, "只设了提醒日也应产生摘要")
        self.assertEqual(payload["summary"]["reminders_count"], 1)
        self.assertEqual(payload["summary"]["upcoming_subscriptions_count"], 0)
        self.assertIn("年费会员", payload["body"])
        self.assertEqual([r["name"] for r in payload["reminders"]], ["年费会员"])

    def test_reminder_on_card_fires(self):
        with server.connect() as conn:
            remind = (date.today() + timedelta(days=1)).isoformat()
            self._insert_card(conn, "健身卡", None, remind=remind, remind_on=True)
            payload, _ = server.build_digest(conn)
        self.assertIsNotNone(payload)
        self.assertEqual(payload["summary"]["reminders_count"], 1)
        self.assertEqual(payload["reminders"][0]["kind"], "card")

    def test_item_is_not_listed_twice(self):
        """同一项既到期又在提醒窗口内时，只出现一次。"""
        with server.connect() as conn:
            soon = (date.today() + timedelta(days=2)).isoformat()
            self._insert_sub(conn, "房租", soon, 3300.0, remind=soon, remind_on=True)
            payload, _ = server.build_digest(conn)
        self.assertEqual(payload["summary"]["upcoming_subscriptions_count"], 1)
        self.assertEqual(payload["summary"]["reminders_count"], 0)
        self.assertEqual(payload["body"].count("房租"), 1)

    def test_reminder_outside_window_is_ignored(self):
        with server.connect() as conn:
            far = (date.today() + timedelta(days=90)).isoformat()
            remind = (date.today() + timedelta(days=30)).isoformat()
            self._insert_sub(conn, "年费会员", far, 199.0, remind=remind, remind_on=True)
            payload, _ = server.build_digest(conn)
        self.assertIsNone(payload)

    def test_disabled_reminder_is_ignored(self):
        with server.connect() as conn:
            far = (date.today() + timedelta(days=90)).isoformat()
            remind = (date.today() + timedelta(days=3)).isoformat()
            self._insert_sub(conn, "年费会员", far, 199.0, remind=remind, remind_on=False)
            payload, _ = server.build_digest(conn)
        self.assertIsNone(payload)

    def test_no_end_date_subscription_does_not_crash(self):
        with server.connect() as conn:
            self._insert_sub(conn, "没填截止日", None)
            payload, _ = server.build_digest(conn)
        self.assertIsNone(payload)


if __name__ == "__main__":
    unittest.main()
