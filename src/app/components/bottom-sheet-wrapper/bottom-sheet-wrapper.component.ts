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

    startY = 0;
    currentTranslateY = 0;
    isDragging = false;

    // Позиції панелі (у відсотках від висоти вікна)
    readonly closedPos = 80;
    readonly maxPosition = 90;
    readonly topPos = 90;
    public contentHeight: number = -1;

    private currentPos = 0;

    public onTouchStart(event: TouchEvent): void {
        this.startY = event.touches[0].clientY;
        this.isDragging = true;
    }

    @HostListener('document:touchmove', ['$event'])
    public onTouchMove(event: TouchEvent): void {
        if (!this.isDragging) return;

        const deltaY = event.touches[0].clientY - this.startY;
        const newTranslate = this.calculatePixelPos(this.currentPos) + deltaY;

        // Забороняємо тягнути вище верхньої межі
        if (newTranslate > this.calculatePixelPos(this.topPos)) {
            this.currentTranslateY = deltaY;
        }
    }

    @HostListener('document:touchend')
    public onTouchEnd(): void {
        if (!this.isDragging) return;
        this.isDragging = false;

        const movedDist = this.currentTranslateY;
        const threshold = 100; // Чутливість перемикання станів
        console.log(this.currentPos)

        if (movedDist > threshold) {
            // Рух вниз
            if (this.currentPos > this.maxPosition) this.currentPos = this.maxPosition;
            else this.close.emit();
        } else if (movedDist < -threshold) {
            // Рух вгору
            this.currentPos = this.topPos;
        }

        this.currentTranslateY = 0; // Скидаємо зміщення, щоб спрацював CSS transition до currentPos
    }

    public calculatePixelPos(percent: number): number {
        return (window.innerHeight * percent) / 100;
    }

    public closeSheet(): void {
        this.isVisible = false;
        this.close.emit();
        this.contentContainer.clear();
    }

    public show(): void {
        this.isVisible = true;
        this.contentHeight = this.contentContainer.element.nativeElement.offsetHeight;
        console.log(this.contentHeight)
    }

    get transformStyle(): string {
        const basePos = this.calculatePixelPos(this.currentPos);
        return `translateY(${basePos + this.currentTranslateY}px)`;
    }
}