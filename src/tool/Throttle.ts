/**
 * 节流器
 */
export default class Throttle {
  /** 可否执行标志 */
  canRun: boolean
  /** 间隔时间 */
  miles: number
  /**
   * 节流器构造函数
   * @param miles 间隔时间
   */
  constructor(miles: number) {
    this.miles = miles
    this.canRun = true
  }

  /**
   * 执行函数
   * @param fn 执行的函数闭包
   * @returns 是否执行
   */
  public run(fn: () => void): boolean {
    if (!this.canRun) {
      return
    }
    this.canRun = false
    fn.call(null)
    setTimeout(() => {
      this.canRun = true
    }, this.miles)
  }
}
