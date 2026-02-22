import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { buildLoginPath, getPathWithSearchAndHash } from '@/lib/loginNavigation';
import MySectionLayout from '../components/layout/MySectionLayout';
import { useAuthStore } from '../stores/authStore';

const MyPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [displayName, setDisplayName] = React.useState('');
  const [reloadToken, setReloadToken] = React.useState(0);

  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const initialized = useAuthStore((state) => state.initialized);
  const syncSession = useAuthStore((state) => state.syncSession);
  const updateDisplayName = useAuthStore((state) => state.updateDisplayName);
  const loginPath = React.useMemo(
    () => buildLoginPath(getPathWithSearchAndHash(location)),
    [location]
  );

  React.useEffect(() => {
    const loadMe = async () => {
      setError(null);
      try {
        if (!initialized) {
          await syncSession();
        }
        const nextUser = useAuthStore.getState().user;
        if (!nextUser) {
          navigate(loginPath, { replace: true });
          return;
        }
        setDisplayName(nextUser.displayName ?? '');
      } catch (err) {
        const msg = err instanceof Error ? err.message : '사용자 정보를 불러오지 못했습니다.';
        setError(msg);
      }
    };

    void loadMe();
  }, [initialized, loginPath, navigate, reloadToken, syncSession]);

  const onSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = displayName.trim();
    if (trimmed.length < 1 || trimmed.length > 60) {
      setError('이름은 1~60자로 입력하세요.');
      setSuccessMessage(null);
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      const nextUser = await updateDisplayName(trimmed);
      setDisplayName(nextUser.displayName ?? '');
      setSuccessMessage('내 정보를 저장했습니다.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '내 정보 저장에 실패했습니다.';
      if (msg.includes('만료')) {
        navigate(loginPath, { replace: true });
        return;
      }
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const actionButton = !isLoading && !error ? (
    <Button type="submit" form="my-profile-form" disabled={isSaving}>
      {isSaving ? '저장 중...' : '내 정보 수정'}
    </Button>
  ) : undefined;

  return (
    <MySectionLayout
      title="마이페이지"
      description="내 계정 정보를 확인하고 수정할 수 있습니다."
      action={actionButton}
    >
      {isLoading ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-64" />
          </CardContent>
        </Card>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>{error}</span>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setReloadToken((prev) => prev + 1)}>
                다시 시도
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(loginPath)}>
                로그인
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardContent className="space-y-5 p-6">
            <form id="my-profile-form" className="space-y-4" onSubmit={onSaveProfile}>
              <div className="space-y-2">
                <Label htmlFor="displayName">이름</Label>
                <Input
                  id="displayName"
                  maxLength={60}
                  placeholder="이름"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </div>
            </form>
            {successMessage ? (
              <Alert>
                <AlertTitle>완료</AlertTitle>
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            ) : null}
            <div>
              <p className="text-sm text-muted-foreground">이메일</p>
              <div className="text-base font-semibold text-foreground">{user?.email || '-'}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </MySectionLayout>
  );
};

export default MyPage;
