import { Component, ComponentFactoryResolver, ComponentRef, Directive, HostListener, Input, Type, ViewContainerRef } from '@angular/core';

@Directive({
    selector: '[tooltip]',
    standalone: true
})

export class TooltipDirective {
  @Input('component') componentType!: any;
  @Input('componentData') componentData!: any;
  private componentRef: ComponentRef<any>;
  private hasTooltip: boolean = false;
  private tooltipWidth: number = 300;
  private windowMargin: number = 100;
  private tooltipBorder: number = 22;
  private tooltipPadding: number = 16 * 2;

  constructor(
    private resolver: ComponentFactoryResolver,
    private viewContainerRef: ViewContainerRef) {

  }

  @HostListener('mouseover', ['$event']) onMouseHover(event: MouseEvent) {
    if (this.hasTooltip) {
      return;
    }

    this.createTooltip();
  }

  @HostListener('mouseleave') hideTooltip() {
    this.componentRef.destroy();
    this.hasTooltip = false;
  }

  @HostListener('mousemove', ['$event']) moveTooltip(event: any) {
    let toolTipWidth: number = Math.max(this.componentRef.location.nativeElement.clientWidth, this.tooltipWidth + this.tooltipPadding);

    let toolTipHeight: number = 200;
    if (this.componentRef.location.nativeElement.clientHeight > 0) {
      toolTipHeight = this.componentRef.location.nativeElement.clientHeight
    }

    if (event.clientX + toolTipWidth + this.tooltipBorder + this.windowMargin < document.body.clientWidth) {
      this.componentRef.location.nativeElement.style.left = event.clientX + 10 + 'px';
    }
    else {
      this.componentRef.location.nativeElement.style.left = (event.clientX - toolTipWidth - this.tooltipPadding ) + 'px';
    }

    if (event.clientY + toolTipHeight + this.windowMargin < document.body.clientHeight) {
      this.componentRef.location.nativeElement.style.top = event.clientY + 'px';
    }
    else {
      this.componentRef.location.nativeElement.style.top = event.clientY - toolTipHeight - this.windowMargin / 2 + 'px';
    }

    this.componentRef.location.nativeElement.style.display = 'block';
  }

  private createTooltip(): void {
    const factory = this.resolver.resolveComponentFactory(this.componentType);

    this.componentRef = this.viewContainerRef.createComponent(factory);
    document.body.appendChild(this.componentRef.location.nativeElement);
    this.componentRef.location.nativeElement.style.maxWidth = `${this.tooltipWidth}px`;
    this.componentRef.location.nativeElement.style.position = 'absolute';

    this.hasTooltip = true;

    if (this.componentData) {
      Object.assign(this.componentRef.instance, this.componentData);
    }
  }
}
