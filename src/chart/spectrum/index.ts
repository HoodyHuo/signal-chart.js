import { SpectrogramThreeLayer } from './SpectrumThreeLayer'
import { KeepMode, Marker, MarkerLine, mergeDefaultOption, SpectrogramOptions, SpectrumAttr } from './SpectrumCommon'
import { SpectrogramGridLayer } from './SpectrumGridLayer'
import { Position } from '../common'
import { EventDispatcher } from 'three'
import { EmitEvent, FreqChangeable } from '../ConnectorGroup'
/** 鼠标事件类型 */
enum MouseEnum {
  ScrollY,
  ScrollX,
  ScrollBar,
  SelectRange,
  None,
}

/**频谱网格图层 */
export class Spectrum extends EventDispatcher implements FreqChangeable {
  /**------------------------图谱属性--------------------------------- */
  private dom: HTMLElement

  /**------------------------图谱属性--------------------------------- */
  /**配置*/
  private options: SpectrogramOptions
  /** 显示模式 */
  private keepMode: KeepMode

  private attr: SpectrumAttr

  /** 数据起点频率 */
  private startFreq: number
  /** 数据终止频率 */
  private endFreq: number
  /** 数据起点电平 */
  private minLevel: number
  /** 数据终点电平 */
  private maxLevel: number
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
    super()
    const fullOptions = mergeDefaultOption(options)
    this.options = fullOptions
    this.dom = fullOptions.El
    this.dom.style.position = 'relative'
    this.dom.style.backgroundColor = fullOptions.color.background

    this.attr = {
      markers: new Map<string, Marker>(),
      markerCur: 1,
      data: new Float32Array(),
      markerLines: new Map<string, MarkerLine>(),
    }

    this.threeLayer = new SpectrogramThreeLayer(fullOptions, this.attr)
    this.gridLayer = new SpectrogramGridLayer(fullOptions, this.attr)

