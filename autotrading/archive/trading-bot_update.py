#!/usr/bin/env python3
"""
Bitget Trading Bot - EMA Cross Strategy v5
重写版：修复签名、持仓判断、信号逻辑、反向平仓、日志等问题
"""

import requests
import hashlib
import hmac
import time
import base64
import json
import os
import logging
from flask import Flask, request, jsonify
from datetime import datetime

# ══════════════════════════════════════════════
# 日志配置（同时输出到文件和控制台）
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
# 配置（优先从环境变量读取，避免密钥硬编码）
# ══════════════════════════════════════════════
API_KEY    = os.environ.get("BITGET_API_KEY",    "")
API_SECRET = os.environ.get("BITGET_SECRET",     "")
PASSPHRASE = os.environ.get("BITGET_PASSPHRASE", "")

if not all([API_KEY, API_SECRET, PASSPHRASE]):
    log.warning("⚠️  未检测到环境变量，请设置 BITGET_API_KEY / BITGET_SECRET / BITGET_PASSPHRASE")
    log.warning("    示例: export BITGET_API_KEY=your_key")

BASE_URL     = "https://api.bitget.com"
SYMBOL       = "BTCUSDT"
PRODUCT_TYPE = "USDT-FUTURES"
MARGIN_COIN  = "USDT"
CAPITAL      = 200   # 本金 USDT
LEVERAGE     = 20    # 杠杆倍数

# ══════════════════════════════════════════════
# Bitget API 签名（严格按官方文档）
# GET:  timestamp + "GET"  + /path?query
# POST: timestamp + "POST" + /path + body_json
# ══════════════════════════════════════════════
def _sign(timestamp: str, method: str, path_with_query: str, body_str: str = "") -> str:
    """
    Bitget签名规则：
    pre_hash = timestamp + method.upper() + request_path(含query) + body
    sign = base64(hmac_sha256(secret, pre_hash))
    """
    pre_hash = timestamp + method.upper() + path_with_query + body_str
    mac = hmac.new(API_SECRET.encode("utf-8"), pre_hash.encode("utf-8"), hashlib.sha256)
    return base64.b64encode(mac.digest()).decode()


