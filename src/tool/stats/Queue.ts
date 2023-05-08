/** 定长队列 */
export class Queue<T> {
  /** 元素 */
  private _elements: Array<T>
  /** 容量 */
  private _size: number | null

  /**
   * @param size 队列长度
   */
  public constructor(cap: number) {
    this._elements = new Array<T>()
    this._size = cap
  }
  /**
   * 装入对象
   * @param item 装入对象
   * @returns 顶出的元素
   */
  public push(item: T): T | null {
    let out = null
    if (this._size == this._elements.length) {
      out = this._elements.pop()
    }
    this._elements.unshift(item)
    return out
  }

  /**
   * 查看最后添加的元素，不对队列进行修改
   * @returns T 最后一个元素
   */
  public peek(): T | null {
    return this._elements[0]
  }

  /**
   * 查看队列元素数量
   * @returns 内部元素实际数量
   */
  public size(): number {
    return this._elements.length
  }

  /***
   * 查看队列容量
   */
  public cap(): number {
    return this._size
  }
  /**
   * 清空队列内元素
   */
  public clear() {
    delete this._elements
    this._elements = new Array<T>()
  }
}
