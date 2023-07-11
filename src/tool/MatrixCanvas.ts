/**
 * 组合式语图canvas
 * 用于突破浏览器canvas高宽超过16384后性能急剧下降的问题
 * @description 当前版本只考虑每帧的点数超过
 * @version 1
 * @author hoody
 * @since 2023年6月29日
 */
export class MatrixCanvas {
  public readonly width: number
  public readonly height: number
  private canList: HTMLCanvasElement[] = []
  private ctxList: CanvasRenderingContext2D[] = []

  constructor(totalHeight: number, totalWidth: number) {
    this.width = totalWidth
    this.height = totalHeight
    const canCount = Math.ceil(totalWidth / 16384)
    const preWidth = totalWidth / canCount
    for (let i = 0; i < canCount; i++) {
      let width = preWidth
      if (i === canCount - 1) {
        width = totalWidth - (canCount - 1) * preWidth
      }
      const { canvas, ctx } = this.createCacheCanvas(width, totalHeight)
      this.canList.push(canvas)
      this.ctxList.push(ctx)
      //   document.body.appendChild(canvas)
    }
  }
  /**
   * 创建子canvas
   * @param width 子canvas宽度
   * @param height 子canvas高度
   * @returns canvas和2d上下文对象
   */
  private createCacheCanvas(
    width: number,
    height: number,
  ): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const canvas = document.createElement('canvas')
    canvas.height = height
    canvas.width = width
    const ctx = canvas.getContext('2d')
    return { canvas, ctx }
  }
  /**
   * 将整个画布图像下移 movement像素
   * @param movement 下移量
   */
  public moveDown(movement: number): void {
    for (let i = 0; i < this.ctxList.length; i++) {
      const ctx = this.ctxList[i]
      const can = ctx.canvas
      ctx.drawImage(ctx.canvas, 0, 0, can.width, can.height, 0, movement, can.width, can.height)
    }
  }

  /**
   * 将图像放置到x:0,y:0位置
   * @param imageLine 新增图像
   */
  public putImageData(imageLine: ImageData): void {
    let start = 0

    for (let canIndex = 0; canIndex < this.canList.length; canIndex++) {
      //   如果图像画完了，则跳出
      if (start === imageLine.width) {
        break
      }
      // 取出绘制元素
      const ctx = this.ctxList[canIndex]
      const can = ctx.canvas
      //   计算当前应该画多少像素长度
      const len = imageLine.width - start >= can.width ? can.width : start + can.width - imageLine.width
      //   putImageData 的x，y参数，表示将imge放到canvas的坐标系的偏移量，所以需要放到-start位置绘制后即可
      ctx.putImageData(imageLine, -start, 0)
      start += len
    }
  }
  /**
   * 将当前图像按缩放的方式绘制到target中
   * @description
   * 截取当前的图像的 <br>
   * (sx,sy)
   * *-------------*
   * |             |  sh
   * |             |
   * *-------------*
   *      sw
   *
   * @param target 绘制目的地
   * @param sx 源的x坐标
   * @param sy 源的Y坐标
   * @param sw 从sx开始的宽度
   * @param sh 从sy开始的高度
   */
  public drawImageTo(target: CanvasRenderingContext2D, sx: number, sy: number, sw: number, sh: number): void {
    let offset = 0
    for (let i = 0; i < this.ctxList.length; i++) {
      const can = this.canList[i]
      // 如果区域不重合，则跳出本块
      if (Math.abs(sx + sw / 2 - offset - can.width / 2) >= sw / 2 + can.width / 2) {
        offset += can.width
        continue
      }
      const rsx = offset < sx ? sx - offset : 0
      const rsw = offset + can.width >= sx + sw ? sx + sw - offset : can.width - rsx

      const dx = ((rsx + offset - sx) / sw) * target.canvas.width
      const dw = (rsw / sw) * target.canvas.width
      target.drawImage(can, rsx, 0, rsw, this.height, dx, 0, dw, target.canvas.clientHeight)
      offset += can.width
    }
  }
}
