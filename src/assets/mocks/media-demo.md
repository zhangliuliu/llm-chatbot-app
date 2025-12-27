# 媒体内容演示 (Media Demo)

这是一个演示 Markdown 自动识别音视频链接并渲染为播放器的示例，同时也展示了图片和普通链接的正常兼容。

## 1. 独立一行 (Standalone)
当媒体链接独占一行时，它会渲染为一个完整的播放器：

### 视频演示
[Ocean Video](https://vjs.zencdn.net/v/oceans.mp4)

### 音频演示
[Example Audio](https://www.w3schools.com/html/horse.mp3)

---

## 2. 图片渲染 (Normal Images)
按照我们的约定，图片语法 `![]()` 始终被渲染为图片，即使它的后缀看起来像音视频。

![示例图片](https://picsum.photos/seed/picsum/600/300)
*这是一张正常的 Markdown 图片*

---

## 3. 普通链接 (Standard Links)
非音视频后缀的链接将保持正常的跳转功能：

- [访问 GitHub 项目地址](https://github.com)
- [查看 Google 搜索结果](https://www.google.com)

---

## 4. 内联模式 (Inline)
当音视频链接处于文字中间时，它会保留链接样式并添加图标。你可以**点击下方的链接**来在消息气泡底部展开播放器（交互 A）。

- 你可以听听这首 [马叫声.mp3](https://www.w3schools.com/html/horse.mp3) 很有趣。
- 这段 [大海视频.mp4](https://vjs.zencdn.net/v/oceans.mp4) 非常治愈。

---

## 5. 混合段落
这是一个包含文字描述、一个 [测试音频](https://www.w3schools.com/html/horse.mp3) 以及一个 [测试视频](https://vjs.zencdn.net/v/oceans.mp4) 的混合段落。点击链接即可播放，不会破坏文字排版。
