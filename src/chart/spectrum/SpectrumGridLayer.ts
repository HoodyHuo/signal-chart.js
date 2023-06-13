import { toDisplayFreq } from '../common'
import { Marker, SpectrogramOptions, SpectrumAttr } from './SpectrumCommon'

const shortLen = 15

/**频谱网格图层 */
export class SpectrogramGridLayer {
  /**------------------------图谱属性--------------------------------- */
  /**配置*/
  private options: SpectrogramOptions
  private attr: SpectrumAttr

  /** 当前视图起点频率 */
  private startFreqView: number
  /** 当前视图终止频率 */
  private endFreqView: number

  /** 当前视图低电平 */
  private lowLevel: number
  /** 当前视图高电平 */
  private highLevel: number

  /**------------------------图像层元素--------------------------------- */
  /** canvas 元素 */
  private canvasAxis: HTMLCanvasElement
  private canvasMarker: HTMLCanvasElement
  private canvasScorll: HTMLCanvasElement
  private canvasAxisX: HTMLCanvasElement
  private canvasAxisY: HTMLCanvasElement
  /** 挂载元素 */
  private parentDom: HTMLElement
  /** 绘制山下文 */
  private ctxGrid: CanvasRenderingContext2D
  private ctxMarker: CanvasRenderingContext2D
  private ctxScorll: CanvasRenderingContext2D
  private ctxAxisX: CanvasRenderingContext2D
  private ctxAxisY: CanvasRenderingContext2D
  /** 记录初始最小频率 */
  private minFreq: number
  /** 记录初始最大频率 */
  private maxFreq: number
  /** 记录初始最小电平 */
  private minLevel: number
  /** 记录初始最大电平 */
  private maxLevel: number
  private AXIS_ORIGIN: { x: number; y: number }

  /**------------------------事件控制元素--------------------------------- */
  private isOperatingMarker: boolean
  /**
   * 创建网格缓存数组，用于绘制网格
   * @param gridCache 缓存数组
   * @param x x轴数组
   * @param y y轴数组
   */
  private gridCache: { x: number[]; y: number[] }

