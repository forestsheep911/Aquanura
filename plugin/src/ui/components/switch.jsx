import React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';

import { cn } from '../lib/utils.js';

const Switch = React.forwardRef(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'inline-flex h-5 w-9 items-center rounded-full border border-border transition-colors data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted',
      className
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        'block h-4 w-4 translate-x-0.5 rounded-full bg-background transition-transform data-[state=checked]:translate-x-4'
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
