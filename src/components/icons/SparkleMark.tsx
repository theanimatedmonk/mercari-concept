import Icon, { type IconProps } from '../Icon';

type Props = Omit<IconProps, 'viewBox' | 'children'>;

export default function SparkleMark(props: Props) {
  return (
    <Icon viewBox="0 0 16 16" size="sm" {...props}>
      <path
        d="M8 1.5l1.1 3.4L12.5 6 9.1 7.1 8 10.5 6.9 7.1 3.5 6l3.4-1.1L8 1.5z"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </Icon>
  );
}
