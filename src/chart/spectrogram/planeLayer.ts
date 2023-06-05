import { ColorMap } from '@/tool/ColorMap'
import { makeCanvas } from '../common'
import { FrameData, SpectrogramAttr, SpectrogramOptions } from './SpectrogramCommon'
/** 平面图 */
export class PlaneLayer {
  /** 挂载dom */
  private dom: HTMLElement
  private options: SpectrogramOptions
  private attr: SpectrogramAttr

  /** 缓存图层  */
  private cacheCanvas: HTMLCanvasElement
  private cacheCtx: CanvasRenderingContext2D

  /** 图谱图层  */
  private chartCanvas: HTMLCanvasElement
  private chartCtx: CanvasRenderingContext2D

  /** 网格图层 */
  private gridCanvas: HTMLCanvasElement
  private gridCtx: CanvasRenderingContext2D

  /** 色谱 */
  private color: ColorMap

  constructor(options: SpectrogramOptions, attr: SpectrogramAttr) {
    this.dom = options.El
    this.options = options
    this.attr = attr

    /** 色 */
    this.color = new ColorMap(options.color.front, 200)

    /** 创建内存缓存图层 */
    this.cacheCanvas = this.createCacheCanvas()
    this.cacheCtx = this.cacheCanvas.getContext('2d')
    this.clear(this.cacheCtx)

    /** 创建绘制图层 */
    this.chartCanvas = makeCanvas(500, this.dom.clientHeight, this.dom.clientWidth)
    this.chartCtx = this.chartCanvas.getContext('2d')
    this.clear(this.chartCtx)
    this.dom.appendChild(this.chartCanvas)
    //TODO 2个问题，1个是离线 canvas 的问题，一个是 色谱库 取色问题
  }

  public update(fd: FrameData) {
    this.appendLine(fd)
    this.drawToChart()
  }
  private drawToChart() {
    const sw = this.cacheCanvas.width
    const sh = this.cacheCanvas.height
    const dw = this.chartCanvas.clientWidth
    const dh = this.chartCanvas.clientHeight
    // 缩放绘制图像到
    this.chartCtx.drawImage(this.cacheCanvas, 0, 0, sw, sh, 0, 0, dw, dh)
  }

  private appendLine(fd: FrameData) {
    // 创建宽度为FFT长度的图像，高度为1
    const imageLine = this.cacheCtx.createImageData(fd.data.length, 1)
    // 对每个点位进行颜色赋值
    for (let i = 0; i < imageLine.data.length; i += 4) {
      const value = fd.data[i / 4]
      const colorIndex = this.findColor(value, -180, 10)
      const color = this.color.getColor(colorIndex)
      imageLine.data[i + 0] = color[0]
      imageLine.data[i + 1] = color[1]
      imageLine.data[i + 2] = color[2]
      imageLine.data[i + 3] = color[3]
    }
    // 图形移动1像素
    const oldImg = this.cacheCanvas
    const sw = this.cacheCanvas.width
    const sh = this.cacheCanvas.height
    this.cacheCtx.drawImage(oldImg, 0, 0, sw, sh - 1, 0, 1, sw, sh - 1)

    // 将新的色添加到图像上
    this.cacheCtx.putImageData(imageLine, 0, 0)
  }
  /**
   *  获取色索引
   * @param value 电平
   * @param min 最小值
   * @param max 最大值
   */
  findColor(value: number, min: number, max: number) {
    if (value < min) return 0
    else if (value > max) return max - min
    else {
      return Math.round(value - min)
    }
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
}
