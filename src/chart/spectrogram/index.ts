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
import { EmitEvent, FreqChangeable } from '../ConnectorGroup'
import { EventDispatcher } from 'three'

/** 语图对象
 * 包含3D、2D 实现
 * TODO  3D
 */
export class Spectrogram extends EventDispatcher implements FreqChangeable {
  /** 挂载元素 */
  private dom: HTMLElement
  /** 性能监视器 */
  private stata: Stats
  /** 配置信息 */
  private options: SpectrogramOptions
  /** 2D 语图层 */
  private planeLayer: PlaneLayer
  /** 共享属性 */
  private attr: SpectrogramAttr

  /**
   * 构造函数
   * @param options 配置信息
   */
  constructor(options: SpectrogramOptions) {
    super()
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
      lowLevel: -200,
      highLevel: 10,
      recentCache: this.resetCache(),
    }
    // 创建性能监视器
    this.initStats(this.dom, this.options.Performance)
    //构造2D语图图层
    this.planeLayer = new PlaneLayer(this.options, this.attr)
    // 注册操作交互事件监听
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
  /**
   * 更新图形数据
   * @param fd 语图帧数据
   */
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
  @EmitEvent
  public setFreqRange(startFreq: number, endFreq: number) {
    this.attr.startFreq = startFreq
    this.attr.endFreq = endFreq
    this.attr.recentCache = this.resetCache()
    this.planeLayer.setFreqRange(startFreq, endFreq)
  }
  /** 重置缓存 */
  private resetCache() {
    const cache = new Queue<FrameData>(this.options.cacheCount)
    cache.clear()
    return cache
    //TODO
  }
  @EmitEvent
  public setViewFreqRange(startFreq: number, endFreq: number) {
    this.attr.startFreqView = startFreq
    this.attr.endFreqView = endFreq
    this.planeLayer.setViewFreqRange(startFreq, endFreq)
  }

  /**
   * 设置当前图谱展示的电平值范围
   * @param lowLevel 低点电平
   * @param highLevel 高点电平
   */
  @EmitEvent
  public setViewLevelRange(lowLevel: number, highLevel: number) {
    this.attr.lowLevel = lowLevel
    this.attr.highLevel = highLevel
    this.planeLayer.setViewLevelRange(lowLevel, highLevel)
  }
}
