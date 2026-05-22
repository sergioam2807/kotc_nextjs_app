interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Borde con tinte del color accent (amarillo) */
  accent?: boolean;
}

export function Card({ children, className = '', accent = false }: CardProps) {
  return (
    <div
      className={`bg-surface-container-low border rounded-lg ${
        accent ? 'border-accent/20' : 'border-outline-variant'
      } ${className}`}
    >
      {children}
    </div>
  );
}
