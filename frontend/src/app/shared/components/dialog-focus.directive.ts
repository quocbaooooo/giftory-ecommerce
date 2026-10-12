import { AfterViewInit, Directive, ElementRef, HostListener, OnDestroy, inject } from '@angular/core';

@Directive({ selector: '[appDialogFocus]', standalone: true })
export class DialogFocusDirective implements AfterViewInit, OnDestroy {
  private element: ElementRef<HTMLElement> = inject(ElementRef);
  private previous = document.activeElement as HTMLElement | null;
  private overflow = document.body.style.overflow;
  private focusable() {
    return Array.from(this.element.nativeElement.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]'));
  }
  ngAfterViewInit() {
    document.body.style.overflow = 'hidden';
    this.focusable()[0]?.focus();
  }
  @HostListener('keydown', ['$event']) onKey(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const elements = this.focusable();
    const first = elements[0], last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  ngOnDestroy() { document.body.style.overflow = this.overflow; this.previous?.focus(); }
}
