# 引用消息功能 (Quote Message Feature)

这个功能允许用户在消息输入框中引用其他消息。

## 功能概述

1. **引用消息图标**: 当鼠标悬停在消息上时，会显示一个引用图标
2. **引用消息显示**: 被引用的消息会显示在输入框上方
3. **取消引用**: 用户可以点击"X"按钮来取消引用

## 组件结构

### QuotedMessage 组件
- 位置: `webapp/channels/src/components/quoted_message/quoted_message.tsx`
- 功能: 显示被引用的消息内容
- 包含: 用户头像、用户名、频道名、时间戳、消息内容

### QuoteIcon 组件
- 位置: `webapp/channels/src/components/widgets/icons/quote_icon.tsx`
- 功能: 引用消息的图标按钮
- 包含: 工具提示和点击事件处理

## 使用方法

### 1. 在消息上悬停
当鼠标悬停在消息上时，会显示引用图标。

### 2. 点击引用图标
点击引用图标会将消息添加到输入框上方的引用区域。

### 3. 查看引用消息
被引用的消息会显示在输入框上方，包含：
- 用户头像和用户名
- 频道名称
- 时间戳
- 消息内容

### 4. 取消引用
点击引用消息右上角的"X"按钮可以取消引用。

## 样式文件

- `webapp/channels/src/components/quoted_message/quoted_message.scss`
- 定义了引用消息的样式，包括布局、颜色、边框等

## 测试

- 测试文件: `webapp/channels/src/components/quoted_message/quoted_message.test.tsx`
- 包含组件渲染和交互测试

## 集成点

这个功能已经集成到以下组件中：
- `PostOptions`: 添加引用图标到消息悬停菜单
- `AdvancedTextEditor`: 支持显示引用消息
- `ChannelView`: 管理引用消息状态
- `AdvancedCreatePost`: 传递引用消息props

## 注意事项

1. 引用消息功能只在桌面版本中可用
2. 系统消息和临时消息不支持引用
3. 引用消息会占用输入框上方的空间
4. 用户可以同时引用多条消息（通过多次点击引用图标） 