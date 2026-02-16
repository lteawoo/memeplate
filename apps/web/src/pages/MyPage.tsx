import React from 'react';
import { Alert, Button, Card, Form, Input, Spin, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import MySectionLayout from '../components/layout/MySectionLayout';
import { apiFetch, fetchAuthMeWithRefresh } from '../lib/apiFetch';
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
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<{ displayName: string }>();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
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
        form.setFieldsValue({ displayName: payload.user.displayName ?? '' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '사용자 정보를 불러오지 못했습니다.';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };

    void loadMe();
  }, [form, navigate]);

  const onSaveProfile = async (values: { displayName: string }) => {
    setIsSaving(true);
    try {
      const res = await apiFetch('/api/v1/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: values.displayName.trim() })
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message || '내 정보 저장에 실패했습니다.');
      }

      const payload = (await res.json()) as AuthMeResponse;
      if (!payload.authenticated || !payload.user) {
        navigate('/');
        return;
      }

      setUser(payload.user);
      form.setFieldsValue({ displayName: payload.user.displayName ?? '' });
      messageApi.success('내 정보를 저장했습니다.');
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : '내 정보 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MySectionLayout
      title="마이페이지"
      description="내 계정 정보를 확인하고 수정할 수 있습니다."
    >
      {contextHolder}
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
            <Form
              form={form}
              layout="vertical"
              onFinish={(values) => {
                void onSaveProfile(values);
              }}
            >
              <Form.Item
                label="이름"
                name="displayName"
                rules={[
                  { required: true, message: '이름을 입력하세요.' },
                  { min: 1, max: 60, message: '이름은 1~60자로 입력하세요.' }
                ]}
              >
                <Input maxLength={60} placeholder="이름" />
              </Form.Item>
              <Form.Item className="!mb-0">
                <Button htmlType="submit" type="primary" loading={isSaving}>
                  내 정보 수정
                </Button>
              </Form.Item>
            </Form>
            <div>
              <Text type="secondary">이메일</Text>
              <div className="text-base font-semibold text-slate-800">{user?.email || '-'}</div>
            </div>
          </div>
        </Card>
      )}
    </MySectionLayout>
  );
};

export default MyPage;
