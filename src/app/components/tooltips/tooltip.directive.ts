import { ComponentRef, Directive, ElementRef, HostListener, Input, NgZone, OnDestroy, Renderer2, ViewContainerRef } from '@angular/core';

@Directive({
  selector: '[tooltip]',
  standalone: true
})
export class TooltipDirective implements OnDestroy {
  @Input('component') componentType!: any;
  @Input('componentData') componentData!: any;

  private componentRef: ComponentRef<any> | null = null;
  private unlistenListeners: (() => void)[] = [];

  constructor(
    private viewContainerRef: ViewContainerRef,
    private elementRef: ElementRef,
    private renderer: Renderer2,
    private ngZone: NgZone
  ) { }

  @HostListener('mouseenter')
  onMouseEnter() {
    this.createTooltip();

    // Запускаємо слухачі ПОЗА зоною Angular, щоб рух миші не "фрізив" карту
    this.ngZone.runOutsideAngular(() => {
      const move = this.renderer.listen('window', 'mousemove', (event: MouseEvent) => {
        this.updatePosition(event);
      });
      this.unlistenListeners.push(move);
    });
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    this.destroyTooltip();
  }

  private updatePosition(event: MouseEvent) {
    if (!this.componentRef) return;

    const el = this.componentRef.location.nativeElement;
    // Використовуємо Renderer2 для прямої маніпуляції, минаючи Change Detection
    this.renderer.setStyle(el, 'left', `${event.clientX + 15}px`);
    this.renderer.setStyle(el, 'top', `${event.clientY + 15}px`);
    this.renderer.addClass(el, 'tooltip-show');
  }

  private createTooltip() {
    this.componentRef = this.viewContainerRef.createComponent(this.componentType);
    Object.assign(this.componentRef.instance, this.componentData);

    const node = this.componentRef.location.nativeElement;
    this.renderer.setStyle(node, 'position', 'fixed');
    this.renderer.setStyle(node, 'z-index', '1000');
    this.renderer.setStyle(node, 'pointer-events', 'none');

    document.body.appendChild(node);
    this.componentRef.changeDetectorRef.detectChanges();
  }

  private destroyTooltip() {
    this.unlistenListeners.forEach(fn => fn());
    this.unlistenListeners = [];
    if (this.componentRef) {
      this.componentRef.destroy();
      this.componentRef = null;
    }
  }

  ngOnDestroy() {
    this.destroyTooltip();
  }
}