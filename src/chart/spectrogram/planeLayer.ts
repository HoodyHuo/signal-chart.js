import { MatrixCanvas } from '../../tool/MatrixCanvas'
import { makeCanvas, toDisplayFreq } from '../common'
import { ISpectrogram } from './ISpectrogram'
import { FrameData, SpectrogramAttr, SpectrogramOptions } from './SpectrogramCommon'
/** 平面图 */
const shortLen = 15
/** 鼠标事件类型 */
enum MouseEnum {
  ScrollY,
  ScrollX,
  ScrollBar,
  SelectRange,
  None,
}
export class PlaneLayer implements ISpectrogram {
  // --------------------------------------- 基础属性-------------------------
  /** 挂载dom */
  private dom: HTMLElement
  /** 构造配置 */
  private options: SpectrogramOptions
  /** 共享属性 */
  private attr: SpectrogramAttr
  /**
   * 创建网格缓存数组，用于绘制网格
   * @param gridCache 缓存数组
   * @param x x轴数组
   * @param y y轴数组
   */
  private gridCache: { x: number[]; y: number[] }
  // --------------------------------------- Canvas 图层-------------------------

  /** 缓存图层，以点数为宽，缓存数为高，的原始尺寸语图 ，最新数据在上方 */
  private cache: MatrixCanvas
  private cacheImage: ImageData

  /** 图谱图层 ，挂载在页面，通过缩放计算缓存图层进行展示 */
  private chartCanvas: HTMLCanvasElement
  private chartCtx: CanvasRenderingContext2D

  /** 网格图层 */
  private gridCanvas: HTMLCanvasElement
  private gridCtx: CanvasRenderingContext2D

  /** 时间图层 */
  private timeCanvas: HTMLCanvasElement
  private timeCtx: CanvasRenderingContext2D

  /** 滚动条图层 */
  private canvasScorll: HTMLCanvasElement
  private ctxScorll: CanvasRenderingContext2D

  /** 滚动条绘制图层 */
  private canvasXscr: HTMLCanvasElement
  private ctxXscr: CanvasRenderingContext2D

