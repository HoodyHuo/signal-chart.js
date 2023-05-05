import { GramOptions, convertToDrawData } from './common'
import Gram from './Gram'
import * as THREE from 'three'
/**
 * 频谱图配置参数
 */
export interface SpectrogramOptions extends GramOptions {
  maxPoint: number
}
/**
 * 频谱图组件
 */
export class Spectrogram extends Gram {
  //配置
  options: SpectrogramOptions

  //当前帧数据
  data: Float32Array = new Float32Array(0)
  //当前帧绘制数据（threejs）
  drawData: Float32Array = new Float32Array(0)

  //线条
  lineMaterial: THREE.LineBasicMaterial
  line: THREE.Line

  //  创建缓存几何体
  lineGeometry: THREE.BufferGeometry

  /**
   * 创建频谱图
   * @param options 配置信息
   */
  constructor(options: SpectrogramOptions) {
    super(options)
    this.options = options
    //构建线几何体（缓冲型）
    this.lineGeometry = new THREE.BufferGeometry()

    // attributes 设置几何体数据源
    this.drawData = new Float32Array(options.maxPoint * 3) // 每个点有3个 值xyz
    this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(this.drawData, 3))

    // drawcalls 设置绘制 点数，
    this.lineGeometry.setDrawRange(0, options.maxPoint)

    //构建线材质
    this.lineMaterial = new THREE.LineBasicMaterial({
      color: 0xff0000,
    })
    //构建线
    this.line = new THREE.Line(this.lineGeometry, this.lineMaterial)
    this.scene.add(this.line)
  }
  protected updateData(data: Float32Array): void {
    // 填充数据到绘制数据里
    convertToDrawData(this.drawData, data)
    // 标记图形需要更新
    this.lineGeometry.attributes.position.needsUpdate = true
  }
}
