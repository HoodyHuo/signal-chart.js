import { GramOptions } from '../spectrum/SpectrumCommon'

export type WaveFormAttr = {
  /** 缓存数据<N帧> */
  cacheData: Float32Array
  /** 视图最大值（Y轴） */
  viewRangeMax: number
  /** 视图最小值（Y轴） */
  viewRangeMin: number
  /** 视图起点点数（X轴） */
  viewStart: number
  /** 视图终点点数（X轴） */
  viewEnd: number
  /** 是否暂停状态 */
  isSuspend: boolean
}

export interface WaveFormOptions extends GramOptions {
  /** 采样率 */
  simpleRate: number
  /** 存储深度 */
  cache: number
  /** 值最大 */
  rangeMax: number
  /** 值最小 */
  rangeMin: number
  /** 颜色配置 */
  color?: {
    /** 图色谱 颜色字符串 如 '#FFFFFF'*/
    line?: string
    /** 背景色 */
    background?: string
    /** 轴色 */
    axis?: string
    /** 轴标签色 */
    label?: string
  }
}

/**
 * 通过默认值构造波形图参数
 * @param options 波形图构造参数
 * @returns 补全默认值的构造参数
 */
export function mergeDefaultOption(options: WaveFormOptions): WaveFormOptions {
  const fullOption = {
    Performance: true,
    El: document.createElement('div'),
    /** 采样率 */
    simpleRate: 9600,
    cache: (9600 / 2) * 5,
    /** 值最大 */
    rangeMax: 32768,
    /** 值最小 */
    rangeMin: -32768,
    /** 颜色配置 */
    color: {
      /** 图色谱 颜色字符串 如 ['#FFFFFF','#000000'] */
      line: '#FFFFFF',
      /** 背景色 */
      background: '#a2a2a2',
      /** 轴色 */
      axis: '#FFFFFF',
      /** 轴标签色 */
      label: '#FFFFFF',
    },
  }
  const color = fullOption.color
  Object.assign(color, options.color)
  Object.assign(fullOption, options)
  fullOption.color = color
  return fullOption
}
