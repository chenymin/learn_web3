import Loading from '@components/common/Loading';
import PageNotFoundView from '@components/common/PageNotFoundView';
import MainLayout from '@/layouts/Layout';
import DappTest from '@pages/DappTest';
import Home from '@pages/Home';
import { lazy, Suspense } from 'react';
import { RouteObject } from 'react-router-dom';
const Layout = () => (
  <Suspense fallback={<Loading />}>
    <MainLayout />
  </Suspense>
);

const Test = lazy(() => import('@components/common/Test'));
const Routes: RouteObject[] = [];

const mainRoutes = {
  path: '/',
  element: <Layout />,
  children: [
    { path: '*', element: <PageNotFoundView /> },
    { path: '/dapp', element: <DappTest /> },
    { path: '/', element: <Home /> },
    { path: '404', element: <PageNotFoundView /> },
  ],
};

const DemoRoutes = {
  path: 'yideng',
  element: <Layout />,
  children: [{ path: 'test', element: <Test /> }],
};

Routes.push(mainRoutes, DemoRoutes);

export default Routes;
