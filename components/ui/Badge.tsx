'use client';

type BadgeVariant = 'gold' | 'blue' | 'green' | 'red' | 'purple' | 'neutral' | 'king' | 'libre' | 'rival';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  gold: 'bg-[#F5C34420] text-[#F5C344]',
  blue: 'bg-[#378ADD20] text-[#378ADD]',
  green: 'bg-[#1D9E7520] text-[#1D9E75]',
  red: 'bg-[#E24B4A20] text-[#E24B4A]',
  purple: 'bg-[#7F77DD20] text-[#7F77DD]',
  neutral: 'bg-[#1e1e24] text-[#666]',
  king: 'bg-[#F5C34420] text-[#F5C344]',
  libre: 'bg-[#1a2a1a] text-[#5a9e5a]',
  rival: 'bg-[#E24B4A20] text-[#E24B4A]',
};

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-[4px] ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
