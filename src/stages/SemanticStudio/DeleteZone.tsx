import { Trash2 } from 'lucide-react';

type Props = {
  active: boolean;
};

export default function DeleteZone({ active }: Props) {
  return (
    <div className={`delete-zone${active ? ' is-active' : ''}`}>
      <Trash2 size={16} />
      <h2>Not relevant</h2>
    </div>
  );
}
