import Icon, { type IconProps } from '../Icon';
import './LockMark.css';

type Props = Omit<IconProps, 'viewBox' | 'children'> & {
  filled?: boolean;
};

export default function LockMark({ filled = false, className, ...props }: Props) {
  return (
    <Icon
      viewBox="0 0 24 24"
      size="sm"
      className={['lock-mark', filled ? 'lock-mark--filled' : '', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      <rect
        className="lock-mark__body"
        width="18"
        height="11"
        x="3"
        y="11"
        rx="2"
        ry="2"
        strokeWidth="2"
      />
      <path
        className="lock-mark__shackle"
        d="M7 11V7a5 5 0 0 1 10 0v4"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Icon>
  );
}
