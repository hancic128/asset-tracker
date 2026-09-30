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

    def test_empty_password_never_verifies(self):
        """空串的哈希也必须拒绝空串。

        2026-09-30 手工重置口令时，脚本从 stdin 读到的是空串（heredoc 抢了 stdin），
        于是把「空口令的哈希」写进了生产的 auth 表 —— 那一小段时间里
        POST /api/login {"password": ""} 直接 200。这条测试就是防它复发。
        """
        self.assertFalse(server.verify_password("", server.hash_password("")))
        self.assertFalse(server.verify_password("", ""))
        self.assertFalse(server.verify_password("goodpassword", ""))

    def test_set_password_refuses_empty(self):
        self.tmp = tempfile.mkdtemp()
        old = server.DB_PATH
        server.DB_PATH = os.path.join(self.tmp, "p.db")
        try:
            server.init_db()
            with self.assertRaises(ValueError):
                server.set_password("")
        finally:
            server.DB_PATH = old
            for name in ("p.db", "p.db-wal", "p.db-shm"):
                try:
                    os.remove(os.path.join(self.tmp, name))
                except OSError:
                    pass
            os.rmdir(self.tmp)


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
        """订阅截止日在 90 天后，但用户把提醒日设在 3 天后 —— 现在还不该响（到日才响）。"""
        with server.connect() as conn:
            far = (date.today() + timedelta(days=90)).isoformat()
            remind = (date.today() + timedelta(days=3)).isoformat()
            self._insert_sub(conn, "年费会员", far, 199.0, remind=remind, remind_on=True)
            payload, _ = server.build_digest(conn)
        self.assertIsNone(payload, "提醒日未到，不该产生摘要")

    def test_manual_reminder_fires_on_the_day(self):
        """提醒日 = 今天 → 必须进摘要。"""
        with server.connect() as conn:
            far = (date.today() + timedelta(days=90)).isoformat()
            self._insert_sub(conn, "年费会员", far, 199.0, remind=date.today().isoformat(), remind_on=True)
            payload, _ = server.build_digest(conn)
        self.assertIsNotNone(payload)
        self.assertEqual(payload["summary"]["reminders_count"], 1)
        self.assertEqual(payload["summary"]["upcoming_subscriptions_count"], 0)
        self.assertIn("年费会员", payload["body"])
        self.assertEqual([r["name"] for r in payload["reminders"]], ["年费会员"])

    def test_manual_reminder_keeps_firing_after_the_date_passed(self):
        """提醒日已过 10 天、该项仍 active → 继续响（续订后 status 变 renewed 才停）。"""
        with server.connect() as conn:
            far = (date.today() + timedelta(days=200)).isoformat()
            remind = (date.today() - timedelta(days=10)).isoformat()
            self._insert_sub(conn, "忘记续的年费", far, 199.0, remind=remind, remind_on=True)
            payload, _ = server.build_digest(conn)
        self.assertIsNotNone(payload)
        self.assertEqual(payload["summary"]["reminders_count"], 1)
        self.assertIn("已过 10 天", payload["body"])

    def test_manual_reminder_wakes_again_when_far_off(self):
        """提醒日设在 30 天后 → 页面和 webhook 都不该提前响。"""
        with server.connect() as conn:
            far = (date.today() + timedelta(days=200)).isoformat()
            remind = (date.today() + timedelta(days=30)).isoformat()
            self._insert_sub(conn, "年费会员", far, 199.0, remind=remind, remind_on=True)
            payload, _ = server.build_digest(conn)
        self.assertIsNone(payload)

    def test_reminder_on_card_fires(self):
        with server.connect() as conn:
            self._insert_card(conn, "健身卡", None, remind=date.today().isoformat(), remind_on=True)
            payload, _ = server.build_digest(conn)
        self.assertIsNotNone(payload)
        self.assertEqual(payload["summary"]["reminders_count"], 1)
        self.assertEqual(payload["reminders"][0]["kind"], "card")

    def test_expired_card_is_not_reported_as_expiring(self):
        """已过期 100 天的卡不该出现在「30 天内过期」——页面侧以前只有上界没有下界。"""
        with server.connect() as conn:
            self._insert_card(conn, "早就过期的卡", (date.today() - timedelta(days=100)).isoformat())
            payload, _ = server.build_digest(conn)
        self.assertIsNone(payload, "过期的卡不属于「将过期」提醒")

    def test_item_is_not_listed_twice(self):
        """同一项既到期又在提醒窗口内时，只出现一次。"""
        with server.connect() as conn:
            soon = (date.today() + timedelta(days=2)).isoformat()
            self._insert_sub(conn, "房租", soon, 3300.0, remind=soon, remind_on=True)
            payload, _ = server.build_digest(conn)
        self.assertEqual(payload["summary"]["upcoming_subscriptions_count"], 1)
        self.assertEqual(payload["summary"]["reminders_count"], 0)
        self.assertEqual(payload["body"].count("房租"), 1)

    def test_reminder_outside_due_window_is_still_deduped(self):
        """提醒日已到、且 end_date 也在 7 天内 → 只进「待扣费」，不再进「自设提醒」。"""
        with server.connect() as conn:
            soon = (date.today() + timedelta(days=1)).isoformat()
            remind = (date.today() - timedelta(days=1)).isoformat()
            self._insert_sub(conn, "房租", soon, 3300.0, remind=remind, remind_on=True)
            payload, _ = server.build_digest(conn)
        self.assertEqual(payload["summary"]["upcoming_subscriptions_count"], 1)
        self.assertEqual(payload["summary"]["reminders_count"], 0)

    def test_disabled_reminder_is_ignored(self):
        with server.connect() as conn:
            far = (date.today() + timedelta(days=90)).isoformat()
            self._insert_sub(conn, "年费会员", far, 199.0, remind=date.today().isoformat(), remind_on=False)
            payload, _ = server.build_digest(conn)
        self.assertIsNone(payload)

    def test_no_end_date_subscription_does_not_crash(self):
        with server.connect() as conn:
            self._insert_sub(conn, "没填截止日", None)
            payload, _ = server.build_digest(conn)
        self.assertIsNone(payload)

    def test_due_window_boundaries(self):
        """day 0 与 day 7 进；day 8 不进。"""
        for offset, expected in ((0, 1), (7, 1), (8, 0)):
            with self.subTest(offset=offset):
                tmp = tempfile.mkdtemp()
                old = server.DB_PATH
                server.DB_PATH = os.path.join(tmp, "b.db")
                try:
                    server.init_db()
                    with server.connect() as conn:
                        self._insert_sub(conn, "边界", (date.today() + timedelta(days=offset)).isoformat())
                        payload, _ = server.build_digest(conn)
                    got = 0 if payload is None else payload["summary"]["upcoming_subscriptions_count"]
                    self.assertEqual(got, expected)
                finally:
                    server.DB_PATH = old
                    for name in ("b.db", "b.db-wal", "b.db-shm"):
                        try:
                            os.remove(os.path.join(tmp, name))
                        except OSError:
                            pass
                    os.rmdir(tmp)

    def test_card_window_boundaries(self):
        """卡：day 0 与 day 30 进；day 31 不进。"""
        for offset, expected in ((0, 1), (30, 1), (31, 0)):
            with self.subTest(offset=offset):
                tmp = tempfile.mkdtemp()
                old = server.DB_PATH
                server.DB_PATH = os.path.join(tmp, "c.db")
                try:
                    server.init_db()
                    with server.connect() as conn:
                        self._insert_card(conn, "边界卡", (date.today() + timedelta(days=offset)).isoformat())
                        payload, _ = server.build_digest(conn)
                    got = 0 if payload is None else payload["summary"]["expiring_cards_count"]
                    self.assertEqual(got, expected)
                finally:
                    server.DB_PATH = old
                    for name in ("c.db", "c.db-wal", "c.db-shm"):
                        try:
                            os.remove(os.path.join(tmp, name))
                        except OSError:
                            pass
                    os.rmdir(tmp)


if __name__ == "__main__":
    unittest.main()
