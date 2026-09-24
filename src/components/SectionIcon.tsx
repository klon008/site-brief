import {
  Archive,
  Building2,
  LayoutList,
  MessageCircle,
  Palette,
  Puzzle,
  Target,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

const SECTION_ICONS: Record<string, LucideIcon> = {
  company: Building2,
  goal: Target,
  clients: Users,
  oldsite: Archive,
  design: Palette,
  content: LayoutList,
  features: Puzzle,
  tech: Wrench,
  budget: Wallet,
  open: MessageCircle,
};

interface Props {
  id: string;
  size?: number;
  className?: string;
}

export default function SectionIcon({ id, size = 24, className }: Props) {
  const Icon = SECTION_ICONS[id];
  return Icon ? <Icon size={size} className={className} /> : null;
}
