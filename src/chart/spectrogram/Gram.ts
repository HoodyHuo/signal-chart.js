import Stats from './../../tool/stats/stats'
import * as THREE from 'three'
import { GramOptions } from './SpectrogramCommon'
export default abstract class Gram {
  dom: HTMLElement
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.OrthographicCamera

  //性能监视器
  stats: Stats

  constructor(options: GramOptions) {
    this.dom = options.El
    this.dom.style.position = 'relative'
    this.stats = this.initStateMonitor(options.El, options.Performance)
    this.setStats(options.Performance)
    this.renderer = this.initRender(options.El)
    this.scene = this.initScene(options.El)
    this.camera = this.initCamera(options.El)
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
    this.renderer.render(this.scene, this.camera) // 渲染更新
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
    const camera = new THREE.OrthographicCamera(-s*k,s*k,s,-s,0.1,50000)
    camera.position.set(3000, 0, -1)
    camera.lookAt(this.scene.position)
    return camera
  }
}
