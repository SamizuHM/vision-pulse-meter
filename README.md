# Vision Pulse Meter

Vision Pulse Meter 是一个基于 React Native（Expo）构建的跨平台应用示例，使用手机摄像头捕捉电表 LED 脉冲并根据用户输入的电表常数估算实时功率，同时通过本地 SQLite 保存测量历史记录。

## 功能概览

- 📸 **实时相机取景**：使用手机后置摄像头采集视频帧。
- 🎯 **ROI 选取**：通过拖拽和滑杆调整感兴趣区域（ROI），聚焦在电表脉冲指示灯。
- 📈 **本地脉冲检测算法**：在客户端对 ROI 内亮度进行平滑、阈值判定，估算脉冲次数与功率，无需后端服务。
- 💾 **SQLite 历史记录**：使用 `expo-sqlite` 在本地保存每次测量结果，支持下拉刷新和一键清空。
- 🌓 **深色主题界面**：包含测量与历史两个标签页，界面信息清晰易读。

## 技术栈

- [Expo](https://expo.dev/) + React Native 0.73
- TypeScript
- `expo-camera` 捕捉图像帧
- `jpeg-js` 解码相机图片以计算亮度
- `expo-sqlite` 负责本地数据库
- `@react-native-community/slider` 构建 ROI 大小调整控件

## 项目结构

```
├── App.tsx                   # 顶层应用，包含标签页切换与数据库初始化
├── app.json                  # Expo 配置
├── src/
│   ├── components/
│   │   └── RoiOverlay.tsx    # ROI 选区覆盖层，支持拖拽
│   ├── hooks/
│   │   └── useMeterRecorder.ts # 脉冲检测与功率计算核心逻辑
│   ├── screens/
│   │   ├── HistoryScreen.tsx   # 历史记录列表
│   │   └── MeasurementScreen.tsx # 相机测量界面
│   ├── storage/
│   │   └── database.ts         # SQLite 初始化与 CRUD
│   ├── styles/
│   │   └── colors.ts           # 颜色常量
│   ├── utils/
│   │   ├── brightness.ts       # JPEG 解码与亮度计算
│   │   └── format.ts           # 文本格式化辅助函数
│   └── types.ts              # 共享类型定义
└── tsconfig.json
```

## 安装与运行

> **提示**：首次运行需安装依赖并确保本地环境已按照 [Expo 环境搭建指南](https://docs.expo.dev/get-started/installation/) 配置完成。

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run start
```

使用 Expo Go 扫码或运行 `npm run android` / `npm run ios` 在模拟器上调试。

## 使用指南

1. 首次启动授予相机权限。
2. 在底部“实时测量”页面输入电表常数（单位：次/度）。
3. 将手机对准电表指示灯，通过拖动 ROI 方框和调整宽高滑杆，使方框紧贴 LED 灯区域。
4. 点击“开始测量”，应用会周期性抓取 ROI 内亮度并统计脉冲次数。
5. 点击“停止测量”结束后，若捕捉到有效脉冲，会自动保存到历史记录。
6. 切换到“历史记录”标签，可查看历史功率、脉冲次数与测量时长，支持下拉刷新和清空。

## 脉冲检测策略

- 使用 `Camera.takePictureAsync` 周期性拍摄低质量（`quality=0.2`）的帧并转换为 Base64。
- 借助 `jpeg-js` 将图像转为像素数组，计算 ROI 内每个像素的加权平均亮度。
- 通过指数滑动平均 (EMA) 构造平滑基线，并结合亮度方差动态设定阈值。
- 当亮度相对于基线的增量超过阈值且两次触发间隔超过 200ms，即判定为一次脉冲。
- 根据用户输入的电表常数计算瞬时功率：`P = pulses * 3600000 / (meterConstant * durationSeconds)`。

## 已知限制

- 由于使用 `takePictureAsync` 获取帧，采样频率受限于设备性能，建议在光线稳定的环境下使用。
- 不同机型的快门延迟与自动曝光可能影响亮度曲线，必要时可减小 ROI 或增加采样间隔。
- 当前算法主要针对 LED 闪烁式电表，若需支持机械指针或更复杂场景，可在 `useMeterRecorder` 中扩展图像处理逻辑。

## 许可证

本项目代码仅用于演示，可根据实际需求自由修改和扩展。
