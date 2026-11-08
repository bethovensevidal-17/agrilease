import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import BrowseEquipment from './pages/BrowseEquipment.jsx';

// Idagdag dito ang bagong page: isang <Route> na linya bawat page.
// Halimbawa: <Route path="login" element={<Login />} />  (Jenalyn)
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<BrowseEquipment />} />
        <Route path="*" element={<p>Hindi nahanap ang page.</p>} />
      </Route>
    </Routes>
  );
}
