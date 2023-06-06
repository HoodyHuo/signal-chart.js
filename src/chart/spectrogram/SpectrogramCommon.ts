import { Queue } from '../../tool/Queue'

/** 朝向 */
export enum SpectrogramDirection {
  /** 向上 */
  UP,
  /** 向左 */
  Left,
}
/** 图谱类型 */
export enum SpectrogramType {
  /** 平面2D  */
  Plane,
  /** 立体三维 */
  Stereo,
}

/** 每帧数据 */
export type FrameData = {
  /** 帧时间 */
  time: number
  /** 帧频谱 */
  data: Float32Array
}

/** 公用配置信息 */
export type SpectrogramAttr = {
  /** 数据起点频率 */
  startFreq: number
  /** 数据终止频率 */
  endFreq: number
  /** 当前视图起点频率 */
  startFreqView: number
  /** 当前视图终止频率 */
  endFreqView: number
  /** 当前视图低电平 */
  lowLevel: number
  /** 当前视图高电平 */
  highLevel: number
  /** 缓存，保存了最近N包的数据 */
  recentCache: Queue<FrameData>
}

export enum SpectrogramColorMap {
  Rainbow,
}

export interface ColorMap {
  get(value: number): string
}
export interface GramOptions {
  /** 是否打开性能监视窗口 */
  Performance: boolean
  /** 图形绘制节点 */
  El: HTMLElement
}
/** 语图配置 */
export interface SpectrogramOptions extends GramOptions {
  /** 频谱图方向 */
  direction?: SpectrogramDirection
  /** 频频图类型：2D 3D  */
  type?: SpectrogramType
  /** 色 */
  color?: {
    /** 图色谱 颜色字符串 如 #FFFFFF,#000000 */
    front?: string[]
    /** 背景色 */
    background?: string
    /** 轴色 */
    axis?: string
    /** 轴标签色 */
    label?: string
  }
  fftLen?: number
  /** 缓存帧数 */
  cacheCount?: number
  /** Y轴与canvas的距离px */
  HORIZONTAL_AXIS_MARGIN?: number
  /** X轴标尺与canvas的距离px */
  VERTICAL_AXIS_MARGIN?: number
}
export function mergeDefaultOption(options: SpectrogramOptions): SpectrogramOptions {
  const defaultOpt = {
    /** 频谱图方向 */
    direction: SpectrogramDirection.UP,
    /** 频频图类型：2D 3D  */
    type: SpectrogramType.Plane,
    /** 色 */
    color: {
      /** 图色谱 */
      front: ['blue', 'red', 'yellow'],
      /** 背景色 */
      background: 'black',
      /** 轴色 */
      axis: 'white',
      /** 轴标签色 */
      label: 'white',
    },
    fftLen: 4800,
    /** 缓存帧数 */
    cacheCount: 500,
    Performance: true,
    /** Y轴与canvas的距离px */
    HORIZONTAL_AXIS_MARGIN: 20,
    /** X轴标尺与canvas的距离px */
    VERTICAL_AXIS_MARGIN: 50,
  }
  const color = Object.assign(defaultOpt.color, options?.color)
  const temp = Object.assign(defaultOpt, options)
  temp.color = color
  return temp
}
