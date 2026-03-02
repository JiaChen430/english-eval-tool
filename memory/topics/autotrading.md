# AutoTrading - 自动化交易系统

## 项目简介
针对加密货币市场的自动化交易系统

## 交易平台
- **Bitget**（当前使用）

## 策略逻辑（完整版）
1. **事件A**：1分钟 EMA50/200 金叉 → 观察4小时内5分钟 EMA20/50 金叉 → 做多
2. **事件B**：1分钟 EMA50/200 死叉 → 观察4小时内5分钟 EMA20/50 死叉 → 做空
3. **重置逻辑**：4小时窗口内，如果1分钟出现新交叉 → 重置窗口，重新计时
4. **平仓**：持仓中5分钟 EMA20/50 死叉（金叉）反向交叉
5. **仓位**：100 USDT，20倍杠杆

## 优先级
- 1分钟交叉 > 5分钟交叉
- 4小时窗口内有新1分钟交叉 → 重置

## 技术方案
- TradingView Alerts 触发交易
- Bitget API 执行买卖
- 先模拟验证，再实盘

## 交易对
- BTC/USDT（试点）

## 当前进度
- 2025-05-30: Pine Script策略已编写
- 2025-05-30: Bitget API 连接成功（余额345.96 USDT）
- 2025-05-30: TradingView Webhook 配置完成
- 2025-05-30: 自动化交易系统上线运行
- 2025-05-30: v5版本更新（修复显示bug，增加信号标注）

## 配置详情
- 交易对: BTCUSDT
- 杠杆: 20x
- 仓位: 动态计算
- Webhook URL: https://prompt-vacation-elect-colon.trycloudflare.com/webhook

## 已知问题/迭代记录
### ⚠️ Cloudflare Tunnel临时地址问题
- **问题**: trycloudflare.com的URL是临时的，每次重启tunnel都会变
- **影响**: TradingView Alert的Webhook URL需要手动更新
- **当前方案**: 电脑保持开机不休眠，避免重启tunnel
- **长期方案**: 使用VPS + 固定域名或Cloudflare官方账户

## 文件位置
- 策略代码: autotrading/ema-strategy.pine
- 交易脚本: autotrading/trading-bot.py
- 规则文档: autotrading/strategy-rules.md

---

**2025-05-30 - 完整记录**
- Topic创建
- Claire确认使用Bitget平台
- 策略框架确定（EMA交叉 + 4小时窗口）
- 计划：先模拟验证，再上实盘
- Pine Script策略已写好（ema-strategy.pine）
- Bitget API 连接成功（余额345.96 USDT）
- TradingView Alert配置完成
- 自动化交易系统上线运行
- v5版本更新（修复显示bug，6种信号标注）

**2025-05-30 - Checkpoint**
- 系统运行中，等待信号触发
- 需注意：Cloudflare Tunnel为临时URL，电脑需保持开机
