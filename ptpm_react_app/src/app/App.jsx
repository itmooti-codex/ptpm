import { Routes, Route } from "react-router-dom";
import { JobDirectPage } from "../features/job-direct/pages/JobDirectPage.jsx";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/job-direct" element={<JobDirectPage />} />
      <Route path="/job-direct/:jobuid" element={<JobDirectPage />} />
    </Routes>
  );
}
