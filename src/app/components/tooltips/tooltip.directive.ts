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
  private tooltipDirective: any;

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

    if (event.clientX + this.tooltipDirective.clientWidth + 100 < document.body.clientWidth) {
      this.componentRef.location.nativeElement.style.left = event.clientX + 10 + 'px';
    }
    else {
      this.componentRef.location.nativeElement.style.left = (event.clientX - this.tooltipDirective.clientWidth - 50) + 'px';
      //console.log(this.tooltipDirective.clientHeight);
      //console.log(this.tooltipDirective.clientWidth);
    }

    if (event.clientY + this.tooltipDirective.clientHeight + 100 < document.body.clientHeight) {
      this.componentRef.location.nativeElement.style.top = event.clientY + 'px';
    }
    else {
      this.componentRef.location.nativeElement.style.top = event.clientY - this.tooltipDirective.clientHeight - 50 + 'px';
    }

    //console.log(,document.body.clientHeight)
  }

  private createTooltip(): void {
    const factory = this.resolver.resolveComponentFactory(this.componentType);

    this.componentRef = this.viewContainerRef.createComponent(factory);
    document.body.appendChild(this.componentRef.location.nativeElement);
    this.componentRef.location.nativeElement.style.position = 'absolute';
    this.componentRef.location.nativeElement.style.maxWidth = `${this.tooltipWidth}px`;

    this.hasTooltip = true;

    this.tooltipDirective = this.componentRef.location.nativeElement.querySelector('.tooltip-directive');

    if (this.tooltipDirective) {
      this.tooltipDirective.classList.add('tooltip-show');
    }

    if (this.componentData) {
      Object.assign(this.componentRef.instance, this.componentData);
    }
  }
}
