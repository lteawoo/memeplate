import React from 'react';
import { Alert, Button, Card, Spin, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import MySectionLayout from '../components/layout/MySectionLayout';
import { fetchAuthMeWithRefresh } from '../lib/apiFetch';
const { Text } = Typography;

type AuthUser = {
  id: string;
  email: string | null;
  displayName: string | null;
};

type AuthMeResponse = {
  authenticated: boolean;
  user?: AuthUser;
};

const MyPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<AuthUser | null>(null);

  React.useEffect(() => {
    const loadMe = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const payload = (await fetchAuthMeWithRefresh()) as AuthMeResponse;
        if (!payload.authenticated || !payload.user) {
          navigate('/');
          return;
        }
        setUser(payload.user);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '사용자 정보를 불러오지 못했습니다.';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };

    void loadMe();
  }, [navigate]);

  return (
    <MySectionLayout
      title="마이페이지"
      description="내 계정 정보와 밈플릿 관리 메뉴입니다."
    >
      {isLoading ? (
        <div className="py-20 text-center"><Spin size="large" /></div>
      ) : error ? (
        <Alert
          type="error"
          message={error}
          action={<Button size="small" type="primary" onClick={() => navigate('/login')}>로그인</Button>}
        />
      ) : (
        <Card>
          <div className="flex flex-col gap-4">
            <div>
              <Text type="secondary">이름</Text>
              <div className="text-base font-semibold text-slate-800">{user?.displayName || '-'}</div>
            </div>
            <div>
              <Text type="secondary">이메일</Text>
              <div className="text-base font-semibold text-slate-800">{user?.email || '-'}</div>
            </div>
            <div className="pt-2">
              <Button type="primary" onClick={() => navigate('/my/templates')}>내 밈플릿 관리</Button>
            </div>
          </div>
        </Card>
      )}
    </MySectionLayout>
  );
};

export default MyPage;
