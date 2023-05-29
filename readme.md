# Signal Chart

基于 ThreeJS 的信号图形库

## 用法

下载`lib/signal-chart.js`添加到项目，或在 node_modules 目录拉取本项目

```js
import { Spectrogram } from 'signal-chart.js'
const gram = new Spectrogram({
  El: document.body, //必填：挂载节点
  Performance: false, //可选： 是否打开性能监视窗口
  fftLen: 4800, //可选 ： FFT数组长度，默认4800，能够根据传入数据自动调整
  HORIZONTAL_AXIS_MARGIN: 50, //可选 ： 默认50px
  VERTICAL_AXIS_MARGIN: 50, //可选:默认50px
  keepMode: KeepMode.CLEAN, //可选：默认刷新模式
  cacheCount: 500, //可选：默认500帧
  color: {
    //可选
    grid: '#555555', // 可选 背景网格颜色
    background: '#000000', //可选 背景色
    axis: '#FFFFFF', // 可选 轴色
    label: '#FFFFFF', // 可选 轴标签色
    line: '#3ed630', // 可选 折线色
  },
})

//设置当前图谱的频率范围(表示值)
gram.setFreqRange(1000, 32000)
//设置可视区域的范围（Hz）,展示1.5KHz 到 32Khz
gram.setViewFreqRange(1500, 32000)
//设置电平显示范围（dBm）
gram.setViewLevelRange(-120, -20)
//更新图谱数据（FFT频谱 Float32Array 格式，每次update一帧）
gram.update(data)
```
