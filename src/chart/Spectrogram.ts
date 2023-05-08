import { GramOptions, convertToDrawData, Marker, KeepMode, preprocessingDataForKeepMode } from './common'
import Gram from './Gram'
import * as THREE from 'three'
import { Queue } from '@/tool/stats/Queue'
/**
 * 频谱图配置参数
 */
export interface SpectrogramOptions extends GramOptions {
  keepMode?: KeepMode
  cacheCount?: number
}

/**
 * 频谱图组件
 */
export class Spectrogram extends Gram {
  //配置
  private options: SpectrogramOptions

  /** ------------------------ 信号 ------------------------------- */
  private keepMode: KeepMode

  /** 数据起点频率 */
  private startFreq: number
  /** 数据终止频率 */
  private endFreq: number
  /** 当前视图起点频率 */
  private startFreqView: number
  /** 当前视图终止频率 */
  private endFreqView: number

  /**所有marker标点 */
  private markers: Array<Marker>

  /** ------------------------ 数据 ------------------------------- */
  //当前帧数据
  private data: Float32Array = new Float32Array(0)
  //当前帧绘制数据（threejs）
  private drawData: Float32Array
  /**绘制点数 */
  private drawCount: number
  /** 缓存，保存了最近N包的数据 */
  private recentCache: Queue<Float32Array> 
  /** 保持缓冲区 */
  private keepData: Float32Array
  /** 平均值缓冲区，保存最近recentCache之和(按位置) */
  private avgData: Float32Array

  /** ------------------------ 图形 ------------------------------- */
  //线条
  private lineMaterial: THREE.LineBasicMaterial
  private line: THREE.Line

  //  创建缓存几何体
  private lineGeometry: THREE.BufferGeometry

  /**
   * 创建频谱图
   * @param options 配置信息
   */
  constructor(options: SpectrogramOptions) {
    super(options)
    this.keepMode = options.keepMode
    this.recentCache = new Queue<Float32Array>(options.cacheCount && 500)
    this.options = options
    //构建线几何体（缓冲型）
    this.lineGeometry = new THREE.BufferGeometry()

    //构建线材质
    this.lineMaterial = new THREE.LineBasicMaterial({
      color: 0xff0000,
    })
    //构建线
    this.line = new THREE.Line(this.lineGeometry, this.lineMaterial)
    this.scene.add(this.line)
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
