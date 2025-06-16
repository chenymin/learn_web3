import { AuthProvider } from './AuthProvider';
import LoginForm from './LoginForm';
import Profile from './Profile';

const App = () => {
  console.log('🐻 App component rendered');
  return (
    <AuthProvider>
      <div style={{ padding: '20px' }}>
        <h1>React useReducer 示例 - 登录状态管理测试</h1>
        <div style={{ marginBottom: '20px' }}>
          <LoginForm />
        </div>
        <div>
          <Profile />
        </div>
      </div>
    </AuthProvider>
  );
};
App.whyDidYouRender = true;
export default App;
