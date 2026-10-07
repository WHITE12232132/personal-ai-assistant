# 个人本地 AI 助手（Beaster App）

> 基于 React Native / Expo 的移动端 AI 聊天应用。SSE 流式对话、多会话、Markdown 渲染、
> 多服务商模型管理，已通过 EAS 打包出可安装的安卓/iOS 包。

## ✨ 功能特性

- 💬 **SSE 流式对话** —— 手写流式解析（粘包/半帧处理、心跳免疫），AbortController 随停随续
- 🗂 **多会话历史** —— 本地多会话存储与切换，含旧数据迁移方案
- 📝 **Markdown 渲染** —— 流式纯文本 + 光标，落定后排版（性能与体验的取舍）
- 🔌 **多 Provider 模型管理** —— 服务商账本 + 模型选择，key 只存本机（SecureStore 加密）
- 🎨 **主题三档** —— 浅色/深色/跟随系统，图标与启动屏均有深浅双版
- 🔒 **合规** —— 首启隐私弹窗（AI 类应用合规要点）、安装包零 key 泄露

## 🛠 技术栈

Expo SDK 57 · React Native 0.86 · TypeScript · expo-router ·
react-native-marked · react-native-keyboard-controller · AsyncStorage · expo-secure-store

## 🚀 快速开始

```bash
git clone https://github.com/<你的用户名>/<仓库名>.git
cd <仓库名>
npm install
copy .env.example .env   # 填入你自己的 API Key
npx expo start           # Expo Go 扫码真机运行
```

## 📁 目录结构

```
src/
├── app/        # 路由薄壳（expo-router）
├── chat/       # 聊天页与组件
├── history/    # 多会话历史
├── markdown/   # Markdown 渲染
├── api/        # SSE/配置/模型管理
├── storage/    # 本地存储与迁移
├── privacy/    # 隐私合规弹窗
└── theme/      # 主题三档
```

## 📦 安装包

[Releases](../../releases) 提供安卓 APK（iOS 见 Release 说明）。
安装后在「设置 → 服务商管理」填入你自己的 API Key 即可使用。

## 🔐 隐私说明

聊天记录仅保存在设备本地；您输入的内容会发送给您所选择的第三方 LLM 服务商处理，本项目不收集任何数据。

## 📄 License

见 [LICENSE](./LICENSE)