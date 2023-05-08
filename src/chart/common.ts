
/**保持模式 */
export enum KeepMode {
  /**刷新模式 */
  CLEAN,
  /**最大保持模式 */
  MAX,
  /**最小保持模式 */
  MIN,
  /** 平均模式 */
  AVG
}

export interface GramOptions {
  Performance: boolean // 是否打开性能监视窗口
  El: HTMLDivElement // 图形绘制节点
}

export type Marker = {
  freq: number //频率 Hz
  name: string // marker 名称
}

/**
 * 转换FFT数组到绘制数组
 * @param dist 绘制数据缓冲区
 * @param src  频谱FFT数据
 * @returns Threejs绘制的三维数组
 */
export const convertToDrawData = (drawData: Float32Array, src: Float32Array) => {
  for (let i = 0; i < src.length; i++) {
    drawData[i * 3] = i // X轴按下标
    drawData[i * 3 + 1] = src[i] // y轴值
    drawData[i * 3 + 2] = 0 //平面图，Z轴始终为0
  }
}
/**
 * 根据保持模式进行数据预处理
 * @param dist 结果FFT数据
 * @param src 频谱FFT数据
 */
export const preprocessingDataForKeepMode = (dist: Float32Array, src: Float32Array,mode:KeepMode)=>{

}
