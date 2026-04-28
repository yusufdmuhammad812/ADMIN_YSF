import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ScanPage from './pages/ScanPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ScanPage />} />
      </Routes>
    </Router>
  );
}

export default App;