  /** 滚动条绘制图层 */
  private canvasMouse: HTMLCanvasElement
  private ctxMouse: CanvasRenderingContext2D
  private timeCacheCanvas: HTMLCanvasElement
  private timeCacheCtx: CanvasRenderingContext2D
  private remainder: number
  private counterNumber: number
  constructor(options: SpectrogramOptions, attr: SpectrogramAttr) {
    /** 从父层共享属性 */
    this.dom = options.El
    this.options = options
    this.attr = attr
    /* 设置余数 */
    this.remainder = 0
    /** 初始化网格绘制数组 */
    this.gridCache = {
      x: [],
      y: [],
    }
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

    /** 创建内存缓存图层 */
    this.cache = new MatrixCanvas(this.options.cacheCount, this.options.fftLen)

    /** 创建网格图层 */
    this.gridCanvas = makeCanvas(510, this.dom.clientHeight, this.dom.clientWidth)
    this.gridCtx = this.gridCanvas.getContext('2d')
    this.gridCtx.strokeStyle = options.color.axis
    this.gridCtx.fillStyle = options.color.label
    this.clear(this.gridCtx)
    this.dom.appendChild(this.gridCanvas)

    /** 创建时间图层 */
    this.timeCanvas = makeCanvas(510, this.dom.clientHeight, this.dom.clientWidth)
    this.timeCtx = this.timeCanvas.getContext('2d')
    this.timeCtx.strokeStyle = options.color.axis
    this.timeCtx.fillStyle = options.color.label
    this.counterNumber = 0
    this.clear(this.timeCtx)
    this.dom.appendChild(this.timeCanvas)
    /** 创建时间图层的COPY 层 */
    this.timeCacheCanvas = makeCanvas(0, this.dom.clientHeight, this.dom.clientWidth)
    this.timeCacheCtx = this.timeCacheCanvas.getContext('2d')
    this.timeCacheCtx.strokeStyle = options.color.axis
    this.timeCacheCtx.fillStyle = options.color.label
    this.clear(this.timeCacheCtx)
    // this.timeCacheCanvas.style.left = '700px'
    this.dom.appendChild(this.timeCacheCanvas)

    this.timeCacheCanvas = makeCanvas(0, this.dom.clientHeight, this.dom.clientWidth)
    this.timeCacheCtx = this.timeCacheCanvas.getContext('2d')
    this.timeCacheCtx.strokeStyle = options.color.axis
    this.timeCacheCtx.fillStyle = options.color.label
    this.clear(this.timeCacheCtx)
    // this.timeCacheCanvas.style.left = '700px'
    this.dom.appendChild(this.timeCacheCanvas)

    /** 创建Scorll图层 */
    this.canvasScorll = makeCanvas(530, this.dom.clientHeight, this.dom.clientWidth)
    this.dom.appendChild(this.canvasScorll)
    this.ctxScorll = this.canvasScorll.getContext('2d')

    /** 创建Scorll绘制图层 */
    this.canvasXscr = makeCanvas(531, this.dom.clientHeight, this.dom.clientWidth)
    this.dom.appendChild(this.canvasXscr)
    this.ctxXscr = this.canvasXscr.getContext('2d')

    this.cacheImage = this.chartCtx.createImageData(this.options.fftLen, 1)
    /** 注册事件 */
    this.regevent()
  }
  private regevent(): void {
    let beforeP = {
      x: 0,
      y: 0,
      gridx: 0,
      gridy: 0,
    }
    let MoseType = MouseEnum.None
    this.dom.addEventListener('mousemove', (e: MouseEvent) => {
      e.preventDefault()
      const v = this.translateToWorld(e.offsetX, e.offsetY)
      // this.drawText(v.freq, v.level, v.time)
      // console.log(this.translateToScreen(v.freq, v.time))
      if (e.buttons > 0) {
        switch (MoseType) {
          case MouseEnum.ScrollX:
            this.moveGridX(e.movementX)
            break
          case MouseEnum.ScrollY:
            this.moveGridY(e.movementY)
            break
          case MouseEnum.ScrollBar:
            this.getScrollnPosition(e.offsetX, e.movementX)
            break
          // case MouseEnum.SelectRange:
          //   //TODO
          //   this.gridLayer.drawMarks(beforeP.gridx, beforeP.gridy, p.gridx, p.gridy)
          //   break
          case MouseEnum.None:
          default:
          //DO nothing
        }
      }
    })

    /* 注册鼠标按下事件 */
    this.dom.addEventListener('mousedown', (event: Event) => {
      event.preventDefault()
      const e = event as MouseEvent
      //获取当前鼠标数据位置

      if (this.isInAxisX(e.offsetX, e.offsetY)) {
        MoseType = MouseEnum.ScrollX
      } else if (this.isInAxisY(e.offsetX, e.offsetY)) {
        MoseType = MouseEnum.ScrollY
      } else if (this.isInPosBar(e.offsetX, e.offsetY)) {
        MoseType = MouseEnum.ScrollBar
      } else if (this.isInCenter(e.offsetX, e.offsetY)) {
        MoseType = MouseEnum.SelectRange
        beforeP = {
          x: Math.round(this.translateToWorld(e.offsetX, e.offsetY).freq),
          y: Math.round(this.translateToWorld(e.offsetX, e.offsetY).level),
          gridx: e.offsetX,
          gridy: e.offsetY,
        }
      }
    })

    this.dom.addEventListener('mouseup', (event: Event) => {
      event.preventDefault()
      const e = event as MouseEvent
      switch (MoseType) {
        case MouseEnum.SelectRange:
          if (this.isInCenter(e.offsetX, e.offsetY)) {
            //获取当前鼠标数据位置
            const p = {
              x: Math.round(this.translateToWorld(e.offsetX, e.offsetY).freq),
              y: Math.round(this.translateToWorld(e.offsetX, e.offsetY).level),
              gridx: e.offsetX,
              gridy: e.offsetY,
            }
            // this.gridLayer.drawMarks(beforeP.gridx, beforeP.gridy, p.gridx, p.gridy)
            if (p.x < beforeP.x) {
              this.setViewFreqRange(this.attr.startFreq, this.attr.endFreq)
            } else {
              this.setViewFreqRange(beforeP.x, p.x)
            }
          }
          break
        default:
          break
      }
      MoseType = MouseEnum.None
    })

    // 注册鼠标滚轮缩放
    this.dom.addEventListener('mousewheel', (event: Event) => {
      event.preventDefault()
      const e = event as WheelEvent // 强制类型为 滚动鼠标事件
      //获取当前鼠标数据位置
      const p = {
        x: Math.round(this.translateToWorld(e.offsetX, e.offsetY).freq),
        y: Math.round(this.translateToWorld(e.offsetX, e.offsetY).level),
      }
      // 判断当前鼠标滚轮促发的位置，如果是在y轴左边，则触发纵轴缩放，如果在y轴右边，则触发横轴缩放
      if (this.isInAxisX(e.offsetX, e.offsetY) || this.isInCenter(e.offsetX, e.offsetY)) {
        const delta = e.deltaY > 0 ? 1.5 : 0.6
        this.scaleW(p.x, delta)
      }
      // if (this.isInAxisY(e.offsetX, e.offsetY)) {
      //   const delta = e.deltaY > 0 ? 1.2 : 0.8 // 获取滚轮量 100 或-100
      //   this.scaleH(p.y, delta)
      // } else if (this.isInAxisX(e.offsetX, e.offsetY) || this.isInCenter(e.offsetX, e.offsetY)) {
      //   const delta = e.deltaY > 0 ? 1.5 : 0.6
      //   this.scaleW(p.x, delta)
      // }
    })
  }

