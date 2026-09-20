const SCAN_COLS = 12;
const SCAN_ROWS = 16;
const COMPACT_COLS = 5;
const COMPACT_ROWS = 5;

type Props = {
  label?: string;
  compact?: boolean;
};

export default function ScanOverlay({ label, compact = false }: Props) {
  const cols = compact ? COMPACT_COLS : SCAN_COLS;
  const rows = compact ? COMPACT_ROWS : SCAN_ROWS;
  const dots = cols * rows;

  return (
    <div className={`product-card__scan${compact ? ' is-compact' : ''}`} aria-hidden>
      <div
        className="product-card__scan-grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {Array.from({ length: dots }, (_, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const delay = ((col * 0.09 + row * 0.06) % 2.2).toFixed(2);
          return (
            <span
              key={i}
              className="product-card__scan-dot"
              style={{ animationDelay: `${delay}s` }}
            />
          );
        })}
      </div>
      {label && !compact ? (
        <p className="product-card__scan-label">
          {label}
          <span className="product-card__ellipsis">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </p>
      ) : null}
    </div>
  );
}
