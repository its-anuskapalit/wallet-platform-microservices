import { Component, input } from '@angular/core';

/** Reusable shimmer block; uses global `.skeleton` from styles.scss. */
@Component({
  selector: 'app-skeleton-block',
  standalone: true,
  template: `
    <div
      class="skeleton"
      [style.width]="w()"
      [style.height]="h()"
      [style.border-radius]="radius()"
      [style.margin-bottom]="mb()"></div>
  `,
  styles: [`:host { display: block; }`]
})
export class SkeletonBlockComponent {
  w = input<string>('100%');
  h = input<string>('16px');
  radius = input<string>('8px');
  mb = input<string>('0');
}
