import { useState } from 'react';
const App = () => {
  const [data, setData] = useState({ info: '测试数据' });
  console.log('🐻 App component rendered');
  return (
    <div>
      <h1
        className="text-3xl font-bold underline"
        onClick={() => {
          setData({ info: '测试数据' });
        }}
      >
        {data.info}
      </h1>
    </div>
  );
};
App.whyDidYouRender = true;
export default App;
