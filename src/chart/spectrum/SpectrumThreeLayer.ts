import Gram from './Gram'
import * as THREE from 'three'
import { Queue } from '../../tool/Queue'
import { Plane } from 'three'
import { convertToDrawData, KeepMode, Marker, SpectrogramOptions, SpectrumAttr } from './SpectrumCommon'
import { Position } from '../common'

/**
 * 频谱图Threejs组件
 */
export class SpectrogramThreeLayer extends Gram {
  private options: SpectrogramOptions
  private attr: SpectrumAttr
  /** ------------------------ 信号 ------------------------------- */
  /** 保持模式 */
  protected keepMode: KeepMode

  /** ------------------------ 数据 ------------------------------- */
  /**当前帧数据 */
  public data: Float32Array = new Float32Array(0)
  /**当前帧绘制数据（threejs） */
  protected drawData: Float32Array
  /**绘制点数 */
  public drawCount: number
  /** 缓存，保存了最近N包的数据 */
  protected recentCache: Queue<Float32Array>
  /** 保持缓冲区 */
  protected keepData: Float32Array
  /** 平均值缓冲区，保存最近recentCache之和(按位置) */
  protected avgData: Float32Array

  /** ------------------------ 数据图形 ------------------------------- */

  /** 当前视图低电平 */
  private lowLevel = -150
  /** 当前视图高电平 */
  private highLevel = 30

  private viewLeft = 0
  private viewRight = 10000

  //线条
  private line: THREE.Line
  /** ------------------------ 辅助 ------------------------------- */
  /**投影射线工具 */
  private raycaster: THREE.Raycaster = new THREE.Raycaster()

  /**
   * 创建频谱图
   * @param options 配置信息
   */
  constructor(options: SpectrogramOptions, attr: SpectrumAttr) {
    super(options)
    this.options = options
    this.attr = attr
    this.keepMode = options.keepMode
    /**创建帧缓存 */
    this.recentCache = new Queue<Float32Array>(options.cacheCount)

    /** --------------------------初始化频谱线图层-------------------------------- */
    const a = new THREE.AxesHelper(10000)
    a.position.set(0, 0, 0)
    this.scene.add(a)
    this.resizeData(options.fftLen)
    // new OrbitControls(this.camera, this.dom)
  }

  public move(delta: Position) {
    const oldP = this.camera.position
    this.camera.position.set(oldP.x + delta.x, oldP.y + delta.y, oldP.z)
  }

  /**
   * 设置绘制线的下标范围
   * @param startX 开始显示的下标（即x轴坐标）
   * @param endX 截止显示的下标（即x轴坐标）
   */
  public setViewRange(startX: number, endX: number) {
    this.viewLeft = startX
    this.viewRight = endX
    this.camera.scale.set(1, this.camera.scale.y, 1)
    // 调整位置到数据中心
    const viewCenter: Position = this.getViewCenter()
    this.camera.position.set(viewCenter.x, viewCenter.y, 0.1)
    this.camera.lookAt(new THREE.Vector3(viewCenter.x, viewCenter.y, 0))
    // 缩放数据到合适窗口
    const { left, right } = this.getBorderValue() //获取比例为1当前屏幕的显示范围
    const scale = (endX - startX) / (right - left) // 计算要显示的范围和当前的比例
    this.camera.scale.setX(scale) //设置缩放
    this.camera.updateMatrixWorld() //立即更新
    this.render()
  }
  render() {
    if (this.line.geometry.attributes.position) {
      this.line.geometry.attributes.position.needsUpdate = true
      this.renderer.render(this.scene, this.camera) // 渲染更新
    }
  }

