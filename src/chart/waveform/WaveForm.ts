import { mergeDefaultOption, WaveFormAttr, WaveFormOptions } from './WaveFormCommon'
import { WaveFormGridLayer } from './WaveFormGridLayer'
import { WaveFormThreeLayer } from './WaveFormThreeLayer'
import Stats from '../../tool/stats/stats'
import { Position } from '../common'
/** 鼠标事件类型 */
enum MouseEnum {
  ScrollY,
  ScrollX,
  ScrollBar,
  SelectRange,
  None,
}
/**
 * 波形图、时域图对象
 */
class WaveForm {
  /** 配置信息 */
  options: WaveFormOptions
  /** 属性信息 */
  attr: WaveFormAttr
  // 图层
  /** 网格图层 */
  gridLayer: WaveFormGridLayer
  /** 线条图层 */
  threeLayer: WaveFormThreeLayer
  /** 性能监视器 */
  stats: Stats

  constructor(options: WaveFormOptions) {
    this.options = mergeDefaultOption(options)
    this.options.El.style.position = 'relative'
    this.options.El.style.backgroundColor = this.options.color.background
    this.attr = {
      cacheData: new Float32Array(this.options.cache),
      viewRangeMax: this.options.rangeMax,
      viewRangeMin: this.options.rangeMin,
      viewStart: 0,
      viewEnd: this.options.cache,
      isSuspend: false,
    }
    this.stats = new Stats()
    this.setStats(this.options.Performance)
    this.gridLayer = new WaveFormGridLayer(this.options, this.attr)
    this.threeLayer = new WaveFormThreeLayer(this.options, this.attr)
    this.registEvent()
    this.setViewRange(this.options.rangeMin, this.options.rangeMax)
    this.setViewStartEnd(0, this.options.cache)
  }
  /**
   * 绑定交互事件
   */
  private registEvent(): void {
    // console.error(new Error('Method not implemented.'))
    // 注册鼠标滚轮缩放
    this.options.El.addEventListener('mousewheel', (event: Event) => {
      event.preventDefault()
      const e = event as WheelEvent // 强制类型为 滚动鼠标事件
      //获取当前鼠标数据位置
      const p = {
        x: Math.round(this.getMarkerValue(e.offsetX, e.offsetY).x),
        y: Math.round(this.getMarkerValue(e.offsetX, e.offsetY).y),
      }
      const delta = e.deltaY > 0 ? 1.5 : 0.6 // 获取滚轮量 100 或-100
      this.scaleW(p.x, delta)
    })
    let MoseType = MouseEnum.None
    this.options.El.addEventListener('mousemove', (event: Event) => {
      event.preventDefault()
      const e = event as MouseEvent // 强制类型为 滚动鼠标事件
      const p = {
        x: Math.round(this.getMarkerValue(e.offsetX, e.offsetY).x),
        y: Math.round(this.getMarkerValue(e.offsetX, e.offsetY).y),
        gridx: e.offsetX,
        gridy: e.offsetY,
      }
      if (e.buttons > 0) {
        console.log(MoseType)
        switch (MoseType) {
          case MouseEnum.ScrollBar:
            this.getScrollnPosition(e.offsetX, e.movementX)
            break
          case MouseEnum.None:
          default:
          //DO nothing
        }
      }
    })
    this.options.El.addEventListener('mousedown', (event: Event) => {
      event.preventDefault()
      const e = event as MouseEvent
      //获取当前鼠标数据位置
      if (this.isInPosBar(e.offsetX, e.offsetY)) {
        MoseType = MouseEnum.ScrollBar
      }
    })
    this.options.El.addEventListener('mouseup', (event: Event) => {
      event.preventDefault()
      const e = event as MouseEvent
      MoseType = MouseEnum.None
    })
  }
  /* 判断促发最下方的滚动条 */
  private isInPosBar(offsetX: number, offsetY: number): boolean {
    return (
      offsetY > this.options.El.clientHeight - 15 &&
      offsetY < this.options.El.clientHeight &&
      offsetX > 0 &&
      offsetX < this.options.El.clientWidth
    )
  }
  /**
   * 更新图形数据
   * @param data I/Q/实数数据
   */
  public update(data: Float32Array): void {
    if (this.attr.isSuspend) {
      return
    }
    this.stats.begin() // 开始记录绘制
    data = data.reverse()
    //移动数据,如果输入数据大于缓存，则保留最新的部分
    // 否则向后移动数据，将输入数据放在最前，并抛弃多余部分
    const cache = this.attr.cacheData
    if (data.length > cache.length) {
      cache.set(data.slice(data.length - cache.length, data.length))
    } else {
      cache.copyWithin(data.length, 0, cache.length - data.length)
      cache.set(data, 0)
    }
    this.updateData(data) //子类实现绘制方法
    this.stats.end() //记录停止绘制时间
  }
  /**
   * 拖拽横轴上的移动图谱
   * @param eOffsetX 鼠标所在的位置
   * @param eOffsetY 鼠标Y轴所在的位置
   * @param movementX 鼠标移动了多少量
   */
  public getScrollnPosition(eOffsetX: number, movementX: number) {
    const pxKhz = (this.gridLayer.maxX - this.gridLayer.minX) / this.options.El.clientWidth
    const rangData = movementX * pxKhz
    this.setViewStartEnd(this.attr.viewStart + rangData, this.attr.viewEnd + rangData)
  }

  /**
   * 横向缩放图谱
   * @param freq 鼠标聚焦频点
   * @param delta 缩放比例
   */
  public scaleW(freq: number, delta: number) {
    const range = this.threeLayer.getBorderValue() //获取当前显示范围
    const oldLen = range.right - range.left //计算当前显示数量
    const newLen = Math.round(oldLen * delta)
    const oldPst = (freq - range.left) / oldLen
    const newLeft = Math.round(freq - newLen * oldPst)
    const newRight = newLeft + newLen
    this.setViewStartEnd(newLeft, newRight)
  }
  /**
   * 绘制波形图
   * @param data I/Q/实数数据
   */
  private updateData(data: Float32Array) {
    this.threeLayer.updateData(data)
  }
  /**
   * 设置视图Y轴范围
   * @param min 最小值 默认-32768
   * @param max 最大值 默认 32768
   */
  public setViewRange(min: number, max: number) {
    this.attr.viewRangeMax = max
    this.attr.viewRangeMin = min
    this.gridLayer.setViewRange(min, max)
    this.threeLayer.setViewRange(min, max)
  }

  /**
   * 设置视图X轴显示范围
   * @param start 点数起点  默认0
   * @param end 点数终点 默认options.cache
   */
  public setViewStartEnd(start: number, end: number) {
    if (start < this.gridLayer.minX) {
      start = this.gridLayer.minX
    }
    if (end > this.gridLayer.maxX) {
      end = this.gridLayer.maxX
    }
    this.attr.viewStart = start
    this.attr.viewEnd = end
    this.gridLayer.setViewStartEnd(start, end)
    this.threeLayer.setViewStartEnd(start, end)
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
      x: indexP.x,
      y: indexP.y,
    }
  }
  /**
   * 性能监视器开关
   * @param isOpen 是否展示性能监视器
   */
  public setStats(isOpen: boolean) {
    if (isOpen) {
      this.options.El.appendChild(this.stats.dom)
    } else {
      this.options.El.removeChild(this.stats.dom)
    }
  }
  /**
   * 设置暂停状态
   * @param isSuspend 是否暂停
   */
  public setSuspend(isSuspend: boolean) {
    this.attr.isSuspend = isSuspend
  }
}

export { WaveForm }