  /**
   * 横向缩放图谱
   * @param freq 鼠标聚焦频点
   * @param delta 缩放比例
   */
  public scaleW(freq: number, delta: number) {
    // const range = this.translateToScreen(freq, delta) //获取当前显示范围
    const oldLen = this.attr.endFreqView - this.attr.startFreqView //计算当前显示数量
    const newLen = Math.round(oldLen * delta)
    const oldPst = (freq - this.attr.startFreqView) / oldLen
    const newLeft = Math.round(freq - newLen * oldPst)
    const newRight = newLeft + newLen
    this.setViewFreqRange(
      newLeft < this.attr.startFreq ? this.attr.startFreq : newLeft,
      newRight > this.attr.endFreq ? this.attr.endFreq : newRight,
    )
  }

  /**
   *  TODO 加上4格边界
   * @param offsetX
   * @param offsetY
   * @returns
   */
  /* 判断是否处于中心 */
  private isInCenter(offsetX: number, offsetY: number): boolean {
    return (
      offsetX > this.options.VERTICAL_AXIS_MARGIN &&
      offsetY < this.dom.clientHeight - this.options.HORIZONTAL_AXIS_MARGIN &&
      offsetX < this.dom.clientWidth &&
      offsetY > 0
    )
  }
  /* 判断促发最下方的滚动条 */
  private isInPosBar(offsetX: number, offsetY: number): boolean {
    return (
      offsetY > this.dom.clientHeight - 15 &&
      offsetY < this.dom.clientHeight &&
      offsetX > 0 &&
      offsetX < this.dom.clientWidth
    )
  }
  /* 判断是否促发x轴 */
  private isInAxisX(offsetX: number, offsetY: number): boolean {
    return (
      offsetY > this.dom.clientHeight - this.options.VERTICAL_AXIS_MARGIN &&
      offsetY < this.dom.clientHeight - 15 &&
      offsetX > this.options.HORIZONTAL_AXIS_MARGIN &&
      offsetX < this.dom.clientWidth
    )
  }

