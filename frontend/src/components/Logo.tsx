import { TriangleAlert } from 'lucide-react';

export default function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <div className={`logo logo-${size}`}>
      <span className="logo-mark" aria-hidden="true">
        <TriangleAlert />
      </span>
      <span className="logo-text">
        Road<strong>Alert</strong>
      </span>
    </div>
  );
}
