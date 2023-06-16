import Stats from '../../tool/stats/stats'
import * as THREE from 'three'
import { GramOptions } from './SpectrumCommon'
export abstract class Gram {
  dom: HTMLElement
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.OrthographicCamera

  //性能监视器
  stats: Stats

  constructor(options: GramOptions) {
    this.dom = document.createElement('div')

    const str = `
    height:${options.El.clientHeight - options.VERTICAL_AXIS_MARGIN}px;
    width: ${options.El.clientWidth - options.HORIZONTAL_AXIS_MARGIN}px;
    position: absolute;
    top: 0px;
    left: ${options.HORIZONTAL_AXIS_MARGIN}px;
    `
    this.dom.style.cssText = str
    options.El.appendChild(this.dom)
    this.stats = this.initStateMonitor(this.dom, options.Performance)
    this.setStats(options.Performance)
    this.renderer = this.initRender(this.dom)
    this.scene = this.initScene(this.dom)
    this.camera = this.initCamera(this.dom)
  }
  /**
   * 由具体图谱类实现的数据更新
   * @param data 图形数据
   */
  protected abstract updateData(data: Float32Array): void

  /**
   * 更新图形数据
   * @param data 图谱数据
   */
  public update(data: Float32Array): void {
    this.stats.begin() // 开始记录绘制
    this.updateData(data) //子类实现绘制方法
    this.stats.end() //记录停止绘制时间
  }
  /**
   * 移除图形
   */
  public delete(): void {
    this.dom.removeChild(this.stats.dom)
    this.dom.removeChild(this.renderer.domElement)
  }
  public setStats(isOpen: boolean) {
    if (isOpen) {
      this.dom.appendChild(this.stats.dom)
    } else {
      this.dom.removeChild(this.stats.dom)
    }
  }
  /** 初始化性能监视器 */
  private initStateMonitor(el: HTMLElement, Performance: boolean): Stats {
    const stats = new Stats()
    return stats
  }
  /** 初始化渲染器 */
  private initRender(el: HTMLElement): THREE.WebGLRenderer {
    // renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      preserveDrawingBuffer: true,
    })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(el.clientWidth, el.clientHeight)
    el.appendChild(renderer.domElement)
    return renderer
  }
  /** 创建场景 */
  private initScene(El: HTMLElement): THREE.Scene {
    // scene 创建场景
    const scene = new THREE.Scene()
    return scene
  }
  /** 创建投影摄像机 */
  private initCamera(el: HTMLElement): THREE.OrthographicCamera {
    const k = el.clientWidth / el.clientHeight
    const s = 150
    // camera 创建投影摄像机
    const camera = new THREE.OrthographicCamera(-s * k, s * k, s, -s, 0.1, 1)
    //默认摄像机定位在原点
    camera.position.set(0, 0, 0.1)
    camera.lookAt(new THREE.Vector3(0, 0, 0))
    return camera
  }
}
export default Gram
