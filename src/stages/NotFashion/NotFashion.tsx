import './NotFashion.css';

type Props = {
  onTryAgain: () => void;
};

export default function NotFashion({ onTryAgain }: Props) {
  return (
    <section className="not-fashion">
      <div className="not-fashion__sheet">
        <h1 className="not-fashion__title">This doesn't seem to be related to fashion.</h1>
        <button type="button" className="not-fashion__cta" onClick={onTryAgain}>
          Try again
        </button>
      </div>
    </section>
  );
}