  /**
   * 设置当前显示区域的电平范围
   * @param lowLevel 低点电平 dbm
   * @param highLevel 高点电平 dbm
   */
  public setViewLevel(lowLevel: number, highLevel: number) {
    this.lowLevel = lowLevel
    this.highLevel = highLevel
    this.camera.scale.set(this.camera.scale.x, 1, 1)
    // 调整位置到数据中心
    const viewCenter: Position = this.getViewCenter()
    this.camera.position.set(viewCenter.x, viewCenter.y, 0.1)
    this.camera.lookAt(new THREE.Vector3(viewCenter.x, viewCenter.y, 0))
    // 缩放数据到合适窗口
    const { top, bottom } = this.getBorderValue() //获取比例为1当前屏幕的显示范围
    const scale = (highLevel - lowLevel) / (top - bottom) // 计算要显示的范围和当前的比例
    this.camera.scale.setY(scale) //设置缩放
    this.camera.updateMatrixWorld() //立即更新
    this.render()
  }
  public getViewCenter(): Position {
    return {
      x: (this.viewRight - this.viewLeft) / 2 + this.viewLeft,
      y: (this.highLevel - this.lowLevel) / 2 + this.lowLevel,
    }
  }

  /**
   * 将dom坐标转化为世界坐标
   * @param x 在dom上的X坐标
   * @param y 在dom上的Y坐标
   * @returns 坐标对应在三维图像中的位置
   */
  public translateToWorld(x: number, y: number): Position | null {
    // 计算标准设备位置
    const x1 = (x / this.dom.clientWidth) * 2 - 1
    const y1 = (-y / this.dom.clientHeight) * 2 + 1
    //将射线调整到从摄像头发出，到标准位置的方向
    this.raycaster.setFromCamera(new THREE.Vector2(x1, y1), this.camera)
    // 创建结果保存对象
    const pointV = new THREE.Vector3()
    // 获取射线，并计算与平面的交点，平面new Plane(new THREE.Vector3(0, 0, 1) 表示平面垂直与Z轴
    const returnV = this.raycaster.ray.intersectPlane(new Plane(new THREE.Vector3(0, 0, 1)), pointV)
    // 返回交点，因为摄像头垂直于Z轴，所以理论上一定与XY 平面有交点。
    return returnV
  }

  /**
   *
   * @returns 获取当前数据区域对应到外边框的
   */
  public getBorderValue(): { top: number; bottom: number; left: number; right: number } {
    const leftTop = this.translateToWorld(0, 0)
    const rightBottom = this.translateToWorld(this.dom.clientWidth, this.dom.clientHeight)
    return {
      top: Math.round(leftTop.y),
      bottom: Math.round(rightBottom.y),
      left: Math.round(leftTop.x),
      right: Math.round(rightBottom.x),
    }
  }

