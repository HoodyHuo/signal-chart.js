
/**保持模式 */
export enum KeepMode {
    /**刷新模式 */
    CLEAN,
    /**最大保持模式 */
    MAX,
    /**最小保持模式 */
    MIN,
    /** 平均模式 */
    AVG
  }
  
  
  export interface GramOptions {
    Performance: boolean // 是否打开性能监视窗口
    El: HTMLElement // 图形绘制节点
    HORIZONTAL_AXIS_MARGIN?: number // Y轴与canvas的距离px
    VERTICAL_AXIS_MARGIN?: number //X轴标尺与canvas的距离px
  }
  
  export type Marker = {
    freq: number //频率 Hz
    name: string // marker 名称
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
  }
  
  /**
   * 频谱图配置参数
   */
  export interface SpectrogramOptions extends GramOptions {
    keepMode?: KeepMode
    cacheCount?: number
    color?: Color
  }

  export function mergeDefaultOption(options: SpectrogramOptions): SpectrogramOptions {
    const defaultOption = {
      El: document.body,
      Performance: false,
      HORIZONTAL_AXIS_MARGIN: 50,
      VERTICAL_AXIS_MARGIN: 50,
      keepMode: KeepMode.CLEAN,
      cacheCount: 500,
      color: {
        grid: '#555555', // 背景网格颜色
        background: '#000000', // 背景色
        axis: '#ffffff', // 轴色
        label: '#ffffff', // 轴标签色
        line: '#00ff01', // 折线色
      },
    }
   
  Object.assign(defaultOption, options)
  return defaultOption
}