  /* 判断是否促发y轴 */
  private isInAxisY(offsetX: number, offsetY: number): boolean {
    return (
      offsetX < this.options.HORIZONTAL_AXIS_MARGIN &&
      offsetY < this.dom.clientHeight - this.options.VERTICAL_AXIS_MARGIN &&
      offsetX > 0 &&
      offsetY > 0
    )
  }

  /**
   * 增加数据行
   * @param fd 语图帧数据
   */
  public update(fd: FrameData) {
    // 图形处理
    this.appendLine(fd)
    this.drawToChart()
    this.drawTimeGrid(fd)
  }

  private drawTimeGrid(fd: FrameData) {
    /* 获取每移动多少画一个时间 */
    const move = (this.dom.clientHeight - this.options.VERTICAL_AXIS_MARGIN) / this.options.cacheCount
    const now = move + this.remainder
    const stagNumber = Math.floor(now)
    this.remainder = now - stagNumber
    const oneBoxHeight = 100
    const oneBoxNumber = this.dom.clientHeight / oneBoxHeight
    /* 每格多少条数据 */
    const count = this.options.cacheCount / Math.floor(oneBoxNumber)
    this.clear(this.timeCacheCtx)
    this.timeCacheCtx.drawImage(
      this.timeCanvas,
      0,
      0,
      this.dom.clientWidth,
      this.dom.clientHeight - stagNumber - this.options.VERTICAL_AXIS_MARGIN,
      0,
      stagNumber,
      this.dom.clientWidth,
      this.dom.clientHeight - stagNumber - this.options.VERTICAL_AXIS_MARGIN,
    )
    /* 计数器小于我们计算出的那个间隔数  */
    if (this.counterNumber % count == 0) {
      this.counterNumber = 0
      const yPotion = 0
      this.timeCacheCtx.beginPath()
      this.timeCacheCtx.moveTo(this.options.HORIZONTAL_AXIS_MARGIN, yPotion)
      this.timeCacheCtx.lineTo(15 + this.options.HORIZONTAL_AXIS_MARGIN, yPotion)
      this.timeCacheCtx.fillText(this.convertTime(fd.time), this.options.HORIZONTAL_AXIS_MARGIN, yPotion + 12)
      this.timeCacheCtx.stroke()
      this.timeCacheCtx.fill()
    }
    this.counterNumber++
    this.clear(this.timeCtx)
    this.timeCtx.drawImage(this.timeCacheCanvas, 0, 0)
  }
  private convertTime(date: number) {
    const time = new Date(date).toTimeString()
    const index = time.indexOf(' ')
    const result = time.substring(0, index)
    return result
  }
  /** 重绘坐标轴 */
  private reDrawAxis() {
    this.clear(this.gridCtx)
    /** 绘制x轴 */
    this.gridCtx.beginPath()
    this.gridCtx.moveTo(this.options.HORIZONTAL_AXIS_MARGIN, this.dom.clientHeight - this.options.VERTICAL_AXIS_MARGIN)
    this.gridCtx.lineTo(this.dom.clientWidth, this.dom.clientHeight - this.options.VERTICAL_AXIS_MARGIN)
    this.gridCtx.fill()
    this.gridCtx.stroke()
  }
  /**
   * 绘制x轴形状
   * @param startXNumber 横向初始点值
   * @param endXNumber 横向终点值
   */
  private drawXGrid(startNumber: number, endNumber: number) {
    /* 每个格子约为100px宽 */
    const oneBoxPx = 100

    const lableTextWidth = 50
    /* 可视区域的数值 */
    const differFrequency = endNumber - startNumber
    const viewRect = {
      width: this.dom.clientWidth - this.options.HORIZONTAL_AXIS_MARGIN,
      height: this.dom.clientHeight - this.options.VERTICAL_AXIS_MARGIN,
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
    /* 设置每格起点的px值 */
    let offset = fistNumber
    const numberXArr: Array<number> = [fistNumber]
    while (offset + gridInterval < endNumber) {
      offset += gridInterval
      numberXArr.push(offset)
    }
    const xArr: { scaleX: number; scaleText: number }[] = numberXArr.map((item, index) => {
      return {
        scaleX: this.options.HORIZONTAL_AXIS_MARGIN + oneAxisPx + (gridInterval / pxKhz) * index,
        scaleText: item,
      }
    })
    /* 初始化x轴 */
    this.gridCache.x = []
    xArr.forEach((item) => {
      this.gridCtx.beginPath()
      this.gridCtx.moveTo(item.scaleX, this.dom.clientHeight - this.options.VERTICAL_AXIS_MARGIN)
      this.gridCtx.lineTo(item.scaleX, this.dom.clientHeight - this.options.VERTICAL_AXIS_MARGIN - shortLen)
      this.gridCtx.fillText(
        `${toDisplayFreq(item.scaleText)}`,
        item.scaleX - lableTextWidth / 2,
        this.dom.clientHeight - shortLen * 2,
      )
      this.gridCtx.fill()
      this.gridCache.x.push(item.scaleX)
    })
  }

  /** 绘制x轴方向滚动条
   * @param startNumber 当前视图的起点值
   * @param endNumber 当前视图的终点值
   */
  private drawScroll(startNumber: number, endNumber: number) {
    // 当前滚动条的起始位置
    const scrollBoxLeft =
      ((startNumber - this.attr.startFreq) / (this.attr.endFreq - this.attr.startFreq)) * this.dom.clientWidth
    // 当前滚动条的起始位置
    const scrollBoxRight =
      ((endNumber - this.attr.startFreq) / (this.attr.endFreq - this.attr.startFreq)) * this.dom.clientWidth
    /* 绘制滚动条显示总长 */
    this.ctxScorll.beginPath()
    this.ctxScorll.moveTo(0, this.dom.clientHeight - shortLen)
    this.ctxScorll.lineTo(this.dom.clientWidth, this.dom.clientHeight - shortLen)
    this.ctxScorll.lineTo(this.dom.clientWidth, this.dom.clientHeight)
    this.ctxScorll.lineTo(0, this.dom.clientHeight)
    this.ctxScorll.lineTo(0, this.dom.clientHeight - shortLen)
    this.ctxScorll.stroke()
    this.ctxScorll.fill()
    /* 绘制当前视图的滚动条占全部滚动条的比例 */
    this.ctxXscr.beginPath()
    this.ctxXscr.moveTo(scrollBoxLeft, this.dom.clientHeight - shortLen)
    this.ctxXscr.lineTo(scrollBoxRight, this.dom.clientHeight - shortLen)
    this.ctxXscr.lineTo(scrollBoxRight, this.dom.clientHeight)
    this.ctxXscr.lineTo(scrollBoxLeft, this.dom.clientHeight)
    this.ctxXscr.lineTo(scrollBoxLeft, this.dom.clientHeight - shortLen)
    this.ctxXscr.fillStyle = '#3CA9C4'
    this.ctxXscr.fill()
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
      level: this.attr.recentCache.see(indexTime)?.data[indexFreq],
      time: this.attr.recentCache.see(indexTime)?.time,
    }
  }

