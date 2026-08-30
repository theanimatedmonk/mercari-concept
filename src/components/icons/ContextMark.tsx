import Icon, { type IconProps } from '../Icon';

type Props = Omit<IconProps, 'viewBox' | 'children'>;

export default function ContextMark(props: Props) {
  return (
    <Icon viewBox="0 0 16 16" size="sm" {...props}>
      <circle cx="8" cy="8" r="4.25" strokeWidth="1.25" />
    </Icon>
  );
}
