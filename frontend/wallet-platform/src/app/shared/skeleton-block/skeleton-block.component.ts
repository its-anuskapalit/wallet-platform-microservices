import { Component, input } from '@angular/core';

/** Reusable shimmer block; uses global `.skeleton` from styles.scss. */
@Component({
  selector: 'app-skeleton-block',
  standalone: true,
  templateUrl: './skeleton-block.component.html',
  styleUrls: ['./skeleton-block.component.scss']
})
export class SkeletonBlockComponent {
  w = input<string>('100%');
  h = input<string>('16px');
  radius = input<string>('8px');
  mb = input<string>('0');
}