  public drawText(freq: number, level: number, time: number) {
    this.clear(this.ctxMouse)
    this.ctxMouse.beginPath()
    this.ctxMouse.moveTo(this.dom.clientWidth - 100, 0)
    this.ctxMouse.lineTo(this.dom.clientWidth, 0)
    this.ctxMouse.lineTo(this.dom.clientWidth, 100)
    this.ctxMouse.lineTo(this.dom.clientWidth - 100, 100)
    this.ctxMouse.fillText(
      `
       频率：${toDisplayFreq(freq)}
       电平：${level}dBm
       时间：${time}
    `,
      this.dom.clientWidth - 80,
      10,
    )
    this.ctxMouse.fill()
  }

  /**
   * 拖拽横坐标轴移动图谱
   * @param movementX 鼠标聚焦频点
   */
  public moveGridX(movementX: number) {
    const pxKhz = (this.attr.endFreqView - this.attr.startFreqView) / this.dom.clientWidth
    const rangData = movementX * pxKhz
    this.setViewFreqRange(this.attr.startFreqView - rangData, this.attr.endFreqView - rangData)
  }
  /**
   * 拖拽横轴上的移动图谱
   * @param eOffsetX 鼠标所在的位置
   * @param eOffsetY 鼠标Y轴所在的位置
   * @param movementX 鼠标移动了多少量
   */
  public getScrollnPosition(eOffsetX: number, movementX: number) {
    const pxKhz = (this.attr.endFreq - this.attr.startFreq) / this.dom.clientWidth
    const rangData = movementX * pxKhz
    this.setViewFreqRange(this.attr.startFreqView + rangData, this.attr.endFreqView + rangData)
  }

