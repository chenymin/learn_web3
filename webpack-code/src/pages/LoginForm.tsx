import React, { useContext, ChangeEvent, FormEvent } from 'react';
import { AuthContext, AuthContextType } from './AuthProvider';

function LoginForm(): React.ReactElement {
  const context = useContext(AuthContext);
  
  // 类型保护：确保 context 不为 undefined
  if (!context) {
    throw new Error('LoginForm must be used within an AuthProvider');
  }
  
  const { state, dispatch }: AuthContextType = context;

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;

    dispatch({
      type: 'update_field',
      field: name as keyof typeof state,
      value,
    });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!state.username || !state.password) {
      dispatch({
        type: 'login_failure',
        error: '用户名或密码不能为空',
      });
      return;
    }

    dispatch({ type: 'login_start' });

    // 模拟异步请求
    setTimeout(() => {
      if (state.username === 'admin' && state.password === '123456') {
        dispatch({
          type: 'login_success',
          payload: { username: state.username },
        });
      } else {
        dispatch({
          type: 'login_failure',
          error: '用户名或密码错误',
        });
      }
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>登录</h2>

      <div>
        <label>
          用户名：
          <input 
            name="username" 
            type="text"
            value={state.username} 
            onChange={handleInputChange} 
            disabled={state.isLoading}
          />
        </label>
      </div>

      <div>
        <label>
          密码：
          <input
            name="password"
            type="password"
            value={state.password}
            onChange={handleInputChange}
            disabled={state.isLoading}
          />
        </label>
      </div>

      {state.error && <p style={{ color: 'red' }}>{state.error}</p>}
      <button type="submit" disabled={state.isLoading}>
        {state.isLoading ? '登录中...' : '登录'}
      </button>
    </form>
  );
}

export default LoginForm;