/* eslint-disable @typescript-eslint/no-unused-vars */
import { WaveFormAttr, WaveFormOptions } from './WaveFormCommon'

class WaveFormGridLayer {
  private options: WaveFormOptions
  private attr: WaveFormAttr
  constructor(options: WaveFormOptions, attr: WaveFormAttr) {
    this.options = options
    this.attr = attr
  }
  //
  public setViewRange(_min: number, _max: number) {
    //TODO draw grid
  }
  public setViewStartEnd(_start: number, _end: number) {
    //TODO draw grid
  }
  public setSuspend(_isSuspend: boolean) {
    //TODO show state
  }
}
export { WaveFormGridLayer }