  /**获取内部数据到外面的投射坐标 */
  public getProject() {
    let ymax = -500
    let yMaxIndex = 0
    let ymin = 500
    let yMinIndex = 0
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i] < ymin) {
        ymin = this.data[i]
        yMinIndex = i
      }
      if (this.data[i] > ymax) {
        ymax = this.data[i]
        yMaxIndex = i
      }
    }
    const yMIn = new THREE.Vector3(
      this.drawData[yMinIndex * 3],
      this.drawData[yMinIndex * 3 + 1],
      this.drawData[yMinIndex * 3 + 2],
    ).project(this.camera)
    const yminP = (-yMIn.y * this.dom.clientHeight) / 2 + this.dom.clientHeight / 2

    const yMAn = new THREE.Vector3(
      this.drawData[yMaxIndex * 3],
      this.drawData[yMaxIndex * 3 + 1],
      this.drawData[yMaxIndex * 3 + 2],
    ).project(this.camera)
    const ymaxP = (-yMAn.y * this.dom.clientHeight) / 2 + this.dom.clientHeight / 2

    /** X 最大 */
    const p = new THREE.Vector3(this.drawData[0], this.drawData[1], this.drawData[2]).project(this.camera)
    const xmin = (p.x * this.dom.clientWidth) / 2 + this.dom.clientWidth / 2
    const p2 = new THREE.Vector3(
      this.drawData[this.drawData.length - 3],
      this.drawData[this.drawData.length - 2],
      this.drawData[this.drawData.length - 1],
    ).project(this.camera)
    const xmax = (p2.x * this.dom.clientWidth) / 2 + this.dom.clientWidth / 2

    return { xmin, xmax, ymaxP, yminP }
  }

  protected updateData(data: Float32Array): void {
    //判断绘制数据尺寸是否变化，如果变化则调整缓存尺寸
    //通过处理，构建当前帧数据
    this.preprocessingDataForKeepMode(data)

    // 填充当前帧数据到绘制数据里
    convertToDrawData(this.drawData, this.data)
    // 标记图形需要更新
    this.render()
  }

  /**
   * 重新设置数据长度，计算起止频点映射关系
   * @param drawCount 新数据
   */
  public resizeData(drawCount: number) {
    console.log('resize', drawCount)
    this.drawCount = drawCount
    this.clearDataCache(this.keepMode, this.drawCount)
  }

  /**
   * 设置保持模式，控制显示内容
   * @see KeepMode
   * @param mode 模式
   */
  public setKeepMode(mode: KeepMode) {
    this.keepMode = mode
    this.clearDataCache(mode, this.drawCount)
  }
  /** 清理缓存数据 */
  private clearDataCache(mode: KeepMode, pointCount: number) {
    this.keepData = new Float32Array(pointCount)
    //根据模式不同，初始化保持模式的内置数据
    switch (mode) {
      case KeepMode.MAX:
        this.keepData = this.keepData.fill(Number.MIN_SAFE_INTEGER)
        break
      case KeepMode.MIN:
        this.keepData = this.keepData.fill(Number.MAX_SAFE_INTEGER)
        break
    }
    // 初始化平均模式数据
    this.avgData = new Float32Array(pointCount)
    this.recentCache.clear()
    // 重新构造当前初始化的帧数
    this.data = new Float32Array(pointCount)
    this.drawData = new Float32Array(pointCount * 3)
    convertToDrawData(this.drawData, new Float32Array(pointCount).fill(-180))
    //移除并添加新的线
    this.scene.remove(this.line)
    this.line = this.createLine(pointCount, this.drawData)
    this.scene.add(this.line)
  }
  /**
   * 根据保持模式进行数据预处理
   * @param data 频谱FFT数据
   */
  private preprocessingDataForKeepMode(data: Float32Array) {
    // 添加最新一包到缓存区
    const pop = this.recentCache.push(data)
    switch (this.keepMode) {
      // 直接将数据赋值到当前帧

      case KeepMode.MAX:
        // 通过与保持缓存比对，记录最大值
        for (let i = 0; i < data.length; i++) {
          this.keepData[i] = Math.max(this.keepData[i], data[i])
        }
        this.data = this.keepData
        break
      // 通过与保持缓存比对，记录最小值
      case KeepMode.MIN:
        for (let i = 0; i < data.length; i++) {
          this.keepData[i] = Math.min(this.keepData[i], data[i])
        }
        this.data = this.keepData
        break
      // 通过将当前帧加入总和，并减去弹出帧，除以缓存总数，得到平均
      case KeepMode.AVG:
        for (let i = 0; i < data.length; i++) {
          // avg数据减去弹出的数再加上新增的数
          this.avgData[i] = this.avgData[i] - (pop == null ? 0 : pop[i]) + data[i]
          //根据总和数值计算平均数
          this.data[i] = this.avgData[i] / this.recentCache.size()
        }
        break
      case KeepMode.CLEAN:
      default:
        this.data = data
        break
    }
    this.attr.data = this.data
  }
  /**
   * 创建线段对象
   * @param fftLen 线段点数既FFT长度
   * @param drawData 线段定点缓冲数组 3倍fftlen
   * @returns Line对象
   */
  private createLine(fftLen: number, drawData: Float32Array): THREE.Line {
    //构建线几何体（缓冲型）
    const lineGeometry = new THREE.BufferGeometry()

    //构建线材质
    const lineMaterial = new THREE.LineBasicMaterial({
      color: this.options.color.line,
    })
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(drawData, 3))
    // drawcalls 设置绘制 点数，
    lineGeometry.setDrawRange(0, fftLen)
    //构建线
    const line = new THREE.Line(lineGeometry, lineMaterial)
    return line
  }
}
