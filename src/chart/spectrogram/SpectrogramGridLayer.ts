import { Marker, SpectrogramOptions } from './SpectrogramCommon'

/**频谱网格图层 */
export class SpectrogramGridLayer {
  /**------------------------图谱属性--------------------------------- */
  /**配置*/
  private options: SpectrogramOptions

  /** 当前视图起点频率 */
  private startFreqView: number
  /** 当前视图终止频率 */
  private endFreqView: number

  /** 当前视图低电平 */
  private lowLevel: number
  /** 当前视图高电平 */
  private highLevel: number

  /**所有marker标点 */
  private markers: Array<Marker>

  /**------------------------图像层元素--------------------------------- */
  /** canvas 元素 */
  private canvasAxis: HTMLCanvasElement
  private canvasMarker: HTMLCanvasElement
  /** 挂载元素 */
  private parentDom: HTMLElement
  /** 绘制山下文 */
  private ctxAxis: CanvasRenderingContext2D
  private ctxMarker: CanvasRenderingContext2D

  AXIS_ORIGIN: { x: number; y: number }

  constructor(options: SpectrogramOptions) {
    this.parentDom = options.El
    /** 创建坐标图层 */
    this.canvasAxis = this.makeCanvas(500)
    this.parentDom.appendChild(this.canvasAxis)
    this.ctxAxis = this.canvasAxis.getContext('2d')
    /** 创建Marker图层 */
    this.canvasMarker = this.makeCanvas(510)
    this.parentDom.appendChild(this.canvasMarker)
    this.ctxMarker = this.canvasAxis.getContext('2d')
    /**清空图层内容 */
    this.clear(this.ctxMarker, this.ctxAxis)
    // 标尺原点，以此为起点
    this.AXIS_ORIGIN = {
      x: options.HORIZONTAL_AXIS_MARGIN,
      y: options.VERTICAL_AXIS_MARGIN,
    }
  }
  /**
   * 清除内容弄
   * @param canvasCtx 待清理的Canvas绘制上下文,如果不传，则清除所有
   */
  clear(...canvasCtx: CanvasRenderingContext2D[]) {
    if (canvasCtx.length == 0) {
      this.clear(this.ctxAxis, this.ctxMarker)
      return
    }
    canvasCtx.forEach((element) => {
      element.clearRect(0, 0, this.parentDom.clientWidth, this.parentDom.clientHeight)
    })
  }

  draw(xmin: number, xmax: number, ymax: number, ymin: number) {
    this.ctxAxis.strokeStyle = '#FFFFFF'
    this.ctxAxis.lineWidth = 10
    this.ctxAxis.clearRect(0, 0, this.parentDom.clientWidth, this.parentDom.clientHeight)
    this.ctxAxis.beginPath()
    this.ctxAxis.moveTo(xmax, ymax)
    this.ctxAxis.lineTo(xmax, ymin)
    this.ctxAxis.lineTo(xmin, ymin)
    this.ctxAxis.lineTo(xmin, ymax)
    this.ctxAxis.lineTo(xmax, ymax)
    this.ctxAxis.stroke()
    this.ctxAxis.fill()
  }

  /**
   * 设置图谱显示范围的起止频率范围（HZ）
   * @param startFreq 起点频率
   * @param endFreq 终点频率
   */
  public setFreqRange(startFreq: number, endFreq: number) {
    this.ctxAxis.clearRect(0, 0, this.parentDom.clientWidth, this.parentDom.clientHeight)
    this.startFreqView = startFreq
    this.endFreqView = endFreq
    this.ctxAxis.fillText(`${startFreq}-${endFreq}`, 0, this.canvasAxis.height - 50)
    // this.reDrawAxis()
  }
  /**
   * 设置当前显示区域的电平范围
   * @param lowLevel 低点电平 dbm
   * @param highLevel 高点电平 dbm
   */
  public setViewLevel(lowLevel: number, highLevel: number) {
    this.ctxMarker.clearRect(0, 0, this.parentDom.clientWidth, this.parentDom.clientHeight)
    this.lowLevel = lowLevel
    this.highLevel = highLevel
    this.ctxMarker.fillText(`${highLevel}-${lowLevel}`, 0, 100)
    // this.reDrawAxis()
  }
  /** 重绘坐标轴 */
  private reDrawAxis() {
    throw new Error('Method not implemented.')
  }

  private makeCanvas(zIndex: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.setAttribute('width', this.parentDom.clientWidth + 'px')
    canvas.setAttribute('height', this.parentDom.clientHeight + 'px')
    canvas.style.cssText = `
      
      opacity: 0.5;
      position:absolute;
      top:0;
      left:0;
      z-index:${zIndex};
      `
    return canvas
  }
}
