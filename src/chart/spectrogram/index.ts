import { Queue } from '../../tool/Queue'
import {
  SpectrogramAttr,
  FrameData,
  SpectrogramOptions,
  SpectrogramType,
  mergeDefaultOption,
} from './SpectrogramCommon'
import { PlaneLayer } from './planeLayer'
import { ThreeLayer } from './ThreeLayer'
import { Position, toDisplayFreq } from '../common'
import Stats from '../../tool/stats/stats'
import { EmitEvent, FreqChangeable } from '../ConnectorGroup'
import { EventDispatcher } from 'three'
import { ISpectrogram } from './ISpectrogram'
import { ColorMap } from '../../tool/ColorMap'
/** 鼠标事件类型 */
enum MouseEnum {
  ScrollY,
  ScrollX,
  ScrollBar,
  SelectRange,
  None,
}
/** 语图对象
 * 包含3D、2D 实现
 * TODO  3D
 */
export class Spectrogram extends EventDispatcher implements FreqChangeable {
  /** 挂载元素 */
  private dom: HTMLElement
  private textDom: HTMLElement
  /** 性能监视器 */
  private stata: Stats
  /** 配置信息 */
  private options: SpectrogramOptions
  /** 语图层 */
  private spectrogramLayer: ISpectrogram
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
    this.textDom = document.createElement('div')
    this.textDom.style.cssText = `position:absolute;top:0;right:0;cursor:pointer;z-index:540;width:110px;height:80px;font-size: 8px;color: #ffffff;background-color: rgba($color: #ffffff, $alpha: 0.5);`
    this.dom.style.position = 'relative'
    this.dom.appendChild(this.textDom)
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
      color: new ColorMap(options.color.front, 210), //TODO 颜色范围从其他区域设置
    }
    // 创建性能监视器
    this.initStats(this.dom, this.options.Performance)
    //构造语图图层
    switch (options.type) {
      case SpectrogramType.Stereo:
        // 构造3D语图图层
        this.spectrogramLayer = new ThreeLayer(this.options, this.attr)
        break
      case SpectrogramType.Plane:
      default:
        this.spectrogramLayer = new PlaneLayer(this.options, this.attr)
    }

    // 注册操作交互事件监听
    this.registEvent()
  }
  /** 初始化性能监视 */
  initStats(dom: HTMLElement, Performance: boolean) {
    this.stata = new Stats()
    if (Performance) dom.appendChild(this.stata.dom)
  }

  /* 创建一个放鼠标移动显示数据的dom */
  private setMouseDom(freq: number, level: number, time: number) {
    if (level) {
      this.textDom.innerText = `
      频率：${toDisplayFreq(freq)}
      电平：${level.toFixed(2)}dBm
      时间：${this.convertTime(time)}
      `
    }
  }
  private convertTime(date: number) {
    const time = new Date(date).toTimeString()
    const index = time.indexOf(' ')
    const result = time.substring(0, index)
    return result
  }

  /** 注册交互事件 按钮，切换等等 */
  private registEvent() {
    //TODO
    this.dom.addEventListener('mousemove', (e: MouseEvent) => {
      e.preventDefault()
      const v = this.spectrogramLayer.translateToWorld(e.offsetX, e.offsetY)
      this.setMouseDom(v.freq, v.level, v.time)
    })
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
    this.spectrogramLayer.update(fd)
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
    this.spectrogramLayer.setFreqRange(startFreq, endFreq)
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
    this.spectrogramLayer.setViewFreqRange(startFreq, endFreq)
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
    this.attr.color = new ColorMap(this.options.color.front, highLevel - lowLevel)
    this.spectrogramLayer.setViewLevelRange(lowLevel, highLevel)
  }
}
