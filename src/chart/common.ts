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
    return `${freq / KHz}kHz`
  }
  return `${freq}Hz`
}

export function makeCanvas(zIndex: number, height: number, width: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.setAttribute('width', width + 'px')
  canvas.setAttribute('height', height + 'px')
  canvas.style.cssText = `
    position:absolute;
    top:0;
    left:0px;
    z-index:${zIndex};
    `
  return canvas
}