def api_request(method: str, path: str, params: dict = None, body: dict = None) -> dict:
    """
    统一API请求函数
    - GET  请求: params 作为 query string，参与签名
    - POST 请求: body  序列化为JSON，参与签名
    """
    timestamp = str(int(time.time() * 1000))
    method = method.upper()

    # 构建带query的path（GET签名必须包含query）
    if params:
        # Bitget要求query string按key字典序排列
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
# 辅助：获取BTC价格（多源容错）
# ══════════════════════════════════════════════
def get_btc_price() -> float:
    """从Bitget自身获取价格，避免依赖Binance（可能被封）"""
    sources = [
        # 优先用Bitget自己的行情
        lambda: float(
            api_request("GET", "/api/v2/mix/market/ticker",
                        params={"symbol": SYMBOL, "productType": PRODUCT_TYPE})
            ["data"]["lastPr"]
        ),
        # 备用：Binance
        lambda: float(
            requests.get("https://api.binance.com/api/v3/ticker/price",
                         params={"symbol": "BTCUSDT"}, timeout=5)
            .json()["price"]
        ),
        # 备用：OKX
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
                log.info(f"BTC价格: {price:.2f} USDT")
                return price
        except Exception as e:
            log.warning(f"价格源失败: {e}")
    log.error("所有价格源均失败，使用安全默认值")
    return 0.0  # 返回0，让调用方决定是否跳过下单


def get_quantity() -> str:
    """根据本金和杠杆动态计算合约张数（保留3位小数）"""
    price = get_btc_price()
    if price <= 0:
        log.warning("无法获取价格，使用保守默认值 0.05")
        return "0.05"
    target_notional = CAPITAL * LEVERAGE  # 名义仓位 = 200 * 20 = 4000 USDT
    qty = target_notional / price
    qty = round(qty, 3)
    log.info(f"计划下单数量: {qty} BTC (名义仓位 {target_notional} USDT @ {price:.2f})")
    return str(qty)


# ══════════════════════════════════════════════
# 杠杆设置
# ══════════════════════════════════════════════
def set_leverage():
    body = {
        "symbol":      SYMBOL,
        "marginCoin":  MARGIN_COIN,
        "leverage":    str(LEVERAGE),
        "productType": PRODUCT_TYPE,
    }
    result = api_request("POST", "/api/v2/mix/account/set-leverage", body=body)
    log.info(f"设置杠杆 {LEVERAGE}x: {result}")
    return result


# ══════════════════════════════════════════════
# 持仓查询（返回清晰的字典）
# ══════════════════════════════════════════════
def get_positions() -> dict:
    """
    返回 {"long": float, "short": float}
    表示当前多仓和空仓的持仓量，0表示无仓
    """
    result = {"long": 0.0, "short": 0.0}
    try:
        resp = api_request(
            "GET", "/api/v2/mix/position/all-position",
            params={"marginCoin": MARGIN_COIN, "productType": PRODUCT_TYPE}
        )
        data = resp.get("data", [])

        # data可能是list或None
        if not data:
            return result
        if isinstance(data, dict):
            data = [data]

        for p in data:
            # 只关心我们的交易对
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

    log.info(f"当前持仓 → 多: {result['long']} BTC, 空: {result['short']} BTC")
    return result


# ══════════════════════════════════════════════
# 开仓
# ══════════════════════════════════════════════
def place_order(side: str) -> dict:
    """
    side: "long" 或 "short"
    开仓前自动平反向仓位（避免双向叠仓）
    """
    positions = get_positions()

    # 平反向仓位
    opposite = "short" if side == "long" else "long"
    if positions[opposite] > 0:
        log.info(f"检测到反向{opposite}仓 {positions[opposite]} BTC，先平仓再开{side}")
        close_result = close_position(opposite)
        log.info(f"平反向仓结果: {close_result}")
        time.sleep(0.5)  # 等待平仓成交

    # 已有同向仓位则跳过
    if positions[side] > 0:
        log.info(f"已有{side}仓 {positions[side]} BTC，跳过重复开仓")
        return {"skipped": True, "reason": f"already_has_{side}"}

    qty = get_quantity()
    if qty == "0.0" or float(qty) <= 0:
        log.error("数量计算为0，取消下单")
        return {"error": "qty_zero"}

    body = {
        "symbol":      SYMBOL,
        "marginCoin":  MARGIN_COIN,
        "side":        "buy"  if side == "long" else "sell",
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
    return result


# ══════════════════════════════════════════════
# 平仓
# ══════════════════════════════════════════════
def close_position(side: str) -> dict:
    """
    side: "long" 或 "short"
    使用 close-positions 一键平仓
    """
    body = {
        "symbol":      SYMBOL,
        "productType": PRODUCT_TYPE,
        "holdSide":    side,   # "long" or "short"
        "marginCoin":  MARGIN_COIN,
    }
    log.info(f"📉 平{side}仓")
    result = api_request("POST", "/api/v2/mix/order/close-positions", body=body)
    log.info(f"平仓结果: {result}")
    return result


# ══════════════════════════════════════════════
# Webhook 服务
# ══════════════════════════════════════════════
app = Flask(__name__)

def parse_signal(raw_data: bytes, content_type: str) -> str:
    """从请求中解析signal字段，返回信号字符串"""
    ct = (content_type or "").lower()
    data = {}
    try:
        if "json" in ct:
            data = json.loads(raw_data) if raw_data else {}
        elif "form" in ct:
            # Flask会自动处理form，这里做兜底
            data = json.loads(raw_data) if raw_data else {}
        else:
            # TradingView有时不带Content-Type
            data = json.loads(raw_data) if raw_data else {}
    except (json.JSONDecodeError, Exception):
        # 最后兜底：把整个body当signal
        data = {"signal": raw_data.decode("utf-8", errors="ignore")}

    signal = data.get("signal", "") or data.get("message", "") or ""
    return signal.strip()


# 信号路由表（精确匹配优先，避免"做多"匹配到"做多信号"引发歧义）
SIGNAL_MAP = {
    "快速做多": ("open",  "long"),
    "普通做多": ("open",  "long"),
    "快速做空": ("open",  "short"),
    "普通做空": ("open",  "short"),
    "平多仓":   ("close", "long"),
    "平空仓":   ("close", "short"),
    # 兼容旧版关键词
    "做多":     ("open",  "long"),
    "做空":     ("open",  "short"),
    "平多":     ("close", "long"),
    "平空":     ("close", "short"),
}


@app.route("/webhook", methods=["POST"])
def webhook():
    log.info("=" * 50)
    log.info(f"收到Webhook | Content-Type: {request.content_type}")
    log.info(f"Raw Body: {request.data}")

    signal = parse_signal(request.data, request.content_type)
    log.info(f"解析到信号: 「{signal}」")

    if not signal:
        log.warning("信号为空，忽略")
        return jsonify({"status": "ignored", "reason": "empty_signal"}), 200

    # 查找匹配的操作（精确匹配 → 包含匹配）
    action, side = None, None
    for keyword, (act, s) in SIGNAL_MAP.items():
        if keyword == signal:   # 精确匹配
            action, side = act, s
            break
    if not action:
        for keyword, (act, s) in SIGNAL_MAP.items():
            if keyword in signal:  # 包含匹配（兜底）
                action, side = act, s
                break

    if not action:
        log.warning(f"未识别的信号: 「{signal}」")
        return jsonify({"status": "ignored", "reason": f"unknown_signal: {signal}"}), 200

    log.info(f"执行操作: {action} {side}")

    try:
        if action == "open":
            result = place_order(side)
        else:
            # 平仓前检查是否有仓位
            positions = get_positions()
            if positions[side] <= 0:
                log.info(f"无{side}仓可平，跳过")
                return jsonify({"status": "skipped", "reason": f"no_{side}_position"}), 200
            result = close_position(side)

        return jsonify({"status": "ok", "signal": signal, "action": action, "side": side, "result": result})

    except Exception as e:
        log.exception(f"处理信号时发生异常: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/status", methods=["GET"])
def status():
    """查看当前持仓和基本配置"""
    positions = get_positions()
    qty = get_quantity()
    price = get_btc_price()
    return jsonify({
        "bot":      "EMA Cross Strategy v5",
        "symbol":   SYMBOL,
        "capital":  f"{CAPITAL} USDT",
        "leverage": f"{LEVERAGE}x",
        "target_notional": f"{CAPITAL * LEVERAGE} USDT",
        "btc_price":  f"{price:.2f} USDT",
        "planned_qty": f"{qty} BTC",
        "positions": {
            "long":  f"{positions['long']} BTC",
            "short": f"{positions['short']} BTC",
        }
    })


@app.route("/test", methods=["GET"])
def test():
    """测试API连接和签名是否正常（不下单）"""
    try:
        resp = api_request(
            "GET", "/api/v2/mix/account/account",
            params={"symbol": SYMBOL, "marginCoin": MARGIN_COIN, "productType": PRODUCT_TYPE}
        )
        return jsonify({"status": "ok", "account": resp})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ══════════════════════════════════════════════
# 启动
# ══════════════════════════════════════════════
if __name__ == "__main__":
    log.info("=" * 50)
    log.info("Bitget Trading Bot - EMA Cross Strategy v5 (重写版)")
    log.info(f"交易品种: {SYMBOL} | 本金: {CAPITAL} USDT | 杠杆: {LEVERAGE}x")
    log.info(f"目标名义仓位: {CAPITAL * LEVERAGE} USDT")

    if not all([API_KEY, API_SECRET, PASSPHRASE]):
        log.error("❌ 缺少API密钥，请设置环境变量后重启：")
        log.error("   export BITGET_API_KEY=your_key")
        log.error("   export BITGET_SECRET=your_secret")
        log.error("   export BITGET_PASSPHRASE=your_passphrase")
    else:
        log.info("✅ API密钥已加载")
        result = set_leverage()
        if result.get("code") == "00000":
            log.info(f"✅ 杠杆已设置为 {LEVERAGE}x")
        else:
            log.warning(f"杠杆设置响应: {result}")

    log.info("Webhook监听地址: http://0.0.0.0:5001/webhook")
    log.info("状态查询地址:   http://0.0.0.0:5001/status")
    log.info("连接测试地址:   http://0.0.0.0:5001/test")
    log.info("=" * 50)

    app.run(host="0.0.0.0", port=5001, debug=False)
