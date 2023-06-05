import { Queue } from '../../tool/Queue'
import {
  SpectrogramAttr,
  FrameData,
  SpectrogramOptions,
  SpectrogramType,
  mergeDefaultOption,
} from './SpectrogramCommon'
import { PlaneLayer } from './planeLayer'
import Stats from '../../tool/stats/stats'

/** 语图对象
 * 包含3D 2D 实现
 */
export class Spectrogram {
  /** 挂载元素 */
  private dom: HTMLElement
  private stata: Stats
  /** 配置信息 */
  private options: SpectrogramOptions
  private planeLayer: PlaneLayer

  /** 共享属性 */
  private attr: SpectrogramAttr

  /**
   * 构造函数
   * @param options 配置信息
   */
  constructor(options: SpectrogramOptions) {
    this.options = mergeDefaultOption(options)
    this.dom = options.El
    this.dom.style.position = 'relative'
    // this.dom.style.backgroundColor = this.options.color.background
    /** 初始化缓存属性 */
    this.attr = {
      startFreq: 0,
      endFreq: 10000,
      startFreqView: 0,
      endFreqView: 10000,
      recentCache: this.resetCache(),
    }

    this.initStats(this.dom, this.options.Performance)
    this.planeLayer = new PlaneLayer(this.options, this.attr)
    this.registEvent()
  }
  /** 初始化性能监视 */
  initStats(dom: HTMLElement, Performance: boolean) {
    this.stata = new Stats()
    if (Performance) dom.appendChild(this.stata.dom)
  }

  /** 注册交互事件 */
  private registEvent() {
    //TODO
  }

  public update(fd: FrameData) {
    // 开始更新
    this.stata.begin()
    //记录缓存
    this.attr.recentCache.push(fd)
    // 根据类型不同更新
    switch (this.options.type) {
      case SpectrogramType.Stereo:
        //TODO
        break
      case SpectrogramType.Plane:
      default:
        this.planeLayer.update(fd)
        break
    }
    this.stata.end()
  }

  /**
   * 设置整个图的频率范围
   * @param startFreq 起点频率
   * @param endFreq 终止频率
   */
  public setFreqRange(startFreq: number, endFreq: number) {
    this.attr.startFreq = startFreq
    this.attr.endFreq = endFreq
    this.attr.recentCache = this.resetCache()
    //TODO
  }
  /** 重置缓存 */
  private resetCache() {
    const cache = new Queue<FrameData>(this.options.cacheCount)
    cache.clear()
    return cache
    //TODO
  }
  public setViewFreqRange(startFreq: number, endFreq: number) {
    this.attr.startFreqView = startFreq
    this.attr.endFreqView = endFreq
    //TODO
  }
}
