interface CardProps {
  children: React.ReactNode;
  className?: string;
  gold?: boolean;
}

export function Card({ children, className = '', gold = false }: CardProps) {
  return (
    <div
      className={`bg-[#0f0f12] border rounded-[10px] ${
        gold ? 'border-[#F5C34440]' : 'border-[#1a1a1f]'
      } ${className}`}
    >
      {children}
    </div>
  );
}
