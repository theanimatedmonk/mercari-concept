import type { CSSProperties, SVGAttributes } from 'react';
import './Icon.css';

export type IconSize = 'sm' | 'md' | 'lg';

export interface IconProps extends SVGAttributes<SVGSVGElement> {
  children: React.ReactNode;
  viewBox: string;
  size?: IconSize;
  fill?: string;
  stroke?: string;
  label?: string;
}

export default function Icon({
  size = 'md',
  fill = 'none',
  stroke = 'currentColor',
  viewBox,
  label,
  className,
  children,
  style,
  ...rest
}: IconProps) {
  const iconStyle = {
    '--icon-fill': fill,
    '--icon-stroke': stroke,
    ...style,
  } as CSSProperties;

  return (
    <svg
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      className={['icon', `icon--${size}`, className].filter(Boolean).join(' ')}
      style={iconStyle}
      {...rest}
    >
      {children}
    </svg>
  );
}
