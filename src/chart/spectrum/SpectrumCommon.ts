/**保持模式 */
export enum KeepMode {
  /**刷新模式 */
  CLEAN,
  /**最大保持模式 */
  MAX,
  /**最小保持模式 */
  MIN,
  /** 平均模式 */
  AVG,
}

export interface GramOptions {
  /** 是否打开性能监视窗口 */
  Performance: boolean
  /** 图形绘制节点 */
  El: HTMLElement
  /** Y轴与canvas的距离px */
  HORIZONTAL_AXIS_MARGIN?: number
  /** X轴标尺与canvas的距离px */
  VERTICAL_AXIS_MARGIN?: number
}

/**
 * Marker对象
 */
export interface Marker {
  freq: number //频率 Hz
  level?: number // 设置电平
  _level?: number //从频谱提取的电平
  name?: string // marker 名称
}

/**
 * 固定标线
 */
export interface MarkerLine {
  color?: string
  level: number
  name: string
}

/**
 * 转换FFT数组到绘制数组
 * @param dist 绘制数据缓冲区
 * @param src  频谱FFT数据
 * @returns Threejs绘制的三维数组
 */
export const convertToDrawData = (drawData: Float32Array, src: Float32Array) => {
  for (let i = 0; i < src.length; i++) {
    drawData[i * 3] = i // X轴按下标
    drawData[i * 3 + 1] = src[i] // y轴值
    drawData[i * 3 + 2] = 0 //平面图，Z轴始终为0
  }
}

export interface Color {
  /** 背景网格颜色 */
  grid?: string
  /** 背景色 */
  background?: string
  /** 轴色 */
  axis?: string
  /** 轴标签色 */
  label?: string
  /** 折线色 */
  line?: string
  /** 鼠标焦点中心绘线图*/
  focusLine?: string
}

/**
 * 频谱图配置参数
 */
export interface SpectrogramOptions extends GramOptions {
  /** 保持模式 */
  keepMode?: KeepMode
  /** 缓存帧数 */
  cacheCount?: number
  /**颜色配置 */
  color?: Color
  /**FFT 数组长度 */
  fftLen?: number
}
export function mergeDefaultOption(options: SpectrogramOptions): SpectrogramOptions {
  const defaultOption = {
    El: document.body,
    Performance: false,
    fftLen: 4800,
    HORIZONTAL_AXIS_MARGIN: 50,
    VERTICAL_AXIS_MARGIN: 50,
    keepMode: KeepMode.CLEAN,
    cacheCount: 500,
    color: {
      grid: '#555555', // 背景网格颜色
      background: '#000000', // 背景色
      axis: '#FFFFFF', // 轴色
      label: '#FFFFFF', // 轴标签色
      line: '#3ed630', // 折线色
      focusLine: '#f50505', //鼠标焦点线图
    },
  }
  Object.assign(defaultOption, options)
  return defaultOption
}

export interface SpectrumAttr {
  /** 三角标记 */
  markers: Map<string, Marker>
  /** 标记计数器 */
  markerCur: number
  /** 当前帧缓存 */
  data: Float32Array
  /** 线型标记 */
  markerLines: Map<string, MarkerLine>
}

export const LayerIndex = {
  BACKGROUND_GRID: 500,
  AXIS_LINE: 520,
  FFT_LINE: 530,
  MARKER: 540,
  ARROW_GRID: 550,
  ARROW_LABEL: 560,
}
