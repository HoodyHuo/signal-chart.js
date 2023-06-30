/**
 * 色谱对象
 * 用于均匀渐变辅助取色
 * 根据输入颜色数组
 * 用法:
 *  const colormap = new ColorMap(['blue', 'red', 'yellow'],220)
 *  const colors = colormap.getColor(130)
 *  const R = colors[0]
 *  const G = colors[1]
 *  const B = colors[2]
 *  const A = colors[3]
 *
 */
export class ColorMap {
  /** 渐变色的色值 */
  private colors: string[]
  /** 颜色区分数量 */
  private count: number
  /** 通过色值生成的渐变图像 */
  private imageData: ImageData

  private cache: Uint8ClampedArray

  /**
   * 构造色谱
   * @param colors 颜色数组，支持 CSS 颜色
   * @param count 色谱分为count份
   */
  constructor(colors: string[], count: number) {
    if (colors?.length < 2) {
      throw new Error('色谱颜色至少需要2个')
    }
    this.cache = new Uint8ClampedArray(4)

    this.colors = colors
    this.count = count

    const canvas = document.createElement('canvas')
    canvas.height = 1
    canvas.width = count

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, count, 1)

    const gradient = ctx.createLinearGradient(0, 0, 200, 0)
    for (let i = 0; i < colors.length; i++) {
      const pos = i == 0 ? 0 : i / (colors.length - 1)
      gradient.addColorStop(pos, colors[i])
    }
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, count, 1)

    this.imageData = ctx.getImageData(0, 0, count, 1)
  }

  /**
   * 获取颜色数组的开始位置
   * @param value 色谱的下标（ 0 至 count-1）
   * @returns
   */
  public getColor(value: number): number {
    let v = value < 0 ? 0 : value
    v = v > this.count - 1 ? this.count - 1 : v
    const index = v * 4

    return index
  }
}
