/* eslint-disable @typescript-eslint/no-unused-vars */
import { WaveFormAttr, WaveFormOptions } from './WaveFormCommon'

class WaveFormGridLayer {
  private options: WaveFormOptions
  private attr: WaveFormAttr
  canvasScorll: HTMLCanvasElement
  ctxScorll: CanvasRenderingContext2D
  minX: number
  maxX: number
  constructor(options: WaveFormOptions, attr: WaveFormAttr) {
    this.options = options
    this.attr = attr
    /** 创建Scorll图层 */
    this.canvasScorll = this.makeCanvas(530)
    this.options.El.appendChild(this.canvasScorll)
    this.ctxScorll = this.canvasScorll.getContext('2d')
    this.minX = this.attr.viewStart
    this.maxX = this.attr.viewEnd
  }
  /** 绘制x轴方向滚动条
   * @param startNumber 当前视图的起点值
   * @param endNumber 当前视图的终点值
   */
  public drawScroll(startNumber: number, endNumber: number) {
    // 当前滚动条的起始位置
    const scrollBoxLeft = ((startNumber - this.minX) / (this.maxX - this.minX)) * this.options.El.clientWidth
    // 当前滚动条的起始位置
    const scrollBoxRight = ((endNumber - this.minX) / (this.maxX - this.minX)) * this.options.El.clientWidth
    this.ctxScorll.beginPath()
    this.ctxScorll.moveTo(scrollBoxLeft, this.options.El.clientHeight - 15)
    this.ctxScorll.lineTo(scrollBoxRight, this.options.El.clientHeight - 15)
    this.ctxScorll.lineTo(scrollBoxRight, this.options.El.clientHeight)
    this.ctxScorll.lineTo(scrollBoxLeft, this.options.El.clientHeight)
    this.ctxScorll.lineTo(scrollBoxLeft, this.options.El.clientHeight - 15)
    this.ctxScorll.fillStyle = '#3CA9C4'
    this.ctxScorll.fill()
  }
  public makeCanvas(zIndex: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.setAttribute('width', this.options.El.clientWidth + 'px')
    canvas.setAttribute('height', this.options.El.clientHeight + 'px')
    canvas.style.cssText = `
      position:absolute;
      top:0;
      left:0;
      z-index:${zIndex};
      `
    return canvas
  }
  /**
   * 清除内容弄
   * @param canvasCtx 待清理的Canvas绘制上下文,如果不传，则清除所有
   */
  public clear(...canvasCtx: CanvasRenderingContext2D[]) {
    if (canvasCtx.length == 0) {
      this.clear(this.ctxScorll)
      return
    }
    canvasCtx.forEach((element) => {
      element.clearRect(0, 0, element.canvas.width, element.canvas.height)
    })
  }
  //
  public setViewRange(_min: number, _max: number) {
    //TODO draw grid
  }
  public setViewStartEnd(_start: number, _end: number) {
    //TODO draw grid
    this.clear(this.ctxScorll)
    this.drawScroll(_start, _end)
  }
  public setSuspend(_isSuspend: boolean) {
    //TODO show state
  }
}
export { WaveFormGridLayer }
