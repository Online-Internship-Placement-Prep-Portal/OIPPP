import { Navigate, Route, Routes } from 'react-router-dom';
import { HOME_BY_ROLE, useAuth } from './auth/AuthContext';
import RequireRole from './auth/RequireRole';
import Layout from './components/Layout';
import Help from './pages/Help';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Register from './pages/Register';
import Questions from './pages/admin/Questions';
import Settings from './pages/admin/Settings';
import Statistics from './pages/admin/Statistics';
import TestsAdmin from './pages/admin/TestsAdmin';
import Users from './pages/admin/Users';
import Applicants from './pages/recruiter/Applicants';
import ListingForm from './pages/recruiter/ListingForm';
import MyListings from './pages/recruiter/MyListings';
import Applications from './pages/student/Applications';
import Attempt from './pages/student/Attempt';
import Home from './pages/student/Home';
import ListingDetail from './pages/student/ListingDetail';
import Profile from './pages/student/Profile';
import Progress from './pages/student/Progress';
import Result from './pages/student/Result';
import Saved from './pages/student/Saved';
import Search from './pages/student/Search';
import Tests from './pages/student/Tests';

function Landing() {
  const { user } = useAuth();
  return <Navigate to={user ? HOME_BY_ROLE[user.role] || '/login' : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="help" element={<Help />} />

        <Route element={<RequireRole roles={['STUDENT']} />}>
          <Route path="home" element={<Home />} />
          <Route path="listings" element={<Search />} />
          <Route path="listings/:id" element={<ListingDetail />} />
          <Route path="saved" element={<Saved />} />
          <Route path="applications" element={<Applications />} />
          <Route path="profile" element={<Profile />} />
          <Route path="tests" element={<Tests />} />
          <Route path="attempts/:id" element={<Attempt />} />
          <Route path="attempts/:id/result" element={<Result />} />
          <Route path="progress" element={<Progress />} />
        </Route>

        <Route path="recruiter" element={<RequireRole roles={['RECRUITER']} />}>
          <Route path="listings" element={<MyListings />} />
          <Route path="listings/new" element={<ListingForm />} />
          <Route path="listings/:id/edit" element={<ListingForm />} />
          <Route path="listings/:id/applicants" element={<Applicants />} />
        </Route>

        <Route path="admin" element={<RequireRole roles={['ADMIN']} />}>
          <Route path="recruiters" element={<Users />} />
          <Route path="questions" element={<Questions />} />
          <Route path="tests" element={<TestsAdmin />} />
          <Route path="statistics" element={<Statistics />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