    this.registeEvent()
  }

  /**
   * 获取maker，包括电平、频率
   *  (当前时刻的拷贝)
   * @param name marker序号、名称
   * @returns Marker
   */
  public getMarker(name: string): Marker {
    return JSON.parse(JSON.stringify(this.attr.markers.get(name) ?? {}))
  }

  /**
   * 获取所有marker
   * (当前时刻的拷贝)
   * @returns markers
   */
  public getMarkers(): Map<string, Marker> {
    const result = new Map<string, Marker>()
    this.attr.markers.forEach((value, key) => {
      result.set(key, JSON.parse(JSON.stringify(value)))
    })
    return result
  }

  /**
   * 设置marker频率
   * @param markerName marker名称
   * @param freq 频率
   */
  public setMarker(markerName: string, freq: number, level?: number) {
    const marker = this.attr.markers.get(markerName)
    if (!marker) {
      return
    }
    marker.freq = freq
    marker.level = level
    this.gridLayer.reDrawMarkers()
  }

  /**
   *
   * @param freq 频率Hz
   * @param name? 名称
   * @returns marker名称
   */
  public addMarker(marker: number | Marker): string {
    const isFreq = typeof marker == 'number'
    const newMarker: Marker = {
      freq: isFreq ? marker : marker.freq,
      name: !isFreq && marker.name ? marker.name : 'marker' + this.attr.markerCur++,
      level: !isFreq && marker.level ? marker.level : undefined,
    }
    this.attr.markers.set(newMarker.name, newMarker)
    this.gridLayer.reDrawMarkers()
    return newMarker.name
  }

  /**
   * 移除marker,如果没有参数，则移除所有marker
   * @param markerName marker名称
   */
  public removeMarker(...markerName: string[]) {
    if (markerName.length == 0) {
      this.attr.markers.clear()
    } else {
      markerName.forEach((element) => {
        this.attr.markers.delete(element)
      })
    }
    this.gridLayer.reDrawMarkers()
  }

  /** 添加标线 */
  public setMarkerLine(...lines: MarkerLine[]) {
    for (const line of lines) {
      line.color = line.color ?? '#f50505'
      this.attr.markerLines.set(line.name, line)
      this.threeLayer.setMarkerLine(line)
    }
  }

  /** 移除标线 */
  public removeMarkerLine(...lines: MarkerLine[] | string[]) {
    for (const line of lines) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const lineObj = this.attr.markerLines.get(line.name ?? line)
      this.threeLayer.removeMarkerLine(lineObj)
      this.attr.markerLines.delete(lineObj.name)
    }
  }

  /**
   *获取当前图谱截图
   * @returns base64-Url格式图像数据 , ImageData格式图像
   */
  public getImage(): [string, ImageData] {
    const canvas = document.createElement('canvas')
    const width = this.dom.clientWidth
    const height = this.dom.clientHeight
    canvas.height = height //指定画板的高度,自定义
    canvas.width = width //指定画板的宽度，自定义
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = this.options.color.background
    ctx.fillRect(0, 0, width, height) //填充背景色
    ctx.drawImage(this.gridLayer.canvasAxis, 0, 0) //填充网格
    ctx.drawImage(this.gridLayer.canvasAxisX, 0, 0) //填充X轴
    ctx.drawImage(this.gridLayer.canvasAxisY, 0, 0) //填充Y轴
    ctx.drawImage(this.gridLayer.canvasScorll, 0, 0) //填充 滚动条
    //填充 信号线条
    ctx.drawImage(
      this.threeLayer.renderer.domElement,
      this.options.HORIZONTAL_AXIS_MARGIN,
      0,
      width - this.options.HORIZONTAL_AXIS_MARGIN,
      height - this.options.VERTICAL_AXIS_MARGIN,
    )
    //填充 marker
    ctx.drawImage(this.gridLayer.canvasMarker, 0, 0)
    const dataURL = canvas.toDataURL('image/png')
    return [dataURL, ctx.getImageData(0, 0, width, height)]
  }
  /**
   *获取当前图谱截图
   * @returns ImageData格式图像
   */
  public getImageData(): ImageData {
    return this.getImage()[1]
  }
  /**
   *获取当前图谱截图
   * @returns base64-Url格式图像数据
   */
  public getImageURL(): string {
    return this.getImage()[0]
  }

  private registeEvent() {
    let beforeP = {
      x: 0,
      y: 0,
      gridx: 0,
      gridy: 0,
    }
    let MoseType = MouseEnum.None

    // 注册鼠标滚轮缩放
    this.dom.addEventListener('mousewheel', (event: Event) => {
      event.preventDefault()
      const e = event as WheelEvent // 强制类型为 滚动鼠标事件
      //获取当前鼠标数据位置
      const p = {
        x: Math.round(this.getMarkerValue(e.offsetX - this.options.HORIZONTAL_AXIS_MARGIN, e.offsetY).x),
        y: Math.round(this.getMarkerValue(e.offsetX - this.options.HORIZONTAL_AXIS_MARGIN, e.offsetY).y),
      }
      // 判断当前鼠标滚轮促发的位置，如果是在y轴左边，则触发纵轴缩放，如果在y轴右边，则触发横轴缩放
      if (this.isInAxisY(e.offsetX, e.offsetY)) {
        const delta = e.deltaY > 0 ? 1.2 : 0.8 // 获取滚轮量 100 或-100
        this.scaleH(p.y, delta)
      } else if (this.isInAxisX(e.offsetX, e.offsetY) || this.isInCenter(e.offsetX, e.offsetY)) {
        const delta = e.deltaY > 0 ? 1.5 : 0.6
        this.scaleW(p.x, delta)
      }
    })

    this.dom.addEventListener('mousemove', (event: Event) => {
      event.preventDefault()
      const e = event as MouseEvent // 强制类型为 滚动鼠标事件
      if (this.isInCenter(e.offsetX, e.offsetY)) {
        this.mouseFocus(e.offsetX - this.options.HORIZONTAL_AXIS_MARGIN, e.offsetY)
      }
      if (e.buttons > 0) {
        const p = {
          x: Math.round(this.getMarkerValue(e.offsetX - this.options.HORIZONTAL_AXIS_MARGIN, e.offsetY).x),
          y: Math.round(this.getMarkerValue(e.offsetX - this.options.HORIZONTAL_AXIS_MARGIN, e.offsetY).y),
          gridx: e.offsetX,
          gridy: e.offsetY,
        }
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
          case MouseEnum.SelectRange:
            //TODO
            this.gridLayer.drawMarks(beforeP.gridx, beforeP.gridy, p.gridx, p.gridy)
            break
          case MouseEnum.None:
          default:
          //DO nothing
        }
      }
    })
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
          x: Math.round(this.getMarkerValue(e.offsetX - this.options.HORIZONTAL_AXIS_MARGIN, e.offsetY).x),
          y: Math.round(this.getMarkerValue(e.offsetX - this.options.HORIZONTAL_AXIS_MARGIN, e.offsetY).y),
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
              x: Math.round(this.getMarkerValue(e.offsetX - this.options.HORIZONTAL_AXIS_MARGIN, e.offsetY).x),
              y: Math.round(this.getMarkerValue(e.offsetX - this.options.HORIZONTAL_AXIS_MARGIN, e.offsetY).y),
              gridx: e.offsetX,
              gridy: e.offsetY,
            }
            this.gridLayer.drawMarks(beforeP.gridx, beforeP.gridy, p.gridx, p.gridy)
            if (p.x < beforeP.x) {
              this.setViewFreqRange(this.startFreq, this.endFreq)
            }
            this.setViewFreqRange(beforeP.x, p.x)
          }
          break
        default:
          break
      }
      MoseType = MouseEnum.None
    })
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
      offsetX >= this.options.HORIZONTAL_AXIS_MARGIN &&
      offsetY <= this.dom.clientHeight - this.options.VERTICAL_AXIS_MARGIN &&
      offsetX <= this.dom.clientWidth &&
      offsetY >= 0
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
  /* 判断是否促发y轴 */
  private isInAxisY(offsetX: number, offsetY: number): boolean {
    return (
      offsetX < this.options.HORIZONTAL_AXIS_MARGIN &&
      offsetY < this.dom.clientHeight - this.options.VERTICAL_AXIS_MARGIN &&
      offsetX > 0 &&
      offsetY > 0
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

  /**
   * 拖拽横轴上的移动图谱
   * @param eOffsetX 鼠标所在的位置
   * @param eOffsetY 鼠标Y轴所在的位置
   * @param movementX 鼠标移动了多少量
   */
  public getScrollnPosition(eOffsetX: number, movementX: number) {
    const pxKhz = (this.endFreq - this.startFreq) / this.dom.clientWidth
    const rangData = movementX * pxKhz
    this.setViewFreqRange(this.startFreqView + rangData, this.endFreqView + rangData)
  }

  /**
   * 拖拽横坐标轴移动图谱
   * @param movementX 鼠标聚焦频点
   */
  public moveGridX(movementX: number) {
    const pxKhz = (this.endFreqView - this.startFreqView) / this.dom.clientWidth
    const rangData = movementX * pxKhz
    this.setViewFreqRange(this.startFreqView - rangData, this.endFreqView - rangData)
  }
  /**
   * 拖拽纵坐标轴移动图谱
   * @param movementY 鼠标聚焦频点
   */
  public moveGridY(movementY: number) {
    const pxKhz = (this.highLevel - this.lowLevel) / this.dom.clientHeight
    const rangData = movementY * pxKhz
    this.setViewLevelRange(this.lowLevel + rangData, this.highLevel + rangData)
  }
  /**
   * 横向缩放图谱
   * @param freq 鼠标聚焦频点
   * @param delta 缩放比例
   */
  public scaleW(freq: number, delta: number) {
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
   * 纵向缩放图谱
   * @param freq 鼠标聚焦频点
   * @param delta 缩放比例
   */
  public scaleH(freq: number, delta: number) {
    const range = this.getBorderValue() //获取当前显示范围
    const oldLen = range.bottom - range.top //计算当前显示数量
    const newLen = Math.round(oldLen * delta) // 根据缩放比例计算需要显示的新的范围
    const oldPst = (freq - range.top) / oldLen
    const newTop = Math.round(freq - newLen * oldPst)
    const newBottom = newTop + newLen
    this.setViewLevelRange(newBottom, newTop)
  }
  /**
   * 鼠标移动位置
   * @param offsetX 鼠标聚焦频点
   * @param offsetY 缩放比例
   */
  public mouseFocus(offsetX: number, offsetY: number) {
    const markVal = this.getMarkerValue(offsetX, offsetY)
    const freq = markVal.x
    const level = markVal.y
    this.gridLayer.drawMouseCenter(offsetX, offsetY, freq, level)
  }
  /**
   * 设置总图谱数据的起止频率范围（HZ）
   * @param startFreq 起点频率
   * @param endFreq 终点频率
   */
  @EmitEvent
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
  @EmitEvent
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
  @EmitEvent
  public setViewLevelRange(lowLevel: number, highLevel: number) {
    if (lowLevel >= highLevel || lowLevel < this.minLevel || highLevel > this.maxLevel) {
      throw new Error('设置起止电平范围错误')
    }
    this.threeLayer.setViewLevel(lowLevel, highLevel)
    this.gridLayer.setViewLevel(lowLevel, highLevel)
    this.lowLevel = lowLevel
    this.highLevel = highLevel
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
    this.attr.data = data
    this.threeLayer.update(data)
    this.gridLayer.update(data)
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
}
