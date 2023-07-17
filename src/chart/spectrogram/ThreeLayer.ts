import { FrameData, SpectrogramAttr, SpectrogramOptions } from './SpectrogramCommon'
import { ISpectrogram } from './ISpectrogram'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { fragmentShader, vertexShader } from './shader'

/** 三维图 */
export class ThreeLayer implements ISpectrogram {
  // --------------------------------------- 基础属性-------------------------
  /** 挂载dom */
  private dom: HTMLElement
  /** 构造配置 */
  private options: SpectrogramOptions
  /** 共享属性 */
  private attr: SpectrogramAttr
  /** 绘图数据及数据长度 */
  private gromData: Float32Array
  private gromDataSize: number
  /** 数据压缩比 */
  private compression: number
  // --------------------------------------- THREE属性-------------------------
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private controls: OrbitControls
  private geometry: THREE.PlaneGeometry
  private material: THREE.RawShaderMaterial
  private mesh: THREE.Mesh

  constructor(options: SpectrogramOptions, attr: SpectrogramAttr) {
    /** 从父层共享属性 */
    this.dom = options.El
    this.options = options
    this.attr = attr
    this.compression = 1
    //初始化THREE Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(this.dom.clientWidth, this.dom.clientHeight)
    this.dom.appendChild(this.renderer.domElement)
    //初始化THREE SCENE
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(this.options.color.background)
    const axhelper = new THREE.AxesHelper(5000)
    this.scene.add(axhelper)

    //初始化 Camera  和 Control
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 10, 20000)
    this.camera.position.x = 559
    this.camera.position.y = 99
    this.camera.position.z = 222

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.minDistance = 100
    this.controls.maxDistance = 10000
    this.controls.maxPolarAngle = Math.PI / 2

    this.controls.target.y = -66
    this.controls.target.x = 350
    this.controls.target.z = 0
    this.controls.update()

    //初始化几何图形
    const geometry = new THREE.PlaneGeometry(
      this.options.fftLen,
      this.options.cacheCount,
      this.options.fftLen - 1,
      this.options.cacheCount - 1,
    )
    // geometry.rotateX(-Math.PI / 2)
    this.geometry = geometry
    this.gromData = geometry.attributes.position.array as Float32Array
    this.gromDataSize = 0
    const coc = Float32Array.from(this.attr.color.getColorImage().data)
    this.material = new THREE.RawShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      side: THREE.DoubleSide,
      uniforms: {
        colorImages: new THREE.Uniform(coc),
        top: new THREE.Uniform(this.attr.highLevel),
        bottom: new THREE.Uniform(this.attr.lowLevel),
      },
    })
    this.mesh = new THREE.Mesh(this.geometry, this.material)
    this.mesh.scale.y = 1
    this.mesh.scale.z = 1
    this.mesh.scale.x = this.compression / 10
    this.scene.add(this.mesh)
  }
  translateToWorld(x: number, y: number): { freq: number; level: number; time: number } {
    throw new Error('Method not implemented.')
  }
  /** 更新图谱 */
  public update(fd: FrameData): void {
    this.gromMove()
    this.appendLine(fd)
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.drawRange = { start: 0, count: this.gromDataSize }
    this.renderer.render(this.scene, this.camera)
  }
  public setFreqRange(startFreq: number, endFreq: number): void {
    // throw new Error('Method not implemented.')
  }
  public setViewFreqRange(startFreq: number, endFreq: number): void {
    // throw new Error('Method not implemented.')
  }
  public setViewLevelRange(lowLevel: number, highLevel: number): void {
    // throw new Error('Method not implemented.')
  }

  private appendLine(fd: FrameData): void {
    const data = fd.data
    for (let i = 0; i < data.length; i++) {
      this.gromData[i * 3 + 0] = i
      this.gromData[i * 3 + 1] = data[i]
      this.gromData[i * 3 + 2] = 0
    }
    if (this.gromDataSize < this.gromData.length) {
      this.gromDataSize += fd.data.length * 3
    }
  }
  /**
   * 所有图像Z轴移动1
   */
  private gromMove(): void {
    const data = this.gromData
    for (let i = 0; i < data.length / 3; i++) {
      data[i * 3 + 2] -= 1
    }
    data.copyWithin(this.options.fftLen * 3, 0, this.gromData.length - this.options.fftLen * 3)
  }
}
