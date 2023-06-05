import { ColorMap } from '@/tool/ColorMap'
import { makeCanvas } from '../common'
import { FrameData, SpectrogramAttr, SpectrogramOptions } from './SpectrogramCommon'
/** 平面图 */
export class PlaneLayer {
  // --------------------------------------- 基础属性-------------------------
  /** 挂载dom */
  private dom: HTMLElement
  /** 构造配置 */
  private options: SpectrogramOptions
  /** 共享属性 */
  private attr: SpectrogramAttr

  // --------------------------------------- Canvas 图层-------------------------

  /** 缓存图层，以点数为宽，缓存数为高，的原始尺寸语图 ，最新数据在上方 */
  private cacheCanvas: HTMLCanvasElement
  private cacheCtx: CanvasRenderingContext2D

  /** 图谱图层 ，挂载在页面，通过缩放计算缓存图层进行展示 */
  private chartCanvas: HTMLCanvasElement
  private chartCtx: CanvasRenderingContext2D

  /** 网格图层 */
  private gridCanvas: HTMLCanvasElement
  private gridCtx: CanvasRenderingContext2D

  /** 色谱 */
  private color: ColorMap

  constructor(options: SpectrogramOptions, attr: SpectrogramAttr) {
    /** 从父层共享属性 */
    this.dom = options.El
    this.options = options
    this.attr = attr

    /** 色谱构建 */
    this.color = new ColorMap(options.color.front, 250) //TODO 颜色范围从其他区域设置

    /** 创建内存缓存图层 */
    this.cacheCanvas = this.createCacheCanvas()
    this.cacheCtx = this.cacheCanvas.getContext('2d')
    this.clear(this.cacheCtx)

    /** 创建绘制图层 */
    this.chartCanvas = makeCanvas(500, this.dom.clientHeight, this.dom.clientWidth)
    this.chartCtx = this.chartCanvas.getContext('2d')
    this.clear(this.chartCtx)
    this.dom.appendChild(this.chartCanvas)
  }

  /**
   * 增加数据行
   * @param fd 语图帧数据
   */
  public update(fd: FrameData) {
    this.appendLine(fd)
    this.drawToChart()
  }
  /**
   * 通过计算展示的频率范围，将缓存层图谱提取绘制到显示图层
   * TODO 根据方向进行旋转
   */
  private drawToChart() {
    const sh = this.cacheCanvas.height
    const dw = this.chartCanvas.clientWidth
    const dh = this.chartCanvas.clientHeight
    const 频率起点百分比 = (this.attr.startFreqView - this.attr.startFreq) / (this.attr.endFreq - this.attr.startFreq)
    const 频率终点百分比 = (this.attr.endFreqView - this.attr.startFreq) / (this.attr.endFreq - this.attr.startFreq)
    const 内存图起点X = 频率起点百分比 * this.options.fftLen
    const 内存终点X = 频率终点百分比 * this.options.fftLen
    const 显示宽度 = 内存终点X - 内存图起点X
    //绘制到显示图层
    this.chartCtx.drawImage(this.cacheCanvas, 内存图起点X, 0, 显示宽度, sh, 0, 0, dw, dh)
  }

  /**
   * 将最新帧，绘制到缓存画布
   * @param fd 帧数据
   */
  private appendLine(fd: FrameData) {
    // 创建宽度为FFT长度的图像，高度为1
    const imageLine = this.cacheCtx.createImageData(fd.data.length, 1)
    // 对每个点位进行颜色赋值
    for (let i = 0; i < imageLine.data.length; i += 4) {
      const value = fd.data[i / 4]
      const color = this.findColor(value)
      imageLine.data[i + 0] = color[0]
      imageLine.data[i + 1] = color[1]
      imageLine.data[i + 2] = color[2]
      imageLine.data[i + 3] = color[3]
    }
    // 图形向下移动1像素
    const oldImg = this.cacheCanvas
    const sw = this.cacheCanvas.width
    const sh = this.cacheCanvas.height
    this.cacheCtx.drawImage(oldImg, 0, 0, sw, sh - 1, 0, 1, sw, sh - 1)

    // 将新的色添加到图像上
    this.cacheCtx.putImageData(imageLine, 0, 0)
  }
  /**
   *  获取色值
   * @param value 电平
   * @param min 最小值
   * @param max 最大值
   */
  findColor(value: number): Uint8ClampedArray {
    const low = this.attr.lowLevel
    const hi = this.attr.highLevel
    let v = value
    v = value < low ? low : value
    v = v > hi ? hi : v
    v = Math.round(v - low)
    const color = this.color.getColor(v)
    return color
  }
  /**
   * 创建内存canvas ，以FFT点数为宽度，缓存数为高度
   * @returns 缓存canvas
   */
  private createCacheCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.height = this.options.cacheCount
    canvas.width = this.options.fftLen
    return canvas
  }

  /**
   * 清除内容弄
   * @param canvasCtx 待清理的Canvas绘制上下文,如果不传，则清除所有
   */
  private clear(...canvasCtx: CanvasRenderingContext2D[]) {
    canvasCtx.forEach((element) => {
      element.clearRect(0, 0, element.canvas.clientWidth, element.canvas.clientHeight)
    })
  }

  /**
   * 设置整个图的频率范围
   * @param startFreq 起点频率
   * @param endFreq 终止频率
   */
  public setFreqRange(startFreq: number, endFreq: number) {
    //TODO 重绘标尺
  }
  public setViewFreqRange(startFreq: number, endFreq: number) {
    //TODO 重绘标尺
  }
  /**
   * 设置当前图谱展示的电平值范围
   * @param lowLevel 低点电平
   * @param highLevel 高点电平
   */
  public setViewLevelRange(lowLevel: number, highLevel: number) {
    //TODO
    // this.clear(this.cacheCtx)
    // for (let i = 0; i < this.attr.recentCache.size(); i++) {
    //   this.appendLine(this.attr.recentCache.see(i))
    // }
    // this.drawToChart()
  }
}
