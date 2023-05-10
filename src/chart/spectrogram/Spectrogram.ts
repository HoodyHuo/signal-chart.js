import { SpectrogramThreeLayer } from './SpectrogramThreeLayer'
import { KeepMode, Marker, mergeDefaultOption, SpectrogramOptions } from './SpectrogramCommon'
import { SpectrogramGridLayer } from './SpectrogramGridLayer'
import { Position } from '../common'

// 坐标轴中箭头的宽和高
const arrow = {
  width: 12,
  height: 20,
}
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

  /**------------------------图像绘制层--------------------------------- */

  private AXIS_ORIGIN: { x: number; y: number }
  private threeLayer: SpectrogramThreeLayer
  private gridLayer: SpectrogramGridLayer

  /**构造函数 */
  constructor(options: SpectrogramOptions) {
    const fullOptions = mergeDefaultOption(options)

    this.dom = fullOptions.El

    this.threeLayer = new SpectrogramThreeLayer(fullOptions)
    this.gridLayer = new SpectrogramGridLayer(fullOptions)
    // this.setViewLevelRange(-100, 20)

    // 标尺原点，以此为起点
    this.AXIS_ORIGIN = {
      x: fullOptions.HORIZONTAL_AXIS_MARGIN,
      y: fullOptions.VERTICAL_AXIS_MARGIN,
    }
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
    return Math.round(((freq - this.startFreq) * 4800) / abs)
  }

  /**
   * 通过dom上的dom元素的左上坐标系位置获取世界坐标系的X,Y
   * @param x  x
   * @param y  y
   * @returns
   */
  public getPointValue(x: number, y: number): Position {
    return this.threeLayer.translateToWorld(x, y)
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
      this.resizeData(data)
    }
    this.threeLayer.update(data)
  }

  /**
   * 获取当前缩放状态下的坐标轴范围值
   */
  public getBorderValue(): { top: number; bottom: number; left: number; right: number } {
    return this.threeLayer.getBorderValue()
  }

  /** 临时函数，用于绘制线图的包围框 */
  public getProject() {
    const p = this.threeLayer.getProject()
    this.gridLayer.draw(p.xmin, p.xmax, p.ymaxP, p.yminP)
  }
}
