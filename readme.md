# Signal Chart

基于 ThreeJS 的信号图形库

## 用法

```js
import { Spectrogram } from '../lib/signal-chart.js'
const gram = new Spectrogram({
  keepMode: 0, // 保持模式 0 刷新 1 最大 2 最小 3 平均

  cacheCount: 500,
  Performance: true, // 是否打开性能监视窗口
  El: document.getElementById('cont'), // 图形绘制节点
  color: {
    background: '#999999', //背景色
    line: '#000000', // 线条颜色
  },
})

//设置当前图谱的频率范围
gram.setFreqRange(0, 4800)
//设置可视区域的范围
gram.setViewFreqRange(0, 3000)
gram.setViewLevelRange(-120, -20)
//更新图谱数据（FFT频谱 Float32Array 格式，每次update一帧）
gram.update(data)
```