  /**
   * 拖拽纵坐标轴移动图谱
   * @param movementY 鼠标聚焦频点
   */
  public moveGridY(movementY: number) {
    const pxKhz = (this.attr.highLevel - this.attr.lowLevel) / this.dom.clientHeight
    const rangData = movementY * pxKhz
    this.setViewLevelRange(this.attr.lowLevel + rangData, this.attr.highLevel + rangData)
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
    // const sh = this.cacheCanvas.height
    const sh = this.cache.height
    const 频率起点百分比 = (this.attr.startFreqView - this.attr.startFreq) / (this.attr.endFreq - this.attr.startFreq)
    const 频率终点百分比 = (this.attr.endFreqView - this.attr.startFreq) / (this.attr.endFreq - this.attr.startFreq)
    const 内存图起点X = 频率起点百分比 * this.options.fftLen
    const 内存终点X = 频率终点百分比 * this.options.fftLen
    const 显示宽度 = 内存终点X - 内存图起点X
    //绘制到显示图层
    this.cache.drawImageTo(this.chartCtx, 内存图起点X, 0, 显示宽度, sh)
  }

  /**
   * 将最新帧，绘制到缓存画布
   * @param fd 帧数据
   */
  private appendLine(fd: FrameData) {
    // 图形向下移动1像素
    this.cache.moveDown(1)
    // 创建宽度为FFT长度的图像，高度为1
    const imageLine = this.cacheImage
    const color = this.attr.color.getColorImage().data
    const imageData = imageLine.data
    // 对每个点位进行颜色赋值
    for (let i = 0; i < imageLine.data.length; i += 4) {
      const value = fd.data[i / 4]
      const colorIndex = this.findColor(value)
      imageData[i + 0] = color[colorIndex + 0]
      imageData[i + 1] = color[colorIndex + 1]
      imageData[i + 2] = color[colorIndex + 2]
      imageData[i + 3] = color[colorIndex + 3]
    }
    // 将新的色添加到图像上
    this.cache.putImageData(imageLine)
  }
  /**
   *  获取色值
   * @param value 电平
   * @param min 最小值
   * @param max 最大值
   */
  findColor(value: number): number {
    const low = this.attr.lowLevel
    const hi = this.attr.highLevel
    let v = value
    v = value < low ? low : value
    v = v > hi ? hi : v
    v = Math.floor(v - low)
    const color = this.attr.color.getColor(v)
    return color
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
    this.setViewFreqRange(startFreq, endFreq)
  }
  public setViewFreqRange(startFreq: number, endFreq: number) {
    if (startFreq < this.attr.startFreq || endFreq > this.attr.endFreq || endFreq <= startFreq) {
      throw new Error('设置起止频率范围错误')
    }
    //TODO 重绘标尺
    this.drawToChart()
    this.reDrawAxis()
    this.attr.startFreqView = startFreq
    this.attr.endFreqView = endFreq
    this.clear(this.ctxXscr, this.ctxScorll)
    this.drawXGrid(startFreq, endFreq)
    this.drawScroll(startFreq, endFreq)
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
