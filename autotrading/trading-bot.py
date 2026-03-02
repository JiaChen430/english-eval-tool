#!/usr/bin/env python3
"""
Bitget Trading Bot - EMA Cross Strategy v5
集成Telegram控制面板
"""

import requests
import hashlib
import hmac
import time
import base64
import json
import os
import logging
import threading
import subprocess
from flask import Flask, request, jsonify
from datetime import datetime

# ══════════════════════════════════════════════
# 日志配置
# ══════════════════════════════════════════════
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("trading_bot.log", encoding="utf-8"),
        logging.StreamHandler()
    ]
)
log = logging.getLogger(__name__)

# ══════════════════════════════════════════════
# 配置
# ══════════════════════════════════════════════
API_KEY    = os.environ.get("BITGET_API_KEY",    "bg_f85a0d97e4ebd5dad59fc4298c0cd384")
API_SECRET = os.environ.get("BITGET_SECRET",     "8160abb70bd4850965704106c8aa0c3080b2cff1a7043d6bb6abe8735ef35ed7")
PASSPHRASE = os.environ.get("BITGET_PASSPHRASE", "openclaw")

# Telegram配置（直接写入，无需环境变量）
TG_TOKEN   = os.environ.get("TG_TOKEN",   "8717761793:AAFffTAJ0zuNG3m6asRYfEz36bLPG_Sq2Ts")
TG_CHAT_ID = os.environ.get("TG_CHAT_ID", "5333203016")

BASE_URL     = "https://api.bitget.com"
SYMBOL       = "BTCUSDT"
PRODUCT_TYPE = "USDT-FUTURES"
MARGIN_COIN  = "USDT"
CAPITAL      = 50
LEVERAGE     = 20

# ══════════════════════════════════════════════
# Telegram 通知
# ══════════════════════════════════════════════
def tg_send(text: str):
    """发送消息到Telegram，失败不影响主流程"""
    try:
        url = f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage"
        requests.post(url, json={
            "chat_id": TG_CHAT_ID,
            "text": text,
            "parse_mode": "HTML"
        }, timeout=5)
    except Exception as e:
        log.warning(f"Telegram通知失败: {e}")


# ══════════════════════════════════════════════
# Bitget API 签名
# ══════════════════════════════════════════════
def _sign(timestamp: str, method: str, path_with_query: str, body_str: str = "") -> str:
    pre_hash = timestamp + method.upper() + path_with_query + body_str
    mac = hmac.new(API_SECRET.encode("utf-8"), pre_hash.encode("utf-8"), hashlib.sha256)
    return base64.b64encode(mac.digest()).decode()


