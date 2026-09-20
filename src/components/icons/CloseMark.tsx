import Icon, { type IconProps } from '../Icon';

type Props = Omit<IconProps, 'viewBox' | 'children'>;

export default function CloseMark(props: Props) {
  return (
    <Icon viewBox="0 0 24 24" size="sm" {...props}>
      <path d="M18 6 6 18" strokeWidth="2" strokeLinecap="round" />
      <path d="m6 6 12 12" strokeWidth="2" strokeLinecap="round" />
    </Icon>
  );
}
