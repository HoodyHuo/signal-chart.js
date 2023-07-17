import * as THREE from 'three'
import {
  Color,
  OrthographicCamera,
  WebGLRenderer,
  Scene,
  Line,
  BufferGeometry,
  Raycaster,
  Plane,
  Vector3,
  AxesHelper,
  LineBasicMaterial,
  BufferAttribute,
  Vector2,
} from 'three'
import { Position } from '../common'
import { WaveFormAttr, WaveFormDirection, WaveFormOptions } from './WaveFormCommon'

class WaveFormThreeLayer {
  private options: WaveFormOptions
  private attr: WaveFormAttr
  private drawData: Float32Array

  private renderer: WebGLRenderer
  private scene: Scene
  private camera: OrthographicCamera
  private line: Line
  private geometry: BufferGeometry
  /**投影射线工具 */
  private raycaster: Raycaster = new Raycaster()
  private plane: Plane = new Plane(new Vector3(0, 0, 1))
  constructor(options: WaveFormOptions, attr: WaveFormAttr) {
    this.options = options
    this.attr = attr
    this.renderer = this.initRender(options.El)
    this.scene = new Scene()
    this.scene.background = new Color(this.options.color.background)
    this.camera = this.initCamera(options.El)

    //创建辅助线
    const axesHelper = new AxesHelper(10000)
    axesHelper.position.set(0, 0, 0)
    this.scene.add(axesHelper)
    // 创建线条
    //构建线几何体（缓冲型）
    this.drawData = new Float32Array(this.options.cache * 3)
    this.initData(this.drawData)
    const lineGeometry = new BufferGeometry()
    //构建线材质
    const lineMaterial = new LineBasicMaterial({
      color: this.options.color.line,
    })
    lineGeometry.setAttribute('position', new BufferAttribute(this.drawData, 3))
    this.geometry = lineGeometry
    //构建线
    this.line = new Line(lineGeometry, lineMaterial)
    this.setDirection(this.options.direction)

    this.scene.add(this.line)
  }
  setDirection(direction: WaveFormDirection) {
    if (direction === WaveFormDirection.LEFT) {
      this.line.rotation.y = Math.PI
      this.line.translateX(-this.options.cache)
    }
  }
  initData(drawData: Float32Array) {
    for (let i = 0; i < drawData.length / 3; i++) {
      drawData[i * 3 + 0] = i
      drawData[i * 3 + 1] = 0
      drawData[i * 3 + 2] = 0
    }
  }
  /** 初始化渲染器 */
  private initRender(el: HTMLElement): WebGLRenderer {
    // renderer
    const renderer = new WebGLRenderer({
      alpha: true,
      preserveDrawingBuffer: true,
    })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(el.clientWidth, el.clientHeight)
    el.appendChild(renderer.domElement)
    return renderer
  }
  /** 创建平面摄像机 */
  private initCamera(el: HTMLElement): OrthographicCamera {
    const k = el.clientWidth / el.clientHeight
    const s = 150
    // camera 创建平面摄像机
    const camera = new OrthographicCamera(-s * k, s * k, s, -s, 0.1, 1)
    //默认摄像机定位在原点
    camera.position.set(2400, -80, 0.1)
    camera.lookAt(new Vector3(2400, -80, 0))
    camera.scale.setX(100)
    return camera
  }
  public updateData(data: Float32Array) {
    this.moveLine(data.length)
    this.appendLine(data)
    this.render()
  }
  private render() {
    if (this.line.geometry.attributes.position) {
      this.line.geometry.attributes.position.needsUpdate = true
      this.renderer.render(this.scene, this.camera) // 渲染更新
    }
  }
  private appendLine(data: Float32Array) {
    const drawData = this.drawData
    for (let i = 0; i < data.length; i++) {
      drawData[i * 3 + 0] = i
      drawData[i * 3 + 1] = data[i]
      drawData[i * 3 + 2] = 0
    }
  }
  private moveLine(movement: number) {
    const data = this.drawData
    const len = this.options.cache - movement
    for (let i = 0; i < len; i++) {
      data[i * 3] += movement
    }
    data.copyWithin(movement * 3, 0, data.length - movement * 3)
  }
  /**
   * 将dom坐标转化为世界坐标
   * @param x 在dom上的X坐标
   * @param y 在dom上的Y坐标
   * @returns 坐标对应在三维图像中的位置
   */
  public translateToWorld(x: number, y: number): Position | null {
    // 计算标准设备位置
    const x1 = (x / this.options.El.clientWidth) * 2 - 1
    const y1 = (-y / this.options.El.clientHeight) * 2 + 1
    //将射线调整到从摄像头发出，到标准位置的方向
    this.raycaster.setFromCamera(new Vector2(x1, y1), this.camera)
    // 创建结果保存对象
    const pointV = new Vector3()
    // 获取射线，并计算与平面的交点，平面new Plane(new Vector3(0, 0, 1) 表示平面垂直与Z轴
    const returnV = this.raycaster.ray.intersectPlane(this.plane, pointV)
    // 返回交点，因为摄像头垂直于Z轴，所以理论上一定与XY 平面有交点。
    return returnV
  }
  public setViewRange(min: number, max: number) {
    this.camera.scale.set(this.camera.scale.x, 1, 1)
    // 调整位置到数据中心
    const viewCenter: Position = this.getViewCenter()
    this.camera.position.set(this.camera.position.x, viewCenter.y, 0.1)
    this.camera.lookAt(new THREE.Vector3(this.camera.position.x, viewCenter.y, 0))
    // 缩放数据到合适窗口
    const { top, bottom } = this.getBorderValue() //获取比例为1当前屏幕的显示范围
    const scale = (max - min) / (top - bottom) // 计算要显示的范围和当前的比例
    this.camera.scale.setY(scale) //设置缩放
    console.log('x', scale)
    this.camera.updateMatrixWorld() //立即更新
    this.render()
  }