def api_request(method: str, path: str, params: dict = None, body: dict = None) -> dict:
    timestamp = str(int(time.time() * 1000))
    method = method.upper()

    if params:
        query_str = "&".join(f"{k}={v}" for k, v in sorted(params.items()))
        path_with_query = f"{path}?{query_str}"
    else:
        path_with_query = path

    body_str = json.dumps(body, separators=(",", ":")) if body else ""
    signature = _sign(timestamp, method, path_with_query, body_str)

    headers = {
        "Content-Type":      "application/json",
        "ACCESS-KEY":        API_KEY,
        "ACCESS-SIGN":       signature,
        "ACCESS-TIMESTAMP":  timestamp,
        "ACCESS-PASSPHRASE": PASSPHRASE,
        "locale":            "zh-CN",
    }

    url = BASE_URL + path_with_query
    try:
        if method == "GET":
            resp = requests.get(url, headers=headers, timeout=10)
        else:
            resp = requests.post(url, headers=headers, data=body_str, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.RequestException as e:
        log.error(f"HTTP请求失败: {e}")
        return {"code": "-1", "msg": str(e), "data": None}


# ══════════════════════════════════════════════
# 价格 & 数量
# ══════════════════════════════════════════════
def get_btc_price() -> float:
    sources = [
        lambda: float(
            api_request("GET", "/api/v2/mix/market/ticker",
                        params={"symbol": SYMBOL, "productType": PRODUCT_TYPE})
            ["data"][0]["lastPr"]
        ),
        lambda: float(
            requests.get("https://api.binance.com/api/v3/ticker/price",
                         params={"symbol": "BTCUSDT"}, timeout=5).json()["price"]
        ),
        lambda: float(
            requests.get("https://www.okx.com/api/v5/market/ticker",
                         params={"instId": "BTC-USDT-SWAP"}, timeout=5)
            .json()["data"][0]["last"]
        ),
    ]
    for fn in sources:
        try:
            price = fn()
            if price and price > 0:
                return price
        except Exception as e:
            log.warning(f"价格源失败: {e}")
    return 0.0


def get_quantity() -> str:
    price = get_btc_price()
    if price <= 0:
        return "0.05"
    qty = round((CAPITAL * LEVERAGE) / price, 3)
    return str(qty)


# ══════════════════════════════════════════════
# 杠杆设置
# ══════════════════════════════════════════════
def set_leverage():
    body = {
        "symbol": SYMBOL, "marginCoin": MARGIN_COIN,
        "leverage": str(LEVERAGE), "productType": PRODUCT_TYPE,
    }
    result = api_request("POST", "/api/v2/mix/account/set-leverage", body=body)
    log.info(f"设置杠杆 {LEVERAGE}x: {result}")
    return result


# ══════════════════════════════════════════════
# 持仓查询
# ══════════════════════════════════════════════
def get_positions() -> dict:
    result = {"long": 0.0, "short": 0.0}
    try:
        resp = api_request(
            "GET", "/api/v2/mix/position/all-position",
            params={"marginCoin": MARGIN_COIN, "productType": PRODUCT_TYPE}
        )
        data = resp.get("data", [])
        if not data:
            return result
        if isinstance(data, dict):
            data = [data]
        for p in data:
            if p.get("symbol", "").upper() != SYMBOL.upper():
                continue
            hold_side = p.get("holdSide", "").lower()
            try:
                size = float(p.get("total", 0) or 0)
            except (ValueError, TypeError):
                size = 0.0
            if hold_side == "long":
                result["long"] = size
            elif hold_side == "short":
                result["short"] = size
    except Exception as e:
        log.error(f"获取持仓失败: {e}")
    return result


# ══════════════════════════════════════════════
# 开仓 / 平仓
# ══════════════════════════════════════════════
def place_order(side: str, source: str = "自动") -> dict:
    positions = get_positions()

    # 平反向仓位
    opposite = "short" if side == "long" else "long"
    if positions[opposite] > 0:
        log.info(f"先平反向{opposite}仓")
        close_position(opposite, notify=False)
        time.sleep(0.5)

    # 已有同向仓位跳过
    if positions[side] > 0:
        msg = f"⚠️ 已有{'多' if side=='long' else '空'}仓，跳过重复开仓"
        log.info(msg)
        tg_send(msg)
        return {"skipped": True}

    qty = get_quantity()
    price = get_btc_price()

    body = {
        "symbol": SYMBOL, "marginCoin": MARGIN_COIN,
        "side":        "buy" if side == "long" else "sell",
        "orderType":   "market",
        "size":        qty,
        "productType": PRODUCT_TYPE,
        "tradeSide":   "open",
        "posSide":     side,
        "marginMode":  "crossed",
    }

    log.info(f"📈 开{side}仓: {qty} BTC")
    result = api_request("POST", "/api/v2/mix/order/place-order", body=body)
    log.info(f"开仓结果: {result}")

    direction = "📈 做多" if side == "long" else "📉 做空"
    if result.get("code") == "00000":
        tg_send(
            f"{direction} 开仓成功 ✅\n"
            f"来源: {source}\n"
            f"数量: {qty} BTC\n"
            f"价格: {price:.2f} USDT\n"
            f"名义仓位: {CAPITAL * LEVERAGE} USDT"
        )
    else:
        tg_send(f"{direction} 开仓失败 ❌\n错误: {result.get('msg', '未知错误')}")

    return result


def close_position(side: str, source: str = "自动", notify: bool = True) -> dict:
    body = {
        "symbol": SYMBOL, "productType": PRODUCT_TYPE,
        "holdSide": side, "marginCoin": MARGIN_COIN,
    }
    log.info(f"🔴 平{side}仓")
    result = api_request("POST", "/api/v2/mix/order/close-positions", body=body)
    log.info(f"平仓结果: {result}")

    if notify:
        direction = "多" if side == "long" else "空"
        price = get_btc_price()
        if result.get("code") == "00000":
            tg_send(
                f"🔴 平{direction}仓成功 ✅\n"
                f"来源: {source}\n"
                f"价格: {price:.2f} USDT"
            )
        else:
            tg_send(f"🔴 平{direction}仓失败 ❌\n错误: {result.get('msg', '未知错误')}")

    return result


# ══════════════════════════════════════════════
# Webhook 服务（TradingView信号）
# ══════════════════════════════════════════════
app = Flask(__name__)

SIGNAL_MAP = {
    "快速做多": ("open",  "long"),
    "普通做多": ("open",  "long"),
    "延迟做多": ("open",  "long"),
    "快速做空": ("open",  "short"),
    "普通做空": ("open",  "short"),
    "延迟做空": ("open",  "short"),
    "平多仓":   ("close", "long"),
    "平空仓":   ("close", "short"),
    "做多":     ("open",  "long"),
    "做空":     ("open",  "short"),
    "平多":     ("close", "long"),
    "平空":     ("close", "short"),
    # 止损止盈信号（strategy.exit触发）
    "SL-FastLong":  ("close", "long"),
    "TP-FastLong":  ("close", "long"),
    "SL-FastShort": ("close", "short"),
    "TP-FastShort": ("close", "short"),
    "SL-Long":      ("close", "long"),
    "TP-Long":      ("close", "long"),
    "SL-Short":     ("close", "short"),
    "TP-Short":     ("close", "short"),
}


def parse_signal(raw_data: bytes, content_type: str) -> str:
    try:
        data = json.loads(raw_data) if raw_data else {}
    except Exception:
        data = {"signal": raw_data.decode("utf-8", errors="ignore")}
    return (data.get("signal", "") or data.get("message", "") or "").strip()


def resolve_signal(signal: str):
    for keyword, (act, s) in SIGNAL_MAP.items():
        if keyword == signal:
            return act, s
    for keyword, (act, s) in SIGNAL_MAP.items():
        if keyword in signal:
            return act, s
    return None, None


_last_signal_time = {}
_DEDUP_SECONDS = 5

@app.route("/webhook", methods=["POST"])
def webhook():
    log.info("=" * 50)
    signal = parse_signal(request.data, request.content_type)
    log.info(f"收到TradingView信号: 「{signal}」")

    if not signal:
        return jsonify({"status": "ignored", "reason": "empty_signal"}), 200

    # 去重：5秒内相同信号只处理一次
    now = time.time()
    last = _last_signal_time.get(signal, 0)
    if now - last < _DEDUP_SECONDS:
        log.info(f"重复信号忽略: 「{signal}」({now - last:.1f}s内)")
        return jsonify({"status": "ignored", "reason": "duplicate"}), 200
    _last_signal_time[signal] = now

    action, side = resolve_signal(signal)
    if not action:
        log.warning(f"未识别信号: 「{signal}」")
        return jsonify({"status": "ignored", "reason": f"unknown: {signal}"}), 200

    try:
        if action == "open":
            result = place_order(side, source=f"TradingView ({signal})")
        else:
            positions = get_positions()
            if positions[side] <= 0:
                return jsonify({"status": "skipped", "reason": f"no_{side}_position"}), 200
            result = close_position(side, source=f"TradingView ({signal})")

        return jsonify({"status": "ok", "signal": signal, "result": result})

    except Exception as e:
        log.exception(f"处理信号异常: {e}")
        tg_send(f"❌ 处理信号异常\n信号: {signal}\n错误: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/status", methods=["GET"])
def status():
    positions = get_positions()
    price = get_btc_price()
    qty = get_quantity()
    return jsonify({
        "bot": "EMA Cross Strategy v5",
        "symbol": SYMBOL,
        "capital": f"{CAPITAL} USDT",
        "leverage": f"{LEVERAGE}x",
        "btc_price": f"{price:.2f} USDT",
        "planned_qty": f"{qty} BTC",
        "positions": {
            "long":  f"{positions['long']} BTC",
            "short": f"{positions['short']} BTC",
        }
    })


@app.route("/test", methods=["GET"])
def test():
    try:
        resp = api_request(
            "GET", "/api/v2/mix/account/account",
            params={"symbol": SYMBOL, "marginCoin": MARGIN_COIN, "productType": PRODUCT_TYPE}
        )
        return jsonify({"status": "ok", "account": resp})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ══════════════════════════════════════════════
# Telegram Bot（轮询接收指令）
# ══════════════════════════════════════════════
TG_COMMANDS = {
    "/开多":    ("open",  "long"),
    "/开空":    ("open",  "short"),
    "/普通开多": ("open",  "long"),
    "/普通开空": ("open",  "short"),
    "/平多":    ("close", "long"),
    "/平空":    ("close", "short"),
}

HELP_TEXT = """
🤖 <b>BTC交易Bot指令</b>

<b>开仓：</b>
/开多 — 快速做多
/开空 — 快速做空
/普通开多 — 普通做多
/普通开空 — 普通做空

<b>平仓：</b>
/平多 — 平多仓
/平空 — 平空仓

<b>查询：</b>
/持仓 — 查看当前持仓
/帮助 — 显示此菜单
"""


def tg_reply(chat_id: str, text: str):
    try:
        url = f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage"
        requests.post(url, json={
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML"
        }, timeout=5)
    except Exception as e:
        log.warning(f"Telegram回复失败: {e}")


def tg_poll():
    """长轮询接收Telegram消息"""
    log.info("🤖 Telegram Bot 开始监听...")
    offset = None

    while True:
        try:
            url = f"https://api.telegram.org/bot{TG_TOKEN}/getUpdates"
            params = {"timeout": 30, "allowed_updates": ["message"]}
            if offset:
                params["offset"] = offset

            resp = requests.get(url, params=params, timeout=35)
            updates = resp.json().get("result", [])

            for update in updates:
                offset = update["update_id"] + 1
                msg = update.get("message", {})
                chat_id = str(msg.get("chat", {}).get("id", ""))
                text = msg.get("text", "").strip()

                # 安全验证：只响应你的Chat ID
                if chat_id != TG_CHAT_ID:
                    log.warning(f"拒绝未授权Chat ID: {chat_id}")
                    tg_reply(chat_id, "⛔ 未授权，无法执行操作")
                    continue

                log.info(f"Telegram指令: {text}")

                if text in ("/帮助", "/help", "/start"):
                    tg_reply(chat_id, HELP_TEXT)

                elif text == "/持仓":
                    positions = get_positions()
                    price = get_btc_price()
                    qty = get_quantity()
                    tg_reply(chat_id,
                        f"📊 <b>当前持仓</b>\n\n"
                        f"BTC价格: {price:.2f} USDT\n"
                        f"多仓: {positions['long']} BTC\n"
                        f"空仓: {positions['short']} BTC\n"
                        f"计划开仓量: {qty} BTC\n"
                        f"本金: {CAPITAL} USDT | 杠杆: {LEVERAGE}x"
                    )

                elif text in TG_COMMANDS:
                    action, side = TG_COMMANDS[text]
                    tg_reply(chat_id, f"⏳ 正在执行 {text}...")
                    if action == "open":
                        place_order(side, source=f"Telegram ({text})")
                    else:
                        positions = get_positions()
                        if positions[side] <= 0:
                            direction = "多" if side == "long" else "空"
                            tg_reply(chat_id, f"⚠️ 当前没有{direction}仓可平")
                        else:
                            close_position(side, source=f"Telegram ({text})")

                else:
                    tg_reply(chat_id, f"❓ 未知指令: {text}\n发送 /帮助 查看可用指令")

        except Exception as e:
            log.error(f"Telegram轮询错误: {e}")
            time.sleep(5)


# ══════════════════════════════════════════════
# ngrok 自动启动
# ══════════════════════════════════════════════
def start_ngrok(port: int = 5001) -> str:
    """启动ngrok并返回公网URL，失败返回空字符串"""
    try:
        # 启动ngrok进程
        subprocess.Popen(
            ["ngrok", "http", str(port)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        # 等待ngrok启动
        time.sleep(6)
        # 从ngrok本地API获取公网URL
        resp = requests.get("http://localhost:4040/api/tunnels", timeout=5)
        tunnels = resp.json().get("tunnels", [])
        for t in tunnels:
            if t.get("proto") == "https":
                return t["public_url"]
        return ""
    except Exception as e:
        log.warning(f"ngrok启动失败: {e}")
        return ""


# ══════════════════════════════════════════════
# 启动
# ══════════════════════════════════════════════
if __name__ == "__main__":
    log.info("=" * 50)
    log.info("Bitget Trading Bot v5 + Telegram控制")
    log.info(f"交易品种: {SYMBOL} | 本金: {CAPITAL} USDT | 杠杆: {LEVERAGE}x")

    if not all([API_KEY, API_SECRET, PASSPHRASE]):
        log.error("❌ 缺少Bitget API密钥，请设置环境变量：")
        log.error("   export BITGET_API_KEY=your_key")
        log.error("   export BITGET_SECRET=your_secret")
        log.error("   export BITGET_PASSPHRASE=your_passphrase")
    else:
        log.info("✅ Bitget API密钥已加载")
        result = set_leverage()
        if result.get("code") == "00000":
            log.info(f"✅ 杠杆已设置为 {LEVERAGE}x")

    # 启动ngrok
    log.info("正在启动 ngrok...")
    ngrok_url = start_ngrok(5001)
    if ngrok_url:
        webhook_url = f"{ngrok_url}/webhook"
        log.info(f"✅ ngrok已启动: {ngrok_url}")
        log.info(f"📡 Webhook URL: {webhook_url}")
    else:
        webhook_url = "ngrok启动失败，请手动设置"
        log.warning("⚠️ ngrok启动失败，webhook将无法接收TradingView信号")

    # 启动Telegram轮询（独立线程，不阻塞Flask）
    tg_thread = threading.Thread(target=tg_poll, daemon=True)
    tg_thread.start()

    # Bot启动通知（包含webhook地址）
    tg_send(
        f"🚀 <b>Trading Bot 已启动</b>\n\n"
        f"品种: {SYMBOL}\n"
        f"本金: {CAPITAL} USDT | 杠杆: {LEVERAGE}x\n\n"
        f"📡 <b>Webhook URL:</b>\n<code>{webhook_url}</code>\n\n"
        f"⚠️ 请更新TradingView Alert的Webhook地址\n"
        f"发送 /帮助 查看可用指令"
    )

    log.info("Webhook: http://0.0.0.0:5001/webhook")
    log.info("状态:    http://0.0.0.0:5001/status")
    log.info("=" * 50)

    app.run(host="0.0.0.0", port=5001, debug=False)
