import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Overview } from "./pages/Overview";
import { AddDocument } from "./pages/AddDocument";
import { DocumentVault } from "./pages/DocumentVault";
import { PrivateSearch } from "./pages/PrivateSearch";
import { VerificationCenter } from "./pages/VerificationCenter";
import { PrivacyAudit } from "./pages/PrivacyAudit";
import { Benchmarks } from "./pages/Benchmarks";
import { ThreatModel } from "./pages/ThreatModel";

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/add" element={<AddDocument />} />
          <Route path="/vault" element={<DocumentVault />} />
          <Route path="/search" element={<PrivateSearch />} />
          <Route path="/verification" element={<VerificationCenter />} />
          <Route path="/audit" element={<PrivacyAudit />} />
          <Route path="/benchmarks" element={<Benchmarks />} />
          <Route path="/threat-model" element={<ThreatModel />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
