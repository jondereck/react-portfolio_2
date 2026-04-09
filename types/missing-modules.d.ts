declare module '@base-ui/react/merge-props' {
  export function mergeProps<T>(...props: T[]): T;
}

declare module '@base-ui/react/use-render' {
  export namespace useRender {
    type ComponentProps<T extends keyof JSX.IntrinsicElements> = JSX.IntrinsicElements[T] & {
      render?: unknown;
    };
  }
  export function useRender<T>(options: T): T;
}

declare module '@base-ui/react/button' {
  export namespace Button {
    type Props = React.ButtonHTMLAttributes<HTMLButtonElement>;
  }
  export const Button: React.ComponentType<Button.Props>;
}

declare module '@base-ui/react/dialog' {
  export const Dialog: any;
}

declare module 'class-variance-authority' {
  export type VariantProps<T> = Record<string, unknown>;
  export function cva(base?: string, config?: unknown): (props?: Record<string, unknown>) => string;
}

declare module 'clsx' {
  export type ClassValue = string | number | boolean | null | undefined | Record<string, boolean> | ClassValue[];
  export function clsx(...inputs: ClassValue[]): string;
}

declare module 'tailwind-merge' {
  export function twMerge(...classLists: string[]): string;
}