  constructor(options: SpectrogramOptions, attr: SpectrumAttr) {
    this.parentDom = options.El
    this.attr = attr
    this.isOperatingMarker = false
    /** 初始化网格绘制数组 */
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
    this.canvasAxisX = this.makeCanvas(501)
    this.parentDom.appendChild(this.canvasAxisX)
    this.ctxAxisX = this.canvasAxisX.getContext('2d')
    this.ctxAxisX.strokeStyle = options.color.axis
    this.ctxAxisX.fillStyle = options.color.label
    this.ctxAxisX.lineWidth = 2
    /** 创建Y轴图层 */
    this.canvasAxisY = this.makeCanvas(502)
    this.parentDom.appendChild(this.canvasAxisY)
    this.ctxAxisY = this.canvasAxisY.getContext('2d')
    this.ctxAxisY.strokeStyle = options.color.axis
    this.ctxAxisY.fillStyle = options.color.label
    this.ctxAxisY.lineWidth = 2
    /** 创建Marker图层 */
    this.canvasMarker = this.makeCanvas(522)
    this.parentDom.appendChild(this.canvasMarker)
    this.ctxMarker = this.canvasMarker.getContext('2d')
    /** 创建Scorll图层 */
    this.canvasScorll = this.makeCanvas(530)
    this.parentDom.appendChild(this.canvasScorll)
    this.ctxScorll = this.canvasScorll.getContext('2d')
    //TODO  设置颜色
    /**清空图层内容 */
    this.clear(this.ctxGrid, this.ctxAxisX, this.ctxAxisY, this.ctxMarker, this.ctxScorll)
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
      this.clear(this.ctxGrid, this.ctxAxisX, this.ctxAxisY, this.ctxMarker, this.ctxScorll)
      return
    }
    canvasCtx.forEach((element) => {
      element.clearRect(0, 0, element.canvas.width, element.canvas.height)
    })
  }

  /**
   * 设置图谱显示范围的起止频率范围（HZ）
   * @param startFreq 起点频率
   * @param endFreq 终点频率
   */
  public setFreqRange(startFreq: number, endFreq: number) {
    // 初始记录最大频谱值和最小频谱值
    if (this.minFreq == undefined) {
      this.minFreq = startFreq
      this.maxFreq = endFreq
    }
    this.clear(this.ctxAxisX, this.ctxMarker, this.ctxScorll)
    this.startFreqView = startFreq
    this.endFreqView = endFreq
    this.drawScroll(startFreq, endFreq)
    this.ctxGrid.fillStyle = '#18fa36'
    this.ctxGrid.fillText(`${toDisplayFreq(startFreq)} - ${toDisplayFreq(startFreq)} `, 0, this.canvasAxis.height - 50)
    this.drawXGrid(startFreq, endFreq)
    this.reDrawAxis()
    this.reDrawMarkers()
  }
  /**
   * 设置当前显示区域的电平范围
   * @param lowLevel 低点电平 dbm
   * @param highLevel 高点电平 dbm
   */
  public setViewLevel(lowLevel: number, highLevel: number) {
    // 初始记录最大频谱值和最小频谱值
    if (this.minLevel == undefined) {
      this.minLevel = lowLevel
      this.maxLevel = highLevel
    }
    this.clear(this.ctxAxisY)
    this.lowLevel = lowLevel
    this.highLevel = highLevel
    this.ctxAxisY.fillStyle = '#18fa36'
    this.ctxAxisY.fillText(`${Math.trunc(highLevel)}-${Math.trunc(lowLevel)}`, 0, 100)
    // this.drawYScroll(lowLevel, highLevel)
    this.drawYGrid(lowLevel, highLevel)
    this.reDrawAxis()
    this.reDrawMarkers()
  }
  /** 重绘坐标轴 */
  private reDrawAxis() {
    this.clear(this.ctxGrid)
    /** 绘制x轴 */
    this.ctxGrid.beginPath()
    this.ctxGrid.moveTo(this.AXIS_ORIGIN.x, 0)
    this.ctxGrid.lineTo(this.AXIS_ORIGIN.x, this.parentDom.clientHeight - this.AXIS_ORIGIN.y)
    /** 绘制y轴 */
    this.ctxGrid.moveTo(0, this.parentDom.clientHeight - this.AXIS_ORIGIN.y)
    this.ctxGrid.lineTo(this.parentDom.clientWidth, this.parentDom.clientHeight - this.AXIS_ORIGIN.y)
    this.ctxGrid.stroke()
    /** 绘制x轴上的竖线 */
    this.gridCache.x.forEach((w) => {
      this.ctxGrid.moveTo(w, this.parentDom.clientHeight - this.AXIS_ORIGIN.y)
      this.ctxGrid.lineTo(w, 0)
    })
    /** 绘制y轴上的竖线 */
    this.gridCache.y.forEach((h) => {
      this.ctxGrid.moveTo(this.AXIS_ORIGIN.x, h)
      this.ctxGrid.lineTo(this.parentDom.clientWidth, h)
    })
    this.ctxGrid.stroke()
  }

  /**
   * 更新频谱时，重绘marker
   * @param data 频谱数据
   */
  public update(data: Float32Array): void {
    this.reDrawMarkers()
  }

  /**
   *  重绘marker
   */
  public reDrawMarkers(): void {
    if (this.isOperatingMarker) {
      return
    }
    this.clear(this.ctxMarker)
    this.attr.markers.forEach((marker, name) => {
      this.drawTriangleMark(marker, this.attr.data)
    })
  }
  /**
   * 计算marker的频点位置，提取level信息，绘制三角marker
   * @param marker maker对象
   * @param data 频谱数据
   */
  private drawTriangleMark(marker: Marker, data: Float32Array): void {
    const freqPercent = (marker.freq - this.minFreq) / (this.maxFreq - this.minFreq)
    const index = Math.round(freqPercent * data.length)
    marker._level = data[index] // 将当前marker电平写入
    const level = marker.level ?? data[index] //如果marker 提供了level，则绘制它
    const XPercent = (marker.freq - this.startFreqView) / (this.endFreqView - this.startFreqView)
    const xPx = this.AXIS_ORIGIN.x + (this.canvasMarker.width - this.AXIS_ORIGIN.x) * XPercent
    const levelPercent = (level - this.lowLevel) / (this.highLevel - this.lowLevel)
    const yPx = (this.canvasMarker.height - this.AXIS_ORIGIN.y) * (1 - levelPercent)
    this.ctxMarker.beginPath()
    this.ctxMarker.fillStyle = '#FFFFFF'
    this.ctxMarker.moveTo(xPx, yPx)
    this.ctxMarker.lineTo(xPx - 5, yPx - 10)
    this.ctxMarker.lineTo(xPx + 5, yPx - 10)
    this.ctxMarker.lineTo(xPx, yPx)
    this.ctxMarker.fill()
    this.ctxMarker.closePath()
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
          scaleX: this.AXIS_ORIGIN.x,
          scaleText: item,
        }
      } else {
        return {
          scaleX: this.AXIS_ORIGIN.x + oneAxisPx + (gridInterval / pxKhz) * (index - 1),
          scaleText: item,
        }
      }
    })
    /* 初始化x轴 */
    this.gridCache.x = []
    xArr.forEach((item) => {
      this.ctxAxisX.beginPath()
      this.ctxAxisX.moveTo(item.scaleX, this.parentDom.clientHeight - this.AXIS_ORIGIN.y)
      this.ctxAxisX.lineTo(item.scaleX, this.parentDom.clientHeight - this.AXIS_ORIGIN.y - shortLen)
      this.ctxAxisX.fillText(
        `${toDisplayFreq(item.scaleText)}`,
        item.scaleX - 20,
        this.parentDom.clientHeight - shortLen * 2,
      )
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
    const yArr: { scaleY: number; scaleText: number }[] = numberXArr.map((item, index) => {
      if (index == 0) {
        return {
          scaleY: 0,
          scaleText: item,
        }
      } else {
        return {
          scaleY: oneAxisPx + (gridInterval / pxKhz) * (index - 1),
          scaleText: item,
        }
      }
    })
    // 初始化存放y轴的缓存数据
    this.gridCache.y = []
    yArr.forEach((item) => {
      this.ctxAxisY.beginPath()
      this.ctxAxisY.moveTo(this.AXIS_ORIGIN.x, item.scaleY)
      this.ctxAxisY.lineTo(15 + this.AXIS_ORIGIN.x, item.scaleY)
      this.ctxAxisY.fillText(`${Math.trunc(item.scaleText)}`, shortLen * 2 - 5, item.scaleY + 5)
      this.ctxAxisY.stroke()
      this.ctxAxisY.fill()
      this.gridCache.y.push(item.scaleY)
    })
  }
  /** 绘制x轴方向滚动条
   * @param startNumber 当前视图的起点值
   * @param endNumber 当前视图的终点值
   */
  private drawScroll(startNumber: number, endNumber: number) {
    // 当前滚动条的起始位置
    const scrollBoxLeft = ((startNumber - this.minFreq) / (this.maxFreq - this.minFreq)) * this.parentDom.clientWidth
    // 当前滚动条的起始位置
    const scrollBoxRight = ((endNumber - this.minFreq) / (this.maxFreq - this.minFreq)) * this.parentDom.clientWidth
    /* 绘制滚动条显示总长 */
    this.ctxAxisX.beginPath()
    this.ctxAxisX.moveTo(0, this.parentDom.clientHeight - shortLen)
    this.ctxAxisX.lineTo(this.parentDom.clientWidth, this.parentDom.clientHeight - shortLen)
    this.ctxAxisX.lineTo(this.parentDom.clientWidth, this.parentDom.clientHeight)
    this.ctxAxisX.lineTo(0, this.parentDom.clientHeight)
    this.ctxAxisX.lineTo(0, this.parentDom.clientHeight - shortLen)
    this.ctxAxisX.stroke()
    this.ctxAxisX.fill()
    /* 绘制当前视图的滚动条占全部滚动条的比例 */
    this.ctxScorll.beginPath()
    this.ctxScorll.moveTo(scrollBoxLeft, this.parentDom.clientHeight - shortLen)
    this.ctxScorll.lineTo(scrollBoxRight, this.parentDom.clientHeight - shortLen)
    this.ctxScorll.lineTo(scrollBoxRight, this.parentDom.clientHeight)
    this.ctxScorll.lineTo(scrollBoxLeft, this.parentDom.clientHeight)
    this.ctxScorll.lineTo(scrollBoxLeft, this.parentDom.clientHeight - shortLen)
    this.ctxScorll.fillStyle = '#3CA9C4'
    this.ctxScorll.fill()
  }

  /** 绘制marke层
   * @param startX 起点的x值
   * @param startY 终点的y值
   * @param endX 起点的x值
   * @param endY 终点的Y值
   */
  public drawMarks(startX: number, startY: number, endX: number, endY: number) {
    this.clear(this.ctxScorll)
    this.ctxScorll.beginPath()
    this.ctxScorll.moveTo(startX, startY)
    this.ctxScorll.lineTo(startX, endY)
    this.ctxScorll.lineTo(endX, endY)
    this.ctxScorll.lineTo(endX, startY)
    this.ctxScorll.fill()
    this.ctxScorll.stroke()
  }

  // /** 绘制Y轴方向滚动条
  //  * @param startNumber 当前视图的起点值
  //  * @param endNumber 当前视图的终点值
  //  */
  // private drawYScroll(startNumber: number, endNumber: number) {
  //   console.log(startNumber, endNumber)
  //   // 当前滚动条的起始位置
  //   const scrollBoxtop = (endNumber / (this.maxLevel - this.minLevel)) * this.parentDom.clientHeight
  //   // 当前滚动条的起始位置
  //   const scrollBoxbottom = (startNumber / (this.maxLevel - this.minLevel)) * this.parentDom.clientHeight
  //   /* 绘制滚动条显示总长 */
  //   this.ctxAxisY.beginPath()
  //   this.ctxAxisY.moveTo(0, 0)
  //   this.ctxAxisY.lineTo(shortLen, 0)
  //   this.ctxAxisY.lineTo(shortLen, this.parentDom.clientHeight)
  //   this.ctxAxisY.lineTo(0, this.parentDom.clientHeight)
  //   this.ctxAxisY.lineTo(0, 0)
  //   this.ctxAxisY.stroke()
  //   this.ctxAxisY.fill()
  //   /* 绘制当前视图的滚动条占全部滚动条的比例 */
  //   this.ctxMarker.beginPath()
  //   this.ctxMarker.moveTo(0, scrollBoxtop)
  //   this.ctxMarker.lineTo(shortLen, scrollBoxtop)
  //   this.ctxMarker.lineTo(shortLen, scrollBoxbottom)
  //   this.ctxMarker.lineTo(0, scrollBoxbottom)
  //   this.ctxMarker.lineTo(0, scrollBoxtop)
  //   this.ctxMarker.fillStyle = '#3CA9C4'
  //   this.ctxMarker.fill()
  // }

  private makeCanvas(zIndex: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.setAttribute('width', this.parentDom.clientWidth + 'px')
    canvas.setAttribute('height', this.parentDom.clientHeight + 'px')
    canvas.style.cssText = `
      position:absolute;
      top:0;
      left:0;
      z-index:${zIndex};
      `
    return canvas
  }
}
