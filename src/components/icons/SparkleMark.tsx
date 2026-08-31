import Icon, { type IconProps } from '../Icon';

type Props = Omit<IconProps, 'viewBox' | 'children'>;

export default function SparkleMark(props: Props) {
  return (
    <Icon viewBox="0 0 16 16" size="md" {...props}>
<path d="M8 2L9.08934 4.41193C9.59034 5.52122 10.4788 6.40966 11.5881 6.91066L14 8L11.5881 9.08934C10.4788 9.59034 9.59034 10.4788 9.08934 11.5881L8 14L6.91066 11.5881C6.40966 10.4788 5.52122 9.59034 4.41193 9.08934L2 8L4.41193 6.91066C5.52122 6.40966 6.40966 5.52122 6.91066 4.41193L8 2Z" fill="url(#paint0_linear_6232_44946)"/>
<defs>
<linearGradient id="paint0_linear_6232_44946" x1="5.09677" y1="4.12903" x2="10.129" y2="14" gradientUnits="userSpaceOnUse">
<stop stop-color="#B352D1"/>
<stop offset="1" stop-color="#175ED4"/>
</linearGradient>
</defs>
    </Icon>
  );
}
