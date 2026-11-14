const src = `${import.meta.env.BASE_URL}cougar.png`;

export function LogoMark({ className = 'h-9 w-auto' }: { className?: string }) {
  return <img src={src} alt="" aria-hidden="true" className={className} width={600} height={473} />;
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className ?? ''}`}>
      <LogoMark />
      <span className="text-[1.05rem] leading-tight font-bold tracking-tight text-white">East DECA Prep</span>
    </span>
  );
}

export function Credit({ className }: { className?: string }) {
  return (
    <p className={className}>
      by Advik Kashyap
      <br />
      Made for Downingtown East DECA
    </p>
  );
}
