import Icon, { type IconProps } from '../Icon';

type Props = Omit<IconProps, 'viewBox' | 'children'>;

export default function DownloadMark(props: Props) {
  return (
    <Icon viewBox="0 0 24 24" size="sm" {...props}>
      <path d="M12 15V3" strokeWidth="2" strokeLinecap="round" />
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeWidth="2" strokeLinecap="round" />
      <path d="m7 10 5 5 5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  );
}
