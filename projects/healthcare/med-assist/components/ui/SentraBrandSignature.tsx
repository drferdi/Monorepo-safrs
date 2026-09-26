interface SentraBrandSignatureProps {
  title: string;
  subtitle: string;
  meta?: string;
  align?: 'center' | 'left';
}

export function SentraBrandSignature({
  title,
  subtitle,
  meta,
  align = 'center',
}: SentraBrandSignatureProps): JSX.Element {
  return (
    <div className={`title-group ${align === 'left' ? 'title-group--left' : ''}`}>
      <div className="brand-signature">
        <div className="brand-signature__copy">
          <h1 className="card-title-main">{title}</h1>
          <p className="card-title-sub">{subtitle}</p>
          {meta ? <p className="brand-signature__meta text-small mt-1">{meta}</p> : null}
        </div>
      </div>
    </div>
  );
}
