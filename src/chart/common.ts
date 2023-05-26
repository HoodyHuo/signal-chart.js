export interface Position {
  x: number
  y: number
}

/**
 * 获取展示频率
 * 根据当前值进行GHz MHz KHz Hz 转换
 * @param freq 频率 Hz
 */
const GHz = 1000 * 1000 * 1000
const MHz = 1000 * 1000
const KHz = 1000
export function toDisplayFreq(freq: number): string {
  if (freq >= GHz) {
    return `${freq / GHz}GHz`
  }
  if (freq >= MHz) {
    return `${freq / MHz}MHz`
  }
  if (freq >= KHz) {
    return `${freq / KHz}KHz`
  }
  return `${freq}Hz`
}
