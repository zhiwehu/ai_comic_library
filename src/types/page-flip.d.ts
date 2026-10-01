/**
 * page-flip（StPageFlip 2.x）类型声明
 *
 * 上游只发 dist 的 browser JS，不带 .d.ts，所以这里按本项目实际用到的 API 面补一份。
 * 只声明用到的成员，避免给出错误的“全套 API”假象；需要新方法时按官方 README 补。
 */
declare module 'page-flip' {
  /** 事件负载：flip = 当前左页索引，changeOrientation = 方向 */
  export interface PageFlipEventMap {
    flip: { data: number };
    changeOrientation: { data: 'portrait' | 'landscape' };
    init: { data: undefined };
    changeState: { data: 'user_fold' | 'fold_corner' | 'flipping' | 'read' };
  }

  export interface PageFlipSettings {
    /** 页盒基准宽高（px）；配合 size: 'stretch' 自适应缩放 */
    width: number;
    height: number;
    size?: 'fixed' | 'stretch';
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    /** 窄容器自动单页 */
    usePortrait?: boolean;
    /** 首页当封面（单页显示） */
    showCover?: boolean;
    /** 移动端页面内滚动（不劫持纵向滚动） */
    mobileScrollSupport?: boolean;
    maxShadowOpacity?: number;
    flippingTime?: number;
    /** 触发滑动的最小位移（px） */
    swipeDistance?: number;
    /** 起始页（0 基） */
    startPage?: number;
    /** 交给外部点击区处理，禁用内置点击翻页 */
    disableFlipByClick?: boolean;
    drawShadow?: boolean;
    showPageCorners?: boolean;
    useMouseEvents?: boolean;
    autoSize?: boolean;
    clickEventForward?: boolean;
  }

  export class PageFlip {
    constructor(element: HTMLElement, settings?: PageFlipSettings);

    /** 用已有 DOM 子元素建页（本项目走这条路，页面图片自己管懒加载） */
    loadFromHTML(items: NodeListOf<Element> | Element[]): void;

    on<K extends keyof PageFlipEventMap>(
      event: K,
      callback: (e: PageFlipEventMap[K]) => void
    ): void;

    flipNext(corner?: 'top' | 'bottom'): void;
    flipPrev(corner?: 'top' | 'bottom'): void;
    turnToPage(page: number): void;
    turnToNextPage(): void;
    turnToPrevPage(): void;

    getOrientation(): 'portrait' | 'landscape';
    getPageCount(): number;
    getCurrentPageIndex(): number;
    /** 返回**内部实时**配置对象（可读可改）：我们用它临时放开 disableFlipByClick，
     *  绕过 StPageFlip 对 flipPrev() 的角点误判 */
    getSettings(): PageFlipSettings;

    /** 容器尺寸变化后重算 */
    update(): void;
    destroy(): void;
  }
}
