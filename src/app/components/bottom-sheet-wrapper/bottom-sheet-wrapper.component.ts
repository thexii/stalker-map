import { Component, ElementRef, EventEmitter, HostListener, Output, ViewChild, ViewContainerRef } from "@angular/core";

@Component({
    selector: 'app-bottom-sheet-wrapper',
    standalone: true,
    imports: [],
    templateUrl: './bottom-sheet-wrapper.component.html',
    styleUrl: './bottom-sheet-wrapper.component.scss'
})

export class BottomSheetWrapperComponent {
    @Output() close = new EventEmitter<void>();
    @ViewChild('dynamicContent', { read: ViewContainerRef }) contentContainer!: ViewContainerRef;
    public isVisible: boolean = false;

    private parentStyles: CSSStyleDeclaration;
    public parentHeight: number;
    public parentMaxHeight: number;

    public startY = 0;
    public isDragging = false;

    readonly closeHeight = 10;
    private closePosition: number = 100;

    private delta: number = 0;
    private currentPosition: number = 0;

    public onTouchStart(event: TouchEvent): void {
        this.startY = event.touches[0].clientY;
        let parent = (event.touches[0].target as HTMLElement).closest('.sheet-container');

        if (parent) {
            this.parentStyles = window.getComputedStyle(parent);
            this.parentHeight = parseFloat(this.parentStyles.height)
            this.parentMaxHeight = parseFloat(this.parentStyles.maxHeight)
        }

        this.closePosition = window.innerHeight * this.closeHeight / 100;

        this.isDragging = true;
    }

    @HostListener('document:touchmove', ['$event'])
    public onTouchMove(event: TouchEvent): void {
        if (!this.isDragging) return;

        this.delta = event.touches[0].clientY - this.startY;

        if (this.parentHeight < this.parentMaxHeight && this.currentPosition + this.delta < 0) {
            this.delta = 0 - this.currentPosition;
        }
    }

    @HostListener('document:touchend')
    public onTouchEnd(): void {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.currentPosition = this.currentPosition + this.delta;
        this.delta = 0;

        if (this.parentHeight - this.currentPosition <= this.closePosition) {
            this.closeSheet();
        }
    }

    public closeSheet(): void {
        this.isVisible = false;
        this.close.emit();
        this.contentContainer.clear();
    }

    public show(): void {
        this.isVisible = true;
        this.currentPosition = 0;
        this.delta = 0;
    }

    get transformStyle(): string {
        return `translateY(${this.currentPosition + this.delta}px)`;
    }
}