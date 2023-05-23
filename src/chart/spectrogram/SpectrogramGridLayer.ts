import { Marker, SpectrogramOptions } from './SpectrogramCommon'

const shortLen = 15

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
  private canvasAxisX: HTMLCanvasElement
  private canvasAxisY: HTMLCanvasElement
  /** 挂载元素 */
  private parentDom: HTMLElement
  /** 绘制山下文 */
  private ctxGrid: CanvasRenderingContext2D
  private ctxMarker: CanvasRenderingContext2D
  private ctxAxisX: CanvasRenderingContext2D
  private ctxAxisY: CanvasRenderingContext2D

  AXIS_ORIGIN: { x: number; y: number }

  gridCache: { x: number[]; y: number[] }

  constructor(options: SpectrogramOptions) {
    this.parentDom = options.El
    this.gridCache = {
      x: [],
      y: [],
    }

    /** 创建网格图层 */
    this.canvasAxis = this.makeCanvas(500)
    this.parentDom.appendChild(this.canvasAxis)
    this.ctxGrid = this.canvasAxis.getContext('2d')
    this.ctxGrid.strokeStyle = options.color.grid
    /** 创建X轴图层 */
    this.canvasAxisX = this.makeCanvas(520)
    this.parentDom.appendChild(this.canvasAxisX)
    this.ctxAxisX = this.canvasAxisX.getContext('2d')
    this.ctxAxisX.strokeStyle = options.color.axis
    this.ctxAxisX.fillStyle = options.color.label
    this.ctxAxisX.lineWidth = 2
    /** 创建Y轴图层 */
    this.canvasAxisY = this.makeCanvas(520)
    this.parentDom.appendChild(this.canvasAxisY)
    this.ctxAxisY = this.canvasAxisY.getContext('2d')
    this.ctxAxisY.strokeStyle = options.color.axis
    this.ctxAxisY.fillStyle = options.color.label
    this.ctxAxisY.lineWidth = 2
    /** 创建Marker图层 */
    this.canvasMarker = this.makeCanvas(530)
    this.parentDom.appendChild(this.canvasMarker)
    this.ctxMarker = this.canvasMarker.getContext('2d')
    //TODO  设置颜色
    /**清空图层内容 */
    this.clear(this.ctxGrid, this.ctxAxisX, this.ctxAxisY, this.ctxMarker)
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
      this.clear(this.ctxGrid, this.ctxAxisX, this.ctxAxisY, this.ctxMarker)
      return
    }
    canvasCtx.forEach((element) => {
      element.clearRect(0, 0, this.parentDom.clientWidth, this.parentDom.clientHeight)
    })
  }

  draw(xmin: number, xmax: number, ymax: number, ymin: number) {
    this.ctxGrid.strokeStyle = '#18fa36'
    this.ctxGrid.lineWidth = 10
    this.ctxGrid.clearRect(0, 0, this.parentDom.clientWidth, this.parentDom.clientHeight)
    this.ctxGrid.beginPath()
    this.ctxGrid.moveTo(xmax, ymax)
    this.ctxGrid.lineTo(xmax, ymin)
    this.ctxGrid.lineTo(xmin, ymin)
    this.ctxGrid.lineTo(xmin, ymax)
    this.ctxGrid.lineTo(xmax, ymax)
    this.ctxGrid.stroke()
    this.ctxGrid.fill()
  }

  /**
   * 设置图谱显示范围的起止频率范围（HZ）
   * @param startFreq 起点频率
   * @param endFreq 终点频率
   */
  public setFreqRange(startFreq: number, endFreq: number) {
    this.clear(this.ctxAxisX)
    this.startFreqView = startFreq
    this.endFreqView = endFreq
    this.ctxGrid.fillStyle = '#18fa36'
    this.ctxGrid.fillText(`${startFreq}-${endFreq}`, 0, this.canvasAxis.height - 50)
    this.drawXGrid(startFreq, endFreq)
    this.reDrawAxis()
  }
  /**
   * 设置当前显示区域的电平范围
   * @param lowLevel 低点电平 dbm
   * @param highLevel 高点电平 dbm
   */
  public setViewLevel(lowLevel: number, highLevel: number) {
    this.clear(this.ctxAxisY)
    this.lowLevel = lowLevel
    this.highLevel = highLevel
    this.ctxMarker.fillStyle = '#18fa36'
    this.ctxMarker.fillText(`${highLevel}-${lowLevel}`, 0, 100)
    this.drawYGrid(lowLevel, highLevel)
    this.reDrawAxis()
  }
  /** 重绘坐标轴 */
  private reDrawAxis() {
    this.clear(this.ctxGrid)
    this.ctxGrid.beginPath()
    this.ctxGrid.moveTo(this.AXIS_ORIGIN.x, 0)
    this.ctxGrid.lineTo(this.AXIS_ORIGIN.x, this.parentDom.clientHeight - this.AXIS_ORIGIN.y)

    this.ctxGrid.moveTo(0, this.parentDom.clientHeight - this.AXIS_ORIGIN.y)
    this.ctxGrid.lineTo(this.parentDom.clientWidth, this.parentDom.clientHeight - this.AXIS_ORIGIN.y)
    this.ctxGrid.stroke()

    this.gridCache.x.forEach((w) => {
      this.ctxGrid.moveTo(w, this.parentDom.clientHeight - this.AXIS_ORIGIN.y)
      this.ctxGrid.lineTo(w, 0)
    })

    this.gridCache.y.forEach((h) => {
      this.ctxGrid.moveTo(this.AXIS_ORIGIN.x, h)
      this.ctxGrid.lineTo(this.parentDom.clientWidth, h)
    })

    this.ctxGrid.stroke()
  }
  /**
   * 绘制x轴形状
   * @param startXNumber 横向初始点值
   * @param endXNumber 横向终点值
   */
  private drawXGrid(startNumber: number, endNumber: number) {
    /* 每个格子约为100px宽 */
    const oneBoxPx = 100
    /* 可视区域的数值 */
    const differFrequency = endNumber - startNumber
    const viewRect = {
      width: this.parentDom.clientWidth - this.AXIS_ORIGIN.x,
      height: this.parentDom.clientHeight - this.AXIS_ORIGIN.y,
    }
    /* 计算数据密度, 1px = 多少hz */
    const pxKhz = differFrequency / viewRect.width
    /* 可视区域的预计格子数 */
    const gridNumber = viewRect.width / oneBoxPx
    /* 每格对应的频率 */
    const oneGridFrequency = differFrequency / gridNumber
    /* 对取得的频率取整 */
    const integerGridFrequency = oneGridFrequency.toString().split('.')[0]
    /* 对取得的频率取余 */
    const remainderGridFrequency = parseInt(integerGridFrequency) / Math.pow(10, integerGridFrequency.length - 1)
    /* 获取每格之间的间隔量 */
    const gridInterval = (Math.round(remainderGridFrequency * 2) / 2) * Math.pow(10, integerGridFrequency.length - 1)
    /* 计算第一个刻度的数值 */
    const fistNumber = Math.trunc(startNumber / Number(gridInterval)) * Number(gridInterval) + Number(gridInterval)
    /* 计算第一个刻度所在的位置对应的px值 */
    const oneAxisPx = (fistNumber - startNumber) / pxKhz
    /* 设置计数器，计算当前为第几格 */
    let count = 0
    /* 设置每格起点的px值 */
    let offset = fistNumber
    const numberXArr: Array<number> = [startNumber, fistNumber]
    while (offset + gridInterval < endNumber) {
      offset += gridInterval
      numberXArr.push(offset)
      count++
    }
    const xArr: { scaleX: number; scaleText: number }[] = numberXArr.map((item, index) => {
      if (index == 0) {
        return {
          scaleX: 0,
          scaleText: item,
        }
      } else {
        return {
          scaleX: this.AXIS_ORIGIN.x + oneAxisPx + (gridInterval / pxKhz) * (index - 1),
          scaleText: item,
        }
      }
    })
    this.gridCache.x = []
    xArr.forEach((item) => {
      this.ctxAxisX.beginPath()
      this.ctxAxisX.moveTo(item.scaleX, this.parentDom.clientHeight - this.AXIS_ORIGIN.y)
      this.ctxAxisX.lineTo(item.scaleX, this.parentDom.clientHeight - this.AXIS_ORIGIN.y - shortLen)
      this.ctxAxisX.fillText(`${item.scaleText}kHz`, item.scaleX - 20, this.parentDom.clientHeight - shortLen)
      this.ctxAxisX.fill()
      this.ctxAxisX.stroke()
      this.gridCache.x.push(item.scaleX)
    })
  }

  /**
   * 绘制Y轴形状
   * @param startXNumber 横向初始点值
   * @param endXNumber 横向终点值
   */
  private drawYGrid(startNumber: number, endNumber: number) {
    /* 每个格子约为100px宽 */
    const oneBoxPx = 100
    const viewRect = {
      width: this.parentDom.clientWidth - this.AXIS_ORIGIN.x,
      height: this.parentDom.clientHeight - this.AXIS_ORIGIN.y,
    }
    /* 可视区域的数值 */
    const differFrequency = endNumber - startNumber
    /* 计算数据密度, 1px = 多少hz */
    const pxKhz = differFrequency / viewRect.height
    /* 可视区域的预计格子数 */
    const gridNumber = viewRect.height / oneBoxPx
    /* 每格对应的频率 */
    const oneGridFrequency = differFrequency / gridNumber
    /* 对取得的频率取整 */
    const integerGridFrequency = oneGridFrequency.toString().split('.')[0]
    /* 对取得的频率取余 */
    const remainderGridFrequency = parseInt(integerGridFrequency) / Math.pow(10, integerGridFrequency.length - 1)
    /* 获取每格之间的间隔量 */
    const gridInterval = (Math.round(remainderGridFrequency * 2) / 2) * Math.pow(10, integerGridFrequency.length - 1)
    /* 计算第一个刻度的数值 */
    const fistNumber = Math.trunc(startNumber / Number(gridInterval)) * Number(gridInterval) + Number(gridInterval)
    /* 设置计数器，计算当前为第几格 */
    let count = 0
    /* 设置每格起点的px值 */
    let offset = fistNumber
    /* 设置存放每个刻度的数组 */
    const numberXArr: Array<number> = [startNumber, fistNumber]
    while (offset + gridInterval < endNumber) {
      offset += gridInterval
      numberXArr.push(offset)
      count++
    }
    numberXArr.push(endNumber)
    numberXArr.reverse()
    /* 计算第一个刻度所在的位置对应的px值 */
    const oneAxisPx = Math.abs(numberXArr[0] - numberXArr[1]) / pxKhz
    const xArr: { scaleY: number; scaleText: number }[] = numberXArr.map((item, index) => {
      if (index == 0) {
        return {
          scaleY: 0,
          scaleText: item,
        }
      } else {
        return {
          scaleY: +oneAxisPx + (gridInterval / pxKhz) * (index - 1),
          scaleText: item,
        }
      }
    })
    this.gridCache.y = []
    xArr.forEach((item) => {
      this.ctxAxisY.beginPath()
      this.ctxAxisY.moveTo(this.AXIS_ORIGIN.x, item.scaleY)
      this.ctxAxisY.lineTo(15 + this.AXIS_ORIGIN.x, item.scaleY)
      this.ctxAxisY.fillText(`${item.scaleText}dbm`, 15, item.scaleY)
      this.ctxAxisY.stroke()
      this.ctxAxisY.fill()
      this.gridCache.y.push(item.scaleY)
    })
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
