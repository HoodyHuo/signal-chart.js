import { Event, EventDispatcher } from 'three'

/**
 *事件装饰器
 * 通过对要调用的函数进行修饰，触发广播事件
 * @param target 触发事件的对象
 * @param propertyKey
 * @param descroptor 被调用的函数
 */
export const EmitEvent = (
  target: FreqChangeable,
  propertyKey: string,
  descroptor: TypedPropertyDescriptor<(...args: any[]) => any>,
) => {
  const method = descroptor.value
  descroptor.value = function (...args: any[]) {
    const _this = this as FreqChangeable
    const result = method?.apply(_this, args)
    if (!args[method.length]) {
      _this.dispatchEvent({
        type: method.name,
        args: args,
      })
    }
    return result
  }
}

/**
 * 被观察接口，需要连接的方法都写在这里，并手动实现
 * 注意：
 * 1. 使用装饰器的函数需要在这个接口添加
 * 2. 还需要在下方注册事件的地方添加监听和取消（以方法名为KEY） TODO 换成遍历 此接口
 * TODO 增加鼠标停留频率事件
 */
export interface FreqChangeable extends EventDispatcher {
  setFreqRange(startFreq: number, endFreq: number): void
  setViewFreqRange(startFreq: number, endFreq: number): void
  setViewLevelRange(lowLevel: number, highLevel: number): void
}

/**
 * 事件连接器，用于连接频谱、语图等的操作事件同步
 */
export class ConnectorGroup {
  /** 连接在一起的成员 */
  private members: Set<FreqChangeable>
  /** 是否执行监听 */
  private isStop: boolean

  /**
   * 构造连接器
   * 连接成员可以构造添加，也可以后续增删
   * @param members 需要连接在一起的图谱
   */
  constructor(...members: FreqChangeable[]) {
    this.members = new Set<FreqChangeable>()
    this.isStop = false
    this.connect(...members)
  }

  /**
   * 添加更多图谱一起连接
   * @param members 需要连接在一起的图谱
   */
  public connect(...members: FreqChangeable[]) {
    for (let i = 0; i < members.length; i++) {
      members[i].addEventListener('setViewFreqRange', this.onEvent.bind(this))
      members[i].addEventListener('setFreqRange', this.onEvent.bind(this))
      members[i].addEventListener('setViewLevelRange', this.onEvent.bind(this))
      this.members.add(members[i])
    }
  }

  /**
   * 断开连接
   * @param members 需要移除连接群组的图谱
   */
  public disconnect(...members: FreqChangeable[]) {
    for (let i = 0; i < members.length; i++) {
      members[i].removeEventListener('setViewFreqRange', this.onEvent.bind(this))
      members[i].removeEventListener('setFreqRange', this.onEvent.bind(this))
      members[i].removeEventListener('setViewLevelRange', this.onEvent.bind(this))
      this.members.delete(members[i])
    }
  }

  /** 暂时停止 事件连接 */
  public stop() {
    this.isStop = true
  }
  /** 开始时间连接 */
  public start() {
    this.isStop = false
  }

  /**
   * @param event 上报事件
   */
  private onEvent(event: Event): void {
    //判断如果暂停则不广播
    if (this.isStop) {
      return
    }
    this.members.forEach((gram) => {
      //排除当前对象本身
      if (event.target != gram) {
        // 提取参数
        const args = event.args as any[]
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore 特殊使用
        gram[event.type](...args, true) // 直接调用函数，并增加ture作为尾缀，便于装饰器判断是否触发广播
      }
    })
  }
}
