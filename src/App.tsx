import React from 'react';
import MemeEditor from './components/MemeEditor';
import { ConfigProvider } from 'antd';

const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
        },
      }}
    >
      <div className="App">
        <MemeEditor />
      </div>
    </ConfigProvider>
  );
};

export default App;
