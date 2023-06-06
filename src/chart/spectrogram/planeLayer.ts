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

  /** 时间图层 */
  private timeCanvas: HTMLCanvasElement
  private timeCtx: CanvasRenderingContext2D

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
    this.chartCanvas = makeCanvas(
      500,
      this.dom.clientHeight - this.options.VERTICAL_AXIS_MARGIN,
      this.dom.clientWidth - this.options.HORIZONTAL_AXIS_MARGIN,
    )
    this.chartCanvas.style.left = this.options.HORIZONTAL_AXIS_MARGIN + 'px'
    this.chartCtx = this.chartCanvas.getContext('2d')
    this.clear(this.chartCtx)
    this.dom.appendChild(this.chartCanvas)

    /** 创建网格图层 */
    this.gridCanvas = makeCanvas(510, this.dom.clientHeight, this.dom.clientWidth)
    this.gridCtx = this.gridCanvas.getContext('2d')
    this.clear(this.gridCtx)
    this.dom.appendChild(this.gridCanvas)

    /** 创建时间图层 */
    this.timeCanvas = makeCanvas(520, this.dom.clientHeight, this.dom.clientWidth)
    this.timeCtx = this.timeCanvas.getContext('2d')
    this.clear(this.timeCtx)
    this.dom.appendChild(this.timeCanvas)

    /** 注册事件 */
    this.regevent()
  }
  private regevent(): void {
    this.chartCanvas.addEventListener('mousemove', (e: MouseEvent) => {
      const v = this.translateToWorld(e.offsetX, e.offsetY)
      console.log(v)
      console.log(this.translateToScreen(v.freq, v.time))
    })
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
   * 获取屏幕坐标系上指定位置的数据
   * @param x Web坐标系的X
   * @param y Web坐标系的Y
   * @returns 所在位置的 频率、电平、时间
   */
  public translateToWorld(x: number, y: number): { freq: number; level: number; time: number } {
    // 每像素频率
    const freqPerPx = (this.attr.endFreqView - this.attr.startFreqView) / this.chartCanvas.clientWidth
    // 当前鼠标位置的频率
    const freq = freqPerPx * x + this.attr.startFreqView
    // 频率在整个FFT数据中的index
    const indexFreq = Math.round(
      ((freq - this.attr.startFreq) / (this.attr.endFreq - this.attr.startFreq)) * this.options.fftLen,
    )
    // 时间在整个FFT数据中的index
    const indexTime = Math.round((y / this.chartCanvas.clientHeight) * this.attr.recentCache.cap())

    //频率，频率下标、时间下标、电平
    // console.log(freq, indexFreq, indexTime, this.attr.recentCache.see(indexTime).data[indexFreq])
    return {
      freq: Math.round(freq),
      level: this.attr.recentCache.see(indexTime).data[indexFreq],
      time: this.attr.recentCache.see(indexTime).time,
    }
  }

  /**
   * 通过频率、时间获取到对应屏幕的坐标系位置
   * @param freq 频率
   * @param time 时间 毫秒值
   * @returns 对应屏幕坐标系位置
   */
  public translateToScreen(freq: number, time: number): { x: number; y: number } {
    // 每像素频率
    const freqPerPx = (this.attr.endFreqView - this.attr.startFreqView) / (this.chartCanvas.clientWidth - 1)
    const px = (freq - this.attr.startFreq) / freqPerPx

    // 每条记录时间差
    const deltaTimePreRecord =
      (this.attr.recentCache.peek().time - this.attr.recentCache.see(this.attr.recentCache.size() - 1).time) /
      (this.attr.recentCache.size() - 1)

    // 每像素时间值 = 记录时间差/ 缩放比例
    const timePerpx = deltaTimePreRecord / (this.chartCanvas.clientHeight / this.attr.recentCache.cap())
    // Y像素= time和最新时间差 / 每像素时间值
    const py = (this.attr.recentCache.peek().time - time) / timePerpx
    return {
      x: Math.round(px),
      y: Math.round(py),
    }
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
    //TODO 重绘标尺3
    this.drawToChart()
  }
  public setViewFreqRange(startFreq: number, endFreq: number) {
    //TODO 重绘标尺
    this.drawToChart()
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
