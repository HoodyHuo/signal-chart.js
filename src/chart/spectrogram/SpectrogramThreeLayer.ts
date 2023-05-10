import Gram from './Gram'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Queue } from '@/tool/stats/Queue'
import { Plane } from 'three'
import { convertToDrawData, KeepMode, SpectrogramOptions } from './SpectrogramCommon'
import { Position } from '../common'

/**
 * 频谱图Threejs组件
 */
export class SpectrogramThreeLayer extends Gram {
  /**配置*/
  private options: SpectrogramOptions

  /** ------------------------ 信号 ------------------------------- */
  protected keepMode: KeepMode

  /** ------------------------ 数据 ------------------------------- */
  //当前帧数据
  protected data: Float32Array = new Float32Array(0)
  //当前帧绘制数据（threejs）
  protected drawData: Float32Array
  /**绘制点数 */
  protected drawCount: number
  /** 缓存，保存了最近N包的数据 */
  protected recentCache: Queue<Float32Array>
  /** 保持缓冲区 */
  protected keepData: Float32Array
  /** 平均值缓冲区，保存最近recentCache之和(按位置) */
  protected avgData: Float32Array

  /** ------------------------ 数据图形 ------------------------------- */
  //线条
  private lineMaterial: THREE.LineBasicMaterial
  private line: THREE.Line

  //  创建缓存几何体
  private lineGeometry: THREE.BufferGeometry

  /** ------------------------ 网格图形 ------------------------------- */
  /**投影射线工具 */
  private raycaster: THREE.Raycaster = new THREE.Raycaster()

  /**
   * 创建频谱图
   * @param options 配置信息
   */
  constructor(options: SpectrogramOptions) {
    super(options)
    this.options = options
    this.keepMode = options.keepMode
    /**创建帧缓存 */
    this.recentCache = new Queue<Float32Array>(options.cacheCount)

    /** --------------------------初始化频谱线图层-------------------------------- */
    //构建线几何体（缓冲型）
    this.lineGeometry = new THREE.BufferGeometry()

    //构建线材质
    this.lineMaterial = new THREE.LineBasicMaterial({
      color: options.color.line,
    })
    //构建线
    this.line = new THREE.Line(this.lineGeometry, this.lineMaterial)
    this.scene.add(this.line)
    this.renderer.setClearColor(options.color.background, 1.0)

    const a = new THREE.AxesHelper(10000)
    a.position.set(0,0,0)
    this.scene.add(a)

    // new OrbitControls(this.camera, this.dom)
  }

  public move(delta: Position) {
    const oldP = this.camera.position
    this.camera.position.set(oldP.x + delta.x, oldP.y + delta.y, oldP.z)
  }

  public scale(scale:number){
    const oldP = this.camera.position
      this.camera.position.set(oldP.x,oldP.y,oldP.z+scale)
  }

  /**
   * 将dom坐标转化为世界坐标
   * @param x 在dom上的X坐标
   * @param y 在dom上的Y坐标
   * @returns 坐标对应在三维图像中的位置
   */
  public translateToWorld(x: number, y: number): Position|null {
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
      top: leftTop.y,
      bottom: rightBottom.y,
      left: leftTop.x,
      right: rightBottom.x,
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
    let yMIn = new THREE.Vector3(
      this.drawData[yMinIndex * 3],
      this.drawData[yMinIndex * 3 + 1],
      this.drawData[yMinIndex * 3 + 2],
    ).project(this.camera)
    const yminP = (-yMIn.y * this.dom.clientHeight) / 2 + this.dom.clientHeight / 2

    let yMAn = new THREE.Vector3(
      this.drawData[yMaxIndex * 3],
      this.drawData[yMaxIndex * 3 + 1],
      this.drawData[yMaxIndex * 3 + 2],
    ).project(this.camera)
    const ymaxP = (-yMAn.y * this.dom.clientHeight) / 2 + this.dom.clientHeight / 2

    /** X 最大 */
    let p = new THREE.Vector3(this.drawData[0], this.drawData[1], this.drawData[2]).project(this.camera)
    const xmin = (p.x * this.dom.clientWidth) / 2 + this.dom.clientWidth / 2
    let p2 = new THREE.Vector3(
      this.drawData[this.drawData.length - 3],
      this.drawData[this.drawData.length - 2],
      this.drawData[this.drawData.length - 1],
    ).project(this.camera)
    const xmax = (p2.x * this.dom.clientWidth) / 2 + this.dom.clientWidth / 2

    return { xmin, xmax, ymaxP, yminP }
  }

  protected updateData(data: Float32Array): void {
    //判断绘制数据尺寸是否变化，如果变化则调整缓存尺寸
    if (data.length != this.drawCount) {
      this.resizeData(data)
    }
    //通过处理，构建当前帧数据
    this.preprocessingDataForKeepMode(data)

    // 填充当前帧数据到绘制数据里
    convertToDrawData(this.drawData, this.data)
    // 标记图形需要更新
    this.lineGeometry.attributes.position.needsUpdate = true
  }

  /**
   * 重新设置数据长度，计算起止频点映射关系
   * @param data 新数据
   */
  public resizeData(data: Float32Array) {
    this.drawCount = data.length
    this.clearDataCache()
  }

  /**
   * 设置保持模式，控制显示内容
   * @see KeepMode
   * @param mode 模式
   */
  public setKeepMode(mode: KeepMode) {
    this.clearDataCache()
    this.keepMode = mode
  }
  /** 清理缓存数据 */
  private clearDataCache() {
    this.keepData = new Float32Array(this.drawCount)
    this.avgData = new Float32Array(this.drawCount)
    this.recentCache.clear()
    this.data = new Float32Array(this.drawCount)

    this.drawData = new Float32Array(this.drawCount * 3)
    this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(this.drawData, 3))
    // drawcalls 设置绘制 点数，
    this.lineGeometry.setDrawRange(0, this.drawCount)
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
  }
}
