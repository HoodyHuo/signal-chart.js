import { FrameData } from './SpectrogramCommon'

export interface ISpectrogram {
  /**
   * 更新数据
   * @param fd 一帧数据
   */
  update(fd: FrameData): void
  /**
   * 设置整个图的频率范围
   * @param startFreq 起点频率
   * @param endFreq 终止频率
   */
  setFreqRange(startFreq: number, endFreq: number): void
  /**
   * 设置当前视野的频率范围
   * @param startFreq 起点频率
   * @param endFreq 终止频率
   */
  setViewFreqRange(startFreq: number, endFreq: number): void
  /**
   * 设置当前图谱展示的电平值范围
   * @param lowLevel 低点电平
   * @param highLevel 高点电平
   */
  setViewLevelRange(lowLevel: number, highLevel: number): void

  translateToWorld(x: number, y: number): { freq: number; level: number; time: number }
}
