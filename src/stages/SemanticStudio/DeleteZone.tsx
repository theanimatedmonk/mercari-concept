import DeleteMark from '../../components/DeleteMark';

type Props = {
  active: boolean;
  highlighted?: boolean;
};

export default function DeleteZone({ active, highlighted }: Props) {
  return (
    <div
      className={`delete-zone${active ? ' is-active' : ''}${
        highlighted ? ' is-coach-target' : ''
      }`}
      data-coach-target="delete"
      aria-label="Not relevant"
    >
      <DeleteMark hover={active} />
      <h2>Not relevant</h2>
    </div>
  );
}
