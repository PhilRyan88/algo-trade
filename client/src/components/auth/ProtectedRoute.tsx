import { Navigate, useLocation } from 'react-router-dom';
import { useCheckStatusQuery } from '../../features/auth/authApiSlice';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError } = useCheckStatusQuery();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (isError || !data?.isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