  /**
   * 设置视图X轴显示范围
   * @param start 点数起点  默认0
   * @param end 点数终点 默认options.cache
   */
  public setViewStartEnd(start: number, end: number) {
    this.camera.scale.set(1, this.camera.scale.y, 1)
    // 调整位置到数据中心
    const viewCenter: Position = this.getViewCenter()
    this.camera.position.set(viewCenter.x, this.camera.position.y, 0.1)
    this.camera.lookAt(new THREE.Vector3(viewCenter.x, this.camera.position.y, 0))
    // 缩放数据到合适窗口
    const { left, right } = this.getBorderValue() //获取比例为1当前屏幕的显示范围
    const scale = (end - start) / (right - left) // 计算要显示的范围和当前的比例
    this.camera.scale.setX(scale) //设置缩放
    console.log('x', scale)
    this.camera.updateMatrixWorld() //立即更新
    this.render()
  }
  /**
   *
   * @returns 当前视图中心位置
   */
  public getViewCenter(): Position {
    return {
      x: (this.attr.viewEnd - this.attr.viewStart) / 2 + this.attr.viewStart,
      y: (this.attr.viewRangeMax - this.attr.viewRangeMin) / 2 + this.attr.viewRangeMin,
    }
  }
  /**
   *
   * @returns 获取当前数据区域对应到外边框的
   */
  public getBorderValue(): { top: number; bottom: number; left: number; right: number } {
    const leftTop = this.translateToWorld(0, 0)
    const rightBottom = this.translateToWorld(this.options.El.clientWidth, this.options.El.clientHeight)
    return {
      top: Math.round(leftTop.y),
      bottom: Math.round(rightBottom.y),
      left: Math.round(leftTop.x),
      right: Math.round(rightBottom.x),
    }
  }
}

export { WaveFormThreeLayer }
