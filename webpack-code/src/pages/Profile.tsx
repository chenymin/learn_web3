import React, { useContext } from 'react';
import { AuthContext, AuthContextType } from './AuthProvider';

function Profile(): React.ReactElement {
  const context = useContext(AuthContext);
  
  // 类型保护：确保 context 不为 undefined
  if (!context) {
    throw new Error('Profile must be used within an AuthProvider');
  }
  
  const { state, dispatch }: AuthContextType = context;

  if (!state.isLoggedIn) {
    return <p>请先登录</p>;
  }

  const handleLogout = (): void => {
    dispatch({ type: 'logout' });
  };

  return (
    <div>
      <h2>欢迎回来，{state.username}！</h2>
      <button onClick={handleLogout} disabled={state.isLoading}>
        退出登录
      </button>
    </div>
  );
}

export default Profile;