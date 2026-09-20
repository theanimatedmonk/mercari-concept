import Icon, { type IconProps } from '../Icon';

type Props = Omit<IconProps, 'viewBox' | 'children'>;

export default function ChevronLeftMark(props: Props) {
  return (
    <Icon viewBox="0 0 24 24" size="sm" {...props}>
      <path d="m15 18-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  );
}
