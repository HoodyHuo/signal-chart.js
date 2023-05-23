import { SpectrogramThreeLayer } from './SpectrogramThreeLayer'
import { KeepMode, mergeDefaultOption, SpectrogramOptions } from './SpectrogramCommon'
import { SpectrogramGridLayer } from './SpectrogramGridLayer'
import { Position } from '../common'

/**频谱网格图层 */
export class Spectrogram {
  /**------------------------图谱属性--------------------------------- */
  private dom: HTMLElement

  /**------------------------图谱属性--------------------------------- */
  /**配置*/
  private options: SpectrogramOptions
  /** 显示模式 */
  private keepMode: KeepMode

  /** 数据起点频率 */
  private startFreq: number
  /** 数据终止频率 */
  private endFreq: number

  /** 当前视图起点频率 */
  private startFreqView: number
  /** 当前视图终止频率 */
  private endFreqView: number

  /** 当前视图低电平 */
  private lowLevel: number
  /** 当前视图高电平 */
  private highLevel: number
  /**------------------------图像绘制层--------------------------------- */

  private AXIS_ORIGIN: { x: number; y: number }
  private threeLayer: SpectrogramThreeLayer
  private gridLayer: SpectrogramGridLayer

  /**构造函数 */
  constructor(options: SpectrogramOptions) {
    const fullOptions = mergeDefaultOption(options)

    this.dom = fullOptions.El
    this.dom.style.position = 'relative'
    this.dom.style.backgroundColor = fullOptions.color.background

    this.threeLayer = new SpectrogramThreeLayer(fullOptions)
    this.gridLayer = new SpectrogramGridLayer(fullOptions)
    // this.setViewLevelRange(-100, 20)

    // 标尺原点，以此为起点
    this.AXIS_ORIGIN = {
      x: fullOptions.HORIZONTAL_AXIS_MARGIN,
      y: fullOptions.VERTICAL_AXIS_MARGIN,
    }

    this.registeEvent()
  }

  private registeEvent() {
    // 注册鼠标滚轮缩放
    this.dom.addEventListener('mousewheel', (event: Event) => {
      const e = event as WheelEvent // 强制类型为 滚动鼠标事件
      const p = Math.round(this.getMarkerValue(e.offsetX - this.AXIS_ORIGIN.x, e.offsetY).x) //获取当前鼠标数据位置
      const delta = e.deltaY > 0 ? 1.5 : 0.6 // 获取滚轮量 100 或-100
      this.scaleH(p, delta)
    })
    this.dom.addEventListener('mousemove', (event: Event) => {
      const e = event as MouseEvent // 强制类型为 滚动鼠标事件
      const p = this.getMarkerValue(e.offsetX - this.AXIS_ORIGIN.x, e.offsetY) //获取当前鼠标数据位置
      console.log(p)
    })
  }
  /**
   * 横向缩放图谱
   * @param freq 鼠标聚焦频点
   * @param delta 缩放比例
   */
  public scaleH(freq: number, delta: number) {
    const range = this.getBorderValue() //获取当前显示范围
    const oldLen = range.right - range.left //计算当前显示数量
    const newLen = Math.round(oldLen * delta)
    const oldPst = (freq - range.left) / oldLen
    const newLeft = Math.round(freq - newLen * oldPst)
    const newRight = newLeft + newLen
    this.setViewFreqRange(
      newLeft < this.startFreq ? this.startFreq : newLeft,
      newRight > this.endFreq ? this.endFreq : newRight,
    )
  }

  /**
   * 设置总图谱数据的起止频率范围（HZ）
   * @param startFreq 起点频率
   * @param endFreq 终点频率
   */
  public setFreqRange(startFreq: number, endFreq: number) {
    this.startFreq = startFreq
    this.endFreq = endFreq
  }

  /**
   * 设置当前显示频率图像的起止频率
   * 绘图软件会将指定频率范围数据放大
   * @param startFreq 起点频率
   * @param endFreq 终点频率
   */
  public setViewFreqRange(startFreq: number, endFreq: number) {
    if (startFreq < this.startFreq || endFreq > this.endFreq || endFreq <= startFreq) {
      throw new Error('设置起止频率范围错误')
    }
    const starIndex: number = this.getDataIndexByFreq(startFreq)
    const endIndex: number = this.getDataIndexByFreq(endFreq)
    this.threeLayer.setViewRange(starIndex, endIndex)
    this.gridLayer.setFreqRange(startFreq, endFreq)
    this.startFreqView = startFreq
    this.endFreqView = endFreq
  }
  /**
   * 设置当前图谱展示的电平值范围
   * @param lowLevel 低点电平
   * @param highLevel 高点电平
   */
  public setViewLevelRange(lowLevel: number, highLevel: number) {
    if (lowLevel >= highLevel) {
      throw new Error('设置起止频率范围错误')
    }
    this.threeLayer.setViewLevel(lowLevel, highLevel)
    this.gridLayer.setViewLevel(lowLevel, highLevel)
  }

  /**
   * 通过频率获取对应数据的序号
   * @param freq 频率
   * @returns 频率对应在数据结构中的序号
   */
  public getDataIndexByFreq(freq: number): number {
    const abs = this.endFreq - this.startFreq
    return ((freq - this.startFreq) / abs) * this.threeLayer.drawCount
  }

  /**
   * 通过屏幕坐标系位置获取对应marker的频率和电平
   * @param x  x
   * @param y  y
   * @returns Hz,dBm
   */
  public getMarkerValue(x: number, y: number): Position {
    const indexP = this.threeLayer.translateToWorld(x, y)
    if (!indexP) {
      throw new Error(`getMarkerValue (${x},${y}) not found value`)
    }
    return {
      x: this.startFreq + indexP.x * this.getFreqPrePoint(),
      y: indexP.y,
    }
  }

  private getFreqPrePoint() {
    return (this.endFreq - this.startFreq) / this.threeLayer.drawCount
  }

  public setKeepMode(mode: KeepMode) {
    this.keepMode = mode
    this.threeLayer.setKeepMode(mode)
  }
  /**
   * 更新频谱数据
   * @param data 频谱数据（1帧）
   */
  public update(data: Float32Array) {
    if (data.length !== this.threeLayer.data.length) {
      this.threeLayer.resizeData(data.length)
      this.setViewFreqRange(this.startFreq, this.endFreq)
    }
    this.threeLayer.update(data)
  }

  /**
   * 获取当前缩放状态下的p频率、电平值
   * @returns { top: number; bottom: number; left: number; right: number }  top: 最大电平; bottom: 最小电平; left: 频率起点; right: 频率终点
   */
  public getBorderValue(): { top: number; bottom: number; left: number; right: number } {
    const border = this.threeLayer.getBorderValue()
    const fpp = this.getFreqPrePoint()
    return {
      top: border.top,
      bottom: border.bottom,
      left: border.left * fpp + this.startFreq,
      right: border.right * fpp + this.startFreq,
    }
  }

  /** 临时函数，用于绘制线图的包围框 */
  public getProject() {
    const p = this.threeLayer.getProject()
    this.gridLayer.draw(p.xmin, p.xmax, p.ymaxP, p.yminP)
  }
}
