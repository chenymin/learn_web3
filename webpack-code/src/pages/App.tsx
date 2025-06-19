// import { useImmer } from '@hooks/useImmer';
// const App = () => {
//   const [data, setData] = useImmer({ info: '测试数据' });
//   const [arr, setArr] = useImmer([
//     {
//       id: 1,
//       name: '111',
//     },
//     {
//       id: 2,
//       name: '111343434',
//     },
//   ]);
//   console.log('🐻 App component rendered');
//   return (
//     <div>
//       <h1
//         className="text-3xl font-bold underline"
//         onClick={() => {
//           setData(draft => {
//             draft.info = '更新测试数据';
//           });
//           setArr(draft => {
//             draft[1].name = '54545454';
//           });
//         }}
//       >
//         {data.info}
//       </h1>
//       <h2>{arr[1].name}</h2>
//     </div>
//   );
// };
// App.whyDidYouRender = true;
// export default App;

import { useRoutes } from 'react-router-dom';
import routes from '@/routes/index';

const App = () => {
  const routing = useRoutes(routes);
  return <>{routing}</>;
};
export default App;
