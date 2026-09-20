import Icon, { type IconProps } from '../Icon';
import './CheckCircleMark.css';

type Props = Omit<IconProps, 'viewBox' | 'children'>;

export default function CheckCircleMark(props: Props) {
  const { className, ...rest } = props;
  return (
    <Icon
      viewBox="0 0 24 24"
      size="lg"
      fill="currentColor"
      stroke="none"
      className={['check-circle-mark', className].filter(Boolean).join(' ')}
      {...rest}
    >
      <circle className="check-circle-mark__disk" cx="12" cy="12" r="10" />
      <path
        className="check-circle-mark__tick"
        d="m16 9-5.5 5.5L8 12"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Icon>
  );
}
